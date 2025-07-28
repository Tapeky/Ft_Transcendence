// Types pour le système de chat

export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  created_at: string;
  updated_at: string;
  
  // Données des utilisateurs (JOIN)
  user1_username: string;
  user1_avatar: string;
  user2_username: string;
  user2_avatar: string;
  
  // Métadonnées de conversation
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  type: MessageType;
  metadata?: string; // JSON string
  created_at: string;
  
  // Données de l'expéditeur (JOIN)
  username: string;
  avatar_url?: string;
  display_name?: string;
}

export type MessageType = 'text' | 'game_invite' | 'tournament_notification' | 'system';

export interface CreateMessageData {
  conversation_id: number;
  sender_id: number;
  content: string;
  type?: MessageType;
  metadata?: any; // Will be JSON.stringify'd
}

export interface GameInviteMetadata {
  gameType: 'pong';
  tournamentId?: number;
  inviteId: string;
  expiresAt: string;
}

export interface TournamentNotificationMetadata {
  tournamentId: number;
  eventType: 'next_match' | 'tournament_start' | 'match_result';
  matchId?: number;
  opponents?: string[];
  scheduledAt?: string;
}

// WebSocket message types pour le chat
export interface ChatWebSocketMessage {
  type: 'direct_message' | 'game_invitation' | 'game_invitation_response' | 'tournament_notification';
  data: any;
}

export interface DirectMessageData {
  toUserId: number;
  message: string;
}

export interface GameInvitationData {
  toUserId: number;
  gameType: 'pong';
  metadata?: GameInviteMetadata;
}

export interface GameInvitationResponseData {
  invitationId: string;
  accepted: boolean;
}

export interface TournamentNotificationData {
  tournamentId: number;
  message: string;
  affectedUsers: number[];
  metadata?: TournamentNotificationMetadata;
}

// Types pour l'API REST
export interface CreateConversationRequest {
  withUserId: number;
}

export interface SendMessageRequest {
  content: string;
  type?: MessageType;
  metadata?: any;
}

export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface ConversationMessagesResponse {
  messages: Message[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}