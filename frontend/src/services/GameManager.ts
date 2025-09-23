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
  onGameStateUpdate: ((state: OnlineGameState) => void) | null;
  onGameEvent: ((event: string, data: any) => void) | null;
  onGameEnded: ((result: any) => void) | null;

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
  public onGameStateUpdate: ((state: OnlineGameState) => void) | null = null;
  public onGameEvent: ((event: string, data: any) => void) | null = null;
  public onGameEnded: ((result: any) => void) | null = null;
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
      console.log('🎮 [GameManager] onStateUpdate received:', state);
      if (this.onGameStateUpdate) {
        const onlineState = convertLocalToOnlineGameState(state);
        console.log('🎮 [GameManager] Converted to online state:', onlineState);
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

    this.gameService.sendInput(input);
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

    // Use legacy chat service for leaving if it's an online game
    if (this.isOnlineGame()) {
      this.chatService.leaveGame();
    }

    // Disconnect from game service
    this.gameService.disconnect();

    // Clean up session
    this.currentSessionId = null;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting GameManager...');

    // Leave current game if any
    if (this.currentSessionId) {
      this.leaveCurrentGame();
    }

    // Disconnect services
    this.gameService.disconnect();
    this.invitationManager.disconnect();

    // Note: ChatService should remain connected for other features
    // this.chatService.disconnect();

    this.isInitialized = false;
  }

  async destroy(): Promise<void> {
    console.log('💥 Destroying GameManager...');

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
    this.onGameStateUpdate = null;
    this.onGameEvent = null;
    this.onGameEnded = null;
    this.onNetworkUpdate = null;
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
}