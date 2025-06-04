import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';

export async function tournamentRoutes(server: FastifyInstance) {
  // GET /api/tournaments - Liste des tournois
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implémenter la logique des tournois
      reply.send({
        success: true,
        data: [],
        message: 'Fonctionnalité des tournois en cours de développement'
      });
    } catch (error) {
      request.log.error('Erreur tournois:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des tournois'
      });
    }
  });

  // POST /api/tournaments - Créer un tournoi
  server.post('/', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          name: { required: true, type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          max_players: { type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Implémenter la création de tournois
      reply.send({
        success: true,
        message: 'Création de tournois en cours de développement'
      });
    } catch (error) {
      request.log.error('Erreur création tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du tournoi'
      });
    }
  });
}