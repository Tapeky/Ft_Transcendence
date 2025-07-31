// 🎯 KISS Game Invite Service - Intégré avec WebSocket existant
import { apiService } from './api';

export class GameInviteService {
  private ws: WebSocket | null = null;
  private onInviteReceivedCallback?: (invite: GameInvite) => void;
  private onInviteDeclinedCallback?: (data: any) => void;
  private onGameStartedCallback?: (data: any) => void;
  private onInviteErrorCallback?: (error: string) => void;
  private onInviteSentCallback?: (data: any) => void;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      // Utiliser la même méthode que l'API existante
      this.ws = apiService.connectWebSocket();
      
      this.ws.onopen = () => {
        console.log('🎮 KISS: WebSocket connected');
        this.reconnectAttempts = 0;
        this.authenticate();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('🎮 KISS: Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🎮 KISS: WebSocket disconnected');
        this.isAuthenticated = false;
        this.reconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('🎮 KISS: WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('🎮 KISS: Failed to connect WebSocket:', error);
      this.reconnect();
    }
  }

  private authenticate(): void {
    console.log('🎮 KISS: Starting authentication...');
    
    // Vérification défensive pour éviter les erreurs de méthode manquante
    if (!apiService || typeof apiService.getToken !== 'function') {
      console.error('🎮 KISS: apiService.getToken is not available');
      // Fallback - essayer de récupérer le token directement du localStorage
      const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
      console.log('🎮 KISS: Fallback token found:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      if (!token || !this.ws) {
        console.error('🎮 KISS: No token found or no WebSocket connection');
        return;
      }
      
      console.log('🎮 KISS: Sending auth with fallback token');
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
      return;
    }

    const token = apiService.getToken();
    console.log('🎮 KISS: Token from apiService:', token ? `${token.substring(0, 20)}...` : 'NULL');
    
    if (!token || !this.ws) {
      console.error('🎮 KISS: No token found or no WebSocket connection');
      return;
    }

    console.log('🎮 KISS: Sending auth with apiService token');
    this.ws.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'auth_success':
        console.log('🎮 KISS: Authenticated successfully');
        this.isAuthenticated = true;
        break;

      case 'auth_error':
        console.error('🎮 KISS: Authentication failed:', data.message);
        break;

      case 'game_invite_received':
        console.log('🎮 KISS: Game invite received:', data);
        if (this.onInviteReceivedCallback) {
          const invite: GameInvite = {
            inviteId: data.inviteId,
            fromUserId: data.fromUserId,
            fromUsername: data.fromUsername,
            expiresAt: data.expiresAt
          };
          this.onInviteReceivedCallback(invite);
        }
        break;

      case 'invite_sent':
        console.log('🎮 KISS: Invite sent to:', data.toUsername);
        if (this.onInviteSentCallback) {
          this.onInviteSentCallback(data);
        }
        break;

      case 'invite_declined':
        console.log('🎮 KISS: Invite declined by:', data.byUsername);
        if (this.onInviteDeclinedCallback) {
          this.onInviteDeclinedCallback(data);
        }
        break;

      case 'game_started':
        console.log('🎮 KISS: Game started:', data);
        if (this.onGameStartedCallback) {
          this.onGameStartedCallback(data);
        }
        
        // 🎯 Stocker les infos pour la reconnexion Game.ts
        localStorage.setItem('kiss_game_id', data.gameId.toString());
        localStorage.setItem('kiss_opponent_id', data.opponent.id.toString());
        
        // Navigation automatique vers le jeu
        this.navigateToGame(data.gameId);
        break;

      case 'invite_error':
        console.error('🎮 KISS: Invite error:', data.message);
        if (this.onInviteErrorCallback) {
          this.onInviteErrorCallback(data.message);
        }
        break;

      case 'invite_expired':
        console.log('🎮 KISS: Invite expired:', data.inviteId);
        break;

      case 'connected':
        console.log('🎮 KISS: Connected to server');
        break;

      case 'pong':
        // Heartbeat response - ignore
        break;

      default:
        // Message non traité par ce service
        break;
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🎮 KISS: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🎮 KISS: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private navigateToGame(gameId: number): void {
    // Utilisation du router existant
    if ((window as any).router) {
      (window as any).router.navigate(`/game/${gameId}`);
    } else {
      // Fallback
      window.location.href = `/game/${gameId}`;
    }
  }

  // 📤 Envoyer invitation
  sendInvite(userId: number): void {
    if (!this.ws || !this.isAuthenticated) {
      console.error('🎮 KISS: Not connected or authenticated');
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'send_game_invite',
      toUserId: userId
    }));
  }

  // ✅ Répondre à invitation
  respondToInvite(inviteId: string, accept: boolean): void {
    if (!this.ws || !this.isAuthenticated) {
      console.error('🎮 KISS: Not connected or authenticated');
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'respond_game_invite',
      inviteId: inviteId,
      accept: accept
    }));
  }

  // 🎧 Callbacks pour les événements
  onInviteReceived(callback: (invite: GameInvite) => void): void {
    this.onInviteReceivedCallback = callback;
  }

  onInviteDeclined(callback: (data: any) => void): void {
    this.onInviteDeclinedCallback = callback;
  }

  onGameStarted(callback: (data: any) => void): void {
    this.onGameStartedCallback = callback;
  }

  onInviteError(callback: (error: string) => void): void {
    this.onInviteErrorCallback = callback;
  }

  onInviteSent(callback: (data: any) => void): void {
    this.onInviteSentCallback = callback;
  }

  // 🔌 État de la connexion
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  // 🧹 Cleanup
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
  }
}

export interface GameInvite {
  inviteId: string;
  fromUserId: number;
  fromUsername: string;
  expiresAt: number;
}

// Export singleton
export const gameInviteService = new GameInviteService();