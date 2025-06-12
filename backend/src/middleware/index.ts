// backend/src/middleware/index.ts

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
    
    // Le token JWT contient déjà les infos utilisateur
    const payload = request.user as { id: number; username: string; email: string };
    
    // Récupérer l'utilisateur depuis la base de données pour vérification
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);
    
    const user = await userRepo.findById(payload.id);
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

// Middleware de validation des entrées
export function validateInput(schema: any) {
  return async function validator(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      if (schema.body) {
        validateObject(request.body, schema.body);
      }
      
      if (schema.params) {
        validateObject(request.params, schema.params);
      }
      
      if (schema.query) {
        validateObject(request.query, schema.query);
      }
      
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: 'Données invalides',
        details: error.message
      });
    }
  };
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

// Utilitaire de validation
function validateObject(obj: any, schema: any): void {
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
      
      if (ruleSet.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Le champ '${key}' doit être un booléen`);
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

// Middleware pour valider le nouveau pseudo
export async function validateDisplayname(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = request.body;
  if (!data || typeof data !== 'object')
    return reply.status(400).send({error: "Invalid request body"});

  const dataObj = data as any;
  if (!dataObj.display_name || typeof dataObj.display_name !== 'string')
    return reply.status(400).send({error: "display_name is required and must be a string"});
  
  const displayname = dataObj.display_name;

  if (displayname.length > 12) {
    return reply.status(400).send({
      success: false,
      error: 'Le pseudo ne peut pas dépasser 12 caractères'
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(displayname)) {
    return reply.status(400).send({
      success: false,
      error: 'Le pseudo ne peut contenir que des lettres, chiffres et underscores'
    });
  }
  
  return;
}