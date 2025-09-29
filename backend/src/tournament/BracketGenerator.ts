import crypto from 'crypto';

export interface TournamentPlayer {
  tournament_id: number;
  alias: string;
}

export interface BracketMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Alias: string;
  player2Alias: string;
  player1Score: number;
  player2Score: number;
  status: 'pending' | 'playing' | 'completed';
}

export interface TournamentBracket {
  rounds: BracketMatch[][];
  currentRound: number;
  currentMatch?: string;
}

export class BracketGenerator {
  private static readonly VALID_PLAYER_COUNTS = [4, 8, 16] as const;

  static generateBracket(players: TournamentPlayer[]): TournamentBracket {
    const playerCount = players.length;

    if (!this.VALID_PLAYER_COUNTS.includes(playerCount as any)) {
      throw new Error(`Invalid player count: ${playerCount}. Must be 4, 8, or 16 players`);
    }

    const shuffledPlayers = this.shufflePlayers(players);
    const tournamentId = shuffledPlayers[0].tournament_id.toString();

    const firstRoundMatches = this.generateFirstRound(shuffledPlayers, tournamentId);
    const totalRounds = Math.log2(playerCount);

    return {
      rounds: [firstRoundMatches, ...this.generateEmptyRounds(tournamentId, totalRounds)],
      currentRound: 1,
      currentMatch: firstRoundMatches[0]?.id,
    };
  }

  private static shufflePlayers(players: TournamentPlayer[]): TournamentPlayer[] {
    return [...players].sort(() => crypto.randomBytes(1)[0] - 128);
  }

  private static generateFirstRound(
    players: TournamentPlayer[],
    tournamentId: string
  ): BracketMatch[] {
    const matches: BracketMatch[] = [];

    for (let i = 0; i < players.length; i += 2) {
      const player1 = players[i];
      const player2 = players[i + 1];

      matches.push({
        id: `match_${tournamentId}_${Math.floor(i / 2) + 1}_1`,
        tournamentId,
        round: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1Alias: player1.alias,
        player2Alias: player2.alias,
        player1Score: 0,
        player2Score: 0,
        status: 'pending',
      });
    }

    return matches;
  }

  private static generateEmptyRounds(tournamentId: string, totalRounds: number): BracketMatch[][] {
    const rounds: BracketMatch[][] = [];

    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const roundMatches: BracketMatch[] = [];

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        roundMatches.push({
          id: `match_${tournamentId}_${matchNum}_${round}`,
          tournamentId,
          round,
          matchNumber: matchNum,
          player1Alias: 'TBD',
          player2Alias: 'TBD',
          player1Score: 0,
          player2Score: 0,
          status: 'pending',
        });
      }

      rounds.push(roundMatches);
    }

    return rounds;
  }
}
