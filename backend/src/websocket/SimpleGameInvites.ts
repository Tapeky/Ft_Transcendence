// 🎯 KISS Backend Game Invites - Tout dans une classe
import { SocketStream } from '@fastify/websocket';

interface ConnectedUser {
  id: number;
  username: string;
  socket: SocketStream;
}

interface PendingInvite {
  id: string;
  fromId: number;
  toId: number;
  fromUsername: string;
  expires: number;
}

export class SimpleGameInvites {
  private users = new Map<number, ConnectedUser>();
  private invites = new Map<string, PendingInvite>();

  // 👤 Gestion des connexions
  addUser(userId: number, username: string, socket: SocketStream): void {
    this.users.set(userId, { id: userId, username, socket });
    console.log(`🔌 ${username} connected`);
  }

  removeUser(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      console.log(`🔌 ${user.username} disconnected`);
    }
  }

  // 📨 Traitement des messages WebSocket
  handleMessage(userId: number, data: any): void {
    const user = this.users.get(userId);
    if (!user) return;

    switch (data.type) {
      case 'send_invite':
        this.handleSendInvite(user, data.to);
        break;
        
      case 'respond_invite':
        this.handleRespondInvite(user, data.inviteId, data.accept);
        break;
    }
  }

  // 📤 Envoyer invitation
  private handleSendInvite(sender: ConnectedUser, toUserId: number): void {
    const receiver = this.users.get(toUserId);
    if (!receiver) {
      this.sendToUser(sender.id, { 
        type: 'error', 
        message: 'User not online' 
      });
      return;
    }

    // Éviter les invitations à soi-même
    if (sender.id === toUserId) return;

    // Vérifier invitation existante
    const existingInvite = Array.from(this.invites.values())
      .find(inv => inv.fromId === sender.id && inv.toId === toUserId);
    
    if (existingInvite) {
      this.sendToUser(sender.id, { 
        type: 'error', 
        message: 'Invitation already sent' 
      });
      return;
    }

    // Créer invitation
    const inviteId = `${sender.id}_${toUserId}_${Date.now()}`;
    const invite: PendingInvite = {
      id: inviteId,
      fromId: sender.id,
      toId: toUserId,
      fromUsername: sender.username,
      expires: Date.now() + 60000 // 60 secondes
    };

    this.invites.set(inviteId, invite);

    // Envoyer au destinataire
    this.sendToUser(toUserId, {
      type: 'game_invite',
      id: inviteId,
      from: sender.username,
      fromId: sender.id
    });

    // Confirmation à l'expéditeur
    this.sendToUser(sender.id, {
      type: 'invite_sent',
      to: receiver.username
    });

    // Auto-cleanup
    setTimeout(() => {
      this.invites.delete(inviteId);
    }, 60000);

    console.log(`🎮 ${sender.username} invited ${receiver.username}`);
  }

  // ✅ Répondre à invitation
  private handleRespondInvite(user: ConnectedUser, inviteId: string, accept: boolean): void {
    const invite = this.invites.get(inviteId);
    if (!invite) return;

    // Vérifier que c'est le bon destinataire
    if (invite.toId !== user.id) return;

    // Vérifier expiration
    if (Date.now() > invite.expires) {
      this.invites.delete(inviteId);
      return;
    }

    // Supprimer l'invitation
    this.invites.delete(inviteId);
    const sender = this.users.get(invite.fromId);

    if (accept && sender) {
      // 🎮 Démarrer la partie
      const gameId = `game_${Date.now()}`;
      
      // Notifier les deux joueurs
      this.sendToUser(invite.fromId, {
        type: 'game_start',
        gameId,
        opponent: user.username,
        side: 'left'
      });
      
      this.sendToUser(user.id, {
        type: 'game_start',
        gameId,
        opponent: invite.fromUsername,
        side: 'right'
      });

      console.log(`🚀 Game started: ${invite.fromUsername} vs ${user.username}`);
    } else if (sender) {
      // 📢 Notifier le refus
      this.sendToUser(invite.fromId, {
        type: 'invite_declined',
        by: user.username
      });

      console.log(`❌ ${user.username} declined ${invite.fromUsername}'s invite`);
    }
  }

  // 📡 Envoyer message à un utilisateur
  private sendToUser(userId: number, message: any): void {
    const user = this.users.get(userId);
    if (!user) return;

    try {
      user.socket.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending to ${userId}:`, error);
      this.removeUser(userId);
    }
  }

  // 🧹 Cleanup périodique des invitations expirées
  cleanupExpiredInvites(): void {
    const now = Date.now();
    for (const [id, invite] of this.invites.entries()) {
      if (now > invite.expires) {
        this.invites.delete(id);
      }
    }
  }
}

// Export singleton
export const simpleGameInvites = new SimpleGameInvites();