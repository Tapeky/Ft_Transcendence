import {
  Tournament,
  TournamentMatch,
  TournamentBracket,
  TournamentPlayer,
} from '../types/tournament';

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
  static generateBracket(players: TournamentPlayer[]): TournamentBracket {
    const playerCount = players.length;
    if (!this.isPowerOfTwo(playerCount) || playerCount < 4 || playerCount > 16) {
      throw new Error('Tournament must have 4, 8, or 16 players');
    }
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const firstRoundMatches = this.generateFirstRound(shuffledPlayers);
    const totalRounds = Math.log2(playerCount);
    const rounds: TournamentMatch[][] = [firstRoundMatches];
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      rounds.push(
        Array.from({ length: matchesInRound }, (_, i) =>
          this.createPlaceholderMatch('', round, i + 1)
        )
      );
    }
    return { rounds, currentRound: 1, currentMatch: firstRoundMatches[0]?.id };
  }

  private static generateFirstRound(shuffledPlayers: TournamentPlayer[]): TournamentMatch[] {
    return shuffledPlayers.reduce((matches, player, i) => {
      if (i % 2 === 0) {
        matches.push(
          this.createMatch(player.alias, shuffledPlayers[i + 1].alias, 1, Math.floor(i / 2) + 1)
        );
      }
      return matches;
    }, [] as TournamentMatch[]);
  }

  private static createMatch(
    player1Alias: string,
    player2Alias: string,
    round: number,
    matchNumber: number
  ): TournamentMatch {
    return {
      id: this.generateMatchId(),
      tournamentId: '',
      round,
      matchNumber,
      player1Alias,
      player2Alias,
      player1Score: 0,
      player2Score: 0,
      status: 'pending',
    };
  }

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
      status: 'pending',
    };
  }

  static advanceWinner(
    bracket: TournamentBracket,
    completedMatchId: string,
    winnerAlias: string
  ): TournamentBracket {
    const newBracket = this.deepCloneBracket(bracket);
    const completedMatch = newBracket.rounds.flat().find(m => m.id === completedMatchId);
    if (!completedMatch) throw new Error('Match not found in bracket');
    const matchRound = completedMatch.round;
    const matchNumber = completedMatch.matchNumber;
    const totalRounds = newBracket.rounds.length;
    if (matchRound === totalRounds) {
      newBracket.currentRound = totalRounds;
      return newBracket;
    }
    const nextRound = matchRound + 1;
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const nextMatch = newBracket.rounds[nextRound - 1][nextMatchNumber - 1];
    if (!nextMatch) throw new Error('Invalid next match position');
    const position = matchNumber % 2 === 1 ? 'player1Alias' : 'player2Alias';
    (nextMatch as any)[position] = winnerAlias;
    this.updateCurrentMatchPointer(newBracket);
    return newBracket;
  }

  static findNextMatch(bracket: TournamentBracket): TournamentMatch | null {
    return (
      bracket.rounds.flat().find(m => m.status === 'in_progress') ||
      bracket.rounds
        .flat()
        .find(
          m => m.status === 'pending' && m.player1Alias !== 'TBD' && m.player2Alias !== 'TBD'
        ) ||
      null
    );
  }

  static getBracketStatistics(bracket: TournamentBracket): {
    totalMatches: number;
    completedMatches: number;
    pendingMatches: number;
    inProgressMatches: number;
    progressPercentage: number;
  } {
    let total = 0,
      completed = 0,
      pending = 0,
      inProgress = 0;
    bracket.rounds.flat().forEach(m => {
      total++;
      if (m.status === 'completed') completed++;
      else if (m.status === 'pending' && m.player1Alias !== 'TBD' && m.player2Alias !== 'TBD')
        pending++;
      else if (m.status === 'in_progress') inProgress++;
    });
    return {
      totalMatches: total,
      completedMatches: completed,
      pendingMatches: pending,
      inProgressMatches: inProgress,
      progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  static getMatchesForRound(bracket: TournamentBracket, round: number): TournamentMatch[] {
    return round >= 1 && round <= bracket.rounds.length ? [...bracket.rounds[round - 1]] : [];
  }

  static isBracketComplete(bracket: TournamentBracket): boolean {
    const finalMatch = bracket.rounds[bracket.rounds.length - 1]?.[0];
    return finalMatch?.status === 'completed' && !!finalMatch.winnerAlias;
  }

  static getChampion(bracket: TournamentBracket): string | null {
    return this.isBracketComplete(bracket)
      ? bracket.rounds[bracket.rounds.length - 1][0].winnerAlias || null
      : null;
  }

  static validateBracket(bracket: TournamentBracket): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!bracket.rounds?.length) {
      errors.push('Bracket must have at least one round');
      return { isValid: false, errors };
    }
    const totalRounds = bracket.rounds.length;
    bracket.rounds.forEach((round, i) => {
      const expected = Math.pow(2, totalRounds - i - 1);
      if (round.length !== expected)
        errors.push(`Round ${i + 1} should have ${expected} matches, but has ${round.length}`);
      round.forEach((match, j) => {
        if (match.round !== i + 1) errors.push(`Match ${match.id} has incorrect round number`);
        if (match.matchNumber !== j + 1)
          errors.push(`Match ${match.id} has incorrect match number`);
      });
    });
    if (bracket.rounds[totalRounds - 1].length !== 1)
      errors.push('Final round must have exactly one match');
    return { isValid: !errors.length, errors };
  }

  private static updateCurrentMatchPointer(bracket: TournamentBracket): void {
    const nextMatch = this.findNextMatch(bracket);
    if (nextMatch) {
      bracket.currentMatch = nextMatch.id;
      bracket.currentRound = nextMatch.round;
    } else if (this.isBracketComplete(bracket)) {
      bracket.currentRound = bracket.rounds.length;
      bracket.currentMatch = undefined;
    }
  }

  private static deepCloneBracket(bracket: TournamentBracket): TournamentBracket {
    return {
      rounds: bracket.rounds.map(r => r.map(m => ({ ...m }))),
      currentRound: bracket.currentRound,
      currentMatch: bracket.currentMatch,
    };
  }

  private static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  private static generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

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
      rounds: bracket.rounds.map((round, i) => ({
        roundNumber: i + 1,
        roundName: roundNames[i],
        matches: round.map(m => ({
          id: m.id,
          player1: { alias: m.player1Alias, score: m.player1Score },
          player2: { alias: m.player2Alias, score: m.player2Score },
          winner: m.winnerAlias,
          status: m.status,
          isNext: m.id === bracket.currentMatch,
        })),
      })),
    };
  }

  private static generateRoundNames(totalRounds: number): string[] {
    return Array.from({ length: totalRounds }, (_, i) => {
      const roundNum = i + 1;
      if (roundNum === totalRounds) return 'Final';
      if (roundNum === totalRounds - 1) return 'Semifinal';
      if (roundNum === totalRounds - 2) return 'Quarterfinal';
      return `Round ${roundNum}`;
    });
  }
}
