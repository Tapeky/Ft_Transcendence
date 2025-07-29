// ============================================================================
// Game.ts - Main game page component for Pong game system
// ============================================================================
// Handles game session management, WebSocket connection, and game rendering

import { Header } from '../components/ui/Header';
import { BackBtn } from '../components/ui/BackBtn';
import { GameCanvas } from '../components/game/GameCanvas';
import { GameWebSocket, GameWebSocketCallbacks } from '../components/game/GameWebSocket';
import { GameInputHandler, InputOptions } from '../components/game/GameInput';
import { GameTestHelper } from '../components/game/GameTestHelper';
import { appState } from '../state/AppState';
import { apiService } from '../services/api';
import { chatService } from '../services/ChatService';
import { 
  GameSession, 
  GameState, 
  PongState, 
  GameConfig, 
  DEFAULT_GAME_CONFIG,
  GameError,
  GameNotFoundError,
  WebSocketError,
  InvalidGameStateError,
  Point2,
  Vector2,
  GAME_CONSTANTS
} from '../types/GameTypes';

export class Game {
  private container: HTMLElement;
  private gameId: string;
  private gameSession: GameSession | null = null;
  private gameState: GameState | null = null;
  private loading = true;
  private error: string | null = null;
  
  // UI Components
  private header: Header | null = null;
  private backBtn: BackBtn | null = null;
  
  // Game rendering
  private gameCanvas: GameCanvas | null = null;
  private config: GameConfig = { ...DEFAULT_GAME_CONFIG };
  
  // WebSocket connection (Phase 3 implementation)
  private gameWebSocket: GameWebSocket | null = null;
  private isConnected = false;
  
  // Input system (Phase 4 implementation)
  private gameInputHandler: GameInputHandler | null = null;
  
  // Game state management
  private playerSide: 'left' | 'right' | null = null;
  private animationFrameId: number | null = null;
  private lastGameUpdateTime = 0;

  constructor(container: HTMLElement, gameId: string) {
    this.container = container;
    this.gameId = gameId;
    this.init();
  }

  private async init(): Promise<void> {
    console.log(`🎮 Game: Initializing game with ID ${this.gameId}`);
    
    try {
      // Wait for authentication if still loading
      await this.waitForAuthInitialization();
      
      // Check authentication
      const state = appState.getState();
      if (!state.isAuthenticated || !state.user) {
        console.log('❌ Game: Authentication required, redirecting');
        appState.router?.navigate('/');
        return;
      }
      
      // Load game session data
      await this.loadGameSession();
      
      // Set up the game UI
      this.loading = false;
      this.render();
      
      // Initialize game components after rendering
      this.initializeGameComponents();
      
    } catch (error) {
      console.error('❌ Game: Initialization failed:', error);
      this.handleError(error);
    }
  }

  private async waitForAuthInitialization(): Promise<void> {
    return new Promise((resolve) => {
      if (!appState.getState().loading) {
        resolve();
        return;
      }

      const unsubscribe = appState.subscribe((state) => {
        if (!state.loading) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  private async loadGameSession(): Promise<void> {
    try {
      console.log(`🔍 Game: Loading game session ${this.gameId}`);
      
      // TODO: Replace with actual API call when available
      // const response = await apiService.getGameSession(Number(this.gameId));
      // this.gameSession = response;
      
      // For now, create a mock game session for development
      this.gameSession = this.createMockGameSession();
      
      console.log('✅ Game: Game session loaded:', this.gameSession);
      
    } catch (error) {
      console.error('❌ Game: Failed to load game session:', error);
      
      if (error instanceof Error && error.message.includes('404')) {
        throw new GameNotFoundError(Number(this.gameId));
      }
      
      throw new GameError('Failed to load game session', 'LOAD_ERROR', Number(this.gameId));
    }
  }

  private createMockGameSession(): GameSession {
    const currentUser = appState.getState().user;
    
    return {
      id: Number(this.gameId),
      player1: {
        player: currentUser || undefined,
        score: 0,
        isReady: false
      },
      player2: {
        guest_name: 'Opponent',
        score: 0,
        isReady: false
      },
      state: PongState.Running,
      created_at: new Date().toISOString()
    };
  }

  private handleError(error: unknown): void {
    console.error('🚨 Game: Error occurred:', error);
    
    if (error instanceof GameNotFoundError) {
      this.error = `Game ${this.gameId} not found`;
    } else if (error instanceof WebSocketError) {
      this.error = 'Connection failed. Please try again.';
    } else if (error instanceof InvalidGameStateError) {
      this.error = 'Invalid game state. Please refresh the page.';
    } else if (error instanceof GameError) {
      this.error = error.message;
    } else {
      this.error = 'An unexpected error occurred';
    }
    
    this.loading = false;
    this.render();
  }

  private render(): void {
    if (this.loading) {
      this.renderLoadingState();
      return;
    }
    
    if (this.error) {
      this.renderErrorState();
      return;
    }
    
    this.renderGameState();
  }

  private renderLoadingState(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-blue-900 text-white flex items-center justify-center">
        <div class="text-center">
          <div class="text-4xl font-iceland mb-4">Loading Game...</div>
          <div class="text-xl">Game ID: ${this.gameId}</div>
        </div>
      </div>
    `;
  }

  private renderErrorState(): void {
    this.container.innerHTML = `
      <div class="min-h-screen bg-red-900 text-white flex items-center justify-center">
        <div class="text-center p-8">
          <div class="text-4xl font-iceland mb-4">⚠️ Game Error</div>
          <div class="text-xl mb-6">${this.error}</div>
          <div class="flex gap-4 justify-center">
            <button 
              id="retry-btn" 
              class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-lg transition duration-300"
            >
              Retry
            </button>
            <button 
              id="back-to-menu-btn" 
              class="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-lg transition duration-300"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners for error state buttons
    this.container.querySelector('#retry-btn')?.addEventListener('click', () => {
      this.retry();
    });
    
    this.container.querySelector('#back-to-menu-btn')?.addEventListener('click', () => {
      appState.router?.navigate('/menu');
    });
  }

  private renderGameState(): void {
    if (!this.gameSession) {
      this.handleError(new GameError('No game session available', 'NO_SESSION'));
      return;
    }

    this.container.innerHTML = `
      <div class="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white">
        <div id="header-container"></div>
        
        <div class="w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600 self-center border-x-4 border-t-4 flex flex-col p-4">
          <!-- Game Header -->
          <div class="text-center text-[3rem] border-b-2 w-full flex">
            <div id="back-btn-container" class="flex-1"></div>
            <h1 class="flex-1">Pong Game</h1>
            <div class="flex-1"></div>
          </div>
          
          <!-- Game Info -->
          <div class="flex justify-between items-center p-4 text-2xl">
            <div class="flex items-center gap-4">
              <div class="text-3xl">${this.gameSession.player1.player?.username || this.gameSession.player1.guest_name || 'Player 1'}</div>
              <div id="left-score" class="text-4xl font-bold">${this.gameSession.player1.score}</div>
            </div>
            
            <div class="text-center">
              <div class="text-xl">Game #${this.gameSession.id}</div>
              <div id="game-status" class="text-lg text-gray-300">${this.getGameStatusText()}</div>
            </div>
            
            <div class="flex items-center gap-4">
              <div id="right-score" class="text-4xl font-bold">${this.gameSession.player2.score}</div>
              <div class="text-3xl">${this.gameSession.player2.player?.username || this.gameSession.player2.guest_name || 'Player 2'}</div>
            </div>
          </div>
          
          <!-- Game Canvas Container -->
          <div class="flex-grow flex items-center justify-center p-8">
            <div class="relative">
              <canvas 
                id="game-canvas" 
                width="${this.config.canvasWidth}" 
                height="${this.config.canvasHeight}"
                class="border-4 border-white bg-gray-900"
                style="max-width: 100%; height: auto;"
              ></canvas>
              
              <!-- Game overlay for connection status, etc. -->
              <div id="game-overlay" class="absolute inset-0 flex items-center justify-center text-white text-2xl">
                ${this.getGameOverlayContent()}
              </div>
            </div>
          </div>
          
          <!-- Game Controls Info -->
          <div class="text-center text-lg text-gray-300 border-t-2 pt-4">
            <div>Controls: Use <span class="font-bold">W/S</span> or <span class="font-bold">↑/↓</span> arrow keys to move your paddle</div>
            <div class="mt-2">Touch controls available on mobile devices</div>
            <div class="mt-2">Connection: <span id="connection-status" class="font-bold">${this.getConnectionStatusText()}</span></div>
          </div>
        </div>
      </div>
    `;

    // Initialize components after rendering
    this.initializeComponents();
  }

  private getGameStatusText(): string {
    if (!this.gameSession) return 'Unknown';
    
    switch (this.gameSession.state) {
      case PongState.Running:
        return 'In Progress';
      case PongState.LeftWins:
        return 'Left Player Wins!';
      case PongState.RightWins:
        return 'Right Player Wins!';
      case PongState.Aborted:
        return 'Game Aborted';
      default:
        return 'Unknown State';
    }
  }

  private getGameOverlayContent(): string {
    if (!this.isConnected) {
      return `
        <div class="bg-black bg-opacity-75 p-6 rounded text-center">
          <div class="text-3xl mb-4">⚡ Connecting to Game...</div>
          <div class="text-lg">Please wait while we connect you to the game server</div>
        </div>
      `;
    }
    
    if (this.gameSession?.state !== PongState.Running) {
      return `
        <div class="bg-black bg-opacity-75 p-6 rounded text-center">
          <div class="text-3xl mb-4">${this.getGameStatusText()}</div>
        </div>
      `;
    }
    
    return ''; // No overlay during active gameplay
  }

  private getConnectionStatusText(): string {
    if (!this.isConnected) return 'Connecting...';
    return 'Connected';
  }

  private initializeComponents(): void {
    // Initialize Header
    const headerContainer = this.container.querySelector('#header-container') as HTMLElement;
    if (headerContainer) {
      this.header = new Header(true);
      headerContainer.appendChild(this.header.getElement());
    }

    // Initialize BackBtn
    const backBtnContainer = this.container.querySelector('#back-btn-container') as HTMLElement;
    if (backBtnContainer) {
      this.backBtn = new BackBtn();
      backBtnContainer.appendChild(this.backBtn.getElement());
    }
  }

  private initializeGameComponents(): void {
    // Initialize GameCanvas with full rendering system
    const canvas = this.container.querySelector('#game-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        this.gameCanvas = new GameCanvas(canvas, this.config);
        
        // Start animation with mock game state
        this.gameCanvas.startAnimation();
        
        console.log('✅ Game: GameCanvas initialized and animation started');
        
        // Set up resize handler
        this.setupResizeHandler();
        
      } catch (error) {
        console.error('❌ Game: Failed to initialize GameCanvas:', error);
        this.handleError(new GameError('Failed to initialize game canvas', 'CANVAS_ERROR'));
        return;
      }
    }
    
    // Phase 3 - Initialize WebSocket connection
    this.initializeWebSocket().catch(error => {
      console.error('❌ Game: WebSocket initialization failed:', error);
    });
    
    // Phase 4 - Initialize input system
    this.initializeInputSystem();
  }

  /**
   * Phase 4: Initialize comprehensive input system
   */
  private initializeInputSystem(): void {
    try {
      console.log('⌨️ Game: Initializing input system');
      
      // Configure input options
      const inputOptions: InputOptions = {
        enableMobileControls: true,
        enableVisualFeedback: true,
        throttleRate: 60, // 60 FPS input rate
        keyMappings: {
          up: ['KeyW', 'ArrowUp'],
          down: ['KeyS', 'ArrowDown']
        }
      };
      
      // Create input handler
      this.gameInputHandler = new GameInputHandler(inputOptions);
      
      // Set up input callback to send to WebSocket
      const inputCallback = (input: any) => {
        if (this.gameWebSocket && this.isConnected) {
          this.gameWebSocket.sendInput(input);
        }
      };
      
      // Activate input handler with game container
      this.gameInputHandler.activate(inputCallback, this.container);
      
      // Update connection status in input handler
      this.gameInputHandler.updateConnectionStatus(this.isConnected);
      
      console.log('✅ Game: Input system initialized successfully');
      
    } catch (error) {
      console.error('❌ Game: Failed to initialize input system:', error);
      // Continue without input system - game can still run for spectating
    }
  }

  /**
   * Phase 3: Initialize WebSocket connection for real-time game updates
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      console.log('🌐 Game: Initializing WebSocket connection');
      
      // Create WebSocket callbacks
      const callbacks: GameWebSocketCallbacks = {
        onGameUpdate: (gameState: GameState) => {
          this.handleGameStateUpdate(gameState);
        },
        
        onGameEnd: (winner: 'left' | 'right' | 'aborted', finalState?: GameState) => {
          this.handleGameEnd(winner, finalState);
        },
        
        onGameStarted: (gameData: any) => {
          console.log('🚀 Game: Game started', gameData);
          this.handleGameStarted(gameData);
        },
        
        onGameJoined: (gameId: number) => {
          console.log(`✅ Game: Successfully joined game ${gameId}`);
          this.handleGameJoined(gameId);
        },
        
        onGameError: (error: { type: string; message: string }) => {
          console.error('❌ Game: WebSocket game error:', error);
          this.handleGameError(error);
        },
        
        onConnectionChange: (isConnected: boolean) => {
          console.log(`🔌 Game: Connection status changed: ${isConnected}`);
          this.isConnected = isConnected;
          this.updateConnectionStatus();
          
          // Update input handler connection status
          if (this.gameInputHandler) {
            this.gameInputHandler.updateConnectionStatus(isConnected);
          }
        }
      };
      
      // Create and connect GameWebSocket
      this.gameWebSocket = new GameWebSocket(Number(this.gameId), callbacks);
      await this.gameWebSocket.connect();
      
      console.log('✅ Game: WebSocket connection initialized');
      
    } catch (error) {
      console.error('❌ Game: Failed to initialize WebSocket:', error);
      this.handleError(new WebSocketError('Failed to connect to game server'));
    }
  }

  /**
   * Handle real-time game state updates from WebSocket
   */
  private handleGameStateUpdate(gameState: GameState): void {
    this.lastGameUpdateTime = Date.now();
    this.gameState = gameState;
    
    // Update canvas with real game state
    if (this.gameCanvas) {
      this.gameCanvas.updateGameState(gameState);
    }
    
    // Update UI if needed (scores, game status)
    this.updateGameUI();
  }

  /**
   * Handle game end events
   */
  private handleGameEnd(winner: 'left' | 'right' | 'aborted', finalState?: GameState): void {
    console.log(`🏁 Game: Game ended - winner: ${winner}`);
    
    if (finalState) {
      this.gameState = finalState;
      if (this.gameCanvas) {
        this.gameCanvas.updateGameState(finalState);
      }
    }
    
    // Update game session state
    if (this.gameSession) {
      this.gameSession.state = winner === 'left' ? PongState.LeftWins : 
                               winner === 'right' ? PongState.RightWins : 
                               PongState.Aborted;
    }
    
    this.updateGameUI();
  }

  /**
   * Handle game started events
   */
  private handleGameStarted(gameData: any): void {
    if (this.gameSession) {
      this.gameSession.state = PongState.Running;
      this.gameSession.started_at = new Date().toISOString();
    }
    
    this.updateGameUI();
  }

  /**
   * Handle successful game join
   */
  private handleGameJoined(gameId: number): void {
    console.log(`🎮 Game: Successfully joined game ${gameId}`);
    this.updateConnectionStatus();
  }

  /**
   * Handle WebSocket game errors
   */
  private handleGameError(error: { type: string; message: string }): void {
    console.error('🚨 Game: WebSocket error:', error);
    
    // Display error to user
    const overlay = this.container.querySelector('#game-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="bg-red-900 bg-opacity-90 p-6 rounded text-center">
          <div class="text-3xl mb-4">⚠️ Game Error</div>
          <div class="text-lg mb-4">${error.message}</div>
          <button 
            id="retry-connection-btn" 
            class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-lg transition duration-300"
          >
            Retry Connection
          </button>
        </div>
      `;
      
      // Add retry handler
      overlay.querySelector('#retry-connection-btn')?.addEventListener('click', async () => {
        try {
          if (this.gameWebSocket) {
            await this.gameWebSocket.connect();
          }
        } catch (retryError) {
          console.error('❌ Game: Retry failed:', retryError);
        }
      });
    }
  }

  /**
   * Update connection status display
   */
  private updateConnectionStatus(): void {
    const statusElement = this.container.querySelector('#connection-status');
    if (statusElement) {
      statusElement.textContent = this.isConnected ? 'Connected' : 'Connecting...';
    }
    
    // Update overlay if needed
    this.updateGameOverlay();
  }

  /**
   * Update game UI elements (scores, status, etc.)
   */
  private updateGameUI(): void {
    if (!this.gameSession) return;
    
    // Update scores
    const leftScoreElement = this.container.querySelector('#left-score');
    const rightScoreElement = this.container.querySelector('#right-score');
    
    if (leftScoreElement) {
      leftScoreElement.textContent = this.gameSession.player1.score.toString();
    }
    if (rightScoreElement) {
      rightScoreElement.textContent = this.gameSession.player2.score.toString();
    }
    
    // Update game status
    const statusElement = this.container.querySelector('#game-status');
    if (statusElement) {
      statusElement.textContent = this.getGameStatusText();
    }
    
    // Update overlay
    this.updateGameOverlay();
  }

  /**
   * Update game overlay content
   */
  private updateGameOverlay(): void {
    const overlay = this.container.querySelector('#game-overlay');
    if (overlay) {
      overlay.innerHTML = this.getGameOverlayContent();
    }
  }

  private setupResizeHandler(): void {
    // Handle window resize to maintain canvas aspect ratio
    const handleResize = () => {
      if (this.gameCanvas) {
        const container = this.container.querySelector('#game-canvas') as HTMLCanvasElement;
        if (container) {
          // Maintain aspect ratio while fitting in container
          const containerRect = container.parentElement?.getBoundingClientRect();
          if (containerRect) {
            const aspectRatio = this.config.canvasWidth / this.config.canvasHeight;
            let newWidth = containerRect.width * 0.9; // Leave some margin
            let newHeight = newWidth / aspectRatio;
            
            // Ensure canvas fits vertically
            if (newHeight > containerRect.height * 0.8) {
              newHeight = containerRect.height * 0.8;
              newWidth = newHeight * aspectRatio;
            }
            
            this.gameCanvas.resize(newWidth, newHeight);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize
    setTimeout(handleResize, 100);
  }

  /**
   * Phase 3: Start game for testing purposes
   * In Phase 5, this will be replaced with proper invitation system
   */
  public async startTestGame(opponentId: number = 2): Promise<void> {
    if (!this.gameWebSocket) {
      console.error('❌ Game: GameWebSocket not initialized');
      return;
    }

    try {
      console.log(`🧪 Game: Starting test game with opponent ${opponentId}`);
      await this.gameWebSocket.startGame(opponentId);
    } catch (error) {
      console.error('❌ Game: Failed to start test game:', error);
      this.handleGameError({ type: 'start_error', message: 'Failed to start game' });
    }
  }

  /**
   * Create a mock GameState for immediate visual testing
   */
  private createStaticMockGameState(): GameState {
    const centerY = GAME_CONSTANTS.arena.height / 2;
    
    return {
      leftPaddle: {
        pos: new Point2(GAME_CONSTANTS.paddle.width / 2, centerY - 20),
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
          GAME_CONSTANTS.arena.width / 2 + 50,
          GAME_CONSTANTS.arena.height / 2 - 25
        ),
        direction: new Vector2(1, 0.5)
      },
      state: PongState.Running
    };
  }

  private retry(): void {
    console.log('🔄 Game: Retrying game initialization');
    this.error = null;
    this.loading = true;
    this.render();
    this.init();
  }

  public destroy(): void {
    console.log('🗑️ Game: Cleaning up game resources');
    
    // Clean up UI components
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }
    
    // Clean up GameCanvas
    if (this.gameCanvas) {
      this.gameCanvas.destroy();
      this.gameCanvas = null;
    }
    
    // Clean up input system
    if (this.gameInputHandler) {
      this.gameInputHandler.deactivate();
      this.gameInputHandler = null;
    }
    
    // Clean up game resources
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Clean up WebSocket connection
    if (this.gameWebSocket) {
      this.gameWebSocket.disconnect();
      this.gameWebSocket = null;
    }
    
    // Remove resize listener
    window.removeEventListener('resize', this.setupResizeHandler);
  }

  // ============================================================================
  // Public API for debugging and external access
  // ============================================================================

  public getGameId(): string {
    return this.gameId;
  }

  public getGameSession(): GameSession | null {
    return this.gameSession;
  }

  public getGameState(): GameState | null {
    return this.gameState;
  }

  public isGameLoading(): boolean {
    return this.loading;
  }

  public getGameError(): string | null {
    return this.error;
  }

  public getGameCanvas(): GameCanvas | null {
    return this.gameCanvas;
  }

  public getGameConfig(): GameConfig {
    return this.config;
  }

  /**
   * Phase 3: Update game rendering with new state (used by WebSocket integration)
   */
  public updateGameState(gameState: GameState): void {
    this.gameState = gameState;
    if (this.gameCanvas) {
      this.gameCanvas.updateGameState(gameState);
    }
  }

  /**
   * Phase 3: Get GameWebSocket instance for external access
   */
  public getGameWebSocket(): GameWebSocket | null {
    return this.gameWebSocket;
  }

  /**
   * Phase 3: Check WebSocket connection status
   */
  public isWebSocketConnected(): boolean {
    return this.gameWebSocket ? this.gameWebSocket.isGameConnected() : false;
  }

  /**
   * Phase 3: Get detailed connection status
   */
  public getConnectionStatus(): any {
    return this.gameWebSocket ? this.gameWebSocket.getConnectionStatus() : null;
  }

  /**
   * Phase 3: Start animated test for WebSocket integration
   */
  public startAnimatedTest(duration: number = 10000): void {
    GameTestHelper.startAnimatedTest(Number(this.gameId), duration);
  }

  /**
   * Phase 3: Get test helper for manual testing
   */
  public getTestHelper(): typeof GameTestHelper {
    return GameTestHelper;
  }

  /**
   * Phase 4: Get input handler for external access
   */
  public getInputHandler(): GameInputHandler | null {
    return this.gameInputHandler;
  }

  /**
   * Phase 4: Get input statistics
   */
  public getInputStats(): any {
    return this.gameInputHandler ? this.gameInputHandler.getInputStats() : null;
  }

  /**
   * Phase 4: Simulate input for testing
   */
  public simulateInput(up: boolean, down: boolean): void {
    if (this.gameInputHandler) {
      this.gameInputHandler.simulateInput(up, down, 'game-api');
    }
  }

  /**
   * Phase 4: Update input options dynamically
   */
  public updateInputOptions(options: Partial<InputOptions>): void {
    if (this.gameInputHandler) {
      this.gameInputHandler.updateOptions(options);
    }
  }
}