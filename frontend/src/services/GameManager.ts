// ============================================================================
// GameManager.ts - Unified game management with chat integration
// ============================================================================

import { ChatService } from '../features/friends/services/ChatService';
import { GameService } from './GameService';
import { GameInvitationManager, GameInviteData, GameInviteResponse, GameSessionCreated } from './GameInvitationManager';
import {
  GameState as OnlineGameState,
  PlayerInput,
  GameSession,
  OnlineGameError,
  NetworkMetrics
} from '../shared/types/OnlineGameTypes';
import {
  GameState as LocalGameState,
  PongState
} from '../features/game/types/GameTypes';

// ============================================================================
// Type Conversion Utilities
// ============================================================================

function convertPongStateToNumber(pongState: PongState): number {
  switch (pongState) {
    case PongState.Running:
      return 0;
    case PongState.Aborted:
      return 1;
    case PongState.LeftWins:
      return 2;
    case PongState.RightWins:
      return 3;
    default:
      return 0;
  }
}

function convertLocalToOnlineGameState(localState: LocalGameState): OnlineGameState {
  return {
    leftPaddle: { pos: localState.leftPaddle.pos, hitCount: localState.leftPaddle.hitCount },
    rightPaddle: { pos: localState.rightPaddle.pos, hitCount: localState.rightPaddle.hitCount },
    ball: { pos: localState.ball.pos, direction: localState.ball.direction },
    state: convertPongStateToNumber(localState.state),
    leftScore: localState.leftScore ?? 0,
    rightScore: localState.rightScore ?? 0
  };
}

// ============================================================================
// Game Manager Events
// ============================================================================

export interface GameManagerEvents {
  // Connection events
  onConnected: (() => void) | null;
  onDisconnected: (() => void) | null;
  onError: ((error: OnlineGameError) => void) | null;

  // Invitation events
  onInviteReceived: ((invite: GameInviteData) => void) | null;
  onInviteResponse: ((response: GameInviteResponse) => void) | null;
  onSessionCreated: ((session: GameSessionCreated) => void) | null;

  // Game events
  onGameStarted: ((sessionId: string) => void) | null;
  onGameActuallyStarted: (() => void) | null;
  onGameStateUpdate: ((state: OnlineGameState) => void) | null;
  onGameEvent: ((event: string, data: any) => void) | null;
  onGameEnded: ((result: any) => void) | null;
  onCountdown: ((count: number) => void) | null;

  // Network events
  onNetworkUpdate: ((metrics: NetworkMetrics) => void) | null;
}

// ============================================================================
// Main Game Manager
// ============================================================================

export class GameManager implements GameManagerEvents {
  private static instance: GameManager;
  private chatService: ChatService;
  private gameService: GameService;
  private invitationManager: GameInvitationManager;
  private currentSessionId: string | null = null;
  private isInitialized = false;

  // Event handlers - implementing GameManagerEvents interface
  public onConnected: (() => void) | null = null;
  public onDisconnected: (() => void) | null = null;
  public onError: ((error: OnlineGameError) => void) | null = null;
  public onInviteReceived: ((invite: GameInviteData) => void) | null = null;
  public onInviteSent: ((inviteId: string) => void) | null = null;
  public onInviteResponse: ((response: GameInviteResponse) => void) | null = null;
  public onSessionCreated: ((session: GameSessionCreated) => void) | null = null;
  public onGameStarted: ((sessionId: string) => void) | null = null;
  public onGameActuallyStarted: (() => void) | null = null;
  public onGameStateUpdate: ((state: OnlineGameState) => void) | null = null;
  public onGameEvent: ((event: string, data: any) => void) | null = null;
  public onGameEnded: ((result: any) => void) | null = null;
  public onCountdown: ((count: number) => void) | null = null;
  public onNetworkUpdate: ((metrics: NetworkMetrics) => void) | null = null;

  private constructor() {
    this.chatService = ChatService.getInstance();
    this.gameService = new GameService(this.chatService);
    this.invitationManager = GameInvitationManager.getInstance(this.chatService, this.gameService);
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize chat service (handles existing WebSocket for invitations)
      await this.chatService.connect();

      // Setup event forwarding from subsystems
      this.setupEventForwarding();

      this.isInitialized = true;
      console.log('✅ GameManager initialized successfully');

      if (this.onConnected) {
        this.onConnected();
      }
    } catch (error) {
      console.error('❌ Failed to initialize GameManager:', error);

      if (this.onError) {
        this.onError(new OnlineGameError(
          `GameManager initialization failed: ${error}`,
          'INIT_FAILED'
        ));
      }
      throw error;
    }
  }

  private setupEventForwarding(): void {
    // Forward invitation events
    this.invitationManager.onInviteReceived = (invite) => {
      if (this.onInviteReceived) {
        this.onInviteReceived(invite);
      }
    };

    this.invitationManager.onInviteResponse = (response) => {
      if (this.onInviteResponse) {
        this.onInviteResponse(response);
      }
    };

    this.invitationManager.onSessionCreated = (session) => {
      if (this.onSessionCreated) {
        this.onSessionCreated(session);
      }
    };

    this.invitationManager.onGameStarted = (sessionId) => {
      this.currentSessionId = sessionId;
      if (this.onGameStarted) {
        this.onGameStarted(sessionId);
      }
    };

    this.invitationManager.onGameEnded = (result) => {
      if (this.onGameEnded) {
        this.onGameEnded(result);
      }
    };

    this.invitationManager.onError = (error) => {
      if (this.onError) {
        this.onError(error);
      }
    };

    // Forward game service events
    this.gameService.onStateUpdate = (state) => {
      // Reduce logs: only log significant state changes
      if (this.onGameStateUpdate) {
        const onlineState = convertLocalToOnlineGameState(state);
        this.onGameStateUpdate(onlineState);
      }
    };

    this.gameService.onGameEvent = (event, data) => {
      if (event === 'game_ended') {
        this.handleGameEnded(data);
      }

      if (this.onGameEvent) {
        this.onGameEvent(event, data);
      }
    };

    this.gameService.onError = (error) => {
      if (this.onError) {
        this.onError(error);
      }
    };

    // Forward chat service events
    this.chatService.on('disconnected', () => {
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    this.chatService.on('error', (data) => {
      if (this.onError) {
        this.onError(new OnlineGameError(
          data.message || 'Chat service error',
          'CHAT_ERROR'
        ));
      }
    });

    this.chatService.on('game_countdown', (data) => {
      if (this.onCountdown) {
        this.onCountdown(data.count);
      }
    });

    this.chatService.on('game_starting', (data) => {
      if (this.onGameActuallyStarted) {
        this.onGameActuallyStarted();
      }
    });
  }

  // ============================================================================
  // Game Invitation API
  // ============================================================================

  async sendGameInvite(toUserId: number, toUsername: string): Promise<string> {
    if (!this.isInitialized) {
      throw new OnlineGameError('GameManager not initialized', 'NOT_INITIALIZED');
    }

    try {
      const inviteId = await this.invitationManager.sendGameInvite(toUserId, toUsername);
      console.log(`📤 Game invite sent to ${toUsername} (ID: ${inviteId})`);

      // Trigger onInviteSent event
      if (this.onInviteSent) {
        this.onInviteSent(inviteId);
      }

      return inviteId;
    } catch (error) {
      console.error(`❌ Failed to send game invite to ${toUsername}:`, error);
      throw error;
    }
  }

  respondToInvite(inviteId: string, response: 'accept' | 'decline'): void {
    if (!this.isInitialized) {
      throw new OnlineGameError('GameManager not initialized', 'NOT_INITIALIZED');
    }

    this.invitationManager.respondToInvite(inviteId, response);
    console.log(`📥 Responded to invite ${inviteId}: ${response}`);
  }

  getPendingInvites(): GameInviteData[] {
    return this.invitationManager.getPendingInvites();
  }

  // ============================================================================
  // Game Session API
  // ============================================================================

  async joinGameSession(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new OnlineGameError('GameManager not initialized', 'NOT_INITIALIZED');
    }

    try {
      await this.invitationManager.joinGameSession(sessionId);
      this.currentSessionId = sessionId;
      console.log(`🎮 Joined game session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to join game session ${sessionId}:`, error);
      throw error;
    }
  }

  async createLocalGame(): Promise<void> {
    try {
      await this.gameService.initializeSession('local-game', 'local');
      this.currentSessionId = 'local-game';
      console.log('🎮 Local game created');
    } catch (error) {
      console.error('❌ Failed to create local game:', error);
      throw error;
    }
  }

  // ============================================================================
  // Game Control API
  // ============================================================================

  sendInput(input: PlayerInput): void {
    if (!this.currentSessionId) {
      console.warn('Cannot send input - no active game session');
      return;
    }

    console.log(`🎮 GameManager.sendInput: ${input.key}=${input.pressed}, sessionId=${this.currentSessionId}`);
    this.gameService.sendInput(input);
  }

  sendReady(ready: boolean): void {
    if (!this.currentSessionId) {
      console.warn('Cannot send ready status - no active game session');
      return;
    }

    this.gameService.sendReady(ready);
  }

  getCurrentGameState(): OnlineGameState | null {
    const localState = this.gameService.currentState;
    return localState ? convertLocalToOnlineGameState(localState) : null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  isInGame(): boolean {
    return this.currentSessionId !== null && this.gameService.isConnected();
  }

  isLocalGame(): boolean {
    return this.currentSessionId === 'local-game' && this.gameService.mode === 'local';
  }

  isOnlineGame(): boolean {
    return this.currentSessionId !== null &&
           this.currentSessionId !== 'local-game' &&
           this.gameService.mode === 'online';
  }

  // ============================================================================
  // Network and Metrics API
  // ============================================================================

  getNetworkMetrics(): NetworkMetrics {
    return this.gameService.getNetworkMetrics();
  }

  isConnected(): boolean {
    return this.chatService.isConnected() &&
           (this.gameService.mode === 'local' || this.gameService.isConnected());
  }

  // ============================================================================
  // Game Event Handlers
  // ============================================================================

  private handleGameEnded(data: any): void {
    // Prevent duplicate game end processing
    if (!this.currentSessionId) {
      console.log('🔄 Game already ended, skipping duplicate end event');
      return;
    }

    console.log('🏁 Game ended:', data);

    // Clean up current session
    const endedSessionId = this.currentSessionId;
    this.currentSessionId = null;

    // Notify about game end
    if (this.onGameEnded) {
      this.onGameEnded({
        sessionId: endedSessionId,
        ...data
      });
    }

    // Disconnect from game server (chat stays connected)
    this.gameService.disconnect();
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  leaveCurrentGame(): void {
    if (!this.currentSessionId) {
      console.warn('No active game to leave');
      return;
    }

    console.log(`🚪 Leaving game session: ${this.currentSessionId}`);

    // Always notify server for online games with timeout and retry
    if (this.isOnlineGame()) {
      this.leaveGameWithRetry();
    }

    // Disconnect from game service
    this.gameService.disconnect();

    // Clean up session
    this.currentSessionId = null;
  }

  private leaveGameWithRetry(retryCount: number = 0): void {
    const maxRetries = 3;
    const retryDelay = 500; // 500ms

    try {
      console.log(`📤 Attempting to leave game (attempt ${retryCount + 1}/${maxRetries + 1})`);
      this.chatService.leaveGame();

      // If successful, we're done
      console.log('✅ Game leave notification sent successfully');
    } catch (error) {
      console.warn(`⚠️ Game leave attempt ${retryCount + 1} failed:`, error);

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying game leave in ${retryDelay}ms...`);
        setTimeout(() => {
          this.leaveGameWithRetry(retryCount + 1);
        }, retryDelay * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('❌ All game leave attempts failed - server may not be notified');
        // Force local cleanup even if server notification failed
        try {
          this.chatService.forceResetGameState();
        } catch (cleanupError) {
          console.error('Force cleanup also failed:', cleanupError);
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting GameManager...');

    // Leave current game if any with forced cleanup
    if (this.currentSessionId) {
      console.log('🚪 Forcing game leave during disconnect');
      this.forceLeaveGame();
    }

    // Disconnect services
    this.gameService.disconnect();
    this.invitationManager.disconnect();

    // Note: ChatService should remain connected for other features
    // this.chatService.disconnect();

    this.isInitialized = false;
  }

  // Force leave game - used during disconnect/destroy to ensure cleanup
  private forceLeaveGame(): void {
    if (!this.currentSessionId) return;

    console.log(`💥 Force leaving game session: ${this.currentSessionId}`);

    try {
      // Immediate server notification without retries
      if (this.isOnlineGame() && this.chatService.isConnected()) {
        this.chatService.leaveGame();
      }

      // Force reset game state
      this.chatService.forceResetGameState();
    } catch (error) {
      console.warn('Error during force leave:', error);
    } finally {
      // Always clean up local state
      this.gameService.disconnect();
      this.currentSessionId = null;
    }
  }

  async destroy(): Promise<void> {
    console.log('💥 Destroying GameManager...');

    // Force immediate cleanup
    if (this.currentSessionId) {
      this.forceLeaveGame();
    }

    await this.disconnect();

    // Clean up managers
    this.invitationManager.destroy();
    this.gameService.destroy();

    // Clear event handlers
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    this.onInviteReceived = null;
    this.onInviteResponse = null;
    this.onSessionCreated = null;
    this.onGameStarted = null;
    this.onGameActuallyStarted = null;
    this.onGameStateUpdate = null;
    this.onGameEvent = null;
    this.onGameEnded = null;
    this.onCountdown = null;
    this.onNetworkUpdate = null;

    console.log('✅ GameManager destroyed');
  }

  // ============================================================================
  // Development and Debugging
  // ============================================================================

  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      currentSessionId: this.currentSessionId,
      chatConnected: this.chatService.isConnected(),
      gameConnected: this.gameService.isConnected(),
      gameMode: this.gameService.mode,
      pendingInvites: this.invitationManager.getPendingInvites().length,
      activeSessions: this.invitationManager.getActiveSessions().length,
      networkMetrics: this.getNetworkMetrics()
    };
  }

  getGameService(): GameService {
    return this.gameService;
  }
}