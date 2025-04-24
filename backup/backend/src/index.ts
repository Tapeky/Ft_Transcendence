import fastify from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';

// Création de l'instance Fastify
const server: fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({
  logger: true
});

// Route de test
server.get('/', async (request, reply) => {
  return { message: 'API Ft_Transcendence est opérationnelle !' };
});

// Fonction pour démarrer le serveur
const start = async () => {
  try {
    await server.listen({ port: 8000, host: '0.0.0.0' });
    console.log('Serveur démarré sur le port 8000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();