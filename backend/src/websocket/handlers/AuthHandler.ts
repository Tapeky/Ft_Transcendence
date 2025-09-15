import { SocketStream } from '@fastify/websocket';
import { FastifyInstance } from 'fastify';
import { DatabaseManager } from '../../database/DatabaseManager';
import { UserRepository } from '../../repositories/UserRepository';
import { WebSocketManager } from '../WebSocketManager';
import { simpleGameInvites } from '../SimpleGameInvites';

export class AuthHandler {
  constructor(
    private server: FastifyInstance,
    private wsManager: WebSocketManager
  ) {}

  async handleAuth(
    connection: SocketStream, 
    message: { token: string }
  ): Promise<{ userId: number | null; username: string | null }> {
    try {
      const decoded = this.server.jwt.verify(message.token) as any;
      const db = DatabaseManager.getInstance().getDb();
      const userRepo = new UserRepository(db);
      const user = await userRepo.findById(decoded.id);
      
      if (user) {
        const userId = user.id;
        const username = user.username;
        
        // Update online status
        await userRepo.updateOnlineStatus(userId, true);
        
        // Add user to active connections
        this.wsManager.addUser(userId, username, connection);
        
        // Add user to game invitations system
        simpleGameInvites.addUser(userId, username, connection);
        
        // Confirm authentication
        connection.socket.send(JSON.stringify({
          type: 'auth_success',
          data: { userId, username }
        }));

        return { userId, username };
      } else {
        connection.socket.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not found'
        }));
        return { userId: null, username: null };
      }
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Invalid token'
      }));
      return { userId: null, username: null };
    }
  }

  handlePing(connection: SocketStream): void {
    connection.socket.send(JSON.stringify({ type: 'pong' }));
  }
}