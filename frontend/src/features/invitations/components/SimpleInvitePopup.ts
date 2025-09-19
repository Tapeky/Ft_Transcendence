import { gameInviteService, GameInvite } from '../services/GameInviteService';

const activePopups = new Set<string>();

export class SimpleInvitePopup {
  private element!: HTMLElement;
  private isDestroyed = false;
  private autoCloseTimer?: number;

  constructor(private invite: GameInvite) {
    // Prevent duplicates
    if (activePopups.has(invite.inviteId)) {
      return;
    }
    
    activePopups.add(invite.inviteId);
    this.element = this.create();
    this.show();
  }

  private create(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = `
      fixed top-4 right-4 z-[70] 
      bg-green-800 border-2 border-white text-white 
      p-4 rounded-lg shadow-lg 
      w-[350px] max-w-[90vw]
      animate-fade-in
    `;

    // Calculer le temps restant
    const timeLeft = this.getTimeLeft();

    popup.innerHTML = `
      <!-- Header avec fermeture -->
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-[1.5rem] font-bold">🎮 Game Invite!</h3>
        <button id="close-btn" class="text-[1.2rem] hover:scale-110 transition cursor-pointer">✕</button>
      </div>

      <!-- Contenu invitation -->
      <div class="mb-4" id="content">
        <p class="text-[1.2rem] mb-2">
          <strong>${this.invite.fromUsername}</strong> wants to play!
        </p>
        <p class="text-[0.9rem] opacity-80">
          ⏰ Expires in ${timeLeft}
        </p>
      </div>

      <!-- Boutons d'action -->
      <div class="flex gap-3" id="buttons">
        <button 
          id="accept-btn"
          class="flex-1 bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold transition duration-200 cursor-pointer"
        >
          ✅ Accept
        </button>
        <button 
          id="decline-btn"
          class="flex-1 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold transition duration-200 cursor-pointer"
        >
          ❌ Decline
        </button>
      </div>
    `;

    this.setupEventListeners(popup);
    return popup;
  }

  private setupEventListeners(popup: HTMLElement): void {
    // Bouton fermer
    const closeBtn = popup.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    // Bouton accepter
    const acceptBtn = popup.querySelector('#accept-btn');
    acceptBtn?.addEventListener('click', () => {
      this.respond(true);
    });

    // Bouton refuser
    const declineBtn = popup.querySelector('#decline-btn');
    declineBtn?.addEventListener('click', () => {
      this.respond(false);
    });
  }

  private respond(accept: boolean): void {
    if (this.isDestroyed) return;

    try {
      
      // Désactiver les boutons immédiatement
      this.disableButtons();
      
      if (accept) {
        this.showLoadingState();
      }
      
      // Envoyer la réponse via le service
      gameInviteService.respondToInvite(this.invite.inviteId, accept);
      
      // Afficher confirmation
      this.showConfirmation(accept);
      
      // Fermer après un délai
      const closeDelay = accept ? 1500 : 2000;
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.close();
        }
      }, closeDelay);
      
    } catch (error) {
      console.error('🎮 KISS Popup: Error responding to invite:', error);
      this.showError('Failed to respond to invitation');
    }
  }

  private disableButtons(): void {
    const acceptBtn = this.element.querySelector('#accept-btn') as HTMLButtonElement;
    const declineBtn = this.element.querySelector('#decline-btn') as HTMLButtonElement;
    
    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.5';
      acceptBtn.style.cursor = 'not-allowed';
    }
    
    if (declineBtn) {
      declineBtn.disabled = true;
      declineBtn.style.opacity = '0.5';
      declineBtn.style.cursor = 'not-allowed';
    }
  }

  private showLoadingState(): void {
    const content = this.element.querySelector('#content');
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
  }

  private showConfirmation(accepted: boolean): void {
    const content = this.element.querySelector('#content');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2">
          ${accepted ? '✅ Invitation accepted!' : '❌ Invitation declined'}
        </p>
        <p class="text-[0.9rem] opacity-80">
          ${accepted ? 'Game will start momentarily...' : 'Maybe next time...'}
        </p>
      `;
    }

    // Masquer les boutons
    const buttonsDiv = this.element.querySelector('#buttons');
    if (buttonsDiv) {
      buttonsDiv.remove();
    }
  }

  private showError(message: string): void {
    const content = this.element.querySelector('#content');
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

    // Changer la couleur du container pour indiquer l'erreur
    this.element.className = this.element.className.replace('bg-green-800', 'bg-red-800');

    // Auto-close après 5 secondes
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.close();
      }
    }, 5000);
  }

  private getTimeLeft(): string {
    const expiresAt = new Date(this.invite.expiresAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'expired';
    
    const diffSeconds = Math.ceil(diffMs / 1000);
    
    if (diffSeconds <= 60) return `${diffSeconds} seconds`;
    
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins <= 1) return 'less than 1 min';
    return `${diffMins} minutes`;
  }

  private show(): void {
    if (this.isDestroyed) return;
    
    document.body.appendChild(this.element);
    
    // Son de notification
    this.playNotificationSound();
    
    // Auto-close basé sur l'expiration
    const expiresAt = new Date(this.invite.expiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    if (timeUntilExpiry > 0) {
      this.autoCloseTimer = window.setTimeout(() => {
        if (!this.isDestroyed) {
          this.expire();
        }
      }, Math.min(timeUntilExpiry, 60000)); // Maximum 60 secondes
    } else {
      // Déjà expiré
      this.expire();
    }
  }

  private expire(): void {
    if (this.isDestroyed) return;
    
    
    const content = this.element.querySelector('#content');
    if (content) {
      content.innerHTML = `
        <p class="text-[1.2rem] mb-2 opacity-60">
          ⏰ Invitation expired
        </p>
      `;
    }

    // Masquer les boutons
    const buttonsDiv = this.element.querySelector('#buttons');
    if (buttonsDiv) {
      buttonsDiv.remove();
    }

    // Fermer après 3 secondes
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.close();
      }
    }, 3000);
  }

  private playNotificationSound(): void {
    try {
      // Son simple avec Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

  public close(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Clean up popup registry
    activePopups.delete(this.invite.inviteId);
    
    // Clear all timers
    this.clearAllTimers();
    
    this.element.remove();
  }

  // Simple timer cleanup
  private clearAllTimers(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  public destroy(): void {
    this.close();
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}