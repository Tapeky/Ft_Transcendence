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
        console.log('Delete account request received');
        console.log('Params:', request.params);
        console.log('User from token:', request.user);
        
        const { userID } = request.params;
        
        if (!userID) {
          console.error('No userID in params');
          return reply.status(400).send({
            success: false,
            error: 'User ID is required',
          });
        }
        
        // Verify the authenticated user is deleting their own account
        const currentUser = request.user as { id: number; username: string; email: string };
        
        if (!currentUser || !currentUser.id) {
          console.error('No authenticated user found');
          return reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        console.log('Current user ID:', currentUser.id);
        console.log('Target user ID:', Number(userID));
        
        if (currentUser.id !== Number(userID)) {
          console.error('User ID mismatch');
          return reply.status(403).send({
            success: false,
            error: 'Unauthorized to delete this account',
          });
        }
        
        console.log('Attempting to delete user:', userID);
        await userRepo.deleteUser(Number(userID));
        console.log('User deleted successfully');
        
        return reply.send({
          success: true,
          message: 'Account supprime avec succès',
        });
      } catch (error: any) {
        console.error('Error in delete account route:', error);
        console.error('Error stack:', error.stack);
        request.log.error('Erreur suppression de compte:', error);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la suppression du compte',
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
