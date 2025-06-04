import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';

// Middleware d'authentification
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Vérifier le token JWT
    await request.jwtVerify();
    
    // Récupérer l'utilisateur depuis la base de données
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);
    
    const user = await userRepo.findById((request.user as any).id);
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }
    
    // Ajouter les infos utilisateur à la request
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

// Middleware de logging des requêtes
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const start = Date.now();
  
  request.server.addHook('onSend', async (request, reply) => {
    const duration = Date.now() - start;
    
    // Log de la requête
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request.user as any)?.id
    });
    
    // Log de sécurité pour les actions sensibles
    if (shouldLogSecurityAction(request)) {
      await logSecurityAction(request, reply);
    }
  });
}

// Middleware de limitation de taux (rate limiting)
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async function rateLimiter(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const key = request.ip + ':' + ((request.user as any)?.id || 'anonymous');
    const now = Date.now();
    
    // Nettoyer les entrées expirées
    for (const [k, v] of requests.entries()) {
      if (now > v.resetTime) {
        requests.delete(k);
      }
    }
    
    // Vérifier la limite pour cette IP/utilisateur
    const current = requests.get(key);
    
    if (!current) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }
    
    if (current.count >= maxRequests) {
      return reply.status(429).send({
        success: false,
        error: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
    
    current.count++;
  };
}

// Middleware de validation des entrées
export function validateInput(schema: any) {
  return async function validator(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Validation basique (tu peux utiliser Joi, Yup ou autre)
      if (schema.body) {
        validateObject(request.body, schema.body);
      }
      
      if (schema.params) {
        validateObject(request.params, schema.params);
      }
      
      if (schema.query) {
        validateObject(request.query, schema.query);
      }
      
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: 'Données invalides',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

// Middleware de sécurité headers
export async function securityHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Headers de sécurité basiques
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP basique
  reply.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' ws: wss:;"
  );
  
  if (process.env.ENABLE_HTTPS === 'true') {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

// Configuration des middlewares
export function setupMiddleware(server: FastifyInstance) {
  // Headers de sécurité sur toutes les routes
  server.addHook('onRequest', securityHeaders);
  
  // Logging des requêtes
  server.addHook('onRequest', requestLogger);
  
  // Rate limiting global (100 req/min par IP)
  const globalRateLimit = createRateLimiter(100, 60 * 1000);
  server.addHook('onRequest', globalRateLimit);
  
  // Rate limiting strict pour l'auth (5 req/min par IP)
  const authRateLimit = createRateLimiter(5, 60 * 1000);
  server.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/auth/')) {
      await authRateLimit(request, reply);
    }
  });
}

// Utilitaires
function shouldLogSecurityAction(request: FastifyRequest): boolean {
  const sensitiveRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/users/password',
    '/api/users/delete'
  ];
  
  return sensitiveRoutes.some(route => request.url.startsWith(route)) ||
         ['POST', 'PUT', 'DELETE'].includes(request.method);
}

async function logSecurityAction(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);
    
    await userRepo.logSecurityAction({
      user_id: (request.user as any)?.id,
      action: `${request.method} ${request.url}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      success: reply.statusCode < 400,
      details: JSON.stringify({
        statusCode: reply.statusCode,
        method: request.method,
        url: request.url
      })
    });
  } catch (error) {
    request.log.error('Erreur lors du logging de sécurité:', error);
  }
}

function validateObject(obj: any, schema: any): void {
  // Validation basique - tu peux l'améliorer avec une vraie lib
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj?.[key];
    const ruleSet = rules as any;
    
    if (ruleSet.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Le champ '${key}' est requis`);
    }
    
    if (value !== undefined && ruleSet.type) {
      if (ruleSet.type === 'string' && typeof value !== 'string') {
        throw new Error(`Le champ '${key}' doit être une chaîne de caractères`);
      }
      
      if (ruleSet.type === 'number' && typeof value !== 'number') {
        throw new Error(`Le champ '${key}' doit être un nombre`);
      }
      
      if (ruleSet.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error(`Le champ '${key}' doit être un email valide`);
        }
      }
    }
    
    if (value && ruleSet.minLength && value.length < ruleSet.minLength) {
      throw new Error(`Le champ '${key}' doit faire au moins ${ruleSet.minLength} caractères`);
    }
    
    if (value && ruleSet.maxLength && value.length > ruleSet.maxLength) {
      throw new Error(`Le champ '${key}' ne peut pas dépasser ${ruleSet.maxLength} caractères`);
    }
  }
}