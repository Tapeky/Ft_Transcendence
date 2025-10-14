export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  created_at: string;
  updated_at: string;

  user1_username: string;
  user1_avatar: string;
  user2_username: string;
  user2_avatar: string;

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
