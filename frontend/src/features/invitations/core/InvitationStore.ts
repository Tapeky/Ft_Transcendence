// 🎯 Invitation Store - Gestionnaire d'état centralisé et thread-safe
import { GameInvite } from '../types/InvitationTypes';

type InvitationEvent = 'received' | 'sent' | 'accepted' | 'declined' | 'expired' | 'error';
type EventListener<T = any> = (data: T) => void;

export class InvitationStore {
  private static instance: InvitationStore;
  private listeners = new Map<InvitationEvent, Set<EventListener>>();
  private receivedInvites = new Map<string, GameInvite>();
  private sentInvites = new Map<string, { toUserId: number; timestamp: number; status: 'pending' | 'accepted' | 'declined' | 'expired' }>();
  
  // État de connexion thread-safe
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastError: string | null = null;

  static getInstance(): InvitationStore {
    if (!InvitationStore.instance) {
      InvitationStore.instance = new InvitationStore();
    }
    return InvitationStore.instance;
  }

  private constructor() {}

  // 🎧 Event System Thread-Safe
  on<T>(event: InvitationEvent, listener: EventListener<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<T>(event: InvitationEvent, listener: EventListener<T>): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit<T>(event: InvitationEvent, data?: T): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Copie des listeners pour éviter les modifications concurrentes
      const listeners = Array.from(eventListeners);
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`❌ Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // 📦 State Management
  setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error', error?: string): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.lastError = error || null;
      
      // Émettre événements de changement d'état
      if (state === 'error') {
        this.emit('error', { type: 'connection', message: error });
      }
    }
  }

  getConnectionState(): { state: string; error: string | null } {
    return {
      state: this.connectionState,
      error: this.lastError
    };
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  // 📨 Invitation Management
  addReceivedInvite(invite: GameInvite): void {
    console.log('📦 InvitationStore - Adding received invite:', invite);
    
    // Validation et normalisation
    const normalizedInvite = this.normalizeInvite(invite);
    if (!normalizedInvite) {
      console.error('❌ InvitationStore - Invalid invite:', invite);
      this.emit('error', { type: 'validation', message: 'Invalid invite received' });
      return;
    }

    console.log('📦 InvitationStore - Normalized invite:', normalizedInvite);
    this.receivedInvites.set(normalizedInvite.inviteId, normalizedInvite);
    console.log('📦 InvitationStore - Emitting received event');
    this.emit('received', normalizedInvite);

    // Auto-expiration si pas de timeout serveur
    if (normalizedInvite.expiresAt) {
      const timeUntilExpiry = normalizedInvite.expiresAt - Date.now();
      if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) { // Max 5 minutes
        setTimeout(() => {
          if (this.receivedInvites.has(normalizedInvite.inviteId)) {
            this.expireInvite(normalizedInvite.inviteId);
          }
        }, timeUntilExpiry);
      }
    }
  }

  addSentInvite(toUserId: number, inviteId?: string): string {
    const id = inviteId || `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sentInvites.set(id, {
      toUserId,
      timestamp: Date.now(),
      status: 'pending'
    });
    this.emit('sent', { inviteId: id, toUserId });
    return id;
  }

  updateSentInviteStatus(inviteId: string, status: 'accepted' | 'declined' | 'expired'): void {
    const invite = this.sentInvites.get(inviteId);
    if (invite) {
      invite.status = status;
      this.emit(status, { inviteId, ...invite });
    }
  }

  removeInvite(inviteId: string): void {
    this.receivedInvites.delete(inviteId);
    this.sentInvites.delete(inviteId);
  }

  expireInvite(inviteId: string): void {
    const invite = this.receivedInvites.get(inviteId);
    if (invite) {
      this.receivedInvites.delete(inviteId);
      this.emit('expired', { inviteId, invite });
    }
  }

  getReceivedInvites(): GameInvite[] {
    return Array.from(this.receivedInvites.values());
  }

  getSentInvites(): Array<{ inviteId: string; toUserId: number; timestamp: number; status: string }> {
    return Array.from(this.sentInvites.entries()).map(([inviteId, data]) => ({
      inviteId,
      ...data
    }));
  }

  clearExpiredInvites(): void {
    const now = Date.now();
    for (const [inviteId, invite] of this.receivedInvites.entries()) {
      if (invite.expiresAt && invite.expiresAt < now) {
        this.expireInvite(inviteId);
      }
    }
  }

  // 🛡️ Validation & Normalization
  private normalizeInvite(invite: any): GameInvite | null {
    try {
      // Gestion des différents formats d'invitation
      const normalized: GameInvite = {
        inviteId: String(invite.inviteId || invite.id || ''),
        fromUserId: Number(invite.fromUserId || invite.sender_id || invite.from_user_id || 0),
        fromUsername: String(invite.fromUsername || invite.sender_username || invite.from_username || 'Unknown'),
        expiresAt: this.normalizeTimestamp(invite.expiresAt || invite.expires_at || invite.expiry)
      };

      // Validation stricte
      if (!normalized.inviteId || normalized.fromUserId <= 0 || !normalized.fromUsername) {
        console.error('❌ Invalid invite format:', invite);
        return null;
      }

      return normalized;
    } catch (error) {
      console.error('❌ Error normalizing invite:', error, invite);
      return null;
    }
  }

  private normalizeTimestamp(timestamp: any): number {
    if (!timestamp) return Date.now() + (5 * 60 * 1000); // Default: 5 minutes

    // Si c'est déjà un timestamp number
    if (typeof timestamp === 'number') {
      return timestamp;
    }

    // Si c'est une string ISO
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Fallback
    return Date.now() + (5 * 60 * 1000);
  }

  // 🧹 Cleanup
  cleanup(): void {
    this.listeners.clear();
    this.receivedInvites.clear();
    this.sentInvites.clear();
    this.connectionState = 'disconnected';
    this.lastError = null;
  }
}

export const invitationStore = InvitationStore.getInstance();