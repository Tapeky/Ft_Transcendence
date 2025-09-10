import { Tournament, TournamentMatch, TournamentBracket, TournamentPlayer } from '../types/tournament';

export interface BracketPosition {
  round: number;
  matchNumber: number;
  position: 'player1' | 'player2';
}

export interface MatchAdvancement {
  winnerPosition: BracketPosition;
  nextMatch?: BracketPosition;
  isChampionshipMatch: boolean;
}

export class BracketEngine {
  /**
   * Generate single-elimination bracket for given players
   */
  static generateBracket(players: TournamentPlayer[]): TournamentBracket {
    const playerCount = players.length;
    
    // Validate player count is power of 2
    if (!this.isPowerOfTwo(playerCount) || playerCount < 4 || playerCount > 16) {
      throw new Error('Tournament must have 4, 8, or 16 players');
    }

    // Shuffle players for random bracket seeding
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    const firstRoundMatches = this.generateFirstRound(shuffledPlayers);
    
    // Generate subsequent rounds structure (empty until matches are completed)
    const totalRounds = Math.log2(playerCount);
    const rounds: TournamentMatch[][] = [firstRoundMatches];
    
    // Create placeholder rounds for visualization
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundMatches: TournamentMatch[] = [];
      
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        roundMatches.push(this.createPlaceholderMatch('', round, matchNum));
      }
      
      rounds.push(roundMatches);
    }

    return {
      rounds,
      currentRound: 1,
      currentMatch: firstRoundMatches[0]?.id
    };
  }

  /**
   * Generate first round matches from shuffled players
   */
  private static generateFirstRound(shuffledPlayers: TournamentPlayer[]): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      const player1 = shuffledPlayers[i];
      const player2 = shuffledPlayers[i + 1];
      
      matches.push(this.createMatch(
        player1.alias,
        player2.alias,
        1,
        Math.floor(i / 2) + 1
      ));
    }
    
    return matches;
  }

  /**
   * Create a new match object
   */
  private static createMatch(
    player1Alias: string,
    player2Alias: string,
    round: number,
    matchNumber: number
  ): TournamentMatch {
    return {
      id: this.generateMatchId(),
      tournamentId: '', // Will be set by tournament service
      round,
      matchNumber,
      player1Alias,
      player2Alias,
      player1Score: 0,
      player2Score: 0,
      status: 'pending'
    };
  }

  /**
   * Create placeholder match for future rounds
   */
  private static createPlaceholderMatch(
    tournamentId: string,
    round: number,
    matchNumber: number
  ): TournamentMatch {
    return {
      id: this.generateMatchId(),
      tournamentId,
      round,
      matchNumber,
      player1Alias: 'TBD',
      player2Alias: 'TBD',
      player1Score: 0,
      player2Score: 0,
      status: 'pending'
    };
  }

  /**
   * Advance winner to next round after match completion
   */
  static advanceWinner(
    bracket: TournamentBracket,
    completedMatchId: string,
    winnerAlias: string
  ): TournamentBracket {
    const newBracket = this.deepCloneBracket(bracket);
    
    // Find the completed match
    let completedMatch: TournamentMatch | null = null;
    let matchRound = 0;
    let matchNumber = 0;
    
    for (let roundIndex = 0; roundIndex < newBracket.rounds.length; roundIndex++) {
      const round = newBracket.rounds[roundIndex];
      for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
        if (round[matchIndex].id === completedMatchId) {
          completedMatch = round[matchIndex];
          matchRound = roundIndex + 1;
          matchNumber = matchIndex + 1;
          break;
        }
      }
      if (completedMatch) break;
    }

    if (!completedMatch) {
      throw new Error('Match not found in bracket');
    }

    // Check if this is the final match
    const totalRounds = newBracket.rounds.length;
    if (matchRound === totalRounds) {
      // Tournament complete
      newBracket.currentRound = totalRounds;
      return newBracket;
    }

    // Calculate next match position
    const nextRound = matchRound + 1;
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const nextMatchIndex = nextMatchNumber - 1;
    
    if (nextMatchIndex >= newBracket.rounds[nextRound - 1].length) {
      throw new Error('Invalid next match position');
    }

    // Advance winner to next round
    const nextMatch = newBracket.rounds[nextRound - 1][nextMatchIndex];
    
    // Determine which position in next match (player1 or player2)
    const positionInNextMatch = (matchNumber % 2 === 1) ? 'player1Alias' : 'player2Alias';
    (nextMatch as any)[positionInNextMatch] = winnerAlias;

    // Update current round and match if needed
    this.updateCurrentMatchPointer(newBracket);
    
    return newBracket;
  }

  /**
   * Find the next match to be played
   */
  static findNextMatch(bracket: TournamentBracket): TournamentMatch | null {
    // Look for in-progress match first
    for (const round of bracket.rounds) {
      for (const match of round) {
        if (match.status === 'in_progress') {
          return match;
        }
      }
    }

    // Look for next pending match
    for (const round of bracket.rounds) {
      for (const match of round) {
        if (match.status === 'pending' && 
            match.player1Alias !== 'TBD' && 
            match.player2Alias !== 'TBD') {
          return match;
        }
      }
    }

    return null;
  }

  /**
   * Get tournament progress statistics
   */
  static getBracketStatistics(bracket: TournamentBracket): {
    totalMatches: number;
    completedMatches: number;
    pendingMatches: number;
    inProgressMatches: number;
    progressPercentage: number;
  } {
    let totalMatches = 0;
    let completedMatches = 0;
    let pendingMatches = 0;
    let inProgressMatches = 0;

    for (const round of bracket.rounds) {
      for (const match of round) {
        totalMatches++;
        
        switch (match.status) {
          case 'completed':
            completedMatches++;
            break;
          case 'pending':
            if (match.player1Alias !== 'TBD' && match.player2Alias !== 'TBD') {
              pendingMatches++;
            }
            break;
          case 'in_progress':
            inProgressMatches++;
            break;
        }
      }
    }

    const progressPercentage = totalMatches > 0 
      ? Math.round((completedMatches / totalMatches) * 100) 
      : 0;

    return {
      totalMatches,
      completedMatches,
      pendingMatches,
      inProgressMatches,
      progressPercentage
    };
  }

  /**
   * Get matches for a specific round
   */
  static getMatchesForRound(bracket: TournamentBracket, round: number): TournamentMatch[] {
    if (round < 1 || round > bracket.rounds.length) {
      return [];
    }
    
    return [...bracket.rounds[round - 1]];
  }

  /**
   * Check if bracket is complete (tournament finished)
   */
  static isBracketComplete(bracket: TournamentBracket): boolean {
    if (bracket.rounds.length === 0) return false;
    
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound.length !== 1) return false;
    
    const finalMatch = finalRound[0];
    return finalMatch.status === 'completed' && !!finalMatch.winnerAlias;
  }

  /**
   * Get tournament champion
   */
  static getChampion(bracket: TournamentBracket): string | null {
    if (!this.isBracketComplete(bracket)) return null;
    
    const finalMatch = bracket.rounds[bracket.rounds.length - 1][0];
    return finalMatch.winnerAlias || null;
  }

  /**
   * Validate bracket structure
   */
  static validateBracket(bracket: TournamentBracket): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!bracket.rounds || bracket.rounds.length === 0) {
      errors.push('Bracket must have at least one round');
      return { isValid: false, errors };
    }

    // Validate each round has correct number of matches
    const totalRounds = bracket.rounds.length;
    for (let i = 0; i < totalRounds; i++) {
      const round = bracket.rounds[i];
      const expectedMatches = Math.pow(2, totalRounds - i - 1);
      
      if (round.length !== expectedMatches) {
        errors.push(`Round ${i + 1} should have ${expectedMatches} matches, but has ${round.length}`);
      }

      // Validate match numbers
      for (let j = 0; j < round.length; j++) {
        const match = round[j];
        if (match.round !== i + 1) {
          errors.push(`Match ${match.id} has incorrect round number`);
        }
        if (match.matchNumber !== j + 1) {
          errors.push(`Match ${match.id} has incorrect match number`);
        }
      }
    }

    // Validate final round has exactly one match
    if (bracket.rounds[totalRounds - 1].length !== 1) {
      errors.push('Final round must have exactly one match');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Update current match pointer in bracket
   */
  private static updateCurrentMatchPointer(bracket: TournamentBracket): void {
    const nextMatch = this.findNextMatch(bracket);
    
    if (nextMatch) {
      bracket.currentMatch = nextMatch.id;
      bracket.currentRound = nextMatch.round;
    } else {
      // No more matches - tournament might be complete
      if (this.isBracketComplete(bracket)) {
        bracket.currentRound = bracket.rounds.length;
        bracket.currentMatch = undefined;
      }
    }
  }

  /**
   * Deep clone bracket for immutable updates
   */
  private static deepCloneBracket(bracket: TournamentBracket): TournamentBracket {
    return {
      rounds: bracket.rounds.map(round => 
        round.map(match => ({ ...match }))
      ),
      currentRound: bracket.currentRound,
      currentMatch: bracket.currentMatch
    };
  }

  /**
   * Check if number is power of 2
   */
  private static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Generate unique match ID
   */
  private static generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get bracket visualization data for UI rendering
   */
  static getBracketVisualization(bracket: TournamentBracket): {
    rounds: Array<{
      roundNumber: number;
      roundName: string;
      matches: Array<{
        id: string;
        player1: { alias: string; score: number };
        player2: { alias: string; score: number };
        winner?: string;
        status: 'pending' | 'in_progress' | 'completed';
        isNext: boolean;
      }>;
    }>;
  } {
    const totalRounds = bracket.rounds.length;
    const roundNames = this.generateRoundNames(totalRounds);
    
    return {
      rounds: bracket.rounds.map((round, index) => ({
        roundNumber: index + 1,
        roundName: roundNames[index],
        matches: round.map(match => ({
          id: match.id,
          player1: {
            alias: match.player1Alias,
            score: match.player1Score
          },
          player2: {
            alias: match.player2Alias,
            score: match.player2Score
          },
          winner: match.winnerAlias,
          status: match.status,
          isNext: match.id === bracket.currentMatch
        }))
      }))
    };
  }

  /**
   * Generate round names based on tournament size
   */
  private static generateRoundNames(totalRounds: number): string[] {
    const names: string[] = [];
    
    for (let i = 1; i <= totalRounds; i++) {
      const matchesInRound = Math.pow(2, totalRounds - i);
      
      if (i === totalRounds) {
        names.push('Final');
      } else if (i === totalRounds - 1) {
        names.push('Semifinal');
      } else if (i === totalRounds - 2) {
        names.push('Quarterfinal');
      } else {
        names.push(`Round ${i}`);
      }
    }
    
    return names;
  }
}