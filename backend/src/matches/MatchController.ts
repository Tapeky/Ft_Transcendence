import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';
import { MatchService } from './MatchService';
import { RecordMatchBody } from './types';

interface CreateMatchBody {
  player2_id: number;
  game_type?: string;
  max_score?: number;
}

interface MatchParams {
  id: string;
}

interface MatchResultBody {
  player1_score: number;
  player2_score: number;
  winner_id: number;
}

export class MatchController {
  private matchService = new MatchService();

  registerRoutes(server: FastifyInstance) {
    server.post<{ Body: RecordMatchBody }>('/record', {
      preHandler: [
        validateInput({
          body: {
            player1_score: { required: true, type: 'number', min: 0 },
            player2_score: { required: true, type: 'number', min: 0 },
            game_type: { type: 'string', enum: ['pong', 'tournament'] },
            max_score: { type: 'number', min: 1, max: 21 }
          }
        })
      ]
    }, this.recordMatch.bind(this));

    server.get('/', {
      preHandler: authenticateToken
    }, this.getMatches.bind(this));

    server.post<{ Body: CreateMatchBody }>('/', {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            player2_id: { required: true, type: 'number' },
            game_type: { type: 'string' },
            max_score: { type: 'number' }
          }
        })
      ]
    }, this.createMatch.bind(this));

    server.get('/live', this.getLiveMatches.bind(this));

    server.get<{ Params: MatchParams }>('/:id', this.getMatchDetails.bind(this));

    server.put<{ Params: MatchParams; Body: MatchResultBody }>('/:id/result', {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            player1_score: { required: true, type: 'number' },
            player2_score: { required: true, type: 'number' },
            winner_id: { required: true, type: 'number' }
          }
        })
      ]
    }, this.updateMatchResult.bind(this));

    server.post<{ Params: MatchParams }>('/:id/start', {
      preHandler: authenticateToken
    }, this.startMatch.bind(this));
  }

  private async recordMatch(
    request: FastifyRequest<{ Body: RecordMatchBody }>, 
    reply: FastifyReply
  ) {
    try {
      const { matchId, match } = await this.matchService.recordMatch(request.body);

      request.log.info(
        `Match recorded: ID=${matchId}, Players=${match.player1_username || match.player1_guest_name} vs ${match.player2_username || match.player2_guest_name}, Score=${match.player1_score}-${match.player2_score}`
      );

      reply.status(201).send({
        success: true,
        message: 'Match enregistré avec succès',
        data: match
      });

    } catch (error) {
      request.log.error('Erreur enregistrement match:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          return reply.status(400).send({
            success: false,
            error: 'ID joueur invalide'
          });
        }
        if (error.message.includes('UNIQUE constraint failed')) {
          return reply.status(409).send({
            success: false,
            error: 'Match déjà enregistré'
          });
        }
        if (error.message.includes('Player') || error.message.includes('Tournament')) {
          return reply.status(400).send({
            success: false,
            error: error.message
          });
        }
      }

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'enregistrement du match'
      });
    }
  }

  private async getMatches(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { 
        player_id, tournament_id, game_type, limit = 50, offset = 0,
        include_guests = false, include_stats = false 
      } = request.query as any;
      
      const userId = (request as any).user?.id;
      const targetPlayerId = player_id || userId;

      const matches = await this.matchService.getMatches({
        player_id: targetPlayerId,
        tournament_id,
        game_type,
        limit: Number(limit),
        offset: Number(offset),
        include_guests: Boolean(include_guests),
        include_stats: Boolean(include_stats)
      });

      reply.send({
        success: true,
        data: matches,
        pagination: { limit: Number(limit), offset: Number(offset), total: matches.length }
      });

    } catch (error) {
      request.log.error('Erreur récupération matches:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches'
      });
    }
  }

  private async createMatch(
    request: FastifyRequest<{ Body: CreateMatchBody }>, 
    reply: FastifyReply
  ) {
    try {
      const { player2_id, game_type = 'pong', max_score = 3 } = request.body;
      const player1_id = (request as any).user.id;

      const match = await this.matchService.createDirectMatch(player1_id, player2_id, {
        game_type,
        max_score
      });

      reply.status(201).send({
        success: true,
        data: match,
        message: 'Match créé avec succès'
      });

    } catch (error) {
      request.log.error('Erreur création match:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Cannot create match against yourself') {
          return reply.status(400).send({
            success: false,
            error: 'Vous ne pouvez pas jouer contre vous-même'
          });
        }
        if (error.message === 'Opponent not found') {
          return reply.status(404).send({
            success: false,
            error: 'Adversaire non trouvé'
          });
        }
      }

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du match'
      });
    }
  }

  private async getLiveMatches(request: FastifyRequest, reply: FastifyReply) {
    try {
      const liveMatches = await this.matchService.getLiveMatches();

      reply.send({
        success: true,
        data: liveMatches,
        count: liveMatches.length
      });

    } catch (error) {
      request.log.error('Erreur matches live:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches en cours'
      });
    }
  }

  private async getMatchDetails(
    request: FastifyRequest<{ Params: MatchParams }>, 
    reply: FastifyReply
  ) {
    try {
      const matchId = parseInt(request.params.id);
      const match = await this.matchService.getMatchById(matchId);

      if (!match) {
        return reply.status(404).send({
          success: false,
          error: 'Match non trouvé'
        });
      }

      reply.send({
        success: true,
        data: match
      });

    } catch (error) {
      request.log.error('Erreur détails match:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du match'
      });
    }
  }

  private async updateMatchResult(
    request: FastifyRequest<{ Params: MatchParams; Body: MatchResultBody }>, 
    reply: FastifyReply
  ) {
    try {
      const matchId = parseInt(request.params.id);
      const { player1_score, player2_score, winner_id } = request.body;
      const userId = (request as any).user.id;

      const updatedMatch = await this.matchService.updateMatchResult(matchId, userId, {
        player1_score,
        player2_score,
        winner_id
      });

      reply.send({
        success: true,
        data: updatedMatch,
        message: 'Résultat enregistré avec succès'
      });

    } catch (error) {
      request.log.error('Erreur enregistrement résultat:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Match not found') {
          return reply.status(404).send({
            success: false,
            error: 'Match non trouvé'
          });
        }
        if (error.message === 'Not authorized to update this match result') {
          return reply.status(403).send({
            success: false,
            error: 'Vous n\'êtes pas autorisé à enregistrer ce résultat'
          });
        }
        if (error.message === 'Match is already completed') {
          return reply.status(400).send({
            success: false,
            error: 'Ce match est déjà terminé'
          });
        }
        if (error.message === 'Winner must be one of the two players') {
          return reply.status(400).send({
            success: false,
            error: 'Le gagnant doit être l\'un des deux joueurs'
          });
        }
      }

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'enregistrement du résultat'
      });
    }
  }

  private async startMatch(
    request: FastifyRequest<{ Params: MatchParams }>, 
    reply: FastifyReply
  ) {
    try {
      const matchId = parseInt(request.params.id);
      const userId = (request as any).user.id;

      await this.matchService.startMatch(matchId, userId);

      reply.send({
        success: true,
        message: 'Match démarré'
      });

    } catch (error) {
      request.log.error('Erreur démarrage match:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Match not found or access not authorized') {
          return reply.status(404).send({
            success: false,
            error: 'Match non trouvé ou accès non autorisé'
          });
        }
        if (error.message === 'Match cannot be started') {
          return reply.status(400).send({
            success: false,
            error: 'Le match ne peut pas être démarré'
          });
        }
      }

      reply.status(500).send({
        success: false,
        error: 'Erreur lors du démarrage du match'
      });
    }
  }
}