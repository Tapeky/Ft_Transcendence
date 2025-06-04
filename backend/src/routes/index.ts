// backend/src/routes/index.ts

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { tournamentRoutes } from './tournaments';
import { matchRoutes } from './matches';

export async function setupRoutes(server: FastifyInstance) {
  // Préfixe API
  await server.register(async function (server) {
    // Routes d'authentification
    await server.register(authRoutes, { prefix: '/auth' });
    
    // Routes utilisateurs
    await server.register(userRoutes, { prefix: '/users' });
    
    // Routes tournois
    await server.register(tournamentRoutes, { prefix: '/tournaments' });
    
    // Routes matches
    await server.register(matchRoutes, { prefix: '/matches' });
    
  }, { prefix: '/api' });
}