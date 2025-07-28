import { FastifyInstance } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';

// Types pour les invitations de jeu
export interface GameInvite {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  sender_username: string;
  sender_avatar: string;
  receiver_username: string;
  receiver_avatar: string;
}

export default async function gameInviteRoutes(fastify: FastifyInstance) {
  console.log('🎮 Configuration des routes game invites...');

  // Route pour envoyer une invitation de jeu
  fastify.post('/api/game-invites/send', async (request, reply) => {
    try {
      console.log('🎮 POST /api/game-invites/send');
      
      const { receiverId } = request.body as { receiverId: number };
      const senderId = (request as any).userId;

      if (!receiverId) {
        return reply.status(400).send({
          success: false,
          message: 'Receiver ID requis'
        });
      }

      // Vérifier que les deux utilisateurs sont amis
      const db = DatabaseManager.getInstance().getDb();
      const friendship = await db.get(`
        SELECT * FROM friendships 
        WHERE (user1_id = ? AND user2_id = ?) 
           OR (user1_id = ? AND user2_id = ?)
        AND status = 'accepted'
      `, [senderId, receiverId, receiverId, senderId]);

      if (!friendship) {
        return reply.status(400).send({
          success: false,
          message: 'Vous devez être amis pour envoyer une invitation'
        });
      }

      // Vérifier s'il n'y a pas déjà une invitation en cours
      const existingInvite = await db.get(`
        SELECT * FROM game_invites 
        WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
      `, [senderId, receiverId]);

      if (existingInvite) {
        return reply.status(400).send({
          success: false,
          message: 'Invitation déjà en cours'
        });
      }

      // Calculer l'expiration (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Créer l'invitation
      const result = await db.run(`
        INSERT INTO game_invites (sender_id, receiver_id, status, expires_at)
        VALUES (?, ?, 'pending', ?)
      `, [senderId, receiverId, expiresAt]);

      // Récupérer l'invitation complète avec les infos utilisateurs
      const invite = await db.get(`
        SELECT 
          gi.*,
          s.username as sender_username,
          s.avatar as sender_avatar,
          r.username as receiver_username,
          r.avatar as receiver_avatar
        FROM game_invites gi
        JOIN users s ON gi.sender_id = s.id
        JOIN users r ON gi.receiver_id = r.id
        WHERE gi.id = ?
      `, [result.lastID]);

      console.log('✅ Invitation de jeu créée:', invite);

      // Envoyer via WebSocket au destinataire
      const wsManager = (fastify as any).websocketManager;
      if (wsManager) {
        wsManager.sendToUser(receiverId, {
          type: 'game_invite_received',
          data: { invite }
        });
      }

      return reply.send({
        success: true,
        data: { invite }
      });

    } catch (error) {
      console.error('❌ Erreur envoi invitation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });

  // Route pour répondre à une invitation
  fastify.post('/api/game-invites/:inviteId/respond', async (request, reply) => {
    try {
      const { inviteId } = request.params as { inviteId: string };
      const { action } = request.body as { action: 'accept' | 'decline' };
      const userId = (request as any).userId;

      const db = DatabaseManager.getInstance().getDb();
      const invite = await db.get(`
        SELECT * FROM game_invites WHERE id = ? AND receiver_id = ?
      `, [parseInt(inviteId), userId]);

      if (!invite) {
        return reply.status(404).send({
          success: false,
          message: 'Invitation non trouvée'
        });
      }

      if (invite.status !== 'pending') {
        return reply.status(400).send({
          success: false,
          message: 'Invitation déjà traitée'
        });
      }

      // Vérifier l'expiration
      if (new Date() > new Date(invite.expires_at)) {
        await db.run(`
          UPDATE game_invites SET status = 'expired' WHERE id = ?
        `, [parseInt(inviteId)]);

        return reply.status(400).send({
          success: false,
          message: 'Invitation expirée'
        });
      }

      // Mettre à jour le statut
      await db.run(`
        UPDATE game_invites SET status = ? WHERE id = ?
      `, [action === 'accept' ? 'accepted' : 'declined', parseInt(inviteId)]);

      console.log(`✅ Invitation ${action === 'accept' ? 'acceptée' : 'refusée'}:`, inviteId);

      // Récupérer le nom de l'utilisateur qui répond
      const responder = await db.get(`
        SELECT username FROM users WHERE id = ?
      `, [userId]);

      // Envoyer la réponse via WebSocket à l'expéditeur
      const wsManager = (fastify as any).websocketManager;
      if (wsManager) {
        wsManager.sendToUser(invite.sender_id, {
          type: 'game_invite_response',
          data: { 
            action, 
            inviteId: parseInt(inviteId),
            responderId: userId,
            responderUsername: responder?.username || 'Unknown'
          }
        });
      }

      // TODO: Si acceptée, créer une partie ou rediriger vers le jeu

      return reply.send({
        success: true,
        data: { action, inviteId }
      });

    } catch (error) {
      console.error('❌ Erreur réponse invitation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });

  // Route pour récupérer les invitations reçues
  fastify.get('/api/game-invites/received', async (request, reply) => {
    try {
      const userId = (request as any).userId;

      const db = DatabaseManager.getInstance().getDb();
      const invites = await db.all(`
        SELECT 
          gi.*,
          s.username as sender_username,
          s.avatar as sender_avatar
        FROM game_invites gi
        JOIN users s ON gi.sender_id = s.id
        WHERE gi.receiver_id = ? AND gi.status = 'pending'
        AND gi.expires_at > datetime('now')
        ORDER BY gi.created_at DESC
      `, [userId]);

      return reply.send({
        success: true,
        data: { invites }
      });

    } catch (error) {
      console.error('❌ Erreur récupération invitations:', error);
      return reply.status(500).send({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });

  console.log('✅ Routes game invites configurées');
}