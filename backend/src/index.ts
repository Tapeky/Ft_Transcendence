// backend/src/index.ts

import fastify from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { DatabaseManager } from './database/DatabaseManager';
import { setupRoutes } from './routes';
import { setupMiddleware } from './middleware';
import { setupWebSocket } from './websocket';
import path from 'path';

// Configuration
const PORT = parseInt(process.env.BACKEND_PORT || '8000');
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Création de l'instance Fastify
const server: fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'info' : 'warn',
    prettyPrint: NODE_ENV === 'development'
  }
});

// Plugin pour déclarer les types
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
    };
  }
}

async function start() {
  try {
    // 1. Configuration de la base de données
    console.log('🔌 Connexion à la base de données...');
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    await dbManager.connect(dbPath);
    await dbManager.initialize();
    
    // Nettoyage des tokens expirés au démarrage
    await dbManager.cleanupExpiredTokens();
    
    // 2. Plugins Fastify
    console.log('🔧 Configuration des plugins...');
    
    // CORS
    await server.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : ['http://localhost:3000'],
      credentials: true
    });
    
    // JWT
    await server.register(jwt, {
      secret: JWT_SECRET,
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
    
    // WebSocket
    await server.register(websocket);
    
    // 3. Middleware global
    console.log('🔒 Configuration des middlewares...');
    setupMiddleware(server);
    
    // 4. WebSocket handlers
    console.log('🌐 Configuration des WebSockets...');
    setupWebSocket(server);
    
    // 5. Routes
    console.log('🛣️ Configuration des routes...');
    setupRoutes(server);
    
    // 6. Routes de santé et monitoring
    server.get('/health', async (request, reply) => {
      const dbStats = await dbManager.getStats();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbStats,
        uptime: process.uptime()
      };
    });
    
    // Route racine
    server.get('/', async (request, reply) => {
      return {
        name: 'ft_transcendence API',
        version: '1.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          auth: '/api/auth/*',
          users: '/api/users/*',
          tournaments: '/api/tournaments/*',
          matches: '/api/matches/*',
          websocket: '/ws'
        }
      };
    });
    
    // 7. Gestion d'erreurs globale
    server.setErrorHandler(async (error, request, reply) => {
      server.log.error(error);
      
      // Erreurs JWT
      if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        return reply.status(401).send({
          success: false,
          error: 'Token d\'authentification requis'
        });
      }
      
      if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return reply.status(401).send({
          success: false,
          error: 'Token d\'authentification invalide'
        });
      }
      
      // Erreurs de validation
      if (error.validation) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: error.validation
        });
      }
      
      // Erreurs SQLite
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.status(409).send({
          success: false,
          error: 'Cette ressource existe déjà'
        });
      }
      
      // Erreur générique
      return reply.status(500).send({
        success: false,
        error: NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur'
      });
    });
    
    // 8. Démarrage du serveur
    await server.listen({ port: PORT, host: HOST });
    console.log(`
🚀 Serveur ft_transcendence démarré !
📍 URL: http://localhost:${PORT}
🌍 Environnement: ${NODE_ENV}
📊 Health check: http://localhost:${PORT}/health
📡 WebSocket: ws://localhost:${PORT}/ws
    `);
    
    // 9. Tâches de maintenance
    if (NODE_ENV === 'production') {
      // Nettoyage des tokens expirés toutes les heures
      setInterval(async () => {
        try {
          await dbManager.cleanupExpiredTokens();
        } catch (error) {
          server.log.error('Erreur lors du nettoyage des tokens:', error);
        }
      }, 60 * 60 * 1000); // 1 heure
    }
    
  } catch (err) {
    server.log.error('❌ Erreur de démarrage du serveur:', err);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Signal ${signal} reçu, arrêt du serveur...`);
  
  try {
    await server.close();
    await DatabaseManager.getInstance().close();
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt:', error);
    process.exit(1);
  }
}

// Écouter les signaux d'arrêt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Démarrer le serveur
start();