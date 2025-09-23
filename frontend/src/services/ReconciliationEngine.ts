// ============================================================================
// ReconciliationEngine.ts - Server state reconciliation with smooth correction
// ============================================================================

import { GameState, Vector2 } from '../features/game/types/GameTypes';
import {
  TimedGameState,
  Desync,
  lerp,
  clamp
} from '../shared/types/OnlineGameTypes';

// ============================================================================
// Vector2 Utility Functions
// ============================================================================

function createVector2(x: number, y: number): Vector2 {
  return new Vector2(x, y);
}

function cloneVector2(vector: Vector2): Vector2 {
  return new Vector2(vector.x, vector.y);
}

// ============================================================================
//
// Custom Desync Interface for Reconciliation
// ============================================================================

interface ReconciliationDesync {
  ball: { x: number; y: number };
  leftPaddle: number;
  rightPaddle: number;
  total: number;
}

// ============================================================================
// State Conversion Utilities
// ============================================================================

function convertPongStateToNumber(pongState: any): number {
  if (typeof pongState === 'number') return pongState;
  
  // Handle PongState enum conversion if needed
  switch (pongState) {
    case 'Running': return 0;
    case 'Aborted': return 1;
    case 'LeftWins': return 2;
    case 'RightWins': return 3;
    default: return 0;
  }
}

function createTimedGameState(state: GameState, timestamp: number, serverTime: number): TimedGameState {
  return {
    leftPaddle: { pos: { x: state.leftPaddle.pos.x, y: state.leftPaddle.pos.y }, hitCount: state.leftPaddle.hitCount },
    rightPaddle: { pos: { x: state.rightPaddle.pos.x, y: state.rightPaddle.pos.y }, hitCount: state.rightPaddle.hitCount },
    ball: { pos: { x: state.ball.pos.x, y: state.ball.pos.y }, direction: { x: state.ball.direction.x, y: state.ball.direction.y } },
    state: convertPongStateToNumber(state.state),
    leftScore: state.leftScore ?? 0,
    rightScore: state.rightScore ?? 0,
    timestamp,
    frame: timestamp,
    serverTime
  };
}

function convertTimedToGameState(timedState: TimedGameState): GameState {
  return {
    leftPaddle: { 
      pos: createVector2(timedState.leftPaddle.pos.x, timedState.leftPaddle.pos.y), 
      hitCount: timedState.leftPaddle.hitCount 
    },
    rightPaddle: { 
      pos: createVector2(timedState.rightPaddle.pos.x, timedState.rightPaddle.pos.y), 
      hitCount: timedState.rightPaddle.hitCount 
    },
    ball: { 
      pos: createVector2(timedState.ball.pos.x, timedState.ball.pos.y), 
      direction: createVector2(timedState.ball.direction.x, timedState.ball.direction.y) 
    },
    state: timedState.state as any, // Convert number back to PongState
    leftScore: timedState.leftScore,
    rightScore: timedState.rightScore,
    lastUpdate: timedState.timestamp
  };
}

// ============================================================================
// Circular Buffer for State History
// ============================================================================

class CircularBuffer<T> {
  private buffer: T[] = [];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {}

  add(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAt(index: number): T | null {
    if (index < 0 || index >= this.size) {
      return null;
    }

    const bufferIndex = (this.head - this.size + index + this.capacity) % this.capacity;
    return this.buffer[bufferIndex];
  }

  findByPredicate(predicate: (item: T) => boolean): T | null {
    for (let i = 0; i < this.size; i++) {
      const item = this.getAt(i);
      if (item && predicate(item)) {
        return item;
      }
    }
    return null;
  }

  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}

// ============================================================================
// Reconciliation Settings
// ============================================================================

interface ReconciliationSettings {
  smoothingFactor: number; // How aggressively to correct (0-1)
  maxDesync: number; // Max allowed desync before snapping (pixels)
  snapThreshold: number; // Threshold for immediate correction (pixels)
  paddleCorrectionMultiplier: number; // Paddle corrections are more aggressive
  ballCorrectionMultiplier: number; // Ball corrections are smoother
  temporalTolerance: number; // Time tolerance for state matching (ms)
}

// ============================================================================
// Main Reconciliation Engine
// ============================================================================

export class ReconciliationEngine {
  private stateBuffer: CircularBuffer<TimedGameState>;
  private settings: ReconciliationSettings = {
    smoothingFactor: 0.1,
    maxDesync: 50,
    snapThreshold: 100,
    paddleCorrectionMultiplier: 2.0,
    ballCorrectionMultiplier: 0.8,
    temporalTolerance: 50
  };

  constructor(bufferSize: number = 120) {
    this.stateBuffer = new CircularBuffer<TimedGameState>(bufferSize);
  }

  reconcile(
    clientState: GameState,
    serverState: GameState,
    serverTimestamp: number
  ): GameState {
    // Find the corresponding client state at server timestamp
    const historicalState = this.findHistoricalState(serverTimestamp);

    if (!historicalState) {
      // No historical data, accept server state
      console.warn('No historical state found, accepting server state');
      return this.createTimedState(serverState, serverTimestamp);
    }

    // Calculate desynchronization
    const desync = this.calculateDesync(convertTimedToGameState(historicalState), serverState);

    // Check if we need to snap to server state
    if (desync.total > this.settings.snapThreshold) {
      console.warn('Major desync detected, snapping to server state', {
        desync: desync.total,
        threshold: this.settings.snapThreshold
      });
      return this.createTimedState(serverState, serverTimestamp);
    }

    // Apply smooth correction
    const correctedState = this.smoothCorrection(clientState, serverState, desync);

    // Store corrected state in buffer
    this.stateBuffer.add(createTimedGameState(correctedState, Date.now(), serverTimestamp));

    return correctedState;
  }

  private findHistoricalState(serverTimestamp: number): TimedGameState | null {
    // Find state closest to server timestamp within tolerance
    return this.stateBuffer.findByPredicate(state => {
      const timeDiff = Math.abs((state.serverTime || state.timestamp) - serverTimestamp);
      return timeDiff <= this.settings.temporalTolerance;
    });
  }

  private calculateDesync(clientState: GameState, serverState: GameState): ReconciliationDesync {
    const ballDesync = {
      x: Math.abs(clientState.ball.pos.x - serverState.ball.pos.x),
      y: Math.abs(clientState.ball.pos.y - serverState.ball.pos.y)
    };

    const leftPaddleDesync = Math.abs(
      clientState.leftPaddle.pos.y - serverState.leftPaddle.pos.y
    );

    const rightPaddleDesync = Math.abs(
      clientState.rightPaddle.pos.y - serverState.rightPaddle.pos.y
    );

    const total = Math.sqrt(
      ballDesync.x * ballDesync.x +
      ballDesync.y * ballDesync.y +
      leftPaddleDesync * leftPaddleDesync +
      rightPaddleDesync * rightPaddleDesync
    );

    return {
      ball: ballDesync,
      leftPaddle: leftPaddleDesync,
      rightPaddle: rightPaddleDesync,
      total
    };
  }

  private smoothCorrection(
    current: GameState,
    target: GameState,
    desync: ReconciliationDesync
  ): GameState {
    const corrected = this.cloneState(current);

    // Adaptive correction factor based on desync magnitude
    const adaptiveFactor = Math.min(
      this.settings.smoothingFactor * (desync.total / 10),
      0.5
    );

    // Ball correction (smoother for better visual experience)
    const ballFactor = adaptiveFactor * this.settings.ballCorrectionMultiplier;
    corrected.ball.pos.x = lerp(current.ball.pos.x, target.ball.pos.x, ballFactor);
    corrected.ball.pos.y = lerp(current.ball.pos.y, target.ball.pos.y, ballFactor);

    // Ball direction correction (immediate for physics accuracy)
    if (desync.ball.x > 20 || desync.ball.y > 20) {
      corrected.ball.direction.x = target.ball.direction.x;
      corrected.ball.direction.y = target.ball.direction.y;
    }

    // Paddle corrections (more aggressive for responsiveness)
    const paddleFactor = adaptiveFactor * this.settings.paddleCorrectionMultiplier;

    corrected.leftPaddle.pos.y = lerp(
      current.leftPaddle.pos.y,
      target.leftPaddle.pos.y,
      paddleFactor
    );

    corrected.rightPaddle.pos.y = lerp(
      current.rightPaddle.pos.y,
      target.rightPaddle.pos.y,
      paddleFactor
    );

    // Score correction (immediate)
    if (current.leftScore !== target.leftScore || current.rightScore !== target.rightScore) {
      corrected.leftScore = target.leftScore;
      corrected.rightScore = target.rightScore;
    }

    // Game state correction (immediate)
    if (current.state !== target.state) {
      corrected.state = target.state;
    }

    // Hit count corrections (immediate for accuracy)
    if (current.leftPaddle.hitCount !== target.leftPaddle.hitCount) {
      corrected.leftPaddle.hitCount = target.leftPaddle.hitCount;
    }

    if (current.rightPaddle.hitCount !== target.rightPaddle.hitCount) {
      corrected.rightPaddle.hitCount = target.rightPaddle.hitCount;
    }

    return corrected;
  }

  private createTimedState(state: GameState, timestamp: number): GameState {
    return {
      ...state,
      lastUpdate: timestamp
    };
  }

  private cloneState(state: GameState): GameState {
    return {
      leftPaddle: {
        pos: cloneVector2(state.leftPaddle.pos),
        hitCount: state.leftPaddle.hitCount
      },
      rightPaddle: {
        pos: cloneVector2(state.rightPaddle.pos),
        hitCount: state.rightPaddle.hitCount
      },
      ball: {
        pos: cloneVector2(state.ball.pos),
        direction: cloneVector2(state.ball.direction)
      },
      state: state.state,
      leftScore: state.leftScore,
      rightScore: state.rightScore,
      lastUpdate: state.lastUpdate,
      opponentInput: state.opponentInput ? { ...state.opponentInput } : undefined
    };
  }

  // ============================================================================
  // Configuration and Diagnostics
  // ============================================================================

  updateSettings(newSettings: Partial<ReconciliationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): ReconciliationSettings {
    return { ...this.settings };
  }

  getDesyncHistory(): Array<{ timestamp: number; desync: number }> {
    const history: Array<{ timestamp: number; desync: number }> = [];

    for (let i = 1; i < this.stateBuffer.length; i++) {
      const current = this.stateBuffer.getAt(i);
      const previous = this.stateBuffer.getAt(i - 1);

      if (current && previous) {
        const desync = this.calculateDesync(convertTimedToGameState(previous), convertTimedToGameState(current));
        history.push({
          timestamp: current.timestamp,
          desync: desync.total
        });
      }
    }

    return history;
  }

  getAverageDesync(): number {
    const history = this.getDesyncHistory();
    if (history.length === 0) return 0;

    const total = history.reduce((sum, entry) => sum + entry.desync, 0);
    return total / history.length;
  }

  clearHistory(): void {
    this.stateBuffer.clear();
  }

  // ============================================================================
  // Advanced Reconciliation Methods
  // ============================================================================

  /**
   * Performs rollback reconciliation when significant desync is detected
   */
  rollbackReconciliation(
    clientState: GameState,
    serverState: GameState,
    serverTimestamp: number,
    inputHistory: any[]
  ): GameState {
    // Start with server state as authoritative
    let reconciledState = this.cloneState(serverState);

    // Re-apply client inputs that occurred after server timestamp
    const futureInputs = inputHistory.filter(input => input.timestamp > serverTimestamp);

    for (const input of futureInputs) {
      // Apply input with client-side prediction
      reconciledState = this.applyInputWithPrediction(reconciledState, input);
    }

    return reconciledState;
  }

  private applyInputWithPrediction(state: GameState, input: any): GameState {
    // This would integrate with PredictionEngine for accurate input replay
    // For now, return state unchanged
    return state;
  }

  /**
   * Adaptive reconciliation that adjusts correction strength based on network conditions
   */
  adaptiveReconciliation(
    clientState: GameState,
    serverState: GameState,
    networkMetrics: any
  ): GameState {
    // Adjust reconciliation aggressiveness based on network quality
    const adaptedSettings = { ...this.settings };

    if (networkMetrics.quality === 'poor') {
      adaptedSettings.smoothingFactor *= 0.5; // Smoother corrections for poor connections
      adaptedSettings.snapThreshold *= 1.5; // Higher tolerance for snapping
    } else if (networkMetrics.quality === 'excellent') {
      adaptedSettings.smoothingFactor *= 1.5; // More aggressive corrections for good connections
      adaptedSettings.snapThreshold *= 0.8; // Lower tolerance for snapping
    }

    // Temporarily update settings
    const originalSettings = this.settings;
    this.settings = adaptedSettings;

    const result = this.smoothCorrection(clientState, serverState,
      this.calculateDesync(clientState, serverState));

    // Restore original settings
    this.settings = originalSettings;

    return result;
  }
}