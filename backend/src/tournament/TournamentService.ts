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

  private validateJoinTournament(
    tournament: any,
    alias: string
  ): { success: boolean; error_id?: string, message?: string } {
    if (!tournament) {
      return {
		    success: false,
        error_id: "tournament_not_found",
        message: 'Tournament not found'
      };
    }

    if (tournament.status !== 'open') {
      return {
		    success: false,
        error_id: "not_open_for_registration",
        message: 'Tournament is not open for registration'
      };
    }

    if (tournament.current_players >= tournament.max_players) {
      return {
		    success: false,
        error_id: "tournament_full",
        message: 'Tournament is full'
      };
    }

    if (!alias || alias.trim().length === 0) {
      return {
		    success: false,
        error_id: "invalid_input",
        message: 'Alias cannot be empty'
      };
    }

    if (alias.length > 50) {
      return {
		    success: false,
        error_id: "invalid_input",
        message: 'Alias too long (max 50 characters)'
      };
    }

    return { success: true };
  }

  async joinTournament(
    tournamentId: string,
    alias: string
  ): Promise<{ success: boolean; error_id?: string, message?: string }> {
    try {
      return await this.db.run('BEGIN TRANSACTION').then(async () => {
        try {
          // Lock tournament row for update to prevent race conditions
          const tournament = await this.db.get(
            `
            SELECT id, max_players, current_players, status 
            FROM tournaments 
            WHERE id = ?
          `,
            [tournamentId]
          );

          // Validate tournament and alias
          const validation = this.validateJoinTournament(tournament, alias);
          if (!validation.success) {
            await this.db.run('ROLLBACK');
            return validation;
          }

          // Check if alias already exists in this tournament
          const existingParticipant = await this.db.get(
            `
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = ? AND alias = ?
          `,
            [tournamentId, alias]
          );

          if (existingParticipant) {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "alias_already_taken",
              message: 'Alias already taken in this tournament'
            };
          }

          // Insert participant
          await this.db.run(
            `INSERT INTO tournament_participants (tournament_id, alias) VALUES (?, ?)`,
            [tournamentId, alias]
          );

          // Update tournament player count
          const updateResult = await this.db.run(
            `
            UPDATE tournaments 
            SET current_players = current_players + 1 
            WHERE id = ? AND current_players < max_players
          `,
            [tournamentId]
          );

          // Verify update was successful (affected row count)
          if (updateResult.changes === 0) {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "tournament_full_or_unknwon",
              message: 'Tournament is full or no longer exists'
            };
          }

          await this.db.run('COMMIT');
          return { success: true };
        } catch (error) {
          await this.db.run('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      console.error('Error joining tournament:', error);
      return { 
        success: false, 
        error_id: "internal_error",
        message: 'An error occurred while joining the tournament' 
      };
    }
  }

  async startTournament(
    tournamentId: string
  ): Promise<{ success: boolean; error_id?: string, bracket?: any; message?: string }> {
    try {
      return await this.db.run('BEGIN TRANSACTION').then(async () => {
        try {
          // Lock tournament row
          const tournament = await this.db.get(
            `
            SELECT id, max_players, current_players, status 
            FROM tournaments WHERE id = ?
          `,
            [tournamentId]
          );

          if (!tournament) {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "tournament_not_found",
              message: 'Tournament not found' };
          }

          if (tournament.status !== 'open') {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "tournament_not_open",
              message: 'Tournament is not in open state' };
          }

          if (tournament.current_players !== tournament.max_players) {
            await this.db.run('ROLLBACK');
            return { 
              success: false, 
              error_id: "tournament_not_full",
              message: `Tournament is not full yet (${tournament.current_players}/${tournament.max_players})` 
            };
          }

          // Get participants
          const participants = await this.getTournamentParticipants(tournament.id);
          
          if (participants.length !== tournament.max_players) {
            await this.db.run('ROLLBACK');
            return { 
              success: false, 
              error_id: "participant_count_mismatch",
              message: 'Participant count mismatch with tournament configuration' 
            };
          }

          // Generate bracket
          const bracket = BracketGenerator.generateBracket(
            participants.map(p => ({ tournament_id: p.tournament_id, alias: p.alias }))
          );

          // Update tournament status
          const updateResult = await this.db.run(
            `
            UPDATE tournaments 
            SET status = 'running', bracket_data = ?, started_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND status = 'open'
          `,
            [JSON.stringify(bracket), tournamentId]
          );

          if (updateResult.changes === 0) {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "cannot_start",
              message: 'Tournament state changed, cannot start' };
          }

          await this.db.run('COMMIT');
          return { success: true, bracket };
        } catch (error) {
          await this.db.run('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      console.error('Error starting tournament:', error);
      return { 
        success: false, 
        error_id: "internal_error",
        message: 'An error occurred while starting the tournament' 
      };
    }
  }

  async deleteTournament(tournamentId: string): Promise<{ success: boolean; error_id?: string, message?: string }> {
    try {
      return await this.db.run('BEGIN TRANSACTION').then(async () => {
        try {
          const tournament = await this.db.get(`SELECT id FROM tournaments WHERE id = ?`, [
            tournamentId,
          ]);

          if (!tournament) {
            await this.db.run('ROLLBACK');
            return {
              success: false,
              error_id: "tournament_not_found",
              message: 'Tournament not found' };
          }

          // Delete participants first (foreign key constraint)
          await this.db.run(`DELETE FROM tournament_participants WHERE tournament_id = ?`, [
            tournamentId,
          ]);

          // Delete tournament
          await this.db.run(`DELETE FROM tournaments WHERE id = ?`, [tournamentId]);

          await this.db.run('COMMIT');
          return { success: true };
        } catch (error) {
          await this.db.run('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return { 
        success: false, 
        error_id: "internal_error",
        message: 'An error occurred while deleting the tournament' 
      };
    }
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
