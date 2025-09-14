// 🌉 WebSocketGameBridge - Bridge pattern to eliminate dual WebSocket connections
// Mediates between WebSocketManager (invitations) and Game.ts (game logic)
// Ensures single WebSocket connection for entire application

import { WebSocketMessage } from '../../invitations/types/InvitationTypes';

// Game-specific WebSocket message types
interface GameWSMessage extends WebSocketMessage {
  type: 'auth_success' | 'auth_error' | 'ready_status' | 'countdown' | 'game_start' | 
        'game_state' | 'game_end' | 'pong' | 'join_game' | 'player_ready' | 'player_input' | 
        'leave_game' | string;
  data?: any;
  gameId?: number;
}

// Callback interface for game message handling
interface GameMessageHandler {
  (message: GameWSMessage): void;
}

// Interface for game session cleanup
interface GameCleanupHandler {
  (gameId: number): void;
}

/**
 * WebSocketGameBridge - Single point of communication between games and WebSocket
 * 
 * Key Benefits:
 * - Eliminates dual WebSocket connections
 * - Preserves invitation system functionality  
 * - Enables proper game cleanup messages to backend
 * - Maintains separation of concerns
 */
export class WebSocketGameBridge {
  private static instance: WebSocketGameBridge | undefined;
  private gameHandler: GameMessageHandler | null = null;
  private cleanupHandler: GameCleanupHandler | null = null;
  private activeGameId: number | null = null;
  private webSocketManager: any = null; // Will be injected
  private messageQueue: GameWSMessage[] = []; // Queue messages until ready
  
  static getInstance(): WebSocketGameBridge {
    if (!WebSocketGameBridge.instance) {
      WebSocketGameBridge.instance = new WebSocketGameBridge();
    }
    return WebSocketGameBridge.instance;
  }

  private constructor() {
    console.log('🌉 WebSocketGameBridge initialized');
  }

  /**
   * Initialize bridge with WebSocketManager reference
   * Called by WebSocketManager during startup
   */
  initialize(webSocketManager: any): void {
    this.webSocketManager = webSocketManager;
    console.log('🌉 Bridge connected to WebSocketManager');
    
    // Process any queued messages now that we're ready
    this.processMessageQueue();
  }

  /**
   * Called by WebSocketManager when connection becomes ready
   * Triggers processing of any queued messages
   */
  onConnectionReady(): void {
    console.log('🌉 Bridge notified of connection readiness');
    this.processMessageQueue();
  }

  /**
   * Check if bridge is ready for use
   * Verifies both WebSocketManager reference and connection state
   */
  isReady(): boolean {
    const hasManager = this.webSocketManager !== null;
    const isConnected = this.isConnected();
    
    console.log(`🌉 Bridge readiness check: hasManager=${hasManager}, isConnected=${isConnected}`);
    
    if (hasManager && this.webSocketManager) {
      const connectionInfo = this.webSocketManager.getConnectionInfo();
      console.log(`🔌 WebSocketManager state:`, connectionInfo);
    }
    
    return hasManager && isConnected;
  }

  /**
   * Register game instance for message handling
   * Called by Game.ts when starting online game
   */
  async registerGame(gameId: number, handler: GameMessageHandler, cleanupHandler?: GameCleanupHandler): Promise<void> {
    console.log(`🌉 Registering game ${gameId} with bridge`);
    
    // Clean up previous game if exists
    if (this.activeGameId && this.activeGameId !== gameId) {
      this.unregisterGame(this.activeGameId);
    }
    
    this.activeGameId = gameId;
    this.gameHandler = handler;
    this.cleanupHandler = cleanupHandler || null;
    
    // Ensure WebSocketManager is trying to connect
    await this.ensureConnection();
    
    // Send join_game message to backend via WebSocketManager
    this.sendToBackend({
      type: 'join_game',
      gameId: gameId
    });
  }

  /**
   * Ensure WebSocketManager is attempting to connect
   * Force connection if WebSocketManager exists but isn't connected
   */
  private async ensureConnection(): Promise<void> {
    // If we don't have a WebSocketManager reference, try to get one
    if (!this.webSocketManager) {
      console.log('🌉 Bridge attempting to initialize WebSocketManager...');
      try {
        // Dynamic import for ES modules
        const { webSocketManager } = await import('../../invitations/core/WebSocketManager');
        console.log('🌉 WebSocketManager imported and should be initialized');
        // The import should trigger the singleton creation and bridge initialization
      } catch (error) {
        console.error('❌ Failed to import WebSocketManager:', error);
      }
      return;
    }

    if (this.webSocketManager && !this.webSocketManager.isConnected()) {
      console.log('🌉 Bridge forcing WebSocketManager connection...');
      try {
        // Try to force reconnection
        this.webSocketManager.forceReconnect();
      } catch (error) {
        console.error('❌ Failed to force WebSocketManager reconnection:', error);
      }
    }
  }

  /**
   * Unregister game instance and cleanup
   * Called by Game.ts when leaving game
   */
  unregisterGame(gameId?: number): void {
    const targetGameId = gameId || this.activeGameId;
    
    if (targetGameId) {
      console.log(`🌉 Unregistering game ${targetGameId} from bridge`);
      
      // Send leave_game message to backend for proper cleanup
      this.sendToBackend({
        type: 'leave_game',
        gameId: targetGameId
      });
      
      // Call cleanup handler if provided
      if (this.cleanupHandler) {
        try {
          this.cleanupHandler(targetGameId);
        } catch (error) {
          console.error('❌ Error in game cleanup handler:', error);
        }
      }
    }
    
    // Reset bridge state
    if (!gameId || gameId === this.activeGameId) {
      this.activeGameId = null;
      this.gameHandler = null;
      this.cleanupHandler = null;
      console.log('🌉 Bridge reset - ready for invitations');
    }
  }

  /**
   * Handle incoming WebSocket message
   * Called by WebSocketManager when game-related message received
   */
  handleGameMessage(message: GameWSMessage): boolean {
    // Check if message is game-related
    if (!this.isGameMessage(message)) {
      return false; // Not handled by bridge
    }

    console.log(`🌉 Bridge handling game message: ${message.type}`, message);

    // Route message to active game handler
    if (this.gameHandler && this.activeGameId) {
      try {
        this.gameHandler(message);
        return true; // Message handled
      } catch (error) {
        console.error('❌ Error in game message handler:', error);
        return false;
      }
    }

    // No active game - log and ignore
    console.warn(`⚠️ Received game message but no active game: ${message.type}`);
    return false;
  }

  /**
   * Send message to backend via WebSocketManager
   * Used by Game.ts to send game-related messages
   */
  sendToBackend(message: GameWSMessage): boolean {
    // Queue message if bridge isn't ready yet
    if (!this.isReady()) {
      console.log(`⏳ Bridge not ready, queuing message: ${message.type}`, message);
      this.messageQueue.push(message);
      return true; // Return true to indicate message was accepted
    }

    console.log(`🌉 Bridge sending to backend: ${message.type}`, message);
    
    try {
      return this.webSocketManager.sendMessage(message);
    } catch (error) {
      console.error('❌ Bridge failed to send message:', error);
      // Re-queue message for retry
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Send game input to server
   * Called by Game.ts for player input
   */
  sendGameInput(gameId: number, input: { up: boolean; down: boolean }): boolean {
    return this.sendToBackend({
      type: 'player_input',
      gameId: gameId,
      input: input
    });
  }

  /**
   * Send player ready status
   * Called by Game.ts when player clicks ready
   */
  sendPlayerReady(gameId: number, ready: boolean): boolean {
    return this.sendToBackend({
      type: 'player_ready',
      gameId: gameId,
      ready: ready
    });
  }

  /**
   * Check if WebSocket is connected
   * Used by Game.ts to verify connection status
   */
  isConnected(): boolean {
    return this.webSocketManager?.isConnected() || false;
  }

  /**
   * Get active game ID
   */
  getActiveGameId(): number | null {
    return this.activeGameId;
  }

  /**
   * Check if bridge has active game
   */
  hasActiveGame(): boolean {
    return this.activeGameId !== null && this.gameHandler !== null;
  }

  /**
   * Determine if message is game-related
   * Private method to classify messages
   */
  private isGameMessage(message: GameWSMessage): boolean {
    const gameMessageTypes = [
      'auth_success',
      'auth_error', 
      'ready_status',
      'countdown',
      'game_start',
      'game_state',
      'game_end',
      'pong',
      'join_game',
      'player_ready',
      'player_input',
      'leave_game',
      'game_started', // For invitation flow
      'game_update',
      'player_joined',
      'player_left',
      'game_error'
    ];

    return gameMessageTypes.includes(message.type) || 
           message.type.startsWith('game_') || 
           message.type.startsWith('player_') ||
           message.type.includes('ready');
  }

  /**
   * Process queued messages when bridge becomes ready
   * Called after WebSocketManager initialization
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0 || !this.isReady()) {
      return;
    }

    // Check if WebSocketManager is authenticated
    const connectionInfo = this.webSocketManager.getConnectionInfo();
    if (!connectionInfo.authenticated) {
      console.log('⏳ Bridge ready but not authenticated yet, waiting...');
      return;
    }

    console.log(`🌉 Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue]; // Copy to avoid mutation during processing
    this.messageQueue.length = 0; // Clear queue
    
    for (const message of messages) {
      try {
        this.webSocketManager.sendMessage(message);
        console.log(`✅ Sent queued message: ${message.type}`);
      } catch (error) {
        console.error(`❌ Failed to send queued message: ${message.type}`, error);
        // Don't re-queue to avoid infinite loops
      }
    }
  }

  /**
   * Emergency cleanup - called on page unload or navigation
   */
  destroy(): void {
    console.log('🌉 Bridge destroying...');
    
    if (this.activeGameId) {
      this.unregisterGame(this.activeGameId);
    }
    
    // Clear message queue
    this.messageQueue.length = 0;
    
    // Reset static instance
    WebSocketGameBridge.instance = undefined;
  }
}

// Export singleton instance
export const webSocketGameBridge = WebSocketGameBridge.getInstance();