import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ChatRepository } from '../../repositories/ChatRepository';
import { WebSocketManager } from '../WebSocketManager';

export class ChatHandler {
  constructor(private wsManager: WebSocketManager) {}

  async handleDirectMessage(
    connection: SocketStream,
    userId: number,
    username: string,
    message: { toUserId: number; message: string }
  ): Promise<void> {
    if (!message.toUserId || !message.message) {
      return;
    }

    try {
      const db = DatabaseManager.getInstance().getDb();
      const chatRepo = new ChatRepository(db);

      const conversation = await chatRepo.getOrCreateConversation(userId, message.toUserId);

      const savedMessage = await chatRepo.createMessage({
        conversation_id: conversation.id,
        sender_id: userId,
        content: message.message,
        type: 'text',
      });

      const recipient = this.wsManager.getUser(message.toUserId);
      if (recipient) {
        this.wsManager.sendToUser(message.toUserId, {
          type: 'direct_message_received',
          data: {
            message: savedMessage,
            conversation: conversation,
          },
        });
      }

      connection.socket.send(
        JSON.stringify({
          type: 'direct_message_sent',
          data: {
            message: savedMessage,
            conversation: conversation,
          },
        })
      );
    } catch (error: any) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: error.message || 'Error sending message',
        })
      );
    }
  }

  handleLegacyChatMessage(
    userId: number,
    username: string,
    message: { toUserId: number; message: string }
  ): void {
    if (userId && message.toUserId && message.message) {
      this.wsManager.sendToUser(message.toUserId, {
        type: 'chat_message',
        data: {
          from: { id: userId, username },
          message: message.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
