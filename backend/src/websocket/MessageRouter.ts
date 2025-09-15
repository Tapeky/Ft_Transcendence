import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { WebSocketManager } from './WebSocketManager';
import { GameManager } from './game_manager';
import { AuthHandler, ChatHandler, GameHandler } from './handlers';
import { simpleGameInvites } from './SimpleGameInvites';
import { Input } from '../game/Input';

export class MessageRouter {
  private authHandler: AuthHandler;
  private chatHandler: ChatHandler;
  private gameHandler: GameHandler;

  constructor(
    private server: FastifyInstance,
    private wsManager: WebSocketManager,
    private gameManager: GameManager
  ) {
    this.authHandler = new AuthHandler(server, wsManager);
    this.chatHandler = new ChatHandler(wsManager);
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  async handleMessage(
    connection: SocketStream,
    data: any,
    userState: { userId: number | null; username: string | null; userInput: Input }
  ): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      const { userId, username } = userState;
      
      switch (message.type) {
        case 'auth':
          const authResult = await this.authHandler.handleAuth(connection, message);
          userState.userId = authResult.userId;
          userState.username = authResult.username;
          break;

        case 'ping':
          this.authHandler.handlePing(connection);
          break;

        case 'direct_message':
          if (userId && username) {
            await this.chatHandler.handleDirectMessage(connection, userId, username, message);
          }
          break;

        case 'chat_message':
          if (userId && username) {
            this.chatHandler.handleLegacyChatMessage(userId, username, message);
          }
          break;

        case 'game_invite_received':
          this.gameHandler.handleGameInviteReceived(message);
          break;

        case 'game_invite_response':
          this.gameHandler.handleGameInviteResponse(message);
          break;

        case 'join_existing_game':
          if (userId && username) {
            this.gameHandler.handleJoinExistingGame(connection, userId, username, message);
          }
          break;

        case 'start_game':
          if (userId) {
            await this.gameHandler.handleStartGame(connection, userId, message);
          }
          break;

        case 'start_local_game':
          if (userId) {
            this.gameHandler.handleStartLocalGame(connection, userId);
          }
          break;

        case 'player_ready':
          if (userId) {
            this.gameHandler.handlePlayerReady(message, userId);
          }
          break;

        case 'update_input':
          if (userId) {
            this.gameHandler.handleUpdateInput(connection, userId, message);
          }
          break;

        case 'update_local_input':
          if (userId) {
            this.gameHandler.handleUpdateLocalInput(connection, userId, message);
          }
          break;

        case 'leave_game':
          if (userId) {
            this.gameHandler.handleLeaveGame(connection, userId);
          }
          break;

        default:
          // Try to process with KISS invitations system
          if (userId && simpleGameInvites.handleMessage(userId, message)) {
            // Message processed by KISS system
            break;
          }
          
          connection.socket.send(JSON.stringify({
            type: 'error',
            message: 'Unrecognized message type'
          }));
      }
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  }
}