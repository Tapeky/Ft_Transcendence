import { SocketStream } from '@fastify/websocket';

export interface MessageContext {
  connection: SocketStream;
  userState: UserSessionState;
  message: any;
}

export interface UserSessionState {
  userId: number | null;
  username: string | null;
  userInput: any;
}

export abstract class BaseMessageHandler {
  abstract readonly messageType: string;

  constructor() {}

  /**
   * Whether this message requires authentication
   */
  requiresAuth(): boolean {
    return true;
  }

  /**
   * Validate the incoming message
   */
  abstract validate(message: any): boolean;

  /**
   * Handle the message
   */
  abstract handle(context: MessageContext): Promise<void>;

  /**
   * Send an error response
   */
  sendError(connection: SocketStream, message: string): void {
    connection.socket.send(
      JSON.stringify({
        type: 'error',
        message,
      })
    );
  }

  /**
   * Send a success response
   */
  sendSuccess(connection: SocketStream, type: string, data?: any): void {
    connection.socket.send(
      JSON.stringify({
        type,
        success: true,
        ...data,
      })
    );
  }
}