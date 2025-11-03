import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { WebSocketManager } from './WebSocketManager';
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
  private handlerRegistry: MessageHandlerRegistry;

  constructor(
    private server: FastifyWithPongServices,
    private wsManager: WebSocketManager
  ) {
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

    // Pong handlers (SimplePong system)
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