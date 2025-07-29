// ============================================================================
// GameWebSocket.ts - WebSocket manager for real-time Pong game communication
// ============================================================================
// Phase 3 implementation - integrates with ChatService for real-time game updates

import { 
  GameState, 
  Input, 
  WebSocketError 
} from '../../types/GameTypes';
import { chatService } from '../../services/ChatService';

export interface GameWebSocketCallbacks {
  onGameUpdate?: (gameState: GameState) => void;
  onGameEnd?: (winner: 'left' | 'right' | 'aborted', finalState?: GameState) => void;
  onGameStarted?: (gameData: any) => void;
  onGameJoined?: (gameId: number) => void;
  onGameError?: (error: { type: string; message: string }) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export class GameWebSocket {
  private gameId: number;
  private callbacks: GameWebSocketCallbacks;
  private playerSide: 'left' | 'right' | null = null;
  private isInitialized = false;
  private chatServiceListeners: (() => void)[] = [];

  constructor(gameId: number, callbacks: GameWebSocketCallbacks = {}) {
    this.gameId = gameId;
    this.callbacks = callbacks;
    console.log(`🌐 GameWebSocket: Initialized for game ${gameId}`);
  }

  /**
   * Phase 3: Connect to game via ChatService WebSocket
   * Uses existing ChatService connection for game communication
   */
  public async connect(): Promise<void> {
    console.log(`🔌 GameWebSocket: Connecting to game ${this.gameId} via ChatService`);
    
    try {
      // Ensure ChatService is connected
      if (!chatService.isConnected()) {
        console.log('🔄 GameWebSocket: ChatService not connected, connecting...');
        await chatService.connect();
      }
      
      // Set up ChatService event listeners for game events
      this.setupChatServiceListeners();
      
      this.isInitialized = true;
      
      // Notify connection change
      if (this.callbacks.onConnectionChange) {
        this.callbacks.onConnectionChange(true);
      }
      
      console.log('✅ GameWebSocket: Connected via ChatService');
      
    } catch (error) {
      console.error('❌ GameWebSocket: Connection failed:', error);
      throw new WebSocketError(`Failed to connect to game ${this.gameId}`);
    }
  }

  /**
   * Phase 3: Set up ChatService event listeners for game events
   */
  private setupChatServiceListeners(): void {
    console.log('🎧 GameWebSocket: Setting up ChatService listeners');
    
    // Game state updates (60 FPS)
    const gameUpdateListener = (gameState: any) => {
      if (this.callbacks.onGameUpdate) {
        this.callbacks.onGameUpdate(gameState);
      }
    };
    chatService.on('game_state_update', gameUpdateListener);
    this.chatServiceListeners.push(() => chatService.off('game_state_update', gameUpdateListener));
    
    // Game joined successfully
    const gameJoinedListener = (data: { gameId: number }) => {
      if (data.gameId === this.gameId && this.callbacks.onGameJoined) {
        console.log(`✅ GameWebSocket: Successfully joined game ${data.gameId}`);
        this.callbacks.onGameJoined(data.gameId);
      }
    };
    chatService.on('game_joined', gameJoinedListener);
    this.chatServiceListeners.push(() => chatService.off('game_joined', gameJoinedListener));
    
    // Game started
    const gameStartedListener = (gameData: any) => {
      console.log('🚀 GameWebSocket: Game started');
      if (this.callbacks.onGameStarted) {
        this.callbacks.onGameStarted(gameData);
      }
    };
    chatService.on('game_started', gameStartedListener);
    this.chatServiceListeners.push(() => chatService.off('game_started', gameStartedListener));
    
    // Game ended
    const gameEndedListener = (data: any) => {
      console.log('🏁 GameWebSocket: Game ended');
      if (this.callbacks.onGameEnd) {
        this.callbacks.onGameEnd(data.winner || 'aborted', data.finalState);
      }
    };
    chatService.on('game_ended', gameEndedListener);
    this.chatServiceListeners.push(() => chatService.off('game_ended', gameEndedListener));
    
    // Game errors
    const gameErrorListener = (error: { type: string; message: string }) => {
      console.error('❌ GameWebSocket: Game error:', error);
      if (this.callbacks.onGameError) {
        this.callbacks.onGameError(error);
      }
    };
    chatService.on('game_error', gameErrorListener);
    this.chatServiceListeners.push(() => chatService.off('game_error', gameErrorListener));
    
    // Connection state changes
    const connectionListener = () => {
      const isConnected = chatService.isConnected();
      if (this.callbacks.onConnectionChange) {
        this.callbacks.onConnectionChange(isConnected);
      }
    };
    chatService.on('connected', connectionListener);
    chatService.on('disconnected', connectionListener);
    this.chatServiceListeners.push(() => {
      chatService.off('connected', connectionListener);
      chatService.off('disconnected', connectionListener);
    });
  }

  /**
   * Phase 3: Send player input via ChatService
   */
  public sendInput(input: Input): void {
    if (!this.isInitialized) {
      console.warn('⚠️ GameWebSocket: Cannot send input - not initialized');
      return;
    }

    if (!chatService.isConnected()) {
      console.warn('⚠️ GameWebSocket: Cannot send input - ChatService not connected');
      return;
    }

    // Use ChatService to send game input
    chatService.sendGameInput(input);
  }

  /**
   * Phase 3: Start game with opponent via ChatService
   */
  public async startGame(opponentId: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('GameWebSocket not initialized');
    }

    if (!chatService.isConnected()) {
      throw new Error('ChatService not connected');
    }

    console.log(`🚀 GameWebSocket: Starting game with opponent ${opponentId}`);
    await chatService.startGame(opponentId);
  }

  /**
   * Phase 3: Leave the current game via ChatService
   */
  public leaveGame(): void {
    if (!this.isInitialized) {
      console.warn('⚠️ GameWebSocket: Cannot leave game - not initialized');
      return;
    }

    console.log(`🚪 GameWebSocket: Leaving game ${this.gameId}`);
    chatService.leaveGame();
  }

  /**
   * Phase 3: Disconnect and clean up ChatService listeners
   */
  public disconnect(): void {
    console.log('🔌 GameWebSocket: Disconnecting and cleaning up');
    
    // Clean up ChatService listeners
    this.chatServiceListeners.forEach(cleanup => cleanup());
    this.chatServiceListeners = [];
    
    // Leave the game if connected
    if (this.isInitialized) {
      this.leaveGame();
    }
    
    this.isInitialized = false;
    
    // Notify connection change
    if (this.callbacks.onConnectionChange) {
      this.callbacks.onConnectionChange(false);
    }
  }

  /**
   * Phase 3: Check if connected via ChatService
   */
  public isGameConnected(): boolean {
    return this.isInitialized && chatService.isConnected();
  }

  /**
   * Phase 3: Get current game connection status
   */
  public getConnectionStatus(): { 
    initialized: boolean; 
    chatServiceConnected: boolean; 
    inGame: boolean; 
  } {
    return {
      initialized: this.isInitialized,
      chatServiceConnected: chatService.isConnected(),
      inGame: chatService.isCurrentlyInGame()
    };
  }

  public getPlayerSide(): 'left' | 'right' | null {
    return this.playerSide;
  }

  public getGameId(): number {
    return this.gameId;
  }

  /**
   * Phase 3: Get current game state from ChatService
   */
  public getCurrentGameState(): any {
    return chatService.getCurrentGameState();
  }

  /**
   * Phase 3: Check if currently in this specific game
   */
  public isInThisGame(): boolean {
    return chatService.getCurrentGameId() === this.gameId;
  }
}