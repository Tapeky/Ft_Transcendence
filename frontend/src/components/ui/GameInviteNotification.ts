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
      
      // Désactiver les boutons
      const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
      const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
      
      if (acceptBtn) acceptBtn.disabled = true;
      if (declineBtn) declineBtn.disabled = true;

      // Envoyer la réponse
      await apiService.respondToGameInvite(this.invite.id, action);
      
      // Afficher le message de confirmation
      this.showConfirmation(action);
      
      // Fermer après 2 secondes
      setTimeout(() => {
        this.close();
      }, 2000);
      
    } catch (error) {
      console.error('Error responding to game invite:', error);
      
      // Réactiver les boutons en cas d'erreur
      const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
      const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
      
      if (acceptBtn) acceptBtn.disabled = false;
      if (declineBtn) declineBtn.disabled = false;
      
      alert(`Erreur: ${error}`);
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
          ${action === 'accept' ? 'Get ready to play!' : 'Maybe next time...'}
        </p>
      `;
    }

    // Masquer les boutons
    const buttonsDiv = this.element.querySelector('.flex.gap-3');
    if (buttonsDiv) {
      buttonsDiv.remove();
    }
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