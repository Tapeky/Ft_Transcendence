// 🎯 KISS Backend Game Invites - Intégré avec GameManager existant
import { SocketStream } from '@fastify/websocket';
import { GameManager } from './game_manager';

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
  private invites = new Map<string, PendingInvite>();
  private wsManager: any = null; // Référence au WebSocketManager principal

  // 🔗 Définir la référence au WebSocketManager principal
  setWebSocketManager(wsManager: any): void {
    this.wsManager = wsManager;
  }

  // 👤 Ces méthodes sont maintenues pour compatibilité mais n'utilisent plus de liste locale
  addUser(userId: number, username: string, socket: SocketStream): void {
    console.log(`🎮 KISS: ${username} connected (using main WebSocketManager)`);
  }

  removeUser(userId: number): void {
    console.log(`🎮 KISS: User ${userId} disconnected (using main WebSocketManager)`);
  }

  // 📨 Traitement des messages WebSocket
  handleMessage(userId: number, data: any): boolean {
    if (!this.wsManager) return false;
    
    const user = this.wsManager.getUser(userId);
    if (!user) return false;

    switch (data.type) {
      case 'send_game_invite':
        this.handleSendInvite(user, data.toUserId);
        return true;
        
      case 'respond_game_invite':
        this.handleRespondInvite(user, data.inviteId, data.accept);
        return true;
    }
    
    return false; // Message non traité par ce module
  }

  // 📤 Envoyer invitation
  private handleSendInvite(sender: ConnectedUser, toUserId: number): void {
    if (!this.wsManager) return;
    
    const receiver = this.wsManager.getUser(toUserId);
    if (!receiver) {
      this.sendToUser(sender.id, { 
        type: 'invite_error', 
        message: 'User not online' 
      });
      return;
    }

    // Éviter les invitations à soi-même
    if (sender.id === toUserId) {
      this.sendToUser(sender.id, { 
        type: 'invite_error', 
        message: 'Cannot invite yourself' 
      });
      return;
    }

    // Vérifier si déjà en jeu
    if (GameManager.instance.getFromPlayerId(sender.id)) {
      this.sendToUser(sender.id, { 
        type: 'invite_error', 
        message: 'You are already in a game' 
      });
      return;
    }

    if (GameManager.instance.getFromPlayerId(toUserId)) {
      this.sendToUser(sender.id, { 
        type: 'invite_error', 
        message: 'User is already in a game' 
      });
      return;
    }

    // Vérifier invitation existante
    const existingInvite = Array.from(this.invites.values())
      .find(inv => inv.fromId === sender.id && inv.toId === toUserId);
    
    if (existingInvite) {
      this.sendToUser(sender.id, { 
        type: 'invite_error', 
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
      type: 'game_invite_received',
      inviteId: inviteId,
      fromUserId: sender.id,
      fromUsername: sender.username,
      expiresAt: invite.expires
    });

    // Confirmation à l'expéditeur
    this.sendToUser(sender.id, {
      type: 'invite_sent',
      toUsername: receiver.username,
      inviteId: inviteId
    });

    // Auto-cleanup
    setTimeout(() => {
      if (this.invites.has(inviteId)) {
        this.invites.delete(inviteId);
        // Notifier l'expiration
        this.sendToUser(toUserId, {
          type: 'invite_expired',
          inviteId: inviteId
        });
      }
    }, 60000);

    console.log(`🎮 KISS: ${sender.username} invited ${receiver.username}`);
  }

  // ✅ Répondre à invitation
  private handleRespondInvite(user: ConnectedUser, inviteId: string, accept: boolean): void {
    const invite = this.invites.get(inviteId);
    if (!invite) {
      this.sendToUser(user.id, {
        type: 'invite_error',
        message: 'Invitation not found or expired'
      });
      return;
    }

    // Vérifier que c'est le bon destinataire
    if (invite.toId !== user.id) {
      this.sendToUser(user.id, {
        type: 'invite_error',
        message: 'Not your invitation'
      });
      return;
    }

    // Vérifier expiration
    if (Date.now() > invite.expires) {
      this.invites.delete(inviteId);
      this.sendToUser(user.id, {
        type: 'invite_error',
        message: 'Invitation expired'
      });
      return;
    }

    // Supprimer l'invitation
    this.invites.delete(inviteId);
    const sender = this.wsManager ? this.wsManager.getUser(invite.fromId) : null;

    if (accept && sender) {
      // Vérifications finales avant de démarrer le jeu
      if (GameManager.instance.getFromPlayerId(invite.fromId) || 
          GameManager.instance.getFromPlayerId(user.id)) {
        this.sendToUser(user.id, {
          type: 'invite_error',
          message: 'One of the players is already in a game'
        });
        this.sendToUser(invite.fromId, {
          type: 'invite_error',
          message: 'Game could not start - player already in game'
        });
        return;
      }

      try {
        // 🎮 Démarrer la partie avec GameManager existant
        const gameId = GameManager.instance.startGame(
          invite.fromId,
          user.id, 
          sender.socket.socket,
          user.socket.socket
        );
        
        // Notifier les deux joueurs avec les données du vrai jeu
        this.sendToUser(invite.fromId, {
          type: 'game_started',
          gameId: gameId,
          opponent: {
            id: user.id,
            username: user.username
          },
          side: 'left'
        });
        
        this.sendToUser(user.id, {
          type: 'game_started',
          gameId: gameId,
          opponent: {
            id: invite.fromId,
            username: invite.fromUsername
          },
          side: 'right'
        });

        console.log(`🚀 KISS: Game ${gameId} started: ${invite.fromUsername} vs ${user.username}`);
        
      } catch (error) {
        console.error('🎮 KISS: Error starting game:', error);
        this.sendToUser(user.id, {
          type: 'invite_error',
          message: 'Failed to start game'
        });
        this.sendToUser(invite.fromId, {
          type: 'invite_error',
          message: 'Failed to start game'
        });
      }
    } else if (sender) {
      // 📢 Notifier le refus
      this.sendToUser(invite.fromId, {
        type: 'invite_declined',
        byUserId: user.id,
        byUsername: user.username
      });

      console.log(`❌ KISS: ${user.username} declined ${invite.fromUsername}'s invite`);
    }
  }

  // 📡 Envoyer message à un utilisateur
  private sendToUser(userId: number, message: any): void {
    if (!this.wsManager) return;
    
    // Utiliser le WebSocketManager principal pour envoyer le message
    this.wsManager.sendToUser(userId, message);
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

  // 📊 Stats pour debug
  getStats(): { users: number, invites: number } {
    const userCount = this.wsManager ? this.wsManager.getConnectedUsers().length : 0;
    return {
      users: userCount,
      invites: this.invites.size
    };
  }
}

// Export singleton
export const simpleGameInvites = new SimpleGameInvites();