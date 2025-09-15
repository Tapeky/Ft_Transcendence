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

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface ProfileUpdateRequest {
  display_name?: string;
  avatar_url?: string;
}

export interface AccountDeleteRequest {
  password: string;
  confirm_deletion: boolean;
}

export interface OAuthUserInfo {
  id: string;
  login?: string;
  name?: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
      display_name?: string;
      avatar_url?: string;
      is_online?: boolean;
    };
    token: string;
    expires_in: string;
  };
  message?: string;
  error?: string;
}