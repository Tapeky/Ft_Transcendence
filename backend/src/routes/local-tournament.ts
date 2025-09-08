import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LocalTournamentManager } from '../game/LocalTournamentManager';

interface CreateLocalTournamentRequest {
  Body: {
    humanPlayers: Array<{name: string, alias: string}>;
  };
}

interface MatchResultRequest {
  Body: {
    tournamentId: number;
    matchId: number;
    winnerId: number;
    player1Score: number;
    player2Score: number;
  };
}

interface TournamentStatusRequest {
  Params: {
    tournamentId: string;
  };
}

export async function localTournamentRoutes(fastify: FastifyInstance) {
  const tournamentManager = LocalTournamentManager.getInstance();

  // Create a new local tournament
  fastify.post<CreateLocalTournamentRequest>('/create', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { humanPlayers } = request.body as CreateLocalTournamentRequest['Body'];

      // Validation
      if (!humanPlayers || !Array.isArray(humanPlayers)) {
        return reply.code(400).send({ error: 'humanPlayers array is required' });
      }

      if (humanPlayers.length === 0) {
        return reply.code(400).send({ error: 'At least one human player is required' });
      }

      if (humanPlayers.length > 8) {
        return reply.code(400).send({ error: 'Maximum 8 players allowed' });
      }

      // Validate player data
      for (const player of humanPlayers) {
        if (!player.name || !player.alias) {
          return reply.code(400).send({ error: 'Each player must have name and alias' });
        }
      }

      // Create tournament
      const tournament = tournamentManager.createLocalTournament(humanPlayers);

      console.log(`🏆 Local tournament created with ${humanPlayers.length} humans + ${8 - humanPlayers.length} AI`);

      return reply.send(tournament);
    } catch (error) {
      console.error('Error creating local tournament:', error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to create tournament' 
      });
    }
  });

  // Record match result
  fastify.post<MatchResultRequest>('/match-result', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tournamentId, matchId, winnerId, player1Score, player2Score } = request.body as MatchResultRequest['Body'];

      // Validation
      if (!tournamentId || !matchId || !winnerId || 
          player1Score === undefined || player2Score === undefined) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      if (player1Score < 0 || player2Score < 0) {
        return reply.code(400).send({ error: 'Scores must be non-negative' });
      }

      if (player1Score === player2Score) {
        return reply.code(400).send({ error: 'Scores cannot be tied in tournament' });
      }

      // Record result
      tournamentManager.recordHumanMatchResult(matchId, winnerId, player1Score, player2Score);

      // Get updated tournament
      const tournament = tournamentManager.getCurrentTournament();
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      console.log(`🏆 Match ${matchId} result recorded: ${player1Score}-${player2Score}, winner: ${winnerId}`);

      return reply.send(tournament);
    } catch (error) {
      console.error('Error recording match result:', error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to record match result' 
      });
    }
  });

  // Get tournament status
  fastify.get<TournamentStatusRequest>('/status/:tournamentId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt((request.params as TournamentStatusRequest['Params']).tournamentId);

      if (!tournamentId) {
        return reply.code(400).send({ error: 'Invalid tournament ID' });
      }

      const tournament = tournamentManager.getCurrentTournament();
      
      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      if (tournament.tournamentId !== tournamentId) {
        return reply.code(404).send({ error: 'Tournament ID mismatch' });
      }

      return reply.send(tournament);
    } catch (error) {
      console.error('Error getting tournament status:', error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get tournament status' 
      });
    }
  });

  // Get tournament statistics
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = tournamentManager.getTournamentStats();
      
      if (!stats) {
        return reply.code(404).send({ error: 'No active tournament' });
      }

      return reply.send(stats);
    } catch (error) {
      console.error('Error getting tournament stats:', error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to get tournament stats' 
      });
    }
  });

  // Reset current tournament
  fastify.post('/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      tournamentManager.reset();
      console.log('🏆 Local tournament reset');
      
      return reply.send({ message: 'Tournament reset successfully' });
    } catch (error) {
      console.error('Error resetting tournament:', error);
      return reply.code(500).send({ 
        error: error instanceof Error ? error.message : 'Failed to reset tournament' 
      });
    }
  });

  console.log('🏆 Local tournament routes registered');
}