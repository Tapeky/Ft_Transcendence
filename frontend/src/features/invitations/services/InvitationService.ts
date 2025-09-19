// Unified Invitation Service
import { invitationStore } from '../core/InvitationStore';
import { webSocketManager } from '../core/WebSocketManager';
import { 
  GameInvite, 
  InvitationCallbacks, 
  InvitationConfig, 
  InvitationValidation, 
  INVITATION_CONSTANTS 
} from '../types/InvitationTypes';

export class InvitationService {
  private static instance: InvitationService;
  private callbacks: InvitationCallbacks = {};
  private config: InvitationConfig;
  private cleanupIntervalId: number | null = null;

  // Rate limiting
  private lastInviteTimes = new Map<number, number>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_INVITES_PER_WINDOW = 5;

  static getInstance(config?: InvitationConfig): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService(config);
    }
    return InvitationService.instance;
  }

  private constructor(config?: InvitationConfig) {
    this.config = {
      maxRetries: INVITATION_CONSTANTS.MAX_RETRIES,
      retryDelay: INVITATION_CONSTANTS.RETRY_DELAY,
      inviteTimeout: INVITATION_CONSTANTS.DEFAULT_TIMEOUT,
      debugMode: false,
      ...config
    };

    this.initializeEventListeners();
    this.startCleanupTimer();
  }

  private initializeEventListeners(): void {
    // Listen to store events
    invitationStore.on('received', (invite: GameInvite) => {
      this.callbacks.onInviteReceived?.(invite);
    });

    invitationStore.on('sent', (data: { inviteId: string; toUserId: number }) => {
      this.callbacks.onInviteSent?.(data);
    });

    invitationStore.on('accepted', (data: { inviteId: string }) => {
      this.callbacks.onInviteAccepted?.(data);
    });

    invitationStore.on('declined', (data: { inviteId: string }) => {
      this.callbacks.onInviteDeclined?.(data);
    });

    invitationStore.on('expired', (data: { inviteId: string; invite: GameInvite }) => {
      this.callbacks.onInviteExpired?.(data);
    });

    invitationStore.on('error', (error: any) => {
      this.logError('Invitation error:', error);
      this.callbacks.onInviteError?.(error);
    });
  }

  private startCleanupTimer(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.cleanupIntervalId = window.setInterval(() => {
      this.performCleanup();
    }, INVITATION_CONSTANTS.CLEANUP_INTERVAL);
  }

  private performCleanup(): void {
    // Clean expired invitations
    invitationStore.clearExpiredInvites();
    
    // Clean rate limiting
    const now = Date.now();
    for (const [userId, timestamp] of this.lastInviteTimes.entries()) {
      if (now - timestamp > this.RATE_LIMIT_WINDOW) {
        this.lastInviteTimes.delete(userId);
      }
    }

  }

  // 📤 Envoyer une invitation
  async sendInvite(userId: number): Promise<{ success: boolean; error?: string; inviteId?: string }> {
    try {
      // Validation stricte
      if (!InvitationValidation.isValidUserId(userId)) {
        const error = 'Invalid user ID';
        this.logError(error, { userId });
        return { success: false, error };
      }

      // Rate limiting
      const rateLimitResult = this.checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        const error = `Rate limit exceeded: ${rateLimitResult.message}`;
        this.logError(error, { userId });
        return { success: false, error };
      }

      // Vérifier la connexion
      if (!webSocketManager.isConnected()) {
        const error = 'Not connected to server';
        this.logError(error);
        return { success: false, error };
      }

      // Générer ID d'invitation
      const inviteId = this.generateInviteId(userId);

      // Envoyer le message
      const sent = webSocketManager.sendMessage({
        type: 'send_game_invite',
        toUserId: userId,
        inviteId: inviteId
      });

      if (!sent) {
        const error = 'Failed to send message';
        this.logError(error);
        return { success: false, error };
      }

      // Enregistrer l'invitation
      invitationStore.addSentInvite(userId, inviteId);
      this.updateRateLimit(userId);

      return { success: true, inviteId };

    } catch (error) {
      const errorMessage = `Send invite error: ${error}`;
      this.logError(errorMessage, { userId, error });
      return { success: false, error: errorMessage };
    }
  }

  // Respond to invitation
  async respondToInvite(inviteId: string, accept: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // Validation
      if (!InvitationValidation.isValidInviteId(inviteId)) {
        const error = 'Invalid invite ID';
        this.logError(error, { inviteId });
        return { success: false, error };
      }

      // Check if invitation exists
      const receivedInvites = invitationStore.getReceivedInvites();
      const invite = receivedInvites.find(inv => inv.inviteId === inviteId);
      
      if (!invite) {
        const error = 'Invite not found';
        this.logError(error, { inviteId });
        return { success: false, error };
      }

      // Check expiration
      if (invite.expiresAt && invite.expiresAt < Date.now()) {
        const error = 'Invite has expired';
        this.logError(error, { inviteId, expiresAt: invite.expiresAt });
        invitationStore.expireInvite(inviteId);
        return { success: false, error };
      }

      // Vérifier la connexion
      if (!webSocketManager.isConnected()) {
        const error = 'Not connected to server';
        this.logError(error);
        return { success: false, error };
      }

      // Send response
      const sent = webSocketManager.sendMessage({
        type: 'respond_game_invite',
        inviteId: inviteId,
        accept: accept
      });

      if (!sent) {
        const error = 'Failed to send response';
        this.logError(error);
        return { success: false, error };
      }

      // Supprimer l'invitation reçue
      invitationStore.removeInvite(inviteId);

      return { success: true };

    } catch (error) {
      const errorMessage = `Respond invite error: ${error}`;
      this.logError(errorMessage, { inviteId, accept, error });
      return { success: false, error: errorMessage };
    }
  }

  // 🔄 Callbacks Management
  setCallbacks(callbacks: Partial<InvitationCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  removeCallback(callbackName: keyof InvitationCallbacks): void {
    delete this.callbacks[callbackName];
  }

  // 📊 État et Informations
  getConnectionState(): { connected: boolean; info: any } {
    const connection = webSocketManager.getConnectionInfo();
    const store = invitationStore.getConnectionState();
    
    return {
      connected: webSocketManager.isConnected(),
      info: {
        websocket: connection,
        store: store
      }
    };
  }

  getInvitations(): { received: GameInvite[]; sent: any[] } {
    return {
      received: invitationStore.getReceivedInvites(),
      sent: invitationStore.getSentInvites()
    };
  }

  getStats(): {
    received: number;
    sent: number;
    rateLimitedUsers: number;
    connectionState: string;
  } {
    const invites = this.getInvitations();
    const connectionState = this.getConnectionState();
    
    return {
      received: invites.received.length,
      sent: invites.sent.length,
      rateLimitedUsers: this.lastInviteTimes.size,
      connectionState: connectionState.connected ? 'connected' : 'disconnected'
    };
  }

  // 🚦 Rate Limiting
  private checkRateLimit(userId: number): { allowed: boolean; message?: string } {
    const now = Date.now();
    const lastInviteTime = this.lastInviteTimes.get(userId);
    
    if (!lastInviteTime) {
      return { allowed: true };
    }

    const timeSinceLastInvite = now - lastInviteTime;
    
    if (timeSinceLastInvite < this.RATE_LIMIT_WINDOW) {
      const remainingTime = Math.ceil((this.RATE_LIMIT_WINDOW - timeSinceLastInvite) / 1000);
      return { 
        allowed: false, 
        message: `Please wait ${remainingTime} seconds before sending another invite to this user` 
      };
    }

    return { allowed: true };
  }

  private updateRateLimit(userId: number): void {
    this.lastInviteTimes.set(userId, Date.now());
  }

  // 🔧 Utilities
  private generateInviteId(userId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `invite_${userId}_${timestamp}_${random}`;
  }


  private logError(message: string, data?: any): void {
    console.error(`[InvitationService] ${message}`, data || '');
  }

  // Integration with Game.ts - DEPRECATED
  // Game.ts now manages its own external handler with filtering
  enableGameIntegration(): void {
  }

  disableGameIntegration(): void {
    webSocketManager.removeExternalHandler();
  }

  // Retry and Recovery
  async retryConnection(): Promise<boolean> {
    try {
      webSocketManager.forceReconnect();
      
      // Wait for connection (max 10 seconds)
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20; // 10 secondes (500ms * 20)
        
        const checkConnection = () => {
          attempts++;
          
          if (webSocketManager.isConnected()) {
            resolve(true);
          } else if (attempts >= maxAttempts) {
            resolve(false);
          } else {
            setTimeout(checkConnection, 500);
          }
        };
        
        checkConnection();
      });
    } catch (error) {
      this.logError('Retry connection failed', error);
      return false;
    }
  }

  // Cleanup
  cleanup(): void {
    
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    
    this.callbacks = {};
    this.lastInviteTimes.clear();
    
    // Ne pas nettoyer le store et webSocketManager car partagés
  }

  destroy(): void {
    this.cleanup();
    InvitationService.instance = null as any;
  }
}

// Export du singleton avec configuration par défaut
export const invitationService = InvitationService.getInstance({
  debugMode: process.env.NODE_ENV === 'development'
});