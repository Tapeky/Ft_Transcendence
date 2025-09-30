export interface TournamentCreateRequest {
  name: string;
  maxPlayers: 4 | 8 | 16;
}

export interface TournamentJoinRequest {
  alias: string;
}

export interface TournamentResponse {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'open' | 'running' | 'completed';
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  alias: string;
  joined_at: string;
}

export interface TournamentDetails extends TournamentResponse {
  participants: TournamentParticipant[];
  bracket?: any;
  createdAt: string;
}
