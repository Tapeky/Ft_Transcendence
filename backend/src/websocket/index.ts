// backend/src/websocket/index.ts

import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';

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
}

export function setupWebSocket(server: FastifyInstance) {
  const wsManager = WebSocketManager.getInstance();

  server.register(async function (server) {
    server.get('/ws', { websocket: true }, async (connection: SocketStream, req) => {
      let userId: number | null = null;
      let username: string | null = null;

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