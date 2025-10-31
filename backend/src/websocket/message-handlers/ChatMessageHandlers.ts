import { BaseMessageHandler, MessageContext } from '../handlers/MessageHandler';
import { ChatHandler } from '../handlers/ChatHandler';
import { WebSocketManager } from '../WebSocketManager';

export class DirectMessageHandler extends BaseMessageHandler {
  readonly messageType = 'direct_message';
  private chatHandler: ChatHandler;

  constructor(wsManager: WebSocketManager) {
    super();
    this.chatHandler = new ChatHandler(wsManager);
  }

  validate(message: any): boolean {
    return (
      typeof message.toUserId === 'number' &&
      typeof message.message === 'string' &&
      message.message.trim().length > 0
    );
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId || !userState.username) {
      this.sendError(context.connection, 'User not authenticated');
      return;
    }

    await this.chatHandler.handleDirectMessage(
      connection,
      userState.userId,
      userState.username,
      {
        toUserId: message.toUserId,
        message: message.message,
      }
    );
  }
}

export class ChatMessageHandler extends BaseMessageHandler {
  readonly messageType = 'chat_message';
  private chatHandler: ChatHandler;

  constructor(wsManager: WebSocketManager) {
    super();
    this.chatHandler = new ChatHandler(wsManager);
  }

  validate(message: any): boolean {
    return (
      typeof message.toUserId === 'number' &&
      typeof message.message === 'string' &&
      message.message.trim().length > 0
    );
  }

  async handle(context: MessageContext): Promise<void> {
    const { userState, message } = context;

    if (!userState.userId || !userState.username) {
      this.sendError(context.connection, 'User not authenticated');
      return;
    }

    this.chatHandler.handleLegacyChatMessage(userState.userId, userState.username, {
      toUserId: message.toUserId,
      message: message.message,
    });
  }
}