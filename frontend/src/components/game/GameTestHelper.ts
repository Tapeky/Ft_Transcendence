// ============================================================================
// GameTestHelper.ts - Helper utilities for testing WebSocket game integration
// ============================================================================
// Provides utilities to test Phase 3 WebSocket implementation

import { chatService } from '../../services/ChatService';
import { GameState, PongState, Point2, Vector2, GAME_CONSTANTS } from '../../types/GameTypes';

export class GameTestHelper {
  /**
   * Create a realistic mock game state for testing
   */
  static createMockGameState(): GameState {
    const centerY = GAME_CONSTANTS.arena.height / 2;
    
    return {
      leftPaddle: {
        pos: new Point2(GAME_CONSTANTS.paddle.width / 2, centerY - 10),
        hitCount: 3
      },
      rightPaddle: {
        pos: new Point2(
          GAME_CONSTANTS.arena.width - GAME_CONSTANTS.paddle.width / 2, 
          centerY + 15
        ),
        hitCount: 5
      },
      ball: {
        pos: new Point2(
          GAME_CONSTANTS.arena.width / 2 + 30,
          GAME_CONSTANTS.arena.height / 2 - 20
        ),
        direction: new Vector2(0.8, 0.3)
      },
      state: PongState.Running
    };
  }

  /**
   * Simulate a game state update via ChatService (for testing)
   */
  static simulateGameUpdate(gameState?: GameState): void {
    const mockState = gameState || this.createMockGameState();
    
    // Emit the game_state_update event that GameWebSocket listens for
    chatService['emit']('game_state_update', mockState);
  }

  /**
   * Simulate game start via ChatService (for testing)
   */
  static simulateGameStart(gameId: number): void {
    chatService['emit']('game_joined', { gameId });
    
    setTimeout(() => {
      chatService['emit']('game_started', { gameId, timestamp: Date.now() });
    }, 1000);
  }

  /**
   * Simulate game end via ChatService (for testing)
   */
  static simulateGameEnd(winner: 'left' | 'right' | 'aborted', finalState?: GameState): void {
    chatService['emit']('game_ended', { 
      winner, 
      finalState: finalState || this.createMockGameState() 
    });
  }

  /**
   * Simulate connection status changes (for testing)
   */
  static simulateConnectionChange(isConnected: boolean): void {
    if (isConnected) {
      chatService['emit']('connected', null);
    } else {
      chatService['emit']('disconnected', null);
    }
  }

  /**
   * Simulate game error (for testing)
   */
  static simulateGameError(type: string, message: string): void {
    chatService['emit']('game_error', { type, message });
  }

  /**
   * Create animated test sequence for visual validation
   */
  static startAnimatedTest(gameId: number, duration: number = 10000): void {
    console.log('🧪 GameTestHelper: Starting animated test sequence');
    
    // Simulate game start
    this.simulateGameStart(gameId);
    
    let frame = 0;
    const maxFrames = Math.floor(duration / 16); // ~60 FPS
    
    const updateLoop = () => {
      if (frame >= maxFrames) {
        // End test with victory
        this.simulateGameEnd('left');
        console.log('🏁 GameTestHelper: Test sequence completed');
        return;
      }
      
      const time = frame / 60; // Time in seconds
      const centerY = GAME_CONSTANTS.arena.height / 2;
      
      // Create animated game state
      const animatedState: GameState = {
        leftPaddle: {
          pos: new Point2(
            GAME_CONSTANTS.paddle.width / 2,
            centerY + Math.sin(time * 2) * 30
          ),
          hitCount: Math.floor(time * 0.5) % 10
        },
        rightPaddle: {
          pos: new Point2(
            GAME_CONSTANTS.arena.width - GAME_CONSTANTS.paddle.width / 2,
            centerY + Math.cos(time * 1.5) * 25
          ),
          hitCount: Math.floor(time * 0.3) % 8
        },
        ball: {
          pos: new Point2(
            GAME_CONSTANTS.arena.width / 2 + Math.sin(time * 3) * 100,
            GAME_CONSTANTS.arena.height / 2 + Math.cos(time * 4) * 40
          ),
          direction: new Vector2(
            Math.cos(time * 2),
            Math.sin(time * 3)
          )
        },
        state: PongState.Running
      };
      
      this.simulateGameUpdate(animatedState);
      
      frame++;
      setTimeout(updateLoop, 16); // ~60 FPS
    };
    
    // Start animation after initial game start delay
    setTimeout(updateLoop, 2000);
  }

  /**
   * Test WebSocket connection status
   */
  static testConnectionStatus(): void {
    console.log('🔍 GameTestHelper: Testing connection status changes');
    
    // Simulate disconnect
    this.simulateConnectionChange(false);
    
    setTimeout(() => {
      // Simulate reconnect
      this.simulateConnectionChange(true);
      console.log('✅ GameTestHelper: Connection status test completed');
    }, 3000);
  }

  /**
   * Test error handling
   */
  static testErrorHandling(): void {
    console.log('⚠️ GameTestHelper: Testing error handling');
    
    const errors = [
      { type: 'err_game_not_found', message: 'Game not found' },
      { type: 'err_player_not_in_game', message: 'Player not in game' },
      { type: 'err_invalid_input', message: 'Invalid input received' }
    ];
    
    errors.forEach((error, index) => {
      setTimeout(() => {
        this.simulateGameError(error.type, error.message);
      }, index * 2000);
    });
  }

  /**
   * Get current ChatService status for debugging
   */
  static getChatServiceStatus(): any {
    return {
      isConnected: chatService.isConnected(),
      currentGameId: chatService.getCurrentGameId(),
      isInGame: chatService.isCurrentlyInGame(),
      gameState: chatService.getCurrentGameState()
    };
  }

  /**
   * Log current status to console
   */
  static logStatus(): void {
    console.log('📊 GameTestHelper Status:', this.getChatServiceStatus());
  }
}

// Make available globally for browser console testing
(window as any).GameTestHelper = GameTestHelper;