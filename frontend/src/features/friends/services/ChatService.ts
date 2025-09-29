import { Friend, apiService } from '../../../shared/services/api';
import { PongInviteNotification, PongInviteData } from '../components/PongInviteNotification';
import { GameState, Input } from '../../game/types/GameTypes';
import { router } from '../../../core/app/Router';
import { config } from '../../../config/environment';

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
  messages: Map<number, Message[]>;
  currentConversationId: number | null;
  isConnected: boolean;
  isLoading: boolean;
}

export interface GameStartMessage {
  type: 'start_game';
  opponentId: number;
}

export interface GameInputMessage {
  type: 'update_input';
  input: Input;
}

export interface GameUpdateMessage {
  type: 'game_update';
  data: GameState;
}

export interface GameSuccessMessage {
  type: 'success';
  data: { gameId: number };
}

export interface GameErrorMessage {
  type:
    | 'error'
    | 'err_game_not_found'
    | 'err_player_not_in_game'
    | 'err_game_already_ended'
    | 'err_invalid_input';
  message: string;
}

export type GameWebSocketMessage =
  | GameStartMessage
  | GameInputMessage
  | GameUpdateMessage
  | GameSuccessMessage
  | GameErrorMessage;

type ChatEventListener = (data: any) => void;

export class ChatService {
  private static instance: ChatService;
  private ws: WebSocket | null = null;
  private state: ChatState = {
    conversations: new Map(),
    messages: new Map(),
    currentConversationId: null,
    isConnected: false,
    isLoading: false,
  };

  private currentGameId: number | null = null;
  private gameState: GameState | null = null;
  private isInGame = false;

  private listeners: Map<string, ChatEventListener[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private syncInterval: number | null = null;

  private getApiUrl(endpoint: string): string {
    const API_BASE_URL = config.API_BASE_URL;
    return `${API_BASE_URL}${endpoint}`;
  }

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  static async createAndInitialize(): Promise<ChatService> {
    const instance = ChatService.getInstance();
    await instance.initialize();
    return instance;
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
        this.authenticateWebSocket();
        this.emit('connected', null);
      };

      this.ws!.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws!.onclose = () => {
        this.state.isConnected = false;
        this.emit('disconnected', null);
        this.attemptReconnect();
      };

      this.ws!.onerror = error => {
        console.error('WebSocket error:', error);
        this.emit('error', { error });
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      throw error;
    }
  }

  private authenticateWebSocket(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No token for WebSocket auth');
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: 'auth',
        token: token,
      })
    );
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
    this.stopPeriodicSync();
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'auth_success':
        this.emit('authenticated', data.data);
        this.syncWithServer().catch(error => {
          console.error('Error syncing with server after auth:', error);
        });
        this.startPeriodicSync();
        break;

      case 'auth_error':
        console.error('Auth error:', data.message);
        this.emit('auth_error', data);
        break;

      case 'direct_message_received':
        this.handleMessageReceived(data.data);
        break;

      case 'direct_message_sent':
        this.handleMessageSent(data.data);
        break;

      case 'error':
        console.error('Server error:', data.message);
        this.emit('error', data);
        break;

      case 'game_invite_received':
        this.emit('game_invite_received', data.data);
        break;

      case 'game_invite_response':
        this.emit('game_invite_response', data.data);
        break;

      case 'friend_pong_invite':
        console.log('[ChatService] Invitation Pong reçue:', data);
        this.handlePongInvite(data);
        break;

      case 'success':
        this.handleGameSuccess(data);
        break;

      case 'game_update':
        this.handleGameUpdate(data);
        break;

      case 'game_started':
        this.handleGameStarted(data);
        break;

      case 'game_ended':
        this.handleGameEnded(data);
        break;

      case 'err_game_not_found':
      case 'err_player_not_in_game':
      case 'err_game_already_ended':
      case 'err_invalid_input':
        console.error('Game error:', data.message);
        this.emit('game_error', { type: data.type, message: data.message });
        break;

      case 'pong':
        break;

      case 'friend_pong_start':
        this.handlePongGameStart(data);
        break;

      case 'friend_pong_accepted':
        this.handlePongGameAccepted(data);
        break;

      case 'simple_pong_start':
        this.handleSimplePongStart(data);
        break;

      case 'friend_pong_state':
        this.handlePongGameState(data);
        break;

      case 'simple_pong_state':
        this.handleSimplePongState(data);
        break;

      case 'friend_pong_end':
        this.handlePongGameEnd(data);
        break;

      case 'simple_pong_end':
        this.handleSimplePongEnd(data);
        break;

      case 'friend_pong_error':
        this.handlePongError(data);
        break;

      case 'connected':
        this.handleConnected(data);
        break;

      default:
        console.warn('Unhandled message type:', data.type);
    }
  }

  private handleMessageReceived(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;

    this.state.conversations.set(conversation.id, conversation);

    const messages = this.state.messages.get(conversation.id) || [];
    const exists = messages.find(m => m.id === message.id);
    if (!exists) {
      const newMessages = [...messages, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      this.state.messages.set(conversation.id, newMessages);

      this.saveToLocalStorage();

      this.emit('message_received', { message, conversation });
      this.emit('conversations_updated', Array.from(this.state.conversations.values()));
    }
  }

  private handlePongInvite(data: PongInviteData): void {
    const inviteModal = new PongInviteNotification(data, () => {
      console.log("[ChatService] Modale d'invitation fermée");
    });

    inviteModal.show();

    this.emit('friend_pong_invite', data);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Invitation Pong de ${data.fromUsername || 'un ami'}`, {
        body: "Cliquez pour voir l'invitation",
        icon: '/favicon.png',
      });
    }
  }

  private handleMessageSent(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;

    this.state.conversations.set(conversation.id, conversation);

    const messages = this.state.messages.get(conversation.id) || [];
    const exists = messages.find(m => m.id === message.id);
    if (!exists) {
      const newMessages = [...messages, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      this.state.messages.set(conversation.id, newMessages);

      this.saveToLocalStorage();

      this.emit('message_sent', { message, conversation });
      this.emit('conversations_updated', Array.from(this.state.conversations.values()));
    }
  }

  private handleGameSuccess(data: { data: { gameId: number } }): void {
    this.currentGameId = data.data.gameId;
    this.isInGame = true;
    this.emit('game_joined', { gameId: this.currentGameId });
  }

  private handleGameUpdate(data: { data: GameState }): void {
    if (!this.isInGame || !this.currentGameId) {
      console.warn('Received game update but not in game');
      return;
    }
    this.gameState = data.data;
    this.emit('game_state_update', this.gameState);
  }

  private handleGameStarted(data: {
    data: {
      gameId: number;
      opponent: { id: number; username: string; avatar: string };
      playerSide: 'left' | 'right';
    };
  }): void {
    const { gameId, opponent, playerSide } = data.data;
    this.currentGameId = gameId;
    this.isInGame = true;
    this.emit('game_started', { gameId, opponent, playerSide });
    router.navigate(`/game/${gameId}`).catch(error => {
      console.error('Failed to navigate to game:', error);
      this.emit('game_navigation_error', { error, gameId });
    });
  }

  private handleGameEnded(data: { data: any }): void {
    this.emit('game_ended', data.data);
    this.currentGameId = null;
    this.gameState = null;
    this.isInGame = false;
  }

  private handlePongGameStart(data: any): void {
    console.log('Pong game started:', data);
    if (data.gameId) {
      router.navigate(`/simple-pong?gameId=${data.gameId}`);
    }
  }

  private handlePongGameState(data: any): void {
    console.log('Pong game state update:', data);
    this.emit('pong_game_state', data);
  }

  private handlePongGameEnd(data: any): void {
    console.log('Pong game ended:', data);
    this.emit('pong_game_end', data);
  }

  private handlePongGameAccepted(data: any): void {
    console.log('Pong invitation accepted:', data);
    if (data.gameId) {
      router.navigate(`/simple-pong?gameId=${data.gameId}`);
    } else {
      router.navigate('/simple-pong');
    }
    this.emit('pong_game_accepted', data);
  }

  private handleSimplePongStart(data: any): void {
    console.log('Simple Pong game started:', data);
    if (data.gameId && !window.location.href.includes('simple-pong')) {
      router.navigate(`/simple-pong?gameId=${data.gameId}`);
    }
    this.emit('simple_pong_start', data);
  }

  private handleSimplePongState(data: any): void {
    this.emit('simple_pong_state', data);
  }

  private handleSimplePongEnd(data: any): void {
    console.log('Simple Pong game ended:', data);
    this.emit('simple_pong_end', data);
  }

  private handleConnected(data: any): void {
    console.log('WebSocket connected:', data.message || 'Connection established');
    this.emit('websocket_connected', data);
  }

  private handlePongError(data: any): void {
    console.error('Pong game error:', data.message);
    if (data.message) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Erreur Pong', {
          body: data.message,
          icon: '/favicon.png',
        });
      }
      this.emit('pong_error', data);
    }
  }

  async sendMessage(toUserId: number, content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    if (!content.trim()) {
      throw new Error('Empty message');
    }
    this.ws.send(
      JSON.stringify({
        type: 'direct_message',
        toUserId: toUserId,
        message: content.trim(),
      })
    );
  }

  async loadConversations(): Promise<Conversation[]> {
    try {
      this.state.isLoading = true;
      const token = localStorage.getItem('auth_token');
      const response = await fetch(this.getApiUrl('/api/chat/conversations'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await response.json();
      const conversations = data.conversations || [];
      this.state.conversations.clear();
      conversations.forEach((conv: Conversation) => {
        this.state.conversations.set(conv.id, conv);
      });
      this.saveToLocalStorage();
      this.emit('conversations_updated', conversations);
      return conversations;
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  async loadConversationMessages(conversationId: number, page: number = 1): Promise<Message[]> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        this.getApiUrl(`/api/chat/conversations/${conversationId}/messages?page=${page}&limit=50`),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
      const data = await response.json();
      const serverMessages = data.messages || [];

      const existingMessages = this.state.messages.get(conversationId) || [];
      const mergedMessages = this.mergeMessages(existingMessages, serverMessages);

      this.state.messages.set(conversationId, mergedMessages);
      this.state.currentConversationId = conversationId;

      this.saveToLocalStorage();

      this.emit('messages_loaded', { conversationId, messages: mergedMessages });

      return mergedMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  }

  async createOrGetConversation(withUserId: number): Promise<Conversation> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(this.getApiUrl('/api/chat/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ withUserId }),
      });
      const data = await response.json();
      const conversation = data.data?.conversation || data.conversation || data.data || data;
      if (!conversation) {
        throw new Error('Error creating conversation');
      }
      this.state.conversations.set(conversation.id, conversation);
      this.saveToLocalStorage();
      this.emit('conversation_created', conversation);
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

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
      console.warn(`Unable to remove listener for '${event}' - listener not found`);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in listener ${event}:`, error);
      }
    });
  }

  async startGame(opponentId: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    if (this.isInGame) {
      throw new Error('Already in a game');
    }
    this.ws.send(
      JSON.stringify({
        type: 'start_game',
        opponentId: opponentId,
      })
    );
  }

  sendGameInput(input: Input): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send input - WebSocket not connected');
      return;
    }
    if (!this.isInGame || !this.currentGameId) {
      console.warn('Cannot send input - not in game');
      return;
    }
    this.ws.send(
      JSON.stringify({
        type: 'update_input',
        input: input,
      })
    );
  }

  leaveGame(): void {
    if (this.isInGame && this.currentGameId) {
      this.emit('game_left', { gameId: this.currentGameId });
      this.currentGameId = null;
      this.gameState = null;
      this.isInGame = false;
    }
  }

  getCurrentGameId(): number | null {
    return this.currentGameId;
  }

  getCurrentGameState(): GameState | null {
    return this.gameState;
  }

  isCurrentlyInGame(): boolean {
    return this.isInGame;
  }

  formatMessageTime(timestamp: string): string {
    return '';
  }

  getOtherUserInConversation(
    conversation: Conversation,
    currentUserId: number
  ): {
    id: number;
    username: string;
    avatar: string;
  } {
    if (conversation.user1_id === currentUserId) {
      return {
        id: conversation.user2_id,
        username: conversation.user2_username,
        avatar: conversation.user2_avatar,
      };
    } else {
      return {
        id: conversation.user1_id,
        username: conversation.user1_username,
        avatar: conversation.user1_avatar,
      };
    }
  }

  private saveToLocalStorage(): void {
    try {
      const conversationsArray = Array.from(this.state.conversations.entries());
      const messagesArray = Array.from(this.state.messages.entries());

      localStorage.setItem('chat_conversations', JSON.stringify(conversationsArray));
      localStorage.setItem('chat_messages', JSON.stringify(messagesArray));
      localStorage.setItem(
        'chat_current_conversation',
        this.state.currentConversationId?.toString() || ''
      );
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private mergeMessages(existingMessages: Message[], newMessages: Message[]): Message[] {
    const messageMap = new Map<number, Message>();

    existingMessages.forEach(msg => messageMap.set(msg.id, msg));

    newMessages.forEach(msg => messageMap.set(msg.id, msg));

    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async initialize(): Promise<void> {
    try {
      if (this.state.isConnected) {
        await this.syncWithServer();
      } else {
        this.loadFromLocalStorage();
        this.restoreState();
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      this.loadFromLocalStorage();
      this.restoreState();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const conversationsData = localStorage.getItem('chat_conversations');
      const messagesData = localStorage.getItem('chat_messages');
      const currentConversationData = localStorage.getItem('chat_current_conversation');

      if (conversationsData) {
        const conversationsArray = JSON.parse(conversationsData);
        this.state.conversations = new Map(conversationsArray);
      }

      if (messagesData) {
        const messagesArray = JSON.parse(messagesData);
        this.state.messages = new Map(messagesArray);
      }

      if (currentConversationData && currentConversationData !== '') {
        this.state.currentConversationId = parseInt(currentConversationData);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  private async syncWithServer(): Promise<void> {
    try {
      this.loadFromLocalStorage();

      await this.loadConversations();

      if (this.state.currentConversationId) {
        await this.loadConversationMessages(this.state.currentConversationId);
      }

      this.restoreState();
    } catch (error) {
      console.error('Error syncing with server:', error);
      this.restoreState();
    }
  }

  async refreshMessages(conversationId?: number): Promise<void> {
    try {
      await this.loadConversations();

      if (conversationId) {
        await this.loadConversationMessages(conversationId);
      } else if (this.state.currentConversationId) {
        await this.loadConversationMessages(this.state.currentConversationId);
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
      throw error;
    }
  }

  startPeriodicSync(): void {
    this.stopPeriodicSync();

    this.syncInterval = window.setInterval(() => {
      if (this.state.isConnected && this.state.currentConversationId) {
        this.refreshMessages(this.state.currentConversationId).catch(error => {
          console.error('Error in periodic sync:', error);
        });
      }
    }, 30000);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  restoreState(): void {
    if (this.state.conversations.size > 0) {
      this.emit('conversations_updated', Array.from(this.state.conversations.values()));
    }

    if (
      this.state.currentConversationId &&
      this.state.messages.has(this.state.currentConversationId)
    ) {
      const messages = this.state.messages.get(this.state.currentConversationId) || [];
      this.emit('messages_loaded', {
        conversationId: this.state.currentConversationId,
        messages,
      });
    }
  }
}

export const chatService = ChatService.getInstance();
