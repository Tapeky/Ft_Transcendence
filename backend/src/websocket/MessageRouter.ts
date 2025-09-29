import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { WebSocketManager } from './WebSocketManager';
import { GameManager } from './game_manager';
import { AuthHandler, ChatHandler, GameHandler } from './handlers';
import { simpleGameInvites } from './SimpleGameInvites';
import { Input } from '../game/Input';
import { SimplePongManager } from './SimplePongManager';
import { FriendPongInvites } from './FriendPongInvites';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface FastifyWithPongServices extends FastifyInstance {
  friendPongInvites: FriendPongInvites;
  websocketManager: WebSocketManager;
}

export class MessageRouter {
  private authHandler: AuthHandler;
  private chatHandler: ChatHandler;
  private gameHandler: GameHandler;

  constructor(
    private server: FastifyWithPongServices,
    private wsManager: WebSocketManager,
    private gameManager: GameManager
  ) {
    this.authHandler = new AuthHandler(server, wsManager);
    this.chatHandler = new ChatHandler(wsManager);
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  async handleMessage(
    connection: SocketStream,
    data: Buffer,
    userState: { userId: number | null; username: string | null; userInput: Input }
  ): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const { userId, username } = userState;

      switch (message.type) {
        case 'auth':
          const authResult = await this.authHandler.handleAuth(connection, {
            token: message.token,
          });
          userState.userId = authResult.userId;
          userState.username = authResult.username;
          break;

        case 'ping':
          this.authHandler.handlePing(connection);
          break;

        case 'direct_message':
          if (userId && username) {
            await this.chatHandler.handleDirectMessage(connection, userId, username, {
              toUserId: message.toUserId,
              message: message.message,
            });
          }
          break;

        case 'chat_message':
          if (userId && username) {
            this.chatHandler.handleLegacyChatMessage(userId, username, {
              toUserId: message.toUserId,
              message: message.message,
            });
          }
          break;

        case 'game_invite_received':
          this.gameHandler.handleGameInviteReceived({ invite: message.invite });
          break;

        case 'game_invite_response':
          this.gameHandler.handleGameInviteResponse({ response: message.response });
          break;

        case 'join_existing_game':
          if (userId && username) {
            this.gameHandler.handleJoinExistingGame(connection, userId, username, {
              gameId: message.gameId,
              opponentId: message.opponentId,
            });
          }
          break;

        case 'start_game':
          if (userId) {
            await this.gameHandler.handleStartGame(connection, userId, {
              opponentId: message.opponentId,
            });
          }
          break;

        case 'start_local_game':
          if (userId) {
            this.gameHandler.handleStartLocalGame(connection, userId);
          }
          break;

        case 'player_ready':
          if (userId) {
            this.gameHandler.handlePlayerReady(
              { gameId: message.gameId, ready: message.ready },
              userId
            );
          }
          break;

        case 'update_input':
          if (userId) {
            this.gameHandler.handleUpdateInput(connection, userId, { input: message.input });
          }
          break;

        case 'update_local_input':
          if (userId) {
            this.gameHandler.handleUpdateLocalInput(connection, userId, {
              leftInput: message.leftInput,
              rightInput: message.rightInput,
            });
          }
          break;

        case 'leave_game':
          if (userId) {
            this.gameHandler.handleLeaveGame(connection, userId);
          }
          break;

        case 'friend_pong_accept':
          if (userId) {
            if (!message.inviteId || typeof message.inviteId !== 'string') {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid invitation ID',
                })
              );
              break;
            }

            const inviteManager = this.server.friendPongInvites;
            const success = await inviteManager.acceptInvite(message.inviteId, userId);
            if (!success) {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Unable to accept invitation',
                })
              );
            }
          }
          break;

        case 'friend_pong_decline':
          if (userId) {
            if (!message.inviteId || typeof message.inviteId !== 'string') {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid invitation ID',
                })
              );
              break;
            }

            const inviteManager = this.server.friendPongInvites;
            const success = inviteManager.declineInvite(message.inviteId, userId);
            if (!success) {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Unable to decline invitation',
                })
              );
            }
          }
          break;

        case 'friend_pong_input':
          if (userId) {
            if (typeof message.up !== 'boolean' || typeof message.down !== 'boolean') {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid input format',
                })
              );
              break;
            }

            const simplePongManager = SimplePongManager.getInstance();
            simplePongManager.updateInput(userId, message.up, message.down);
          }
          break;

        case 'authenticate':
          const authResult2 = await this.authHandler.handleAuth(connection, {
            token: message.token,
          });
          userState.userId = authResult2.userId;
          userState.username = authResult2.username;
          break;

        case 'join_simple_pong':
          if (userId) {
            if (
              !message.gameId ||
              typeof message.gameId !== 'string' ||
              message.gameId.length > 100
            ) {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid game ID',
                })
              );
              break;
            }

            const simplePongManager = SimplePongManager.getInstance();
            const playerSide = simplePongManager.getPlayerSide(userId, message.gameId);

            if (playerSide) {
              console.log(
                `✅ [MessageRouter] Player ${userId} successfully joined game ${message.gameId} as ${playerSide}`
              );
              connection.socket.send(
                JSON.stringify({
                  type: 'simple_pong_joined',
                  gameId: message.gameId,
                  player: playerSide,
                })
              );
            } else {
              console.log(
                `❌ [MessageRouter] Player ${userId} failed to join game ${message.gameId}`
              );

              connection.socket.send(
                JSON.stringify({
                  type: 'simple_pong_join_failed',
                  gameId: message.gameId,
                  error: 'PLAYER_NOT_FOUND',
                  message: 'Could not join SimplePong game - player not found in game',
                  suggestion: 'Game may still be initializing. Please try again in a moment.',
                  retryAfter: 2000, // Suggest retry after 2 seconds
                })
              );
            }
          }
          break;

        case 'simple_pong_input':
          if (userId) {
            if (
              !message.gameId ||
              typeof message.gameId !== 'string' ||
              message.gameId.length > 100
            ) {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid game ID',
                })
              );
              break;
            }

            if (!message.input || typeof message.input !== 'object') {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid input object',
                })
              );
              break;
            }

            if (typeof message.input.up !== 'boolean' || typeof message.input.down !== 'boolean') {
              connection.socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Invalid input format',
                })
              );
              break;
            }

            const simplePongManager = SimplePongManager.getInstance();
            simplePongManager.updateInput(userId, message.input.up, message.input.down);
          }
          break;

        default:
          if (userId && simpleGameInvites.handleMessage(userId, message)) {
            break;
          }

          connection.socket.send(
            JSON.stringify({
              type: 'error',
              message: 'Unrecognized message type',
            })
          );
      }
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Error processing message',
        })
      );
    }
  }
}
