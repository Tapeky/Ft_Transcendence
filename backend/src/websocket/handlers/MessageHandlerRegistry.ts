import { IMessageHandler, MessageContext } from './MessageHandler';

export class MessageHandlerRegistry {
  private handlers = new Map<string, IMessageHandler>();

  register(handler: IMessageHandler): void {
    if (this.handlers.has(handler.messageType)) {
      console.warn(`Handler for message type '${handler.messageType}' already registered. Overwriting.`);
    }
    this.handlers.set(handler.messageType, handler);
  }

  registerMultiple(handlers: IMessageHandler[]): void {
    handlers.forEach(handler => this.register(handler));
  }

  async handle(context: MessageContext): Promise<boolean> {
    const { message, userState, connection } = context;
    const handler = this.handlers.get(message.type);

    if (!handler) {
      return false;
    }

    // Check authentication requirement
    if (handler.requiresAuth() && !userState.userId) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Authentication required',
        })
      );
      return true;
    }

    // Validate message
    if (!handler.validate(message)) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
      return true;
    }

    // Handle message
    try {
      await handler.handle(context);
      return true;
    } catch (error) {
      console.error(`Error handling message type '${message.type}':`, error);
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Error processing message',
        })
      );
      return true;
    }
  }

  hasHandler(messageType: string): boolean {
    return this.handlers.has(messageType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}