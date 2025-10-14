import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { matchRoutes } from './matches';
import { profileRoutes } from './profile';
import { friendRoutes } from './friends';
import { avatarsRoutes } from './avatars';
import { chatRoutes } from './chat';
import gameInviteRoutes from './game-invites';
import { localTournamentRoutes } from './local-tournament';

export async function setupRoutes(server: FastifyInstance) {
  await server.register(
    async function (server) {
      await server.register(authRoutes, { prefix: '/auth' });

      await server.register(userRoutes, { prefix: '/users' });

      await server.register(matchRoutes, { prefix: '/matches' });

      await server.register(profileRoutes, { prefix: '/profile' });

      await server.register(friendRoutes, { prefix: '/friends' });

      await server.register(avatarsRoutes, { prefix: '/avatars' });

      await server.register(chatRoutes, { prefix: '/chat' });

      await server.register(gameInviteRoutes, { prefix: '/game-invites' });

      await server.register(localTournamentRoutes, { prefix: '/local-tournaments' });
    },
    { prefix: '/api' }
  );
}
