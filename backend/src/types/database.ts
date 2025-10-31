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

  total_wins: number;
  total_losses: number;
  total_games: number;

  google_id?: string;
  github_id?: string;

  totp_secret?: string;
  has_2fa_enabled: boolean;

  data_consent: boolean;
  data_consent_date?: string;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  avatar_url?: string;
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

export interface LoginCredentials {
  email: string;
  password: string;
  totp_password?: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  data_consent: boolean;
}
