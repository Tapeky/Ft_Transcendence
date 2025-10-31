import { Tournament, TournamentUIState } from '../types/tournament';
import { TournamentRegistrationManager, RegistrationState } from './TournamentRegistrationManager';
import { MatchOrchestrator, MatchState, GameResult } from '../orchestrators/MatchOrchestrator';
import { BracketEngine } from '../engines/BracketEngine';
import { TournamentService } from '../services/TournamentService';

export interface TournamentSystemState {
  tournament: Tournament | null;
  registration: RegistrationState;
  match: MatchState;
  ui: TournamentUIState;
  system: {
    isInitialized: boolean;
    lastError: string | null;
    lastUpdated: Date;
  };
}

export type TournamentSystemListener = (state: TournamentSystemState) => void;

export class TournamentStateManager {
  private tournament: Tournament | null = null;
  private registrationManager: TournamentRegistrationManager;
  private matchOrchestrator: MatchOrchestrator | null = null;
  private listeners: TournamentSystemListener[] = [];

  private uiState: TournamentUIState = {
    isLoading: false,
    currentView: 'lobby',
    error: undefined,
  };

  private systemState = {
    isInitialized: false,
    lastError: null as string | null,
    lastUpdated: new Date(),
  };

  constructor() {
    this.registrationManager = new TournamentRegistrationManager();
    this.setupRegistrationListener();
  }

  subscribe(listener: TournamentSystemListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): TournamentSystemState {
    return {
      tournament: this.tournament,
      registration: this.registrationManager.getState(),
      match: this.matchOrchestrator?.getState() || {
        currentMatch: null,
        isLoading: false,
        isGameActive: false,
        error: null,
        gameContext: null,
      },
      ui: { ...this.uiState },
      system: { ...this.systemState },
    };
  }

  private notifyListeners(): void {
    this.systemState.lastUpdated = new Date();
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async initialize(): Promise<void> {
    try {
      this.updateUIState({ isLoading: true, error: undefined });

      this.systemState.isInitialized = true;
      this.systemState.lastError = null;

      this.updateUIState({
        isLoading: false,
        currentView: 'lobby',
        error: undefined,
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to initialize tournament system';
      this.systemState.lastError = errorMessage;
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async resumeTournament(tournamentId: string): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await TournamentService.getTournamentState(tournamentId);

      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);

      const currentView = this.getViewForStatus(tournament.status, tournament.bracket);

      this.updateUIState({
        currentView,
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async createTournament(name: string, maxPlayers: 4 | 8 | 16): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await this.registrationManager.createTournament(name, maxPlayers);

      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);

      // Save tournament ID in sessionStorage and update URL
      sessionStorage.setItem('activeTournamentId', tournament.id);
      const newUrl = `/tournament?id=${tournament.id}`;
      window.history.replaceState(null, '', newUrl);

      this.updateUIState({
        currentView: 'registration',
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async joinTournament(tournamentId: string, alias: string): Promise<void> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      await this.registrationManager.joinTournament(tournamentId, alias);

      this.initializeMatchOrchestrator(tournamentId);

      // Save tournament ID in sessionStorage and update URL
      sessionStorage.setItem('activeTournamentId', tournamentId);
      const newUrl = `/tournament?id=${tournamentId}`;
      window.history.replaceState(null, '', newUrl);

      this.updateUIState({
        currentView: 'registration',
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async loadTournament(tournamentId: string): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await TournamentService.getTournamentState(tournamentId);

      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);

      const currentView = this.getViewForStatus(tournament.status, tournament.bracket);

      this.updateUIState({
        currentView,
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async startTournament(): Promise<void> {
    if (!this.tournament) {
      throw new Error('No tournament loaded');
    }

    if (this.tournament.status === 'in_progress' || this.tournament.status === 'running') {
      console.warn('Tournament already started');
      return;
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await this.registrationManager.startTournament(this.tournament.id);

      this.tournament = tournament;
      console.log('Tournament started:', tournament.status);

      this.updateUIState({
        currentView: 'bracket',
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async startNextMatch(): Promise<void> {
    if (!this.matchOrchestrator) {
      throw new Error('Match orchestrator not initialized');
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      await this.matchOrchestrator.loadNextMatch();
      await this.matchOrchestrator.startMatch();

      this.updateUIState({
        currentView: 'game',
        isLoading: false,
        error: undefined,
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start match';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  async completeMatch(result: GameResult): Promise<void> {
    if (!this.matchOrchestrator) {
      throw new Error('Match orchestrator not initialized');
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      await this.matchOrchestrator.completeMatch(result);

      if (this.tournament) {
        this.tournament = await TournamentService.getTournamentState(this.tournament.id);

        const currentView = this.tournament.status === 'completed' ? 'results' : 'bracket';
        this.updateUIState({
          currentView,
          isLoading: false,
          error: undefined,
        });
      }

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete match';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  navigateToView(view: TournamentUIState['currentView']): void {
    if (!this.canNavigateToView(view)) {
      throw new Error(`Cannot navigate to ${view} in current state`);
    }

    this.updateUIState({
      currentView: view,
      error: undefined,
    });
    this.notifyListeners();
  }

  async refreshTournament(): Promise<void> {
    if (!this.tournament) {
      throw new Error('No tournament loaded');
    }

    this.updateUIState({ isLoading: true });

    try {
      this.tournament = await TournamentService.getTournamentState(this.tournament.id);
      this.updateUIState({ isLoading: false });
      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage,
      });
      this.notifyListeners();
      throw error;
    }
  }

  getTournamentStatistics(): {
    totalPlayers: number;
    completedMatches: number;
    remainingMatches: number;
    progressPercentage: number;
    currentRound?: number;
    winner?: string;
  } | null {
    if (!this.tournament) return null;

    const stats = {
      totalPlayers: this.tournament.currentPlayers,
      completedMatches: 0,
      remainingMatches: 0,
      progressPercentage: 0,
      currentRound: undefined as number | undefined,
      winner: undefined as string | undefined,
    };

    if (this.tournament.bracket) {
      const bracketStats = BracketEngine.getBracketStatistics(this.tournament.bracket);
      stats.completedMatches = bracketStats.completedMatches;
      stats.remainingMatches = bracketStats.pendingMatches + bracketStats.inProgressMatches;
      stats.progressPercentage = bracketStats.progressPercentage;
      stats.currentRound = this.tournament.bracket.currentRound;
    }

    if (this.tournament.status === 'completed') {
      stats.winner = TournamentService.getTournamentWinner(this.tournament) || undefined;
    }

    return stats;
  }

  clearErrors(): void {
    this.registrationManager.clearError();
    this.matchOrchestrator?.clearError();
    this.systemState.lastError = null;
    this.updateUIState({ error: undefined });
    this.notifyListeners();
  }

  reset(): void {
    this.tournament = null;
    this.registrationManager.reset();
    this.matchOrchestrator?.reset();
    this.matchOrchestrator = null;

    this.uiState = {
      isLoading: false,
      currentView: 'lobby',
      error: undefined,
    };

    this.systemState = {
      isInitialized: true,
      lastError: null,
      lastUpdated: new Date(),
    };

    this.notifyListeners();
  }

  private setupRegistrationListener(): void {
    this.registrationManager.subscribe(registrationState => {
      if (registrationState.tournament) {
        this.tournament = registrationState.tournament;
      }
      this.notifyListeners();
    });
  }

  private initializeMatchOrchestrator(tournamentId: string): void {
    if (this.matchOrchestrator) {
      this.matchOrchestrator.reset();
    }

    this.matchOrchestrator = new MatchOrchestrator(tournamentId);

    this.matchOrchestrator.subscribe(() => {
      this.notifyListeners();
    });
  }

  private updateUIState(updates: Partial<TournamentUIState>): void {
    this.uiState = { ...this.uiState, ...updates };
  }

  private canNavigateToView(view: TournamentUIState['currentView']): boolean {
    if (!this.tournament) {
      return view === 'lobby';
    }

    switch (this.tournament.status) {
      case 'registration':
        return ['lobby', 'registration'].includes(view);
      case 'ready':
        return ['lobby', 'registration', 'bracket'].includes(view);
      case 'in_progress':
        return ['lobby', 'bracket', 'game'].includes(view);
      case 'completed':
        return ['lobby', 'bracket', 'results'].includes(view);
      default:
        return view === 'lobby';
    }
  }

  private getViewForStatus(status: string, bracket?: any): TournamentUIState['currentView'] {
    switch (status) {
      case 'waiting':
      case 'registration':
        return 'registration';
      case 'ready':
        return bracket ? 'bracket' : 'registration';
      case 'in_progress':
      case 'running':
        return 'bracket';
      case 'completed':
        return 'results';
      default:
        return 'lobby';
    }
  }

  getCurrentTournament(): Tournament | null {
    return this.tournament;
  }

  async refreshTournamentState(): Promise<void> {
    if (this.tournament) {
      try {
        this.tournament = await TournamentService.getTournamentState(this.tournament.id);

        const currentView = this.getViewForStatus(this.tournament.status, this.tournament.bracket);
        this.updateUIState({ currentView });
        this.notifyListeners();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
  }

  getMatchOrchestrator(): MatchOrchestrator | null {
    return this.matchOrchestrator;
  }

  isInitialized(): boolean {
    return this.systemState.isInitialized;
  }
}
