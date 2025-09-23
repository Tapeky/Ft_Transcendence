// ============================================================================
// OnlineGameTypes.ts - Enhanced types for hybrid client/server Pong system
// ============================================================================

// ============================================================================
// Core Geometry and Input Types
// ============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

export interface Input {
  up: boolean;
  down: boolean;
}

export enum PongState {
  Running = 'Running',
  Aborted = 'Aborted',
  LeftWins = 'LeftWins',
  RightWins = 'RightWins'
}

export interface PaddleData {
  pos: Vector2D;
  hitCount: number;
}

export interface BallData {
  pos: Vector2D;
  direction: Vector2D;
}

export interface GameState {
  leftPaddle: PaddleData;
  rightPaddle: PaddleData;
  ball: BallData;
  state: PongState | 'Waiting' | 'Paused' | 'Ended';
  leftScore: number;
  rightScore: number;
  lastUpdate: number;
}

// ============================================================================
// Player Input with Timestamps and Prediction Support
// ============================================================================

export interface PlayerInput extends Input {
  id: string;
  playerId: 'left' | 'right' | string;
  timestamp: number;
  sequenceNumber: number;
  value: number; // Normalized input value (-1 to 1)
  type: 'PADDLE_MOVE' | 'PADDLE_STOP' | 'GAME_ACTION';
}

export interface InputBuffer {
  inputs: PlayerInput[];
  maxSize: number;
  lastSequence: number;
}

// ============================================================================
// Game Session Management
// ============================================================================

export interface GameOptions {
  mode: 'competitive' | 'casual' | 'ranked';
  scoreLimit: number;
  timeLimit?: number; // in minutes
  difficulty: 'easy' | 'normal' | 'hard';
  rules: {
    ballSpeedIncrease: boolean;
    paddleSize: 'small' | 'normal' | 'large';
    bounceAngle: number; // max bounce angle in degrees
  };
}

export interface GamePlayer {
  id: string;
  username: string;
  avatar?: string;
  side: 'left' | 'right';
  score: number;
  connected: boolean;
  ready: boolean;
  lastPing: number;
  inputLatency: number;
}

export interface GameSession {
  id: string;
  players: [GamePlayer, GamePlayer];
  state: 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
  options: GameOptions;
  gameState: GameState;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  winner?: 'left' | 'right' | 'draw';
  spectators: string[];
}

export interface GameInvitation {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  options: GameOptions;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: number;
}

// ============================================================================
// Network Protocol Messages
// ============================================================================

export enum MessageType {
  // Client → Server
  INPUT = 0x01,
  PING = 0x02,
  REQUEST_STATE = 0x03,
  JOIN_SESSION = 0x04,
  LEAVE_SESSION = 0x05,
  PLAYER_READY = 0x06,
  RECONNECT = 0x07,

  // Server → Client
  STATE_UPDATE = 0x10,
  INPUT_ACK = 0x11,
  GAME_EVENT = 0x12,
  PONG = 0x13,
  SESSION_UPDATE = 0x14,
  ERROR = 0x15,
  COUNTDOWN = 0x16,

  // Bidirectional
  GAME_INVITATION = 0x20,
  INVITATION_RESPONSE = 0x21,
  SPECTATE_REQUEST = 0x22,
  CHAT_MESSAGE = 0x23
}

export interface GameMessage {
  id?: string;
  type: MessageType;
  timestamp: number;
  sequence?: number;
  sessionId?: string;
  playerId?: string;
  payload?: any;
}

export interface StateUpdateMessage extends GameMessage {
  type: MessageType.STATE_UPDATE;
  payload: {
    gameState: GameState;
    serverTime: number;
    acknowledgedInput: string; // Last input ID acknowledged
  };
}

export interface InputMessage extends GameMessage {
  type: MessageType.INPUT;
  payload: PlayerInput;
}

export interface InputAckMessage extends GameMessage {
  type: MessageType.INPUT_ACK;
  payload: {
    inputId: string;
    serverTime: number;
  };
}

export interface GameEventMessage extends GameMessage {
  type: MessageType.GAME_EVENT;
  payload: {
    event: 'SCORE' | 'BALL_RESET' | 'PADDLE_HIT' | 'WALL_HIT' | 'GAME_END';
    data: any;
  };
}

export interface SessionUpdateMessage extends GameMessage {
  type: MessageType.SESSION_UPDATE;
  payload: {
    session: Partial<GameSession>;
    reason: 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'STATE_CHANGED' | 'READY_STATUS';
  };
}

// ============================================================================
// Prediction and Reconciliation
// ============================================================================

export interface StateSnapshot {
  state: GameState;
  timestamp: number;
  inputId: string;
  sequence: number;
}

export interface TimedGameState extends GameState {
  timestamp: number;
  serverTime?: number;
  interpolationAlpha?: number;
}

export interface Desync {
  ball: {
    x: number;
    y: number;
  };
  leftPaddle: number;
  rightPaddle: number;
  total: number;
}

export interface NetworkMetrics {
  rtt: number; // Round trip time
  jitter: number; // Variance in latency
  packetLoss: number; // Percentage of lost packets
  bandwidth: number; // Bytes per second
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface PredictionSettings {
  enabled: boolean;
  maxPredictionTime: number; // Max time to predict ahead (ms)
  reconciliationThreshold: number; // Max desync before snap (pixels)
  smoothingFactor: number; // How aggressively to correct (0-1)
  rollbackWindow: number; // How far back to rollback (ms)
}

// ============================================================================
// Compression and Optimization
// ============================================================================

export interface CompressedDelta {
  baseId: number;
  changes: Array<{
    path: string;
    value: any;
  }>;
}

export interface UpdateRate {
  rate: number; // Updates per second
  lastSent: number;
  adaptive: boolean;
}

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface NetworkQuality {
  level: QualityLevel;
  rtt: number;
  jitter: number;
  packetLoss: number;
  measuredAt: number;
}

// ============================================================================
// Connection and Reconnection
// ============================================================================

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastPing?: number;
  reconnectAttempts?: number;
  attempts: number;
  nextRetryDelay: number;
  lastError?: string;
}

export interface ReconnectionData {
  attempts: number;
  lastAttempt: number;
  backoffDelay: number;
  maxDelay: number;
  sessionId: string;
  playerId: string;
  lastSequence: number;
  lastStateTimestamp: number;
  timeDisconnected: number;
}

// ============================================================================
// Error Handling
// ============================================================================

export class OnlineGameError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionId?: string,
    public playerId?: string
  ) {
    super(message);
    this.name = 'OnlineGameError';
  }
}

export class NetworkError extends OnlineGameError {
  constructor(message: string, sessionId?: string) {
    super(message, 'NETWORK_ERROR', sessionId);
    this.name = 'NetworkError';
  }
}

export class SyncError extends OnlineGameError {
  constructor(message: string, sessionId?: string) {
    super(message, 'SYNC_ERROR', sessionId);
    this.name = 'SyncError';
  }
}

export class SessionError extends OnlineGameError {
  constructor(message: string, sessionId?: string) {
    super(message, 'SESSION_ERROR', sessionId);
    this.name = 'SessionError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function generateSessionId(): string {
  return 'session_' + generateId();
}

export function getCurrentUserId(): string {
  // This would typically get the current user ID from auth context
  return 'user_' + Math.random().toString(36).substring(2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================================
// Game Constants
// ============================================================================

export const GAME_CONSTANTS = {
  arena: { width: 800, height: 600 },
  paddle: { width: 8, height: 80, speed: 400 },
  ball: { radius: 5, speed: 300, maxBounceAngle: 45 }
};