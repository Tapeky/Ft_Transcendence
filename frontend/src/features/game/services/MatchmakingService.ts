// Ultra Simple Matchmaking Service - Frontend
import { WebSocketManager } from '../../invitations/core/WebSocketManager';

export interface MatchmakingStatus {
  isSearching: boolean;
  position?: number;
  totalInQueue?: number;
}

export interface MatchFound {
  matchId: string;
  opponent: {
    id: number;
    username: string;
  };
}

export class MatchmakingService {
  private static instance: MatchmakingService;
  private wsManager: WebSocketManager;
  private status: MatchmakingStatus = { isSearching: false };
  
  // Callbacks
  private onStatusChange?: (status: MatchmakingStatus) => void;
  private onMatchFound?: (match: MatchFound) => void;
  private onError?: (error: string) => void;

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.setupWebSocketHandlers();
  }

  // Configuration des handlers WebSocket
  private setupWebSocketHandlers(): void {
    console.log('🔍 [MATCHMAKING-FRONTEND] Setting up WebSocket handlers');
    
    // Utiliser l'external handler du WebSocketManager existant
    this.wsManager.setExternalHandler((message) => {
      console.log('📥 [MATCHMAKING-FRONTEND] Received WebSocket message:', JSON.stringify(message));
      
      switch (message.type) {
        case 'auth_success':
          console.log('✅ [MATCHMAKING-FRONTEND] Authentication successful');
          return false; // Laisser passer pour le WebSocketManager
          
        case 'matchmaking:waiting':
          console.log('⏳ [MATCHMAKING-FRONTEND] Handling waiting message');
          this.handleWaiting(message.position, message.totalInQueue);
          return true; // Message traité
          
        case 'matchmaking:found':
          console.log('🎮 [MATCHMAKING-FRONTEND] Handling match found message');
          this.handleMatchFound(message.matchId, message.opponent);
          return true;
          
        case 'matchmaking:left':
          console.log('🚪 [MATCHMAKING-FRONTEND] Handling left message');
          this.handleLeft();
          return true;
          
        case 'error':
          if (message.message?.includes('matchmaking')) {
            console.log('❌ [MATCHMAKING-FRONTEND] Handling error message');
            this.handleError(message.message);
            return true;
          }
          break;
      }
      console.log('➡️ [MATCHMAKING-FRONTEND] Message not handled, passing through');
      return false; // Message pas traité, laisser passer
    });
  }

  // Démarrer la recherche
  startSearching(): void {
    console.log('🚀 [MATCHMAKING-FRONTEND] startSearching called');
    console.log('🔍 [MATCHMAKING-FRONTEND] Current status:', this.status);
    
    if (this.status.isSearching) {
      console.warn('⚠️ [MATCHMAKING-FRONTEND] Recherche déjà en cours');
      return;
    }

    console.log('🎯 [MATCHMAKING-FRONTEND] Démarrage recherche matchmaking...');
    this.status = { isSearching: true };
    this.notifyStatusChange();

    // SOLUTION CONTOURNEMENT: Envoyer directement via WebSocket natif avec token
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    this.sendDirectMessage({
      type: 'matchmaking:join',
      token: token // Inclure le token dans le message
    });
  }

  // Méthode contournement - WebSocket direct
  private sendDirectMessage(message: any): void {
    console.log('🚀 [MATCHMAKING-FRONTEND] Sending direct WebSocket message:', JSON.stringify(message));
    
    // Obtenir la connexion WebSocket brute depuis le WebSocketManager
    const wsManager = this.wsManager as any;
    if (wsManager.ws && wsManager.ws.readyState === WebSocket.OPEN) {
      try {
        wsManager.ws.send(JSON.stringify(message));
        console.log('✅ [MATCHMAKING-FRONTEND] Direct message sent successfully');
      } catch (error) {
        console.error('❌ [MATCHMAKING-FRONTEND] Failed to send direct message:', error);
        this.handleError('Erreur d\'envoi de message');
      }
    } else {
      console.error('❌ [MATCHMAKING-FRONTEND] WebSocket not available or not open');
      this.handleError('WebSocket non disponible');
    }
  }

  // Arrêter la recherche
  stopSearching(): void {
    if (!this.status.isSearching) {
      return;
    }

    console.log('🚪 Arrêt recherche matchmaking...');
    
    // Envoyer demande d'arrêt au serveur
    this.sendDirectMessage({
      type: 'matchmaking:leave'
    });
  }

  // Handlers des messages WebSocket
  private handleWaiting(position: number, totalInQueue: number): void {
    console.log(`⏳ [MATCHMAKING-FRONTEND] handleWaiting - Position: ${position}, Total: ${totalInQueue}`);
    this.status = {
      isSearching: true,
      position,
      totalInQueue
    };
    this.notifyStatusChange();
    console.log(`⏳ Position ${position}/${totalInQueue} dans la queue`);
  }

  private handleMatchFound(matchId: string, opponent: any): void {
    console.log(`🎮 [MATCHMAKING-FRONTEND] handleMatchFound - Match ID: ${matchId}, Opponent:`, opponent);
    console.log(`🎮 Match trouvé! vs ${opponent.username} (ID: ${matchId})`);
    
    // Arrêter la recherche
    this.status = { isSearching: false };
    this.notifyStatusChange();
    
    // Notifier le match trouvé
    if (this.onMatchFound) {
      console.log(`🔔 [MATCHMAKING-FRONTEND] Calling onMatchFound callback`);
      this.onMatchFound({ matchId, opponent });
    } else {
      console.warn(`⚠️ [MATCHMAKING-FRONTEND] No onMatchFound callback set!`);
    }
  }

  private handleLeft(): void {
    console.log('✅ [MATCHMAKING-FRONTEND] handleLeft called');
    console.log('✅ Quitté la queue de matchmaking');
    this.status = { isSearching: false };
    this.notifyStatusChange();
  }

  private handleError(error: string): void {
    console.error('❌ [MATCHMAKING-FRONTEND] handleError:', error);
    console.error('❌ Erreur matchmaking:', error);
    this.status = { isSearching: false };
    this.notifyStatusChange();
    
    if (this.onError) {
      this.onError(error);
    }
  }

  // Notification des changements de status
  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status });
    }
  }

  // API publique pour les callbacks
  setOnStatusChange(callback: (status: MatchmakingStatus) => void): void {
    this.onStatusChange = callback;
  }

  setOnMatchFound(callback: (match: MatchFound) => void): void {
    this.onMatchFound = callback;
  }

  setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  // Getters
  getStatus(): MatchmakingStatus {
    return { ...this.status };
  }

  isSearching(): boolean {
    return this.status.isSearching;
  }
}