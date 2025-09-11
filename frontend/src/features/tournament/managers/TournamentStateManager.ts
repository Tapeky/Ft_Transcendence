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
    error: undefined
  };

  private systemState = {
    isInitialized: false,
    lastError: null as string | null,
    lastUpdated: new Date()
  };

  constructor() {
    this.registrationManager = new TournamentRegistrationManager();
    this.setupRegistrationListener();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: TournamentSystemListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get complete system state
   */
  getState(): TournamentSystemState {
    return {
      tournament: this.tournament,
      registration: this.registrationManager.getState(),
      match: this.matchOrchestrator?.getState() || {
        currentMatch: null,
        isLoading: false,
        isGameActive: false,
        error: null,
        gameContext: null
      },
      ui: { ...this.uiState },
      system: { ...this.systemState }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.systemState.lastUpdated = new Date();
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Initialize tournament system
   */
  async initialize(): Promise<void> {
    try {
      this.updateUIState({ isLoading: true, error: undefined });
      
      // System is now initialized
      this.systemState.isInitialized = true;
      this.systemState.lastError = null;
      
      this.updateUIState({ 
        isLoading: false, 
        currentView: 'lobby',
        error: undefined 
      });
      
      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize tournament system';
      this.systemState.lastError = errorMessage;
      this.updateUIState({ 
        isLoading: false, 
        error: errorMessage 
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Resume an existing tournament by ID
   */
  async resumeTournament(tournamentId: string): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await TournamentService.getTournamentState(tournamentId);
      
      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);
      
      // Determine current view based on tournament status
      let currentView: TournamentUIState['currentView'] = 'lobby';
      
      switch (tournament.status) {
        case 'registration':
          currentView = 'registration';
          break;
        case 'ready':
          // Si ready mais pas de bracket, rester en registration pour permettre de start
          currentView = tournament.bracket ? 'bracket' : 'registration';
          break;
        case 'in_progress':
        case 'running':
          currentView = 'bracket'; // Could be 'game' if match is active
          break;
        case 'completed':
          currentView = 'results';
          break;
        default:
          currentView = 'lobby';
      }

      this.updateUIState({
        currentView,
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Create a new tournament
   */
  async createTournament(name: string, maxPlayers: 4 | 8 | 16): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await this.registrationManager.createTournament(name, maxPlayers);
      
      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);
      
      this.updateUIState({
        currentView: 'registration',
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Join an existing tournament
   */
  async joinTournament(tournamentId: string, alias: string): Promise<void> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      await this.registrationManager.joinTournament(tournamentId, alias);
      
      // Tournament state will be updated via registration manager listener
      this.initializeMatchOrchestrator(tournamentId);
      
      this.updateUIState({
        currentView: 'registration',
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Load existing tournament by ID
   */
  async loadTournament(tournamentId: string): Promise<Tournament> {
    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await TournamentService.getTournamentState(tournamentId);
      
      this.tournament = tournament;
      this.initializeMatchOrchestrator(tournament.id);
      
      // Determine current view based on tournament status
      let currentView: TournamentUIState['currentView'] = 'lobby';
      
      switch (tournament.status) {
        case 'registration':
          currentView = 'registration';
          break;
        case 'ready':
          // Si ready mais pas de bracket, rester en registration pour permettre de start
          currentView = tournament.bracket ? 'bracket' : 'registration';
          break;
        case 'in_progress':
        case 'running':
          currentView = 'bracket'; // Could be 'game' if match is active
          break;
        case 'completed':
          currentView = 'results';
          break;
        default:
          currentView = 'lobby';
      }

      this.updateUIState({
        currentView,
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Start tournament (move from registration to bracket)
   */
  async startTournament(): Promise<void> {
    if (!this.tournament) {
      throw new Error('No tournament loaded');
    }

    // Prevent starting tournament if already in progress or running
    if (this.tournament.status === 'in_progress' || this.tournament.status === 'running') {
      console.warn('Tournament is already started, skipping start request');
      return;
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      const tournament = await this.registrationManager.startTournament(this.tournament.id);
      
      this.tournament = tournament;
      console.log('Tournament started successfully:', {
        status: tournament.status,
        bracket: !!tournament.bracket,
        bracketRounds: tournament.bracket?.rounds?.length
      });
      
      this.updateUIState({
        currentView: 'bracket',
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tournament';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Start next match
   */
  async startNextMatch(): Promise<void> {
    if (!this.matchOrchestrator) {
      throw new Error('Match orchestrator not initialized');
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      // Load and start next match
      await this.matchOrchestrator.loadNextMatch();
      await this.matchOrchestrator.startMatch();
      
      this.updateUIState({
        currentView: 'game',
        isLoading: false,
        error: undefined
      });

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start match';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Complete current match
   */
  async completeMatch(result: GameResult): Promise<void> {
    if (!this.matchOrchestrator) {
      throw new Error('Match orchestrator not initialized');
    }

    this.updateUIState({ isLoading: true, error: undefined });

    try {
      await this.matchOrchestrator.completeMatch(result);
      
      // Refresh tournament state
      if (this.tournament) {
        this.tournament = await TournamentService.getTournamentState(this.tournament.id);
        
        // Check if tournament is complete
        if (this.tournament.status === 'completed') {
          this.updateUIState({
            currentView: 'results',
            isLoading: false,
            error: undefined
          });
        } else {
          // Back to bracket view to show updated bracket
          this.updateUIState({
            currentView: 'bracket',
            isLoading: false,
            error: undefined
          });
        }
      }

      this.notifyListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete match';
      this.updateUIState({
        isLoading: false,
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Navigate to different tournament view
   */
  navigateToView(view: TournamentUIState['currentView']): void {
    // Validate navigation is allowed
    if (!this.canNavigateToView(view)) {
      throw new Error(`Cannot navigate to ${view} in current state`);
    }

    this.updateUIState({ 
      currentView: view,
      error: undefined 
    });
    this.notifyListeners();
  }

  /**
   * Refresh tournament data
   */
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
        error: errorMessage
      });
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Get tournament statistics
   */
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
      winner: undefined as string | undefined
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

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.registrationManager.clearError();
    this.matchOrchestrator?.clearError();
    this.systemState.lastError = null;
    this.updateUIState({ error: undefined });
    this.notifyListeners();
  }

  /**
   * Reset entire system
   */
  reset(): void {
    this.tournament = null;
    this.registrationManager.reset();
    this.matchOrchestrator?.reset();
    this.matchOrchestrator = null;
    
    this.uiState = {
      isLoading: false,
      currentView: 'lobby',
      error: undefined
    };

    this.systemState = {
      isInitialized: true, // Keep initialized
      lastError: null,
      lastUpdated: new Date()
    };

    this.notifyListeners();
  }

  /**
   * Setup registration manager listener
   */
  private setupRegistrationListener(): void {
    this.registrationManager.subscribe((registrationState) => {
      // Update tournament reference when registration state changes
      if (registrationState.tournament) {
        this.tournament = registrationState.tournament;
      }
      this.notifyListeners();
    });
  }

  /**
   * Initialize match orchestrator for tournament
   */
  private initializeMatchOrchestrator(tournamentId: string): void {
    if (this.matchOrchestrator) {
      this.matchOrchestrator.reset();
    }

    this.matchOrchestrator = new MatchOrchestrator(tournamentId);
    
    // Setup match orchestrator listener
    this.matchOrchestrator.subscribe(() => {
      this.notifyListeners();
    });
  }

  /**
   * Update UI state
   */
  private updateUIState(updates: Partial<TournamentUIState>): void {
    this.uiState = { ...this.uiState, ...updates };
  }

  /**
   * Check if navigation to view is allowed
   */
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

  /**
   * Get current tournament
   */
  getCurrentTournament(): Tournament | null {
    return this.tournament;
  }

  /**
   * Refresh tournament state from backend
   */
  async refreshTournamentState(): Promise<void> {
    if (this.tournament) {
      try {
        this.tournament = await TournamentService.getTournamentState(this.tournament.id);
        
        // 🔧 DEBUG: Log tournament data from backend
        console.log('🔧 Tournament data from backend:', JSON.stringify(this.tournament, null, 2));
        
        // Recalculate current view based on updated tournament status
        let currentView: TournamentUIState['currentView'] = 'lobby';
        
        switch (this.tournament.status) {
          case 'registration':
            currentView = 'registration';
            break;
          case 'ready':
            currentView = this.tournament.bracket ? 'bracket' : 'registration';
            break;
          case 'in_progress':
          case 'running':
            currentView = 'bracket';
            break;
          case 'completed':
            currentView = 'results';
            break;
          default:
            currentView = 'lobby';
        }

        this.updateUIState({ currentView });
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to refresh tournament state:', error);
      }
    }
  }

  /**
   * Get match orchestrator
   */
  getMatchOrchestrator(): MatchOrchestrator | null {
    return this.matchOrchestrator;
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.systemState.isInitialized;
  }
}