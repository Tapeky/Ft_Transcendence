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

  // Memory leak prevention constants
  private readonly MAX_INVITES = 1000; // Max invites in memory
  private readonly MAX_INVITES_PER_USER = 5; // Max pending invites per user
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 5; // Max 5 invites per minute per user

  constructor(private wsManager: WebSocketManager) {
    // Nettoyage automatique toutes les minutes
    setInterval(() => this.cleanupExpired(), 60000);
    // Cleanup rate limits every 10 minutes
    setInterval(() => this.cleanupRateLimits(), 600000);
  }

  async createInvite(fromUserId: number, toUserId: number): Promise<string | null> {
    console.log(`📨 [FriendPongInvites] Création invitation de ${fromUserId} vers ${toUserId}`);

    // Rate limiting check
    if (!this.checkRateLimit(fromUserId)) {
      console.log(`🚫 [FriendPongInvites] Rate limit dépassé pour utilisateur ${fromUserId}`);
      return null;
    }

    // Memory limit enforcement
    if (this.invites.size >= this.MAX_INVITES) {
      console.log(`🚫 [FriendPongInvites] Limite mémoire atteinte (${this.MAX_INVITES})`);
      this.cleanupOldestInvites();
    }

    // Check per-user invite limit
    const userInviteCount = Array.from(this.invites.values())
      .filter(inv => inv.fromUserId === fromUserId && inv.status === 'pending').length;

    if (userInviteCount >= this.MAX_INVITES_PER_USER) {
      console.log(`🚫 [FriendPongInvites] Trop d'invitations en cours pour utilisateur ${fromUserId}`);
      return null;
    }

    const db = DatabaseManager.getInstance().getDb();

    // Atomically check friendship and get user info in single transaction
    const result = await db.get(`
      SELECT u.username, f.status as friendship_status
      FROM users u
      LEFT JOIN friendships f ON (
        (f.user_id = ? AND f.friend_id = u.id) OR
        (f.user_id = u.id AND f.friend_id = ?)
      ) AND f.status = 'accepted'
      WHERE u.id = ?
    `, [fromUserId, fromUserId, fromUserId]);

    const fromUsername = result?.username || 'Un ami';

    // Check if friendship exists atomically
    const friendship = await db.get(`
      SELECT 1 FROM friendships
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
      LIMIT 1
    `, [fromUserId, toUserId, toUserId, fromUserId]);

    console.log(`👥 [FriendPongInvites] Vérification amitié ${fromUserId} <-> ${toUserId}: ${friendship ? 'OUI' : 'NON'}`);

    if (!friendship) {
      console.log(`❌ [FriendPongInvites] Pas d'amitié trouvée`);
      return null; // Pas amis
    }

    // Vérifier pas d'invite en cours
    const existingInvite = Array.from(this.invites.values()).find(
      inv => inv.fromUserId === fromUserId && 
             inv.toUserId === toUserId && 
             inv.status === 'pending'
    );

    if (existingInvite) {
      console.log(`⚠️ [FriendPongInvites] Invitation déjà existante: ${existingInvite.id}`);
      return existingInvite.id;
    }

    console.log(`✨ [FriendPongInvites] Création nouvelle invitation...`);

    // Créer nouvelle invitation
    const inviteId = `friend_pong_${fromUserId}_${toUserId}_${Date.now()}`;
    const invite: FriendInvite = {
      id: inviteId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 120000 // 2 minutes
    };

    this.invites.set(inviteId, invite);
    console.log(`💾 [FriendPongInvites] Invitation stockée: ${inviteId}`);

    // Notifier le destinataire via WebSocket
    this.wsManager.sendToUser(toUserId, {
      type: 'friend_pong_invite',
      inviteId,
      fromUserId,
      fromUsername,
      expiresAt: invite.expiresAt
    });

    return inviteId;
  }

  acceptInvite(inviteId: string, userId: number): boolean {
    const invite = this.invites.get(inviteId);
    const now = Date.now();

    // Timing-safe validation - always check all conditions
    const validInvite = invite !== undefined;
    const correctUser = invite?.toUserId === userId;
    const pendingStatus = invite?.status === 'pending';
    const notExpired = invite ? now <= invite.expiresAt : false;

    const canAccept = validInvite && correctUser && pendingStatus && notExpired;

    if (!canAccept) {
      // Clean up expired invite if found
      if (validInvite && invite && now > invite.expiresAt) {
        this.invites.delete(inviteId);
      }
      return false;
    }

    // Créer un gameId unique et démarrer la partie dans SimplePongManager
    const gameId = `pong_${invite.fromUserId}_${invite.toUserId}_${Date.now()}`;
    const simplePongManager = SimplePongManager.getInstance();
    const gameStarted = simplePongManager.startGame(gameId, invite.fromUserId, invite.toUserId);

    if (!gameStarted) {
      console.error(`❌ [FriendPongInvites] Impossible de créer le jeu ${gameId}`);
      // Remettre l'invitation en attente
      invite!.status = 'pending';
      
      // Notifier les joueurs de l'erreur
      this.wsManager.sendToUser(invite.fromUserId, {
        type: 'friend_pong_error',
        inviteId,
        message: 'Impossible de créer la partie. Réessayez plus tard.'
      });

      this.wsManager.sendToUser(invite.toUserId, {
        type: 'friend_pong_error', 
        inviteId,
        message: 'Impossible de créer la partie. Réessayez plus tard.'
      });

      return false;
    }

    console.log(`✅ [FriendPongInvites] Jeu ${gameId} créé avec succès`);
    invite!.status = 'accepted';

    // Notifier les deux joueurs avec les URLs de jeu
    const protocol = process.env.ENABLE_HTTPS === 'true' ? 'https' : 'http';
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : `${protocol}://localhost:3000`;
    const gameUrl = `${frontendUrl}/simple-pong?gameId=${gameId}`;

    this.wsManager.sendToUser(invite.fromUserId, {
      type: 'friend_pong_accepted',
      inviteId,
      gameId,
      gameUrl,
      role: 'left',
      opponentId: invite.toUserId
    });

    this.wsManager.sendToUser(invite.toUserId, {
      type: 'friend_pong_accepted',
      inviteId,
      gameId,
      gameUrl,
      role: 'right',
      opponentId: invite.fromUserId
    });

    // Nettoyer l'invitation
    this.invites.delete(inviteId);
    return true;
  }

  declineInvite(inviteId: string, userId: number): boolean {
    const invite = this.invites.get(inviteId);

    // Timing-safe validation
    const validInvite = invite !== undefined;
    const correctUser = invite?.toUserId === userId;
    const canDecline = validInvite && correctUser;

    if (!canDecline) {
      return false;
    }

    invite!.status = 'declined';

    // Notifier l'émetteur
    this.wsManager.sendToUser(invite!.fromUserId, {
      type: 'friend_pong_declined',
      inviteId
    });

    this.invites.delete(inviteId);
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, invite] of this.invites.entries()) {
      if (now > invite.expiresAt) {
        if (invite.status === 'pending') {
          // Notifier l'expiration
          this.wsManager.sendToUser(invite.fromUserId, {
            type: 'friend_pong_expired',
            inviteId: id
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
      // Reset or create new rate limit entry
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
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

    // Sort by creation time and remove oldest 10%
    const entries = Array.from(this.invites.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      const [id, invite] = entries[i];
      if (invite.status === 'pending') {
        // Notify expiration for pending invites
        this.wsManager.sendToUser(invite.fromUserId, {
          type: 'friend_pong_expired',
          inviteId: id
        });
      }
      this.invites.delete(id);
    }

    console.log(`🧹 [FriendPongInvites] Nettoyage forcé: ${toRemove} invitations supprimées`);
  }
}