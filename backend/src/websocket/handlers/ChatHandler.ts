import { WebSocketManager, ConnectedUser } from '../WebSocketManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ChatRepository } from '../../repositories/ChatRepository';
import { Conversation, Message } from '../../types/chat';

export class ChatHandler {
  private chatRepo: ChatRepository;

  constructor(private wsManager: WebSocketManager) {
    const db = DatabaseManager.getInstance().getDb();
    this.chatRepo = new ChatRepository(db);
  }

  async handleDirectMessage(senderId: number, receiverId: number, message: string): Promise<void> {
    const trimmedMessage = message?.trim();
    if (!trimmedMessage) {
      return;
    }

    try {
      const conversation = await this.chatRepo.getOrCreateConversation(senderId, receiverId);

      const storedMessage = await this.chatRepo.createMessage({
        conversation_id: conversation.id,
        sender_id: senderId,
        content: trimmedMessage,
        type: 'text',
      });

      const enrichedConversation: Conversation = {
        ...conversation,
        last_message: storedMessage.content,
        last_message_at: storedMessage.created_at,
      };

      const payload = {
        message: this.serializeMessage(storedMessage),
        conversation: enrichedConversation,
      };

      // Notify the sender (acknowledgement that the message was stored)
      this.wsManager.sendToUser(senderId, {
        type: 'direct_message_sent',
        data: payload,
      });

      // Forward to receiver if connected
      this.wsManager.sendToUser(receiverId, {
        type: 'direct_message_received',
        data: payload,
      });
    } catch (error) {
      console.error('[ChatHandler] Failed to process direct message:', error);
      this.wsManager.sendToUser(senderId, {
        type: 'error',
        message: 'Unable to deliver message',
      });
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

  private serializeMessage(message: Message): Message {
    if (message.metadata && typeof message.metadata !== 'string') {
      return {
        ...message,
        metadata: JSON.stringify(message.metadata),
      };
    }
    return message;
  }
}