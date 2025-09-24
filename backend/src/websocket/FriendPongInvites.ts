import { WebSocketManager } from './WebSocketManager';
import { DatabaseManager } from '../database/DatabaseManager';

interface FriendInvite {
  id: string;
  fromUserId: number;
  toUserId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  expiresAt: number;
}

export class FriendPongInvites {
  private invites = new Map<string, FriendInvite>();
  
  constructor(private wsManager: WebSocketManager) {
    // Nettoyage automatique toutes les minutes
    setInterval(() => this.cleanupExpired(), 60000);
  }

  async createInvite(fromUserId: number, toUserId: number): Promise<string | null> {
    // Vérifier que les deux sont amis
    const db = DatabaseManager.getInstance().getDb();
    const friendship = await db.get(`
      SELECT * FROM friendships 
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
    `, [fromUserId, toUserId, toUserId, fromUserId]);

    if (!friendship) {
      return null; // Pas amis
    }

    // Vérifier pas d'invite en cours
    const existingInvite = Array.from(this.invites.values()).find(
      inv => inv.fromUserId === fromUserId && 
             inv.toUserId === toUserId && 
             inv.status === 'pending'
    );

    if (existingInvite) {
      return existingInvite.id;
    }

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

    // Notifier le destinataire via WebSocket
    this.wsManager.sendToUser(toUserId, {
      type: 'friend_pong_invite',
      inviteId,
      fromUserId,
      expiresAt: invite.expiresAt
    });

    return inviteId;
  }

  acceptInvite(inviteId: string, userId: number): boolean {
    const invite = this.invites.get(inviteId);
    
    if (!invite || invite.toUserId !== userId || invite.status !== 'pending') {
      return false;
    }

    if (Date.now() > invite.expiresAt) {
      this.invites.delete(inviteId);
      return false;
    }

    invite.status = 'accepted';

    // Notifier les deux joueurs de commencer
    this.wsManager.sendToUser(invite.fromUserId, {
      type: 'friend_pong_start',
      inviteId,
      role: 'left',
      opponentId: invite.toUserId
    });

    this.wsManager.sendToUser(invite.toUserId, {
      type: 'friend_pong_start',
      inviteId,
      role: 'right',
      opponentId: invite.fromUserId
    });

    return true;
  }

  declineInvite(inviteId: string, userId: number): boolean {
    const invite = this.invites.get(inviteId);
    
    if (!invite || invite.toUserId !== userId) {
      return false;
    }

    invite.status = 'declined';
    
    // Notifier l'émetteur
    this.wsManager.sendToUser(invite.fromUserId, {
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
}