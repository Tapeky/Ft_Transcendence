import { TournamentViewController } from '../controllers/TournamentViewController';
import { LobbyViewController } from '../controllers/LobbyViewController';
import { RegistrationViewController } from '../controllers/RegistrationViewController';
import { BracketViewController } from '../controllers/BracketViewController';
import { GameViewController } from '../controllers/GameViewController';
import { ResultsViewController } from '../controllers/ResultsViewController';
import { TournamentStateManager, TournamentSystemState } from './TournamentStateManager';

export const USE_VIEW_CONTROLLERS = true;

export type TournamentView = 'lobby' | 'registration' | 'bracket' | 'game' | 'results';

export class TournamentViewManager {
  private controllers: Map<TournamentView, TournamentViewController> = new Map();
  private currentController: TournamentViewController | null = null;
  private element: HTMLElement | null = null;
  private stateManager: TournamentStateManager;

  constructor(stateManager: TournamentStateManager) {
    this.stateManager = stateManager;
    this.initializeControllers();
  }

  setElement(element: HTMLElement): void {
    this.element = element;
    this.controllers.forEach(controller => controller.setElement(element));
  }

  private initializeControllers(): void {
    this.controllers.set('lobby', new LobbyViewController(this.stateManager));
    this.controllers.set('registration', new RegistrationViewController(this.stateManager));
    this.controllers.set('bracket', new BracketViewController(this.stateManager));
    this.controllers.set('game', new GameViewController(this.stateManager));
    this.controllers.set('results', new ResultsViewController(this.stateManager));
  }

  renderView(view: TournamentView, container: Element, state: TournamentSystemState): void {
    if (!USE_VIEW_CONTROLLERS) return;

    const controller = this.controllers.get(view);
    if (!controller) {
      console.error('No controller for view:', view);
      return;
    }

    if (this.currentController && this.currentController !== controller) {
      this.currentController.destroy();
    }

    this.currentController = controller;
    if (this.element) controller.setElement(this.element);
    controller.render(container, state);
  }

  getController(view: TournamentView): TournamentViewController | undefined {
    return this.controllers.get(view);
  }

  getCurrentController(): TournamentViewController | null {
    return this.currentController;
  }

  isEnabled(): boolean {
    return USE_VIEW_CONTROLLERS;
  }

  destroy(): void {
    this.controllers.forEach(controller => controller.destroy());
    this.controllers.clear();
    this.currentController = null;
  }
}
