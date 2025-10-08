import { router } from '../../../core/app/Router';
import { TournamentStateManager } from './TournamentStateManager';

export const USE_EVENT_MANAGER = true;

export class TournamentEventManager {
  private element: HTMLElement | null = null;
  private stateManager: TournamentStateManager;
  private eventListeners: Map<string, EventListener> = new Map();

  constructor(stateManager: TournamentStateManager) {
    this.stateManager = stateManager;
  }

  setElement(element: HTMLElement): void {
    this.cleanup();
    this.element = element;
    if (USE_EVENT_MANAGER) {
      this.bindGlobalEvents();
    }
  }

  private bindGlobalEvents(): void {
    if (!this.element) return;
    const globalClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      this.handleGlobalClick(target, e);
    };
    this.element.addEventListener('click', globalClickHandler);
    this.eventListeners.set('click', globalClickHandler);
    this.bindNavigationEvents();
    this.bindErrorEvents();
  }

  private handleGlobalClick(target: HTMLElement, event: Event): void {
    if (target.id === 'back-button' || target.closest('#back-button')) {
      event.preventDefault();
      this.handleBackNavigation();
      return;
    }
    if (target.id === 'history-button' || target.closest('#history-button')) {
      event.preventDefault();
      this.handleHistoryNavigation();
      return;
    }
    if (target.id === 'clear-error' || target.closest('#clear-error')) {
      event.preventDefault();
      this.handleClearError();
      return;
    }
  }

  private bindNavigationEvents(): void {
    console.log('Navigation events bound');
  }

  private bindErrorEvents(): void {
    console.log('Error events bound');
  }

  private handleBackNavigation(): void {
    console.log('Going back to home');
    router.navigate('/');
  }

  private handleHistoryNavigation(): void {
    console.log('Viewing tournament history');
    router.navigate('/tournament-history');
  }

  private handleClearError(): void {
    this.stateManager.clearErrors();
  }

  isEnabled(): boolean {
    return USE_EVENT_MANAGER;
  }

  cleanup(): void {
    if (this.element) {
      this.eventListeners.forEach((listener, eventType) => {
        this.element?.removeEventListener(eventType, listener);
      });
    }
    this.eventListeners.clear();
  }

  destroy(): void {
    this.cleanup();
    this.element = null;
  }
}
