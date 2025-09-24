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

export class FriendPongInvites {
  private invites = new Map<string, FriendInvite>();
  
  constructor(private wsManager: WebSocketManager) {
    // Nettoyage automatique toutes les minutes
    setInterval(() => this.cleanupExpired(), 60000);
  }

  async createInvite(fromUserId: number, toUserId: number): Promise<string | null> {
    console.log(`📨 [FriendPongInvites] Création invitation de ${fromUserId} vers ${toUserId}`);
    
    // Récupérer le nom de l'expéditeur
    const db = DatabaseManager.getInstance().getDb();
    const fromUser = await db.get('SELECT username FROM users WHERE id = ?', [fromUserId]);
    const fromUsername = fromUser?.username || 'Un ami';
    
    // Vérifier que les deux sont amis
    const friendship = await db.get(`
      SELECT * FROM friendships 
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
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
    
    if (!invite || invite.toUserId !== userId || invite.status !== 'pending') {
      return false;
    }

    if (Date.now() > invite.expiresAt) {
      this.invites.delete(inviteId);
      return false;
    }

    invite.status = 'accepted';

    // Créer un gameId unique et démarrer la partie dans SimplePongManager
    const gameId = `pong_${invite.fromUserId}_${invite.toUserId}_${Date.now()}`;
    const simplePongManager = SimplePongManager.getInstance();
    simplePongManager.startGame(gameId, invite.fromUserId, invite.toUserId);

    // Notifier les deux joueurs de commencer
    this.wsManager.sendToUser(invite.fromUserId, {
      type: 'friend_pong_start',
      inviteId,
      gameId,
      role: 'left',
      opponentId: invite.toUserId
    });

    this.wsManager.sendToUser(invite.toUserId, {
      type: 'friend_pong_start',
      inviteId,
      gameId,
      role: 'right',
      opponentId: invite.fromUserId
    });

    // Nettoyer l'invitation
    this.invites.delete(inviteId);
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