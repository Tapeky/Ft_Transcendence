export interface OAuthUserInfo {
  id: string;
  login?: string;
  name?: string;
  email: string;
}

export interface AccountParams {
  user_id : string;
}