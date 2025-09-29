import { SocketStream } from '@fastify/websocket';

export interface UserSessionState {
  userId: number | null;
  username: string | null;
  userInput: any;
}

export interface MessageContext {
  connection: SocketStream;
  userState: UserSessionState;
  message: any;
}

export interface IMessageHandler {
  readonly messageType: string;
  validate(message: any): boolean;
  requiresAuth(): boolean;
  handle(context: MessageContext): Promise<void>;
}

export abstract class BaseMessageHandler implements IMessageHandler {
  abstract readonly messageType: string;

  validate(message: any): boolean {
    return true;
  }

  requiresAuth(): boolean {
    return true;
  }

  abstract handle(context: MessageContext): Promise<void>;

  protected sendError(connection: SocketStream, message: string): void {
    connection.socket.send(
      JSON.stringify({
        type: 'error',
        message,
      })
    );
  }

  protected sendSuccess(connection: SocketStream, type: string, data: any): void {
    connection.socket.send(
      JSON.stringify({
        type,
        ...data,
      })
    );
  }
}