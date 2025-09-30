import { SocketStream } from '@fastify/websocket';

export interface ConnectedUser {
  id: number;
  username: string;
  socket: SocketStream;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connectedUsers: Map<number, ConnectedUser> = new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addUser(userId: number, username: string, socket: SocketStream): void {
    this.connectedUsers.set(userId, { id: userId, username, socket });
  }

  removeUser(userId: number): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.connectedUsers.delete(userId);
    }
  }

  sendToUser(userId: number, message: any): boolean {
    const user = this.connectedUsers.get(userId);
    if (user) {
      try {
        const messageStr = JSON.stringify(message);
        user.socket.socket.send(messageStr);
        return true;
      } catch (error) {
        console.error(
          `[WebSocketManager] ✗ Erreur lors de l'envoi du message à ${user.username}:`,
          error
        );
        this.removeUser(userId);
        return false;
      }
    } else {
    }
    return false;
  }

  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getUser(userId: number): ConnectedUser | undefined {
    return this.connectedUsers.get(userId);
  }

  hasUser(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  broadcastToAll(message: any): void {
    const deadConnections: number[] = [];

    for (const [userId, user] of this.connectedUsers) {
      try {
        user.socket.socket.send(JSON.stringify(message));
      } catch (error) {
        deadConnections.push(userId);
      }
    }

    deadConnections.forEach(userId => this.removeUser(userId));
  }

  getConnectionCount(): number {
    return this.connectedUsers.size;
  }
}
