
import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
// Core application routes
import { matchRoutes } from './matches';
import { profileRoutes } from './profile';
import { friendRoutes } from './friends';
import { avatarsRoutes } from './avatars';
import { chatRoutes } from './chat';
import gameInviteRoutes from './game-invites';

export async function setupRoutes(server: FastifyInstance) {
  // Préfixe API
  await server.register(async function (server) {
    // Routes d'authentification
    await server.register(authRoutes, { prefix: '/auth' });
    
    // Routes utilisateurs
    await server.register(userRoutes, { prefix: '/users' });
    
    
    // Routes matches
    await server.register(matchRoutes, { prefix: '/matches' });

    // Routes pour edit le profil utilisateur
    await server.register(profileRoutes, { prefix: '/profile' });

    // Routes amis
    await server.register(friendRoutes, { prefix: '/friends' });

    // Routes avatars
    await server.register(avatarsRoutes, { prefix: '/avatars' });

    // Routes chat
    await server.register(chatRoutes, { prefix: '/chat' });

    // Routes game invites
    await server.register(gameInviteRoutes, { prefix: '/game-invites' });

    
  }, { prefix: '/api' });
}