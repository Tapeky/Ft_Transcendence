import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';

// Tournament API Types
interface TournamentCreateRequest {
  name: string;
  maxPlayers: 4 | 8 | 16;
}

interface TournamentJoinRequest {
  alias: string;
}

// Generate simple single-elimination bracket
function generateTournamentBracket(players: any[]) {
  const playerCount = players.length;
  console.log(`🏆 Generating bracket for ${playerCount} players:`, players.map(p => p.alias));
  if (![4, 8, 16].includes(playerCount)) {
    throw new Error(`Invalid player count for bracket generation: ${playerCount} players (need 4, 8, or 16)`);
  }

  // Shuffle players for random seeding
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Generate first round matches
  const firstRoundMatches = [];
  const tournamentId = shuffledPlayers[0].tournament_id.toString();
  
  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    const player1 = shuffledPlayers[i];
    const player2 = shuffledPlayers[i + 1];
    
    firstRoundMatches.push({
      id: `match_${tournamentId}_${Math.floor(i/2) + 1}_1`, // match_37_1_1, match_37_2_1, etc.
      tournamentId: tournamentId,
      round: 1,
      matchNumber: Math.floor(i/2) + 1,
      player1Alias: player1.alias,
      player2Alias: player2.alias,
      player1Score: 0,
      player2Score: 0,
      status: 'pending'
    });
  }

  // Calculate total rounds needed
  const totalRounds = Math.log2(playerCount);
  const rounds = [firstRoundMatches];

  // Generate empty rounds for future matches
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundMatches = [];
    
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
        status: 'pending'
      });
    }
    
    rounds.push(roundMatches);
  }

  return {
    rounds: rounds,
    currentRound: 1,
    currentMatch: firstRoundMatches[0]?.id
  };
}

export async function localTournamentRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();

  // Create new tournament
  server.post<{ Body: TournamentCreateRequest }>('/create', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'maxPlayers'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          maxPlayers: { type: 'number', enum: [4, 8, 16] }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: TournamentCreateRequest }>, reply: FastifyReply) => {
    const { name, maxPlayers } = request.body;

    try {
      // Create tournament with autoincrement integer ID (compatible with existing schema)
      const result = await db.run(
        `INSERT INTO tournaments (name, max_players, current_players, status, created_by) VALUES (?, ?, 0, 'open', 1)`,
        [name, maxPlayers]
      );

      reply.status(201).send({
        success: true,
        data: {
          tournament: {
            id: result.lastID!.toString(), // Convert to string for frontend compatibility
            name,
            maxPlayers,
            currentPlayers: 0,
            status: 'registration', // Map 'open' to 'registration' for frontend
            players: [],
            createdAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to create tournament:', error);
      reply.status(500).send({ success: false, error: 'Failed to create tournament' });
    }
  });

  // Basic tournament info endpoint
  server.get<{ Params: { id: string } }>('/state/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      const tournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ?`,
        [parseInt(id)]
      );

      if (!tournament) {
        return reply.status(404).send({ success: false, error: 'Tournament not found' });
      }

      // Get players
      const players = await db.all(
        `SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY joined_at ASC`,
        [parseInt(id)]
      );

      // Get matches (if any)
      const matches = await db.all(
        `SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, match_number ASC`,
        [parseInt(id)]
      );

      // Generate bracket if tournament is running and has matches
      let bracket = null;
      if (tournament.status === 'running' && matches.length > 0) {
        // Group matches by rounds
        const roundsMap = new Map();
        matches.forEach(match => {
          if (!roundsMap.has(match.round)) {
            roundsMap.set(match.round, []);
          }
          roundsMap.get(match.round).push(match);
        });

        // Convert to array format
        const rounds = [];
        const maxRound = Math.max(...Array.from(roundsMap.keys()));
        for (let i = 1; i <= maxRound; i++) {
          rounds.push(roundsMap.get(i) || []);
        }

        bracket = {
          rounds: rounds,
          currentRound: 1,
          currentMatch: matches.find(m => m.status === 'pending')?.id
        };
      }

      // Determine correct frontend status
      let frontendStatus = tournament.status;
      if (tournament.status === 'open') {
        // Check if tournament is ready to start (has enough players)
        if (tournament.current_players >= tournament.max_players) {
          frontendStatus = 'ready';
        } else {
          frontendStatus = 'registration';
        }
      } else if (tournament.status === 'running') {
        frontendStatus = 'in_progress';
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
            players: players.map(p => ({
              id: p.id.toString(),
              alias: p.alias,
              joinedAt: p.joined_at
            })),
            bracket: bracket,
            matches: matches, // Ajout des matches aussi
            createdAt: tournament.created_at,
            startedAt: tournament.started_at
          }
        }
      });
    } catch (error) {
      console.error('Failed to get tournament:', error);
      reply.status(500).send({ success: false, error: 'Failed to get tournament' });
    }
  });

  // Join tournament
  server.post<{ Params: { id: string }; Body: TournamentJoinRequest }>('/join/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: TournamentJoinRequest }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { alias } = request.body;

    try {
      // Check if tournament exists and is accepting players
      const tournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ? AND status = 'open'`,
        [parseInt(id)]
      );

      if (!tournament) {
        return reply.status(404).send({ success: false, error: 'Tournament not found or not accepting players' });
      }

      if (tournament.current_players >= tournament.max_players) {
        return reply.status(400).send({ success: false, error: 'Tournament is full' });
      }

      // Add player to tournament
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert player into tournament_players table
      await db.run(
        `INSERT INTO tournament_players (id, tournament_id, alias, joined_at) VALUES (?, ?, ?, ?)`,
        [playerId, parseInt(id), alias, new Date().toISOString()]
      );
      
      // Update current_players count
      await db.run(
        `UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?`,
        [parseInt(id)]
      );

      console.log(`🏆 Player "${alias}" joined tournament ${id} (ID: ${playerId})`);

      // Get updated tournament info
      const updatedTournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ?`,
        [parseInt(id)]
      );

      reply.send({
        success: true,
        data: {
          player: {
            id: playerId,
            alias: alias,
            joinedAt: new Date().toISOString()
          },
          tournament: {
            currentPlayers: updatedTournament.current_players,
            status: updatedTournament.status === 'open' ? 'registration' : updatedTournament.status,
            ready: updatedTournament.current_players >= updatedTournament.max_players
          }
        }
      });
    } catch (error) {
      console.error('Failed to join tournament:', error);
      reply.status(500).send({ success: false, error: 'Failed to join tournament' });
    }
  });

  // Start tournament
  server.post<{ Params: { id: string } }>('/start/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      // Check if tournament exists and can be started/restarted
      const tournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ? AND status IN ('open', 'running')`,
        [parseInt(id)]
      );

      if (!tournament) {
        return reply.status(404).send({ success: false, error: 'Tournament not found or not available for starting' });
      }

      if (tournament.current_players < tournament.max_players) {
        return reply.status(400).send({ success: false, error: 'Tournament needs more players' });
      }

      // Start the tournament
      await db.run(
        `UPDATE tournaments SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [parseInt(id)]
      );

      // Get updated tournament info
      const updatedTournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ?`,
        [parseInt(id)]
      );

      // Get tournament players for bracket generation
      const players = await db.all(
        `SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY joined_at`,
        [parseInt(id)]
      );

      console.log(`🏆 Starting tournament ${id} with ${players.length} players`);

      // Generate bracket structure (simple single elimination)
      const bracket = generateTournamentBracket(players);

      // Create match records in database
      for (const round of bracket.rounds) {
        for (const match of round) {
          await db.run(
            `INSERT INTO tournament_matches (id, tournament_id, round, match_number, player1_alias, player2_alias, player1_score, player2_score, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              match.id,
              parseInt(id),
              match.round,
              match.matchNumber,
              match.player1Alias,
              match.player2Alias,
              match.player1Score,
              match.player2Score,
              match.status,
              new Date().toISOString()
            ]
          );
        }
      }

      // Map database status to frontend status  
      let frontendStatus = updatedTournament.status;
      if (updatedTournament.status === 'running') {
        frontendStatus = 'in_progress';
      } else if (updatedTournament.status === 'open') {
        frontendStatus = updatedTournament.current_players >= updatedTournament.max_players ? 'ready' : 'registration';
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
              joinedAt: p.joined_at
            })),
            bracket: bracket, // ← AJOUT DU BRACKET !
            createdAt: updatedTournament.created_at,
            startedAt: updatedTournament.started_at
          }
        }
      });
    } catch (error) {
      console.error('Failed to start tournament:', error);
      reply.status(500).send({ success: false, error: 'Failed to start tournament' });
    }
  });

  // Get next match to play
  server.get<{ Params: { id: string } }>('/next-match/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    try {
      // Get tournament info
      const tournament = await db.get(
        `SELECT * FROM tournaments WHERE id = ?`,
        [parseInt(id)]
      );

      if (!tournament) {
        return reply.status(404).send({ success: false, error: 'Tournament not found' });
      }

      if (tournament.status !== 'running') {
        return reply.status(400).send({ success: false, error: 'Tournament is not running' });
      }

      // Find next pending match in current round
      const nextMatch = await db.get(`
        SELECT * FROM tournament_matches 
        WHERE tournament_id = ? AND status = 'pending' 
        ORDER BY round, match_number 
        LIMIT 1
      `, [parseInt(id)]);

      if (!nextMatch) {
        return reply.status(404).send({ success: false, error: 'No pending matches found' });
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
            createdAt: nextMatch.created_at
          }
        }
      });
    } catch (error) {
      console.error('Failed to get next match:', error);
      reply.status(500).send({ success: false, error: 'Failed to get next match' });
    }
  });
}