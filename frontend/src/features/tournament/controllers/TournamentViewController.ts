import { TournamentStateManager, TournamentSystemState } from '../managers/TournamentStateManager';

export abstract class TournamentViewController {
  protected element?: HTMLElement;
  protected stateManager: TournamentStateManager;

  constructor(stateManager: TournamentStateManager) {
    this.stateManager = stateManager;
  }

  abstract render(container: Element, state: TournamentSystemState): void;

  abstract bindEvents(): void;

  destroy(): void {}

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  protected showError(message: string): void {
    console.error('Tournament View Error:', message);
  }

  protected querySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.element?.querySelector(selector) as T | null;
  }

  protected querySelectorAll<T extends HTMLElement = HTMLElement>(
    selector: string
  ): NodeListOf<T> | null {
    return this.element?.querySelectorAll(selector) as NodeListOf<T> | null;
  }

  protected isElementReady(): boolean {
    return !!this.element;
  }
}
