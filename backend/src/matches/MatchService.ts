import { DatabaseManager } from '../database/DatabaseManager';
import { RecordMatchBody, MatchStatsRequest, MatchRecord } from './types';

export class MatchService {
  private db = DatabaseManager.getInstance();

  async recordMatch(matchData: RecordMatchBody): Promise<{ matchId: number; match: MatchRecord }> {
    const {
      player1_id,
      player2_id,
      player1_guest_name,
      player2_guest_name,
      player1_score,
      player2_score,
      winner_id,
      game_type = 'pong',
      max_score = 3,
      tournament_id,
      duration_seconds,
      player1_touched_ball = 0,
      player1_missed_ball = 0,
      player1_touched_ball_in_row = 0,
      player1_missed_ball_in_row = 0,
      player2_touched_ball = 0,
      player2_missed_ball = 0,
      player2_touched_ball_in_row = 0,
      player2_missed_ball_in_row = 0,
    } = matchData;

    const validationError = await this.validateMatchData({
      player1_id,
      player2_id,
      player1_guest_name,
      player2_guest_name,
      player1_score,
      player2_score,
      winner_id,
      tournament_id,
    });

    if (validationError) {
      throw new Error(validationError);
    }

    const finalP1Id = player1_id || null;
    const finalP2Id = player2_id || null;
    const finalP1GuestName = finalP1Id ? null : player1_guest_name;
    const finalP2GuestName = finalP2Id ? null : player2_guest_name;

    const result = await this.db.execute(
      `
      INSERT INTO matches (
        player1_id, player2_id, player1_guest_name, player2_guest_name,
        player1_score, player2_score, winner_id, game_type, max_score,
        tournament_id, duration_seconds, status,
        player1_touched_ball, player1_missed_ball, 
        player1_touched_ball_in_row, player1_missed_ball_in_row,
        player2_touched_ball, player2_missed_ball,
        player2_touched_ball_in_row, player2_missed_ball_in_row,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [
        finalP1Id,
        finalP2Id,
        finalP1GuestName,
        finalP2GuestName,
        player1_score,
        player2_score,
        winner_id,
        game_type,
        max_score,
        tournament_id,
        duration_seconds,
        player1_touched_ball,
        player1_missed_ball,
        player1_touched_ball_in_row,
        player1_missed_ball_in_row,
        player2_touched_ball,
        player2_missed_ball,
        player2_touched_ball_in_row,
        player2_missed_ball_in_row,
      ]
    );

    const matchId = result.lastID!;

    if (tournament_id && winner_id) {
      await this.advanceTournamentBracket(tournament_id, matchId, winner_id);
    }

    const match = await this.getMatchById(matchId);
    if (!match) {
      throw new Error('Failed to retrieve created match');
    }

    return { matchId, match };
  }

  async getMatches(
    params: MatchStatsRequest & {
      player_id?: number;
      tournament_id?: number;
      game_type?: string;
      include_guests?: boolean;
      include_stats?: boolean;
    }
  ): Promise<MatchRecord[]> {
    const {
      player_id,
      tournament_id,
      game_type,
      limit = 50,
      offset = 0,
      include_guests = false,
      include_stats = false,
    } = params;

    let baseQuery = `
      SELECT m.*, t.name as tournament_name,
             u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
             u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
    `;

    if (include_stats) {
      baseQuery += `, m.player1_touched_ball, m.player1_missed_ball, 
                      m.player2_touched_ball, m.player2_missed_ball`;
    }

    baseQuery += `
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id
      LEFT JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
    `;

    const conditions = [];
    const queryParams = [];

    if (player_id) {
      conditions.push('(m.player1_id = ? OR m.player2_id = ?)');
      queryParams.push(player_id, player_id);
    }

    if (!include_guests) {
      conditions.push('m.player1_guest_name IS NULL AND m.player2_guest_name IS NULL');
    }

    if (tournament_id) {
      conditions.push('m.tournament_id = ?');
      queryParams.push(tournament_id);
    }

    if (game_type) {
      conditions.push('m.game_type = ?');
      queryParams.push(game_type);
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    baseQuery += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return await this.db.query<MatchRecord>(baseQuery, queryParams);
  }

  async createDirectMatch(
    player1_id: number,
    player2_id: number,
    options: {
      game_type?: string;
      max_score?: number;
    } = {}
  ): Promise<MatchRecord> {
    const { game_type = 'pong', max_score = 3 } = options;

    if (player1_id === player2_id) {
      throw new Error('Cannot create match against yourself');
    }

    const opponent = await this.db.query<{ id: number; username: string }>(
      `SELECT id, username FROM users WHERE id = ?`,
      [player2_id]
    );

    if (!opponent.length) {
      throw new Error('Opponent not found');
    }

    const result = await this.db.query(
      `
      INSERT INTO matches (player1_id, player2_id, game_type, max_score, status)
      VALUES (?, ?, ?, ?, 'scheduled')
    `,
      [player1_id, player2_id, game_type, max_score]
    );

    const matchId = (result as any).lastInsertRowid;
    const match = await this.getMatchById(matchId);

    if (!match) {
      throw new Error('Failed to retrieve created match');
    }

    return match;
  }

  async getLiveMatches(): Promise<MatchRecord[]> {
    return await this.db.query<MatchRecord>(`
      SELECT m.*, t.name as tournament_name,
             u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
             u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id
      LEFT JOIN users u2 ON m.player2_id = u2.id  
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.status = 'playing'
      ORDER BY m.started_at DESC
    `);
  }

  async getMatchById(matchId: number): Promise<MatchRecord | null> {
    const matches = await this.db.query<MatchRecord>(
      `
      SELECT m.*, t.name as tournament_name,
             u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
             u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
      FROM matches m
      LEFT JOIN users u1 ON m.player1_id = u1.id
      LEFT JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = ?
    `,
      [matchId]
    );

    return matches.length ? matches[0] : null;
  }

  async updateMatchResult(
    matchId: number,
    userId: number,
    result: { player1_score: number; player2_score: number; winner_id: number }
  ): Promise<MatchRecord> {
    const { player1_score, player2_score, winner_id } = result;

    const match = await this.db.query<MatchRecord>(
      `SELECT * FROM matches WHERE id = ?`,
      [matchId]
    );

    if (!match.length) {
      throw new Error('Match not found');
    }

    const currentMatch = match[0];

    if (currentMatch.player1_id !== userId && currentMatch.player2_id !== userId) {
      throw new Error('Not authorized to update this match result');
    }

    if (currentMatch.status === 'completed') {
      throw new Error('Match is already completed');
    }

    if (winner_id !== currentMatch.player1_id && winner_id !== currentMatch.player2_id) {
      throw new Error('Winner must be one of the two players');
    }

    const startTime = currentMatch.started_at ? new Date(currentMatch.started_at) : new Date();
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    await this.db.query(
      `
      UPDATE matches 
      SET player1_score = ?, player2_score = ?, winner_id = ?, 
          status = 'completed', completed_at = CURRENT_TIMESTAMP,
          duration_seconds = ?
      WHERE id = ?
    `,
      [player1_score, player2_score, winner_id, durationSeconds, matchId]
    );

    if (currentMatch.tournament_id) {
      await this.advanceTournamentBracket(currentMatch.tournament_id, matchId, winner_id);
    }

    const updatedMatch = await this.getMatchById(matchId);
    if (!updatedMatch) {
      throw new Error('Failed to retrieve updated match');
    }

    return updatedMatch;
  }

  async startMatch(matchId: number, userId: number): Promise<void> {
    const match = await this.db.query<MatchRecord>(
      `SELECT * FROM matches WHERE id = ? AND (player1_id = ? OR player2_id = ?)`,
      [matchId, userId, userId]
    );

    if (!match.length) {
      throw new Error('Match not found or access not authorized');
    }

    if (match[0].status !== 'scheduled') {
      throw new Error('Match cannot be started');
    }

    await this.db.query(
      `
      UPDATE matches 
      SET status = 'playing', started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [matchId]
    );
  }

  private async validateMatchData(data: {
    player1_id?: number | null;
    player2_id?: number | null;
    player1_guest_name?: string | null;
    player2_guest_name?: string | null;
    player1_score: number;
    player2_score: number;
    winner_id?: number | null;
    tournament_id?: number | null;
  }): Promise<string | null> {
    const {
      player1_id,
      player2_id,
      player1_guest_name,
      player2_guest_name,
      winner_id,
      tournament_id,
    } = data;

    if ((!player1_id && !player1_guest_name) || (!player2_id && !player2_guest_name)) {
      return 'Each player must have either an ID or a guest name';
    }

    if (player1_id) {
      const user1 = await this.db.query('SELECT id FROM users WHERE id = ?', [player1_id]);
      if (!user1.length) return `Player 1 (ID: ${player1_id}) not found`;
    }

    if (player2_id) {
      const user2 = await this.db.query('SELECT id FROM users WHERE id = ?', [player2_id]);
      if (!user2.length) return `Player 2 (ID: ${player2_id}) not found`;
    }

    if (winner_id && winner_id !== player1_id && winner_id !== player2_id) {
      return 'Winner must be one of the two players';
    }

    if (tournament_id) {
      const tournament = await this.db.query('SELECT id FROM tournaments WHERE id = ?', [
        tournament_id,
      ]);
      if (!tournament.length) return `Tournament (ID: ${tournament_id}) not found`;
    }

    return null;
  }

  private async advanceTournamentBracket(
    tournamentId: number,
    matchId: number,
    winnerId: number
  ): Promise<void> {
    const remainingMatches = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM matches 
       WHERE tournament_id = ? AND status != 'completed'`,
      [tournamentId]
    );

    if (remainingMatches[0].count === 0) {
      await this.db.query(
        `
        UPDATE tournaments 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = ?
        WHERE id = ?
      `,
        [winnerId, tournamentId]
      );
    }
  }
}
