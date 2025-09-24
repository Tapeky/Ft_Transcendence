
import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { WebSocketManager } from './WebSocketManager';
import { MessageRouter } from './MessageRouter';
import { GameManager } from './game_manager';
import { Input } from '../game/Input';
import { simpleGameInvites } from './SimpleGameInvites';
import { FriendPongInvites } from './FriendPongInvites';
import { SimplePongManager } from './SimplePongManager';

export function setupWebSocket(server: FastifyInstance) {
  const wsManager = WebSocketManager.getInstance();
  const gameManager = GameManager.instance;
  const messageRouter = new MessageRouter(server, wsManager, gameManager);
  const friendPongInvites = new FriendPongInvites(wsManager);
  const simplePongManager = SimplePongManager.getInstance();
  
  // Injecter le WebSocketManager dans SimplePongManager
  simplePongManager.setWebSocketManager(wsManager);
  
  server.decorate('friendPongInvites', friendPongInvites);
  
  // Attach WebSocketManager to Fastify for routes
  server.decorate('websocketManager', wsManager);
  
  // Connect KISS system to main WebSocketManager
  simpleGameInvites.setWebSocketManager(wsManager);
  
  // Start GameManager loop
  gameManager.registerLoop();

  server.register(async function (server) {
    server.get('/ws', { websocket: true }, async (connection: SocketStream, req) => {
      const userState = {
        userId: null as number | null,
        username: null as string | null,
        userInput: new Input()
      };

      // Handle incoming messages
      connection.socket.on('message', async (data: any) => {
        await messageRouter.handleMessage(connection, data, userState);
      });

      // Handle disconnection
      connection.socket.on('close', async () => {
        const { userId, username } = userState;
        if (userId && username) {
          try {
            const db = DatabaseManager.getInstance().getDb();
            const userRepo = new UserRepository(db);
            await userRepo.updateOnlineStatus(userId, false);
          } catch (error) {
          }
          
          // Gérer les déconnexions Pong
          simplePongManager.handlePlayerDisconnect(userId);
          
          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      // Handle errors
      connection.socket.on('error', (error: any) => {
        const { userId } = userState;
        if (userId) {
          // Gérer les déconnexions Pong en cas d'erreur
          simplePongManager.handlePlayerDisconnect(userId);
          
          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      // Welcome message
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established. Please authenticate.'
      }));
    });
  });
  
  return wsManager;
}
