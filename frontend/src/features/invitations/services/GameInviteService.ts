// 🎯 KISS Game Invite Service - Intégré avec WebSocket existant
import { apiService } from '../../../shared/services/api';

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
      
      this.ws!.onopen = () => {
        // KISS: Reset reconnection attempts on successful connection
        this.reconnectAttempts = 0;
        this.authenticate();
      };
      
      this.ws!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
        }
      };
      
      this.ws!.onclose = () => {
        this.isAuthenticated = false;
        this.reconnect();
      };
      
      this.ws!.onerror = (error) => {
      };
      
    } catch (error) {
      this.reconnect();
    }
  }

  private authenticate(): void {
    
    // KISS: Une seule méthode d'authentification - toujours localStorage en premier
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    
    if (!token || !this.ws) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'auth_success':
        this.isAuthenticated = true;
        // KISS: Ensure reconnection attempts are reset after successful auth
        this.reconnectAttempts = 0;
        break;

      case 'auth_error':
        break;

      case 'game_invite_received':
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
        if (this.onInviteSentCallback) {
          this.onInviteSentCallback(data);
        }
        break;

      case 'invite_declined':
        if (this.onInviteDeclinedCallback) {
          this.onInviteDeclinedCallback(data);
        }
        break;

      case 'game_started':
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
        if (this.onInviteErrorCallback) {
          this.onInviteErrorCallback(data.message);
        }
        break;

      case 'invite_expired':
        break;

      case 'connected':
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
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    
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
    // KISS: Connection state validation
    if (!this.isConnected()) {
      this.connect();
      return;
    }
    
    this.ws!.send(JSON.stringify({
      type: 'send_game_invite',
      toUserId: userId
    }));
  }

  // ✅ Répondre à invitation
  respondToInvite(inviteId: string, accept: boolean): void {
    // KISS: Connection state validation
    if (!this.isConnected()) {
      return;
    }
    
    this.ws!.send(JSON.stringify({
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

  // 🔄 Force reconnection (pour éviter les conflits avec Game.ts)
  forceReconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    
    // Reconnection immédiate
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  // KISS: Basic cleanup method for singleton
  cleanup(): void {
    this.disconnect();
    
    // Clear all callbacks
    this.onInviteReceivedCallback = undefined;
    this.onInviteDeclinedCallback = undefined;
    this.onGameStartedCallback = undefined;
    this.onInviteErrorCallback = undefined;
    this.onInviteSentCallback = undefined;
    
    this.reconnectAttempts = 0;
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