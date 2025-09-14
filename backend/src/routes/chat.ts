import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { ChatRepository } from '../repositories/ChatRepository';
import { authenticateToken, validateInput } from '../middleware';
import { 
  CreateConversationRequest, 
  SendMessageRequest,
  ConversationListResponse,
  ConversationMessagesResponse 
} from '../types/chat';

export async function chatRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const chatRepo = new ChatRepository(db);

  // GET /api/chat/conversations - Liste des conversations de l'utilisateur
  server.get('/conversations', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      
      const conversations = await chatRepo.getUserConversations(currentUser.id);
      
      reply.send({
        success: true,
        data: { conversations }
      } as { success: boolean; data: ConversationListResponse });

    } catch (error: any) {
      request.log.error('Erreur récupération conversations:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des conversations'
      });
    }
  });

  // POST /api/chat/conversations - Créer ou récupérer conversation avec un utilisateur
  server.post('/conversations', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          withUserId: { required: true, type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const body = request.body as CreateConversationRequest;
      
      if (body.withUserId === currentUser.id) {
        return reply.status(400).send({
          success: false,
          error: 'Vous ne pouvez pas créer une conversation avec vous-même'
        });
      }

      const conversation = await chatRepo.getOrCreateConversation(
        currentUser.id, 
        body.withUserId
      );
      
      reply.send({
        success: true,
        data: { conversation },
        message: 'Conversation créée ou récupérée avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur création conversation:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création de la conversation'
      });
    }
  });

  // GET /api/chat/conversations/:id - Détails d'une conversation
  server.get('/conversations/:id', {
    preHandler: [
      authenticateToken,
      validateInput({
        params: {
          id: { required: true, type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const params = request.params as { id: number };
      
      const conversation = await chatRepo.getConversationById(params.id, currentUser.id);
      
      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: 'Conversation non trouvée'
        });
      }
      
      reply.send({
        success: true,
        data: { conversation }
      });

    } catch (error: any) {
      request.log.error('Erreur récupération conversation:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération de la conversation'
      });
    }
  });

  // GET /api/chat/conversations/:id/messages - Messages d'une conversation avec pagination
  server.get('/conversations/:id/messages', {
    preHandler: [
      authenticateToken,
      validateInput({
        params: {
          id: { required: true, type: 'number' }
        },
        query: {
          page: { type: 'number' },
          limit: { type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const params = request.params as { id: number };
      const query = request.query as { page?: number; limit?: number };
      
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 50));
      const offset = (page - 1) * limit;
      
      const messages = await chatRepo.getConversationMessages(
        params.id, 
        currentUser.id, 
        limit, 
        offset
      );
      
      // Marquer la conversation comme lue
      await chatRepo.markConversationAsRead(params.id, currentUser.id);
      
      reply.send({
        success: true,
        data: {
          messages,
          pagination: {
            total: messages.length, // Note: Implement proper total count for pagination
            page,
            limit,
            hasMore: messages.length === limit
          }
        } as ConversationMessagesResponse
      });

    } catch (error: any) {
      request.log.error('Erreur récupération messages:', error);
      
      if (error.message.includes('non trouvée') || error.message.includes('non autorisé')) {
        return reply.status(404).send({
          success: false,
          error: error.message
        });
      }
      
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des messages'
      });
    }
  });

  // POST /api/chat/conversations/:id/messages - Envoyer un message
  server.post('/conversations/:id/messages', {
    preHandler: [
      authenticateToken,
      validateInput({
        params: {
          id: { required: true, type: 'number' }
        },
        body: {
          content: { required: true, type: 'string', minLength: 1, maxLength: 2000 },
          type: { type: 'string' },
          metadata: { type: 'object' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const params = request.params as { id: number };
      const body = request.body as SendMessageRequest;
      
      const message = await chatRepo.createMessage({
        conversation_id: params.id,
        sender_id: currentUser.id,
        content: body.content.trim(),
        type: body.type || 'text',
        metadata: body.metadata
      });
      
      reply.send({
        success: true,
        data: { message },
        message: 'Message envoyé avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur envoi message:', error);
      
      if (error.message.includes('non trouvée') || error.message.includes('non autorisé')) {
        return reply.status(404).send({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('bloqué')) {
        return reply.status(403).send({
          success: false,
          error: error.message
        });
      }
      
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'envoi du message'
      });
    }
  });

  // DELETE /api/chat/conversations/:id - Supprimer une conversation
  server.delete('/conversations/:id', {
    preHandler: [
      authenticateToken,
      validateInput({
        params: {
          id: { required: true, type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const params = request.params as { id: number };
      
      await chatRepo.deleteConversation(params.id, currentUser.id);
      
      reply.send({
        success: true,
        message: 'Conversation supprimée avec succès'
      });

    } catch (error: any) {
      request.log.error('Erreur suppression conversation:', error);
      
      if (error.message.includes('non trouvée') || error.message.includes('non autorisé')) {
        return reply.status(404).send({
          success: false,
          error: error.message
        });
      }
      
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la suppression de la conversation'
      });
    }
  });
}