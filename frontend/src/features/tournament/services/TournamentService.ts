import { api } from '../../../shared/services/api';
import { Tournament, TournamentCreateRequest, TournamentJoinRequest, TournamentMatchResult } from '../types/tournament';

// Interface pour les réponses de l'API Tournament (dans response.data)
export interface TournamentApiResponse {
  tournament?: Tournament;
  player?: {
    id: string;
    alias: string;
    joinedAt: string;
  };
  match?: {
    id: string;
    tournamentId: string;
    round: number;
    matchNumber: number;
    player1Alias: string;
    player2Alias: string;
    status: 'pending' | 'in_progress' | 'completed';
    startedAt?: string;
  };
}

export class TournamentService {
  private static readonly BASE_URL = '/api/local-tournaments';

  /**
   * Create a new tournament
   */
  static async createTournament(request: TournamentCreateRequest): Promise<Tournament> {
    const response = await api.post<TournamentApiResponse>(`${this.BASE_URL}/create`, request);
    
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Failed to create tournament');
    }

    return this.transformTournamentFromApi(response.data.tournament);
  }

  /**
   * Join a tournament with an alias
   */
  static async joinTournament(tournamentId: string, request: TournamentJoinRequest): Promise<{
    player: { id: string; alias: string; joinedAt: Date };
    tournament: { currentPlayers: number; status: string; ready: boolean };
  }> {
    const response = await api.post<TournamentApiResponse>(`${this.BASE_URL}/join/${tournamentId}`, request);
    
    if (!response.success || !response.data?.player) {
      throw new Error(response.error || 'Failed to join tournament');
    }

    return {
      player: {
        ...response.data.player,
        joinedAt: new Date(response.data.player.joinedAt)
      },
      tournament: response.data.tournament
    };
  }

  /**
   * Start a tournament (generate bracket and begin matches)
   */
  static async startTournament(tournamentId: string): Promise<Tournament> {
    const response = await api.post<TournamentApiResponse>(`${this.BASE_URL}/start/${tournamentId}`);
    
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Failed to start tournament');
    }

    return this.transformTournamentFromApi(response.data.tournament);
  }

  /**
   * Get current tournament state
   */
  static async getTournamentState(tournamentId: string): Promise<Tournament> {
    const response = await api.get<TournamentApiResponse>(`${this.BASE_URL}/state/${tournamentId}`);
    
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Failed to get tournament state');
    }

    // 🔧 DEBUG: Log raw backend response
    console.log('🔧 Raw backend response:', JSON.stringify(response.data.tournament, null, 2));

    return this.transformTournamentFromApi(response.data.tournament);
  }

  /**
   * Submit match result
   */
  static async submitMatchResult(tournamentId: string, result: TournamentMatchResult): Promise<void> {
    const response = await api.post<TournamentApiResponse>(`${this.BASE_URL}/match-result/${tournamentId}`, result);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to submit match result');
    }
  }

  /**
   * Get next match to play
   */
  static async getNextMatch(tournamentId: string): Promise<{
    id: string;
    tournamentId: string;
    round: number;
    matchNumber: number;
    player1Alias: string;
    player2Alias: string;
    status: 'in_progress';
    startedAt: Date;
  } | null> {
    const response = await api.get<TournamentApiResponse>(`${this.BASE_URL}/next-match/${tournamentId}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get next match');
    }

    if (!response.data?.match) {
      return null; // No pending matches
    }

    return {
      ...response.data.match,
      status: 'in_progress', // Force the correct type
      startedAt: new Date(response.data.match.startedAt!)
    };
  }

  /**
   * Transform tournament data from API format to frontend types
   */
  private static transformTournamentFromApi(apiTournament: any): Tournament {
    return {
      id: apiTournament.id,
      name: apiTournament.name,
      maxPlayers: apiTournament.maxPlayers,
      currentPlayers: apiTournament.currentPlayers,
      status: apiTournament.status,
      players: apiTournament.players?.map((p: any) => ({
        id: p.id,
        alias: p.alias,
        position: p.position,
        joinedAt: new Date(p.joinedAt)
      })) || [],
      // ✅ Utiliser directement le bracket du backend (nouvelle structure)
      bracket: apiTournament.bracket || (apiTournament.matches?.length > 0 ? this.generateBracketFromMatches(apiTournament.matches) : undefined),
      winnerId: apiTournament.winnerId,
      createdAt: new Date(apiTournament.createdAt),
      startedAt: apiTournament.startedAt ? new Date(apiTournament.startedAt) : undefined,
      completedAt: apiTournament.completedAt ? new Date(apiTournament.completedAt) : undefined
    };
  }

  /**
   * Generate bracket structure from flat matches array
   */
  private static generateBracketFromMatches(matches: any[]): { rounds: any[][]; currentRound: number; currentMatch?: string } {
    const roundsMap = new Map<number, any[]>();
    let currentRound = 1;
    let currentMatch: string | undefined;

    // Group matches by round
    matches.forEach(match => {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      
      const transformedMatch = {
        id: match.id,
        tournamentId: match.tournamentId || '',
        round: match.round,
        matchNumber: match.matchNumber,
        player1Alias: match.player1Alias,
        player2Alias: match.player2Alias,
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        winnerAlias: match.winnerAlias,
        status: match.status,
        startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
        completedAt: match.completedAt ? new Date(match.completedAt) : undefined
      };

      roundsMap.get(match.round)!.push(transformedMatch);

      // Find current round and match
      if (match.status === 'in_progress') {
        currentRound = match.round;
        currentMatch = match.id;
      } else if (match.status === 'pending' && currentRound === 1) {
        currentRound = match.round;
      }
    });

    // Convert to array format
    const rounds: any[][] = [];
    const maxRound = Math.max(...roundsMap.keys());
    
    for (let i = 1; i <= maxRound; i++) {
      rounds.push((roundsMap.get(i) || []).sort((a, b) => a.matchNumber - b.matchNumber));
    }

    return {
      rounds,
      currentRound,
      currentMatch
    };
  }

  /**
   * Calculate tournament progress percentage
   */
  static calculateProgress(tournament: Tournament): number {
    if (!tournament.bracket || tournament.bracket.rounds.length === 0) {
      return 0;
    }

    const totalMatches = tournament.bracket.rounds.reduce((total, round) => total + round.length, 0);
    const completedMatches = tournament.bracket.rounds.reduce(
      (total, round) => total + round.filter(match => match.status === 'completed').length,
      0
    );

    return totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  }

  /**
   * Get current match being played
   */
  static getCurrentMatch(tournament: Tournament) {
    if (!tournament.bracket) return null;

    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.status === 'in_progress') {
          return match;
        }
      }
    }

    return null;
  }

  /**
   * Get next pending match
   */
  static getNextPendingMatch(tournament: Tournament) {
    if (!tournament.bracket) return null;

    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.status === 'pending') {
          return match;
        }
      }
    }

    return null;
  }

  /**
   * Check if tournament is complete
   */
  static isTournamentComplete(tournament: Tournament): boolean {
    return tournament.status === 'completed' && !!tournament.winnerId;
  }

  /**
   * Get tournament winner
   */
  static getTournamentWinner(tournament: Tournament): string | null {
    if (tournament.status !== 'completed') return null;
    return tournament.winnerId || null;
  }

  /**
   * Get tournament history
   */
  static async getHistory(): Promise<Tournament[]> {
    const response = await api.get<{
      success: boolean;
      data: {
        tournaments: Tournament[];
        total: number;
      };
      error?: string;
    }>(`${this.BASE_URL}/history`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get tournament history');
    }
    
    // Convert date strings back to Date objects
    return response.data.tournaments.map(tournament => ({
      ...tournament,
      createdAt: new Date(tournament.createdAt),
      startedAt: tournament.startedAt ? new Date(tournament.startedAt) : undefined,
      completedAt: tournament.completedAt ? new Date(tournament.completedAt) : undefined,
      players: tournament.players.map(player => ({
        ...player,
        joinedAt: new Date(player.joinedAt)
      })),
      bracket: tournament.bracket ? {
        ...tournament.bracket,
        rounds: tournament.bracket.rounds.map(round => 
          round.map(match => ({
            ...match,
            startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
            completedAt: match.completedAt ? new Date(match.completedAt) : undefined
          }))
        )
      } : undefined
    }));
  }

  /**
   * Clear all tournament history (completed tournaments only)
   */
  static async clearHistory(): Promise<{ message: string; deletedCount: number }> {
    const response = await api.delete<{
      success: boolean;
      data: {
        message: string;
        deletedCount: number;
      };
      error?: string;
    }>(`${this.BASE_URL}/history`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear tournament history');
    }
    
    return response.data;
  }
}