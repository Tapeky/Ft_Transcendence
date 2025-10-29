export interface OAuthUserInfo {
  id: string;
  login?: string;
  name?: string;
  email: string;
}

export interface AccountParams {
  userID : string;
}