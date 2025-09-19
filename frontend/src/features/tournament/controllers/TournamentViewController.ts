import { TournamentStateManager, TournamentSystemState } from '../managers/TournamentStateManager';
import { Tournament, TournamentSize } from '../types/tournament';

/**
 * Abstract base class for tournament view controllers
 * Provides common functionality for managing tournament views
 */
export abstract class TournamentViewController {
  protected element?: HTMLElement;
  protected stateManager: TournamentStateManager;

  constructor(stateManager: TournamentStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Render the view content into the container
   */
  abstract render(container: Element, state: TournamentSystemState): void;

  /**
   * Bind events specific to this view
   */
  abstract bindEvents(): void;

  /**
   * Cleanup when view is being destroyed
   */
  destroy(): void {
    // Default implementation - subclasses can override
  }

  /**
   * Set the element reference for event binding
   */
  setElement(element: HTMLElement): void {
    this.element = element;
  }

  /**
   * Show error message
   */
  protected showError(message: string): void {
    console.error('Tournament View Error:', message);
    // This will be handled by the parent LocalTournament's error system
  }

  /**
   * Safely query elements with null checks
   */
  protected querySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.element?.querySelector(selector) as T | null;
  }

  /**
   * Safely query all elements with null checks
   */
  protected querySelectorAll<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> | null {
    return this.element?.querySelectorAll(selector) as NodeListOf<T> | null;
  }

  /**
   * Check if element is ready for operations
   */
  protected isElementReady(): boolean {
    return !!this.element;
  }
}