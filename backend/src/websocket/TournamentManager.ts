import { DatabaseManager } from '../database/DatabaseManager';
import { Tournament, TournamentParticipant, Match } from '../types/database';

interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

interface BracketMatch {
  id: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner?: TournamentPlayer;
  status: 'scheduled' | 'in_progress' | 'completed';
  nextMatchId?: number;
}

interface TournamentPlayer {
  id: number;
  user_id: number;
  alias: string;
  username: string;
}

interface TournamentBracket {
  rounds: BracketRound[];
  participants: TournamentPlayer[];
  currentRound: number;
  nextMatch: BracketMatch | null;
}

export class TournamentManager {
  private static instance: TournamentManager;
  private db: DatabaseManager;
  private tournamentSubscribers: Map<number, Set<(event: TournamentEvent) => void>> = new Map();

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): TournamentManager {
    if (!TournamentManager.instance) {
      TournamentManager.instance = new TournamentManager();
    }
    return TournamentManager.instance;
  }

  /**
   * Crée un tournoi avec reset des alias et bracket structure
   */
  async createTournament(
    name: string, 
    description: string | undefined, 
    maxPlayers: number, 
    createdBy: number
  ): Promise<Tournament> {
    // Reset des alias pour nouveau tournoi (exigence du sujet)
    await this.resetTournamentAliases();

    const result = await this.db.execute(`
      INSERT INTO tournaments (name, description, max_players, created_by, status)
      VALUES (?, ?, ?, ?, 'open')
    `, [name, description || '', maxPlayers, createdBy]);

    const tournamentId = result.lastID as number;
    
    const tournament = await this.db.query(`
      SELECT * FROM tournaments WHERE id = ?
    `, [tournamentId]);

    console.log(`🏆 Tournoi créé: "${name}" (ID: ${tournamentId})`);
    return tournament[0] as Tournament;
  }

  /**
   * Reset des alias à chaque nouveau tournoi (exigence du sujet)
   */
  private async resetTournamentAliases(): Promise<void> {
    // Marquer tous les anciens alias comme "archived" au lieu de les supprimer
    await this.db.execute(`
      UPDATE tournament_participants 
      SET alias = alias || '_archived_' || datetime('now')
      WHERE tournament_id IN (
        SELECT id FROM tournaments WHERE status IN ('completed', 'cancelled')
      )
    `);
    
    console.log('🔄 Alias des tournois précédents archivés pour permettre la réutilisation');
  }

  /**
   * Démarre un tournoi et génère la structure des brackets
   */
  async startTournament(tournamentId: number, userId: number): Promise<TournamentBracket> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament || tournament.created_by !== userId) {
      throw new Error('Tournoi introuvable ou non autorisé');
    }

    if (tournament.status !== 'open') {
      throw new Error('Le tournoi ne peut pas être démarré');
    }

    // Récupérer participants
    const participants = await this.getTournamentParticipants(tournamentId);
    if (participants.length < 2) {
      throw new Error('Il faut au moins 2 participants pour démarrer');
    }

    // Générer la structure complète des brackets
    const bracket = await this.generateTournamentBracket(tournamentId, participants);
    
    // Mettre à jour le tournoi
    await this.db.execute(`
      UPDATE tournaments 
      SET status = 'running', started_at = CURRENT_TIMESTAMP, bracket_data = ?
      WHERE id = ?
    `, [JSON.stringify(bracket), tournamentId]);

    // Créer tous les matches du premier round
    await this.createRoundMatches(tournamentId, bracket.rounds[0]);

    // Annoncer le premier match (exigence du sujet)
    await this.announceNextMatch(tournamentId);

    console.log(`🚀 Tournoi ${tournamentId} démarré avec ${participants.length} participants`);
    this.notifyTournamentEvent(tournamentId, {
      type: 'tournament_started',
      tournamentId,
      bracket,
      nextMatch: bracket.nextMatch
    });

    return bracket;
  }

  /**
   * Génère la structure complète des brackets pour toutes les rounds
   */
  private async generateTournamentBracket(
    tournamentId: number, 
    participants: TournamentPlayer[]
  ): Promise<TournamentBracket> {
    // Mélanger les participants pour l'équité
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    
    // Calculer le nombre de rounds nécessaires
    const totalRounds = Math.ceil(Math.log2(participants.length));
    const rounds: BracketRound[] = [];

    // Générer chaque round
    let currentParticipants = shuffledParticipants;
    
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const roundMatches: BracketMatch[] = [];
      
      // Créer les matches de ce round
      for (let i = 0; i < currentParticipants.length; i += 2) {
        const player1 = currentParticipants[i];
        const player2 = i + 1 < currentParticipants.length ? currentParticipants[i + 1] : null;
        
        roundMatches.push({
          id: 0, // Sera mis à jour lors de la création en DB
          player1,
          player2,
          status: roundNum === 1 ? 'scheduled' : 'scheduled',
          nextMatchId: roundNum < totalRounds ? Math.floor(i / 2) : undefined
        });
      }

      rounds.push({
        round: roundNum,
        matches: roundMatches
      });

      // Préparer les participants pour le round suivant (vainqueurs)
      currentParticipants = roundMatches.map(() => null as any).filter(Boolean);
    }

    return {
      rounds,
      participants: shuffledParticipants,
      currentRound: 1,
      nextMatch: rounds[0]?.matches[0] || null
    };
  }

  /**
   * Crée les matches d'un round en base de données
   */
  private async createRoundMatches(tournamentId: number, round: BracketRound): Promise<void> {
    for (const match of round.matches) {
      const result = await this.db.execute(`
        INSERT INTO matches (tournament_id, player1_id, player2_id, status, game_type, round)
        VALUES (?, ?, ?, ?, 'pong', ?)
      `, [
        tournamentId,
        match.player1?.user_id || null,
        match.player2?.user_id || null,
        match.status,
        round.round
      ]);
      
      match.id = result.lastID as number;
    }
  }

  /**
   * EXIGENCE SUJET: Annonce du prochain match
   * "announce the next match"
   */
  async announceNextMatch(tournamentId: number): Promise<BracketMatch | null> {
    const nextMatch = await this.getNextScheduledMatch(tournamentId);
    
    if (!nextMatch) {
      console.log(`🏁 Aucun match suivant pour le tournoi ${tournamentId}`);
      return null;
    }

    // Notification WebSocket à tous les participants
    this.notifyTournamentEvent(tournamentId, {
      type: 'next_match_announced',
      tournamentId,
      match: nextMatch,
      announcement: this.formatMatchAnnouncement(nextMatch)
    });

    console.log(`📢 Match annoncé: ${nextMatch.player1?.alias} vs ${nextMatch.player2?.alias || 'BYE'}`);
    return nextMatch;
  }

  /**
   * Récupère le prochain match programmé
   */
  private async getNextScheduledMatch(tournamentId: number): Promise<BracketMatch | null> {
    const matches = await this.db.query(`
      SELECT m.*, 
             tp1.alias as player1_alias, u1.username as player1_username,
             tp2.alias as player2_alias, u2.username as player2_username
      FROM matches m
      LEFT JOIN tournament_participants tp1 ON tp1.tournament_id = m.tournament_id AND tp1.user_id = m.player1_id
      LEFT JOIN tournament_participants tp2 ON tp2.tournament_id = m.tournament_id AND tp2.user_id = m.player2_id
      LEFT JOIN users u1 ON u1.id = m.player1_id
      LEFT JOIN users u2 ON u2.id = m.player2_id
      WHERE m.tournament_id = ? AND m.status = 'scheduled'
      ORDER BY m.round ASC, m.id ASC
      LIMIT 1
    `, [tournamentId]);

    if (!matches.length) return null;

    const match = matches[0];
    return {
      id: match.id,
      player1: match.player1_id ? {
        id: match.id,
        user_id: match.player1_id,
        alias: match.player1_alias,
        username: match.player1_username
      } : null,
      player2: match.player2_id ? {
        id: match.id,
        user_id: match.player2_id,
        alias: match.player2_alias,
        username: match.player2_username
      } : null,
      status: match.status
    };
  }

  /**
   * Formate l'annonce d'un match
   */
  private formatMatchAnnouncement(match: BracketMatch): string {
    if (!match.player2) {
      return `🎮 Prochain match: ${match.player1?.alias} passe automatiquement au tour suivant (BYE)`;
    }
    
    return `🎮 Prochain match: ${match.player1?.alias} vs ${match.player2?.alias}`;
  }

  /**
   * Met à jour le résultat d'un match et fait progresser le tournoi
   */
  async updateMatchResult(
    matchId: number, 
    winnerId: number, 
    player1Score: number, 
    player2Score: number
  ): Promise<void> {
    // Mettre à jour le match
    await this.db.execute(`
      UPDATE matches 
      SET winner_id = ?, player1_score = ?, player2_score = ?, 
          status = 'completed', finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [winnerId, player1Score, player2Score, matchId]);

    const match = await this.db.query(`
      SELECT * FROM matches WHERE id = ?
    `, [matchId]);

    if (!match.length) return;

    const tournamentId = match[0].tournament_id;

    // Faire progresser le vainqueur au round suivant
    await this.advanceWinnerToNextRound(tournamentId, matchId, winnerId);

    // Vérifier si le tournoi est terminé
    await this.checkTournamentCompletion(tournamentId);

    // Annoncer le prochain match
    await this.announceNextMatch(tournamentId);
  }

  /**
   * Fait avancer le vainqueur au round suivant
   */
  private async advanceWinnerToNextRound(
    tournamentId: number, 
    completedMatchId: number, 
    winnerId: number
  ): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament?.bracket_data) return;

    const bracket: TournamentBracket = JSON.parse(tournament.bracket_data);
    
    // Trouver le match complété et le match suivant
    for (const round of bracket.rounds) {
      const completedMatch = round.matches.find(m => m.id === completedMatchId);
      if (!completedMatch || !completedMatch.nextMatchId) continue;

      // Trouver le match suivant dans le round supérieur
      const nextRound = bracket.rounds.find(r => r.round === round.round + 1);
      if (!nextRound) continue;

      const nextMatch = nextRound.matches.find(m => m.id === completedMatch.nextMatchId);
      if (!nextMatch) continue;

      // Assigner le vainqueur à la position correcte
      const winner = completedMatch.player1?.user_id === winnerId 
        ? completedMatch.player1 
        : completedMatch.player2;

      if (!nextMatch.player1) {
        nextMatch.player1 = winner;
      } else if (!nextMatch.player2) {
        nextMatch.player2 = winner;
      }

      // Si les deux joueurs sont assignés, créer le match en DB
      if (nextMatch.player1 && nextMatch.player2) {
        const result = await this.db.execute(`
          INSERT INTO matches (tournament_id, player1_id, player2_id, status, game_type, round)
          VALUES (?, ?, ?, 'scheduled', 'pong', ?)
        `, [tournamentId, nextMatch.player1.user_id, nextMatch.player2.user_id, round.round + 1]);

        nextMatch.id = result.lastID as number;
        nextMatch.status = 'scheduled';
      }

      break;
    }

    // Mettre à jour les bracket_data
    await this.db.execute(`
      UPDATE tournaments SET bracket_data = ? WHERE id = ?
    `, [JSON.stringify(bracket), tournamentId]);
  }

  /**
   * Vérifie si le tournoi est terminé
   */
  private async checkTournamentCompletion(tournamentId: number): Promise<void> {
    const pendingMatches = await this.db.query(`
      SELECT COUNT(*) as count FROM matches 
      WHERE tournament_id = ? AND status IN ('scheduled', 'in_progress')
    `, [tournamentId]);

    if (pendingMatches[0].count === 0) {
      // Trouver le vainqueur final
      const finalMatch = await this.db.query(`
        SELECT * FROM matches 
        WHERE tournament_id = ? AND status = 'completed'
        ORDER BY round DESC, finished_at DESC
        LIMIT 1
      `, [tournamentId]);

      if (finalMatch.length) {
        const winnerId = finalMatch[0].winner_id;
        
        await this.db.execute(`
          UPDATE tournaments 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = ?
          WHERE id = ?
        `, [winnerId, tournamentId]);

        this.notifyTournamentEvent(tournamentId, {
          type: 'tournament_completed',
          tournamentId,
          winnerId
        });

        console.log(`🏆 Tournoi ${tournamentId} terminé! Vainqueur: ${winnerId}`);
      }
    }
  }

  /**
   * Récupère un tournoi par ID
   */
  private async getTournament(tournamentId: number): Promise<Tournament | null> {
    const tournaments = await this.db.query(`
      SELECT * FROM tournaments WHERE id = ?
    `, [tournamentId]);

    return tournaments.length ? tournaments[0] as Tournament : null;
  }

  /**
   * Récupère les participants d'un tournoi
   */
  private async getTournamentParticipants(tournamentId: number): Promise<TournamentPlayer[]> {
    const participants = await this.db.query(`
      SELECT tp.*, u.username
      FROM tournament_participants tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.tournament_id = ?
      ORDER BY tp.joined_at
    `, [tournamentId]);

    return participants.map(p => ({
      id: p.id,
      user_id: p.user_id,
      alias: p.alias,
      username: p.username
    }));
  }

  // Système de notifications WebSocket
  subscribeTournamentEvents(
    tournamentId: number, 
    callback: (event: TournamentEvent) => void
  ): void {
    if (!this.tournamentSubscribers.has(tournamentId)) {
      this.tournamentSubscribers.set(tournamentId, new Set());
    }
    this.tournamentSubscribers.get(tournamentId)!.add(callback);
  }

  private notifyTournamentEvent(tournamentId: number, event: TournamentEvent): void {
    const subscribers = this.tournamentSubscribers.get(tournamentId);
    if (subscribers) {
      subscribers.forEach(callback => callback(event));
    }
  }
}

export interface TournamentEvent {
  type: 'tournament_started' | 'next_match_announced' | 'match_completed' | 'tournament_completed';
  tournamentId: number;
  bracket?: TournamentBracket;
  match?: BracketMatch;
  nextMatch?: BracketMatch | null;
  winnerId?: number;
  announcement?: string;
}