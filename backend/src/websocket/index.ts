
import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { ChatRepository } from '../repositories/ChatRepository';
import { GameManager } from './game_manager';
import { Input } from '../game/Input';
import { DirectMessageData } from '../types/chat';
import { Pong } from '../game/Pong';
import { error } from 'console';
import { simpleGameInvites } from './SimpleGameInvites';

interface ConnectedUser {
  id: number;
  username: string;
  socket: SocketStream;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private connectedUsers: Map<number, ConnectedUser> = new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addUser(userId: number, username: string, socket: SocketStream) {
    this.connectedUsers.set(userId, { id: userId, username, socket });
    console.log(`Utilisateur ${username} connecté via WebSocket`);
  }

  removeUser(userId: number) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.connectedUsers.delete(userId);
      console.log(`Utilisateur ${user.username} déconnecté`);
    }
  }

  sendToUser(userId: number, message: any) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      try {
        user.socket.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Erreur envoi message à ${userId}:`, error);
        this.removeUser(userId);
      }
    }
  }

  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getUser(userId: number) {
    return this.connectedUsers.get(userId);
  }

  hasUser(userId: number) {
    return userId in this.connectedUsers;
  }
}

export function setupWebSocket(server: FastifyInstance) {
  const wsManager = WebSocketManager.getInstance();
  const gameManager = GameManager.instance;
  
  // Attacher le WebSocketManager à Fastify pour les routes
  server.decorate('websocketManager', wsManager);
  
  // 🔗 Connecter le système KISS au WebSocketManager principal
  simpleGameInvites.setWebSocketManager(wsManager);
  
  // Démarrer la boucle de jeu du GameManager
  gameManager.registerLoop();

  server.register(async function (server) {
    server.get('/ws', { websocket: true }, async (connection: SocketStream, req) => {
      let userId: number | null = null;
      let username: string | null = null;
      let userInput = new Input();

      // Gestion de la connexion
      connection.socket.on('message', async (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'auth':
              // Authentification via token JWT
              try {
                const decoded = server.jwt.verify(message.token) as any;
                const db = DatabaseManager.getInstance().getDb();
                const userRepo = new UserRepository(db);
                const user = await userRepo.findById(decoded.id);
                
                if (user) {
                  userId = user.id;
                  username = user.username;
                  
                  // Mettre à jour le statut en ligne
                  await userRepo.updateOnlineStatus(userId, true);
                  
                  // Ajouter l'utilisateur aux connexions actives
                  wsManager.addUser(userId, username, connection);
                  
                  // Ajouter l'utilisateur au système KISS d'invitations
                  simpleGameInvites.addUser(userId, username, connection);
                  
                  // Confirmer l'authentification
                  connection.socket.send(JSON.stringify({
                    type: 'auth_success',
                    data: { userId, username }
                  }));
                } else {
                  connection.socket.send(JSON.stringify({
                    type: 'auth_error',
                    message: 'Utilisateur non trouvé'
                  }));
                }
              } catch (error) {
                connection.socket.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'Token invalide'
                }));
              }
              break;

            case 'ping':
              // Heartbeat
              connection.socket.send(JSON.stringify({ type: 'pong' }));
              break;

            case 'direct_message':
              // Messages directs avec persistance en DB
              if (userId && message.toUserId && message.message) {
                try {
                  const db = DatabaseManager.getInstance().getDb();
                  const chatRepo = new ChatRepository(db);
                  
                  // Créer ou récupérer la conversation
                  const conversation = await chatRepo.getOrCreateConversation(userId, message.toUserId);
                  
                  // Créer le message en DB
                  const savedMessage = await chatRepo.createMessage({
                    conversation_id: conversation.id,
                    sender_id: userId,
                    content: message.message,
                    type: 'text'
                  });
                  
                  // Envoyer au destinataire si connecté
                  const recipient = wsManager.getUser(message.toUserId);
                  if (recipient) {
                    wsManager.sendToUser(message.toUserId, {
                      type: 'direct_message_received',
                      data: {
                        message: savedMessage,
                        conversation: conversation
                      }
                    });
                  }
                  
                  // Confirmer l'envoi à l'expéditeur
                  connection.socket.send(JSON.stringify({
                    type: 'direct_message_sent',
                    data: {
                      message: savedMessage,
                      conversation: conversation
                    }
                  }));
                  
                } catch (error: any) {
                  connection.socket.send(JSON.stringify({
                    type: 'error',
                    message: error.message || 'Erreur lors de l\'envoi du message'
                  }));
                }
              }
              break;

            case 'chat_message':
              // Ancienne méthode (gardée pour compatibilité temporaire)
              if (userId && message.toUserId && message.message) {
                wsManager.sendToUser(message.toUserId, {
                  type: 'chat_message',
                  data: {
                    from: { id: userId, username },
                    message: message.message,
                    timestamp: new Date().toISOString()
                  }
                });
              }
              break;
            
            case 'game_invite_received':
              // Notification d'invitation de jeu reçue
              if (userId && message.invite) {
                const recipient = wsManager.getUser(message.invite.receiver_id);
                if (recipient) {
                  wsManager.sendToUser(message.invite.receiver_id, {
                    type: 'game_invite_received',
                    data: { invite: message.invite }
                  });
                }
              }
              break;

            case 'game_invite_response':
              // Réponse à une invitation de jeu
              if (userId && message.response) {
                const sender = wsManager.getUser(message.response.sender_id);
                if (sender) {
                  wsManager.sendToUser(message.response.sender_id, {
                    type: 'game_invite_response',
                    data: { response: message.response }
                  });
                }
              }
              break;

            case 'join_existing_game':
              // 🎯 KISS: Rejoindre une partie existante avec de nouveaux sockets
              if (userId && typeof message.gameId === 'number' && typeof message.opponentId === 'number') {
                console.log(`🎮 KISS: ${username} joining existing game ${message.gameId}`);
                
                // Récupérer la partie pour déterminer les positions
                const game = GameManager.instance.getGame(message.gameId);
                if (!game) {
                  connection.socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Game not found'
                  }));
                  break;
                }
                
                const opponentUser = wsManager.getUser(message.opponentId);
                let success = false;
                
                // Déterminer qui est left/right et mettre à jour les sockets correctement
                if (game.leftPlayer.id === userId && game.rightPlayer.id === message.opponentId) {
                  // Le joueur actuel est left, l'opponent est right
                  success = GameManager.instance.updateGameSockets(
                    message.gameId,
                    userId,           // leftPlayerId
                    message.opponentId, // rightPlayerId  
                    connection.socket,  // leftSocket
                    opponentUser?.socket.socket || null // rightSocket
                  );
                } else if (game.leftPlayer.id === message.opponentId && game.rightPlayer.id === userId) {
                  // L'opponent est left, le joueur actuel est right
                  success = GameManager.instance.updateGameSockets(
                    message.gameId,
                    message.opponentId, // leftPlayerId
                    userId,           // rightPlayerId
                    opponentUser?.socket.socket || null, // leftSocket
                    connection.socket   // rightSocket
                  );
                } else {
                  console.error(`🎮 KISS: Player positions don't match in game ${message.gameId}`);
                }
                
                if (success) {
                  connection.socket.send(JSON.stringify({
                    type: 'success',
                    data: { gameId: message.gameId, message: 'Rejoined existing game' }
                  }));
                  console.log(`✅ ${username} successfully joined game ${message.gameId}`);
                } else {
                  connection.socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Game not found or failed to join'
                  }));
                }
              }
              break;

            case 'start_game':
              if (userId && typeof message.opponentId === 'number') {
                if (message.opponentId == userId) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_self',
                    message: 'Vous ne pouvez pas vous combattre vous-même !!'
                  }));
                  break;
                }
                if (GameManager.instance.getFromPlayerId(userId)) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_game_started',
                    message: 'Vous êtes déjà en partie !!'
                  }));
                  break;
                }
                const db = DatabaseManager.getInstance().getDb();
                const userRepo = new UserRepository(db);
                const user = await userRepo.findById(message.opponentId);
                if (!user) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_unknown_id',
                    message: 'Cet identifiant n\'est pas associé à un utilisateur !!'
                  }));
                  break;
                }
                const opponent = wsManager.getUser(message.opponentId);
                if (!opponent) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_user_offline',
                    message: 'Cet utilisateur n\'est pas en ligne !!'
                  }));
                  break;
                }
                if (GameManager.instance.getFromPlayerId(message.opponentId)) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_game_started',
                    message: 'Une partie est déjà en cours pour ce joueur'
                  }));
                  break;
                }

                userInput.reset();
                const id = gameManager.startGame(userId, message.opponentId, connection.socket, opponent.socket.socket);
                connection.socket.send(JSON.stringify({
                  type: 'success',
                  data: { gameId: id }
                }));
              }
              break;

            case 'start_local_game':
              // Start a local (single-player) game where user controls both paddles
              if (userId) {
                if (GameManager.instance.getFromPlayerId(userId)) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_game_started',
                    message: 'Vous êtes déjà en partie !!'
                  }));
                  break;
                }

                userInput.reset();
                // For local game, use same user ID for both players but different socket references
                const id = gameManager.startGame(userId, userId, connection.socket, connection.socket);
                connection.socket.send(JSON.stringify({
                  type: 'success',
                  data: { gameId: id }
                }));
              }
              break;

            case 'player_ready':
              // 🎮 Joueur prêt à commencer la partie
              if (userId && typeof message.gameId === 'number' && typeof message.ready === 'boolean') {
                console.log(`🎮 Player ${userId} is ${message.ready ? 'ready' : 'not ready'} for game ${message.gameId}`);
                GameManager.instance.setPlayerReady(message.gameId, userId, message.ready);
              }
              break;
            
            case 'update_input':
              if (userId && message.input
                  && typeof message.input.up === 'boolean' && typeof message.input.down === 'boolean') {
                const game = gameManager.getFromPlayerId(userId);
                if (!game) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_not_in_game',
                    message: 'Ce joueur n\'est pas en partie !'
                  }));
                }
                else {
                  userInput.up = message.input.up;
                  userInput.down = message.input.down;
                  game.updateInput(userId, userInput);
                  // is it necessary to send a success message ?
                }
              }
              break;

            case 'update_local_input':
              // Handle input from local game (both paddles controlled by same user)
              if (userId && message.leftInput && message.rightInput) {
                const game = gameManager.getFromPlayerId(userId);
                if (!game) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_not_in_game',
                    message: 'Ce joueur n\'est pas en partie !'
                  }));
                }
                else {
                  // For local games, both players have the same ID but we need to update both inputs
                  const leftInput = new Input();
                  leftInput.up = message.leftInput.up;
                  leftInput.down = message.leftInput.down;
                  
                  const rightInput = new Input();
                  rightInput.up = message.rightInput.up;
                  rightInput.down = message.rightInput.down;
                  
                  // In local games, left and right player have same ID, so we update the game directly
                  game.leftPlayer.input.copy(leftInput);
                  game.rightPlayer.input.copy(rightInput);
                }
              }
              break;

            case 'leave_game':
              // Sortir proprement d'une partie en cours (pour éviter les conflits KISS)
              if (userId) {
                const game = gameManager.getFromPlayerId(userId);
                if (game) {
                  console.log(`User ${userId} leaving game ${game.id} cleanly`);
                  gameManager.stopGame(game.id);
                }
                // Confirmer la sortie
                connection.socket.send(JSON.stringify({
                  type: 'game_left',
                  message: 'Successfully left the game'
                }));
              }
              break;

            default:
              // Essayer de traiter avec le système KISS d'invitations
              if (userId && simpleGameInvites.handleMessage(userId, message)) {
                // Message traité par le système KISS
                break;
              }
              
              connection.socket.send(JSON.stringify({
                type: 'error',
                message: 'Type de message non reconnu'
              }));
          }
        } catch (error) {
          console.error('Erreur traitement message WebSocket:', error);
          connection.socket.send(JSON.stringify({
            type: 'error',
            message: 'Erreur lors du traitement du message'
          }));
        }
      });

      // Gestion de la déconnexion
      connection.socket.on('close', async () => {
        if (userId && username) {
          console.log(`Utilisateur ${username} (${userId}) déconnecté`);
          
          try {
            const db = DatabaseManager.getInstance().getDb();
            const userRepo = new UserRepository(db);
            await userRepo.updateOnlineStatus(userId, false);
          } catch (error) {
            console.error('Erreur mise à jour statut hors ligne:', error);
          }
          
          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      // Gestion des erreurs
      connection.socket.on('error', (error: any) => {
        console.error('Erreur WebSocket:', error);
        if (userId) {
          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      // Message de bienvenue
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'Connexion WebSocket établie. Veuillez vous authentifier.'
      }));
    });
  });
  return wsManager;
}