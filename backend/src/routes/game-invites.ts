import { FastifyInstance } from 'fastify';
import { DatabaseManager } from '../database/DatabaseManager';
import { GameManager } from '../websocket/game_manager';
import { authenticateToken } from '../middleware';

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
  fastify.post('/game-invites/send', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      console.log('🎮 POST /api/game-invites/send');
      console.log('📝 Request body:', request.body);
      console.log('👤 Request user:', request.user);
      
      const { receiverId } = request.body as { receiverId: number };
      const currentUser = request.user as { id: number; username: string; email: string };
      const senderId = currentUser.id;
      
      console.log('📤 SenderId:', senderId, 'ReceiverId:', receiverId);

      if (!receiverId) {
        return reply.status(400).send({
          success: false,
          message: 'Receiver ID requis'
        });
      }

      // Vérifier que les deux utilisateurs sont amis
      const db = DatabaseManager.getInstance().getDb();
      
      // Nettoyer les invitations expirées avant de vérifier
      await db.run(`
        UPDATE game_invites 
        SET status = 'expired' 
        WHERE status = 'pending' AND expires_at <= datetime('now')
      `);
      console.log('🧹 Cleaned up expired invitations');
      
      const friendship = await db.get(`
        SELECT * FROM friendships 
        WHERE (user_id = ? AND friend_id = ?) 
           OR (user_id = ? AND friend_id = ?)
        AND status = 'accepted'
      `, [senderId, receiverId, receiverId, senderId]);

      console.log('🤝 Friendship check result:', friendship);

      if (!friendship) {
        console.log('❌ No friendship found between users', senderId, 'and', receiverId);
        return reply.status(400).send({
          success: false,
          message: 'Vous devez être amis pour envoyer une invitation'
        });
      }

      // Vérifier s'il n'y a pas déjà une invitation en cours (non expirée)
      const existingInvite = await db.get(`
        SELECT * FROM game_invites 
        WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
      `, [senderId, receiverId]);

      console.log('📋 Existing invite check result:', existingInvite);
      
      if (existingInvite) {
        console.log('🕐 Current time check - expires_at:', existingInvite.expires_at);
        console.log('🕐 Current time check - now:', new Date().toISOString());
        
        const isExpired = new Date() > new Date(existingInvite.expires_at);
        console.log('🕐 Is expired?', isExpired);
        
        if (isExpired) {
          // Marquer comme expiré et continuer
          await db.run(`UPDATE game_invites SET status = 'expired' WHERE id = ?`, [existingInvite.id]);
          console.log('🧹 Marked specific invitation as expired');
        } else {
          console.log('❌ Invitation already exists between users', senderId, 'and', receiverId);
          return reply.status(400).send({
            success: false,
            message: 'Invitation déjà en cours'
          });
        }
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
          s.avatar_url as sender_avatar,
          r.username as receiver_username,
          r.avatar_url as receiver_avatar
        FROM game_invites gi
        JOIN users s ON gi.sender_id = s.id
        JOIN users r ON gi.receiver_id = r.id
        WHERE gi.id = ?
      `, [result.lastID]);

      console.log('✅ Invitation de jeu créée:', invite);

      // Envoyer via WebSocket au destinataire
      const wsManager = (fastify as any).websocketManager;
      console.log('📡 WebSocket Manager available:', !!wsManager);
      
      if (wsManager) {
        console.log('📤 Sending WebSocket message to user', receiverId, 'with invite data');
        const result = wsManager.sendToUser(receiverId, {
          type: 'game_invite_received',
          data: { invite }
        });
        console.log('📡 WebSocket send result:', result);
      } else {
        console.log('❌ WebSocket Manager not available!');
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
  fastify.post('/game-invites/:inviteId/respond', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const { inviteId } = request.params as { inviteId: string };
      const { action } = request.body as { action: 'accept' | 'decline' };
      const currentUser = request.user as { id: number; username: string; email: string };
      const userId = currentUser.id;

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

      // Si l'invitation est acceptée, démarrer automatiquement une partie
      if (action === 'accept') {
        try {
          // Récupérer les sockets WebSocket des deux joueurs
          const senderSocket = wsManager.getUser(invite.sender_id);
          const receiverSocket = wsManager.getUser(userId);

          if (!senderSocket || !receiverSocket) {
            console.warn('🚨 Un des joueurs n\'est pas connecté via WebSocket - skipping auto game start');
            // Don't return error, just skip auto game start
          } else {

          // Vérifier que les joueurs ne sont pas déjà en partie
          const gameManager = GameManager.instance;
          if (gameManager.getFromPlayerId(invite.sender_id) || gameManager.getFromPlayerId(userId)) {
            console.warn('🚨 Un des joueurs est déjà en partie');
            return reply.status(400).send({
              success: false,
              message: 'Un des joueurs est déjà en partie'
            });
          }

          // Démarrer la partie avec GameManager
          const gameId = gameManager.startGame(
            invite.sender_id, 
            userId, 
            senderSocket.socket.socket, 
            receiverSocket.socket.socket
          );

          console.log(`✅ Partie automatiquement créée: ${gameId} entre ${invite.sender_id} et ${userId}`);

          // Récupérer les infos des utilisateurs pour les messages WebSocket
          const db = DatabaseManager.getInstance().getDb();
          const senderInfo = await db.get('SELECT username, avatar_url FROM users WHERE id = ?', [invite.sender_id]);
          const receiverInfo = await db.get('SELECT username, avatar_url FROM users WHERE id = ?', [userId]);

          // Envoyer game_started aux deux joueurs
          wsManager.sendToUser(invite.sender_id, {
            type: 'game_started',
            data: {
              gameId,
              opponent: {
                id: userId,
                username: receiverInfo?.username || 'Unknown',
                avatar: receiverInfo?.avatar_url || null
              },
              playerSide: 'left' // L'expéditeur de l'invitation est à gauche
            }
          });

          wsManager.sendToUser(userId, {
            type: 'game_started',
            data: {
              gameId,
              opponent: {
                id: invite.sender_id,
                username: senderInfo?.username || 'Unknown',
                avatar: senderInfo?.avatar_url || null
              },
              playerSide: 'right' // Le receveur de l'invitation est à droite
            }
          });

          return reply.send({
            success: true,
            data: { action, inviteId, gameId, gameStarted: true }
          });

          } // End of else block for WebSocket check

        } catch (error) {
          console.error('❌ Erreur création automatique de partie:', error);
          return reply.status(500).send({
            success: false,
            message: 'Erreur lors de la création de la partie'
          });
        }
      }

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
  fastify.get('/game-invites/received', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const currentUser = request.user as { id: number; username: string; email: string };
      const userId = currentUser.id;

      const db = DatabaseManager.getInstance().getDb();
      const invites = await db.all(`
        SELECT 
          gi.*,
          s.username as sender_username,
          s.avatar_url as sender_avatar
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