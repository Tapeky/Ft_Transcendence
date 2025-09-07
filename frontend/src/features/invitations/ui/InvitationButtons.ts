// 🎯 Système de Boutons d'Invitation - UX Robuste et Feedback Temps Réel
import { invitationService } from '../services/InvitationService';
import { InvitationValidation, INVITATION_CONSTANTS } from '../types/InvitationTypes';

interface ButtonInstance {
  element: HTMLElement;
  userId: number;
  username: string;
  state: ButtonState;
  timeoutId?: number;
}

interface ButtonState {
  type: 'idle' | 'sending' | 'sent' | 'error' | 'rate-limited';
  message?: string;
  timestamp: number;
}

export class InvitationButtons {
  private static instance: InvitationButtons;
  private buttons = new Map<HTMLElement, ButtonInstance>();
  private observer: MutationObserver | null = null;
  private initialized = false;

  static getInstance(): InvitationButtons {
    if (!InvitationButtons.instance) {
      InvitationButtons.instance = new InvitationButtons();
    }
    return InvitationButtons.instance;
  }

  private constructor() {}

  // 🚀 Initialisation
  initialize(): void {
    if (this.initialized) return;

    this.setupInvitationServiceCallbacks();
    this.setupMutationObserver();
    this.scanExistingButtons();
    
    this.initialized = true;
    console.log('✅ InvitationButtons initialized');
  }

  private setupInvitationServiceCallbacks(): void {
    invitationService.setCallbacks({
      onInviteSent: (data) => {
        this.updateButtonsForUser(data.toUserId, 'sent', 'Invitation sent!');
      },
      onInviteError: (error) => {
        if (error.inviteId) {
          // Trouver l'utilisateur basé sur l'inviteId (pas optimal, mais fonctionnel)
          const buttons = Array.from(this.buttons.values());
          buttons.forEach(button => {
            if (button.state.type === 'sending') {
              this.updateButtonState(button, 'error', error.message);
            }
          });
        }
      },
      onConnectionChange: (state) => {
        if (state.state === 'error' || state.state === 'disconnected') {
          this.disableAllButtons('Connection lost');
        } else if (state.state === 'connected') {
          this.enableAllButtons();
        }
      }
    });
  }

  private setupMutationObserver(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
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

          // Nettoyer les boutons supprimés
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.cleanupRemovedButtons(node as Element);
            }
          });
        }
      });

      if (shouldScan) {
        // Délai pour laisser le DOM se stabiliser
        setTimeout(() => this.scanExistingButtons(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private cleanupRemovedButtons(removedElement: Element): void {
    const buttonsToRemove: HTMLElement[] = [];
    
    for (const [buttonElement] of this.buttons) {
      if (!document.contains(buttonElement) || removedElement.contains(buttonElement)) {
        buttonsToRemove.push(buttonElement);
      }
    }
    
    buttonsToRemove.forEach(button => {
      const instance = this.buttons.get(button);
      if (instance?.timeoutId) {
        clearTimeout(instance.timeoutId);
      }
      this.buttons.delete(button);
    });
  }

  // 🔍 Scan et Configuration des Boutons
  private scanExistingButtons(): void {
    const buttons = document.querySelectorAll('[data-invite-user]:not([data-invitation-setup])');
    
    buttons.forEach((button) => {
      this.setupButton(button as HTMLElement);
    });

    if (buttons.length > 0) {
      console.log(`🎮 Found and configured ${buttons.length} invitation buttons`);
    }
  }

  private setupButton(element: HTMLElement): void {
    const userId = element.getAttribute('data-invite-user');
    const username = element.getAttribute('data-invite-username') || 'Unknown User';

    // Validation stricte
    if (!userId || !InvitationValidation.isValidUserId(parseInt(userId))) {
      console.warn('❌ Invalid user ID for invitation button:', userId);
      return;
    }

    const userIdNumber = parseInt(userId);

    // Marquer comme configuré
    element.setAttribute('data-invitation-setup', 'true');

    // Créer l'instance du bouton
    const buttonInstance: ButtonInstance = {
      element,
      userId: userIdNumber,
      username,
      state: { type: 'idle', timestamp: Date.now() }
    };

    // Ajouter les classes CSS de base
    this.addBaseClasses(element);

    // Configurer le tooltip
    element.title = `Send game invitation to ${username}`;

    // Event listener principal
    element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleButtonClick(buttonInstance);
    });

    // Stocker l'instance
    this.buttons.set(element, buttonInstance);

    // État initial
    this.updateButtonState(buttonInstance, 'idle');
  }

  private addBaseClasses(element: HTMLElement): void {
    // Classes de base pour l'animation et l'interaction
    const baseClasses = [
      'transition-all',
      'duration-300',
      'transform',
      'hover:scale-105',
      'active:scale-95',
      'cursor-pointer'
    ];

    baseClasses.forEach(cls => {
      if (!element.classList.contains(cls)) {
        element.classList.add(cls);
      }
    });
  }

  // 🎯 Gestion des Clics
  private async handleButtonClick(buttonInstance: ButtonInstance): void {
    // Vérifier l'état actuel
    if (buttonInstance.state.type === 'sending') {
      return; // Déjà en cours d'envoi
    }

    // Vérifier la connexion
    const connectionState = invitationService.getConnectionState();
    if (!connectionState.connected) {
      this.updateButtonState(buttonInstance, 'error', 'Not connected to server');
      return;
    }

    // Mettre à jour l'état
    this.updateButtonState(buttonInstance, 'sending', 'Sending invitation...');

    try {
      // Envoyer l'invitation
      const result = await invitationService.sendInvite(buttonInstance.userId);

      if (result.success) {
        this.updateButtonState(buttonInstance, 'sent', 'Invitation sent!');
        
        // Retour à l'état normal après 3 secondes
        buttonInstance.timeoutId = window.setTimeout(() => {
          this.updateButtonState(buttonInstance, 'idle');
        }, INVITATION_CONSTANTS.BUTTON_FEEDBACK_DURATION);
        
      } else {
        // Gestion des erreurs spécifiques
        if (result.error?.includes('Rate limit')) {
          this.updateButtonState(buttonInstance, 'rate-limited', result.error);
          
          // Retour à l'état normal après plus longtemps pour rate limiting
          buttonInstance.timeoutId = window.setTimeout(() => {
            this.updateButtonState(buttonInstance, 'idle');
          }, 10000); // 10 secondes
          
        } else {
          this.updateButtonState(buttonInstance, 'error', result.error || 'Failed to send invitation');
          
          // Retour à l'état normal après 5 secondes pour les erreurs
          buttonInstance.timeoutId = window.setTimeout(() => {
            this.updateButtonState(buttonInstance, 'idle');
          }, 5000);
        }
      }

    } catch (error) {
      console.error('❌ Button click error:', error);
      this.updateButtonState(buttonInstance, 'error', 'Unexpected error occurred');
      
      buttonInstance.timeoutId = window.setTimeout(() => {
        this.updateButtonState(buttonInstance, 'idle');
      }, 5000);
    }
  }

  // 🎨 Gestion des États Visuels
  private updateButtonState(buttonInstance: ButtonInstance, type: ButtonState['type'], message?: string): void {
    const { element } = buttonInstance;
    
    // Clear timeout existant
    if (buttonInstance.timeoutId) {
      clearTimeout(buttonInstance.timeoutId);
      buttonInstance.timeoutId = undefined;
    }

    // Mettre à jour l'état
    buttonInstance.state = {
      type,
      message,
      timestamp: Date.now()
    };

    // Nettoyer les classes d'état précédentes
    element.classList.remove(
      'invitation-idle', 'invitation-sending', 'invitation-sent', 
      'invitation-error', 'invitation-rate-limited'
    );

    // Appliquer le nouvel état
    switch (type) {
      case 'idle':
        element.classList.add('invitation-idle');
        element.disabled = false;
        this.updateButtonContent(element, '🎮', 'Challenge');
        element.title = `Send game invitation to ${buttonInstance.username}`;
        break;

      case 'sending':
        element.classList.add('invitation-sending');
        element.disabled = true;
        this.updateButtonContent(element, '⏳', 'Sending...');
        element.title = message || 'Sending invitation...';
        break;

      case 'sent':
        element.classList.add('invitation-sent');
        element.disabled = true;
        this.updateButtonContent(element, '✅', 'Sent!');
        element.title = message || 'Invitation sent successfully';
        break;

      case 'error':
        element.classList.add('invitation-error');
        element.disabled = false;
        this.updateButtonContent(element, '❌', 'Error');
        element.title = message || 'Failed to send invitation - Click to retry';
        break;

      case 'rate-limited':
        element.classList.add('invitation-rate-limited');
        element.disabled = true;
        this.updateButtonContent(element, '⏱️', 'Wait...');
        element.title = message || 'Rate limited - Please wait';
        break;
    }
  }

  private updateButtonContent(element: HTMLElement, icon: string, text: string): void {
    // Trouver et mettre à jour le contenu
    const iconElement = element.querySelector('img, .icon');
    const textElement = element.querySelector('.text, span');

    if (iconElement) {
      // Si c'est une image, on ne peut pas changer l'icône facilement
      // On peut ajouter un overlay ou changer l'opacity
      if (iconElement.tagName === 'IMG') {
        (iconElement as HTMLElement).style.opacity = icon === '🎮' ? '1' : '0.5';
      } else {
        iconElement.textContent = icon;
      }
    }

    if (textElement) {
      textElement.textContent = text;
    } else if (!iconElement) {
      // Fallback: changer tout le contenu
      const currentContent = element.innerHTML;
      if (currentContent.includes('Challenge') || currentContent.includes('Sent') || 
          currentContent.includes('Error') || currentContent.includes('Sending') ||
          currentContent.includes('Wait')) {
        element.innerHTML = currentContent.replace(
          /(Challenge|Sent!|Error|Sending\.\.\.|Wait\.\.\.)/g, 
          text
        );
      }
    }
  }

  // 🔄 Utilitaires de Gestion des États
  private updateButtonsForUser(userId: number, type: ButtonState['type'], message?: string): void {
    for (const [element, buttonInstance] of this.buttons) {
      if (buttonInstance.userId === userId) {
        this.updateButtonState(buttonInstance, type, message);
      }
    }
  }

  private disableAllButtons(reason: string): void {
    for (const [element, buttonInstance] of this.buttons) {
      this.updateButtonState(buttonInstance, 'error', reason);
    }
  }

  private enableAllButtons(): void {
    for (const [element, buttonInstance] of this.buttons) {
      if (buttonInstance.state.type === 'error' && 
          buttonInstance.state.message?.includes('Connection')) {
        this.updateButtonState(buttonInstance, 'idle');
      }
    }
  }

  // 📊 Statistiques et Debug
  getButtonStats(): {
    total: number;
    byState: Record<string, number>;
    users: number[];
  } {
    const stats = {
      total: this.buttons.size,
      byState: {} as Record<string, number>,
      users: [] as number[]
    };

    for (const [, buttonInstance] of this.buttons) {
      const state = buttonInstance.state.type;
      stats.byState[state] = (stats.byState[state] || 0) + 1;
      stats.users.push(buttonInstance.userId);
    }

    return stats;
  }

  // 🧹 Cleanup
  cleanup(): void {
    console.log('🧹 Cleaning up InvitationButtons');

    // Clear tous les timeouts
    for (const [, buttonInstance] of this.buttons) {
      if (buttonInstance.timeoutId) {
        clearTimeout(buttonInstance.timeoutId);
      }
    }

    // Clear le map
    this.buttons.clear();

    // Disconnect l'observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.initialized = false;
  }

  destroy(): void {
    this.cleanup();
    InvitationButtons.instance = null as any;
  }
}

// Auto-initialisation intelligente
const initializeButtons = () => {
  const buttons = InvitationButtons.getInstance();
  buttons.initialize();
};

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeButtons);
} else {
  // DOM déjà prêt, initialiser après un court délai
  setTimeout(initializeButtons, 100);
}

export const invitationButtons = InvitationButtons.getInstance();