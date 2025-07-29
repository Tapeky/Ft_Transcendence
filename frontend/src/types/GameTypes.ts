// ============================================================================
// GameTypes.ts - TypeScript interfaces for Pong game frontend
// ============================================================================
// Mirrors backend game system types for frontend-backend compatibility

// ============================================================================
// Geometry Types (from backend/src/game/Geometry.ts)
// ============================================================================

export class Vector2 {
  public constructor(public x: number, public y: number) {}

  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  public add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  public sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  public scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  public get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public static readonly zero = new Vector2(0, 0);
  public static readonly one = new Vector2(1, 1);
  public static readonly right = new Vector2(1, 0);
  public static readonly left = new Vector2(-1, 0);
  public static readonly up = new Vector2(0, -1);
  public static readonly down = new Vector2(0, 1);
}

// Alias to differentiate a vector from a point in space
export class Point2 extends Vector2 {}

// ============================================================================
// Input Types (from backend/src/game/Input.ts)
// ============================================================================

export interface Input {
  up: boolean;
  down: boolean;
}

export class GameInput implements Input {
  public up: boolean = false;
  public down: boolean = false;

  public reset(): void {
    this.up = false;
    this.down = false;
  }

  public copy(input: Input): void {
    this.up = input.up;
    this.down = input.down;
  }
}

// ============================================================================
// Game State Types (from backend/src/game/Pong.ts)  
// ============================================================================

export enum PongState {
  Running = 'Running',
  Aborted = 'Aborted',
  LeftWins = 'LeftWins',
  RightWins = 'RightWins'
}

export interface PaddleData {
  pos: Point2;
  hitCount: number;
}

export interface BallData {
  pos: Point2;
  direction: Vector2;
}

export interface GameState {
  leftPaddle: PaddleData;
  rightPaddle: PaddleData;
  ball: BallData;
  state: PongState;
  opponentInput?: Input;
}

// ============================================================================
// Game Constants (from backend/src/game/Pong.ts)
// ============================================================================

export const GAME_CONSTANTS = {
  arena: {
    width: 500,
    height: 200
  },
  paddle: {
    width: 8,
    height: 30,
    speed: 20 // units / sec
  },
  ball: {
    radius: 5,
    speed: 50, // units / sec
    maxBounceAngle: 75
  }
} as const;

// ============================================================================
// Player & Match Types
// ============================================================================

export interface Player {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface GamePlayer {
  player?: Player;
  guest_name?: string;
  score: number;
  isReady: boolean;
}

export interface GameSession {
  id: number;
  player1: GamePlayer;
  player2: GamePlayer;
  state: PongState;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'game_update';
  data: GameState;
}

export interface GameInputMessage extends WebSocketMessage {
  type: 'game_input';
  data: Input;
}

export interface GameJoinMessage extends WebSocketMessage {
  type: 'game_join';
  data: {
    gameId: number;
    playerSide: 'left' | 'right';
  };
}

export interface GameLeaveMessage extends WebSocketMessage {
  type: 'game_leave';
  data: {
    gameId: number;
  };
}

export interface GameEndMessage extends WebSocketMessage {
  type: 'game_end';
  data: {
    gameId: number;
    winner: 'left' | 'right' | 'aborted';
    finalState: GameState;
  };
}

export type GameMessage = 
  | GameUpdateMessage 
  | GameInputMessage 
  | GameJoinMessage 
  | GameLeaveMessage 
  | GameEndMessage;

// ============================================================================
// Canvas Rendering Types
// ============================================================================

export interface RenderingContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: {
    x: number;
    y: number;
  };
}

export interface DrawableEntity {
  render(ctx: RenderingContext): void;
}

// ============================================================================
// Game Configuration Types
// ============================================================================

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  paddleColor: string;
  ballColor: string;
  scoreColor: string;
  frameRate: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 400,
  backgroundColor: '#1a1a2e',
  paddleColor: '#ffffff',
  ballColor: '#00ff00',
  scoreColor: '#ffffff',
  frameRate: 60
};

// ============================================================================
// Error Types
// ============================================================================

export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public gameId?: number
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class WebSocketError extends GameError {
  constructor(message: string, gameId?: number) {
    super(message, 'WEBSOCKET_ERROR', gameId);
    this.name = 'WebSocketError';
  }
}

export class GameNotFoundError extends GameError {
  constructor(gameId: number) {
    super(`Game with ID ${gameId} not found`, 'GAME_NOT_FOUND', gameId);
    this.name = 'GameNotFoundError';
  }
}

export class InvalidGameStateError extends GameError {
  constructor(message: string, gameId?: number) {
    super(message, 'INVALID_GAME_STATE', gameId);
    this.name = 'InvalidGameStateError';
  }
}