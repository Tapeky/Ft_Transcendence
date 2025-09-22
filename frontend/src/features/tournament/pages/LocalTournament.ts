import { TournamentStateManager, TournamentSystemState } from '../managers/TournamentStateManager';
import { Tournament, TournamentSize } from '../types/tournament';
import { router } from '../../../core/app/Router';
import { Header } from '../../../shared/components/Header';
import { Banner } from '../../../shared/components/Banner';
import { authManager } from '../../../core/auth/AuthManager';
import { TournamentViewManager } from '../managers/TournamentViewManager';
import { TournamentEventManager } from '../managers/TournamentEventManager';

export class LocalTournament {
  private static USE_VIEW_CONTROLLERS = true;
  private static USE_EVENT_MANAGER = true;

  private element: HTMLElement;
  private stateManager: TournamentStateManager;
  private unsubscribe?: () => void;
  private currentState: TournamentSystemState | null = null;
  private header?: Header;
  private banner?: Banner;
  private authUnsubscribe?: () => void;
  private viewManager?: TournamentViewManager;
  private eventManager?: TournamentEventManager;
  private initializationPromise: Promise<void>;

  constructor() {
    this.element = this.createElement();
    this.stateManager = new TournamentStateManager();
    this.initializationPromise = this.initializeAsync();
    this.setupStateSubscription();
    this.subscribeToAuth();
  }

  private async initializeAsync(): Promise<void> {
    await this.initializeNewArchitecture();
    if (this.viewManager) {
      this.viewManager.setElement(this.element);
    }
    if (this.eventManager) {
      this.eventManager.setElement(this.element);
    }
    this.bindEvents();
    setTimeout(() => {
      this.checkForExistingTournament();
    }, 0);
  }

  private async initializeNewArchitecture(): Promise<void> {
    if (LocalTournament.USE_VIEW_CONTROLLERS || LocalTournament.USE_EVENT_MANAGER) {
      try {
        const { TournamentViewManager } = await import('../managers/TournamentViewManager');
        const { TournamentEventManager } = await import('../managers/TournamentEventManager');

        if (LocalTournament.USE_VIEW_CONTROLLERS) {
          this.viewManager = new TournamentViewManager(this.stateManager);
        }

        if (LocalTournament.USE_EVENT_MANAGER) {
          this.eventManager = new TournamentEventManager(this.stateManager);
        }
      } catch (error) {
        console.error('Failed to initialize new architecture:', error);
        LocalTournament.USE_VIEW_CONTROLLERS = false;
        LocalTournament.USE_EVENT_MANAGER = false;
      }
    }
  }

  private async checkForExistingTournament(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentId = urlParams.get('id');

    if (tournamentId) {
      try {
        console.log('Resuming tournament:', tournamentId);
        await this.stateManager.resumeTournament(tournamentId);
      } catch (error) {
        console.error('Failed to resume tournament:', error);
        this.updateErrorState('Impossible de reprendre ce tournoi. Il a peut-être été supprimé ou est terminé.');
        await this.initialize();
      }
    } else {
      await this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    try {
      await this.stateManager.initialize();
      this.checkForTournamentResult();
    } catch (error) {
      console.error('Failed to initialize tournament system:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to initialize tournament system');
    }
  }

  private async checkForTournamentResult(): Promise<void> {
    const tournamentResultJson = sessionStorage.getItem('tournamentMatchResult');
    if (tournamentResultJson) {
      try {
        const result = JSON.parse(tournamentResultJson);
        console.log('Tournament result:', result);
        sessionStorage.removeItem('tournamentMatchResult');
        if (!this.currentState?.tournament) {
          await this.stateManager.loadTournament(result.tournamentId);
        }

        const matchResult = {
          matchId: result.matchId,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
          winnerAlias: result.winnerAlias
        };

        console.log('Sending match result:', { tournamentId: result.tournamentId, matchResult });
        const { TournamentService } = await import('../services/TournamentService');
        await TournamentService.submitMatchResult(result.tournamentId, matchResult);
        await this.stateManager.refreshTournamentState();
      } catch (error) {
        console.error('Failed to process tournament result:', error);
        this.showError('Failed to process match result');
      }
    }
  }

  private setupStateSubscription(): void {
    this.unsubscribe = this.stateManager.subscribe((state) => {
      this.currentState = state;
      this.updateView(state);
    });
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
        router.navigate('/');
      }
    });

    if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
      router.navigate('/');
    }
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true);
    this.banner = new Banner();
    const mainContent = document.createElement('main');
    mainContent.className = 'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700';
    mainContent.id = 'tournament-content-wrapper';

    mainContent.innerHTML = `
      <div class="w-full p-8">
        <div class="bg-black/20 backdrop-blur-sm rounded-lg mb-6 p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <button id="back-button" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
                ← Back to Menu
              </button>
              <h1 class="text-2xl font-bold text-white font-iceland">Local Tournament</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button
                id="history-button"
                class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg"
              >
                📊 History
              </button>
            </div>
          </div>
        </div>

        <div id="loading-state" class="hidden">
          <div class="bg-black/30 backdrop-blur-sm rounded-lg p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p class="text-white font-iceland text-lg">Loading...</p>
          </div>
        </div>

        <div id="error-state" class="hidden">
          <div class="bg-red-600/30 backdrop-blur-sm border border-red-400 rounded-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-red-200 text-lg font-semibold font-iceland">❌ Error</h3>
                <p id="error-message" class="text-red-100 mt-2 font-iceland"></p>
              </div>
              <button id="clear-error" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland">
                Clear
              </button>
            </div>
          </div>
        </div>

        <div id="tournament-content">
        </div>
      </div>
    `;

    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(mainContent);

    return container;
  }

  private bindEvents(): void {
    if (!this.element) {
      console.warn('Element not ready for event binding, retrying...');
      setTimeout(() => {
        this.bindEvents();
      }, 100);
      return;
    }

    if (this.eventManager && this.eventManager.isEnabled()) {
      console.log('Using TournamentEventManager for event handling');
      return;
    }

    console.warn('EventManager not available - this should not happen with new architecture');
  }

  private updateView(state: TournamentSystemState): void {
    if (!this.element) return;

    this.updateLoadingState(state.ui.isLoading);
    this.updateErrorState(state.ui.error || state.system.lastError);
    this.updateContent(state);
  }

  private updateLoadingState(isLoading: boolean): void {
    if (!this.element) return;

    const loadingElement = this.element.querySelector('#loading-state');
    if (loadingElement) {
      loadingElement.classList.toggle('hidden', !isLoading);
    }
  }

  private updateErrorState(error: string | null): void {
    if (!this.element) return;

    const errorElement = this.element.querySelector('#error-state');
    const errorMessageElement = this.element.querySelector('#error-message');

    if (errorElement && errorMessageElement) {
      if (error) {
        errorMessageElement.textContent = error;
        errorElement.classList.remove('hidden');
      } else {
        errorElement.classList.add('hidden');
      }
    }
  }

  private updateContent(state: TournamentSystemState): void {
    if (!this.element) return;

    const contentElement = this.element.querySelector('#tournament-content');
    if (!contentElement) return;

    if (state.ui.isLoading) {
      return;
    }

    if (this.viewManager && this.viewManager.isEnabled()) {
      console.log(`Using ViewManager for view: ${state.ui.currentView}`);
      this.viewManager.renderView(state.ui.currentView, contentElement, state);
      return;
    }

    console.warn('ViewManager not available - this should not happen with new architecture');
  }

  private async createLocalTournament(name: string, maxPlayers: TournamentSize, players: string[]): Promise<void> {
    try {
      await this.stateManager.createTournament(name, maxPlayers);
      for (const playerName of players) {
        await this.stateManager.joinTournament(this.currentState?.tournament?.id || '', playerName);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      const tournamentId = this.currentState?.tournament?.id;
      if (!tournamentId) {
        throw new Error('Tournament ID not available');
      }
      await this.stateManager.refreshTournamentState();

      const currentTournament = this.stateManager.getCurrentTournament();
      console.log('Tournament status before start:', currentTournament?.status);

      if (!currentTournament || (
        currentTournament.status !== 'ready' &&
        currentTournament.status !== 'in_progress' &&
        currentTournament.status !== 'running'
      )) {
        throw new Error(`Tournament cannot be started. Current status: ${currentTournament?.status || 'unknown'}`);
      }

      console.log('Tournament created successfully. Navigate to registration view to start.');

    } catch (error) {
      console.error('Failed to start local tournament:', error);
      this.showError('Failed to create tournament. Please try again.');
    }
  }

  private redirectToGame(state: TournamentSystemState): void {
    const matchOrchestrator = this.stateManager.getMatchOrchestrator();
    const gameContext = matchOrchestrator?.getCurrentGameContext();

    if (gameContext) {
      const contextParam = encodeURIComponent(JSON.stringify(gameContext));
      console.log('Redirecting to game with context:', gameContext);
      window.location.href = `/game?tournamentContext=${contextParam}`;
    }
  }

  private showError(message: string): void {
    this.updateErrorState(message);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    if (this.viewManager) {
      this.viewManager.destroy();
    }
    if (this.eventManager) {
      this.eventManager.destroy();
    }

    this.element.remove();
  }
}
