// 🏆 Tournament Invitation System - Basé sur SimpleGameInvites
import { SocketStream } from '@fastify/websocket';
import { GameManager } from './game_manager';
import { DatabaseManager } from '../database/DatabaseManager';

interface ConnectedUser {
  id: number;
  username: string;
  socket: SocketStream;
}

interface TournamentMatchInvite {
  id: string;
  tournamentId: number;
  matchId: number;
  player1Id: number;
  player2Id: number;
  player1Username: string;
  player2Username: string;
  player1Alias: string;
  player2Alias: string;
  round: number;
  roundName: string;
  expires: number;
  player1Accepted: boolean;
  player2Accepted: boolean;
  tournamentName: string;
}

export class TournamentInvites {
  private invites = new Map<string, TournamentMatchInvite>();
  private wsManager: any = null;
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  // 🔗 Définir la référence au WebSocketManager principal
  setWebSocketManager(wsManager: any): void {
    this.wsManager = wsManager;
    console.log('🏆 Tournament Invites: WebSocket manager connected');
  }

  // 📤 Envoyer invitation de match de tournoi automatiquement
  async sendTournamentMatchInvitation(tournamentId: number, matchId: number): Promise<void> {
    if (!this.wsManager) {
      console.error('🏆 No WebSocket manager available');
      return;
    }

    try {
      // Récupérer les détails du match depuis la base de données
      const matchData = await this.db.queryOne(`
        SELECT 
          m.*,
          t.name as tournament_name,
          tp1.alias as player1_alias, u1.username as player1_username,
          tp2.alias as player2_alias, u2.username as player2_username
        FROM matches m
        JOIN tournaments t ON t.id = m.tournament_id
        LEFT JOIN tournament_participants tp1 ON tp1.tournament_id = m.tournament_id AND tp1.user_id = m.player1_id
        LEFT JOIN tournament_participants tp2 ON tp2.tournament_id = m.tournament_id AND tp2.user_id = m.player2_id
        LEFT JOIN users u1 ON u1.id = m.player1_id
        LEFT JOIN users u2 ON u2.id = m.player2_id
        WHERE m.id = ? AND m.tournament_id = ?
      `, [matchId, tournamentId]);

      if (!matchData) {
        console.error(`🏆 Match ${matchId} not found for tournament ${tournamentId}`);
        return;
      }

      if (matchData.status !== 'scheduled') {
        console.log(`🏆 Match ${matchId} not in scheduled state: ${matchData.status}`);
        return;
      }

      // Vérifier que les deux joueurs sont en ligne
      const player1 = this.wsManager.getUser(matchData.player1_id);
      const player2 = this.wsManager.getUser(matchData.player2_id);

      if (!player1 || !player2) {
        console.log(`🏆 Players not online for match ${matchId}: P1=${!!player1}, P2=${!!player2}`);
        // Programmer un nouveau check dans 30 secondes
        setTimeout(() => {
          this.sendTournamentMatchInvitation(tournamentId, matchId);
        }, 30000);
        return;
      }

      // Créer l'invitation
      const inviteId = `tournament_${tournamentId}_${matchId}_${Date.now()}`;
      const roundName = this.getRoundName(matchData.round || 1);
      
      const invite: TournamentMatchInvite = {
        id: inviteId,
        tournamentId,
        matchId,
        player1Id: matchData.player1_id,
        player2Id: matchData.player2_id,
        player1Username: matchData.player1_username,
        player2Username: matchData.player2_username,
        player1Alias: matchData.player1_alias,
        player2Alias: matchData.player2_alias,
        round: matchData.round || 1,
        roundName,
        expires: Date.now() + 300000, // 5 minutes
        player1Accepted: false,
        player2Accepted: false,
        tournamentName: matchData.tournament_name
      };

      this.invites.set(inviteId, invite);

      // Envoyer l'invitation aux deux joueurs
      this.sendToUser(matchData.player1_id, {
        type: 'tournament_match_invitation',
        inviteId,
        tournamentId,
        tournamentName: matchData.tournament_name,
        matchId,
        opponent: {
          id: matchData.player2_id,
          username: matchData.player2_username,
          alias: matchData.player2_alias
        },
        round: matchData.round || 1,
        roundName,
        expiresAt: invite.expires,
        matchInfo: `Match de tournoi: ${matchData.player1_alias} vs ${matchData.player2_alias}`
      });

      this.sendToUser(matchData.player2_id, {
        type: 'tournament_match_invitation',
        inviteId,
        tournamentId,
        tournamentName: matchData.tournament_name,
        matchId,
        opponent: {
          id: matchData.player1_id,
          username: matchData.player1_username,
          alias: matchData.player1_alias
        },
        round: matchData.round || 1,
        roundName,
        expiresAt: invite.expires,
        matchInfo: `Match de tournoi: ${matchData.player1_alias} vs ${matchData.player2_alias}`
      });

      console.log(`🏆 Tournament match invitation sent: ${matchData.player1_alias} vs ${matchData.player2_alias}`);

      // Auto-cleanup après expiration
      setTimeout(() => {
        if (this.invites.has(inviteId)) {
          this.invites.delete(inviteId);
          this.sendToUser(matchData.player1_id, {
            type: 'tournament_invite_expired',
            inviteId,
            message: 'L\'invitation de match de tournoi a expiré'
          });
          this.sendToUser(matchData.player2_id, {
            type: 'tournament_invite_expired',
            inviteId,
            message: 'L\'invitation de match de tournoi a expiré'
          });
        }
      }, 300000); // 5 minutes

    } catch (error) {
      console.error('🏆 Error sending tournament match invitation:', error);
    }
  }

  // ✅ Répondre à invitation de tournoi
  async handleTournamentInviteResponse(userId: number, inviteId: string, accept: boolean): Promise<void> {
    const invite = this.invites.get(inviteId);
    if (!invite) {
      this.sendToUser(userId, {
        type: 'tournament_invite_error',
        message: 'Invitation introuvable ou expirée'
      });
      return;
    }

    // Vérifier que c'est un participant du match
    if (invite.player1Id !== userId && invite.player2Id !== userId) {
      this.sendToUser(userId, {
        type: 'tournament_invite_error',
        message: 'Cette invitation ne vous concerne pas'
      });
      return;
    }

    // Vérifier expiration
    if (Date.now() > invite.expires) {
      this.invites.delete(inviteId);
      this.sendToUser(userId, {
        type: 'tournament_invite_error',
        message: 'L\'invitation a expiré'
      });
      return;
    }

    // Refus = supprimer l'invitation et notifier
    if (!accept) {
      this.invites.delete(inviteId);
      const opponentId = userId === invite.player1Id ? invite.player2Id : invite.player1Id;
      
      this.sendToUser(opponentId, {
        type: 'tournament_invite_declined',
        inviteId,
        message: `${userId === invite.player1Id ? invite.player1Alias : invite.player2Alias} a refusé le match`
      });

      this.sendToUser(userId, {
        type: 'tournament_invite_declined',
        inviteId,
        message: 'Match refusé'
      });

      console.log(`🏆 Tournament match declined by ${userId} for match ${invite.matchId}`);
      return;
    }

    // Acceptation
    if (userId === invite.player1Id) {
      invite.player1Accepted = true;
    } else {
      invite.player2Accepted = true;
    }

    // Notifier l'acceptation
    const opponentId = userId === invite.player1Id ? invite.player2Id : invite.player1Id;
    this.sendToUser(opponentId, {
      type: 'tournament_invite_accepted',
      inviteId,
      message: `${userId === invite.player1Id ? invite.player1Alias : invite.player2Alias} a accepté le match`
    });

    // Si les deux ont accepté, démarrer le match
    if (invite.player1Accepted && invite.player2Accepted) {
      await this.startTournamentMatch(invite);
    } else {
      // Notifier au joueur qui a accepté qu'on attend l'autre
      this.sendToUser(userId, {
        type: 'tournament_invite_waiting',
        inviteId,
        message: 'En attente de la réponse de votre adversaire...'
      });
    }

    // Mettre à jour l'invitation
    this.invites.set(inviteId, invite);
  }

  // 🚀 Démarrer le match de tournoi
  private async startTournamentMatch(invite: TournamentMatchInvite): Promise<void> {
    try {
      // Supprimer l'invitation
      this.invites.delete(invite.id);

      // Vérifications finales
      if (GameManager.instance.getFromPlayerId(invite.player1Id) || 
          GameManager.instance.getFromPlayerId(invite.player2Id)) {
        this.sendToUser(invite.player1Id, {
          type: 'tournament_invite_error',
          message: 'Un des joueurs est déjà en partie'
        });
        this.sendToUser(invite.player2Id, {
          type: 'tournament_invite_error',
          message: 'Un des joueurs est déjà en partie'
        });
        return;
      }

      // Récupérer les sockets
      const player1 = this.wsManager.getUser(invite.player1Id);
      const player2 = this.wsManager.getUser(invite.player2Id);

      if (!player1 || !player2) {
        this.sendToUser(invite.player1Id, {
          type: 'tournament_invite_error',
          message: 'Un des joueurs s\'est déconnecté'
        });
        this.sendToUser(invite.player2Id, {
          type: 'tournament_invite_error',
          message: 'Un des joueurs s\'est déconnecté'
        });
        return;
      }

      // Marquer le match comme en cours en base
      await this.db.execute(`
        UPDATE matches SET status = 'in_progress', started_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [invite.matchId]);

      // Démarrer le jeu avec GameManager
      const gameId = GameManager.instance.startGame(
        invite.player1Id,
        invite.player2Id,
        player1.socket.socket,
        player2.socket.socket
      );

      // Notifier les deux joueurs
      const gameData = {
        gameId,
        matchId: invite.matchId,
        tournamentId: invite.tournamentId,
        tournamentName: invite.tournamentName,
        round: invite.round,
        roundName: invite.roundName
      };

      this.sendToUser(invite.player1Id, {
        type: 'tournament_match_started',
        data: { ...gameData, isPlayer1: true, side: 'left' },
        opponent: {
          id: invite.player2Id,
          username: invite.player2Username,
          alias: invite.player2Alias
        }
      });

      this.sendToUser(invite.player2Id, {
        type: 'tournament_match_started',
        data: { ...gameData, isPlayer1: false, side: 'right' },
        opponent: {
          id: invite.player1Id,
          username: invite.player1Username,
          alias: invite.player1Alias
        }
      });

      console.log(`🚀 Tournament match started: ${invite.player1Alias} vs ${invite.player2Alias} (Game ID: ${gameId})`);

    } catch (error) {
      console.error('🏆 Error starting tournament match:', error);
      this.sendToUser(invite.player1Id, {
        type: 'tournament_invite_error',
        message: 'Erreur lors du démarrage du match'
      });
      this.sendToUser(invite.player2Id, {
        type: 'tournament_invite_error',
        message: 'Erreur lors du démarrage du match'
      });
    }
  }

  // 🎯 Traitement des messages WebSocket
  handleMessage(userId: number, data: any): boolean {
    if (!this.wsManager) return false;

    switch (data.type) {
      case 'respond_tournament_invite':
        this.handleTournamentInviteResponse(userId, data.inviteId, data.accept);
        return true;
    }

    return false; // Message non traité
  }

  // 📨 Utilitaire pour envoyer message
  private sendToUser(userId: number, message: any): void {
    if (this.wsManager) {
      this.wsManager.sendToUser(userId, message);
    }
  }

  // 🏆 Noms des rounds
  private getRoundName(round: number): string {
    switch (round) {
      case 1: return 'Premier Tour';
      case 2: return 'Deuxième Tour';  
      case 3: return 'Quart de Finale';
      case 4: return 'Demi-Finale';
      case 5: return 'Finale';
      default: return `Round ${round}`;
    }
  }

  // 📊 Méthodes utilitaires pour le debug
  getActiveInvites(): number {
    return this.invites.size;
  }

  getInviteById(inviteId: string): TournamentMatchInvite | undefined {
    return this.invites.get(inviteId);
  }
}

// Instance singleton
export const tournamentInvites = new TournamentInvites();