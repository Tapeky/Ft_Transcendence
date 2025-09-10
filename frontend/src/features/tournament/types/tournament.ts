// Tournament System Type Definitions

export type TournamentStatus = 'registration' | 'ready' | 'in_progress' | 'running' | 'completed' | 'cancelled';

export type TournamentSize = 4 | 8 | 16;

export interface TournamentPlayer {
  id: string;
  alias: string;
  position?: number; // Final tournament position (1st, 2nd, etc.)
  joinedAt: Date;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Alias: string;
  player2Alias: string;
  player1Score: number;
  player2Score: number;
  winnerAlias?: string;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
}

export interface TournamentBracket {
  rounds: TournamentMatch[][];
  currentRound: number;
  currentMatch?: string; // Match ID currently being played
}

export interface Tournament {
  id: string;
  name: string;
  maxPlayers: TournamentSize;
  currentPlayers: number;
  status: TournamentStatus;
  players: TournamentPlayer[];
  bracket?: TournamentBracket;
  winnerId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// API Response types
export interface TournamentCreateRequest {
  name: string;
  maxPlayers: TournamentSize;
}

export interface TournamentJoinRequest {
  alias: string;
}

export interface TournamentMatchResult {
  matchId: string;
  player1Score: number;
  player2Score: number;
  winnerAlias: string;
}

// UI State types
export interface TournamentUIState {
  currentTournament?: Tournament;
  isLoading: boolean;
  error?: string;
  currentView: 'lobby' | 'registration' | 'bracket' | 'game' | 'results';
}

// Game Integration types
export interface TournamentGameContext {
  tournamentId: string;
  matchId: string;
  player1Alias: string;
  player2Alias: string;
  round: number;
  matchNumber: number;
}