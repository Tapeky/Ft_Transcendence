import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken, validateDisplayname } from '../middleware';
import { AccountParams } from '../auth/types'


export async function delete_accountRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);
  server.delete<{ Params: AccountParams }>(
    '/delete_account/:userID',
    {
      preHandler: [authenticateToken],
    },
    async (request: FastifyRequest<{ Params: AccountParams }>, reply: FastifyReply) => {
      try {
        const { userID } = request.params; 
        const remove_account = await userRepo.deleteUser(Number(userID));
        
        reply.send({
          success: true,
          message: 'Account supprime avec succès',
        });
      } catch (error: any) {
        request.log.error('Erreur suppression de compte:', error);
        reply.status(500).send({
          success: false,
          error: 'Erreur lors de la mise à jour du profil',
        });
      }
    }
  )
}

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
