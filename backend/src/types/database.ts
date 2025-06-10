export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  
  // Stats
  total_wins: number;
  total_losses: number;
  total_games: number;
  
  // Auth externe
  google_id?: string;
  github_id?: string;
  
  // GDPR
  data_consent: boolean;
  data_consent_date?: string;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  google_id?: string;
  github_id?: string;
  data_consent?: boolean;
}

export interface UserPublic {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  total_wins: number;
  total_losses: number;
  total_games: number;
  created_at: string;
}

export interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  max_players: number;
  current_players: number;
  status: 'open' | 'running' | 'completed' | 'cancelled';
  bracket_data?: string; // JSON
  winner_id?: number;
  created_by: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface TournamentCreateInput {
  name: string;
  description?: string;
  max_players?: number;
  created_by: number;
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  user_id: number;
  position?: number;
  joined_at: string;
}

export interface Match {
  id: number;
  tournament_id?: number;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  winner_id?: number;
  status: 'scheduled' | 'playing' | 'completed' | 'cancelled';
  game_type: string;
  match_data?: string; // JSON
  started_at?: string;
  completed_at?: string;
  created_at: string;
  duration_seconds?: number;
  max_score: number;
}

export interface MatchCreateInput {
  tournament_id?: number;
  player1_id: number;
  player2_id: number;
  game_type?: string;
  max_score?: number;
}

export interface JWTToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked: boolean;
}

export interface SecurityLog {
  id: number;
  user_id?: number;
  action: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  details?: string; // JSON
  created_at: string;
}

// Types pour les réponses API
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Types pour l'authentification
export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  data_consent: boolean;
}