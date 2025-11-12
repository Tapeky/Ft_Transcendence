import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import fs from 'fs';
import path from 'path';

import { DatabaseManager } from './database/DatabaseManager';
import { ensureSchema } from './database/init';
import { setupRoutes } from './routes';
import { setupMiddleware } from './middleware';
import { setupWebSocket } from './websocket';
import { VaultService } from './vault/vault';


const vaultService = VaultService.getInstance();
// Environment configuration
const PORT = parseInt(process.env.BACKEND_PORT || '8000');
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';

const httpsOptions = ENABLE_HTTPS
  ? {
      https: {
        key: fs.readFileSync('/app/ssl/key.pem'),
        cert: fs.readFileSync('/app/ssl/cert.pem'),
      },
    }
  : {};

const server = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'info' : 'warn',
  },
  bodyLimit: 2 * 1024 * 1024, // 2MB body limit for security
  ...httpsOptions,
});

async function start() {
  try {
    await vaultService.initialize().catch(err => {
      console.error('❌ Impossible de charger les secrets depuis Vault:', err);
    });
    await vaultService.getOAuthSecrets(); // Ensure secrets are loaded
    await vaultService.getJwtSecret(); // Ensure JWT secret is loaded
    // 1. Configuration de la base de données
    console.log('🔌 Connexion à la base de données...');
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(
      process.env.DB_PATH || './db',
      process.env.DB_NAME || 'ft_transcendence.db'
    );
    await dbManager.connect(dbPath);
    await dbManager.initialize();
    await ensureSchema();
    await dbManager.cleanupExpiredTokens();

    await server.register(jwt, {
      secret: JWT_SECRET,
      sign: {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
    });

    await server.register(websocket);

    await server.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
      },
    });

    await server.register(staticFiles, {
      root: path.join(__dirname, '../uploads'),
      prefix: '/uploads/',
    });

    setupMiddleware(server);
    setupWebSocket(server);
    setupRoutes(server);

    server.get('/health', async () => {
      const dbStats = await dbManager.getStats();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbStats,
        uptime: process.uptime(),
      };
    });

    server.get('/', async () => {
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
          websocket: '/ws',
        },
      };
    });

    server.setErrorHandler(async (error, _request, reply) => {
      server.log.error(error);

      const errorWithCode = error as Error & { code?: string; validation?: unknown };

      if (errorWithCode.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        return reply.status(401).send({
          success: false,
          error_id: "auth_token_missing",
          error: "Token d'authentification requis",
        });
      }

      if (errorWithCode.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return reply.status(401).send({
          success: false,
          error_id: "auth_token_invalid",
          error: "Token d'authentification invalide",
        });
      }

      if (errorWithCode.validation) {
        return reply.status(400).send({
          success: false,
          error_id: "invalid_input",
          error: 'Données invalides',
          details: errorWithCode.validation,
        });
      }

      if (errorWithCode.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.status(409).send({
          success: false,
          error_id: "duplicate_resource",
          error: 'Cette ressource existe déjà',
        });
      }

      return reply.status(500).send({
        success: false,
        error_id: "internal_error",
        error: NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur',
      });
    });

    await server.listen({ port: PORT, host: HOST });
    const protocol = ENABLE_HTTPS ? 'https' : 'http';
    const wsProtocol = ENABLE_HTTPS ? 'wss' : 'ws';

    console.log(`
🚀 Serveur ft_transcendence démarré !
📍 URL: ${protocol}://localhost:${PORT}
🌍 Environnement: ${NODE_ENV}
🔒 HTTPS: ${ENABLE_HTTPS ? 'Activé' : 'Désactivé'}
📊 Health check: ${protocol}://localhost:${PORT}/health
📡 WebSocket: ${wsProtocol}://localhost:${PORT}/ws
    `);

    if (NODE_ENV === 'production') {
      setInterval(async () => {
        try {
          await dbManager.cleanupExpiredTokens();
        } catch (error) {
          server.log.error('Erreur lors du nettoyage des tokens:' + (error instanceof Error ? error.message : String(error)));
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
        server.log.error('Erreur lors du nettoyage des utilisateurs inactifs:' + (error instanceof Error ? error.message : String(error)));
      }
    }, 5 * 60 * 1000);

    // SimplePongManager now handles all games automatically
  } catch (err) {
    server.log.error('❌ Erreur de démarrage du serveur:'+ (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);

  try {
    await server.close();
    await DatabaseManager.getInstance().close();
    console.log('Server stopped');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

start();
