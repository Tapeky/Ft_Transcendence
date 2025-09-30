import { Database } from 'sqlite';
import { BracketGenerator } from './BracketGenerator';
import { TournamentCreateRequest, TournamentDetails, TournamentParticipant } from './types';

export class TournamentService {
  constructor(private db: Database) {}

  async createTournament(
    data: TournamentCreateRequest
  ): Promise<{ id: string; name: string; maxPlayers: number }> {
    const result = await this.db.run(
      `INSERT INTO tournaments (name, max_players, current_players, status, created_by) VALUES (?, ?, 0, 'open', 1)`,
      [data.name, data.maxPlayers]
    );

    return {
      id: result.lastID!.toString(),
      name: data.name,
      maxPlayers: data.maxPlayers,
    };
  }

  async getTournaments(): Promise<TournamentDetails[]> {
    const tournaments = await this.db.all(`
      SELECT id, name, max_players, current_players, status, created_at
      FROM tournaments 
      ORDER BY created_at DESC
    `);

    const tournamentDetails = await Promise.all(
      tournaments.map(async tournament => {
        const participants = await this.getTournamentParticipants(tournament.id);

        return {
          id: tournament.id.toString(),
          name: tournament.name,
          maxPlayers: tournament.max_players,
          currentPlayers: tournament.current_players,
          status: tournament.status,
          participants,
          createdAt: tournament.created_at,
        };
      })
    );

    return tournamentDetails;
  }

  async getTournament(id: string): Promise<TournamentDetails | null> {
    const tournament = await this.db.get(
      `
      SELECT id, name, max_players, current_players, status, created_at, bracket_data
      FROM tournaments 
      WHERE id = ?
    `,
      [id]
    );

    if (!tournament) return null;

    const participants = await this.getTournamentParticipants(tournament.id);

    return {
      id: tournament.id.toString(),
      name: tournament.name,
      maxPlayers: tournament.max_players,
      currentPlayers: tournament.current_players,
      status: tournament.status,
      participants,
      bracket: tournament.bracket_data ? JSON.parse(tournament.bracket_data) : null,
      createdAt: tournament.created_at,
    };
  }

  async joinTournament(
    tournamentId: string,
    alias: string
  ): Promise<{ success: boolean; message?: string }> {
    const tournament = await this.db.get(
      `
      SELECT id, max_players, current_players, status 
      FROM tournaments WHERE id = ?
    `,
      [tournamentId]
    );

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'open') {
      return { success: false, message: 'Tournament is not open for registration' };
    }

    if (tournament.current_players >= tournament.max_players) {
      return { success: false, message: 'Tournament is full' };
    }

    const existingParticipant = await this.db.get(
      `
      SELECT id FROM tournament_participants 
      WHERE tournament_id = ? AND alias = ?
    `,
      [tournamentId, alias]
    );

    if (existingParticipant) {
      return { success: false, message: 'Alias already taken in this tournament' };
    }

    await this.db.run(`INSERT INTO tournament_participants (tournament_id, alias) VALUES (?, ?)`, [
      tournamentId,
      alias,
    ]);

    await this.db.run(
      `
      UPDATE tournaments 
      SET current_players = current_players + 1 
      WHERE id = ?
    `,
      [tournamentId]
    );

    return { success: true };
  }

  async startTournament(
    tournamentId: string
  ): Promise<{ success: boolean; bracket?: any; message?: string }> {
    const tournament = await this.db.get(
      `
      SELECT id, max_players, current_players, status 
      FROM tournaments WHERE id = ?
    `,
      [tournamentId]
    );

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'open') {
      return { success: false, message: 'Tournament is not in open state' };
    }

    if (tournament.current_players !== tournament.max_players) {
      return { success: false, message: 'Tournament is not full yet' };
    }

    const participants = await this.getTournamentParticipants(tournament.id);
    const bracket = BracketGenerator.generateBracket(
      participants.map(p => ({ tournament_id: p.tournament_id, alias: p.alias }))
    );

    await this.db.run(
      `
      UPDATE tournaments 
      SET status = 'running', bracket_data = ?, started_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `,
      [JSON.stringify(bracket), tournamentId]
    );

    return { success: true, bracket };
  }

  async deleteTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
    const tournament = await this.db.get(`SELECT id FROM tournaments WHERE id = ?`, [tournamentId]);

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    await this.db.run(`DELETE FROM tournament_participants WHERE tournament_id = ?`, [
      tournamentId,
    ]);
    await this.db.run(`DELETE FROM tournaments WHERE id = ?`, [tournamentId]);

    return { success: true };
  }

  private async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    return await this.db.all(
      `
      SELECT id, tournament_id, alias, created_at as joined_at
      FROM tournament_participants 
      WHERE tournament_id = ? 
      ORDER BY created_at ASC
    `,
      [tournamentId]
    );
  }
}
