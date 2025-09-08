// 🏆 Service de gestion des invitations de tournoi
import { TournamentInviteNotification } from '../ui/TournamentInviteNotification';

export class TournamentInviteService {
  private static instance: TournamentInviteService;
  private ws: WebSocket | null = null;
  private activeInvites = new Map<string, TournamentInviteNotification>();
  private notificationContainer: HTMLElement | null = null;

  private constructor() {
    this.createNotificationContainer();
  }

  public static getInstance(): TournamentInviteService {
    if (!TournamentInviteService.instance) {
      TournamentInviteService.instance = new TournamentInviteService();
    }
    return TournamentInviteService.instance;
  }

  // Initialiser la connexion WebSocket
  public initializeWebSocket(): void {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token available for tournament invites');
      return;
    }

    this.ws = new WebSocket('wss://localhost:8000/ws');

    this.ws.onopen = () => {
      console.log('🏆 Tournament invite WebSocket connected');
      if (this.ws) {
        this.ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse tournament invite message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🏆 Tournament invite WebSocket disconnected');
      // Tentative de reconnexion après 5 secondes
      setTimeout(() => {
        this.initializeWebSocket();
      }, 5000);
    };

    this.ws.onerror = (error) => {
      console.error('🏆 Tournament invite WebSocket error:', error);
    };
  }

  // Créer le conteneur de notifications
  private createNotificationContainer(): void {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'tournament-invite-notifications';
    this.notificationContainer.className = 'fixed top-20 right-4 z-50 space-y-2';
    document.body.appendChild(this.notificationContainer);
  }

  // Gérer les messages WebSocket
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'tournament_match_invitation':
        this.showTournamentInvite(message);
        break;

      case 'tournament_invite_accepted':
        this.updateInviteStatus(message.inviteId, 'waiting');
        this.showToast('✅ Adversaire accepté ! En attente du démarrage...', 'success');
        break;

      case 'tournament_invite_declined':
        this.updateInviteStatus(message.inviteId, 'declined');
        this.showToast('❌ ' + message.message, 'error');
        setTimeout(() => this.removeInvite(message.inviteId), 3000);
        break;

      case 'tournament_invite_waiting':
        this.updateInviteStatus(message.inviteId, 'waiting');
        this.showToast('⏳ ' + message.message, 'info');
        break;

      case 'tournament_invite_expired':
        this.showToast('⏰ ' + message.message, 'warning');
        this.removeInvite(message.inviteId);
        break;

      case 'tournament_match_started':
        this.handleMatchStarted(message);
        break;

      case 'tournament_invite_error':
        this.showToast('❌ ' + message.message, 'error');
        break;

      default:
        // Ignorer les autres types de messages
        break;
    }
  }

  // Afficher une invitation de tournoi
  private showTournamentInvite(inviteData: any): void {
    console.log('🏆 Received tournament invite:', inviteData);

    // Si une invitation existe déjà pour ce match, la supprimer
    if (this.activeInvites.has(inviteData.inviteId)) {
      this.removeInvite(inviteData.inviteId);
    }

    const notification = new TournamentInviteNotification(
      inviteData,
      (inviteId) => this.acceptInvite(inviteId),
      (inviteId) => this.declineInvite(inviteId)
    );

    this.activeInvites.set(inviteData.inviteId, notification);
    
    if (this.notificationContainer) {
      this.notificationContainer.appendChild(notification.getElement());
    }

    // Son de notification
    this.playNotificationSound();

    // Auto-remove si pas de réponse après expiration
    const expiresAt = new Date(inviteData.expiresAt);
    const timeLeft = expiresAt.getTime() - Date.now();
    
    if (timeLeft > 0) {
      setTimeout(() => {
        if (this.activeInvites.has(inviteData.inviteId)) {
          this.removeInvite(inviteData.inviteId);
        }
      }, timeLeft);
    }
  }

  // Accepter une invitation
  private acceptInvite(inviteId: string): void {
    console.log('🏆 Accepting tournament invite:', inviteId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'respond_tournament_invite',
        inviteId,
        accept: true
      }));
    }

    // Mettre à jour l'interface
    this.updateInviteStatus(inviteId, 'accepted');
  }

  // Refuser une invitation
  private declineInvite(inviteId: string): void {
    console.log('🏆 Declining tournament invite:', inviteId);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'respond_tournament_invite',
        inviteId,
        accept: false
      }));
    }

    // Supprimer l'invitation après 2 secondes
    setTimeout(() => this.removeInvite(inviteId), 2000);
  }

  // Mettre à jour le statut d'une invitation
  private updateInviteStatus(inviteId: string, status: 'waiting' | 'accepted' | 'declined'): void {
    const invite = this.activeInvites.get(inviteId);
    if (invite) {
      invite.updateStatus(status);
    }
  }

  // Supprimer une invitation
  private removeInvite(inviteId: string): void {
    const invite = this.activeInvites.get(inviteId);
    if (invite) {
      invite.remove();
      this.activeInvites.delete(inviteId);
    }
  }

  // Gérer le démarrage d'un match
  private handleMatchStarted(message: any): void {
    console.log('🏆 Tournament match started:', message);
    
    // Supprimer toutes les invitations actives
    this.activeInvites.forEach(invite => invite.remove());
    this.activeInvites.clear();

    // Naviguer vers le jeu
    const gameUrl = `/game?tournamentMatch=${message.data.gameId}&matchId=${message.data.matchId}&tournamentId=${message.data.tournamentId}`;
    window.location.href = gameUrl;
  }

  // Afficher un toast
  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    };

    toast.className = `fixed top-4 right-4 z-50 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300`;
    toast.textContent = message;
    toast.style.transform = 'translateX(100%)';

    document.body.appendChild(toast);

    // Animation d'entrée
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remove après 5 secondes
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // Jouer un son de notification
  private playNotificationSound(): void {
    try {
      // Créer un son simple avec Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Fallback silencieux si Web Audio API n'est pas disponible
      console.log('🏆 Tournament invite received (audio not available)');
    }
  }

  // Méthodes publiques pour gérer le service
  public getActiveInvitesCount(): number {
    return this.activeInvites.size;
  }

  public hasActiveInvites(): boolean {
    return this.activeInvites.size > 0;
  }

  public clearAllInvites(): void {
    this.activeInvites.forEach(invite => invite.remove());
    this.activeInvites.clear();
  }

  // Cleanup
  public destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.clearAllInvites();
    
    if (this.notificationContainer && this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
      this.notificationContainer = null;
    }
  }
}

// Instance singleton
export const tournamentInviteService = TournamentInviteService.getInstance();