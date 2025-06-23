
import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { GameManager } from './game_manager';
import { Input } from '../game/Input';

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

            case 'chat_message':
              // Message de chat basique
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
                const id = gameManager.startGame(userId, message.opponentId);
                connection.socket.send(JSON.stringify({
                  type: 'success',
                  data: { gameId: id }
                }));
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
            
            case 'get_game_state':
              if (userId) {
                const game = gameManager.getFromPlayerId(userId);
                if (!game) {
                  connection.socket.send(JSON.stringify({
                    type: 'err_not_in_game',
                    message: 'Ce joueur n\'est pas en partie !'
                  }));
                }
                else {
                  connection.socket.send(game.json(userId));
                }
              }
              break;

            default:
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
        }
      });

      // Gestion des erreurs
      connection.socket.on('error', (error: any) => {
        console.error('Erreur WebSocket:', error);
        if (userId) {
          wsManager.removeUser(userId);
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