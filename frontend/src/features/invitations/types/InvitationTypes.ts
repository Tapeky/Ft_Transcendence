// 🎯 Types Unifiés et Validés pour les Invitations

// Interface principale unifiée
export interface GameInvite {
  inviteId: string;
  fromUserId: number;
  fromUsername: string;
  expiresAt: number; // Always timestamp in milliseconds
}

// États de connexion
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// États d'invitation
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'error';

// Types de messages WebSocket
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Messages d'invitation spécifiques
export interface InviteMessage extends WebSocketMessage {
  type: 'send_game_invite';
  toUserId: number;
}

export interface InviteResponseMessage extends WebSocketMessage {
  type: 'respond_game_invite';
  inviteId: string;
  accept: boolean;
}

export interface InviteReceivedMessage extends WebSocketMessage {
  type: 'game_invite_received';
  inviteId: string;
  fromUserId: number;
  fromUsername: string;
  expiresAt: number;
}

// Configuration et callbacks
export interface InvitationConfig {
  maxRetries?: number;
  retryDelay?: number;
  inviteTimeout?: number;
  debugMode?: boolean;
}

export interface InvitationCallbacks {
  onInviteReceived?: (invite: GameInvite) => void;
  onInviteSent?: (data: { inviteId: string; toUserId: number }) => void;
  onInviteAccepted?: (data: { inviteId: string }) => void;
  onInviteDeclined?: (data: { inviteId: string }) => void;
  onInviteExpired?: (data: { inviteId: string; invite: GameInvite }) => void;
  onInviteError?: (error: { type: string; message: string; inviteId?: string }) => void;
  onConnectionChange?: (state: { state: ConnectionState; error?: string }) => void;
}

// Erreurs typées
export interface InvitationError {
  type: 'connection' | 'validation' | 'timeout' | 'server' | 'network';
  message: string;
  inviteId?: string;
  originalError?: any;
  timestamp: number;
}

// États UI
export interface ButtonState {
  disabled: boolean;
  text: string;
  icon: string;
  className: string;
}

export interface NotificationState {
  visible: boolean;
  invite: GameInvite | null;
  countdown: number;
  error?: string;
}

// Validation helpers
export const InvitationValidation = {
  isValidUserId(userId: any): userId is number {
    return typeof userId === 'number' && userId > 0 && Number.isInteger(userId);
  },

  isValidInviteId(inviteId: any): inviteId is string {
    return typeof inviteId === 'string' && inviteId.length > 0;
  },

  isValidUsername(username: any): username is string {
    return typeof username === 'string' && username.trim().length > 0;
  },

  isValidTimestamp(timestamp: any): timestamp is number {
    return typeof timestamp === 'number' && timestamp > Date.now() - (24 * 60 * 60 * 1000); // Not older than 24h
  },

  isValidInvite(invite: any): invite is GameInvite {
    return (
      invite &&
      this.isValidInviteId(invite.inviteId) &&
      this.isValidUserId(invite.fromUserId) &&
      this.isValidUsername(invite.fromUsername) &&
      this.isValidTimestamp(invite.expiresAt)
    );
  }
};

// Constants
export const INVITATION_CONSTANTS = {
  DEFAULT_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CLEANUP_INTERVAL: 60000, // 1 minute
  MAX_CONCURRENT_INVITES: 5,
  BUTTON_FEEDBACK_DURATION: 3000
} as const;