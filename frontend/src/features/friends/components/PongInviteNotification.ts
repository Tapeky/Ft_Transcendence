import { apiService } from '../../../shared/services/api';

export interface PongInviteData {
  type: 'friend_pong_invite';
  inviteId: string;
  fromUserId: number;
  expiresAt: number;
  fromUsername?: string;
}

export class PongInviteNotification {
  private element: HTMLElement;
  private onClose: () => void;
  private inviteData: PongInviteData;

  constructor(inviteData: PongInviteData, onClose: () => void) {
    this.inviteData = inviteData;
    this.onClose = onClose;
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-blue-600 to-purple-700 p-6 rounded-lg border-4 border-white max-w-md w-full mx-4 text-white font-iceland">
        <div class="text-center">
          <h3 class="text-2xl font-bold mb-4">🏓 Invitation Pong !</h3>
          <p class="text-lg mb-6">
            ${this.inviteData.fromUsername || 'Un ami'} vous invite à jouer au Pong !
          </p>
          
          <div class="flex gap-4 justify-center">
            <button id="accept-invite" class="bg-green-500 hover:bg-green-600 px-6 py-2 rounded font-bold text-white transition-colors">
              ✓ Accepter
            </button>
            <button id="decline-invite" class="bg-red-500 hover:bg-red-600 px-6 py-2 rounded font-bold text-white transition-colors">
              ✗ Refuser
            </button>
          </div>
          
          <div class="mt-4 text-sm text-gray-300">
            Invitation expire dans: <span id="countdown"></span>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  private bindEvents(): void {
    const acceptBtn = this.element.querySelector('#accept-invite');
    const declineBtn = this.element.querySelector('#decline-invite');

    acceptBtn?.addEventListener('click', () => this.acceptInvite());
    declineBtn?.addEventListener('click', () => this.declineInvite());

    this.element.addEventListener('click', e => {
      if (e.target === this.element) {
        this.declineInvite();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.declineInvite();
      }
    });

    this.startCountdown();
  }

  private async acceptInvite(): Promise<void> {
    try {
      const chatService = (window as any).chatService;
      if (chatService && chatService.ws && chatService.ws.readyState === WebSocket.OPEN) {
        chatService.ws.send(
          JSON.stringify({
            type: 'friend_pong_accept',
            inviteId: this.inviteData.inviteId,
          })
        );
      }

      this.showNotification('Invitation acceptée ! Le jeu va commencer...', 'success');
      this.close();
    } catch (error) {
      console.error("Erreur lors de l'acceptation:", error);
      this.showNotification("Erreur lors de l'acceptation", 'error');
    }
  }

  private async declineInvite(): Promise<void> {
    try {
      const chatService = (window as any).chatService;
      if (chatService && chatService.ws && chatService.ws.readyState === WebSocket.OPEN) {
        chatService.ws.send(
          JSON.stringify({
            type: 'friend_pong_decline',
            inviteId: this.inviteData.inviteId,
          })
        );
      }

      this.showNotification('Invitation refusée', 'info');
      this.close();
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      this.close();
    }
  }

  private startCountdown(): void {
    const countdownElement = this.element.querySelector('#countdown');
    if (!countdownElement) return;

    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = this.inviteData.expiresAt - now;

      if (timeLeft <= 0) {
        this.showNotification('Invitation expirée', 'info');
        this.close();
        return;
      }

      const seconds = Math.ceil(timeLeft / 1000);
      countdownElement.textContent = `${seconds}s`;
    };

    updateCountdown();
    const interval = setInterval(() => {
      updateCountdown();
      const timeLeft = this.inviteData.expiresAt - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    const bgColor =
      type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 z-[100] px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-full opacity-0 ${bgColor}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
      notification.classList.add('opacity-100');
    }, 10);

    setTimeout(() => {
      notification.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private close(): void {
    this.element.remove();
    this.onClose();
  }

  show(): void {
    document.body.appendChild(this.element);
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
