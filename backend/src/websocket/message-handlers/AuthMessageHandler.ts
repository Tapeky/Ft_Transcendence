import { BaseMessageHandler, MessageContext } from '../handlers/MessageHandler';
import { AuthHandler } from '../handlers/AuthHandler';
import { FastifyInstance } from 'fastify';
import { WebSocketManager } from '../WebSocketManager';

export class AuthMessageHandler extends BaseMessageHandler {
  readonly messageType: string = 'auth';
  private authHandler: AuthHandler;

  constructor(server: FastifyInstance, wsManager: WebSocketManager) {
    super();
    this.authHandler = new AuthHandler(server, wsManager);
  }

  requiresAuth(): boolean {
    return false;
  }

  validate(message: any): boolean {
    return typeof message.token === 'string' && message.token.length > 0;
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    const authResult = await this.authHandler.handleAuth(connection, {
      token: message.token,
    });

    userState.userId = authResult.userId;
    userState.username = authResult.username;
  }
}

export class PingMessageHandler extends BaseMessageHandler {
  readonly messageType = 'ping';
  private authHandler: AuthHandler;

  constructor(server: FastifyInstance, wsManager: WebSocketManager) {
    super();
    this.authHandler = new AuthHandler(server, wsManager);
  }

  requiresAuth(): boolean {
    return false;
  }

  validate(message: any): boolean {
    return true; // Ping messages don't need validation
  }

  async handle(context: MessageContext): Promise<void> {
    this.authHandler.handlePing(context.connection);
  }
}

export class AuthenticateMessageHandler extends AuthMessageHandler {
  readonly messageType: string = 'authenticate';
}