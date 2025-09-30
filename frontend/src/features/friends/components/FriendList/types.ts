import { Friend, FriendRequest } from '../../../../shared/services/api';
import { Conversation, Message } from '../../services/ChatService';

export interface User {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface BlockedUser extends User {
  blocked_at?: string;
}

export type TabType = 'friends' | 'blocked' | 'requests' | 'chat';

export interface TabHandlerConfig {
  container: Element;
  onRefresh?: () => void;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  allMessages: Map<number, Message[]>;
  chatView: 'friends' | 'conversation';
  initialized: boolean;
}

export interface FriendListConfig {
  onClose: () => void;
}

export interface MessageEvent {
  message: Message;
  conversation: Conversation;
}

export type { Friend, FriendRequest, Conversation, Message };
