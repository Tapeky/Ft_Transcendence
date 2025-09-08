
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
import { TournamentManager, TournamentEvent } from './TournamentManager';
import { tournamentInvites } from './TournamentInvites';

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
  
  // 🏆 Connecter le système d'invitations de tournoi
  const tournamentManager = TournamentManager.getInstance();
  tournamentManager.initializeTournamentInvites(wsManager);
  
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

            // NOUVELLES COMMANDES TOURNOIS - Respect des exigences du sujet
            case 'tournament_subscribe':
              // S'abonner aux événements d'un tournoi
              if (userId && typeof message.tournamentId === 'number') {
                const tournamentManager = TournamentManager.getInstance();
                
                tournamentManager.subscribeTournamentEvents(message.tournamentId, (event: TournamentEvent) => {
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_event',
                    data: event
                  }));
                });

                connection.socket.send(JSON.stringify({
                  type: 'tournament_subscribed',
                  tournamentId: message.tournamentId,
                  message: 'Abonné aux événements du tournoi'
                }));
              }
              break;

            case 'tournament_start':
              // Démarrer un tournoi (créateur uniquement)
              if (userId && typeof message.tournamentId === 'number') {
                try {
                  const tournamentManager = TournamentManager.getInstance();
                  const bracket = await tournamentManager.startTournament(message.tournamentId, userId);
                  
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_started',
                    data: {
                      tournamentId: message.tournamentId,
                      bracket,
                      nextMatch: bracket.nextMatch
                    }
                  }));
                } catch (error: any) {
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_error',
                    error: error.message
                  }));
                }
              }
              break;

            case 'tournament_get_next_match':
              // Demander le prochain match (exigence sujet: "announce the next match")
              if (userId && typeof message.tournamentId === 'number') {
                try {
                  const tournamentManager = TournamentManager.getInstance();
                  const nextMatch = await tournamentManager.announceNextMatch(message.tournamentId);
                  
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_next_match',
                    data: {
                      tournamentId: message.tournamentId,
                      nextMatch,
                      announcement: nextMatch 
                        ? `🎮 Prochain match: ${nextMatch.player1?.alias} vs ${nextMatch.player2?.alias || 'BYE'}`
                        : 'Aucun match suivant'
                    }
                  }));
                } catch (error: any) {
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_error',
                    error: error.message
                  }));
                }
              }
              break;

            case 'join_tournament_match':
              // Rejoindre un match de tournoi spécifique
              if (userId && typeof message.matchId === 'number') {
                try {
                  // Vérifier que l'utilisateur fait partie de ce match
                  const db = DatabaseManager.getInstance();
                  const match = await db.queryOne(`
                    SELECT m.*, t.id as tournament_id, t.name as tournament_name
                    FROM matches m 
                    JOIN tournaments t ON t.id = m.tournament_id
                    WHERE m.id = ? AND (m.player1_id = ? OR m.player2_id = ?)
                  `, [message.matchId, userId, userId]);

                  if (!match) {
                    connection.socket.send(JSON.stringify({
                      type: 'tournament_error',
                      error: 'Vous ne faites pas partie de ce match'
                    }));
                    break;
                  }

                  if (match.status !== 'scheduled') {
                    connection.socket.send(JSON.stringify({
                      type: 'tournament_error', 
                      error: 'Ce match n\'est plus disponible'
                    }));
                    break;
                  }

                  // Pour les matches de tournoi, on ne vérifie PAS GameManager
                  // car les tournois ont leur propre logique de gestion des matches
                  
                  // Récupérer l'adversaire
                  const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
                  const opponent = wsManager.getUser(opponentId);
                  
                  if (!opponent) {
                    connection.socket.send(JSON.stringify({
                      type: 'tournament_error',
                      error: 'Votre adversaire n\'est pas en ligne'
                    }));
                    break;
                  }

                  // Démarrer le match de tournoi
                  const gameId = gameManager.startGame(userId, opponentId, connection.socket, opponent.socket);
                  
                  // Marquer le match comme en cours
                  await db.execute(`
                    UPDATE matches SET status = 'in_progress', started_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                  `, [message.matchId]);

                  // Notifier les deux joueurs
                  const gameData = {
                    gameId,
                    matchId: message.matchId,
                    tournamentId: match.tournament_id,
                    tournamentName: match.tournament_name,
                    isPlayer1: match.player1_id === userId
                  };

                  connection.socket.send(JSON.stringify({
                    type: 'tournament_match_started',
                    data: gameData
                  }));

                  opponent.socket.socket.send(JSON.stringify({
                    type: 'tournament_match_started',
                    data: { ...gameData, isPlayer1: match.player1_id === opponentId }
                  }));

                } catch (error: any) {
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_error',
                    error: error.message
                  }));
                }
              }
              break;

            case 'tournament_match_result':
              // Mettre à jour le résultat d'un match de tournoi
              if (userId && typeof message.matchId === 'number' && 
                  typeof message.winnerId === 'number' &&
                  typeof message.player1Score === 'number' &&
                  typeof message.player2Score === 'number') {
                
                try {
                  const tournamentManager = TournamentManager.getInstance();
                  await tournamentManager.updateMatchResult(
                    message.matchId,
                    message.winnerId,
                    message.player1Score,
                    message.player2Score
                  );
                  
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_match_updated',
                    data: {
                      matchId: message.matchId,
                      winnerId: message.winnerId,
                      message: 'Résultat mis à jour, progression automatique effectuée'
                    }
                  }));
                } catch (error: any) {
                  connection.socket.send(JSON.stringify({
                    type: 'tournament_error',
                    error: error.message
                  }));
                }
              }
              break;

            default:
              // Essayer de traiter avec le système KISS d'invitations
              if (userId && simpleGameInvites.handleMessage(userId, message)) {
                // Message traité par le système KISS
                break;
              }
              
              // 🏆 Essayer de traiter avec le système d'invitations de tournoi
              if (userId && tournamentInvites.handleMessage(userId, message)) {
                // Message traité par le système d'invitations de tournoi
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