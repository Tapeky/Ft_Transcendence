import { Database } from 'sqlite';
import { ChatRepository } from '../repositories/ChatRepository';
import { TournamentNotificationMetadata } from '../types/chat';

export class TournamentNotificationService {
  constructor(
    private db: Database,
    private chatRepo: ChatRepository
  ) {}

  /**
   * Notifies a player about their next match in the tournament
   */
  async notifyNextMatch(
    tournamentId: number,
    playerId: number,
    matchDetails: {
      matchId: number;
      round: number;
      opponent: string;
      matchNumber: number;
    }
  ): Promise<void> {
    try {
      // Get tournament system user ID (can be tournament creator or system user)
      const tournament = await this.db.get(
        `SELECT created_by, name FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`);
        return;
      }

      const systemUserId = tournament.created_by || 1; // Fallback to admin user

      // Create or get conversation with the player
      const conversation = await this.chatRepo.getOrCreateConversation(systemUserId, playerId);

      // Create notification message
      const content = `Your next match is ready!\n\nTournament: ${tournament.name}\nRound: ${matchDetails.round}\nOpponent: ${matchDetails.opponent}\n\nGood luck!`;

      const metadata: TournamentNotificationMetadata = {
        tournamentId,
        eventType: 'next_match',
        matchId: matchDetails.matchId,
        opponents: [matchDetails.opponent],
      };

      await this.chatRepo.createMessage({
        conversation_id: conversation.id,
        sender_id: systemUserId,
        content,
        type: 'tournament_notification',
        metadata,
      });

      console.log(`Notification sent to player ${playerId} for match ${matchDetails.matchId}`);
    } catch (error) {
      console.error(`Failed to send tournament notification to player ${playerId}:`, error);
    }
  }

  /**
   * Notifies both players about their upcoming match
   */
  async notifyBothPlayers(
    tournamentId: number,
    player1Id: number,
    player2Id: number,
    matchDetails: {
      matchId: number;
      round: number;
      player1Alias: string;
      player2Alias: string;
      matchNumber: number;
    }
  ): Promise<void> {
    await Promise.all([
      this.notifyNextMatch(tournamentId, player1Id, {
        matchId: matchDetails.matchId,
        round: matchDetails.round,
        opponent: matchDetails.player2Alias,
        matchNumber: matchDetails.matchNumber,
      }),
      this.notifyNextMatch(tournamentId, player2Id, {
        matchId: matchDetails.matchId,
        round: matchDetails.round,
        opponent: matchDetails.player1Alias,
        matchNumber: matchDetails.matchNumber,
      }),
    ]);
  }

  /**
   * Notifies all participants that the tournament is starting
   */
  async notifyTournamentStart(
    tournamentId: number,
    tournamentName: string,
    participantIds: number[]
  ): Promise<void> {
    try {
      const tournament = await this.db.get(
        `SELECT created_by FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      if (!tournament) return;

      const systemUserId = tournament.created_by || 1;

      for (const userId of participantIds) {
        const conversation = await this.chatRepo.getOrCreateConversation(systemUserId, userId);

        const content = `Tournament "${tournamentName}" is starting!\n\nGet ready for your matches. Good luck!`;

        const metadata: TournamentNotificationMetadata = {
          tournamentId,
          eventType: 'tournament_start',
        };

        await this.chatRepo.createMessage({
          conversation_id: conversation.id,
          sender_id: systemUserId,
          content,
          type: 'tournament_notification',
          metadata,
        });
      }

      console.log(`Tournament start notifications sent to ${participantIds.length} players`);
    } catch (error) {
      console.error(`Failed to send tournament start notifications:`, error);
    }
  }

  /**
   * Notifies a player about their match result
   */
  async notifyMatchResult(
    tournamentId: number,
    playerId: number,
    matchId: string,
    won: boolean,
    score: string,
    opponent: string
  ): Promise<void> {
    try {
      const tournament = await this.db.get(
        `SELECT created_by, name FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      if (!tournament) return;

      const systemUserId = tournament.created_by || 1;
      const conversation = await this.chatRepo.getOrCreateConversation(systemUserId, playerId);

      const result = won ? 'Victory!' : 'Defeat';
      const content = `${result}\n\nTournament: ${tournament.name}\nOpponent: ${opponent}\nScore: ${score}\n\n${won ? 'Congratulations!' : 'Better luck next time!'}`;

      const metadata: TournamentNotificationMetadata = {
        tournamentId,
        eventType: 'match_result',
      };

      await this.chatRepo.createMessage({
        conversation_id: conversation.id,
        sender_id: systemUserId,
        content,
        type: 'tournament_notification',
        metadata,
      });
    } catch (error) {
      console.error(`Failed to send match result notification:`, error);
    }
  }
}
