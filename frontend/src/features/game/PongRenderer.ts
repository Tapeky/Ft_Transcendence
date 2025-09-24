// ============================================================================
// PongRenderer.ts - Vanilla JS/TS Pong Renderer for Server-Authoritative Mode
// ============================================================================

import { GameService } from '../../services/GameService';
import { GameState } from '../../features/game/types/GameTypes';
import { PlayerInput } from '../../shared/types/OnlineGameTypes';

export class PongRenderer {
  private static instance: PongRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private sessionId: string | null = null;
  private gameService!: GameService;
  private containerId!: string;

  // Game dimensions
  private readonly ARENA_WIDTH = 500;
  private readonly ARENA_HEIGHT = 200;
  private readonly PADDLE_WIDTH = 20;
  private readonly PADDLE_HEIGHT = 30;
  private readonly BALL_RADIUS = 5;

  constructor(containerId: string = 'game-root') {
    // Singleton guard - check if canvas already exists
    if (document.getElementById('pong-canvas')) {
      console.log('Renderer exists, skip');
      return;
    }

    this.containerId = containerId;
    // Get GameService instance (assuming it's a singleton)
    this.gameService = this.getGameServiceInstance();
    this.initCanvas();
    this.bindEvents();

    PongRenderer.instance = this;
  }

  private getGameServiceInstance(): GameService {
    // Import GameManager to get GameService instance
    // This assumes GameManager is a singleton that provides GameService
    const GameManager = require('../../services/GameManager').GameManager;
    return GameManager.getInstance().getGameService();
  }

  private initCanvas(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('Container not found:', this.containerId);
      return;
    }

    // Clear container
    container.innerHTML = '';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pong-canvas';
    this.canvas.width = this.ARENA_WIDTH;
    this.canvas.height = this.ARENA_HEIGHT;
    this.canvas.style.border = '2px solid white';
    this.canvas.style.backgroundColor = 'black';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Canvas context not available');
      return;
    }

    console.log('🎮 PongRenderer: Canvas initialized');
  }

  private bindEvents(): void {
    // Bind to server state updates
    this.gameService.onStateUpdate = this.handleStateUpdate.bind(this);

    // Initial draw with current state
    const currentState = this.gameService.currentState;
    if (currentState) {
      this.draw(currentState);
    }

    // Global inputs (only your side)
    document.addEventListener('keydown', this.handleInput.bind(this));

    console.log('🎮 PongRenderer: Events bound');
  }

  private handleStateUpdate(state: GameState): void {
    console.log('UI Sync Debug: LeftY=' + state.leftPaddle.pos.y.toFixed(2) + ', BallX=' + state.ball.pos.x.toFixed(2));
    this.draw(state);
  }

  private draw(state: GameState): void {
    if (!this.ctx || !state) {
      console.log('🎮 PongRenderer: No context or state to draw');
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);

    // Arena borders
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);

    // Left paddle (blue)
    if (state.leftPaddle) {
      this.ctx.fillStyle = 'blue';
      this.ctx.fillRect(
        10, // Fixed X position for left paddle
        state.leftPaddle.pos.y - 15, // Center vertically
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );
    }

    // Right paddle (red)
    if (state.rightPaddle) {
      this.ctx.fillStyle = 'red';
      this.ctx.fillRect(
        470, // Fixed X position for right paddle
        state.rightPaddle.pos.y - 15, // Center vertically
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );
    }

    // Ball (white)
    if (state.ball) {
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      this.ctx.arc(
        state.ball.pos.x,
        state.ball.pos.y,
        this.BALL_RADIUS,
        0,
        2 * Math.PI
      );
      this.ctx.fill();
    }

    // Scores center top
    this.ctx.fillStyle = 'white';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `${state.leftScore || 0} - ${state.rightScore || 0}`,
      this.ARENA_WIDTH / 2,
      30
    );

    // Player side indicator bottom
    const playerSide = this.gameService.getPlayerSide();
    this.ctx.font = '16px Arial';
    this.ctx.fillText(
      `Side: ${playerSide || 'unknown'}`,
      this.ARENA_WIDTH / 2,
      this.ARENA_HEIGHT - 10
    );
  }

  private handleInput(e: KeyboardEvent): void {
    const playerSide = this.gameService.getPlayerSide();
    if (!playerSide) {
      console.warn('No side assigned, ignoring input');
      return;
    }

    // Only handle keys for assigned side
    let input = { up: false, down: false };
    
    if (playerSide === 'left') {
      // Left player: W/S keys only
      if (e.key === 'w') input.up = true;
      if (e.key === 's') input.down = true;
    } else if (playerSide === 'right') {
      // Right player: Arrow keys only
      if (e.key === 'ArrowUp') input.up = true;
      if (e.key === 'ArrowDown') input.down = true;
    }

    if (input.up || input.down) {
      this.gameService.sendGameInput(input);
      e.preventDefault();
    }
  }

  setSessionId(id: string): void {
    this.sessionId = id;
    console.log('🎮 PongRenderer: Session ID set to', id);
  }

  destroy(): void {
    console.log('🎮 PongRenderer: Destroying renderer');

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Unbind events
    this.gameService.onStateUpdate = null;
    document.removeEventListener('keydown', this.handleInput.bind(this));

    // Clear singleton instance
    PongRenderer.instance = null;
  }

  // Public method to manually trigger a draw (useful for initial state)
  public redraw(): void {
    const currentState = this.gameService.currentState;
    if (currentState) {
      this.draw(currentState);
    }
  }

  // Static method to get singleton instance
  public static getInstance(): PongRenderer | null {
    return PongRenderer.instance;
  }
}