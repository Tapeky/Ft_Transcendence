import { Tournament, TournamentCreateRequest, TournamentJoinRequest, TournamentSize } from '../types/tournament';
import { TournamentService } from '../services/TournamentService';

export interface RegistrationState {
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
  tournament: Tournament | null;
  playerAlias: string | null;
}

export class TournamentRegistrationManager {
  private state: RegistrationState;
  private listeners: Array<(state: RegistrationState) => void> = [];

  constructor() {
    this.state = {
      isCreating: false,
      isJoining: false,
      error: null,
      tournament: null,
      playerAlias: null
    };
  }

  subscribe(listener: (state: RegistrationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): RegistrationState {
    return { ...this.state };
  }

  private updateState(updates: Partial<RegistrationState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  async createTournament(name: string, maxPlayers: TournamentSize): Promise<Tournament> {
    this.updateState({ isCreating: true, error: null });

    try {
      if (!name.trim()) {
        throw new Error('Please enter a tournament name');
      }

      if (name.trim().length > 255) {
        throw new Error('Tournament name too long (max 255 characters)');
      }

      if (![4, 8, 16].includes(maxPlayers)) {
        throw new Error('Tournament size must be 4, 8, or 16 players');
      }

      const request: TournamentCreateRequest = {
        name: name.trim(),
        maxPlayers
      };

      const tournament = await TournamentService.createTournament(request);
      
      this.updateState({ 
        isCreating: false, 
        tournament, 
        error: null 
      });

      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tournament';
      this.updateState({ 
        isCreating: false, 
        error: errorMessage 
      });
      throw error;
    }
  }

  async joinTournament(tournamentId: string, alias: string): Promise<{
    player: { id: string; alias: string; joinedAt: Date };
    tournament: { currentPlayers: number; status: string; ready: boolean };
  }> {
    this.updateState({ isJoining: true, error: null });

    try {
      if (!alias.trim()) {
        throw new Error('Please enter a player alias');
      }

      if (alias.trim().length > 50) {
        throw new Error('Player alias too long (max 50 characters)');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(alias.trim())) {
        throw new Error('Player alias can only contain letters, numbers, underscore, and dash');
      }

      const request: TournamentJoinRequest = {
        alias: alias.trim()
      };

      const result = await TournamentService.joinTournament(tournamentId, request);
      
      const updatedTournament = await TournamentService.getTournamentState(tournamentId);
      
      this.updateState({ 
        isJoining: false, 
        tournament: updatedTournament,
        playerAlias: alias.trim(),
        error: null 
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join tournament';
      this.updateState({ 
        isJoining: false, 
        error: errorMessage 
      });
      throw error;
    }
  }

  async leaveTournament(tournamentId: string): Promise<void> {
    if (!this.state.tournament || this.state.tournament.status !== 'registration') {
      throw new Error('Cannot leave tournament after registration closes');
    }

    try {
      this.updateState({ 
        tournament: null, 
        playerAlias: null, 
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave tournament';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  async refreshTournament(tournamentId: string): Promise<Tournament> {
    try {
      const tournament = await TournamentService.getTournamentState(tournamentId);
      this.updateState({ tournament, error: null });
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tournament';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  async startTournament(tournamentId: string): Promise<Tournament> {
    if (!this.state.tournament) {
      throw new Error('No tournament loaded');
    }

    if (this.state.tournament.status !== 'ready') {
      throw new Error('Tournament is not ready to start');
    }

    try {
      const tournament = await TournamentService.startTournament(tournamentId);
      this.updateState({ tournament, error: null });
      return tournament;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start tournament';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    this.updateState({
      isCreating: false,
      isJoining: false,
      error: null,
      tournament: null,
      playerAlias: null
    });
  }

  static validateTournamentName(name: string): { isValid: boolean; error?: string } {
    if (!name.trim()) {
      return { isValid: false, error: 'Please enter a tournament name' };
    }

    if (name.trim().length > 255) {
      return { isValid: false, error: 'Tournament name too long (max 255 characters)' };
    }

    return { isValid: true };
  }

  static validatePlayerAlias(alias: string): { isValid: boolean; error?: string } {
    if (!alias.trim()) {
      return { isValid: false, error: 'Please enter a player alias' };
    }

    if (alias.trim().length > 50) {
      return { isValid: false, error: 'Player alias too long (max 50 characters)' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(alias.trim())) {
      return { isValid: false, error: 'Player alias can only contain letters, numbers, underscore, and dash' };
    }

    return { isValid: true };
  }

  static canStartTournament(tournament: Tournament | null): { canStart: boolean; reason?: string } {
    if (!tournament) {
      return { canStart: false, reason: 'No tournament loaded' };
    }

    if (tournament.status !== 'ready') {
      if (tournament.status === 'registration') {
        return { canStart: false, reason: `Waiting for players (${tournament.currentPlayers}/${tournament.maxPlayers})` };
      }
      return { canStart: false, reason: `Tournament is ${tournament.status}` };
    }

    if (tournament.currentPlayers !== tournament.maxPlayers) {
      return { canStart: false, reason: `Not enough players (${tournament.currentPlayers}/${tournament.maxPlayers})` };
    }

    return { canStart: true };
  }

  static canJoinTournament(tournament: Tournament | null): { canJoin: boolean; reason?: string } {
    if (!tournament) {
      return { canJoin: false, reason: 'Tournament not found' };
    }

    if (tournament.status !== 'registration') {
      return { canJoin: false, reason: 'Registration is closed' };
    }

    if (tournament.currentPlayers >= tournament.maxPlayers) {
      return { canJoin: false, reason: 'Tournament is full' };
    }

    return { canJoin: true };
  }

  static getRegistrationProgress(tournament: Tournament | null): { 
    current: number; 
    max: number; 
    percentage: number; 
    remaining: number;
  } {
    if (!tournament) {
      return { current: 0, max: 0, percentage: 0, remaining: 0 };
    }

    const current = tournament.currentPlayers;
    const max = tournament.maxPlayers;
    const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
    const remaining = Math.max(0, max - current);

    return { current, max, percentage, remaining };
  }
}
