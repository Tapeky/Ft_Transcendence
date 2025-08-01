import { chatService } from '../../friends/services/ChatService';
import { apiService } from '../../../shared/services/api';
import { GameInviteNotification } from '../components/GameInviteNotification';
import { GameInvite } from '../types/GameInviteTypes';

export class GameInviteManager {
  private static instance: GameInviteManager;
  private activeNotifications: Map<number, GameInviteNotification> = new Map();

  private constructor() {
    this.setupChatServiceListeners();
  }

  static getInstance(): GameInviteManager {
    if (!GameInviteManager.instance) {
      GameInviteManager.instance = new GameInviteManager();
    }
    return GameInviteManager.instance;
  }

  private setupChatServiceListeners(): void {
    chatService.on('game_invite_received', (data: { invite: GameInvite }) => {
      this.handleInviteReceived(data.invite);
    });

    chatService.on('game_invite_response', (data: { 
      action: 'accept' | 'decline'; 
      inviteId: number; 
      responderId: number;
      responderUsername: string;
    }) => {
      this.handleInviteResponse(data);
    });

    chatService.on('game_started', (data: { 
      gameId: number; 
      opponent: { id: number; username: string; avatar: string }; 
      playerSide: 'left' | 'right' 
    }) => {
      this.handleGameStarted(data);
    });

    chatService.on('game_navigation_error', (data: { error: any; gameId: number }) => {
      this.handleGameNavigationError(data);
    });

  }

  private handleInviteReceived(invite: GameInvite): void {

    // Vérifier si l'invitation n'est pas expirée
    const expiresAt = new Date(invite.expiresAt);
    const now = new Date();
    
    if (now >= expiresAt) {
      return;
    }

    // Fermer une notification existante du même expéditeur
    const existingNotification = this.activeNotifications.get(invite.fromUserId);
    if (existingNotification) {
      existingNotification.destroy();
      this.activeNotifications.delete(invite.fromUserId);
    }

    // Créer et afficher la nouvelle notification
    const notification = new GameInviteNotification(invite, () => {
      this.activeNotifications.delete(invite.fromUserId);
    });

    // Ajouter au DOM
    document.body.appendChild(notification.getElement());
    
    // Garder la référence
    this.activeNotifications.set(invite.fromUserId, notification);

    // Son de notification (optionnel)
    this.playNotificationSound();
  }

  private handleInviteResponse(data: { 
    action: 'accept' | 'decline'; 
    inviteId: number; 
    responderId: number;
    responderUsername: string;
  }): void {

    // Afficher une notification de réponse
    this.showResponseNotification(data);
  }

  private showResponseNotification(data: { 
    action: 'accept' | 'decline'; 
    responderUsername: string;
  }): void {
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-[70] 
      bg-blue-800 border-2 border-white text-white 
      p-4 rounded-lg shadow-lg 
      w-[350px] max-w-[90vw]
      animate-fade-in
    `;

    const isAccepted = data.action === 'accept';
    const icon = isAccepted ? '✅' : '❌';
    const message = isAccepted 
      ? `${data.responderUsername} accepted your invite!`
      : `${data.responderUsername} declined your invite`;

    notification.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-[1.5rem] font-bold">${icon} Invite Response</h3>
        <button class="close-btn text-[1.2rem] hover:scale-110 transition">✕</button>
      </div>
      <p class="text-[1.2rem]">${message}</p>
      ${isAccepted ? '<p class="text-[0.9rem] opacity-80 mt-2">🎮 Game starting soon...</p>' : ''}
    `;

    // Bouton fermer
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      notification.remove();
    });

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Auto-close après 5 secondes
    setTimeout(() => {
      notification.remove();
    }, 5000);

    // Si accepté, le jeu va démarrer automatiquement via le backend
    if (isAccepted) {
    }
  }

  private playNotificationSound(): void {
    try {
      // Son simple avec Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Pas grave si le son ne marche pas
    }
  }

  public async loadPendingInvites(): Promise<void> {
    try {
      
      const invites = await apiService.getReceivedGameInvites();
      
      for (const invite of invites) {
        this.handleInviteReceived(invite);
      }
      
      
    } catch (error) {
      console.error('🎮 GameInviteManager: Error loading pending invites:', error);
    }
  }

  private handleGameStarted(data: { 
    gameId: number; 
    opponent: { id: number; username: string; avatar: string }; 
    playerSide: 'left' | 'right' 
  }): void {
    
    // Clear all active invitation notifications since the game is starting
    this.clearAllNotifications();
    
    // Show a brief "Game Starting" notification
    this.showGameStartingNotification(data);
  }

  private handleGameNavigationError(data: { error: any; gameId: number }): void {
    console.error(`🎮 GameInviteManager: Failed to navigate to game ${data.gameId}:`, data.error);
    
    // Show error notification
    this.showErrorNotification(`Failed to join game ${data.gameId}. Please try again.`);
  }

  private showGameStartingNotification(data: { 
    gameId: number; 
    opponent: { id: number; username: string; avatar: string }; 
    playerSide: 'left' | 'right' 
  }): void {
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-[80] 
      bg-green-800 border-2 border-white text-white 
      p-4 rounded-lg shadow-lg 
      w-[350px] max-w-[90vw]
      animate-fade-in
    `;

    notification.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-[1.5rem] font-bold">🚀 Game Starting!</h3>
        <button class="close-btn text-[1.2rem] hover:scale-110 transition">✕</button>
      </div>
      <p class="text-[1.2rem] mb-2">vs ${data.opponent.username}</p>
      <p class="text-[0.9rem] opacity-80">You're playing as ${data.playerSide} paddle</p>
      <div class="mt-3 flex items-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span class="text-[0.9rem]">Loading game...</span>
      </div>
    `;

    // Bouton fermer
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      notification.remove();
    });

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Auto-close après 3 secondes
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-[80] 
      bg-red-800 border-2 border-white text-white 
      p-4 rounded-lg shadow-lg 
      w-[350px] max-w-[90vw]
      animate-fade-in
    `;

    notification.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-[1.5rem] font-bold">❌ Error</h3>
        <button class="close-btn text-[1.2rem] hover:scale-110 transition">✕</button>
      </div>
      <p class="text-[1.2rem]">${message}</p>
    `;

    // Bouton fermer
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      notification.remove();
    });

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Auto-close après 7 secondes
    setTimeout(() => {
      notification.remove();
    }, 7000);
  }

  public clearAllNotifications(): void {
    
    this.activeNotifications.forEach((notification) => {
      notification.destroy();
    });
    
    this.activeNotifications.clear();
  }
}

// Export singleton instance
export const gameInviteManager = GameInviteManager.getInstance();