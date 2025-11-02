import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken, validateDisplayname, validateInput } from '../middleware';
import { formatOTPUri, TOTP_DIGITS, getOTP } from '../auth/totp'
import { User } from '../types/database';
import { AccountParams } from '../auth/types'


const TOTP_TIMEOUT = 10;
const currUsersWaitingForTotp: Map<number, [number, any]> = new Map<number, [number, any]>()

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
            error_id: "no_user_id",
            error: 'User ID is required',
          });
        }
        
        // Verify the authenticated user is deleting their own account
        const currentUser = request.user as { id: number; username: string; email: string };
        
        if (!currentUser || !currentUser.id) {
          console.error('No authenticated user found');
          return reply.status(401).send({
            success: false,
            error_id: "not_authenticated",
            error: 'User not authenticated',
          });
        }
        
        console.log('Current user ID:', currentUser.id);
        console.log('Target user ID:', Number(userID));
        
        if (currentUser.id !== Number(userID)) {
          console.error('User ID mismatch');
          return reply.status(403).send({
            success: false,
            error_id: "not_your_account",
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
          error_id: "internal_error",
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
          error_id: "internal_error",
          error: 'Profile update error',
        });
      }
    }
  );
  server.post(
    '/setup_2fa',
    {
      preHandler: authenticateToken
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const id = (request.user as {id: number}).id;
        const user = await userRepo.findById(id) as User;

        if (user.has_2fa_enabled) {
          reply.send({
            success: false,
            error_id: "already_enabled",
            error: "2FA is already enabled on this account",
          });
          return ;
        }

        const totpSecret = await userRepo.get2faSecretAndCreateIfNull(id);
        const uri = formatOTPUri('Ft_Transcendence', user.email, totpSecret);
        var remainingTime = TOTP_TIMEOUT * 60;
        if (!currUsersWaitingForTotp.has(id)) {
          currUsersWaitingForTotp.set(id, [
            Date.now(),
            setTimeout(() => currUsersWaitingForTotp.delete(id), 60 * 1000 * TOTP_TIMEOUT)
          ]);
        }
        else {
          remainingTime = (TOTP_TIMEOUT * 60) -  Math.floor((Date.now() - currUsersWaitingForTotp.get(id)![0]) / 1000);
        }
        reply.send({
          success: true,
          data: {
            remaining_time: remainingTime,
            totp_uri: uri,
          }
        });
      }
      catch (error: any) {
        request.log.error('Erreur setup 2FA:', error);
        reply.status(500).send({
          success: false,
          error_id: "internal_error",
          error: 'Error while setting up 2FA',
        });
      }
    }
  )
  server.post(
    '/confirm_2fa',
    {
        preHandler: [
        authenticateToken,
        validateInput({
          body: {
            otp: { required: true, type: 'string', minLength: TOTP_DIGITS, maxLength: TOTP_DIGITS }
          },
        }),
      ]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const id = (request.user as {id: number}).id;
        const user = await userRepo.findById(id) as User;

        if (user.has_2fa_enabled) {
          reply.send({
            success: false,
            error_id: "already_enabled",
            error: "2FA is already enabled on this account",
          });
          return ;
        }

        const entry = currUsersWaitingForTotp.get(id);
        if (entry === undefined) {
          reply.send({
            success: false,
            error_id: "request_expired",
            error: "Request to enable 2FA has expired",
          });
          return ;
        }

        const otp = (request.body as {otp: string}).otp;
        const actualOtp = getOTP(user.totp_secret!);
        if (otp == actualOtp) {
          clearTimeout(entry[1]);
          currUsersWaitingForTotp.delete(id);
          userRepo.update2faStatus(id, true)
          reply.send({
            success: true,
            message: '2FA is now enabled !!',
          });
        }
        else {
          reply.send({
            success: false,
            error_id: "invalid_otp",
            message: 'Invalid One-Time Password !',
          });
        }
      }
      catch (error: any) {
        request.log.error('Erreur setup 2FA:', error);
        reply.status(500).send({
          success: false,
          error_id: "internal_error",
          error: 'Unexpected error enabling 2FA',
        });
      }
    }
  )
  server.post(
    '/disable_2fa',
    {
        preHandler: authenticateToken
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const id = (request.user as {id: number}).id;
        const user = await userRepo.findById(id) as User;

        if (!user.has_2fa_enabled) {
          reply.send({
            success: false,
            error_id: "already_disabled",
            error: "2FA is already disabled on this account",
          });
          return ;
        }

        userRepo.update2faStatus(id, false)

        reply.send({
          success: true,
          message: '2FA succesfully disabled',
        });
      }
      catch (error: any) {
        request.log.error('Erreur retirer 2FA:', error);
        reply.status(500).send({
          success: false,
          error_id: "internal_error",
          error: 'Unexpected error disabling 2FA',
        });
      }
    }
  )
}
