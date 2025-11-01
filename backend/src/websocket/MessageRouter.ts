import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { WebSocketManager } from './WebSocketManager';
import { GameManager } from './game_manager';
import { AuthHandler, ChatHandler, GameHandler } from './handlers';
import { simpleGameInvites } from './SimpleGameInvites';
import { FriendPongInvites } from './FriendPongInvites';
import { MessageHandlerRegistry } from './handlers/MessageHandlerRegistry';
import { MessageContext, UserSessionState } from './handlers/MessageHandler';
import {
  AuthMessageHandler,
  PingMessageHandler,
  AuthenticateMessageHandler,
} from './message-handlers/AuthMessageHandler';
import {
  DirectMessageHandler,
  ChatMessageHandler,
} from './message-handlers/ChatMessageHandlers';
import {
  StartGameMessageHandler,
  StartLocalGameMessageHandler,
  JoinExistingGameMessageHandler,
  PlayerReadyMessageHandler,
  UpdateInputMessageHandler,
  UpdateLocalInputMessageHandler,
  LeaveGameMessageHandler,
  GameInviteReceivedMessageHandler,
  GameInviteResponseMessageHandler,
} from './message-handlers/GameMessageHandlers';
import {
  FriendPongAcceptMessageHandler,
  FriendPongDeclineMessageHandler,
  FriendPongInputMessageHandler,
  JoinSimplePongMessageHandler,
  SimplePongInputMessageHandler,
  PongPlayerReadyMessageHandler,
} from './message-handlers/PongMessageHandlers';

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
  private handlerRegistry: MessageHandlerRegistry;

  constructor(
    private server: FastifyWithPongServices,
    private wsManager: WebSocketManager,
    private gameManager: GameManager
  ) {
    this.authHandler = new AuthHandler(server, wsManager);
    this.chatHandler = new ChatHandler(wsManager);
    this.gameHandler = new GameHandler(wsManager, gameManager);
    this.handlerRegistry = new MessageHandlerRegistry();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Auth handlers
    this.handlerRegistry.registerMultiple([
      new AuthMessageHandler(this.server, this.wsManager),
      new PingMessageHandler(this.server, this.wsManager),
      new AuthenticateMessageHandler(this.server, this.wsManager),
    ]);

    // Chat handlers
    this.handlerRegistry.registerMultiple([
      new DirectMessageHandler(this.wsManager),
      new ChatMessageHandler(this.wsManager),
    ]);

    // Game handlers
    this.handlerRegistry.registerMultiple([
      new StartGameMessageHandler(this.wsManager, this.gameManager),
      new StartLocalGameMessageHandler(this.wsManager, this.gameManager),
      new JoinExistingGameMessageHandler(this.wsManager, this.gameManager),
      new PlayerReadyMessageHandler(this.wsManager, this.gameManager),
      new UpdateInputMessageHandler(this.wsManager, this.gameManager),
      new UpdateLocalInputMessageHandler(this.wsManager, this.gameManager),
      new LeaveGameMessageHandler(this.wsManager, this.gameManager),
      new GameInviteReceivedMessageHandler(this.wsManager, this.gameManager),
      new GameInviteResponseMessageHandler(this.wsManager, this.gameManager),
    ]);

    // Pong handlers
    this.handlerRegistry.registerMultiple([
      new FriendPongAcceptMessageHandler(this.server.friendPongInvites),
      new FriendPongDeclineMessageHandler(this.server.friendPongInvites),
      new FriendPongInputMessageHandler(),
      new JoinSimplePongMessageHandler(),
      new SimplePongInputMessageHandler(),
      new PongPlayerReadyMessageHandler(),
    ]);
  }

  async handleMessage(
    connection: SocketStream,
    data: Buffer,
    userState: UserSessionState
  ): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      const context: MessageContext = {
        connection,
        userState,
        message,
      };

      // Try to handle with registered handlers
      const handled = await this.handlerRegistry.handle(context);

      // Fallback to legacy simpleGameInvites if not handled
      if (!handled && userState.userId && simpleGameInvites.handleMessage(userState.userId, message)) {
        return;
      }

      // Send error if no handler found
      if (!handled) {
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Unrecognized message type',
          })
        );
      }
    } catch (error) {
      console.error('Error processing message:', error);
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Error processing message',
        })
      );
    }
  }
}
