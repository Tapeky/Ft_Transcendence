export class Vector2 {
  public constructor(
    public x: number,
    public y: number
  ) {}

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

export class Point2 extends Vector2 {}

export interface Input {
  up: boolean;
  down: boolean;
}

export interface TwoPlayerInput {
  player1: Input;
  player2: Input;
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

export class TwoPlayerGameInput implements TwoPlayerInput {
  public player1: GameInput = new GameInput();
  public player2: GameInput = new GameInput();

  public reset(): void {
    this.player1.reset();
    this.player2.reset();
  }

  public copy(input: TwoPlayerInput): void {
    this.player1.copy(input.player1);
    this.player2.copy(input.player2);
  }
}

export enum PongState {
  Running = 'Running',
  Aborted = 'Aborted',
  LeftWins = 'LeftWins',
  RightWins = 'RightWins',
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
  leftScore?: number;
  rightScore?: number;
  lastUpdate?: number;
  opponentInput?: Input;
}

export const GAME_CONSTANTS = {
  arena: {
    width: 500,
    height: 200,
  },
  paddle: {
    width: 8,
    height: 30,
    speed: 300,
  },
  ball: {
    radius: 5,
    speed: 200,
    maxBounceAngle: 45,
    speedIncrementPerHit: 10,
    maxSpeed: 400,
  },
  game: {
    winningScore: 5,
    maxGameDurationMinutes: 10,
  },
} as const;

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
  leftScore?: number;
  rightScore?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  winner?: 'left' | 'right' | 'draw';
}

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
  frameRate: 60,
};

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
