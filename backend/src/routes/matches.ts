import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';

export async function matchRoutes(server: FastifyInstance) {
  // GET /api/matches - Historique des matches
  server.get('/', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implémenter l'historique des matches
      reply.send({
        success: true,
        data: [],
        message: 'Historique des matches en cours de développement'
      });
    } catch (error) {
      request.log.error('Erreur matches:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches'
      });
    }
  });

  // POST /api/matches - Créer un match
  server.post('/', {
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implémenter la création de matches
      reply.send({
        success: true,
        message: 'Création de matches en cours de développement'
      });
    } catch (error) {
      request.log.error('Erreur création match:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du match'
      });
    }
  });
}