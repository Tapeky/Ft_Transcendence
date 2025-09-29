import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken, validateInput } from '../middleware';

export async function userRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);

  server.get(
    '/search',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { q, limit = 10 } = request.query as { q?: string; limit?: number };

        if (!q || q.length < 2) {
          return reply.status(400).send({
            success: false,
            error: 'La recherche doit contenir au moins 2 caractères',
          });
        }

        const users = await userRepo.search(q, Number(limit));

        reply.send({
          success: true,
          data: users,
        });
      } catch (error) {
        request.log.error('Erreur lors de la recherche:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la recherche',
        });
      }
    }
  );

  server.post(
    '/batch-info',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userIds } = request.body as { userIds: number[] };

        if (!Array.isArray(userIds) || userIds.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'userIds doit être un tableau non vide',
          });
        }

        if (userIds.length > 20) {
          return reply.status(400).send({
            success: false,
            error: 'Maximum 20 utilisateurs à la fois',
          });
        }

        const users = await userRepo.getUsersByIds(userIds);

        reply.send({
          success: true,
          users: users,
        });
      } catch (error) {
        request.log.error('Erreur lors de la récupération batch:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des utilisateurs',
        });
      }
    }
  );

  server.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };

      const leaderboard = await userRepo.getLeaderboard(Number(limit));

      reply.send({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      request.log.error('Erreur lors de la récupération du classement:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du classement',
      });
    }
  });

  server.get(
    '/online',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const onlineUsers = await userRepo.getOnlineUsers();

        reply.send({
          success: true,
          data: onlineUsers,
        });
      } catch (error) {
        request.log.error('Erreur lors de la récupération des utilisateurs en ligne:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération des utilisateurs en ligne',
        });
      }
    }
  );

  server.get(
    '/:id',
    {
      preHandler: [
        authenticateToken,
        validateInput({
          params: {
            id: { required: true, type: 'number' },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: number };

        const user = await userRepo.getPublicProfile(Number(id));
        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'Utilisateur non trouvé',
          });
        }

        const stats = await userRepo.getUserStats(Number(id));

        reply.send({
          success: true,
          data: {
            ...user,
            stats,
          },
        });
      } catch (error) {
        request.log.error('Erreur lors de la récupération du profil:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la récupération du profil',
        });
      }
    }
  );
}
