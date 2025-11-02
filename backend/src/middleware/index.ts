import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { validateInputLengths } from './validation';

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();

    const payload = request.user as { id: number; username: string; email: string };
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);

    const user = await userRepo.findById(payload.id);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error_id: "user_not_found",
        error: 'Utilisateur non trouvé',
      });
    }

    request.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error_id: "invalid_auth_token",
      error: "Token d'authentification invalide",
    });
  }
}

export function setupMiddleware(server: FastifyInstance) {
  server.addHook('preHandler', async (request, reply) => {
    const contentLength = request.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      return reply.status(413).send({
        success: false,
        error_id: "content_too_big",
        error: 'Payload trop volumineux (maximum 2MB)',
      });
    }
  });

  server.addHook('preHandler', async (request, reply) => {
    const methodsToValidate = ['POST', 'PUT', 'PATCH'];

    if (methodsToValidate.includes(request.method) && request.body) {
      try {
        validateInputLengths(request.body);
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error_id: "cannot_validate_input",
          error: 'Validation des données échouée',
          details: error instanceof Error ? error.message : 'Données invalides',
        });
      }
    }
  });

  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
  });

  server.addHook('onRequest', async (request) => {
    request.log.info({
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });
}

export {
  validateInput,
  validateDisplayname,
  validateInputLengths,
  VALIDATION_LIMITS,
} from './validation';
