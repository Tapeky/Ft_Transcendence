import { TournamentMatch, TournamentGameContext } from '../types/tournament';
import { TournamentService } from '../services/TournamentService';
import { BracketEngine } from '../engines/BracketEngine';

export interface MatchState {
  currentMatch: TournamentMatch | null;
  isLoading: boolean;
  isGameActive: boolean;
  error: string | null;
  gameContext: TournamentGameContext | null;
}

export interface GameResult {
  player1Score: number;
  player2Score: number;
  winnerAlias: string;
  duration?: number; // in seconds
  gameData?: any; // Additional game-specific data
}

export class MatchOrchestrator {
  private state: MatchState;
  private listeners: Array<(state: MatchState) => void> = [];
  private tournamentId: string;

  constructor(tournamentId: string) {
    this.tournamentId = tournamentId;
    this.state = {
      currentMatch: null,
      isLoading: false,
      isGameActive: false,
      error: null,
      gameContext: null
    };
  }

  /**
   * Subscribe to match state changes
   */
  subscribe(listener: (state: MatchState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current match state
   */
  getState(): MatchState {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<MatchState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Load next match to be played
   */
  async loadNextMatch(): Promise<TournamentMatch | null> {
    this.updateState({ isLoading: true, error: null });

    try {
      const nextMatchData = await TournamentService.getNextMatch(this.tournamentId);
      
      if (!nextMatchData) {
        this.updateState({
          currentMatch: null,
          gameContext: null,
          isLoading: false
        });
        return null;
      }

      // Convert API response to TournamentMatch format
      const nextMatch: TournamentMatch = {
        id: nextMatchData.id,
        tournamentId: nextMatchData.tournamentId,
        round: nextMatchData.round,
        matchNumber: nextMatchData.matchNumber,
        player1Alias: nextMatchData.player1Alias,
        player2Alias: nextMatchData.player2Alias,
        player1Score: 0,
        player2Score: 0,
        status: nextMatchData.status,
        startedAt: this.parseDate(nextMatchData.startedAt)
      };
      
      const gameContext = this.createGameContext(nextMatch);
      
      this.updateState({
        currentMatch: nextMatch,
        gameContext,
        isLoading: false
      });

      return nextMatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load next match';
      this.updateState({
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Start the current match (launch game)
   */
  async startMatch(): Promise<TournamentGameContext> {
    if (!this.state.currentMatch) {
      throw new Error('No match loaded');
    }

    if (this.state.isGameActive) {
      throw new Error('Match is already in progress');
    }

    try {
      const gameContext = this.createGameContext(this.state.currentMatch);
      
      this.updateState({
        isGameActive: true,
        gameContext,
        error: null
      });

      return gameContext;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start match';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  /**
   * Complete current match with game result
   */
  async completeMatch(result: GameResult): Promise<void> {
    if (!this.state.currentMatch) {
      throw new Error('No match loaded');
    }

    if (!this.state.isGameActive) {
      throw new Error('No match in progress');
    }

    try {
      // Validate result
      this.validateGameResult(result, this.state.currentMatch);

      // Submit result to backend
      await TournamentService.submitMatchResult(this.tournamentId, {
        matchId: this.state.currentMatch.id,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winnerAlias: result.winnerAlias
      });

      // Update local state
      const completedMatch: TournamentMatch = {
        ...this.state.currentMatch,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        winnerAlias: result.winnerAlias,
        status: 'completed',
        completedAt: new Date()
      };

      this.updateState({
        currentMatch: completedMatch,
        isGameActive: false,
        gameContext: null,
        error: null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete match';
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  /**
   * Cancel current match in progress
   */
  async cancelMatch(): Promise<void> {
    if (!this.state.isGameActive) {
      throw new Error('No match in progress to cancel');
    }

    this.updateState({
      isGameActive: false,
      gameContext: null,
      error: null
    });
  }

  /**
   * Get match statistics for UI display
   */
  getMatchStatistics(): {
    player1: { alias: string; score: number };
    player2: { alias: string; score: number };
    round: number;
    matchNumber: number;
    status: string;
    duration?: number;
  } | null {
    const match = this.state.currentMatch;
    if (!match) return null;

    return {
      player1: {
        alias: match.player1Alias,
        score: match.player1Score
      },
      player2: {
        alias: match.player2Alias,
        score: match.player2Score
      },
      round: match.round,
      matchNumber: match.matchNumber,
      status: match.status,
      duration: match.startedAt && match.completedAt
        ? Math.round((match.completedAt.getTime() - match.startedAt.getTime()) / 1000)
        : undefined
    };
  }

  /**
   * Create game context for tournament integration
   */
  private createGameContext(match: TournamentMatch): TournamentGameContext {
    return {
      tournamentId: this.tournamentId,
      matchId: match.id,
      player1Alias: match.player1Alias,
      player2Alias: match.player2Alias,
      round: match.round,
      matchNumber: match.matchNumber
    };
  }

  /**
   * Helper method to safely convert date strings to Date objects
   */
  private parseDate(dateString: string | Date | undefined): Date | undefined {
    if (!dateString) return undefined;
    if (dateString instanceof Date) return dateString;
    return new Date(dateString);
  }

  /**
   * Validate game result before submission
   */
  private validateGameResult(result: GameResult, match: TournamentMatch): void {
    // Validate scores are non-negative
    if (result.player1Score < 0 || result.player2Score < 0) {
      throw new Error('Scores cannot be negative');
    }

    // Validate winner is one of the players
    if (result.winnerAlias !== match.player1Alias && result.winnerAlias !== match.player2Alias) {
      throw new Error('Winner must be one of the match players');
    }

    // Validate winner has higher score
    const winnerScore = result.winnerAlias === match.player1Alias 
      ? result.player1Score 
      : result.player2Score;
    const loserScore = result.winnerAlias === match.player1Alias 
      ? result.player2Score 
      : result.player1Score;

    if (winnerScore <= loserScore) {
      throw new Error('Winner must have higher score than loser');
    }

    // Validate scores make sense for Pong (allow higher scores for testing)
    const maxScore = Math.max(result.player1Score, result.player2Score);
    if (maxScore > 50) { // More reasonable upper limit for testing
      throw new Error('Scores seem unreasonably high');
    }

    if (maxScore === 0) {
      throw new Error('At least one player must score');
    }
  }

  /**
   * Get current game context
   */
  getCurrentGameContext(): TournamentGameContext | null {
    return this.state.gameContext;
  }

  /**
   * Check if match orchestrator is ready to start a match
   */
  isReadyToStart(): boolean {
    return !!(this.state.currentMatch && 
              !this.state.isGameActive && 
              !this.state.isLoading &&
              (this.state.currentMatch.status === 'in_progress' || this.state.currentMatch.status === 'pending'));
  }

  /**
   * Check if match is currently active
   */
  isMatchActive(): boolean {
    return this.state.isGameActive;
  }

  /**
   * Get current match info for UI
   */
  getCurrentMatchInfo(): {
    round: number;
    matchNumber: number;
    roundName: string;
    player1Alias: string;
    player2Alias: string;
    status: string;
  } | null {
    const match = this.state.currentMatch;
    if (!match) return null;

    return {
      round: match.round,
      matchNumber: match.matchNumber,
      roundName: this.getRoundName(match.round),
      player1Alias: match.player1Alias,
      player2Alias: match.player2Alias,
      status: match.status
    };
  }

  /**
   * Get round name for display
   */
  private getRoundName(round: number): string {
    // Enhanced to work with different tournament sizes
    switch (round) {
      case 1: return 'First Round';
      case 2: return 'Second Round';
      case 3: return 'Semifinal';
      case 4: return 'Final';
      default: return `Round ${round}`;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.updateState({
      currentMatch: null,
      isLoading: false,
      isGameActive: false,
      error: null,
      gameContext: null
    });
  }

  /**
   * Prepare for next match after completion
   */
  async prepareNextMatch(): Promise<TournamentMatch | null> {
    if (this.state.isGameActive) {
      throw new Error('Cannot prepare next match while current match is active');
    }

    // Reset current state
    this.updateState({
      currentMatch: null,
      gameContext: null,
      error: null
    });

    // Load next match
    return await this.loadNextMatch();
  }

  /**
   * Get match result from completed match
   */
  getLastMatchResult(): {
    player1Score: number;
    player2Score: number;
    winnerAlias: string;
    duration?: number;
  } | null {
    const match = this.state.currentMatch;
    if (!match || match.status !== 'completed') {
      return null;
    }

    return {
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      winnerAlias: match.winnerAlias!,
      duration: match.startedAt && match.completedAt
        ? Math.round((match.completedAt.getTime() - match.startedAt.getTime()) / 1000)
        : undefined
    };
  }

  /**
   * Static helper to create game result from Pong game
   */
  static createGameResult(
    player1Alias: string,
    player2Alias: string,
    player1Score: number,
    player2Score: number,
    duration?: number,
    gameData?: any
  ): GameResult {
    const winnerAlias = player1Score > player2Score ? player1Alias : player2Alias;

    return {
      player1Score,
      player2Score,
      winnerAlias,
      duration,
      gameData
    };
  }
}