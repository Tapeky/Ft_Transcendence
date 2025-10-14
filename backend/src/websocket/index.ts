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

interface FastifyWithPongServices extends FastifyInstance {
  friendPongInvites: FriendPongInvites;
  websocketManager: WebSocketManager;
}

export function setupWebSocket(server: FastifyInstance) {
  const wsManager = WebSocketManager.getInstance();
  const gameManager = GameManager.instance;
  const friendPongInvites = new FriendPongInvites(wsManager);
  const simplePongManager = SimplePongManager.getInstance();

  simplePongManager.setWebSocketManager(wsManager);

  server.decorate('friendPongInvites', friendPongInvites);
  server.decorate('websocketManager', wsManager);

  const extendedServer = server as FastifyWithPongServices;
  const messageRouter = new MessageRouter(extendedServer, wsManager, gameManager);

  simpleGameInvites.setWebSocketManager(wsManager);

  gameManager.registerLoop();

  server.register(async function (server) {
    server.get('/ws', { websocket: true }, async (connection: SocketStream, req) => {
      const userState = {
        userId: null as number | null,
        username: null as string | null,
        userInput: new Input(),
      };

      connection.socket.on('message', async (data: any) => {
        await messageRouter.handleMessage(connection, data, userState);
      });

      connection.socket.on('close', async () => {
        const { userId, username } = userState;
        if (userId && username) {
          try {
            const db = DatabaseManager.getInstance().getDb();
            const userRepo = new UserRepository(db);
            await userRepo.updateOnlineStatus(userId, false);
          } catch (error) {
            console.error('Erreur mise à jour statut hors ligne:' + (error instanceof Error ? error.message : String(error)));
          }

          simplePongManager.handlePlayerDisconnect(userId);
          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      connection.socket.on('error', (error: any) => {
        const { userId } = userState;
        if (userId) {
          simplePongManager.handlePlayerDisconnect(userId);

          wsManager.removeUser(userId);
          simpleGameInvites.removeUser(userId);
        }
      });

      connection.socket.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established. Please authenticate.',
        })
      );
    });
  });

  return wsManager;
}
