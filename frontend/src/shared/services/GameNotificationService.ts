// ============================================================================
// GameNotificationService.ts - Service to manage game invitation notifications
// ============================================================================

import { GameManager } from '../../services/GameManager';
import { GameInviteNotification } from '../components/GameInviteNotification';
import { router } from '../../core/app/Router';
import type { GameInviteData, GameSessionCreated } from '../../services/GameInvitationManager';

export class GameNotificationService {
  private static instance: GameNotificationService;
  private gameManager: GameManager | null = null;
  private activeNotifications = new Map<string, GameInviteNotification>();
  private isInitialized = false;

  static getInstance(): GameNotificationService {
    if (!GameNotificationService.instance) {
      GameNotificationService.instance = new GameNotificationService();
    }
    return GameNotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.gameManager = GameManager.getInstance();
      await this.gameManager.initialize();

      this.setupEventListeners();
      this.isInitialized = true;

      console.log('✅ GameNotificationService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize GameNotificationService:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.gameManager) return;

    // Listen for incoming invitations
    this.gameManager.onInviteReceived = (invite: GameInviteData) => {
      this.showInviteNotification(invite);
    };

    // Listen for session creation to redirect to game
    this.gameManager.onSessionCreated = (session: GameSessionCreated) => {
      console.log('🎮 Game session created, redirecting to game...', session);
      this.redirectToGame(session.session_id);
    };

    // Listen for game start
    this.gameManager.onGameStarted = (sessionId: string) => {
      console.log('🚀 Game started!', sessionId);
    };

    // Listen for errors (filter out non-critical unhandled message errors)
    this.gameManager.onError = (error) => {
      // Skip showing alerts for unhandled message errors (not critical)
      if (error.message?.includes('Unrecognized message type') || 
          error.message?.includes('unhandled_message')) {
        console.debug('🔇 Filtered non-critical message:', error.message);
        return;
      }
      
      console.error('🚨 Game error:', error);
      alert(`Erreur de jeu: ${error.message}`);
    };
  }

  private showInviteNotification(invite: GameInviteData): void {
    // Remove any existing notification for this invite
    const existingNotification = this.activeNotifications.get(invite.id);
    if (existingNotification) {
      existingNotification.destroy();
    }

    // Create new notification
    const notification = new GameInviteNotification(invite, (accepted: boolean) => {
      this.activeNotifications.delete(invite.id);

      if (accepted) {
        console.log(`✅ Invitation ${invite.id} accepted`);
      } else {
        console.log(`❌ Invitation ${invite.id} declined/expired`);
      }
    });

    this.activeNotifications.set(invite.id, notification);
    notification.show();

    console.log(`📬 Game invitation notification shown for ${invite.from_username}`);
  }

  private redirectToGame(sessionId: string): void {
    // Clear any pending notifications
    this.clearAllNotifications();

    // Navigate to game page
    router.navigate('/game');

    console.log(`🎮 Redirected to game for session ${sessionId}`);
  }

  private clearAllNotifications(): void {
    this.activeNotifications.forEach(notification => {
      notification.destroy();
    });
    this.activeNotifications.clear();
  }

  public getGameManager(): GameManager | null {
    return this.gameManager;
  }

  public isGameManagerInitialized(): boolean {
    return this.isInitialized && this.gameManager !== null;
  }

  public disconnect(): void {
    this.clearAllNotifications();

    if (this.gameManager) {
      this.gameManager.disconnect();
    }

    this.isInitialized = false;
    console.log('🔌 GameNotificationService disconnected');
  }

  public destroy(): void {
    this.disconnect();

    if (this.gameManager) {
      this.gameManager.destroy();
      this.gameManager = null;
    }

    GameNotificationService.instance = null as any;
    console.log('💥 GameNotificationService destroyed');
  }
}

// Export a singleton instance for easy access
export const gameNotificationService = GameNotificationService.getInstance();