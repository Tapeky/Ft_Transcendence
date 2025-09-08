/**
 * Tournament Match Handler - Handles match results and bracket progression
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { BracketEngine, TournamentBracket, BracketMatch, TournamentPlayer } from '../game/BracketEngine';

export interface MatchResult {
  matchId: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
  duration?: number;
}

export interface TournamentEvent {
  type: 'match_completed' | 'bracket_updated' | 'tournament_completed' | 'next_match_announced';
  tournamentId: number;
  data: any;
}

export class TournamentMatchHandler {
  private db: DatabaseManager;
  private bracketEngine: BracketEngine;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.bracketEngine = new BracketEngine();
  }

  /**
   * Update match result and progress tournament bracket
   */
  async updateMatchResult(
    tournamentId: number,
    matchResult: MatchResult,
    eventCallback?: (event: TournamentEvent) => void
  ): Promise<{ nextMatch: BracketMatch | null; tournamentComplete: boolean; winner?: TournamentPlayer }> {
    
    return await this.db.transaction(async (db) => {
      // 1. Get current tournament and bracket
      const tournament = await db.get(`
        SELECT * FROM tournaments WHERE id = ? AND status = 'running'
      `, [tournamentId]);

      if (!tournament) {
        throw new Error('Tournament not found or not running');
      }

      const currentBracket: TournamentBracket = JSON.parse(tournament.bracket_data || '{}');
      
      // 2. Validate match exists and is in correct state
      const match = await db.get(`
        SELECT * FROM matches WHERE id = ? AND tournament_id = ? AND status IN ('scheduled', 'in_progress')
      `, [matchResult.matchId, tournamentId]);

      if (!match) {
        throw new Error('Match not found or already completed');
      }

      // 3. Validate winner is a participant in this match
      if (match.player1_id !== matchResult.winnerId && match.player2_id !== matchResult.winnerId) {
        throw new Error('Winner ID does not match match participants');
      }

      // 4. Update match in database
      await db.run(`
        UPDATE matches SET 
          winner_id = ?,
          player1_score = ?,
          player2_score = ?,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          duration_seconds = ?
        WHERE id = ?
      `, [
        matchResult.winnerId,
        matchResult.player1Score,
        matchResult.player2Score,
        matchResult.duration || null,
        matchResult.matchId
      ]);

      // 5. Update bracket using BracketEngine
      const { updatedBracket, nextMatch } = this.bracketEngine.advanceWinner(
        currentBracket,
        matchResult.matchId,
        matchResult.winnerId,
        matchResult.player1Score,
        matchResult.player2Score
      );

      // 6. Update tournament bracket data
      await db.run(`
        UPDATE tournaments SET 
          bracket_data = ?,
          ${updatedBracket.isComplete ? 'status = \'completed\', completed_at = CURRENT_TIMESTAMP, winner_id = ?' : ''}
        WHERE id = ?
      `, updatedBracket.isComplete 
        ? [JSON.stringify(updatedBracket), updatedBracket.winner?.user_id, tournamentId]
        : [JSON.stringify(updatedBracket), tournamentId]
      );

      // 7. Create next round matches if needed
      if (nextMatch && nextMatch.player1 && nextMatch.player2) {
        await this.createNextRoundMatch(tournamentId, nextMatch);
      }

      // 8. Update user statistics
      await this.updatePlayerStats(matchResult.winnerId, match.player1_id === matchResult.winnerId ? match.player2_id : match.player1_id);

      // 9. Emit events
      if (eventCallback) {
        eventCallback({
          type: 'match_completed',
          tournamentId,
          data: { match: matchResult, nextMatch }
        });

        eventCallback({
          type: 'bracket_updated',
          tournamentId,
          data: { bracket: updatedBracket }
        });

        if (updatedBracket.isComplete) {
          eventCallback({
            type: 'tournament_completed',
            tournamentId,
            data: { winner: updatedBracket.winner, bracket: updatedBracket }
          });
        } else if (nextMatch) {
          eventCallback({
            type: 'next_match_announced',
            tournamentId,
            data: { nextMatch }
          });
        }
      }

      return {
        nextMatch,
        tournamentComplete: updatedBracket.isComplete,
        winner: updatedBracket.winner
      };
    });
  }

  /**
   * Create next round match in database
   */
  private async createNextRoundMatch(tournamentId: number, match: BracketMatch): Promise<void> {
    if (!match.player1 || !match.player2) {
      return; // Wait until both players are determined
    }

    await this.db.execute(`
      INSERT INTO matches (
        tournament_id, 
        player1_id, 
        player2_id, 
        status, 
        game_type,
        created_at
      ) VALUES (?, ?, ?, 'scheduled', 'pong', CURRENT_TIMESTAMP)
    `, [tournamentId, match.player1.user_id, match.player2.user_id]);
  }

  /**
   * Update player statistics after match completion
   */
  private async updatePlayerStats(winnerId: number, loserId: number): Promise<void> {
    // Update winner stats
    await this.db.execute(`
      UPDATE users 
      SET total_wins = total_wins + 1, total_games = total_games + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [winnerId]);

    // Update loser stats
    await this.db.execute(`
      UPDATE users 
      SET total_losses = total_losses + 1, total_games = total_games + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [loserId]);
  }

  /**
   * Get tournament bracket with current state
   */
  async getTournamentBracket(tournamentId: number): Promise<TournamentBracket | null> {
    const tournament = await this.db.queryOne(`
      SELECT bracket_data FROM tournaments WHERE id = ?
    `, [tournamentId]);

    if (!tournament || !tournament.bracket_data) {
      return null;
    }

    return JSON.parse(tournament.bracket_data);
  }

  /**
   * Get next scheduled match for tournament
   */
  async getNextMatch(tournamentId: number): Promise<BracketMatch | null> {
    const bracket = await this.getTournamentBracket(tournamentId);
    if (!bracket) {
      return null;
    }

    // Find next scheduled match with both players
    for (const round of bracket.rounds) {
      for (const match of round.matches) {
        if (match.status === 'scheduled' && match.player1 && match.player2) {
          return match;
        }
      }
    }

    return null;
  }

  /**
   * Get tournament statistics
   */
  async getTournamentStats(tournamentId: number): Promise<any> {
    const bracket = await this.getTournamentBracket(tournamentId);
    if (!bracket) {
      return null;
    }

    return this.bracketEngine.getTournamentStats(bracket);
  }

  /**
   * Validate tournament bracket integrity
   */
  async validateTournamentBracket(tournamentId: number): Promise<{ isValid: boolean; errors: string[] }> {
    const bracket = await this.getTournamentBracket(tournamentId);
    if (!bracket) {
      return { isValid: false, errors: ['Tournament bracket not found'] };
    }

    return this.bracketEngine.validateBracket(bracket);
  }

  /**
   * Get all matches for a tournament with current status
   */
  async getTournamentMatches(tournamentId: number): Promise<any[]> {
    return await this.db.query(`
      SELECT 
        m.*,
        p1.username as player1_username,
        p1_participant.alias as player1_alias,
        p2.username as player2_username,
        p2_participant.alias as player2_alias,
        winner.username as winner_username
      FROM matches m
      LEFT JOIN users p1 ON m.player1_id = p1.id
      LEFT JOIN users p2 ON m.player2_id = p2.id
      LEFT JOIN users winner ON m.winner_id = winner.id
      LEFT JOIN tournament_participants p1_participant ON (p1_participant.tournament_id = m.tournament_id AND p1_participant.user_id = m.player1_id)
      LEFT JOIN tournament_participants p2_participant ON (p2_participant.tournament_id = m.tournament_id AND p2_participant.user_id = m.player2_id)
      WHERE m.tournament_id = ?
      ORDER BY m.created_at
    `, [tournamentId]);
  }

  /**
   * Handle player forfeit/no-show
   */
  async handlePlayerForfeit(
    tournamentId: number,
    matchId: number,
    forfeitPlayerId: number,
    eventCallback?: (event: TournamentEvent) => void
  ): Promise<{ nextMatch: BracketMatch | null; tournamentComplete: boolean }> {
    
    const match = await this.db.queryOne(`
      SELECT * FROM matches WHERE id = ? AND tournament_id = ?
    `, [matchId, tournamentId]);

    if (!match) {
      throw new Error('Match not found');
    }

    // Determine winner (opponent of forfeiting player)
    const winnerId = match.player1_id === forfeitPlayerId ? match.player2_id : match.player1_id;
    
    // Update match with forfeit result
    return await this.updateMatchResult(tournamentId, {
      matchId,
      winnerId,
      player1Score: match.player1_id === forfeitPlayerId ? 0 : 11, // Default win by forfeit
      player2Score: match.player2_id === forfeitPlayerId ? 0 : 11,
      duration: 0
    }, eventCallback);
  }
}