import { apiService } from '../../../shared/services/api';
import { gameService } from '../../game/services/GameService';

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
}

interface WebSocketAuthMessage {
  type: 'auth';
  token: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}


interface MessageReceivedMessage extends WebSocketMessage {
  type: 'direct_message_received';
  data: { message: Message; conversation: Conversation };
}

interface MessageSentMessage extends WebSocketMessage {
  type: 'direct_message_sent';
  data: { message: Message; conversation: Conversation };
}

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



type ChatEventListener<T = any> = (data: T) => void;

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

  private getApiUrl(endpoint: string): string {
    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://localhost:8000';
    return `${API_BASE_URL}${endpoint}`;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAuthToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    });
  }

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }


  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = apiService.connectWebSocket();
      
      this.ws!.onopen = () => {
        this.state.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Automatic authentication
        this.authenticateWebSocket();
        
        // Share WebSocket with GameService
        gameService.setWebSocket(this.ws);
        
        this.emit('connected', null);
      };

      this.ws!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('ChatService: Error parsing message:', error);
        }
      };

      this.ws!.onclose = () => {
        this.state.isConnected = false;
        this.emit('disconnected', null);
        
        // Attempt reconnection
        this.attemptReconnect();
      };

      this.ws!.onerror = (error) => {
        console.error('ChatService: WebSocket error:', error);
        this.emit('error', { error });
      };

    } catch (error) {
      console.error('ChatService: WebSocket connection error:', error);
      throw error;
    }
  }

  private authenticateWebSocket(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const token = this.getAuthToken();
    if (!token) {
      console.error('ChatService: No auth token available');
      return;
    }

    const authMessage: WebSocketAuthMessage = {
      type: 'auth',
      token
    };
    
    this.ws.send(JSON.stringify(authMessage));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('ChatService: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('ChatService: Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
    gameService.setWebSocket(null);
  }

  // ============ Message Handling ============

  private handleWebSocketMessage(data: WebSocketMessage): void {

    switch (data.type) {
      case 'auth_success':
        this.emit('authenticated', data.data);
        break;

      case 'auth_error':
        console.error('ChatService: Authentication error:', data.message);
        this.emit('auth_error', data);
        break;

      case 'direct_message_received':
        this.handleMessageReceived(data as MessageReceivedMessage);
        break;

      case 'direct_message_sent':
        this.handleMessageSent(data as MessageSentMessage);
        break;

      case 'error':
        console.error('ChatService: Server error:', data.message);
        this.emit('error', data);
        break;

      case 'game_invite_received':
        this.emit('game_invite_received', data.data);
        break;

      case 'game_invite_response':
        this.emit('game_invite_response', data.data);
        break;

      // ============ Game Messages - Delegate to GameService ============
      case 'success':
        gameService.handleGameSuccess(data as any);
        break;

      case 'game_update':
        gameService.handleGameUpdate(data as any);
        break;

      case 'game_started':
        gameService.handleGameStarted(data as any);
        break;

      case 'game_ended':
        gameService.handleGameEnded(data as any);
        break;

      case 'err_game_not_found':
      case 'err_player_not_in_game':
      case 'err_game_already_ended':
      case 'err_invalid_input':
        gameService.handleGameError(data.type, data.message);
        break;

      case 'pong':
        break;

      default:
        console.warn('ChatService: Unhandled message type:', data.type);
    }
  }

  private handleMessageReceived(data: MessageReceivedMessage): void {
    const { message, conversation } = data.data;
    
    this.updateConversation(conversation);
    this.addMessageToConversation(conversation.id, message);
    
    this.emit('message_received', { message, conversation });
    this.emit('conversations_updated', Array.from(this.state.conversations.values()));
  }

  private handleMessageSent(data: MessageSentMessage): void {
    const { message, conversation } = data.data;
    
    this.updateConversation(conversation);
    this.addMessageToConversation(conversation.id, message);
    
    this.emit('message_sent', { message, conversation });
    this.emit('conversations_updated', Array.from(this.state.conversations.values()));
  }

  private updateConversation(conversation: Conversation): void {
    this.state.conversations.set(conversation.id, conversation);
  }

  private addMessageToConversation(conversationId: number, message: Message): void {
    const messages = this.state.messages.get(conversationId) || [];
    const exists = messages.find(m => m.id === message.id);
    
    if (!exists) {
      messages.push(message);
      this.state.messages.set(conversationId, messages);
    }
  }


  // ============ Public API ============

  async sendMessage(toUserId: number, content: string): Promise<void> {
    this.validateWebSocketConnection();
    
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error('Empty message');
    }

    this.ws!.send(JSON.stringify({
      type: 'direct_message',
      toUserId,
      message: trimmedContent
    }));
  }

  private validateWebSocketConnection(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
  }

  async loadConversations(): Promise<Conversation[]> {
    try {
      this.state.isLoading = true;
      
      const response = await this.fetchWithAuth(this.getApiUrl('/api/chat/conversations'));
      const data: ApiResponse<{ conversations: Conversation[] }> = await response.json();
      const conversations = data.data?.conversations || [];
      
      this.state.conversations.clear();
      conversations.forEach((conv: Conversation) => {
        this.state.conversations.set(conv.id, conv);
      });
      
      this.emit('conversations_updated', conversations);
      return conversations;
      
    } catch (error) {
      console.error('ChatService: Error loading conversations:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  async loadConversationMessages(conversationId: number, page: number = 1): Promise<Message[]> {
    try {
      const url = this.getApiUrl(`/api/chat/conversations/${conversationId}/messages?page=${page}&limit=50`);
      const response = await this.fetchWithAuth(url);
      const data: ApiResponse<{ messages: Message[] }> = await response.json();
      const messages = data.data?.messages || [];
      
      this.state.messages.set(conversationId, messages);
      this.state.currentConversationId = conversationId;
      
      this.emit('messages_loaded', { conversationId, messages });
      return messages;
      
    } catch (error) {
      console.error('ChatService: Error loading messages:', error);
      throw error;
    }
  }

  async createOrGetConversation(withUserId: number): Promise<Conversation> {
    try {
      const response = await this.fetchWithAuth(this.getApiUrl('/api/chat/conversations'), {
        method: 'POST',
        body: JSON.stringify({ withUserId })
      });
      
      const data: ApiResponse = await response.json();
      const conversation = this.extractConversationFromResponse(data);
      
      if (!conversation) {
        throw new Error('Failed to create conversation');
      }
      
      this.state.conversations.set(conversation.id, conversation);
      this.emit('conversation_created', conversation);
      
      return conversation;
      
    } catch (error) {
      console.error('ChatService: Error creating conversation:', error);
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
    } else {
      console.warn(`ChatService: Cannot remove listener for '${event}' - listener not found`);
    }
  }

  private emit<T = any>(event: string, data: T): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`ChatService: Error in ${event} listener:`, error);
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

  private extractConversationFromResponse(data: ApiResponse): Conversation | null {
    return data.data?.conversation || data.data || null;
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance();