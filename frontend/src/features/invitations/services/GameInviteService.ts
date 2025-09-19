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
  private externalWsHandler?: (message: any) => void;

  constructor() {
    setTimeout(() => this.initializeIfNeeded(), 1000);
  }
  
  private initializeIfNeeded(): void {
    if (!window.location.pathname.includes('/game')) {
      this.connect();
    }
  }

  private connect(): void {
    try {
      this.ws = apiService.connectWebSocket();

      this.ws!.onopen = () => {
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
        
        localStorage.setItem('kiss_game_id', data.gameId.toString());
        localStorage.setItem('kiss_opponent_id', data.opponent.id.toString());
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
        break;

      default:
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
    if (window.router) {
      window.router.navigate(`/game/${gameId}`);
    } else {
      window.location.href = `/game/${gameId}`;
    }
  }

  sendInvite(userId: number): void {
    const message = {
      type: 'send_game_invite',
      toUserId: userId
    };

    if (this.externalWsHandler) {
      this.externalWsHandler(message);
      return;
    }

    if (!this.isConnected()) {
      this.connect();
      return;
    }

    this.ws!.send(JSON.stringify(message));
  }

  respondToInvite(inviteId: string, accept: boolean): void {
    const message = {
      type: 'respond_game_invite',
      inviteId: inviteId,
      accept: accept
    };

    if (this.externalWsHandler) {
      this.externalWsHandler(message);
      return;
    }

    if (!this.isConnected()) {
      return;
    }

    this.ws!.send(JSON.stringify(message));
  }

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

  isConnected(): boolean {
    return (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) || !!this.externalWsHandler;
  }
  
  setExternalWebSocketHandler(handler: (message: any) => void): void {
    this.externalWsHandler = handler;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
    }
  }
  
  removeExternalWebSocketHandler(): void {
    this.externalWsHandler = undefined;
    if (!window.location.pathname.includes('/game')) {
      setTimeout(() => this.connect(), 500);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
  }

  forceReconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;

    setTimeout(() => {
      this.connect();
    }, 500);
  }

  cleanup(): void {
    this.disconnect();

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

export const gameInviteService = new GameInviteService();