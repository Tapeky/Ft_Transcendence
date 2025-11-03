import { WebSocketManager, ConnectedUser } from '../WebSocketManager';

export class ChatHandler {
  constructor(private wsManager: WebSocketManager) {}

  async handleDirectMessage(senderId: number, receiverId: number, message: string): Promise<void> {
    const receiver = this.wsManager.getUser(receiverId);
    
    if (receiver) {
      receiver.socket.socket.send(JSON.stringify({
        type: 'direct_message',
        senderId,
        message,
        timestamp: Date.now(),
      }));
    }
  }

  async handleChatMessage(userId: number, message: string, roomId?: string): Promise<void> {
    
    const broadcastMessage = {
      type: 'chat_message',
      userId,
      message,
      timestamp: Date.now(),
      roomId,
    };

    // Envoyer à tous les utilisateurs connectés (via WebSocketManager)
    const connectedUsers = this.wsManager.getConnectedUsers();
    connectedUsers.forEach((user: ConnectedUser) => {
      user.socket.socket.send(JSON.stringify(broadcastMessage));
    });
  }
}