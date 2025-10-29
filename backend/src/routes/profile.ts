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
          message: 'Account deleted successfully',
        });
      } catch (error: any) {
        request.log.error('Account delete error:', error);
        reply.status(500).send({
          success: false,
          error: 'Account delete error',
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
          message: 'Profile updated successfully',
        });
      } catch (error: any) {
        request.log.error('Profile update error:', error);
        reply.status(500).send({
          success: false,
          error: 'Profile update error',
        });
      }
    }
  );
}
