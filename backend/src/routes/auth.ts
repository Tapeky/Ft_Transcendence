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

      // Créer l'utilisateur avec avatar par défaut
      const user = await userRepo.create({
        ...body,
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'
      });

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
      // Cast correct du user
      const user = request.user as { id: number; username: string; email: string };
      
      // Mettre à jour le statut hors ligne
      await userRepo.updateOnlineStatus(user.id, false);

      // Logger la déconnexion
      await userRepo.logSecurityAction({
        user_id: user.id,
        action: 'LOGOUT',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ username: user.username })
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
      const currentUser = request.user as { id: number; username: string; email: string };
      
      const user = await userRepo.findById(currentUser.id);
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
      const currentUser = request.user as { id: number; username: string; email: string };
      const updates = request.body as { display_name?: string; avatar_url?: string };
      
      const updatedUser = await userRepo.updateProfile(currentUser.id, updates);

      await userRepo.logSecurityAction({
        user_id: currentUser.id,
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
      const currentUser = request.user as { id: number; username: string; email: string };
      const body = request.body as {
        current_password: string;
        new_password: string;
      };

      // Vérifier l'utilisateur actuel
      const user = await userRepo.findById(currentUser.id);
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

  // PUT /api/auth/account - Suppression de compte (GDPR)
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
      const currentUser = request.user as { id: number; username: string; email: string };
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
      const user = await userRepo.findById(currentUser.id);
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

  // GET /api/auth/github - Redirection vers GitHub OAuth
  server.get('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const githubClientId = process.env.GITHUB_CLIENT_ID;
      
      if (!githubClientId) {
        return reply.status(500).send({
          success: false,
          error: 'GitHub OAuth non configuré'
        });
      }

      // URL de redirection GitHub
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI || 'http://localhost:8000/api/auth/github/callback')}`;
      
      reply.redirect(githubAuthUrl);

    } catch (error: any) {
      request.log.error('Erreur lors de la redirection GitHub:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la connexion GitHub'
      });
    }
  });

  // GET /api/auth/github/callback - Callback GitHub OAuth
  server.get('/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.query as { code?: string };
      
      if (!code) {
        return reply.status(400).send({
          success: false,
          error: 'Code d\'autorisation manquant'
        });
      }

      // Échanger le code contre un token d'accès
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return reply.status(400).send({
          success: false,
          error: 'Erreur lors de l\'authentification GitHub'
        });
      }

      // Récupérer les infos utilisateur GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });

      const githubUser = await userResponse.json();
      
      // Récupérer l'email principal
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((email: any) => email.primary)?.email || githubUser.email;

      if (!primaryEmail) {
        return reply.status(400).send({
          success: false,
          error: 'Impossible de récupérer l\'email GitHub'
        });
      }

      // Vérifier si l'utilisateur existe déjà
      let user = await userRepo.findByEmail(primaryEmail);
      
      if (!user) {
        // Créer un nouvel utilisateur
        user = await userRepo.create({
          username: githubUser.login,
          email: primaryEmail,
          password: Math.random().toString(36), // Mot de passe temporaire
          display_name: githubUser.name || githubUser.login,
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
          data_consent: true
        });
        
        // Mettre à jour avec l'ID GitHub
        await userRepo.updateGitHubId(user.id, githubUser.id.toString());
      } else {
        // Lier le compte GitHub si pas déjà fait
        if (!user.github_id) {
          await userRepo.updateGitHubId(user.id, githubUser.id.toString());
        }
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
        action: 'GITHUB_LOGIN_SUCCESS',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ github_username: githubUser.login })
      });

      // Rediriger vers le frontend avec le token
      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : `${protocol}://localhost:3000`;
      
      reply.redirect(`${frontendUrl}?token=${token}`);

    } catch (error: any) {
      request.log.error('Erreur lors du callback GitHub:', error);
      
      await userRepo.logSecurityAction({
        action: 'GITHUB_LOGIN_ERROR',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message })
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : `${protocol}://localhost:3000`;
      
      reply.redirect(`${frontendUrl}?error=github_auth_failed`);
    }
  });

  // GET /api/auth/google - Redirection vers Google OAuth
  server.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      
      if (!googleClientId) {
        return reply.status(500).send({
          success: false,
          error: 'Google OAuth non configuré'
        });
      }

      // URL de redirection Google OAuth
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.append('client_id', googleClientId);
      googleAuthUrl.searchParams.append('redirect_uri', process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback');
      googleAuthUrl.searchParams.append('response_type', 'code');
      googleAuthUrl.searchParams.append('scope', 'openid profile email');
      googleAuthUrl.searchParams.append('access_type', 'offline');
      googleAuthUrl.searchParams.append('prompt', 'consent');
      
      reply.redirect(googleAuthUrl.toString());

    } catch (error: any) {
      request.log.error('Erreur lors de la redirection Google:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la connexion Google'
      });
    }
  });

  // GET /api/auth/google/callback - Callback Google OAuth
  server.get('/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.query as { code?: string };
      
      if (!code) {
        return reply.status(400).send({
          success: false,
          error: 'Code d\'autorisation manquant'
        });
      }

      // Échanger le code contre un token d'accès
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback'
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return reply.status(400).send({
          success: false,
          error: 'Erreur lors de l\'authentification Google'
        });
      }

      // Récupérer les infos utilisateur Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      const googleUser = await userResponse.json();

      if (!googleUser.email) {
        return reply.status(400).send({
          success: false,
          error: 'Impossible de récupérer l\'email Google'
        });
      }

      // Vérifier si l'utilisateur existe déjà
      let user = await userRepo.findByGoogleId(googleUser.id);
      
      if (!user) {
        // Vérifier si un utilisateur avec cet email existe déjà
        user = await userRepo.findByEmail(googleUser.email);
        
        if (user) {
          // Lier le compte Google à l'utilisateur existant
          await userRepo.updateGoogleId(user.id, googleUser.id);
        } else {
          // Créer un nouvel utilisateur
          user = await userRepo.create({
            username: googleUser.email.split('@')[0], // Utiliser la partie avant @ comme username
            email: googleUser.email,
            password: Math.random().toString(36), // Mot de passe temporaire
            display_name: googleUser.name || googleUser.email.split('@')[0],
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
            google_id: googleUser.id,
            data_consent: true
          });
        }
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
        action: 'GOOGLE_LOGIN_SUCCESS',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true,
        details: JSON.stringify({ google_email: googleUser.email })
      });

      // Rediriger vers le frontend avec le token
      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : `${protocol}://localhost:3000`;
      
      reply.redirect(`${frontendUrl}?token=${token}`);

    } catch (error: any) {
      request.log.error('Erreur lors du callback Google:', error);
      
      await userRepo.logSecurityAction({
        action: 'GOOGLE_LOGIN_ERROR',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: false,
        details: JSON.stringify({ error: error.message })
      });

      const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : `${protocol}://localhost:3000`;
      
      reply.redirect(`${frontendUrl}?error=google_auth_failed`);
    }
  });
}