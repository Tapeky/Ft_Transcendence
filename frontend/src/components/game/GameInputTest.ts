// ============================================================================
// GameInputTest.ts - Test utilities for the enhanced input system
// ============================================================================
// Phase 4 - Testing and validation utilities for comprehensive input system

import { GameInputHandler, InputOptions } from './GameInput';
import { Input } from '../../types/GameTypes';

export class GameInputTest {
  private inputHandler: GameInputHandler | null = null;
  private testContainer: HTMLElement | null = null;
  private inputLog: Input[] = [];
  private startTime = 0;

  /**
   * Create a test environment for the input system
   */
  public static createTestEnvironment(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'game-input-test-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 600px;
      background: linear-gradient(45deg, #1e3a8a, #7c3aed);
      border: 2px solid white;
      border-radius: 8px;
      z-index: 1000;
    `;
    
    container.innerHTML = `
      <div style="color: white; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="margin: 0 0 20px 0; text-align: center;">🎮 Game Input System Test</h2>
        <div style="text-align: center; margin-bottom: 20px;">
          <p>Press W/S or ↑/↓ keys to test keyboard input</p>
          <p>Use touch controls on mobile devices</p>
        </div>
        <div id="test-canvas-area" style="
          background: #000;
          border: 2px solid white;
          margin: 20px auto;
          width: 400px;
          height: 200px;
          position: relative;
          border-radius: 4px;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
          ">
            <div>Focus here and use controls</div>
            <div style="font-size: 0.8em; margin-top: 10px;">Input logged to console</div>
          </div>
        </div>
        <div style="text-align: center;">
          <button id="close-test" style="
            background: #dc2626;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          ">Close Test</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * Start comprehensive input system test
   */
  public async startTest(options?: Partial<InputOptions>): Promise<void> {
    console.log('🧪 GameInputTest: Starting comprehensive input system test');
    
    try {
      // Create test environment
      this.testContainer = GameInputTest.createTestEnvironment();
      
      // Configure input options with testing defaults
      const testOptions: InputOptions = {
        enableMobileControls: true,
        enableVisualFeedback: true,
        throttleRate: 60,
        keyMappings: {
          up: ['KeyW', 'ArrowUp'],
          down: ['KeyS', 'ArrowDown']
        },
        ...options
      };
      
      // Create input handler
      this.inputHandler = new GameInputHandler(testOptions);
      
      // Set up input logging callback
      const inputCallback = (input: Input) => {
        this.logInput(input);
      };
      
      // Activate input system
      this.inputHandler.activate(inputCallback, this.testContainer);
      
      // Simulate connection status
      this.inputHandler.updateConnectionStatus(true);
      
      this.startTime = Date.now();
      
      // Set up close button
      const closeButton = this.testContainer.querySelector('#close-test');
      closeButton?.addEventListener('click', () => {
        this.stopTest();
      });
      
      console.log('✅ GameInputTest: Test environment ready');
      console.log('📊 Input events will be logged to console');
      
    } catch (error) {
      console.error('❌ GameInputTest: Failed to start test:', error);
      this.cleanup();
    }
  }

  /**
   * Log input events for analysis
   */
  private logInput(input: Input): void {
    const timestamp = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      input: { ...input },
      stats: this.inputHandler?.getInputStats()
    };
    
    this.inputLog.push(input);
    
    console.log(`🎮 [${timestamp}ms] Input:`, logEntry);
    
    // Keep only last 100 entries to prevent memory issues
    if (this.inputLog.length > 100) {
      this.inputLog.shift();
    }
  }

  /**
   * Run automated test scenarios
   */
  public async runAutomatedTests(): Promise<void> {
    if (!this.inputHandler) {
      console.error('❌ GameInputTest: No input handler available');
      return;
    }
    
    console.log('🤖 GameInputTest: Running automated test scenarios');
    
    // Test 1: Basic input simulation
    console.log('Test 1: Basic input simulation');
    this.inputHandler.simulateInput(true, false, 'automated-test-1');
    await this.delay(100);
    this.inputHandler.simulateInput(false, false, 'automated-test-1');
    await this.delay(100);
    this.inputHandler.simulateInput(false, true, 'automated-test-1');
    await this.delay(100);
    this.inputHandler.simulateInput(false, false, 'automated-test-1');
    
    // Test 2: Rapid input changes
    console.log('Test 2: Rapid input changes (throttling test)');
    for (let i = 0; i < 10; i++) {
      this.inputHandler.simulateInput(i % 2 === 0, i % 2 === 1, 'rapid-test');
      await this.delay(16); // ~60FPS rate
    }
    
    // Test 3: Simultaneous inputs
    console.log('Test 3: Simultaneous inputs');
    this.inputHandler.simulateInput(true, true, 'simultaneous-test');
    await this.delay(200);
    this.inputHandler.simulateInput(false, false, 'simultaneous-test');
    
    console.log('✅ GameInputTest: Automated tests completed');
  }

  /**
   * Get test statistics
   */
  public getTestStats(): {
    duration: number;
    inputCount: number;
    inputRate: number;
    handlerStats: any;
  } {
    const duration = Date.now() - this.startTime;
    return {
      duration,
      inputCount: this.inputLog.length,
      inputRate: this.inputLog.length / (duration / 1000),
      handlerStats: this.inputHandler?.getInputStats() || null
    };
  }

  /**
   * Stop the test and clean up
   */
  public stopTest(): void {
    console.log('🛑 GameInputTest: Stopping test');
    
    // Print final statistics
    const stats = this.getTestStats();
    console.log('📊 GameInputTest: Final statistics:', stats);
    
    this.cleanup();
  }

  /**
   * Clean up test resources
   */
  private cleanup(): void {
    if (this.inputHandler) {
      this.inputHandler.deactivate();
      this.inputHandler = null;
    }
    
    if (this.testContainer) {
      this.testContainer.remove();
      this.testContainer = null;
    }
    
    this.inputLog = [];
    console.log('🧹 GameInputTest: Cleanup completed');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run quick integration test
   */
  public static async runQuickTest(): Promise<void> {
    console.log('⚡ GameInputTest: Running quick integration test');
    
    const test = new GameInputTest();
    await test.startTest({
      enableVisualFeedback: true,
      enableMobileControls: true,
      throttleRate: 30 // Lower rate for testing
    });
    
    // Run automated tests after a short delay
    setTimeout(async () => {
      await test.runAutomatedTests();
      
      // Auto-close after 10 seconds
      setTimeout(() => {
        test.stopTest();
      }, 10000);
    }, 1000);
  }
}

// Export for console access
(window as any).GameInputTest = GameInputTest;

console.log('🧪 GameInputTest loaded. Use GameInputTest.runQuickTest() to start testing.');