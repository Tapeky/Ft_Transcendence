import { BaseMessageHandler, MessageContext } from './MessageHandler';
import { SocketStream } from '@fastify/websocket';

export class MessageHandlerRegistry {
  private handlers = new Map<string, BaseMessageHandler>();

  /**
   * Register a single handler
   */
  register(handler: BaseMessageHandler): void {
    this.handlers.set(handler.messageType, handler);
  }

  /**
   * Register multiple handlers
   */
  registerMultiple(handlers: BaseMessageHandler[]): void {
    handlers.forEach(handler => this.register(handler));
  }

  /**
   * Handle a message
   */
  async handle(context: MessageContext): Promise<boolean> {
    const { message, userState } = context;
    const messageType = message.type;

    if (!messageType) {
      return false;
    }

    const handler = this.handlers.get(messageType);
    
    if (!handler) {
      return false;
    }

    // Check authentication requirement
    if (handler.requiresAuth() && !userState.userId) {
      context.connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Authentication required',
        })
      );
      return true; // Message was handled (even if with an error)
    }

    // Validate message
    if (!handler.validate(message)) {
      context.connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
      return true;
    }

    try {
      await handler.handle(context);
      return true;
    } catch (error) {
      console.error(`Error handling message type ${messageType}:`, error);
      context.connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Error processing message',
        })
      );
      return true;
    }
  }

  /**
   * Get all registered message types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a handler is registered for a message type
   */
  hasHandler(messageType: string): boolean {
    return this.handlers.has(messageType);
  }
}