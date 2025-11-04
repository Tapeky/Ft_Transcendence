import { WebSocketManager } from './WebSocketManager';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import { SimplePongManager } from './SimplePongManager';

interface FriendInvite {
  id: string;
  fromUserId: number;
  toUserId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class FriendPongInvites {
  private invites = new Map<string, FriendInvite>();
  private rateLimits = new Map<number, RateLimitEntry>();

  private readonly MAX_INVITES = 1000; // Max invites in memory
  private readonly MAX_INVITES_PER_USER = 5; // Max pending invites per user
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 5; // Max 5 invites per minute per user

  constructor(private wsManager: WebSocketManager) {
    setInterval(() => this.cleanupExpired(), 60000);
    setInterval(() => this.cleanupRateLimits(), 600000);
  }

  async createInvite(fromUserId: number, toUserId: number): Promise<string | null> {
    if (!this.checkRateLimit(fromUserId)) {
      return null;
    }

    if (this.invites.size >= this.MAX_INVITES) {
      this.cleanupOldestInvites();
    }

    const userInviteCount = Array.from(this.invites.values()).filter(
      inv => inv.fromUserId === fromUserId && inv.status === 'pending'
    ).length;

    if (userInviteCount >= this.MAX_INVITES_PER_USER) {
      console.log(
        `🚫 [FriendPongInvites] Trop d'invitations en cours pour utilisateur ${fromUserId}`
      );
      return null;
    }

    const db = DatabaseManager.getInstance().getDb();

    const result = await db.get(
      `
      SELECT u.username, f.status as friendship_status
      FROM users u
      LEFT JOIN friendships f ON (
        (f.user_id = ? AND f.friend_id = u.id) OR
        (f.user_id = u.id AND f.friend_id = ?)
      ) AND f.status = 'accepted'
      WHERE u.id = ?
    `,
      [fromUserId, fromUserId, fromUserId]
    );

    const fromUsername = result?.username || 'Un ami';

    const friendship = await db.get(
      `
      SELECT 1 FROM friendships
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
      LIMIT 1
    `,
      [fromUserId, toUserId, toUserId, fromUserId]
    );

    if (!friendship) {
      return null; // Pas amis
    }

    const existingInvite = Array.from(this.invites.values()).find(
      inv => inv.fromUserId === fromUserId && inv.toUserId === toUserId && inv.status === 'pending'
    );

    if (existingInvite) {
      return existingInvite.id;
    }

    const inviteId = `friend_pong_${fromUserId}_${toUserId}_${Date.now()}`;
    const invite: FriendInvite = {
      id: inviteId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 120000, // 2 minutes
    };

    this.invites.set(inviteId, invite);

    this.wsManager.sendToUser(toUserId, {
      type: 'friend_pong_invite',
      inviteId,
      fromUserId,
      fromUsername,
      toUserId,
      expiresAt: invite.expiresAt,
      sentAt: invite.createdAt,
      status: invite.status,
    });

    return inviteId;
  }

  async acceptInvite(inviteId: string, userId: number): Promise<boolean> {
    const invite = this.invites.get(inviteId);
    const now = Date.now();

    const validInvite = invite !== undefined;
    const correctUser = invite?.toUserId === userId;
    const pendingStatus = invite?.status === 'pending';
    const notExpired = invite ? now <= invite.expiresAt : false;

    const canAccept = validInvite && correctUser && pendingStatus && notExpired;

    if (!canAccept) {
      if (validInvite && invite && now > invite.expiresAt) {
        this.invites.delete(inviteId);
      }
      return false;
    }

    const gameId = `pong_${invite.fromUserId}_${invite.toUserId}_${Date.now()}`;
    const simplePongManager = SimplePongManager.getInstance();
    const gameStarted = await simplePongManager.startGame(
      gameId,
      invite.fromUserId,
      invite.toUserId
    );

    if (!gameStarted) {
      console.error(`❌ [FriendPongInvites] Impossible de créer le jeu ${gameId}`);
      invite!.status = 'pending';

      this.wsManager.sendToUser(invite.fromUserId, {
        type: 'friend_pong_error',
        inviteId,
        message: 'Impossible de créer la partie. Réessayez plus tard.',
      });

      this.wsManager.sendToUser(invite.toUserId, {
        type: 'friend_pong_error',
        inviteId,
        message: 'Impossible de créer la partie. Réessayez plus tard.',
      });

      return false;
    }

    invite!.status = 'accepted';

    const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
    const frontendUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : `${protocol}://localhost:3000`;
    const gameUrl = `${frontendUrl}/simple-pong?gameId=${gameId}`;

    this.wsManager.sendToUser(invite.fromUserId, {
      type: 'friend_pong_accepted',
      inviteId,
      gameId,
      gameUrl,
      role: 'left',
      opponentId: invite.toUserId,
    });

    this.wsManager.sendToUser(invite.toUserId, {
      type: 'friend_pong_accepted',
      inviteId,
      gameId,
      gameUrl,
      role: 'right',
      opponentId: invite.fromUserId,
    });

    this.invites.delete(inviteId);
    return true;
  }

  declineInvite(inviteId: string, userId: number): boolean {
    const invite = this.invites.get(inviteId);

    const validInvite = invite !== undefined;
    const correctUser = invite?.toUserId === userId;
    const canDecline = validInvite && correctUser;

    if (!canDecline) {
      return false;
    }

    invite!.status = 'declined';

    this.wsManager.sendToUser(invite!.fromUserId, {
      type: 'friend_pong_declined',
      inviteId,
      fromUserId: invite.fromUserId,
      toUserId: invite.toUserId,
      declinedBy: userId,
      declinedAt: Date.now(),
      status: 'declined',
    });

    this.invites.delete(inviteId);
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, invite] of this.invites.entries()) {
      if (now > invite.expiresAt) {
        if (invite.status === 'pending') {
          this.wsManager.sendToUser(invite.fromUserId, {
            type: 'friend_pong_expired',
            inviteId: id,
            fromUserId: invite.fromUserId,
            toUserId: invite.toUserId,
            expiredAt: now,
            status: 'expired',
          });
        }
        this.invites.delete(id);
      }
    }
  }

  private checkRateLimit(userId: number): boolean {
    const now = Date.now();
    const rateLimitEntry = this.rateLimits.get(userId);

    if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (rateLimitEntry.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    rateLimitEntry.count++;
    return true;
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [userId, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(userId);
      }
    }
  }

  private cleanupOldestInvites(): void {
    if (this.invites.size === 0) return;

    const entries = Array.from(this.invites.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      const [id, invite] = entries[i];
      if (invite.status === 'pending') {
        this.wsManager.sendToUser(invite.fromUserId, {
          type: 'friend_pong_expired',
          inviteId: id,
          fromUserId: invite.fromUserId,
          toUserId: invite.toUserId,
          expiredAt: Date.now(),
          status: 'expired',
        });
      }
      this.invites.delete(id);
    }
  }
}
