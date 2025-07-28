import { Database } from 'sqlite';
import { Conversation, Message, CreateMessageData } from '../types/chat';

export class ChatRepository {
  constructor(private db: Database) {}

  // Créer ou récupérer une conversation entre 2 utilisateurs
  async getOrCreateConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    // S'assurer que user1Id < user2Id pour la contrainte UNIQUE
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    // Chercher conversation existante
    let conversation = await this.db.get<Conversation>(
      `SELECT c.*, 
        u1.username as user1_username, u1.avatar_url as user1_avatar,
        u2.username as user2_username, u2.avatar_url as user2_avatar
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.user1_id = ? AND c.user2_id = ?`,
      [smallerId, largerId]
    );

    if (!conversation) {
      // Créer nouvelle conversation
      const result = await this.db.run(
        `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
        [smallerId, largerId]
      );

      conversation = await this.db.get<Conversation>(
        `SELECT c.*, 
          u1.username as user1_username, u1.avatar_url as user1_avatar,
          u2.username as user2_username, u2.avatar_url as user2_avatar
         FROM conversations c
         JOIN users u1 ON c.user1_id = u1.id
         JOIN users u2 ON c.user2_id = u2.id
         WHERE c.id = ?`,
        [result.lastID]
      );
    }

    return conversation!;
  }

  // Récupérer toutes les conversations d'un utilisateur
  async getUserConversations(userId: number): Promise<Conversation[]> {
    const conversations = await this.db.all<Conversation[]>(
      `SELECT c.*, 
        u1.username as user1_username, u1.avatar_url as user1_avatar,
        u2.username as user2_username, u2.avatar_url as user2_avatar,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        0 as unread_count
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY c.updated_at DESC`,
      [userId, userId]
    );

    return conversations;
  }

  // Récupérer les messages d'une conversation avec pagination
  async getConversationMessages(
    conversationId: number, 
    userId: number,
    limit: number = 50, 
    offset: number = 0
  ): Promise<Message[]> {
    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await this.db.get(
      `SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [conversationId, userId, userId]
    );

    if (!conversation) {
      throw new Error('Conversation non trouvée ou accès non autorisé');
    }

    const messages = await this.db.all<Message[]>(
      `SELECT m.*, u.username, u.avatar_url, u.display_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );

    return messages.reverse(); // Retourner dans l'ordre chronologique
  }

  // Créer un nouveau message
  async createMessage(data: CreateMessageData): Promise<Message> {
    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await this.db.get(
      `SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [data.conversation_id, data.sender_id, data.sender_id]
    );

    if (!conversation) {
      throw new Error('Conversation non trouvée ou accès non autorisé');
    }

    // Vérifier si l'utilisateur est bloqué
    const isBlocked = await this.isUserBlocked(data.conversation_id, data.sender_id);
    if (isBlocked) {
      throw new Error('Impossible d\'envoyer un message à cet utilisateur');
    }

    const result = await this.db.run(
      `INSERT INTO messages (conversation_id, sender_id, content, type, metadata) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.conversation_id,
        data.sender_id,
        data.content,
        data.type || 'text',
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );

    const message = await this.db.get<Message>(
      `SELECT m.*, u.username, u.avatar_url, u.display_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.lastID]
    );

    return message!;
  }

  // Vérifier si un utilisateur est bloqué dans une conversation
  async isUserBlocked(conversationId: number, senderId: number): Promise<boolean> {
    // Récupérer l'autre utilisateur de la conversation
    const conversation = await this.db.get<{ user1_id: number; user2_id: number }>(
      `SELECT user1_id, user2_id FROM conversations WHERE id = ?`,
      [conversationId]
    );

    if (!conversation) return false;

    const otherUserId = conversation.user1_id === senderId 
      ? conversation.user2_id 
      : conversation.user1_id;

    // Vérifier si l'autre utilisateur a bloqué l'expéditeur
    const blocked = await this.db.get(
      `SELECT id FROM friendships 
       WHERE user_id = ? AND friend_id = ? AND status = 'blocked'`,
      [otherUserId, senderId]
    );

    return !!blocked;
  }

  // Marquer une conversation comme lue
  async markConversationAsRead(conversationId: number, userId: number): Promise<void> {
    // Vérifier l'accès à la conversation
    const conversation = await this.db.get(
      `SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [conversationId, userId, userId]
    );

    if (!conversation) {
      throw new Error('Conversation non trouvée ou accès non autorisé');
    }

    // Pour l'instant, on peut juste mettre à jour updated_at
    // Plus tard, on pourra ajouter un système de read_at plus sophistiqué
    await this.db.run(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );
  }

  // Récupérer une conversation par ID (avec vérification d'accès)
  async getConversationById(conversationId: number, userId: number): Promise<Conversation | null> {
    const conversation = await this.db.get<Conversation>(
      `SELECT c.*, 
        u1.username as user1_username, u1.avatar_url as user1_avatar,
        u2.username as user2_username, u2.avatar_url as user2_avatar
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ?)`,
      [conversationId, userId, userId]
    );

    return conversation || null;
  }

  // Supprimer une conversation (pour le cleanup)
  async deleteConversation(conversationId: number, userId: number): Promise<void> {
    // Vérifier l'accès
    const conversation = await this.db.get(
      `SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [conversationId, userId, userId]
    );

    if (!conversation) {
      throw new Error('Conversation non trouvée ou accès non autorisé');
    }

    // Supprimer la conversation (CASCADE supprimera les messages)
    await this.db.run(`DELETE FROM conversations WHERE id = ?`, [conversationId]);
  }
}