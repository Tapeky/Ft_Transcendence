import { Database } from 'sqlite';

interface TournamentBracket {
  rounds: any[][];
  currentRound: number;
  currentMatch: string;
}

interface Match {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Alias: string;
  player2Alias: string;
  player1Score: number;
  player2Score: number;
  status: string;
}

export class LocalTournamentService {
  constructor(private db: Database) {}

  generateTournamentBracket(players: any[]): TournamentBracket {
    const playerCount = players.length;
    console.log(
      `🏆 Generating bracket for ${playerCount} players:`,
      players.map(p => p.alias)
    );

    if (![4, 8, 16].includes(playerCount)) {
      throw new Error(
        `Invalid player count for bracket generation: ${playerCount} players (need 4, 8, or 16)`
      );
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const firstRoundMatches = this.generateFirstRoundMatches(shuffledPlayers);
    const totalRounds = Math.log2(playerCount);
    const rounds = [firstRoundMatches];

    for (let round = 2; round <= totalRounds; round++) {
      rounds.push(this.generateRoundMatches(round, totalRounds, shuffledPlayers[0].tournament_id.toString()));
    }

    return {
      rounds: rounds,
      currentRound: 1,
      currentMatch: firstRoundMatches[0]?.id,
    };
  }

  private generateFirstRoundMatches(shuffledPlayers: any[]): Match[] {
    const firstRoundMatches: Match[] = [];
    const tournamentId = shuffledPlayers[0].tournament_id.toString();

    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      const player1 = shuffledPlayers[i];
      const player2 = shuffledPlayers[i + 1];

      firstRoundMatches.push({
        id: `match_${tournamentId}_${Math.floor(i / 2) + 1}_1`,
        tournamentId: tournamentId,
        round: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1Alias: player1.alias,
        player2Alias: player2.alias,
        player1Score: 0,
        player2Score: 0,
        status: 'pending',
      });
    }

    return firstRoundMatches;
  }

  private generateRoundMatches(round: number, totalRounds: number, tournamentId: string): Match[] {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundMatches: Match[] = [];

    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      roundMatches.push({
        id: `match_${tournamentId}_${matchNum}_${round}`,
        tournamentId: tournamentId,
        round: round,
        matchNumber: matchNum,
        player1Alias: 'TBD',
        player2Alias: 'TBD',
        player1Score: 0,
        player2Score: 0,
        status: 'pending',
      });
    }

    return roundMatches;
  }

  async advanceWinnerToNextRound(
    tournamentId: number,
    currentRound: number,
    currentMatchNumber: number,
    winnerAlias: string
  ): Promise<{ nextMatch: any | null; allMatchesComplete: boolean }> {
    const nextRound = currentRound + 1;
    const nextMatchNumber = Math.ceil(currentMatchNumber / 2);

    const nextMatch = await this.db.get(
      `SELECT * FROM tournament_matches
       WHERE tournament_id = ? AND round = ? AND match_number = ?`,
      [tournamentId, nextRound, nextMatchNumber]
    );

    if (!nextMatch) {
      return { nextMatch: null, allMatchesComplete: true };
    }

    const isEvenMatch = currentMatchNumber % 2 === 0;
    const playerColumn = isEvenMatch ? 'player2_alias' : 'player1_alias';

    await this.db.run(
      `UPDATE tournament_matches
       SET ${playerColumn} = ?
       WHERE tournament_id = ? AND round = ? AND match_number = ?`,
      [winnerAlias, tournamentId, nextRound, nextMatchNumber]
    );

    const updatedNextMatch = await this.db.get(
      `SELECT * FROM tournament_matches
       WHERE tournament_id = ? AND round = ? AND match_number = ?`,
      [tournamentId, nextRound, nextMatchNumber]
    );

    return { nextMatch: updatedNextMatch, allMatchesComplete: false };
  }

  async checkRoundCompletion(tournamentId: number, round: number): Promise<boolean> {
    const incompleteMatches = await this.db.get(
      `SELECT COUNT(*) as count FROM tournament_matches
       WHERE tournament_id = ? AND round = ? AND status != 'completed'`,
      [tournamentId, round]
    );

    return incompleteMatches.count === 0;
  }

  async getNextMatchInRound(tournamentId: number, round: number): Promise<any | null> {
    return await this.db.get(
      `SELECT * FROM tournament_matches
       WHERE tournament_id = ? AND round = ? AND status = 'pending'
       ORDER BY match_number ASC LIMIT 1`,
      [tournamentId, round]
    );
  }

  async updateTournamentCurrentMatch(tournamentId: number, matchId: string | null): Promise<void> {
    await this.db.run(
      `UPDATE tournaments SET current_match = ? WHERE id = ?`,
      [matchId, tournamentId]
    );
  }

  async completeTournament(tournamentId: number, winnerId: number): Promise<void> {
    await this.db.run(
      `UPDATE tournaments
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = ?
       WHERE id = ?`,
      [winnerId, tournamentId]
    );
  }
}