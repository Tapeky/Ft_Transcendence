// ============================================================================
// PredictionEngine.ts - Client-side prediction for responsive gameplay
// ============================================================================

import {
  GameState,
  GAME_CONSTANTS,
  Vector2
} from '../features/game/types/GameTypes';

import {
  PlayerInput,
  clamp,
  lerp
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
// Physics Engine for Client-Side Prediction
// ============================================================================

class PhysicsEngine {
  simulateBall(
    ball: { pos: { x: number; y: number }; direction: { x: number; y: number } },
    leftPaddle: { pos: { x: number; y: number }; hitCount: number },
    rightPaddle: { pos: { x: number; y: number }; hitCount: number },
    deltaTime: number
  ) {
    const newBall = {
      pos: createVector2(ball.pos.x, ball.pos.y),
      direction: createVector2(ball.direction.x, ball.direction.y)
    };

    // Move ball
    newBall.pos.x += newBall.direction.x * deltaTime;
    newBall.pos.y += newBall.direction.y * deltaTime;

    // Wall collisions (top and bottom)
    if (newBall.pos.y <= GAME_CONSTANTS.ball.radius) {
      newBall.pos.y = GAME_CONSTANTS.ball.radius;
      newBall.direction.y = -newBall.direction.y;
    } else if (newBall.pos.y >= GAME_CONSTANTS.arena.height - GAME_CONSTANTS.ball.radius) {
      newBall.pos.y = GAME_CONSTANTS.arena.height - GAME_CONSTANTS.ball.radius;
      newBall.direction.y = -newBall.direction.y;
    }

    // Paddle collisions
    this.checkPaddleCollision(newBall, leftPaddle, 'left');
    this.checkPaddleCollision(newBall, rightPaddle, 'right');

    return newBall;
  }

  private checkPaddleCollision(
    ball: { pos: { x: number; y: number }; direction: { x: number; y: number } },
    paddle: { pos: { x: number; y: number }; hitCount: number },
    side: 'left' | 'right'
  ): boolean {
    const paddleLeft = paddle.pos.x;
    const paddleRight = paddle.pos.x + GAME_CONSTANTS.paddle.width;
    const paddleTop = paddle.pos.y;
    const paddleBottom = paddle.pos.y + GAME_CONSTANTS.paddle.height;

    const ballLeft = ball.pos.x - GAME_CONSTANTS.ball.radius;
    const ballRight = ball.pos.x + GAME_CONSTANTS.ball.radius;
    const ballTop = ball.pos.y - GAME_CONSTANTS.ball.radius;
    const ballBottom = ball.pos.y + GAME_CONSTANTS.ball.radius;

    // Check for collision
    const collides = (
      ballRight >= paddleLeft &&
      ballLeft <= paddleRight &&
      ballBottom >= paddleTop &&
      ballTop <= paddleBottom
    );

    if (collides) {
      // Calculate bounce angle based on where ball hits paddle
      const paddleCenter = paddle.pos.y + GAME_CONSTANTS.paddle.height / 2;
      const hitPosition = ball.pos.y - paddleCenter;
      const normalizedHitPosition = hitPosition / (GAME_CONSTANTS.paddle.height / 2);

      // Clamp to reasonable bounce angles
      const bounceAngle = normalizedHitPosition * GAME_CONSTANTS.ball.maxBounceAngle * (Math.PI / 180);

      // Calculate new direction
      const speed = Math.sqrt(ball.direction.x * ball.direction.x + ball.direction.y * ball.direction.y);
      const newDirectionX = side === 'left' ? Math.abs(Math.cos(bounceAngle)) : -Math.abs(Math.cos(bounceAngle));
      const newDirectionY = Math.sin(bounceAngle);

      ball.direction.x = newDirectionX * speed;
      ball.direction.y = newDirectionY * speed;

      // Move ball out of paddle to prevent stuck collisions
      if (side === 'left') {
        ball.pos.x = paddleRight + GAME_CONSTANTS.ball.radius;
      } else {
        ball.pos.x = paddleLeft - GAME_CONSTANTS.ball.radius;
      }

      return true;
    }

    return false;
  }
}

// ============================================================================
// Input History for Rollback
// ============================================================================

class InputHistory {
  private inputs: Array<{ input: PlayerInput; timestamp: number }> = [];
  private maxHistory = 1000; // 1 second at 60 FPS

  add(input: PlayerInput): void {
    this.inputs.push({
      input: { ...input },
      timestamp: input.timestamp ?? Date.now()
    });

    // Clean old inputs
    const cutoff = Date.now() - this.maxHistory;
    this.inputs = this.inputs.filter(entry => entry.timestamp > cutoff);
  }

  getAfter(timestamp: number): PlayerInput[] {
    return this.inputs
      .filter(entry => entry.timestamp > timestamp)
      .map(entry => entry.input);
  }

  clear(): void {
    this.inputs = [];
  }
}

// ============================================================================
// Lag Compensation Engine
// ============================================================================

class LagCompensationEngine {
  private rttHistory: number[] = [];
  private jitterBuffer: number = 50; // Base jitter buffer in ms
  private adaptiveBuffer: number = 0; // Adaptive component

  updateRTT(rtt: number): void {
    this.rttHistory.push(rtt);

    // Keep only last 10 measurements
    if (this.rttHistory.length > 10) {
      this.rttHistory.shift();
    }

    // Update adaptive buffer based on network conditions
    this.updateAdaptiveBuffer();
  }

  private updateAdaptiveBuffer(): void {
    if (this.rttHistory.length < 3) return;

    const avgRTT = this.rttHistory.reduce((sum, rtt) => sum + rtt, 0) / this.rttHistory.length;
    const jitter = this.calculateJitter();

    // Adaptive buffer = 0.5 * avgRTT + 2 * jitter
    this.adaptiveBuffer = Math.min(avgRTT * 0.5 + jitter * 2, 200);
  }

  private calculateJitter(): number {
    if (this.rttHistory.length < 2) return 0;

    const avgRTT = this.rttHistory.reduce((sum, rtt) => sum + rtt, 0) / this.rttHistory.length;
    const variance = this.rttHistory.reduce((sum, rtt) => sum + Math.pow(rtt - avgRTT, 2), 0) / this.rttHistory.length;

    return Math.sqrt(variance);
  }

  getOptimalPredictionTime(currentRTT: number): number {
    // Base prediction time on current RTT + adaptive buffer
    const baseTime = currentRTT / 2; // Half RTT for one-way latency
    const adaptiveTime = this.adaptiveBuffer;

    return Math.min(baseTime + adaptiveTime, 150); // Cap at 150ms
  }

  shouldRewind(serverTimestamp: number, localTimestamp: number): boolean {
    const timeDiff = Math.abs(serverTimestamp - localTimestamp);
    const threshold = this.jitterBuffer + this.adaptiveBuffer;

    return timeDiff > threshold;
  }

  calculateRewindTime(serverTimestamp: number, localTimestamp: number): number {
    return Math.max(0, localTimestamp - serverTimestamp);
  }

  interpolateState(
    pastState: GameState,
    futureState: GameState,
    alpha: number
  ): GameState {
    return {
      ...pastState,
      ball: {
        pos: createVector2(
          lerp(pastState.ball.pos.x, futureState.ball.pos.x, alpha),
          lerp(pastState.ball.pos.y, futureState.ball.pos.y, alpha)
        ),
        direction: createVector2(
          lerp(pastState.ball.direction.x, futureState.ball.direction.x, alpha),
          lerp(pastState.ball.direction.y, futureState.ball.direction.y, alpha)
        )
      },
      leftPaddle: {
        pos: createVector2(
          pastState.leftPaddle.pos.x,
          lerp(pastState.leftPaddle.pos.y, futureState.leftPaddle.pos.y, alpha)
        ),
        hitCount: futureState.leftPaddle.hitCount
      },
      rightPaddle: {
        pos: createVector2(
          pastState.rightPaddle.pos.x,
          lerp(pastState.rightPaddle.pos.y, futureState.rightPaddle.pos.y, alpha)
        ),
        hitCount: futureState.rightPaddle.hitCount
      },
      leftScore: futureState.leftScore,
      rightScore: futureState.rightScore,
      state: futureState.state,
      lastUpdate: futureState.lastUpdate
    };
  }

  extrapolateState(currentState: GameState, deltaTime: number): GameState {
    const extrapolated = {
      ...currentState,
      ball: {
        pos: createVector2(
          currentState.ball.pos.x + currentState.ball.direction.x * deltaTime / 1000,
          currentState.ball.pos.y + currentState.ball.direction.y * deltaTime / 1000
        ),
        direction: cloneVector2(currentState.ball.direction)
      }
    };

    // Apply basic boundary checks for extrapolation
    if (extrapolated.ball.pos.y <= 10) {
      extrapolated.ball.pos.y = 10;
      extrapolated.ball.direction.y = -extrapolated.ball.direction.y;
    } else if (extrapolated.ball.pos.y >= 590) {
      extrapolated.ball.pos.y = 590;
      extrapolated.ball.direction.y = -extrapolated.ball.direction.y;
    }

    return extrapolated;
  }
}

// ============================================================================
// Main Prediction Engine
// ============================================================================

export class PredictionEngine {
  private physicsEngine: PhysicsEngine;
  private inputHistory: InputHistory;
  private predictionWindow: number = 100; // 100ms max prediction
  private lagCompensation: LagCompensationEngine;

  constructor() {
    this.physicsEngine = new PhysicsEngine();
    this.inputHistory = new InputHistory();
    this.lagCompensation = new LagCompensationEngine();
  }

  predict(currentState: GameState, input: PlayerInput, deltaTime: number): GameState {
    // Clone state to avoid modifying original
    const predictedState = this.cloneState(currentState);

    // Apply input locally and immediately
    this.applyInputToState(predictedState, input, deltaTime);

    // Simulate physics
    predictedState.ball = this.physicsEngine.simulateBall(
      predictedState.ball,
      predictedState.leftPaddle,
      predictedState.rightPaddle,
      deltaTime / 1000 // Convert to seconds
    );

    // Store input for potential rollback
    this.inputHistory.add(input);

    return predictedState;
  }

  rollback(confirmedState: GameState, timestamp: number): GameState {
    // Get all unconfirmed inputs after the confirmed timestamp
    const unconfirmedInputs = this.inputHistory.getAfter(timestamp);

    // Re-apply unconfirmed inputs to confirmed state
    let state = this.cloneState(confirmedState);

    for (const input of unconfirmedInputs) {
      const deltaTime = 16; // Assume 60 FPS
      state = this.predict(state, input, deltaTime);
    }

    return state;
  }

  private applyInputToState(state: GameState, input: PlayerInput, deltaTime: number): void {
    if (input.type === 'PADDLE_MOVE') {
      const paddle = input.playerId === 'left' ? state.leftPaddle : state.rightPaddle;
      const speed = GAME_CONSTANTS.paddle.speed;

      // Apply smooth movement with velocity-based prediction
      const targetVelocity = (input.value ?? 0) * speed;
      const currentY = paddle.pos.y;

      // Simple physics integration (could be enhanced with acceleration)
      const newY = currentY + (targetVelocity * deltaTime / 1000);

      // Clamp to arena bounds
      paddle.pos.y = clamp(
        newY,
        0,
        GAME_CONSTANTS.arena.height - GAME_CONSTANTS.paddle.height
      );
    }
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

  // Utility method for smooth interpolation
  lerp(a: number, b: number, t: number): number {
    return lerp(a, b, t);
  }

  // Clean up old input history
  clearHistory(): void {
    this.inputHistory.clear();
  }

  // ============================================================================
  // Advanced Lag Compensation Methods
  // ============================================================================

  updateNetworkMetrics(rtt: number): void {
    this.lagCompensation.updateRTT(rtt);
  }

  predictWithLagCompensation(
    currentState: GameState,
    input: PlayerInput,
    rtt: number,
    deltaTime: number
  ): GameState {
    // Calculate optimal prediction time based on network conditions
    const predictionTime = this.lagCompensation.getOptimalPredictionTime(rtt);

    // Clone and apply input
    const predictedState = this.cloneState(currentState);
    this.applyInputToState(predictedState, input, deltaTime);

    // Simulate forward by prediction time
    const steps = Math.ceil(predictionTime / 16); // 60 FPS steps
    let simulatedState = predictedState;

    for (let i = 0; i < steps; i++) {
      simulatedState = this.predict(simulatedState, input, 16);
    }

    return simulatedState;
  }

  rewindAndReplay(
    serverState: GameState,
    serverTimestamp: number,
    clientTimestamp: number
  ): GameState {
    // Check if rewind is necessary
    if (!this.lagCompensation.shouldRewind(serverTimestamp, clientTimestamp)) {
      return serverState;
    }

    // Calculate how far back to rewind
    const rewindTime = this.lagCompensation.calculateRewindTime(serverTimestamp, clientTimestamp);

    // Get inputs after the server timestamp
    const replayInputs = this.inputHistory.getAfter(serverTimestamp - rewindTime);

    // Start from server state and replay inputs
    let replayedState = this.cloneState(serverState);

    for (const input of replayInputs) {
      const deltaTime = 16; // Assume 60 FPS
      replayedState = this.predict(replayedState, input, deltaTime);
    }

    return replayedState;
  }

  interpolateStates(
    pastState: GameState,
    futureState: GameState,
    interpFactor: number
  ): GameState {
    return this.lagCompensation.interpolateState(pastState, futureState, interpFactor);
  }

  extrapolateState(currentState: GameState, deltaTime: number): GameState {
    return this.lagCompensation.extrapolateState(currentState, deltaTime);
  }

  getOptimalPredictionTime(rtt: number): number {
    return this.lagCompensation.getOptimalPredictionTime(rtt);
  }

  // Enhanced prediction with temporal consistency
  predictWithTemporal(
    currentState: GameState,
    input: PlayerInput,
    deltaTime: number,
    serverTimestamp: number,
    clientTimestamp: number
  ): GameState {
    // Standard prediction first
    let predictedState = this.predict(currentState, input, deltaTime);

    // Apply temporal smoothing if there's a significant time discrepancy
    const timeDiff = Math.abs(clientTimestamp - serverTimestamp);
    if (timeDiff > 50) { // 50ms threshold
      const smoothingFactor = Math.min(timeDiff / 200, 0.5); // Max 50% correction

      // Blend with extrapolated server state
      const extrapolatedServer = this.extrapolateState(currentState, timeDiff);
      predictedState = this.interpolateStates(predictedState, extrapolatedServer, smoothingFactor);
    }

    return predictedState;
  }
}