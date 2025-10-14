import { FastifyInstance } from 'fastify';
import { MatchController } from './MatchController';

export async function matchRoutes(server: FastifyInstance) {
  const matchController = new MatchController();
  matchController.registerRoutes(server);
}
