import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateToken, validateDisplayname, validateInput } from '../middleware';
import { formatOTPUri, TOTP_DIGITS, getOTP, generateOTPSecret } from '../auth/totp'
import { User } from '../types/database';

const TOTP_TIMEOUT = 10;

const currUsersWaitingForTotp: Map<number, [number, any]> = new Map<number, [number, any]>()

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
            error: "2FA is already enabled on this account",
          });
          return ;
        }

        const entry = currUsersWaitingForTotp.get(id);
        if (entry === undefined) {
          reply.send({
            success: false,
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
            message: 'Invalid One-Time Password !',
          });
        }
      }
      catch (error: any) {
        request.log.error('Erreur setup 2FA:', error);
        reply.status(500).send({
          success: false,
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
          error: 'Unexpected error disabling 2FA',
        });
      }
    }
  )
}
