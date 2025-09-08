/**
 * Complete Bracket Engine for Tournament System
 * Handles single-elimination tournament logic with proper progression
 */

export interface TournamentPlayer {
  id: number;
  user_id: number;
  alias: string;
  username: string;
}

export interface BracketMatch {
  id?: number;
  round: number;
  position: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner?: TournamentPlayer;
  status: 'scheduled' | 'in_progress' | 'completed' | 'bye';
  nextMatchId?: number;
  player1_score: number;
  player2_score: number;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: BracketMatch[];
  isComplete: boolean;
}

export interface TournamentBracket {
  tournamentId: number;
  rounds: BracketRound[];
  participants: TournamentPlayer[];
  currentRound: number;
  nextMatch: BracketMatch | null;
  isComplete: boolean;
  winner?: TournamentPlayer;
  totalMatches: number;
  completedMatches: number;
}

export class BracketEngine {
  /**
   * Generate complete bracket structure for single elimination tournament
   */
  generateBracket(tournamentId: number, participants: TournamentPlayer[]): TournamentBracket {
    if (participants.length < 2) {
      throw new Error('Tournament requires at least 2 participants');
    }

    // Shuffle participants for fairness
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    
    // Calculate tournament structure
    const totalRounds = Math.ceil(Math.log2(participants.length));
    const nextPowerOf2 = Math.pow(2, totalRounds);
    
    // Generate all rounds
    const rounds = this.generateAllRounds(shuffledParticipants, totalRounds, nextPowerOf2);
    
    // Calculate total matches
    const totalMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);

    return {
      tournamentId,
      rounds,
      participants: shuffledParticipants,
      currentRound: 1,
      nextMatch: this.findNextMatch(rounds),
      isComplete: false,
      winner: undefined,
      totalMatches,
      completedMatches: 0
    };
  }

  /**
   * Generate all rounds for the tournament
   */
  private generateAllRounds(
    participants: TournamentPlayer[], 
    totalRounds: number, 
    nextPowerOf2: number
  ): BracketRound[] {
    const rounds: BracketRound[] = [];

    // Round 1 - Initial participants
    const firstRound = this.generateFirstRound(participants, nextPowerOf2);
    rounds.push(firstRound);

    // Subsequent rounds
    let playersInRound = Math.ceil(participants.length / 2);
    for (let round = 2; round <= totalRounds; round++) {
      const roundName = this.getRoundName(round, totalRounds);
      const matches: BracketMatch[] = [];

      for (let position = 0; position < Math.ceil(playersInRound / 2); position++) {
        matches.push({
          round,
          position,
          player1: null, // To be filled by winners from previous round
          player2: null,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        });
      }

      rounds.push({
        round,
        name: roundName,
        matches,
        isComplete: false
      });

      playersInRound = Math.ceil(playersInRound / 2);
    }

    // Link matches to next round
    this.linkMatchesToNextRound(rounds);

    return rounds;
  }

  /**
   * Generate first round with all participants
   */
  private generateFirstRound(participants: TournamentPlayer[], nextPowerOf2: number): BracketRound {
    const matches: BracketMatch[] = [];
    const participantsCopy = [...participants];

    // Add byes if needed to reach power of 2
    const byesNeeded = nextPowerOf2 - participants.length;
    
    let position = 0;
    while (participantsCopy.length > 1) {
      const player1 = participantsCopy.shift()!;
      const player2 = participantsCopy.shift();

      if (player2) {
        // Regular match
        matches.push({
          round: 1,
          position,
          player1,
          player2,
          status: 'scheduled',
          player1_score: 0,
          player2_score: 0
        });
      } else {
        // Bye - player1 automatically advances
        matches.push({
          round: 1,
          position,
          player1,
          player2: null,
          winner: player1,
          status: 'bye',
          player1_score: 0,
          player2_score: 0
        });
      }
      position++;
    }

    // Handle single remaining player (bye)
    if (participantsCopy.length === 1) {
      matches.push({
        round: 1,
        position,
        player1: participantsCopy[0],
        player2: null,
        winner: participantsCopy[0],
        status: 'bye',
        player1_score: 0,
        player2_score: 0
      });
    }

    return {
      round: 1,
      name: 'First Round',
      matches,
      isComplete: false
    };
  }

  /**
   * Link matches to their next round counterparts
   */
  private linkMatchesToNextRound(rounds: BracketRound[]): void {
    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      const currentRound = rounds[roundIndex];
      const nextRound = rounds[roundIndex + 1];

      currentRound.matches.forEach((match, matchIndex) => {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        if (nextRound.matches[nextMatchIndex]) {
          match.nextMatchId = nextMatchIndex;
        }
      });
    }
  }

  /**
   * Update match result and advance winner to next round
   */
  advanceWinner(
    bracket: TournamentBracket, 
    matchId: number, 
    winnerId: number, 
    player1Score: number, 
    player2Score: number
  ): { updatedBracket: TournamentBracket; nextMatch: BracketMatch | null } {
    // Find the match
    let targetMatch: BracketMatch | null = null;
    let targetRound: BracketRound | null = null;

    for (const round of bracket.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) {
        targetMatch = match;
        targetRound = round;
        break;
      }
    }

    if (!targetMatch || !targetRound) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Validate winner
    const winner = targetMatch.player1?.user_id === winnerId 
      ? targetMatch.player1 
      : targetMatch.player2?.user_id === winnerId 
        ? targetMatch.player2 
        : null;

    if (!winner) {
      throw new Error('Invalid winner ID');
    }

    // Update match
    targetMatch.winner = winner;
    targetMatch.status = 'completed';
    targetMatch.player1_score = player1Score;
    targetMatch.player2_score = player2Score;

    // Update completed matches count
    bracket.completedMatches++;

    // Check if round is complete
    targetRound.isComplete = targetRound.matches.every(m => m.status === 'completed' || m.status === 'bye');

    // Advance winner to next round
    let nextMatch: BracketMatch | null = null;
    if (targetMatch.nextMatchId !== undefined) {
      const nextRoundIndex = targetRound.round; // Next round is current round + 1
      if (nextRoundIndex < bracket.rounds.length) {
        const nextRound = bracket.rounds[nextRoundIndex];
        nextMatch = nextRound.matches[targetMatch.nextMatchId];

        if (nextMatch) {
          // Place winner in appropriate slot
          if (!nextMatch.player1) {
            nextMatch.player1 = winner;
          } else if (!nextMatch.player2) {
            nextMatch.player2 = winner;
          }
        }
      }
    }

    // Update current round if completed
    if (targetRound.isComplete) {
      bracket.currentRound = Math.min(bracket.currentRound + 1, bracket.rounds.length);
    }

    // Check tournament completion
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound.isComplete) {
      bracket.isComplete = true;
      bracket.winner = finalRound.matches[0]?.winner;
    }

    // Update next match
    bracket.nextMatch = this.findNextMatch(bracket.rounds);

    return {
      updatedBracket: bracket,
      nextMatch
    };
  }

  /**
   * Find the next scheduled match
   */
  findNextMatch(rounds: BracketRound[]): BracketMatch | null {
    for (const round of rounds) {
      for (const match of round.matches) {
        if (match.status === 'scheduled' && match.player1 && match.player2) {
          return match;
        }
      }
    }
    return null;
  }

  /**
   * Get human-readable round name
   */
  private getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round;
    
    switch (roundsFromEnd) {
      case 0: return 'Final';
      case 1: return 'Semi-Final';
      case 2: return 'Quarter-Final';
      case 3: return 'Round of 16';
      case 4: return 'Round of 32';
      default: return `Round ${round}`;
    }
  }

  /**
   * Get tournament statistics
   */
  getTournamentStats(bracket: TournamentBracket): {
    totalParticipants: number;
    totalMatches: number;
    completedMatches: number;
    remainingMatches: number;
    currentRound: number;
    totalRounds: number;
    progressPercentage: number;
  } {
    return {
      totalParticipants: bracket.participants.length,
      totalMatches: bracket.totalMatches,
      completedMatches: bracket.completedMatches,
      remainingMatches: bracket.totalMatches - bracket.completedMatches,
      currentRound: bracket.currentRound,
      totalRounds: bracket.rounds.length,
      progressPercentage: Math.round((bracket.completedMatches / bracket.totalMatches) * 100)
    };
  }

  /**
   * Validate bracket integrity
   */
  validateBracket(bracket: TournamentBracket): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check participants count
    if (bracket.participants.length < 2) {
      errors.push('Tournament must have at least 2 participants');
    }

    // Check rounds structure
    if (bracket.rounds.length === 0) {
      errors.push('Tournament must have at least one round');
    }

    // Validate each round
    bracket.rounds.forEach((round, index) => {
      if (round.round !== index + 1) {
        errors.push(`Round ${index + 1} has incorrect round number: ${round.round}`);
      }

      // Check matches
      round.matches.forEach((match, matchIndex) => {
        if (match.round !== round.round) {
          errors.push(`Match ${matchIndex} in round ${round.round} has incorrect round number`);
        }

        if (match.status === 'completed' && !match.winner) {
          errors.push(`Completed match in round ${round.round} has no winner`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}