import { FastifyInstance } from 'fastify';
import { GameManager } from '../websocket/game_manager';
import { authenticateToken } from '../middleware';

const pendingInvites = new Map<
  string,
  {
    senderId: number;
    receiverId: number;
    senderUsername: string;
    expiresAt: number;
  }
>();

export default async function gameInviteRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pending',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      const user = request.user as { id: number; username: string };

      const now = Date.now();
      for (const [inviteId, invite] of pendingInvites.entries()) {
        if (now > invite.expiresAt) {
          pendingInvites.delete(inviteId);
        }
      }

      const userInvites = Array.from(pendingInvites.entries())
        .filter(([_, invite]) => invite.receiverId === user.id)
        .map(([inviteId, invite]) => ({
          inviteId,
          from: invite.senderUsername,
          fromId: invite.senderId,
          expiresAt: invite.expiresAt,
        }));

      return reply.send({ success: true, invites: userInvites });
    }
  );

  fastify.post(
    '/send',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      const { receiverId } = request.body as { receiverId: number };
      const user = request.user as { id: number; username: string };

      if (!receiverId || receiverId === user.id) {
        return reply.status(400).send({ error: 'Invalid receiver' });
      }

      const existingInvite = Array.from(pendingInvites.values()).find(
        invite => invite.senderId === user.id && invite.receiverId === receiverId
      );

      if (existingInvite) {
        return reply.status(400).send({ error: 'Invitation already sent' });
      }

      const inviteId = `${user.id}_${receiverId}_${Date.now()}`;
      pendingInvites.set(inviteId, {
        senderId: user.id,
        receiverId,
        senderUsername: user.username,
        expiresAt: Date.now() + 60000,
      });

      setTimeout(() => pendingInvites.delete(inviteId), 60000);

      const wsManager = (fastify as any).websocketManager;
      wsManager?.sendToUser(receiverId, {
        type: 'game_invite',
        inviteId,
        from: user.username,
        fromId: user.id,
      });

      return reply.send({ success: true, inviteId });
    }
  );

  fastify.post(
    '/:inviteId/respond',
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      const { inviteId } = request.params as { inviteId: string };
      const { action } = request.body as { action: 'accept' | 'decline' };
      const user = request.user as { id: number; username: string };

      const invite = pendingInvites.get(inviteId);

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

      pendingInvites.delete(inviteId);

      const wsManager = (fastify as any).websocketManager;

      if (action === 'decline') {
        wsManager?.sendToUser(invite.senderId, {
          type: 'game_invite_declined',
          by: user.username,
        });
        return reply.send({ success: true, action: 'declined' });
      }

      try {
        const gameManager = GameManager.instance;
        const senderSocket = wsManager?.getUser(invite.senderId);
        const receiverSocket = wsManager?.getUser(user.id);

        if (!senderSocket || !receiverSocket) {
          return reply.status(400).send({ error: 'Players not connected' });
        }

        const gameId = gameManager.startGame(
          invite.senderId,
          user.id,
          senderSocket.socket,
          receiverSocket.socket
        );

        wsManager.sendToUser(invite.senderId, {
          type: 'game_start',
          gameId: gameId,
          opponent: user.username,
          side: 'left',
        });

        wsManager.sendToUser(user.id, {
          type: 'game_start',
          gameId: gameId,
          opponent: invite.senderUsername,
          side: 'right',
        });

        return reply.send({ success: true, gameId });
      } catch (error) {
        return reply.status(500).send({ error: 'Failed to start game' });
      }
    }
  );
}
