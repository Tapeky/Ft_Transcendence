// 🏆 Composant de notification d'invitation de tournoi
export class TournamentInviteNotification {
  private element: HTMLElement;
  private inviteData: any;
  private onAccept: (inviteId: string) => void;
  private onDecline: (inviteId: string) => void;

  constructor(
    inviteData: any,
    onAccept: (inviteId: string) => void,
    onDecline: (inviteId: string) => void
  ) {
    this.inviteData = inviteData;
    this.onAccept = onAccept;
    this.onDecline = onDecline;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tournament-invite-notification fixed top-20 right-4 z-50 bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-500 rounded-lg p-4 shadow-xl max-w-sm';
    
    const expiresAt = new Date(this.inviteData.expiresAt);
    const timeLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);

    container.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
            <span class="text-xl">🏆</span>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-white">Invitation de Tournoi</h4>
            <button class="close-btn text-gray-400 hover:text-white">
              <span class="sr-only">Fermer</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="mt-2">
            <p class="text-sm text-gray-300">
              <strong>${this.inviteData.tournamentName}</strong>
            </p>
            <p class="text-sm text-purple-200 mt-1">
              ${this.inviteData.roundName} - Match contre <strong>${this.inviteData.opponent.alias}</strong>
            </p>
            <p class="text-xs text-gray-400 mt-1">
              ${this.inviteData.matchInfo}
            </p>
          </div>
          
          <div class="mt-3 flex space-x-2">
            <button class="accept-btn flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors">
              ✅ Accepter
            </button>
            <button class="decline-btn flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors">
              ❌ Refuser
            </button>
          </div>
          
          <div class="mt-2 flex items-center text-xs text-gray-400">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="countdown">${timeLeft}s restantes</span>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    this.startCountdown(container);

    return container;
  }

  private setupEventListeners(container: HTMLElement): void {
    const acceptBtn = container.querySelector('.accept-btn');
    const declineBtn = container.querySelector('.decline-btn');
    const closeBtn = container.querySelector('.close-btn');

    acceptBtn?.addEventListener('click', () => {
      this.onAccept(this.inviteData.inviteId);
      this.remove();
    });

    declineBtn?.addEventListener('click', () => {
      this.onDecline(this.inviteData.inviteId);
      this.remove();
    });

    closeBtn?.addEventListener('click', () => {
      this.remove();
    });
  }

  private startCountdown(container: HTMLElement): void {
    const countdownElement = container.querySelector('.countdown');
    if (!countdownElement) return;

    const expiresAt = new Date(this.inviteData.expiresAt);
    
    const updateCountdown = () => {
      const timeLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
      
      if (timeLeft <= 0) {
        countdownElement.textContent = 'Expiré';
        this.remove();
        return;
      }

      if (timeLeft < 60) {
        countdownElement.textContent = `${timeLeft}s restantes`;
        // Clignoter si moins de 10 secondes
        if (timeLeft <= 10) {
          container.classList.toggle('animate-pulse');
        }
      } else {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownElement.textContent = `${minutes}m ${seconds}s restantes`;
      }

      setTimeout(updateCountdown, 1000);
    };

    updateCountdown();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public remove(): void {
    if (this.element.parentNode) {
      this.element.classList.add('opacity-0', 'transform', 'translate-x-full');
      setTimeout(() => {
        this.element.parentNode?.removeChild(this.element);
      }, 300);
    }
  }

  public updateStatus(status: 'waiting' | 'accepted' | 'declined'): void {
    const buttonsContainer = this.element.querySelector('.mt-3.flex');
    if (!buttonsContainer) return;

    switch (status) {
      case 'waiting':
        buttonsContainer.innerHTML = `
          <div class="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded text-center">
            ⏳ En attente de votre adversaire...
          </div>
        `;
        break;
      case 'accepted':
        buttonsContainer.innerHTML = `
          <div class="flex-1 bg-green-600 text-white text-sm font-medium py-2 px-3 rounded text-center">
            ✅ Match accepté - Préparation en cours...
          </div>
        `;
        break;
      case 'declined':
        buttonsContainer.innerHTML = `
          <div class="flex-1 bg-red-600 text-white text-sm font-medium py-2 px-3 rounded text-center">
            ❌ Match refusé
          </div>
        `;
        break;
    }
  }
}