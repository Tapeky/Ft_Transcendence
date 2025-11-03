import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { matchRoutes } from './matches';
import { profileRoutes } from './profile';
import { friendRoutes } from './friends';
import { avatarsRoutes } from './avatars';
import { chatRoutes } from './chat';
import { localTournamentRoutes } from './local-tournament';
import { delete_accountRoutes } from './profile';

export async function setupRoutes(server: FastifyInstance) {
  await server.register(
    async function (server) {
      await server.register(authRoutes, { prefix: '/auth' });

      await server.register(userRoutes, { prefix: '/users' });

      await server.register(matchRoutes, { prefix: '/matches' });

     await server.register(async (server) => {
        await profileRoutes(server);
        await delete_accountRoutes(server);
      }, { prefix: '/profile' });

      await server.register(friendRoutes, { prefix: '/friends' });

      await server.register(avatarsRoutes, { prefix: '/avatars' });

      await server.register(chatRoutes, { prefix: '/chat' });

      await server.register(localTournamentRoutes, { prefix: '/local-tournaments' });
    },
    { prefix: '/api' }
  );
}
