// ============================================================================
// GameInvitationManager.ts - Bridge between ChatService and new GameService
// ============================================================================

import { ChatService } from '../features/friends/services/ChatService';
import { GameService } from './GameService';
import { router } from '../core/app/Router';
import {
  GameInvitation,
  GameSession,
  OnlineGameError,
  generateId
} from '../shared/types/OnlineGameTypes';

// ============================================================================
// Game Invitation Types
// ============================================================================

export interface GameInviteData {
  id: string;
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  to_username: string;
  game_type: 'pong';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface GameInviteResponse {
  invite_id: string;
  response: 'accept' | 'decline';
  session_id?: string;
}

export interface GameSessionCreated {
  session_id: string;
  player1_id: number;
  player2_id: number;
  game_type: 'pong';
  created_at: string;
}

// ============================================================================
// Main Game Invitation Manager
// ============================================================================

export class GameInvitationManager {
  private static instance: GameInvitationManager;
  private chatService: ChatService;
  private gameService: GameService;
  private pendingInvites = new Map<string, GameInviteData>();
  private activeSessions = new Map<string, GameSession>();

  // Event handlers
  public onInviteReceived: ((invite: GameInviteData) => void) | null = null;
  public onInviteResponse: ((response: GameInviteResponse) => void) | null = null;
  public onSessionCreated: ((session: GameSessionCreated) => void) | null = null;
  public onGameStarted: ((sessionId: string) => void) | null = null;
  public onGameEnded: ((result: any) => void) | null = null;
  public onError: ((error: OnlineGameError) => void) | null = null;

  private constructor(chatService: ChatService, gameService: GameService) {
    this.chatService = chatService;
    this.gameService = gameService;
    this.setupChatServiceListeners();
  }

  static getInstance(chatService?: ChatService, gameService?: GameService): GameInvitationManager {
    if (!GameInvitationManager.instance) {
      if (!chatService || !gameService) {
        throw new Error('ChatService and GameService required for first initialization');
      }
      GameInvitationManager.instance = new GameInvitationManager(chatService, gameService);
    }
    return GameInvitationManager.instance;
  }

  // For testing compatibility
  initialize(gameService?: GameService): void {
    if (gameService) {
      this.gameService = gameService;
    }
    // Re-setup listeners if needed
    this.setupChatServiceListeners();
  }

  // ============================================================================
  // Chat Service Integration
  // ============================================================================

  private setupChatServiceListeners(): void {
    // Handle incoming game invitations
    this.chatService.on('game_invite_received', (data) => {
      this.handleInviteReceived(data);
    });

    // Handle game invitation responses
    this.chatService.on('game_invite_response', (data) => {
      this.handleInviteResponse(data);
    });

    // Handle invite accepted
    this.chatService.on('game_invite_accepted', (data) => {
      console.log('🎮 [GameInvitationManager] Invite accepted:', data);
      this.handleInviteAccepted(data);
    });

    // Handle game session creation
    this.chatService.on('game_session_created', (data) => {
      this.handleSessionCreated(data);
    });

    // Handle game start message from server
    this.chatService.on('game_starting', (data) => {
      console.log('🎮 [GameInvitationManager] Game starting received:', data);
      this.handleGameStart(data);
    });

    // Handle legacy game started events (bridge to new system)
    this.chatService.on('game_started', (data) => {
      this.handleLegacyGameStarted(data);
    });

    // Handle legacy game success (session creation)
    this.chatService.on('success', (data) => {
      if (data.data?.gameId) {
        this.handleLegacyGameSuccess(data);
      }
    });

    // Handle game end events
    this.chatService.on('game_ended', (data) => {
      this.handleGameEnded(data);
    });
  }

  private handleInviteReceived(data: any): void {
    const invite: GameInviteData = {
      id: data.id || generateId(),
      from_user_id: data.from_user_id,
      from_username: data.from_username,
      to_user_id: data.to_user_id,
      to_username: data.to_username,
      game_type: 'pong',
      status: 'pending',
      created_at: data.created_at || new Date().toISOString(),
      expires_at: data.expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };

    this.pendingInvites.set(invite.id, invite);

    if (this.onInviteReceived) {
      this.onInviteReceived(invite);
    }

    // Auto-expire invite after timeout
    setTimeout(() => {
      this.expireInvite(invite.id);
    }, 5 * 60 * 1000); // 5 minutes
  }

  private handleInviteResponse(data: any): void {
    const response: GameInviteResponse = {
      invite_id: data.invite_id,
      response: data.response,
      session_id: data.session_id
    };

    // Update pending invite status
    const invite = this.pendingInvites.get(response.invite_id);
    if (invite) {
      invite.status = response.response === 'accept' ? 'accepted' : 'declined';

      if (response.response === 'accept' && response.session_id) {
        // Create game session for accepted invite
        this.createGameSession(response.session_id, invite);
      } else {
        // Remove declined or failed invites
        this.pendingInvites.delete(response.invite_id);
      }
    }

    if (this.onInviteResponse) {
      this.onInviteResponse(response);
    }
  }

  private handleInviteAccepted(data: any): void {
    console.log('🎮 [GameInvitationManager] Processing invite accepted:', data);
    
    // Create a session if we have the necessary data
    if (data.gameId || data.sessionId) {
      const sessionId = data.gameId?.toString() || data.sessionId?.toString();
      
      // Try to find the invite or create a mock one
      const inviteId = data.inviteId || data.invite_id;
      let invite = this.pendingInvites.get(inviteId);
      
      if (!invite) {
        // Create a mock invite if we don't have it
        invite = {
          id: inviteId || 'unknown',
          from_user_id: data.fromUserId || 0,
          from_username: data.fromUsername || 'Unknown',
          to_user_id: data.toUserId || 0,
          to_username: data.toUsername || 'Unknown',
          game_type: 'pong',
          status: 'accepted',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        };
      }
      
      this.createGameSession(sessionId, invite);
    }
  }

  private handleLegacyGameStarted(data: any): void {
    const sessionId = data.gameId?.toString() || data.session_id || generateId();

    if (this.onGameStarted) {
      this.onGameStarted(sessionId);
    }

    // Initialize the new GameService for this session
    this.initializeGameSession(sessionId);
  }

  private handleLegacyGameSuccess(data: any): void {
    const sessionId = data.data.gameId.toString();

    // Create session data
    const sessionCreated: GameSessionCreated = {
      session_id: sessionId,
      player1_id: 0, // Will be filled from game context
      player2_id: 0, // Will be filled from game context
      game_type: 'pong',
      created_at: new Date().toISOString()
    };

    if (this.onSessionCreated) {
      this.onSessionCreated(sessionCreated);
    }
  }

  private handleGameEnded(data: any): void {
    console.log('🏁 Game ended:', data);

    if (this.onGameEnded) {
      this.onGameEnded(data);
    }
  }

  // ============================================================================
  // Game Session Management
  // ============================================================================

  private handleSessionCreated(data: any): void {
    console.log('🎮 GameInvitationManager: Game session created:', data);
    console.log('🔍 [DEBUG] SessionCreated data structure:', JSON.stringify(data, null, 2));

    const sessionCreated: GameSessionCreated = {
      session_id: data.session_id,
      player1_id: data.player_1 || data.player1_id || 0,
      player2_id: data.player_2 || data.player2_id || 0,
      game_type: 'pong',
      created_at: data.created_at || new Date().toISOString()
    };

    if (this.onSessionCreated) {
      console.log('📢 Calling onSessionCreated callback with:', sessionCreated);
      this.onSessionCreated(sessionCreated);
    } else {
      console.warn('⚠️ onSessionCreated callback is not set');
    }

    // Auto-join the session
    try {
      this.initializeGameSession(data.session_id);
    } catch (error) {
      console.error('❌ Failed to auto-join session:', error);
    }
  }

  public handleGameStart(data: any): void {
    console.log('🎮 [GameInvitationManager] Handling game start:', data);
    console.log('🔍 [DEBUG] Game start data structure:', JSON.stringify(data, null, 2));

    // Extract game data from server response
    const gameId = data.gameId;
    const opponent = data.opponent;
    const side = data.side; // 'left' or 'right'

    if (!gameId) {
      console.error('❌ No gameId in game_start message');
      return;
    }

    // Initialize the game session with the GameService
    try {
      console.log('🚀 [GameInvitationManager] Starting game session:', {
        gameId,
        opponent,
        side
      });

      if (this.gameService) {
        // Initialize the online game session
        this.gameService.initializeSession(gameId, 'online').then(() => {
          console.log('✅ Game session initialized successfully');
          
          // Store game metadata for later use
          (this.gameService as any).gameMetadata = {
            gameId,
            opponent,
            playerSide: side
          };
          
          // Navigate to the game page
          console.log('🚀 [GameInvitationManager] Navigating to game page...');
          router.navigate(`/game/${gameId}`).then(() => {
            console.log('✅ Successfully navigated to game page');
          }).catch((error: any) => {
            console.error('❌ Failed to navigate to game page:', error);
          });
          
        }).catch((error) => {
          console.error('❌ Failed to initialize game session:', error);
        });
      } else {
        console.error('❌ GameService not available');
      }
    } catch (error) {
      console.error('❌ Failed to start game session:', error);
    }
  }

  private createGameSession(sessionId: string, invite: GameInviteData): void {
    const session: GameSession = {
      id: sessionId,
      leftPlayerId: invite.from_user_id.toString(),
      rightPlayerId: invite.to_user_id.toString(),
      leftPlayerUsername: invite.from_username,
      rightPlayerUsername: invite.to_username,
      state: {
        leftPaddle: { pos: { x: 20, y: 300 }, hitCount: 0 },
        rightPaddle: { pos: { x: 760, y: 300 }, hitCount: 0 },
        ball: { pos: { x: 400, y: 300 }, direction: { x: 1, y: 0 } },
        state: 0,
        leftScore: 0,
        rightScore: 0
      },
      status: 'waiting',
      createdAt: new Date().toISOString()
    };

    this.activeSessions.set(sessionId, session);

    const sessionCreated: GameSessionCreated = {
      session_id: sessionId,
      player1_id: invite.from_user_id,
      player2_id: invite.to_user_id,
      game_type: 'pong',
      created_at: session.createdAt
    };

    if (this.onSessionCreated) {
      this.onSessionCreated(sessionCreated);
    }
  }

  private async initializeGameSession(sessionId: string): Promise<void> {
    try {
      // Initialize the new GameService with enhanced features
      await this.gameService.initializeSession(sessionId, 'online');

      // Connect to the game server using the new protocol
      await this.gameService.connectToGameServer(sessionId);

      console.log(`✅ Enhanced game session ${sessionId} initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize enhanced game session ${sessionId}:`, error);

      if (this.onError) {
        this.onError(new OnlineGameError(
          `Failed to initialize game session: ${error}`,
          'SESSION_INIT_FAILED',
          sessionId
        ));
      }
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  async sendGameInvite(toUserId: number, toUsername: string): Promise<string> {
    try {
      // Use the existing ChatService to send invitation through existing WebSocket
      const inviteId = await this.chatService.sendGameInvite(toUserId, toUsername);

      // Create local invite record
      const invite: GameInviteData = {
        id: inviteId,
        from_user_id: 0, // Will be filled from auth context
        from_username: '', // Will be filled from auth context
        to_user_id: toUserId,
        to_username: toUsername,
        game_type: 'pong',
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      };

      this.pendingInvites.set(inviteId, invite);

      return inviteId;
    } catch (error) {
      if (this.onError) {
        this.onError(new OnlineGameError(
          `Failed to send game invite: ${error}`,
          'INVITE_SEND_FAILED'
        ));
      }
      throw error;
    }
  }

  respondToInvite(inviteId: string, response: 'accept' | 'decline'): void {
    const invite = this.pendingInvites.get(inviteId);
    if (!invite) {
      console.warn(`Invite ${inviteId} not found`);
      return;
    }

    console.log(`🎮 [GameInvitationManager] Responding to invite ${inviteId}: ${response}`);
    console.log(`🔍 [DEBUG] Invite details:`, JSON.stringify(invite, null, 2));
    
    // Send response to server via ChatService
    this.chatService.respondToGameInvite(inviteId, response)
      .then(() => {
        console.log(`✅ [GameInvitationManager] Response sent to server: ${response}`);
        invite.status = response === 'accept' ? 'accepted' : 'declined';
        
        if (response === 'decline') {
          this.pendingInvites.delete(inviteId);
        }
      })
      .catch((error) => {
        console.error(`❌ [GameInvitationManager] Failed to send response:`, error);
      });
  }

  private expireInvite(inviteId: string): void {
    const invite = this.pendingInvites.get(inviteId);
    if (invite && invite.status === 'pending') {
      invite.status = 'expired';
      this.pendingInvites.delete(inviteId);
      console.log(`⏰ Game invite ${inviteId} expired`);
    }
  }

  // ============================================================================
  // Game Service Bridge
  // ============================================================================

  async joinGameSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new OnlineGameError('Game session not found', 'SESSION_NOT_FOUND', sessionId);
    }

    try {
      await this.initializeGameSession(sessionId);
    } catch (error) {
      if (this.onError) {
        this.onError(new OnlineGameError(
          `Failed to join game session: ${error}`,
          'SESSION_JOIN_FAILED',
          sessionId
        ));
      }
      throw error;
    }
  }

  getGameService(): GameService {
    return this.gameService;
  }

  getChatService(): ChatService {
    return this.chatService;
  }

  getPendingInvites(): GameInviteData[] {
    return Array.from(this.pendingInvites.values());
  }

  getActiveSessions(): GameSession[] {
    return Array.from(this.activeSessions.values());
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  disconnect(): void {
    // Clean up pending invites
    this.pendingInvites.clear();

    // Disconnect game service
    this.gameService.disconnect();

    // Note: ChatService disconnection should be handled by the ChatService itself
    console.log('🔌 GameInvitationManager disconnected');
  }

  cleanup(): void {
    // Remove ChatService event listeners
    if (this.chatService) {
      try {
        this.chatService.off('game_invite_received', this.handleInviteReceived.bind(this));
        this.chatService.off('game_session_created', this.handleSessionCreated.bind(this));
        this.chatService.off('game_ended', this.handleGameEnded.bind(this));
      } catch (error) {
        // Ignore errors when cleaning up
      }
    }
  }

  destroy(): void {
    this.disconnect();
    this.activeSessions.clear();

    // Clean up event handlers
    this.onInviteReceived = null;
    this.onInviteResponse = null;
    this.onSessionCreated = null;
    this.onGameStarted = null;
    this.onError = null;
  }
}