import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';

// Middleware d'authentification
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    
    // Le token JWT contient déjà les infos utilisateur
    const payload = request.user as { id: number; username: string; email: string };
    
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);
    
    const user = await userRepo.findById(payload.id);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }
    
    request.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Token d\'authentification invalide'
    });
  }
}

// Configuration des middlewares (version simplifiée et fonctionnelle)
export function setupMiddleware(server: FastifyInstance) {
  // Headers de sécurité basiques
  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
  });
  
  // Log simple des requêtes
  server.addHook('onRequest', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });
  });
}

export { validateInput, validateDisplayname } from './validation';
