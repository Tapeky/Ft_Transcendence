import { api } from '../../../shared/services/api';

export interface Tournament {
  id: number;
  name: string;
  description: string;
  max_players: number;
  current_players: number;
  status: 'open' | 'running' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  winner_id?: number;
  bracket_data?: string;
}

export interface TournamentParticipant {
  id: number;
  user_id: number;
  alias: string;
  username: string;
  joined_at: string;
}

export interface TournamentMatch {
  id: number;
  player1_id?: number;
  player2_id?: number;
  player1_alias?: string;
  player2_alias?: string;
  winner_id?: number;
  player1_score: number;
  player2_score: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  round: number;
}

export interface TournamentBracket {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  bracket_data: any;
}

export interface NextMatch {
  id: number;
  player1?: { id: number; alias: string; username: string };
  player2?: { id: number; alias: string; username: string };
  status: string;
}

export class TournamentService {
  private static instance: TournamentService;
  private ws: WebSocket | null = null;
  private subscribedTournaments = new Set<number>();

  static getInstance(): TournamentService {
    if (!TournamentService.instance) {
      TournamentService.instance = new TournamentService();
    }
    return TournamentService.instance;
  }

  /**
   * Créer un nouveau tournoi avec reset des alias (exigence sujet)
   */
  async createTournament(name: string, description: string, maxPlayers: number): Promise<Tournament> {
    const response = await api.post('/api/tournaments', {
      name,
      description,
      max_players: maxPlayers
    });

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la création du tournoi');
    }

    return response.data;
  }

  /**
   * Rejoindre un tournoi avec alias
   */
  async joinTournament(tournamentId: number, alias: string): Promise<void> {
    const response = await api.post(`/api/tournaments/${tournamentId}/join`, {
      alias
    });

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de l\'inscription au tournoi');
    }
  }

  /**
   * Démarrer un tournoi (créateur uniquement)
   */
  async startTournament(tournamentId: number): Promise<TournamentBracket> {
    const response = await api.put(`/api/tournaments/${tournamentId}/start`);

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors du démarrage du tournoi');
    }

    return response.data;
  }

  /**
   * EXIGENCE SUJET: Obtenir le prochain match
   * "announce the next match"
   */
  async getNextMatch(tournamentId: number): Promise<NextMatch | null> {
    const response = await api.get(`/api/tournaments/${tournamentId}/next-match`);

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération du prochain match');
    }

    return response.data.nextMatch;
  }

  /**
   * Mettre à jour le résultat d'un match
   */
  async updateMatchResult(
    matchId: number, 
    winnerId: number, 
    player1Score: number, 
    player2Score: number
  ): Promise<void> {
    const response = await api.put(`/api/tournaments/matches/${matchId}/result`, {
      winnerId,
      player1Score,
      player2Score
    });

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la mise à jour du résultat');
    }
  }

  /**
   * Récupérer l'état complet d'un tournoi
   */
  async getTournamentBracket(tournamentId: number): Promise<TournamentBracket> {
    const response = await api.get(`/api/tournaments/${tournamentId}/bracket`);

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération du bracket');
    }

    return response.data;
  }

  /**
   * Lister tous les tournois
   */
  async listTournaments(status?: string): Promise<Tournament[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/tournaments${params}`);

    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération des tournois');
    }

    return response.data;
  }

  // ===== WEBSOCKET INTEGRATION =====

  /**
   * S'abonner aux événements d'un tournoi via WebSocket
   */
  subscribeToTournament(
    tournamentId: number, 
    callbacks: {
      onTournamentStarted?: (data: any) => void;
      onNextMatchAnnounced?: (data: any) => void;
      onMatchCompleted?: (data: any) => void;
      onTournamentCompleted?: (data: any) => void;
      onError?: (error: string) => void;
    }
  ): void {
    if (!this.ws) {
      this.ws = api.connectWebSocket();
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'tournament_event':
            this.handleTournamentEvent(message.data, callbacks);
            break;
          case 'tournament_next_match':
            if (callbacks.onNextMatchAnnounced) {
              callbacks.onNextMatchAnnounced(message.data);
            }
            break;
          case 'tournament_error':
            if (callbacks.onError) {
              callbacks.onError(message.error);
            }
            break;
        }
      } catch (error) {
        console.error('Erreur parsing message WebSocket tournoi:', error);
      }
    };

    // S'abonner au tournoi
    if (!this.subscribedTournaments.has(tournamentId)) {
      this.ws.send(JSON.stringify({
        type: 'tournament_subscribe',
        tournamentId
      }));
      this.subscribedTournaments.add(tournamentId);
    }
  }

  /**
   * Gérer les événements de tournoi
   */
  private handleTournamentEvent(
    event: any, 
    callbacks: {
      onTournamentStarted?: (data: any) => void;
      onNextMatchAnnounced?: (data: any) => void;
      onMatchCompleted?: (data: any) => void;
      onTournamentCompleted?: (data: any) => void;
    }
  ): void {
    switch (event.type) {
      case 'tournament_started':
        if (callbacks.onTournamentStarted) {
          callbacks.onTournamentStarted(event);
        }
        break;
      case 'next_match_announced':
        if (callbacks.onNextMatchAnnounced) {
          callbacks.onNextMatchAnnounced(event);
        }
        break;
      case 'match_completed':
        if (callbacks.onMatchCompleted) {
          callbacks.onMatchCompleted(event);
        }
        break;
      case 'tournament_completed':
        if (callbacks.onTournamentCompleted) {
          callbacks.onTournamentCompleted(event);
        }
        break;
    }
  }

  /**
   * Demander le prochain match via WebSocket
   */
  requestNextMatch(tournamentId: number): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'tournament_get_next_match',
        tournamentId
      }));
    }
  }

  /**
   * Envoyer le résultat d'un match via WebSocket
   */
  sendMatchResult(
    matchId: number, 
    winnerId: number, 
    player1Score: number, 
    player2Score: number
  ): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'tournament_match_result',
        matchId,
        winnerId,
        player1Score,
        player2Score
      }));
    }
  }

  /**
   * Se désabonner d'un tournoi
   */
  unsubscribeFromTournament(tournamentId: number): void {
    this.subscribedTournaments.delete(tournamentId);
  }

  /**
   * Fermer la connexion WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedTournaments.clear();
  }
}