import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { DatabaseManager } from '../database/DatabaseManager';
import { LocalTournamentService } from '../tournament/LocalTournamentService';
import { WebSocketManager } from '../websocket/WebSocketManager';

interface TournamentCreateRequest {
  name: string;
  maxPlayers: 4 | 8 | 16;
}

interface TournamentJoinRequest {
  alias: string;
}

interface FastifyWithWebSocket extends FastifyInstance {
  websocketManager: WebSocketManager;
}

export async function localTournamentRoutes(server: FastifyInstance) {
  const wsManager = (server as FastifyWithWebSocket).websocketManager;

  server.post<{ Body: TournamentCreateRequest }>(
    '/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'maxPlayers'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            maxPlayers: { type: 'number', enum: [4, 8, 16] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: TournamentCreateRequest }>, reply: FastifyReply) => {
      const { name, maxPlayers } = request.body;
      const db = DatabaseManager.getInstance().getDb();

      try {
        const tournamentId = randomUUID();

        await db.run(
          `INSERT INTO tournaments (id, name, max_players, current_players, status, created_by) VALUES (?, ?, ?, 0, 'registration', 1)`,
          [tournamentId, name, maxPlayers]
        );

        reply.status(201).send({
          success: true,
          data: {
            tournament: {
              id: tournamentId,
              name,
              maxPlayers,
              currentPlayers: 0,
              status: 'registration', // Map 'open' to 'registration' for frontend
              players: [],
              createdAt: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error('Failed to create tournament:', error);
        reply.status(500).send({ success: false, error: 'Failed to create tournament' });
      }
    }
  );

  server.get<{ Params: { id: string } }>(
    '/state/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const db = DatabaseManager.getInstance().getDb();

      try {
        const tournament = await db.get(`SELECT * FROM tournaments WHERE id = ?`, [id]);

        if (!tournament) {
          return reply.status(404).send({ success: false, error: 'Tournament not found' });
        }

        const players = await db.all(
          `SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY joined_at ASC`,
          [id]
        );

        const matches = await db.all(
          `SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, match_number ASC`,
          [id]
        );

        let bracket = null;
        if (matches.length > 0) {
          const roundsMap = new Map();
          matches.forEach(match => {
            if (!roundsMap.has(match.round)) {
              roundsMap.set(match.round, []);
            }

            const convertedMatch = {
              id: match.id,
              tournamentId: match.tournament_id?.toString(),
              round: match.round,
              matchNumber: match.match_number,
              player1Alias: match.player1_alias,
              player2Alias: match.player2_alias,
              player1Score: match.player1_score || 0,
              player2Score: match.player2_score || 0,
              winnerAlias: match.winner_alias,
              status: match.status,
              startedAt: match.started_at,
              completedAt: match.completed_at,
              createdAt: match.created_at,
            };

            roundsMap.get(match.round).push(convertedMatch);
          });

          const rounds = [];
          const maxRound = Math.max(...Array.from(roundsMap.keys()));
          for (let i = 1; i <= maxRound; i++) {
            rounds.push(roundsMap.get(i) || []);
          }

          // Calculate current round dynamically
          let currentRound = 1;
          const nextPendingMatch = matches.find(
            m => m.status === 'pending' && m.player1_alias !== 'TBD' && m.player2_alias !== 'TBD'
          );
          if (nextPendingMatch) {
            currentRound = nextPendingMatch.round;
          } else {
            // If no pending matches, check for in_progress matches
            const inProgressMatch = matches.find(m => m.status === 'in_progress');
            if (inProgressMatch) {
              currentRound = inProgressMatch.round;
            } else {
              // All matches completed, set to last round
              currentRound = maxRound;
            }
          }

          bracket = {
            rounds: rounds,
            currentRound: currentRound,
            currentMatch: nextPendingMatch?.id || matches.find(m => m.status === 'pending')?.id,
          };
        }

        let frontendStatus = tournament.status;
        if (tournament.status === 'registration') {
          if (tournament.current_players >= tournament.max_players) {
            frontendStatus = 'ready';
          } else {
            frontendStatus = 'registration';
          }
        } else if (tournament.status === 'ready') {
          frontendStatus = 'ready';
        } else if (tournament.status === 'in_progress') {
          frontendStatus = 'in_progress';
        }

        // Extract winner from bracket_data or final match
        let winnerAlias = null;
        if (tournament.status === 'completed') {
          // Try to get winner from bracket_data first
          if (tournament.bracket_data) {
            try {
              const bracketData = JSON.parse(tournament.bracket_data);
              winnerAlias = bracketData.winner;
            } catch (e) {
              console.warn('Failed to parse bracket_data:', e);
            }
          }

          // If not found, get winner from the final match
          if (!winnerAlias && matches.length > 0) {
            const finalMatch = matches.find(
              (m: any) => m.status === 'completed' && m.winner_alias && m.round === Math.max(...matches.map((match: any) => match.round))
            );
            if (finalMatch) {
              winnerAlias = finalMatch.winner_alias;
            }
          }
        }

        reply.send({
          success: true,
          data: {
            tournament: {
              id: tournament.id.toString(),
              name: tournament.name,
              maxPlayers: tournament.max_players,
              currentPlayers: tournament.current_players,
              status: frontendStatus,
              winnerAlias: winnerAlias,
              players: players.map(p => ({
                id: p.id.toString(),
                alias: p.alias,
                joinedAt: p.joined_at,
              })),
              bracket: bracket,
              matches: matches, // Ajout des matches aussi
              createdAt: tournament.created_at,
              startedAt: tournament.started_at,
            },
          },
        });
      } catch (error) {
        console.error('Failed to get tournament:', error);
        reply.status(500).send({ success: false, error: 'Failed to get tournament' });
      }
    }
  );

  server.post<{ Params: { id: string }; Body: TournamentJoinRequest }>(
    '/join/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: TournamentJoinRequest }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { alias } = request.body;
      const db = DatabaseManager.getInstance().getDb();

      try {
        const tournament = await db.get(
          `SELECT * FROM tournaments WHERE id = ? AND status = 'registration'`,
          [id]
        );

        if (!tournament) {
          return reply
            .status(404)
            .send({ success: false, error: 'Tournament not found or not accepting players' });
        }

        if (tournament.current_players >= tournament.max_players) {
          return reply.status(400).send({ success: false, error: 'Tournament is full' });
        }

        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.run(
          `INSERT INTO tournament_players (id, tournament_id, alias, joined_at) VALUES (?, ?, ?, ?)`,
          [playerId, id, alias, new Date().toISOString()]
        );

        await db.run(`UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?`, [
          id,
        ]);

        const updatedTournament = await db.get(`SELECT * FROM tournaments WHERE id = ?`, [
          id,
        ]);

        reply.send({
          success: true,
          data: {
            player: {
              id: playerId,
              alias: alias,
              joinedAt: new Date().toISOString(),
            },
            tournament: {
              currentPlayers: updatedTournament.current_players,
              status:
                updatedTournament.status === 'registration' ? 'registration' : updatedTournament.status,
              ready: updatedTournament.current_players >= updatedTournament.max_players,
            },
          },
        });
      } catch (error) {
        console.error('Failed to join tournament:', error);
        reply.status(500).send({ success: false, error: 'Failed to join tournament' });
      }
    }
  );

  server.post<{ Params: { id: string } }>(
    '/start/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const db = DatabaseManager.getInstance().getDb();
      const tournamentService = new LocalTournamentService(db);

      try {
        const tournament = await db.get(
          `SELECT * FROM tournaments WHERE id = ? AND status IN ('registration', 'in_progress')`,
          [id]
        );

        if (!tournament) {
          return reply
            .status(404)
            .send({ success: false, error: 'Tournament not found or not available for starting' });
        }

        if (tournament.current_players < tournament.max_players) {
          return reply.status(400).send({ success: false, error: 'Tournament needs more players' });
        }

        await db.run(
          `UPDATE tournaments SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [id]
        );

        const updatedTournament = await db.get(`SELECT * FROM tournaments WHERE id = ?`, [
          id,
        ]);

        const players = await db.all(
          `SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY joined_at`,
          [id]
        );

        const bracket = tournamentService.generateTournamentBracket(players);

        for (const round of bracket.rounds) {
          for (const match of round) {
            await db.run(
              `INSERT INTO tournament_matches (id, tournament_id, round, match_number, player1_alias, player2_alias, player1_score, player2_score, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                match.id,
                id, // ✅ Use integer tournament_id
                match.round,
                match.matchNumber,
                match.player1Alias,
                match.player2Alias,
                match.player1Score,
                match.player2Score,
                match.status,
                new Date().toISOString(),
              ]
            );
          }
        }

        // Broadcast tournament start notification
        if (wsManager && bracket.rounds.length > 0 && bracket.rounds[0].length > 0) {
          const firstMatch = bracket.rounds[0][0];
          wsManager.broadcastToAll({
            type: 'tournament_match_ready',
            data: {
              tournamentId: id,
              tournamentName: updatedTournament.name,
              matchId: firstMatch.id,
              round: firstMatch.round,
              player1: firstMatch.player1Alias,
              player2: firstMatch.player2Alias,
            },
          });
        }

        let frontendStatus = updatedTournament.status;
        if (updatedTournament.status === 'in_progress') {
          frontendStatus = 'in_progress';
        } else if (updatedTournament.status === 'registration') {
          frontendStatus =
            updatedTournament.current_players >= updatedTournament.max_players
              ? 'ready'
              : 'registration';
        }

        reply.send({
          success: true,
          data: {
            tournament: {
              id: updatedTournament.id.toString(),
              name: updatedTournament.name,
              maxPlayers: updatedTournament.max_players,
              currentPlayers: updatedTournament.current_players,
              status: frontendStatus,
              players: players.map(p => ({
                id: p.id.toString(),
                alias: p.alias,
                joinedAt: p.joined_at,
              })),
              bracket: bracket, // ← AJOUT DU BRACKET !
              createdAt: updatedTournament.created_at,
              startedAt: updatedTournament.started_at,
            },
          },
        });
      } catch (error) {
        console.error('Failed to start tournament:', error);
        reply.status(500).send({ success: false, error: 'Failed to start tournament' });
      }
    }
  );

  server.get<{ Params: { id: string } }>(
    '/next-match/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const db = DatabaseManager.getInstance().getDb();

      try {
        const tournament = await db.get(`SELECT * FROM tournaments WHERE id = ?`, [id]);

        if (!tournament) {
          return reply.status(404).send({ success: false, error: 'Tournament not found' });
        }

        if (tournament.status !== 'in_progress') {
          return reply.status(400).send({ success: false, error: 'Tournament is not running' });
        }

        const nextMatch = await db.get(
          `
        SELECT * FROM tournament_matches
        WHERE tournament_id = ?
          AND status = 'pending'
          AND player1_alias != 'TBD'
          AND player2_alias != 'TBD'
        ORDER BY round, match_number
        LIMIT 1
      `,
          [id]
        );

        if (!nextMatch) {
          return reply.status(404).send({ success: false, error: 'No pending matches found' });
        }

        // Broadcast next match notification
        if (wsManager) {
          wsManager.broadcastToAll({
            type: 'tournament_match_ready',
            data: {
              tournamentId: id,
              tournamentName: tournament.name,
              matchId: nextMatch.id,
              round: nextMatch.round,
              player1: nextMatch.player1_alias,
              player2: nextMatch.player2_alias,
            },
          });
        }

        reply.send({
          success: true,
          data: {
            match: {
              id: nextMatch.id,
              tournamentId: nextMatch.tournament_id.toString(),
              round: nextMatch.round,
              matchNumber: nextMatch.match_number,
              player1Alias: nextMatch.player1_alias,
              player2Alias: nextMatch.player2_alias,
              player1Score: nextMatch.player1_score || 0,
              player2Score: nextMatch.player2_score || 0,
              status: nextMatch.status,
              createdAt: nextMatch.created_at,
            },
          },
        });
      } catch (error) {
        console.error('Failed to get next match:', error);
        reply.status(500).send({ success: false, error: 'Failed to get next match' });
      }
    }
  );

  server.post<{
    Params: { id: string };
    Body: { matchId: string; player1Score: number; player2Score: number; winnerAlias: string };
  }>(
    '/match-result/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { matchId: string; player1Score: number; player2Score: number; winnerAlias: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { matchId, player1Score, player2Score, winnerAlias } = request.body;
      const db = DatabaseManager.getInstance().getDb();

      try {
        const tournament = await db.get(`SELECT * FROM tournaments WHERE id = ?`, [id]);

        if (!tournament) {
          return reply.status(404).send({ success: false, error: 'Tournament not found' });
        }

        if (tournament.status !== 'in_progress') {
          return reply.status(400).send({ success: false, error: 'Tournament is not running' });
        }

        const match = await db.get(
          `SELECT * FROM tournament_matches WHERE id = ? AND tournament_id = ?`,
          [matchId, id]
        );

        if (!match) {
          return reply.status(404).send({ success: false, error: 'Match not found' });
        }

        if (match.status !== 'pending') {
          return reply.status(400).send({ success: false, error: 'Match is not pending' });
        }

        await db.run(
          `UPDATE tournament_matches
         SET player1_score = ?, player2_score = ?, winner_alias = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
          [player1Score, player2Score, winnerAlias, matchId]
        );

        const remainingMatches = await db.all(
          `SELECT * FROM tournament_matches 
         WHERE tournament_id = ? AND round = ? AND status = 'pending'`,
          [id, match.round]
        );

        if (remainingMatches.length === 0) {

          const roundMatches = await db.all(
            `SELECT * FROM tournament_matches 
           WHERE tournament_id = ? AND round = ? AND status = 'completed'
           ORDER BY match_number`,
            [id, match.round]
          );

          const nextRound = match.round + 1;
          const nextRoundMatches = await db.all(
            `SELECT * FROM tournament_matches 
           WHERE tournament_id = ? AND round = ?
           ORDER BY match_number`,
            [id, nextRound]
          );

          if (nextRoundMatches.length > 0) {
            for (let i = 0; i < roundMatches.length; i += 2) {
              const match1 = roundMatches[i];
              const match2 = roundMatches[i + 1];

              if (match1 && match2) {
                const nextMatchIndex = Math.floor(i / 2);
                if (nextMatchIndex < nextRoundMatches.length) {
                  const nextMatch = nextRoundMatches[nextMatchIndex];

                  await db.run(
                    `UPDATE tournament_matches
                   SET player1_alias = ?, player2_alias = ?
                   WHERE id = ?`,
                    [match1.winner_alias, match2.winner_alias, nextMatch.id]
                  );

                  // Broadcast next round match notification
                  if (wsManager && i === 0) {
                    wsManager.broadcastToAll({
                      type: 'tournament_match_ready',
                      data: {
                        tournamentId: id,
                        tournamentName: tournament.name,
                        matchId: nextMatch.id,
                        round: nextRound,
                        player1: match1.winner_alias,
                        player2: match2.winner_alias,
                      },
                    });
                  }
                }
              }
            }
          } else {
            await db.run(
              `UPDATE tournaments SET status = 'completed', completed_at = CURRENT_TIMESTAMP, bracket_data = ? WHERE id = ?`,
              [JSON.stringify({ winner: winnerAlias }), id]
            );

            // Broadcast tournament completion notification
            if (wsManager) {
              wsManager.broadcastToAll({
                type: 'tournament_completed',
                data: {
                  tournamentId: id,
                  tournamentName: tournament.name,
                  winnerAlias: winnerAlias,
                },
              });
            }
          }
        }

        reply.send({
          success: true,
          data: {
            message: 'Match result submitted successfully',
          },
        });
      } catch (error) {
        console.error('Failed to submit match result:', error);
        reply.status(500).send({ success: false, error: 'Failed to submit match result' });
      }
    }
  );

  server.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = DatabaseManager.getInstance().getDb();

    try {

      const tournaments = await db.all(`
        SELECT
          id,
          name,
          max_players as maxPlayers,
          current_players as currentPlayers,
          status,
          winner_id as winnerId,
          bracket_data as bracketData,
          created_at as createdAt,
          started_at as startedAt,
          completed_at as completedAt
        FROM tournaments
        WHERE status IN ('completed', 'cancelled')
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const tournamentsWithDetails = await Promise.all(
        tournaments.map(async (tournament: any) => {
          const players = await db.all(
            `
            SELECT 
              id,
              alias,
              position,
              joined_at as joinedAt
            FROM tournament_players 
            WHERE tournament_id = ?
            ORDER BY joined_at ASC
          `,
            [tournament.id]
          );

          const matches = await db.all(
            `
            SELECT 
              id,
              tournament_id as tournamentId,
              round,
              match_number as matchNumber,
              player1_alias as player1Alias,
              player2_alias as player2Alias,
              player1_score as player1Score,
              player2_score as player2Score,
              winner_alias as winnerAlias,
              status,
              started_at as startedAt,
              completed_at as completedAt,
              created_at as createdAt
            FROM tournament_matches 
            WHERE tournament_id = ?
            ORDER BY round, match_number
          `,
            [tournament.id]
          );

          let winner = null; // tournament.winnerId serait un ID, pas un alias
          if (tournament.bracketData) {
            try {
              tournament.bracketData = JSON.parse(tournament.bracketData);
              if (tournament.bracketData.winner && !winner) {
                winner = tournament.bracketData.winner;
              }
            } catch (e) {
              console.warn('Failed to parse bracket data:', e);
            }
          }

          if (!winner && matches.length > 0) {
            const finalMatch = matches.find(
              (match: any) =>
                match.winnerAlias && match.round === Math.max(...matches.map((m: any) => m.round))
            );
            if (finalMatch) {
              winner = finalMatch.winnerAlias;
            }
          }

          return {
            ...tournament,
            winnerAlias: winner,
            players: players.map((player: any) => ({
              ...player,
              joinedAt: new Date(player.joinedAt),
            })),
            matches: matches.map((match: any) => ({
              ...match,
              startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
              completedAt: match.completedAt ? new Date(match.completedAt) : undefined,
              createdAt: new Date(match.createdAt),
            })),
            createdAt: new Date(tournament.createdAt),
            startedAt: tournament.startedAt ? new Date(tournament.startedAt) : undefined,
            completedAt: tournament.completedAt ? new Date(tournament.completedAt) : undefined,
          };
        })
      );

      reply.send({
        success: true,
        data: {
          tournaments: tournamentsWithDetails,
          total: tournamentsWithDetails.length,
        },
      });
    } catch (error) {
      console.error('Failed to get tournament history:', error);
      reply.status(500).send({ success: false, error: 'Failed to get tournament history' });
    }
  });

  server.delete('/clear-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = DatabaseManager.getInstance().getDb();

    try {

      const countResult = await db.get(`SELECT COUNT(*) as count FROM tournaments`);
      const totalCount = countResult.count;

      await db.run(`DELETE FROM tournament_matches`);
      await db.run(`DELETE FROM tournament_players`);
      await db.run(`DELETE FROM tournaments`);

      console.log(`💥 DELETED ALL ${totalCount} tournaments and related data`);

      reply.send({
        success: true,
        data: {
          message: `ALL tournaments deleted (${totalCount} total)`,
          deletedCount: totalCount,
        },
      });
    } catch (error) {
      console.error('❌ Failed to delete all tournaments:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to delete all tournaments',
      });
    }
  });

  server.delete('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = DatabaseManager.getInstance().getDb();

    try {

      // Get only completed/cancelled tournament IDs (not running ones)
      const completedTournaments = (await db.all(
        `SELECT id FROM tournaments WHERE status IN ('completed', 'cancelled')`
      )) as any[];
      const completedTournamentIds = completedTournaments.map((t: any) => t.id);

      if (completedTournamentIds.length > 0) {
        const placeholders = completedTournamentIds.map(() => '?').join(',');

        console.log(
          `🗑️ Deleting ${completedTournamentIds.length} completed tournaments:`,
          completedTournamentIds
        );

        await db.run(
          `
          DELETE FROM tournament_matches 
          WHERE tournament_id IN (${placeholders})
        `,
          completedTournamentIds
        );

        await db.run(
          `
          DELETE FROM tournament_players 
          WHERE tournament_id IN (${placeholders})
        `,
          completedTournamentIds
        );

        const result = await db.run(
          `
          DELETE FROM tournaments 
          WHERE id IN (${placeholders})
        `,
          completedTournamentIds
        );

        console.log(
          `✅ Deleted ALL ${result.changes} tournaments and their related data`
        );

        reply.send({
          success: true,
          data: {
            message: 'All tournament history cleared',
            deletedCount: completedTournamentIds.length,
          },
        });
      } else {
        reply.send({
          success: true,
          data: {
            message: 'No tournaments to delete',
            deletedCount: 0,
          },
        });
      }
    } catch (error) {
      console.error('❌ Failed to clear tournament history:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to clear tournament history',
      });
    }
  });
}
