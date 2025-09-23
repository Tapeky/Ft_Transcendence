// ============================================================================
// OnlineGameTypes.ts - Type definitions for online game functionality
// ============================================================================

export interface GameState {
  leftPaddle: { pos: { x: number; y: number }; hitCount: number; };
  rightPaddle: { pos: { x: number; y: number }; hitCount: number; };
  ball: { pos: { x: number; y: number }; direction: { x: number; y: number }; };
  state: number;
  leftScore: number;
  rightScore: number;
}

export interface PlayerInput {
  id?: string;
  key: string;
  pressed: boolean;
  player: 'left' | 'right';
  timestamp?: number;
  sequenceNumber?: number;
  type?: string;
  playerId?: string;
  value?: number;
}

export interface GameSession {
  id: string;
  leftPlayerId: string;
  rightPlayerId: string;
  leftPlayerUsername: string;
  rightPlayerUsername: string;
  state: GameState;
  status: 'waiting' | 'active' | 'finished';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  winnerId?: string;
}

export class OnlineGameError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'OnlineGameError';
    this.code = code;
    this.details = details;
  }
}

export interface GameInvitation {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  sessionId?: string;
}

// Message types
export type MessageType = 'state_update' | 'input' | 'input_ack' | 'game_event' | 'ping' | 'pong' | 'error' | 'reconnect';

export interface GameMessage {
  type: MessageType;
  timestamp: number;
  id: string;
  sequence?: number;
  sessionId?: string;
  playerId?: string;
  payload?: any;
}

export interface StateUpdateMessage extends GameMessage {
  type: 'state_update';
  gameState: GameState;
  frame: number;
  payload: {
    gameState: GameState;
    serverTime: number;
    acknowledgedInput?: string;
  };
}

export interface InputMessage extends GameMessage {
  type: 'input';
  input: PlayerInput;
  frame: number;
  payload: PlayerInput;
}

export interface InputAckMessage extends GameMessage {
  type: 'input_ack';
  inputId: string;
  frame: number;
  payload: {
    inputId: string;
  };
}

export interface GameEventMessage extends GameMessage {
  type: 'game_event';
  event: any; // Will be properly typed as GameEvent after GameEvent definition
  payload: {
    event: string;
    data: any;
  };
}

// Game state extensions
export interface TimedGameState extends GameState {
  timestamp: number;
  frame: number;
  serverTime?: number;
  interpolationAlpha?: number;
}

export interface StateSnapshot {
  gameState: TimedGameState;
  inputs: PlayerInput[];
  timestamp: number;
}

export interface Desync {
  localState: GameState;
  serverState: GameState;
  frame: number;
  severity: 'minor' | 'major' | 'critical';
}

// Connection and network
export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  lastPing: number;
  reconnectAttempts: number;
  attempts: number;
  lastError?: string;
  nextRetryDelay: number;
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

export interface PredictionSettings {
  enabled: boolean;
  maxPredictionFrames?: number;
  reconciliationThreshold?: number;
  maxPredictionTime?: number;
  smoothingFactor?: number;
  rollbackWindow?: number;
  lagCompensation?: boolean;
}

// Error types
export class NetworkError extends OnlineGameError {
  public networkCode?: string;

  constructor(message: string, networkCode?: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    this.networkCode = networkCode;
  }
}

export class SyncError extends OnlineGameError {
  public frame?: number;
  public desync?: Desync;

  constructor(message: string, frame?: number, desync?: Desync) {
    super(message, 'SYNC_ERROR');
    this.name = 'SyncError';
    this.frame = frame;
    this.desync = desync;
  }
}

export interface NetworkMetrics {
  ping?: number;
  rtt?: number;
  jitter?: number;
  packetLoss: number;
  bandwidth: number;
  lastUpdate?: number;
  quality?: string;
}

export interface GameInputEvent {
  sessionId: string;
  playerId: string;
  input: PlayerInput;
}

export interface GameUpdateEvent {
  sessionId: string;
  gameState: GameState;
  timestamp: number;
}

export interface GameEndEvent {
  sessionId: string;
  winnerId: string;
  winnerUsername: string;
  finalScore: {
    left: number;
    right: number;
  };
  gameData: {
    duration: number;
    totalHits: number;
    maxBallSpeed: number;
  };
}

export type GameEventType = 'game_update' | 'game_end' | 'player_input' | 'player_joined' | 'player_left';

export interface GameEvent {
  type: GameEventType;
  data: GameUpdateEvent | GameEndEvent | GameInputEvent | any;
  timestamp: number;
}

// Utility functions
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Additional MessageType enum for better type safety
export const MessageType = {
  STATE_UPDATE: 'state_update' as const,
  INPUT: 'input' as const,
  INPUT_ACK: 'input_ack' as const,
  GAME_EVENT: 'game_event' as const,
  PING: 'ping' as const,
  PONG: 'pong' as const,
  ERROR: 'error' as const,
  RECONNECT: 'reconnect' as const
} as const;