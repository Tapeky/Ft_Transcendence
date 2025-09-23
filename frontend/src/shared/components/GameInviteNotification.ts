// ============================================================================
// GameInviteNotification.ts - Notification system for game invitations
// ============================================================================

import { GameManager } from '../../services/GameManager';
import type { GameInviteData } from '../../services/GameInvitationManager';

export class GameInviteNotification {
  private element: HTMLElement;
  private invite: GameInviteData;
  private onResponse: (accepted: boolean) => void;
  private timeoutId?: NodeJS.Timeout;

  constructor(invite: GameInviteData, onResponse: (accepted: boolean) => void) {
    this.invite = invite;
    this.onResponse = onResponse;
    this.element = this.createElement();
    this.setupEventListeners();
    this.startTimeout();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `
      fixed top-4 right-4 z-[100]
      bg-gradient-to-r from-purple-800 to-blue-800
      border-4 border-white rounded-xl
      p-6 min-w-[400px] max-w-[500px]
      text-white font-iceland
      shadow-2xl
      transform translate-x-0 transition-transform duration-300 ease-in-out
    `;

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <div class="text-4xl mr-3">🎮</div>
          <div>
            <h3 class="text-2xl font-bold">Game Invitation</h3>
            <p class="text-lg text-blue-200">from ${this.invite.from_username}</p>
          </div>
        </div>
        <button id="close-btn" class="text-2xl hover:text-red-400 transition-colors">×</button>
      </div>

      <div class="mb-6">
        <p class="text-lg mb-2">
          <span class="font-bold">${this.invite.from_username}</span>
          has challenged you to a game of Pong!
        </p>
        <p class="text-sm text-gray-300">
          Expires in <span id="countdown">5:00</span>
        </p>
      </div>

      <div class="flex gap-3 justify-end">
        <button
          id="decline-btn"
          class="px-6 py-3 bg-red-600 hover:bg-red-700 border-2 border-red-400 rounded-lg
                 font-bold text-lg transition-colors duration-200"
        >
          Decline
        </button>
        <button
          id="accept-btn"
          class="px-6 py-3 bg-green-600 hover:bg-green-700 border-2 border-green-400 rounded-lg
                 font-bold text-lg transition-colors duration-200"
        >
          Accept & Play!
        </button>
      </div>
    `;

    return container;
  }

  private setupEventListeners(): void {
    const acceptBtn = this.element.querySelector('#accept-btn');
    const declineBtn = this.element.querySelector('#decline-btn');
    const closeBtn = this.element.querySelector('#close-btn');

    acceptBtn?.addEventListener('click', () => this.handleAccept());
    declineBtn?.addEventListener('click', () => this.handleDecline());
    closeBtn?.addEventListener('click', () => this.handleDecline());
  }

  private startTimeout(): void {
    const expiresAt = new Date(this.invite.expires_at);
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();

    if (timeLeft <= 0) {
      this.handleTimeout();
      return;
    }

    this.updateCountdown();
    this.timeoutId = setInterval(() => {
      this.updateCountdown();
    }, 1000);

    // Auto-decline when expires
    setTimeout(() => {
      this.handleTimeout();
    }, timeLeft);
  }

  private updateCountdown(): void {
    const expiresAt = new Date(this.invite.expires_at);
    const now = new Date();
    const timeLeft = Math.max(0, expiresAt.getTime() - now.getTime());

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    const countdownElement = this.element.querySelector('#countdown');
    if (countdownElement) {
      countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (timeLeft <= 0) {
      this.handleTimeout();
    }
  }

  private async handleAccept(): Promise<void> {
    try {
      const gameManager = GameManager.getInstance();
      gameManager.respondToInvite(this.invite.id, 'accept');

      this.onResponse(true);
      this.destroy();

      console.log('🎮 Game invitation accepted, starting game...');
    } catch (error) {
      console.error('Error accepting game invite:', error);
      alert('Erreur lors de l\'acceptation de l\'invitation');
    }
  }

  private handleDecline(): void {
    try {
      const gameManager = GameManager.getInstance();
      gameManager.respondToInvite(this.invite.id, 'decline');

      this.onResponse(false);
      this.destroy();
    } catch (error) {
      console.error('Error declining game invite:', error);
    }
  }

  private handleTimeout(): void {
    console.log('🕐 Game invitation expired');
    this.onResponse(false);
    this.destroy();
  }

  public show(): void {
    document.body.appendChild(this.element);

    // Animate in
    requestAnimationFrame(() => {
      this.element.style.transform = 'translateX(0)';
    });
  }

  public destroy(): void {
    if (this.timeoutId) {
      clearInterval(this.timeoutId);
    }

    // Animate out
    this.element.style.transform = 'translateX(100%)';

    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);
  }
}