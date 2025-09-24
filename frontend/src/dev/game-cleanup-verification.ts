/**
 * Manual Verification Script for Game Cleanup System
 *
 * This script provides manual testing functions to verify that the
 * game cleanup system prevents "You are already in a game" errors.
 *
 * Usage:
 * 1. Open browser console
 * 2. Call verifyCleanupSystem()
 * 3. Follow the test instructions
 */

import { GameManager } from '../services/GameManager';
import { ChatService } from '../features/friends/services/ChatService';
import { router } from '../core/app/Router';

class GameCleanupVerification {
  private gameManager: GameManager;
  private chatService: ChatService;

  constructor() {
    this.gameManager = GameManager.getInstance();
    this.chatService = ChatService.getInstance();
  }

  /**
   * Main verification function - run this in browser console
   */
  async verifyCleanupSystem(): Promise<void> {
    console.log('🔍 Game Cleanup System Verification');
    console.log('====================================');

    await this.checkCurrentState();
    this.setupTestCommands();
    this.printInstructions();
  }

  private async checkCurrentState(): Promise<void> {
    console.log('📊 Current State:');
    console.log(`  GameManager initialized: ${this.gameManager ? 'Yes' : 'No'}`);
    console.log(`  ChatService connected: ${this.chatService.isConnected()}`);
    console.log(`  Currently in game: ${this.gameManager.isInGame()}`);
    console.log(`  Chat in game: ${this.chatService.isCurrentlyInGame()}`);
    console.log(`  Current path: ${window.location.pathname}`);
    console.log('');
  }

  private setupTestCommands(): void {
    // Expose test functions to global scope
    (window as any).testNavigationCleanup = this.testNavigationCleanup.bind(this);
    (window as any).testManualCleanup = this.testManualCleanup.bind(this);
    (window as any).simulatePageLeave = this.simulatePageLeave.bind(this);
    (window as any).checkGameState = this.checkGameState.bind(this);
    (window as any).forceCleanup = this.forceCleanup.bind(this);
    (window as any).resetTestState = this.resetTestState.bind(this);
  }

  private printInstructions(): void {
    console.log('🧪 Available Test Commands:');
    console.log('');
    console.log('1. checkGameState()          - Check current game state');
    console.log('2. testNavigationCleanup()   - Test navigation away from game');
    console.log('3. testManualCleanup()       - Test manual cleanup methods');
    console.log('4. simulatePageLeave()       - Simulate browser close/reload');
    console.log('5. forceCleanup()            - Force cleanup everything');
    console.log('6. resetTestState()          - Reset all state for testing');
    console.log('');
    console.log('💡 Usage Example:');
    console.log('  1. Start a game normally');
    console.log('  2. Call testNavigationCleanup()');
    console.log('  3. Try to start another game');
    console.log('  4. Should NOT get "already in game" error');
    console.log('');
  }

  /**
   * Test navigation cleanup
   */
  testNavigationCleanup(): void {
    console.log('🧪 Testing navigation cleanup...');

    const initialState = this.getGameState();
    console.log('Initial state:', initialState);

    // Navigate away from game page
    if (window.location.pathname.includes('game')) {
      console.log('📍 Navigating away from game page...');
      router.navigate('/menu').then(() => {
        setTimeout(() => {
          const finalState = this.getGameState();
          console.log('Final state:', finalState);
          this.evaluateCleanup(initialState, finalState, 'Navigation');
        }, 1000);
      });
    } else {
      console.log('⚠️ Not on game page - navigate to /game first');
    }
  }

  /**
   * Test manual cleanup methods
   */
  testManualCleanup(): void {
    console.log('🧪 Testing manual cleanup methods...');

    const initialState = this.getGameState();
    console.log('Initial state:', initialState);

    // Test manual cleanup
    console.log('🔄 Calling GameManager.leaveCurrentGame()...');
    this.gameManager.leaveCurrentGame();

    setTimeout(() => {
      console.log('🔄 Calling ChatService.forceResetGameState()...');
      this.chatService.forceResetGameState();

      setTimeout(() => {
        const finalState = this.getGameState();
        console.log('Final state:', finalState);
        this.evaluateCleanup(initialState, finalState, 'Manual cleanup');
      }, 500);
    }, 500);
  }

  /**
   * Simulate page leave events
   */
  simulatePageLeave(): void {
    console.log('🧪 Simulating page leave events...');

    const initialState = this.getGameState();
    console.log('Initial state:', initialState);

    // Dispatch browser events
    console.log('📤 Dispatching beforeunload event...');
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    setTimeout(() => {
      console.log('📤 Dispatching pagehide event...');
      const pageHideEvent = new Event('pagehide');
      window.dispatchEvent(pageHideEvent);

      setTimeout(() => {
        const finalState = this.getGameState();
        console.log('Final state:', finalState);
        this.evaluateCleanup(initialState, finalState, 'Page leave simulation');
      }, 1000);
    }, 500);
  }

  /**
   * Check current game state
   */
  checkGameState(): void {
    const state = this.getGameState();
    console.log('📊 Current Game State:');
    console.log(JSON.stringify(state, null, 2));
  }

  /**
   * Force cleanup everything
   */
  forceCleanup(): void {
    console.log('💥 Force cleaning up everything...');

    try {
      this.gameManager.leaveCurrentGame();
      this.chatService.forceResetGameState();
      this.chatService.forceServerReset();

      console.log('✅ Force cleanup completed');
      setTimeout(() => this.checkGameState(), 1000);
    } catch (error) {
      console.error('❌ Force cleanup failed:', error);
    }
  }

  /**
   * Reset state for testing
   */
  resetTestState(): void {
    console.log('🔄 Resetting test state...');

    this.forceCleanup();

    // Navigate to safe page
    if (window.location.pathname.includes('game')) {
      router.navigate('/menu');
    }

    console.log('✅ Test state reset');
  }

  private getGameState(): any {
    return {
      path: window.location.pathname,
      gameManagerInGame: this.gameManager.isInGame(),
      gameManagerOnline: this.gameManager.isOnlineGame(),
      gameManagerSession: this.gameManager.getCurrentSessionId(),
      chatServiceInGame: this.chatService.isCurrentlyInGame(),
      chatServiceGameId: this.chatService.getCurrentGameId(),
      chatServiceConnected: this.chatService.isConnected()
    };
  }

  private evaluateCleanup(initial: any, final: any, testType: string): void {
    const wasInGame = initial.gameManagerInGame || initial.chatServiceInGame;
    const stillInGame = final.gameManagerInGame || final.chatServiceInGame;

    console.log(`\n🎯 ${testType} Results:`);

    if (wasInGame && !stillInGame) {
      console.log('✅ SUCCESS: Game state cleaned up properly');
    } else if (!wasInGame && !stillInGame) {
      console.log('ℹ️ INFO: No game to clean up (was not in game)');
    } else if (wasInGame && stillInGame) {
      console.log('❌ FAILURE: Game state NOT cleaned up');
      console.log('🔍 This indicates the cleanup system is not working');
    }

    console.log('💡 Try starting a new game to verify no "already in game" error');
    console.log('');
  }
}

// Create and export the verification instance
export const gameCleanupVerification = new GameCleanupVerification();

// Auto-setup in browser console
if (typeof window !== 'undefined') {
  (window as any).verifyCleanupSystem = () => gameCleanupVerification.verifyCleanupSystem();
  console.log('🔍 Game cleanup verification available: verifyCleanupSystem()');
}