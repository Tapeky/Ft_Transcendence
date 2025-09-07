// 🎯 WebSocket Manager - Robuste et Thread-Safe
import { apiService } from '../../../shared/services/api';
import { invitationStore } from './InvitationStore';
import { WebSocketMessage, INVITATION_CONSTANTS } from '../types/InvitationTypes';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private externalHandler: ((message: WebSocketMessage) => boolean) | null = null; // Returns true if handled
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = INVITATION_CONSTANTS.MAX_RETRIES;
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  
  // Circuit breaker
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitFailures = 0;
  private circuitLastFailure = 0;
  private readonly CIRCUIT_FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_RECOVERY_TIMEOUT = 30000; // 30s

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private constructor() {
    // Auto-connect quand pas en jeu
    this.scheduleConnect();
  }

  // 🔌 Connection Management
  private scheduleConnect(): void {
    if (this.shouldConnect()) {
      setTimeout(() => this.connect(), 1000);
    }
  }

  private shouldConnect(): boolean {
    // Toujours se connecter pour les invitations, Game.ts utilise l'external handler
    return !this.ws && 
           !this.isConnecting &&
           this.circuitState !== 'open';
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      console.log('🔌 WebSocketManager - Already connecting/connected, skipping');
      return;
    }

    console.log('🔌 WebSocketManager - Initiating connection...');

    // Circuit breaker check
    if (this.circuitState === 'open') {
      const timeSinceLastFailure = Date.now() - this.circuitLastFailure;
      if (timeSinceLastFailure < this.CIRCUIT_RECOVERY_TIMEOUT) {
        console.log('🔴 Circuit breaker: Connection blocked');
        return;
      }
      this.circuitState = 'half-open';
    }

    this.isConnecting = true;
    invitationStore.setConnectionState('connecting');

    try {
      this.ws = apiService.connectWebSocket();
      this.setupWebSocketListeners();
      
      // Timeout pour la connexion
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.handleConnectionError('Connection timeout');
        }
      }, 10000); // 10 secondes

      this.ws.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
        this.onConnectionOpen();
      }, { once: true });

    } catch (error) {
      this.handleConnectionError(`Connection failed: ${error}`);
    }
  }

  private onConnectionOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.circuitFailures = 0;
    this.circuitState = 'closed';
    
    console.log('✅ WebSocketManager connected');
    invitationStore.setConnectionState('connected');
    
    this.authenticate();
    this.startHeartbeat();
    this.processMessageQueue();
  }

  private setupWebSocketListeners(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error, event.data);
        invitationStore.setConnectionState('error', 'Message parse error');
      }
    };

    this.ws.onclose = (event) => {
      this.onConnectionClose(event);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleConnectionError('WebSocket error');
    };
  }

  private onConnectionClose(event: CloseEvent): void {
    console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.ws = null;
    
    this.stopHeartbeat();
    invitationStore.setConnectionState('disconnected');

    // Reconnect si pas volontaire
    if (!event.wasClean && this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }

  private handleConnectionError(error: string): void {
    this.isConnecting = false;
    this.circuitFailures++;
    this.circuitLastFailure = Date.now();
    
    console.error(`❌ Connection error: ${error}`);
    
    // Circuit breaker logic
    if (this.circuitFailures >= this.CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitState = 'open';
      console.log('🔴 Circuit breaker: OPEN');
    }
    
    invitationStore.setConnectionState('error', error);
    
    if (this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts && 
           this.circuitState !== 'open';
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    
    console.log(`⏳ Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 🔐 Authentication
  private authenticate(): void {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ WebSocketManager - No authentication token found');
      invitationStore.setConnectionState('error', 'No authentication token');
      return;
    }

    console.log('🔐 WebSocketManager - Authenticating with token');

    // Validation basique du token (pas expiré)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.error('❌ WebSocketManager - Token expired');
        invitationStore.setConnectionState('error', 'Token expired');
        return;
      }
    } catch (e) {
      // Token format invalide, mais on essaie quand même
      console.warn('⚠️ WebSocketManager - Invalid token format, trying anyway');
    }

    this.sendMessage({
      type: 'auth',
      token: token
    });
  }

  // 💓 Heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }

    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'ping' });
      }
    }, INVITATION_CONSTANTS.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  // 📨 Message Handling
  private handleMessage(message: WebSocketMessage): void {
    console.log('🔌 WebSocketManager - Message received:', message.type, message);
    
    // SIMPLIFIÉ: Traiter directement tous les messages d'invitation
    // Plus d'external handler pour éviter les conflits
    console.log(`🔌 Processing invitation message: ${message.type}`);
    this.handleInvitationMessage(message);
  }

  private handleInvitationMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'auth_success':
        this.isAuthenticated = true;
        console.log('✅ WebSocketManager authenticated successfully');
        break;

      case 'auth_error':
        console.error('❌ Authentication failed:', message.message);
        invitationStore.setConnectionState('error', `Auth failed: ${message.message}`);
        break;

      case 'game_invite_received':
        console.log('📨 WebSocketManager - Game invite received:', message);
        const invite = {
          inviteId: message.inviteId,
          fromUserId: message.fromUserId,
          fromUsername: message.fromUsername,
          expiresAt: message.expiresAt || (Date.now() + INVITATION_CONSTANTS.DEFAULT_TIMEOUT)
        };
        console.log('📨 Adding to store:', invite);
        invitationStore.addReceivedInvite(invite);
        break;

      case 'invite_sent':
        console.log('✈️ Invite sent confirmation:', message);
        if (message.inviteId) {
          invitationStore.addSentInvite(message.toUserId, message.inviteId);
        }
        break;

      case 'invite_declined':
        console.log('❌ Invite declined:', message);
        if (message.inviteId) {
          invitationStore.updateSentInviteStatus(message.inviteId, 'declined');
        }
        break;

      case 'invite_expired':
        console.log('⏰ Invite expired:', message);
        if (message.inviteId) {
          invitationStore.expireInvite(message.inviteId);
        }
        break;

      case 'game_started':
        console.log('🎮 Game started:', message);
        if (message.inviteId) {
          invitationStore.updateSentInviteStatus(message.inviteId, 'accepted');
        }
        this.handleGameStart(message);
        break;

      case 'invite_error':
        console.error('❌ Invite error:', message);
        invitationStore.emit('error', {
          type: 'server',
          message: message.message,
          inviteId: message.inviteId
        });
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'connected':
        console.log('🔌 Server connection confirmed');
        break;

      default:
        // Message non traité par ce gestionnaire
        break;
    }
  }

  private handleGameStart(data: any): void {
    // Stocker les infos pour la navigation
    if (data.gameId && data.opponent?.id) {
      try {
        localStorage.setItem('kiss_game_id', data.gameId.toString());
        localStorage.setItem('kiss_opponent_id', data.opponent.id.toString());
        
        // Navigation sécurisée
        this.navigateToGame(data.gameId);
      } catch (error) {
        console.error('❌ Error storing game data:', error);
      }
    }
  }

  private navigateToGame(gameId: number): void {
    try {
      // Essayer le router SPA d'abord
      if ((window as any).router && typeof (window as any).router.navigate === 'function') {
        (window as any).router.navigate(`/game/${gameId}`);
      } else {
        // Fallback avec confirmation
        if (confirm(`Game ready! Navigate to /game/${gameId}?`)) {
          window.location.href = `/game/${gameId}`;
        }
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  }

  // 📤 Message Sending
  sendMessage(message: WebSocketMessage): boolean {
    // Validation
    if (!message || typeof message.type !== 'string') {
      console.error('❌ Invalid message format:', message);
      return false;
    }

    // Si connecté, envoyer directement
    if (this.isConnected() && this.isAuthenticated) {
      try {
        this.ws!.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        this.handleConnectionError('Send failed');
        return false;
      }
    }

    // Sinon, ajouter à la queue et tenter connexion
    if (this.messageQueue.length < 10) { // Limite la queue
      this.messageQueue.push(message);
      
      if (!this.isConnecting) {
        this.connect();
      }
      return true;
    } else {
      console.error('❌ Message queue full, dropping message:', message);
      return false;
    }
  }

  private processMessageQueue(): void {
    if (!this.isConnected() || !this.isAuthenticated) return;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      if (!this.sendMessage(message)) {
        // Re-ajouter à la tête de queue si échec
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // 🔗 External Handler (pour Game.ts)
  setExternalHandler(handler: (message: WebSocketMessage) => boolean): void {
    this.externalHandler = handler;
    
    // Fermer notre connexion si elle existe (Game.ts prend le relais)
    if (this.ws) {
      this.disconnect();
    }
  }

  removeExternalHandler(): void {
    this.externalHandler = null;
    
    // Redémarrer notre connexion si nécessaire
    if (!this.ws && this.shouldConnect()) {
      this.scheduleConnect();
    }
  }

  // 🔌 Status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionInfo(): { 
    state: string; 
    authenticated: boolean; 
    reconnectAttempts: number; 
    circuitState: string;
    queueSize: number;
  } {
    return {
      state: this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      circuitState: this.circuitState,
      queueSize: this.messageQueue.length
    };
  }

  // 🧹 Cleanup
  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    this.isConnecting = false;
    this.messageQueue.length = 0;
    
    invitationStore.setConnectionState('disconnected');
  }

  forceReconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.circuitFailures = 0;
    this.circuitState = 'closed';
    
    setTimeout(() => this.connect(), 500);
  }

  destroy(): void {
    this.disconnect();
    this.externalHandler = null;
    WebSocketManager.instance = null as any;
  }
}

export const webSocketManager = WebSocketManager.getInstance();