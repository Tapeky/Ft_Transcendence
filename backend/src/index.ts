import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from './database/DatabaseManager';
import { setupRoutes } from './routes';
import { setupMiddleware } from './middleware';
import { setupWebSocket } from './websocket';
import { GameManager } from './websocket/game_manager';

// Environment configuration
const PORT = parseInt(process.env.BACKEND_PORT || '8000');
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';

// HTTPS configuration

const httpsOptions = ENABLE_HTTPS ? {
  https: {
    key: fs.readFileSync('/app/ssl/key.pem'),
    cert: fs.readFileSync('/app/ssl/cert.pem')
  }
} : {};

const server = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'info' : 'warn'
  },
  ...httpsOptions
});

async function start() {
  try {
    // 1. Configuration de la base de données
    // Connecting to database...
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    await dbManager.connect(dbPath);
    await dbManager.initialize();
    await dbManager.cleanupExpiredTokens();
    
    // 2. Plugins Fastify
    // Configuring plugins...
    
    // CORS
    const corsProtocol = ENABLE_HTTPS ? 'https' : 'http';
    await server.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : [`${corsProtocol}://localhost:3000`],
      credentials: true
    });
    
    // JWT
    await server.register(jwt, {
      secret: JWT_SECRET as string,
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
    
    // WebSocket
    await server.register(websocket);
    
    // Multipart (pour les uploads)
    await server.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
      }
    });
    
    // Static files (pour servir les uploads)
    await server.register(staticFiles, {
      root: path.join(__dirname, '../uploads'),
      prefix: '/uploads/'
    });
    
    // 3. Middleware global
    // Configuring middleware...
    setupMiddleware(server);
    
    // 4. WebSocket handlers
    // Configuring WebSockets...
    const wsManager = setupWebSocket(server);
    (server as any).websocketManager = wsManager;
    
    // 5. Routes
    // Configuring routes...
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
          local_tournaments: '/api/local-tournament/*',
          matches: '/api/matches/*',
          websocket: '/ws'
        }
      };
    });
    
    // Error Handler
    server.setErrorHandler(async (error, request, reply) => {
      server.log.error(error);
      
      if ((error as any).code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        return reply.status(401).send({
          success: false,
          error: 'Token d\'authentification requis'
        });
      }
      
      if ((error as any).code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return reply.status(401).send({
          success: false,
          error: 'Token d\'authentification invalide'
        });
      }
      
      if ((error as any).validation) {
        return reply.status(400).send({
          success: false,
          error: 'Données invalides',
          details: (error as any).validation
        });
      }
      
      if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.status(409).send({
          success: false,
          error: 'Cette ressource existe déjà'
        });
      }
      
      return reply.status(500).send({
        success: false,
        error: NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur'
      });
    });
    
    // 8. Démarrage du serveur
    await server.listen({ port: PORT, host: HOST });
    const protocol = ENABLE_HTTPS ? 'https' : 'http';
    const wsProtocol = ENABLE_HTTPS ? 'wss' : 'ws';
    
    // Server started successfully - logging only for development
    if (NODE_ENV === 'development') {
      console.log(`
🚀 Serveur ft_transcendence démarré !
📍 URL: ${protocol}://localhost:${PORT}
🌍 Environnement: ${NODE_ENV}
🔒 HTTPS: ${ENABLE_HTTPS ? 'Activé' : 'Désactivé'}
📊 Health check: ${protocol}://localhost:${PORT}/health
📡 WebSocket: ${wsProtocol}://localhost:${PORT}/ws
      `);
    }
    
    if (NODE_ENV === 'production') {
      setInterval(async () => {
        try {
          await dbManager.cleanupExpiredTokens();
        } catch (error) {
          server.log.error('Erreur lors du nettoyage des tokens:', error as any);
        }
      }, 60 * 60 * 1000);
    }

    setInterval(async () => {
      try {
        const db = DatabaseManager.getInstance().getDb();
        const result = await db.run(`
          UPDATE users 
          SET is_online = false 
          WHERE is_online = true 
          AND last_login < datetime('now', '-5 minutes')
        `);
        
        if (result.changes && result.changes > 0) {
          server.log.info(`${result.changes} utilisateurs marqués comme hors ligne (inactifs)`);
        }
      } catch (error) {
        server.log.error('Erreur lors du nettoyage des utilisateurs inactifs:', error as any);
      }
    }, 5 * 60 * 1000);

    GameManager.instance.registerLoop();
  } catch (err) {
    // Server startup error - always log critical errors
    server.log.error(`❌ Erreur de démarrage du serveur: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  // Graceful shutdown signal received
  
  try {
    await server.close();
    await DatabaseManager.getInstance().close();
    // Server shutdown completed
    process.exit(0);
  } catch (error) {
    // Shutdown error
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  server.log.error(`❌ Unhandled Rejection at: ${String(promise)}\nReason: ${reason instanceof Error ? reason.message : String(reason)}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  server.log.error(`❌ Uncaught Exception: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});

start();