import { gameInviteService } from '../services/GameInviteService';

export class KissInviteButtons {
  private static instance: KissInviteButtons;
  private initialized = false;

  static getInstance(): KissInviteButtons {
    if (!KissInviteButtons.instance) {
      KissInviteButtons.instance = new KissInviteButtons();
    }
    return KissInviteButtons.instance;
  }

  init(): void {
    if (this.initialized) return;

    this.setupMutationObserver();
    this.scanAndSetupButtons();
    this.initialized = true;
  }

  private scanAndSetupButtons(): void {
    const buttons = document.querySelectorAll('[data-invite-user]:not([data-kiss-setup])');

    buttons.forEach((button) => {
      this.setupButton(button as HTMLElement);
    });
  }

  private setupButton(button: HTMLElement): void {
    const userId = button.getAttribute('data-invite-user');
    const username = button.getAttribute('data-invite-username') || 'User';

    if (!userId || isNaN(parseInt(userId))) {
      console.warn('🎮 KISS: Invalid user ID for invite button:', userId);
      return;
    }

    button.setAttribute('data-kiss-setup', 'true');

    if (!button.className.includes('hover:scale-110')) {
      button.className += ' hover:scale-110 transition-transform cursor-pointer';
    }

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.setButtonState(button, 'sending');
      gameInviteService.sendInvite(parseInt(userId));

      setTimeout(() => {
        this.setButtonState(button, 'sent');
      }, 500);

      setTimeout(() => {
        this.setButtonState(button, 'normal');
      }, 3000);
    });

    button.title = `Challenge ${username} to a Pong match!`;
  }

  private setButtonState(button: HTMLElement, state: 'normal' | 'sending' | 'sent'): void {
    const btn = button as HTMLButtonElement;
    
    switch (state) {
      case 'sending':
        btn.disabled = true;
        btn.style.opacity = '0.7';
        if (btn.innerHTML.includes('🎮')) {
          btn.innerHTML = btn.innerHTML.replace('🎮', '⏳');
        }
        break;
        
      case 'sent':
        btn.innerHTML = btn.innerHTML.replace('⏳', '✅');
        break;
        
      case 'normal':
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = btn.innerHTML.replace(/[⏳✅]/, '🎮');
        break;
    }
  }

  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.matches('[data-invite-user]') ||
                  element.querySelector('[data-invite-user]')) {
                shouldScan = true;
              }
            }
          });
        }
      });

      if (shouldScan) {
        setTimeout(() => this.scanAndSetupButtons(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  static createInviteButton(userId: number, username: string, className?: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.setAttribute('data-invite-user', userId.toString());
    button.setAttribute('data-invite-username', username);

    button.className = className || 'btn btn-primary';
    button.innerHTML = 'Challenge';

    return button;
  }

  getStats(): { setupButtons: number, connectedToService: boolean } {
    const setupButtons = document.querySelectorAll('[data-kiss-setup="true"]').length;
    return {
      setupButtons,
      connectedToService: gameInviteService.isConnected()
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => KissInviteButtons.getInstance().init(), 100);
  });
} else {
  setTimeout(() => KissInviteButtons.getInstance().init(), 100);
}

export const kissInviteButtons = KissInviteButtons.getInstance();