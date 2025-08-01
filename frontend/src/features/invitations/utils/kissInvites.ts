// 🎯 KISS Invite Buttons - Auto-intégration dans l'UI existante
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

  // 🎮 Initialiser le système d'auto-détection des boutons
  init(): void {
    if (this.initialized) return;
    
    
    // Observer pour détecter les nouveaux boutons ajoutés dynamiquement
    this.setupMutationObserver();
    
    // Scan initial
    this.scanAndSetupButtons();
    
    this.initialized = true;
  }

  // 🔍 Scanner et configurer tous les boutons d'invitation
  private scanAndSetupButtons(): void {
    const buttons = document.querySelectorAll('[data-invite-user]:not([data-kiss-setup])');
    
    buttons.forEach((button) => {
      this.setupButton(button as HTMLElement);
    });

    if (buttons.length > 0) {
    }
  }

  // ⚙️ Configurer un bouton d'invitation
  private setupButton(button: HTMLElement): void {
    const userId = button.getAttribute('data-invite-user');
    const username = button.getAttribute('data-invite-username') || 'User';
    
    if (!userId || isNaN(parseInt(userId))) {
      console.warn('🎮 KISS: Invalid user ID for invite button:', userId);
      return;
    }

    // Marquer comme configuré
    button.setAttribute('data-kiss-setup', 'true');
        
    // Ajouter classes si pas déjà présentes
    if (!button.className.includes('hover:scale-110')) {
      button.className += ' hover:scale-110 transition-transform cursor-pointer';
    }

    // Event listener
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      
      // Désactiver temporairement le bouton
      this.setButtonState(button, 'sending');
      
      // Envoyer l'invitation
      gameInviteService.sendInvite(parseInt(userId));
      
      // Feedback visuel temporaire
      setTimeout(() => {
        this.setButtonState(button, 'sent');
      }, 500);
      
      // Remettre à l'état normal après 3 secondes
      setTimeout(() => {
        this.setButtonState(button, 'normal');
      }, 3000);
    });

    // Tooltips
    button.title = `Challenge ${username} to a Pong match!`;
  }

  // 🎨 Changer l'état visuel d'un bouton
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

  // 👁️ Observer pour les changements DOM dynamiques
  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Vérifier si c'est un bouton d'invitation ou en contient
              if (element.matches('[data-invite-user]') || 
                  element.querySelector('[data-invite-user]')) {
                shouldScan = true;
              }
            }
          });
        }
      });
      
      if (shouldScan) {
        // Délai pour laisser le DOM se stabiliser
        setTimeout(() => this.scanAndSetupButtons(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 🎯 Méthode utilitaire pour créer un bouton d'invitation
  static createInviteButton(userId: number, username: string, className?: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.setAttribute('data-invite-user', userId.toString());
    button.setAttribute('data-invite-username', username);
    
    button.className = className || 'btn btn-primary';
    button.innerHTML = 'Challenge';
    
    // Le système KISS va automatiquement le configurer
    return button;
  }

  // 📊 Statistiques pour debug
  getStats(): { setupButtons: number, connectedToService: boolean } {
    const setupButtons = document.querySelectorAll('[data-kiss-setup="true"]').length;
    return {
      setupButtons,
      connectedToService: gameInviteService.isConnected()
    };
  }
}

// Auto-initialization quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => KissInviteButtons.getInstance().init(), 100);
  });
} else {
  setTimeout(() => KissInviteButtons.getInstance().init(), 100);
}

// Export pour utilisation manuelle
export const kissInviteButtons = KissInviteButtons.getInstance();