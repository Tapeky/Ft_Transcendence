import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { validateInput, authenticateToken } from '../middleware';
import { LoginCredentials, RegisterCredentials } from '../types/database';
import { getOTP, TOTP_DIGITS } from '../auth/totp';

export async function authRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);

  const checkNotAuthenticated = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      return reply.status(400).send({
        success: false,
        error: 'You are already logged in',
      });
    } catch (error) {
      return;
    }
  };

  server.post(
    '/register',
    {
      preHandler: [
        checkNotAuthenticated,
        validateInput({
          body: {
            username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
            email: { required: true, type: 'email', maxLength: 255 },
            password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
            display_name: { type: 'string', maxLength: 100 },
            data_consent: { required: true, type: 'boolean' },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as RegisterCredentials;

        const existingUser = await userRepo.findByEmail(body.email);
        if (existingUser) {
          return reply.status(409).send({
            success: false,
            error: 'An account with this email already exists',
          });
        }

        const existingUsername = await userRepo.findByUsername(body.username);
        if (existingUsername) {
          return reply.status(409).send({
            success: false,
            error: "Username already taken",
          });
        }

        const user = await userRepo.create({
          ...body,
          avatar_url:
            'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
        });

        const token = server.jwt.sign({
          id: user.id,
          username: user.username,
          email: user.email,
        });

        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'REGISTER',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ username: user.username }),
        });

        reply.send({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              is_online: false,
              total_wins: 0,
              total_losses: 0,
              total_games: 0,
              created_at: user.created_at,
            },
            token,
            expires_in: process.env.JWT_EXPIRES_IN || '24h',
          },
          message: 'Account created successfully',
        });
      } catch (error: any) {
        request.log.error("Error during account creation:", error);

        await userRepo.logSecurityAction({
          action: 'REGISTER_FAILED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: false,
          details: JSON.stringify({ error: error.message }),
        });

        reply.status(500).send({
          success: false,
          error: 'Error while registering',
        });
      }
    }
  );

  server.post(
    '/login',
    {
      preHandler: [
        checkNotAuthenticated,
        validateInput({
          body: {
            email: { required: true, type: 'email' },
            password: { required: true, type: 'string' },
            totp_password: { type: 'string' }
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as LoginCredentials;

        const user = await userRepo.findByEmail(body.email);
        if (!user) {
          await userRepo.logSecurityAction({
            action: 'LOGIN_FAILED',
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            success: false,
            details: JSON.stringify({ reason: 'user_not_found', email: body.email }),
          });

          return reply.status(401).send({
            success: false,
            error: 'Wrong email or password',
          });
        }

        const isPasswordValid = await userRepo.verifyPassword(user, body.password);
        if (!isPasswordValid) {
          await userRepo.logSecurityAction({
            user_id: user.id,
            action: 'LOGIN_FAILED',
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            success: false,
            details: JSON.stringify({ reason: 'invalid_password' }),
          });

          return reply.status(401).send({
            success: false,
            error: 'Wrong email or password',
          });
        }

        if (user.has_2fa_enabled) {
          const currentOTP = getOTP(user.totp_secret!);
          const userOTP = body.totp_password;
          if (!userOTP || userOTP.length != TOTP_DIGITS) {
            return reply.status(401).send({
              success: false,
              error: 'Ce compte est protégé par authentification à deux facteurs.',
            });
          }

          if (currentOTP != userOTP) {
            await userRepo.logSecurityAction({
              action: 'LOGIN_FAILED',
              ip_address: request.ip,
              user_agent: request.headers['user-agent'],
              success: false,
              details: JSON.stringify({ reason: 'totp_invalid' }),
            });

            return reply.status(401).send({
              success: false,
              error: 'Clé 2FA incorrecte.',
            });
          }
        }

        await userRepo.updateOnlineStatus(user.id, true);

        const token = server.jwt.sign({
          id: user.id,
          username: user.username,
          email: user.email,
        });

        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'LOGIN_SUCCESS',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ username: user.username }),
        });

        const stats = await userRepo.getUserStats(user.id);

        reply.send({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              is_online: true,
              total_wins: stats.total_wins || 0,
              total_losses: stats.total_losses || 0,
              total_games: stats.total_games || 0,
              created_at: user.created_at,
            },
            token,
            expires_in: process.env.JWT_EXPIRES_IN || '24h',
          },
          message: 'Connection successful',
        });
      } catch (error: any) {
        request.log.error('Error while connecting:', error);

        await userRepo.logSecurityAction({
          action: 'LOGIN_ERROR',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: false,
          details: JSON.stringify({ error: error.message }),
        });

        reply.status(500).send({
          success: false,
          error: 'Error while connecting',
        });
      }
    }
  );

  server.post(
    '/logout',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as { id: number; username: string; email: string };

        await userRepo.updateOnlineStatus(user.id, false);

        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'LOGOUT',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ username: user.username }),
        });

        reply.send({
          success: true,
          message: 'Logout successful',
        });
      } catch (error: any) {
        request.log.error('Erreur lors de la déconnexion:', error);
        reply.status(500).send({
          success: false,
          error: 'Logout error',
        });
      }
    }
  );

  server.get(
    '/me',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };

        const user = await userRepo.findById(currentUser.id);
        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const stats = await userRepo.getUserStats(user.id);

        reply.send({
          success: true,
          data: {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            is_online: user.is_online,
            total_wins: stats.total_wins || 0,
            total_losses: stats.total_losses || 0,
            total_games: stats.total_games || 0,
            created_at: user.created_at,
            has_2fa_enabled: user.has_2fa_enabled,
            stats,
          },
        });
      } catch (error: any) {
        request.log.error('Profile retrieve error:', error);
        reply.status(500).send({
          success: false,
          error: 'Profile retrieve error',
        });
      }
    }
  );

  server.put(
    '/profile',
    {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            display_name: { type: 'string', maxLength: 100 },
            avatar_url: { type: 'string', maxLength: 500 },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const updates = request.body as { display_name?: string; avatar_url?: string };

        const updatedUser = await userRepo.updateProfile(currentUser.id, updates);

        await userRepo.logSecurityAction({
          user_id: currentUser.id,
          action: 'PROFILE_UPDATE',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ updates }),
        });

        reply.send({
          success: true,
          data: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            display_name: updatedUser.display_name,
            avatar_url: updatedUser.avatar_url,
          },
          message: 'Profile updated successfully',
        });
      } catch (error: any) {
        request.log.error('Update profile error:', error);
        reply.status(500).send({
          success: false,
          error: 'Update profile error',
        });
      }
    }
  );

  server.put(
    '/password',
    {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            current_password: { required: true, type: 'string' },
            new_password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const body = request.body as {
          current_password: string;
          new_password: string;
        };

        const user = await userRepo.findById(currentUser.id);
        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const isCurrentPasswordValid = await userRepo.verifyPassword(user, body.current_password);
        if (!isCurrentPasswordValid) {
          await userRepo.logSecurityAction({
            user_id: user.id,
            action: 'PASSWORD_CHANGE_FAILED',
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            success: false,
            details: JSON.stringify({ reason: 'invalid_current_password' }),
          });

          return reply.status(400).send({
            success: false,
            error: 'Invalid current password',
          });
        }

        await userRepo.changePassword(user.id, body.new_password);

        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'PASSWORD_CHANGED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ username: user.username }),
        });

        reply.send({
          success: true,
          message: 'Successfully updated password',
        });
      } catch (error: any) {
        request.log.error('Error while changing password:', error);
        reply.status(500).send({
          success: false,
          error: 'Error while changing password',
        });
      }
    }
  );

  server.post(
    '/heartbeat',
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };

        await userRepo.updateOnlineStatus(currentUser.id, true);
        await userRepo.updateLastLogin(currentUser.id);

        reply.send({
          success: true,
          message: 'Heartbeat reçu',
        });
      } catch (error: any) {
        request.log.error('Error heartbeat:', error);
        reply.status(500).send({
          success: false,
          error: 'Error during heartbeat',
        });
      }
    }
  );

  server.delete(
    '/account',
    {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            password: { required: true, type: 'string' },
            confirm_deletion: { required: true, type: 'boolean' },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const body = request.body as {
          password: string;
          confirm_deletion: boolean;
        };

        if (!body.confirm_deletion) {
          return reply.status(400).send({
            success: false,
            error: 'Please confirm account deletion',
          });
        }

        const user = await userRepo.findById(currentUser.id);
        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const isPasswordValid = await userRepo.verifyPassword(user, body.password);
        if (!isPasswordValid) {
          await userRepo.logSecurityAction({
            user_id: user.id,
            action: 'ACCOUNT_DELETION_FAILED',
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            success: false,
            details: JSON.stringify({ reason: 'invalid_password' }),
          });

          return reply.status(400).send({
            success: false,
            error: 'Wrong password',
          });
        }

        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'ACCOUNT_DELETED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: true,
          details: JSON.stringify({ username: user.username, email: user.email }),
        });

        await userRepo.deleteUser(user.id);

        reply.send({
          success: true,
          message: 'Account deleted successfully',
        });
      } catch (error: any) {
        request.log.error('Error during accoutn deletion:', error);
        reply.status(500).send({
          success: false,
          error: 'Error during accoutn deletion',
        });
      }
    }
  );

  server.get('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const githubClientId = process.env.GITHUB_CLIENT_ID;

      if (!githubClientId) {
        return reply.status(500).send({
          success: false,
          error: 'GitHub OAuth not configured',
        });
      }

      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI || 'http://localhost:8000/api/auth/github/callback')}`;

      reply.redirect(githubAuthUrl);
    } catch (error: any) {
      request.log.error('Error during Github redirection:', error);
      reply.status(500).send({
        success: false,
        error: 'Error during Github connection',
      });
    }
  });

  server.get('/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.status(400).send({
          success: false,
          error: "Missing authorization code",
        });
      }

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return reply.status(400).send({
          success: false,
          error: "Error during Github auth",
        });
      }

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });

      const githubUser = await userResponse.json();

      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((email: any) => email.primary)?.email || githubUser.email;

      if (!primaryEmail) {
        return reply.status(400).send({
          success: false,
          error: "Cannot get Github email",
        });
      }

      let user = await userRepo.findByEmail(primaryEmail);

      if (!user) {
        user = await userRepo.create({
          username: githubUser.login,
          email: primaryEmail,
          password: crypto.randomBytes(32).toString('hex'), // Secure random password
          display_name: githubUser.name || githubUser.login,
          avatar_url:
            'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
          data_consent: true,
        });

        await userRepo.updateGitHubId(user.id, githubUser.id.toString());
      } else {
        if (!user.github_id) {
          await userRepo.updateGitHubId(user.id, githubUser.id.toString());
        }
      }

      await userRepo.updateOnlineStatus(user.id, true);

      const token = server.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'GITHUB_LOGIN_SUCCESS',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ github_username: githubUser.login }),
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.FRONTEND_URL || `${protocol}://localhost:3000`;

      reply.redirect(`${frontendUrl}?token=${token}`);
    } catch (error: any) {
      request.log.error('Error Github callback:', error);

      await userRepo.logSecurityAction({
        action: 'GITHUB_LOGIN_ERROR',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message }),
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.FRONTEND_URL || `${protocol}://localhost:3000`;

      reply.redirect(`${frontendUrl}?error=github_auth_failed`);
    }
  });

  server.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        return reply.status(500).send({
          success: false,
          error: 'Google OAuth not configured',
        });
      }

      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.append('client_id', googleClientId);
      googleAuthUrl.searchParams.append(
        'redirect_uri',
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback'
      );
      googleAuthUrl.searchParams.append('response_type', 'code');
      googleAuthUrl.searchParams.append('scope', 'openid profile email');
      googleAuthUrl.searchParams.append('access_type', 'offline');
      googleAuthUrl.searchParams.append('prompt', 'consent');

      reply.redirect(googleAuthUrl.toString());
    } catch (error: any) {
      request.log.error('Error Google redirection:', error);
      reply.status(500).send({
        success: false,
        error: 'Error Google connection',
      });
    }
  });

  server.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.status(400).send({
          success: false,
          error: "Missing authorization code",
        });
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri:
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return reply.status(400).send({
          success: false,
          error: "Error Google auth",
        });
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const googleUser = await userResponse.json();

      if (!googleUser.email) {
        return reply.status(400).send({
          success: false,
          error: "Cannot get Google email",
        });
      }

      let user = await userRepo.findByGoogleId(googleUser.id);

      if (!user) {
        user = await userRepo.findByEmail(googleUser.email);

        if (user) {
          await userRepo.updateGoogleId(user.id, googleUser.id);
        } else {
          user = await userRepo.create({
            username: googleUser.email.split('@')[0], // Utiliser la partie avant @ comme username
            email: googleUser.email,
            password: crypto.randomBytes(32).toString('hex'), // Secure random password
            display_name: googleUser.name || googleUser.email.split('@')[0],
            avatar_url:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
            google_id: googleUser.id,
            data_consent: true,
          });
        }
      }

      await userRepo.updateOnlineStatus(user.id, true);

      const token = server.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'GOOGLE_LOGIN_SUCCESS',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ google_email: googleUser.email }),
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.FRONTEND_URL || `${protocol}://localhost:3000`;

      reply.redirect(`${frontendUrl}?token=${token}`);
    } catch (error: any) {
      request.log.error('Error Google callback:', error);

      await userRepo.logSecurityAction({
        action: 'GOOGLE_LOGIN_ERROR',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message }),
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.FRONTEND_URL || `${protocol}://localhost:3000`;

      reply.redirect(`${frontendUrl}?error=google_auth_failed`);
    }
  });
}
