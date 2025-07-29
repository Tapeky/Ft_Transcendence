// ============================================================================
// GameCanvas.ts - Canvas component for Pong game rendering
// ============================================================================
// Phase 2: Complete Canvas HTML5 rendering system for Pong game

import { 
  GameState, 
  GameConfig, 
  RenderingContext, 
  Vector2, 
  Point2,
  PongState,
  GAME_CONSTANTS 
} from '../../types/GameTypes';

export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private scale: { x: number; y: number } = { x: 1, y: 1 };
  private animationFrameId: number | null = null;
  private isRunning = false;
  
  // Animation timing
  private lastFrameTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.ctx = context;
    this.config = config;
    
    // Set canvas size to match config
    this.setupCanvas();
    
    // Calculate scale factors from game world (500x200) to canvas (800x400)
    this.calculateScale();
    
    console.log('🎨 GameCanvas: Initialized with scale', this.scale);
  }

  private setupCanvas(): void {
    // Set canvas dimensions
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;
    
    // Enable smooth rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Set default font
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  private calculateScale(): void {
    this.scale = {
      x: this.canvas.width / GAME_CONSTANTS.arena.width,
      y: this.canvas.height / GAME_CONSTANTS.arena.height
    };
  }

  /**
   * Phase 2: Animation loop - maintains 60FPS rendering
   */
  public startAnimation(gameState?: GameState): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate(gameState);
  }

  public stopAnimation(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (gameState?: GameState) => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    // Maintain 60FPS
    if (deltaTime >= this.frameInterval) {
      this.render(gameState);
      this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate(gameState));
  };

  /**
   * Phase 2: Main render method - draws the complete game state
   */
  public render(gameState?: GameState): void {
    this.clear();
    this.renderArena();
    
    if (gameState) {
      this.renderGameElements(gameState);
    } else {
      this.renderMockGameElements();
    }
  }

  private clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render the arena (boundaries and center line)
   */
  private renderArena(): void {
    const ctx = this.ctx;
    
    // Draw arena boundaries
    ctx.strokeStyle = this.config.paddleColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw center line
    const centerX = this.canvas.width / 2;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, this.canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw center circle
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, this.canvas.height / 2, 40, 0, 2 * Math.PI);
    ctx.stroke();
  }

  /**
   * Render actual game elements from GameState
   */
  private renderGameElements(gameState: GameState): void {
    // Render paddles
    this.renderPaddle(gameState.leftPaddle.pos, 'left');
    this.renderPaddle(gameState.rightPaddle.pos, 'right');
    
    // Render ball
    this.renderBall(gameState.ball.pos);
    
    // Render hit counts
    this.renderHitCounts(gameState.leftPaddle.hitCount, gameState.rightPaddle.hitCount);
    
    // Render game status
    this.renderGameStatus(gameState.state);
  }

  /**
   * Render mock game elements for testing/demo
   */
  private renderMockGameElements(): void {
    const centerY = GAME_CONSTANTS.arena.height / 2;
    
    // Mock paddle positions
    const leftPaddlePos = new Point2(GAME_CONSTANTS.paddle.width / 2, centerY - 20);
    const rightPaddlePos = new Point2(
      GAME_CONSTANTS.arena.width - GAME_CONSTANTS.paddle.width / 2, 
      centerY + 15
    );
    
    // Animated ball position
    const time = Date.now() / 1000;
    const ballX = GAME_CONSTANTS.arena.width / 2 + Math.sin(time) * 100;
    const ballY = GAME_CONSTANTS.arena.height / 2 + Math.cos(time * 1.5) * 50;
    const ballPos = new Point2(ballX, ballY);
    
    // Render elements
    this.renderPaddle(leftPaddlePos, 'left');
    this.renderPaddle(rightPaddlePos, 'right');
    this.renderBall(ballPos);
    this.renderHitCounts(3, 5);
    this.renderGameStatus(PongState.Running);
    
    // Phase 2 status
    this.renderPhaseStatus();
  }

  /**
   * Render a paddle at given world position
   */
  private renderPaddle(worldPos: Point2, side: 'left' | 'right'): void {
    const canvasPos = this.worldToCanvas(worldPos);
    const paddleWidth = GAME_CONSTANTS.paddle.width * this.scale.x;
    const paddleHeight = GAME_CONSTANTS.paddle.height * this.scale.y;
    
    // Calculate paddle rectangle (worldPos is center)
    const x = canvasPos.x - paddleWidth / 2;
    const y = canvasPos.y - paddleHeight / 2;
    
    // Draw paddle with slight glow effect
    this.ctx.shadowColor = this.config.paddleColor;
    this.ctx.shadowBlur = 5;
    this.ctx.fillStyle = this.config.paddleColor;
    this.ctx.fillRect(x, y, paddleWidth, paddleHeight);
    this.ctx.shadowBlur = 0;
    
    // Add side indicator
    this.ctx.fillStyle = side === 'left' ? '#ff6b6b' : '#4ecdc4';
    this.ctx.fillRect(x, y, 3, paddleHeight);
  }

  /**
   * Render the ball at given world position
   */
  private renderBall(worldPos: Point2): void {
    const canvasPos = this.worldToCanvas(worldPos);
    const radius = GAME_CONSTANTS.ball.radius * Math.min(this.scale.x, this.scale.y);
    
    // Draw ball with glow effect
    this.ctx.shadowColor = this.config.ballColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = this.config.ballColor;
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Add inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x - radius/3, canvasPos.y - radius/3, radius/3, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  /**
   * Render hit counts for both paddles
   */
  private renderHitCounts(leftHits: number, rightHits: number): void {
    this.ctx.fillStyle = this.config.scoreColor;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    
    // Left paddle hits
    this.ctx.fillText(`Hits: ${leftHits}`, 20, 30);
    
    // Right paddle hits
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Hits: ${rightHits}`, this.canvas.width - 20, 30);
  }

  /**
   * Render current game status
   */
  private renderGameStatus(state: PongState): void {
    let statusText = '';
    let statusColor = this.config.scoreColor;
    
    switch (state) {
      case PongState.Running:
        statusText = 'PLAYING';
        statusColor = '#4ecdc4';
        break;
      case PongState.LeftWins:
        statusText = 'LEFT PLAYER WINS!';
        statusColor = '#ff6b6b';
        break;
      case PongState.RightWins:
        statusText = 'RIGHT PLAYER WINS!';
        statusColor = '#4ecdc4';
        break;
      case PongState.Aborted:
        statusText = 'GAME ABORTED';
        statusColor = '#ffa726';
        break;
    }
    
    if (statusText) {
      this.ctx.fillStyle = statusColor;
      this.ctx.font = '18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(statusText, this.canvas.width / 2, this.canvas.height - 20);
    }
  }

  /**
   * Render Phase 2 completion status
   */
  private renderPhaseStatus(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Phase 2: Canvas Rendering Complete', this.canvas.width / 2, 50);
    this.ctx.fillText('60FPS Animation • Coordinate Scaling • Visual Elements', this.canvas.width / 2, 70);
  }

  /**
   * Convert game world coordinates to canvas coordinates
   */
  private worldToCanvas(worldPos: Vector2): Vector2 {
    return new Vector2(
      worldPos.x * this.scale.x,
      worldPos.y * this.scale.y
    );
  }

  /**
   * Convert canvas coordinates to game world coordinates
   */
  private canvasToWorld(canvasPos: Vector2): Vector2 {
    return new Vector2(
      canvasPos.x / this.scale.x,
      canvasPos.y / this.scale.y
    );
  }

  /**
   * Update game state and continue animation
   */
  public updateGameState(gameState: GameState): void {
    if (this.isRunning) {
      this.render(gameState);
    }
  }

  /**
   * Handle canvas resize with proper aspect ratio maintenance
   */
  public resize(width: number, height: number): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stopAnimation();
    }
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Recalculate scale maintaining aspect ratio
    this.calculateScale();
    this.setupCanvas();
    
    if (wasRunning) {
      this.startAnimation();
    }
    
    console.log('📐 GameCanvas: Resized to', width, 'x', height, 'scale:', this.scale);
  }

  /**
   * Clean up resources and stop animation
   */
  public destroy(): void {
    console.log('🗑️ GameCanvas: Cleaning up canvas resources');
    
    this.stopAnimation();
    
    // Clear canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // ============================================================================
  // Public API for external access
  // ============================================================================

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getScale(): { x: number; y: number } {
    return this.scale;
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public isAnimating(): boolean {
    return this.isRunning;
  }

  public setConfig(config: Partial<GameConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update canvas if size changed
    if (config.canvasWidth || config.canvasHeight) {
      this.setupCanvas();
      this.calculateScale();
    }
  }
}