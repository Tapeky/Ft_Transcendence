import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { TournamentService } from './TournamentService';
import { TournamentCreateRequest, TournamentJoinRequest } from './types';

export async function tournamentRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const tournamentService = new TournamentService(db);

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
    try {
      const tournament = await tournamentService.createTournament(request.body);
      
      reply.status(201).send({
        success: true,
        data: { tournament },
        message: 'Tournament created successfully'
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to create tournament',
        details: error.message
      });
    }
  });

  // Get all tournaments
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tournaments = await tournamentService.getTournaments();
      
      reply.send({
        success: true,
        data: { tournaments }
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch tournaments',
        details: error.message
      });
    }
  });

  // Get specific tournament
  server.get<{ Params: { id: string } }>('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const tournament = await tournamentService.getTournament(request.params.id);
      
      if (!tournament) {
        return reply.status(404).send({
          success: false,
          error: 'Tournament not found'
        });
      }
      
      reply.send({
        success: true,
        data: { tournament }
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch tournament',
        details: error.message
      });
    }
  });

  // Join tournament
  server.post<{ 
    Params: { id: string }; 
    Body: TournamentJoinRequest 
  }>('/:id/join', {
    schema: {
      body: {
        type: 'object',
        required: ['alias'],
        properties: {
          alias: { type: 'string', minLength: 1, maxLength: 50 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: TournamentJoinRequest }>, reply: FastifyReply) => {
    try {
      const result = await tournamentService.joinTournament(request.params.id, request.body.alias);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.message
        });
      }
      
      reply.send({
        success: true,
        message: 'Successfully joined tournament'
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to join tournament',
        details: error.message
      });
    }
  });

  // Start tournament
  server.post<{ Params: { id: string } }>('/:id/start', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await tournamentService.startTournament(request.params.id);
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.message
        });
      }
      
      reply.send({
        success: true,
        data: { bracket: result.bracket },
        message: 'Tournament started successfully'
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to start tournament',
        details: error.message
      });
    }
  });

  // Delete tournament
  server.delete<{ Params: { id: string } }>('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await tournamentService.deleteTournament(request.params.id);
      
      if (!result.success) {
        return reply.status(404).send({
          success: false,
          error: result.message
        });
      }
      
      reply.send({
        success: true,
        message: 'Tournament deleted successfully'
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: 'Failed to delete tournament',
        details: error.message
      });
    }
  });
}