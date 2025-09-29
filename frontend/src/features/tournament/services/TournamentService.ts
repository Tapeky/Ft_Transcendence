import { api } from '../../../shared/services/api';
import {
  Tournament,
  TournamentCreateRequest,
  TournamentJoinRequest,
  TournamentMatchResult,
} from '../types/tournament';

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

  static async createTournament(request: TournamentCreateRequest): Promise<Tournament> {
    const response = await api.post<TournamentApiResponse>(`${this.BASE_URL}/create`, request);
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Tournament creation failed');
    }
    return this.transformTournamentFromApi(response.data.tournament);
  }

  static async joinTournament(
    tournamentId: string,
    request: TournamentJoinRequest
  ): Promise<{
    player: { id: string; alias: string; joinedAt: Date };
    tournament: { currentPlayers: number; status: string; ready: boolean };
  }> {
    const response = await api.post<TournamentApiResponse>(
      `${this.BASE_URL}/join/${tournamentId}`,
      request
    );
    if (!response.success || !response.data?.player || !response.data?.tournament) {
      throw new Error(response.error || 'Joining tournament failed');
    }
    return {
      player: {
        ...response.data.player,
        joinedAt: new Date(response.data.player.joinedAt),
      },
      tournament: {
        currentPlayers: response.data.tournament.currentPlayers,
        status: response.data.tournament.status,
        ready: response.data.tournament.currentPlayers >= response.data.tournament.maxPlayers,
      },
    };
  }

  static async startTournament(tournamentId: string): Promise<Tournament> {
    const response = await api.post<TournamentApiResponse>(
      `${this.BASE_URL}/start/${tournamentId}`
    );
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Starting tournament failed');
    }
    return this.transformTournamentFromApi(response.data.tournament);
  }

  static async getTournamentState(tournamentId: string): Promise<Tournament> {
    const response = await api.get<TournamentApiResponse>(`${this.BASE_URL}/state/${tournamentId}`);
    if (!response.success || !response.data?.tournament) {
      throw new Error(response.error || 'Fetching tournament state failed');
    }
    return this.transformTournamentFromApi(response.data.tournament);
  }

  static async submitMatchResult(
    tournamentId: string,
    result: TournamentMatchResult
  ): Promise<void> {
    const response = await api.post<TournamentApiResponse>(
      `${this.BASE_URL}/match-result/${tournamentId}`,
      result
    );
    if (!response.success) {
      throw new Error(response.error || 'Submitting match result failed');
    }
  }

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
    const response = await api.get<TournamentApiResponse>(
      `${this.BASE_URL}/next-match/${tournamentId}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Getting next match failed');
    }
    if (!response.data?.match) return null;
    return {
      ...response.data.match,
      status: 'in_progress' as const,
      startedAt: response.data.match.startedAt
        ? new Date(response.data.match.startedAt)
        : new Date(),
    };
  }

  private static transformTournamentFromApi(apiTournament: any): Tournament {
    if (!apiTournament?.id || !apiTournament?.name) {
      throw new Error('Invalid tournament data from API');
    }
    return {
      id: apiTournament.id,
      name: apiTournament.name,
      maxPlayers: apiTournament.maxPlayers || 0,
      currentPlayers: apiTournament.currentPlayers || 0,
      status: apiTournament.status || 'waiting',
      players:
        apiTournament.players?.map((p: any) => ({
          id: p.id,
          alias: p.alias,
          position: p.position,
          joinedAt: new Date(p.joinedAt),
        })) || [],
      bracket:
        apiTournament.bracket ||
        (apiTournament.matches?.length > 0
          ? this.generateBracketFromMatches(apiTournament.matches)
          : undefined),
      winnerId: apiTournament.winnerId,
      createdAt: new Date(apiTournament.createdAt),
      startedAt: apiTournament.startedAt ? new Date(apiTournament.startedAt) : undefined,
      completedAt: apiTournament.completedAt ? new Date(apiTournament.completedAt) : undefined,
    };
  }

  private static generateBracketFromMatches(matches: any[]): {
    rounds: any[][];
    currentRound: number;
    currentMatch?: string;
  } {
    const roundsMap = new Map<number, any[]>();
    let currentRound = 1;
    let currentMatch: string | undefined;
    matches.forEach(match => {
      if (!roundsMap.has(match.round)) roundsMap.set(match.round, []);
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
        completedAt: match.completedAt ? new Date(match.completedAt) : undefined,
      };
      roundsMap.get(match.round)!.push(transformedMatch);
      if (match.status === 'in_progress') {
        currentRound = match.round;
        currentMatch = match.id;
      } else if (match.status === 'pending' && !currentMatch) {
        if (currentRound === 1 || match.round < currentRound) currentRound = match.round;
      }
    });
    const rounds: any[][] = [];
    const maxRound = Math.max(...roundsMap.keys());
    for (let i = 1; i <= maxRound; i++) {
      rounds.push((roundsMap.get(i) || []).sort((a, b) => a.matchNumber - b.matchNumber));
    }
    return { rounds, currentRound, currentMatch };
  }

  static calculateProgress(tournament: Tournament): number {
    if (!tournament.bracket || tournament.bracket.rounds.length === 0) return 0;
    const totalMatches = tournament.bracket.rounds.reduce(
      (total, round) => total + round.length,
      0
    );
    const completedMatches = tournament.bracket.rounds.reduce(
      (total, round) => total + round.filter(match => match.status === 'completed').length,
      0
    );
    return totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  }

  static getCurrentMatch(tournament: Tournament) {
    if (!tournament.bracket) return null;
    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.status === 'in_progress') return match;
      }
    }
    return null;
  }

  static getNextPendingMatch(tournament: Tournament) {
    if (!tournament.bracket) return null;
    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.status === 'pending') return match;
      }
    }
    return null;
  }

  static isTournamentComplete(tournament: Tournament): boolean {
    return tournament.status === 'completed' && !!tournament.winnerId;
  }

  static getTournamentWinner(tournament: Tournament): string | null {
    if (tournament.status !== 'completed') return null;
    return tournament.winnerId || null;
  }

  static async getHistory(): Promise<Tournament[]> {
    const response = await api.get<any>(`${this.BASE_URL}/history`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Fetching history failed');
    }
    return response.data.tournaments.map((tournament: any) => ({
      ...tournament,
      createdAt: new Date(tournament.createdAt),
      startedAt: tournament.startedAt ? new Date(tournament.startedAt) : undefined,
      completedAt: tournament.completedAt ? new Date(tournament.completedAt) : undefined,
      players:
        tournament.players?.map((player: any) => ({
          ...player,
          joinedAt: new Date(player.joinedAt),
        })) || [],
      bracket: tournament.bracket
        ? {
            ...tournament.bracket,
            rounds:
              tournament.bracket.rounds?.map(
                (round: any) =>
                  round?.map((match: any) => ({
                    ...match,
                    startedAt: match.startedAt ? new Date(match.startedAt) : undefined,
                    completedAt: match.completedAt ? new Date(match.completedAt) : undefined,
                  })) || []
              ) || [],
          }
        : undefined,
    }));
  }

  static async clearHistory(): Promise<{ message: string; deletedCount: number }> {
    const response = await api.delete<any>(`${this.BASE_URL}/history`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Clearing history failed');
    }
    return {
      message: response.data.message || 'History cleared',
      deletedCount: response.data.deletedCount || 0,
    };
  }
}
