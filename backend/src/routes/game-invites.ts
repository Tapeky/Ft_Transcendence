import { FastifyInstance } from 'fastify';
import { GameManager } from '../websocket/game_manager';
import { authenticateToken } from '../middleware';

// Simple in-memory storage (pas de BDD pour les invites)
const pendingInvites = new Map<string, {
  senderId: number;
  receiverId: number;
  senderUsername: string;
  expiresAt: number;
}>();

export default async function gameInviteRoutes(fastify: FastifyInstance) {
  
  // 📥 Récupérer les invitations en attente
  fastify.get('/pending', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    const user = request.user as { id: number; username: string };
    
    // Nettoyer les invitations expirées d'abord
    const now = Date.now();
    for (const [inviteId, invite] of pendingInvites.entries()) {
      if (now > invite.expiresAt) {
        pendingInvites.delete(inviteId);
      }
    }
    
    // Filtrer les invitations pour cet utilisateur
    const userInvites = Array.from(pendingInvites.entries())
      .filter(([_, invite]) => invite.receiverId === user.id)
      .map(([inviteId, invite]) => ({
        inviteId,
        from: invite.senderUsername,
        fromId: invite.senderId,
        expiresAt: invite.expiresAt
      }));
    
    return reply.send({ success: true, invites: userInvites });
  });

  // 📤 Envoyer une invitation
  fastify.post('/send', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    const { receiverId } = request.body as { receiverId: number };
    const user = request.user as { id: number; username: string };
    
    // Simple validation
    if (!receiverId || receiverId === user.id) {
      return reply.status(400).send({ error: 'Invalid receiver' });
    }
    
    // Vérifier si déjà une invite en cours
    const existingInvite = Array.from(pendingInvites.values())
      .find(invite => invite.senderId === user.id && invite.receiverId === receiverId);
    
    if (existingInvite) {
      return reply.status(400).send({ error: 'Invitation already sent' });
    }
    
    // Créer l'invitation (expire dans 60 secondes)
    const inviteId = `${user.id}_${receiverId}_${Date.now()}`;
    pendingInvites.set(inviteId, {
      senderId: user.id,
      receiverId,
      senderUsername: user.username,
      expiresAt: Date.now() + 60000
    });
    
    // Auto-expiration
    setTimeout(() => pendingInvites.delete(inviteId), 60000);
    
    // Envoyer via WebSocket
    const wsManager = (fastify as any).websocketManager;
    wsManager?.sendToUser(receiverId, {
      type: 'game_invite',
      inviteId,
      from: user.username,
      fromId: user.id
    });
    
    return reply.send({ success: true, inviteId });
  });

  // ✅ Accepter/Refuser une invitation
  fastify.post('/:inviteId/respond', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    const { inviteId } = request.params as { inviteId: string };
    const { action } = request.body as { action: 'accept' | 'decline' };
    const user = request.user as { id: number; username: string };
    
    const invite = pendingInvites.get(inviteId);
    
    // Validations simples
    if (!invite) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }
    
    if (invite.receiverId !== user.id) {
      return reply.status(403).send({ error: 'Not your invitation' });
    }
    
    if (Date.now() > invite.expiresAt) {
      pendingInvites.delete(inviteId);
      return reply.status(400).send({ error: 'Invitation expired' });
    }
    
    // Supprimer l'invitation
    pendingInvites.delete(inviteId);
    
    const wsManager = (fastify as any).websocketManager;
    
    if (action === 'decline') {
      // Juste notifier le refus
      wsManager?.sendToUser(invite.senderId, {
        type: 'game_invite_declined',
        by: user.username
      });
      return reply.send({ success: true, action: 'declined' });
    }
    
    // ACCEPT: Créer la partie immédiatement
    try {
      const gameManager = GameManager.instance;
      const senderSocket = wsManager?.getUser(invite.senderId);
      const receiverSocket = wsManager?.getUser(user.id);
      
      if (!senderSocket || !receiverSocket) {
        return reply.status(400).send({ error: 'Players not connected' });
      }
      
      // Créer la partie
      const gameId = gameManager.startGame(
        invite.senderId,
        user.id,
        senderSocket.socket,
        receiverSocket.socket
      );
      
      // Notifier les joueurs du début de partie
      wsManager.sendToUser(invite.senderId, {
        type: 'game_start',
        gameId: gameId,
        opponent: user.username,
        side: 'left'
      });
      
      wsManager.sendToUser(user.id, {
        type: 'game_start',
        gameId: gameId,
        opponent: invite.senderUsername,
        side: 'right'
      });
      
      return reply.send({ success: true, gameId });
      
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to start game' });
    }
  });
}