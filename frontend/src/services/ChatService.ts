import { apiService } from './api';

// Types pour le frontend
export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  created_at: string;
  updated_at: string;
  user1_username: string;
  user1_avatar: string;
  user2_username: string;
  user2_avatar: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  type: 'text' | 'game_invite' | 'tournament_notification' | 'system';
  metadata?: string;
  created_at: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
}

export interface ChatState {
  conversations: Map<number, Conversation>;
  messages: Map<number, Message[]>; // conversation_id -> messages
  currentConversationId: number | null;
  isConnected: boolean;
  isLoading: boolean;
}

type ChatEventListener = (data: any) => void;

export class ChatService {
  private static instance: ChatService;
  private ws: WebSocket | null = null;
  private state: ChatState = {
    conversations: new Map(),
    messages: new Map(),
    currentConversationId: null,
    isConnected: false,
    isLoading: false
  };
  
  private listeners: Map<string, ChatEventListener[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // ============ WebSocket Connection ============

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Déjà connecté
    }

    try {
      this.ws = apiService.connectWebSocket();
      
      this.ws.onopen = () => {
        console.log('🌐 ChatService: WebSocket connecté');
        this.state.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Authentification automatique
        this.authenticateWebSocket();
        
        this.emit('connected', null);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ ChatService: Erreur parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 ChatService: WebSocket fermé');
        this.state.isConnected = false;
        this.emit('disconnected', null);
        
        // Tentative de reconnexion
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ ChatService: Erreur WebSocket:', error);
        this.emit('error', { error });
      };

    } catch (error) {
      console.error('❌ ChatService: Erreur connexion WebSocket:', error);
      throw error;
    }
  }

  private authenticateWebSocket(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ ChatService: Pas de token pour auth WebSocket');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ ChatService: Max tentatives de reconnexion atteintes');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 ChatService: Tentative reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ ChatService: Échec reconnexion:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
  }

  // ============ Message Handling ============

  private handleWebSocketMessage(data: any): void {
    console.log('📨 ChatService: Message reçu:', data);

    switch (data.type) {
      case 'auth_success':
        console.log('✅ ChatService: Authentification réussie');
        this.emit('authenticated', data.data);
        break;

      case 'auth_error':
        console.error('❌ ChatService: Erreur authentification:', data.message);
        this.emit('auth_error', data);
        break;

      case 'direct_message_received':
        this.handleMessageReceived(data.data);
        break;

      case 'direct_message_sent':
        this.handleMessageSent(data.data);
        break;

      case 'error':
        console.error('❌ ChatService: Erreur serveur:', data.message);
        this.emit('error', data);
        break;

      case 'game_invite_received':
        console.log('🎮 ChatService: Game invite received:', data.data);
        this.emit('game_invite_received', data.data);
        break;

      case 'game_invite_response':
        console.log('🎮 ChatService: Game invite response:', data.data);
        this.emit('game_invite_response', data.data);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('⚠️ ChatService: Type de message non géré:', data.type);
    }
  }

  private handleMessageReceived(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    // Mettre à jour la conversation
    this.state.conversations.set(conversation.id, conversation);
    
    // Ajouter le message
    const messages = this.state.messages.get(conversation.id) || [];
    messages.push(message);
    this.state.messages.set(conversation.id, messages);
    
    // Émettre les événements
    this.emit('message_received', { message, conversation });
    this.emit('conversations_updated', Array.from(this.state.conversations.values()));
  }

  private handleMessageSent(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    // Mettre à jour la conversation
    this.state.conversations.set(conversation.id, conversation);
    
    // Ajouter le message (si pas déjà là)
    const messages = this.state.messages.get(conversation.id) || [];
    const exists = messages.find(m => m.id === message.id);
    if (!exists) {
      messages.push(message);
      this.state.messages.set(conversation.id, messages);
    }
    
    // Émettre les événements
    this.emit('message_sent', { message, conversation });
    this.emit('conversations_updated', Array.from(this.state.conversations.values()));
  }

  // ============ Public API ============

  async sendMessage(toUserId: number, content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    if (!content.trim()) {
      throw new Error('Message vide');
    }

    this.ws.send(JSON.stringify({
      type: 'direct_message',
      toUserId: toUserId,
      message: content.trim()
    }));
  }

  async loadConversations(): Promise<Conversation[]> {
    try {
      this.state.isLoading = true;
      
      const response = await apiService.request<{ conversations: Conversation[] }>('/api/chat/conversations');
      const conversations = response.data?.conversations || [];
      
      // Mettre à jour le state
      this.state.conversations.clear();
      conversations.forEach(conv => {
        this.state.conversations.set(conv.id, conv);
      });
      
      this.emit('conversations_updated', conversations);
      return conversations;
      
    } catch (error) {
      console.error('❌ ChatService: Erreur chargement conversations:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  async loadConversationMessages(conversationId: number, page: number = 1): Promise<Message[]> {
    try {
      const response = await apiService.request<{ messages: Message[] }>(
        `/api/chat/conversations/${conversationId}/messages?page=${page}&limit=50`
      );
      
      const messages = response.data?.messages || [];
      
      // Mettre à jour le state
      this.state.messages.set(conversationId, messages);
      this.state.currentConversationId = conversationId;
      
      this.emit('messages_loaded', { conversationId, messages });
      return messages;
      
    } catch (error) {
      console.error('❌ ChatService: Erreur chargement messages:', error);
      throw error;
    }
  }

  async createOrGetConversation(withUserId: number): Promise<Conversation> {
    try {
      const response = await apiService.request<{ conversation: Conversation }>('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ withUserId })
      });
      
      const conversation = response.data?.conversation;
      if (!conversation) {
        throw new Error('Erreur création conversation');
      }
      
      this.state.conversations.set(conversation.id, conversation);
      this.emit('conversation_created', conversation);
      
      return conversation;
      
    } catch (error) {
      console.error('❌ ChatService: Erreur création conversation:', error);
      throw error;
    }
  }

  // ============ State Getters ============

  getConversations(): Conversation[] {
    return Array.from(this.state.conversations.values());
  }

  getConversationMessages(conversationId: number): Message[] {
    return this.state.messages.get(conversationId) || [];
  }

  getCurrentConversationId(): number | null {
    return this.state.currentConversationId;
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  isLoading(): boolean {
    return this.state.isLoading;
  }

  // ============ Event System ============

  on(event: string, listener: ChatEventListener): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: ChatEventListener): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.listeners.set(event, listeners);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`❌ ChatService: Erreur dans listener ${event}:`, error);
      }
    });
  }

  // ============ Utility ============

  getOtherUserInConversation(conversation: Conversation, currentUserId: number): {
    id: number;
    username: string;
    avatar: string;
  } {
    if (conversation.user1_id === currentUserId) {
      return {
        id: conversation.user2_id,
        username: conversation.user2_username,
        avatar: conversation.user2_avatar
      };
    } else {
      return {
        id: conversation.user1_id,
        username: conversation.user1_username,
        avatar: conversation.user1_avatar
      };
    }
  }

  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance();