import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken, validateDisplayname } from '../middleware';

export async function profileRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);

  server.patch(
    '/',
    {
      preHandler: [authenticateToken, validateDisplayname],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const { display_name } = request.body as { display_name: string };

        const updatedUser = await userRepo.updateProfile(currentUser.id, { display_name });
        reply.send({
          success: true,
          data: {
            display_name: updatedUser.display_name,
          },
          message: 'Profil mis à jour avec succès',
        });
      } catch (error: any) {
        request.log.error('Erreur mise à jour profil:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la mise à jour du profil',
        });
      }
    }
  );
}
