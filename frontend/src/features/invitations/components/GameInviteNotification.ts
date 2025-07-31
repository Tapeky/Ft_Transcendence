import { apiService } from '../../services/api';

// Interface pour les données d'invitation
export interface GameInvite {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  sender_username: string;
  sender_avatar: string;
}

export class GameInviteNotification {
  private element: HTMLElement;
  private invite: GameInvite;
  private onClose: () => void;

  constructor(invite: GameInvite, onClose: () => void) {
    this.invite = invite;
    this.onClose = onClose;
    this.element = this.createElement();
    this.setupEventListeners();
    
    console.log('🎮 GameInviteNotification: Initialized for invite from', invite.sender_username);
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `
      fixed top-4 right-4 z-[70] 
      bg-green-800 border-2 border-white text-white 
      p-4 rounded-lg shadow-lg 
      w-[350px] max-w-[90vw]
      animate-fade-in
    `;

    // Calculer le temps restant
    const timeLeft = this.getTimeLeft();

    container.innerHTML = `
      <!-- Header avec fermeture -->
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-[1.5rem] font-bold">🎮 Game Invite!</h3>
        <button id="close-btn" class="text-[1.2rem] hover:scale-110 transition">✕</button>
      </div>

      <!-- Contenu invitation -->
      <div class="mb-4">
        <p class="text-[1.2rem] mb-2">
          <strong>${this.invite.sender_username}</strong> wants to play!
        </p>
        <p class="text-[0.9rem] opacity-80">
          ⏰ Expires in ${timeLeft}
        </p>
      </div>

      <!-- Boutons d'action -->
      <div class="flex gap-3">
        <button 
          id="accept-btn"
          class="flex-1 bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold transition duration-200"
        >
          ✅ Accept
        </button>
        <button 
          id="decline-btn"
          class="flex-1 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold transition duration-200"
        >
          ❌ Decline
        </button>
      </div>
    `;

    return container;
  }

  private setupEventListeners(): void {
    // Bouton fermer
    const closeBtn = this.element.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    // Bouton accepter
    const acceptBtn = this.element.querySelector('#accept-btn');
    acceptBtn?.addEventListener('click', () => {
      this.handleResponse('accept');
    });

    // Bouton refuser
    const declineBtn = this.element.querySelector('#decline-btn');
    declineBtn?.addEventListener('click', () => {
      this.handleResponse('decline');
    });

    // Auto-close après expiration
    const expiresAt = new Date(this.invite.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    if (timeUntilExpiry > 0) {
      setTimeout(() => {
        this.expire();
      }, timeUntilExpiry);
    }
  }

  private async handleResponse(action: 'accept' | 'decline'): Promise<void> {
    try {
      console.log(`🎮 GameInviteNotification: ${action}ing invite from`, this.invite.sender_username);
      
      // Show loading state immediately
      if (action === 'accept') {
        this.showLoadingState();
      }
      
      // Désactiver les boutons
      const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
      const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
      
      if (acceptBtn) acceptBtn.disabled = true;
      if (declineBtn) declineBtn.disabled = true;

      // Envoyer la réponse
      await apiService.respondToGameInvite(this.invite.id, action);
      
      // Afficher le message de confirmation
      this.showConfirmation(action);
      
      // Fermer après différents délais selon l'action
      const closeDelay = action === 'accept' ? 1000 : 2000; // Accept ferme plus vite car le jeu va démarrer
      setTimeout(() => {
        this.close();
      }, closeDelay);
      
    } catch (error) {
      console.error('Error responding to game invite:', error);
      
      // Réactiver les boutons en cas d'erreur
      const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
      const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
      
      if (acceptBtn) acceptBtn.disabled = false;
      if (declineBtn) declineBtn.disabled = false;
      
      // Show error in the notification instead of alert
      this.showError(`Failed to ${action} invitation. Please try again.`);
    }
  }

  private showLoadingState(): void {
    const content = this.element.querySelector('.mb-4');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2">
          🎮 Starting game...
        </p>
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          <span class="text-[0.9rem] opacity-80">Connecting players...</span>
        </div>
      `;
    }

    // Update button styles to show loading
    const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
    const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
    
    if (acceptBtn) {
      acceptBtn.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Accepting...
        </div>
      `;
      acceptBtn.className = `${acceptBtn.className} opacity-75 cursor-not-allowed`;
    }
    
    if (declineBtn) {
      declineBtn.className = `${declineBtn.className} opacity-50 cursor-not-allowed`;
    }
  }

  private showConfirmation(action: 'accept' | 'decline'): void {
    const content = this.element.querySelector('.mb-4');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2">
          ${action === 'accept' ? '✅ Invitation accepted!' : '❌ Invitation declined'}
        </p>
        <p class="text-[0.9rem] opacity-80">
          ${action === 'accept' ? 'Game will start momentarily...' : 'Maybe next time...'}
        </p>
      `;
    }

    // Masquer les boutons
    const buttonsDiv = this.element.querySelector('.flex.gap-3');
    if (buttonsDiv) {
      buttonsDiv.remove();
    }
  }

  private showError(message: string): void {
    const content = this.element.querySelector('.mb-4');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2 text-red-300">
          ❌ Error
        </p>
        <p class="text-[0.9rem] opacity-80">
          ${message}
        </p>
      `;
    }

    // Change container color to indicate error
    this.element.className = this.element.className.replace('bg-green-800', 'bg-red-800');

    // Auto-close after 5 seconds
    setTimeout(() => {
      this.close();
    }, 5000);
  }

  private expire(): void {
    console.log('🎮 GameInviteNotification: Invite expired');
    
    const content = this.element.querySelector('.mb-4');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2 opacity-60">
          ⏰ Invitation expired
        </p>
      `;
    }

    // Masquer les boutons
    const buttonsDiv = this.element.querySelector('.flex.gap-3');
    if (buttonsDiv) {
      buttonsDiv.remove();
    }

    // Fermer après 3 secondes
    setTimeout(() => {
      this.close();
    }, 3000);
  }

  private close(): void {
    console.log('🎮 GameInviteNotification: Closing notification');
    this.element.remove();
    this.onClose();
  }

  private getTimeLeft(): string {
    const expiresAt = new Date(this.invite.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'expired';
    
    const diffMins = Math.ceil(diffMs / 60000);
    
    if (diffMins <= 1) return 'less than 1 min';
    return `${diffMins} minutes`;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    console.log('🎮 GameInviteNotification: Destroyed');
    this.element.remove();
  }
}