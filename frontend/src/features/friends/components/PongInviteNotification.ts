export interface PongInviteData {
  type: 'friend_pong_invite';
  inviteId: string;
  fromUserId: number;
  expiresAt: number;
  fromUsername?: string;
  toUserId?: number;
  sentAt?: number;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
}
