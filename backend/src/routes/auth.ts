// backend/src/routes/auth.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { validateInput, authenticateToken } from '../middleware';
import { LoginCredentials, RegisterCredentials } from '../types/database';

export async function authRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);

  // POST /api/auth/register
  server.post('/register', {
    preHandler: validateInput({
      body: {
        username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
        email: { required: true, type: 'email', maxLength: 255 },
        password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
        display_name: { type: 'string', maxLength: 100 },
        data_consent: { required: true, type: 'boolean' }
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as RegisterCredentials;
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await userRepo.findByEmail(body.email);
      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }

      const existingUsername = await userRepo.findByUsername(body.username);
      if (existingUsername) {
        return reply.status(409).send({
          success: false,
          error: 'Ce nom d\'utilisateur est déjà pris'
        });
      }

      // Créer l'utilisateur
      const user = await userRepo.create(body);

      // Générer le token JWT
      const token = server.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email
      });

      // Logger l'action
      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'REGISTER',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: user.username })
      });

      reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url
          },
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        },
        message: 'Compte créé avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur lors de l\'inscription:', error);
      
      await userRepo.logSecurityAction({
        action: 'REGISTER_FAILED',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message })
      });

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du compte'
      });
    }
  });

  // POST /api/auth/login
  server.post('/login', {
    preHandler: validateInput({
      body: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string' }
      }
    })
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as LoginCredentials;
      
      // Trouver l'utilisateur
      const user = await userRepo.findByEmail(body.email);
      if (!user) {
        await userRepo.logSecurityAction({
          action: 'LOGIN_FAILED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: false,
          details: JSON.stringify({ reason: 'user_not_found', email: body.email })
        });

        return reply.status(401).send({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await userRepo.verifyPassword(user, body.password);
      if (!isPasswordValid) {
        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'LOGIN_FAILED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: false,
          details: JSON.stringify({ reason: 'invalid_password' })
        });

        return reply.status(401).send({
          success: false,
          error: 'Email ou mot de passe incorrect'
        });
      }

      // Mettre à jour le statut en ligne
      await userRepo.updateOnlineStatus(user.id, true);

      // Générer le token JWT
      const token = server.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email
      });

      // Logger la connexion réussie
      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: user.username })
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
            is_online: true
          },
          token,
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        },
        message: 'Connexion réussie'
      });

    } catch (error: any) {
      request.log.error('Erreur lors de la connexion:', error);
      
      await userRepo.logSecurityAction({
        action: 'LOGIN_ERROR',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message })
      });

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la connexion'
      });
    }
  });

  // POST /api/auth/logout
  server.post('/logout', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Mettre à jour le statut hors ligne
      await userRepo.updateOnlineStatus(request.user!.id, false);

      // Logger la déconnexion
      await userRepo.logSecurityAction({
        user_id: request.user!.id,
        action: 'LOGOUT',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: request.user!.username })
      });

      reply.send({
        success: true,
        message: 'Déconnexion réussie'
      });

    } catch (error: any) {
      request.log.error('Erreur lors de la déconnexion:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la déconnexion'
      });
    }
  });

  // GET /api/auth/me - Profil de l'utilisateur connecté
  server.get('/me', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await userRepo.findById(request.user!.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Utilisateur non trouvé'
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
          created_at: user.created_at,
          stats
        }
      });

    } catch (error: any) {
      request.log.error('Erreur lors de la récupération du profil:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du profil'
      });
    }
  });

  // PUT /api/auth/profile - Mise à jour du profil
  server.put('/profile', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          display_name: { type: 'string', maxLength: 100 },
          avatar_url: { type: 'string', maxLength: 500 }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const updates = request.body as { display_name?: string; avatar_url?: string };
      
      const updatedUser = await userRepo.updateProfile(request.user!.id, updates);

      await userRepo.logSecurityAction({
        user_id: request.user!.id,
        action: 'PROFILE_UPDATE',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ updates })
      });

      reply.send({
        success: true,
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          display_name: updatedUser.display_name,
          avatar_url: updatedUser.avatar_url
        },
        message: 'Profil mis à jour avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur lors de la mise à jour du profil:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la mise à jour du profil'
      });
    }
  });

  // PUT /api/auth/password - Changement de mot de passe
  server.put('/password', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          current_password: { required: true, type: 'string' },
          new_password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        current_password: string;
        new_password: string;
      };

      // Vérifier l'utilisateur actuel
      const user = await userRepo.findById(request.user!.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Vérifier le mot de passe actuel
      const isCurrentPasswordValid = await userRepo.verifyPassword(user, body.current_password);
      if (!isCurrentPasswordValid) {
        await userRepo.logSecurityAction({
          user_id: user.id,
          action: 'PASSWORD_CHANGE_FAILED',
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          success: false,
          details: JSON.stringify({ reason: 'invalid_current_password' })
        });

        return reply.status(400).send({
          success: false,
          error: 'Mot de passe actuel incorrect'
        });
      }

      // Changer le mot de passe
      await userRepo.changePassword(user.id, body.new_password);

      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'PASSWORD_CHANGED',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: user.username })
      });

      reply.send({
        success: true,
        message: 'Mot de passe changé avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur lors du changement de mot de passe:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors du changement de mot de passe'
      });
    }
  });

  // DELETE /api/auth/account - Suppression de compte (GDPR)
  server.delete('/account', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          password: { required: true, type: 'string' },
          confirm_deletion: { required: true, type: 'boolean' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        password: string;
        confirm_deletion: boolean;
      };

      if (!body.confirm_deletion) {
        return reply.status(400).send({
          success: false,
          error: 'Vous devez confirmer la suppression de votre compte'
        });
      }

      // Vérifier l'utilisateur et le mot de passe
      const user = await userRepo.findById(request.user!.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Utilisateur non trouvé'
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
          details: JSON.stringify({ reason: 'invalid_password' })
        });

        return reply.status(400).send({
          success: false,
          error: 'Mot de passe incorrect'
        });
      }

      // Logger avant suppression
      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'ACCOUNT_DELETED',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: user.username, email: user.email })
      });

      // Supprimer l'utilisateur
      await userRepo.deleteUser(user.id);

      reply.send({
        success: true,
        message: 'Compte supprimé avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur lors de la suppression du compte:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la suppression du compte'
      });
    }
  });
}