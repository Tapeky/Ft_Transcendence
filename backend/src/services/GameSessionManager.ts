// ============================================================================
// GameSessionManager.ts - Server-side game session management with prediction
// ============================================================================

import { Pong, PongState } from "../game/Pong";
import { Input } from "../game/Input";

// Import shared types
interface GameOptions {
  mode: 'competitive' | 'casual' | 'ranked';
  scoreLimit: number;
  timeLimit?: number;
  difficulty: 'easy' | 'normal' | 'hard';
  rules: {
    ballSpeedIncrease: boolean;
    paddleSize: 'small' | 'normal' | 'large';
    bounceAngle: number;
  };
}

interface GamePlayer {
  id: string;
  username: string;
  avatar?: string;
  side: 'left' | 'right';
  score: number;
  connected: boolean;
  ready: boolean;
  lastPing: number;
  inputLatency: number;
  socket?: any; // WebSocket connection
}

interface GameSession {
  id: string;
  players: [GamePlayer, GamePlayer];
  state: 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
  options: GameOptions;
  gameState: any; // Pong game state
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  winner?: 'left' | 'right' | 'draw';
  spectators: string[];
}

interface PlayerInput {
  id: string;
  playerId: string;
  timestamp: number;
  sequenceNumber: number;
  value: number;
  type: 'PADDLE_MOVE' | 'PADDLE_STOP';
  up: boolean;
  down: boolean;
}

interface StateHistory {
  states: Array<{ state: any; timestamp: number; sequence: number }>;
  maxSize: number;
}

// ============================================================================
// Input Validation and Anti-Cheat
// ============================================================================

class InputValidator {
  private lastValidInputs = new Map<string, { timestamp: number; value: number }>();
  private inputRates = new Map<string, number[]>();

  validateInput(sessionId: string, playerId: string, input: PlayerInput): boolean {
    // Check temporal validity (not too old)
    const now = Date.now();
    if (now - input.timestamp > 1000) {
      console.warn(`Input too old: ${now - input.timestamp}ms`);
      return false;
    }

    // Check if timestamp is not in the future
    if (input.timestamp > now + 100) {
      console.warn(`Input from future: ${input.timestamp - now}ms`);
      return false;
    }

    // Check input value bounds
    if (Math.abs(input.value) > 1) {
      console.warn(`Input value out of bounds: ${input.value}`);
      return false;
    }

    // Check input rate limiting (max 120 inputs per second)
    if (!this.checkInputRate(playerId, input.timestamp)) {
      console.warn(`Input rate limit exceeded for player ${playerId}`);
      return false;
    }

    // Check for teleportation (sudden large changes)
    const lastInput = this.lastValidInputs.get(playerId);
    if (lastInput) {
      const timeDelta = input.timestamp - lastInput.timestamp;
      const valueDelta = Math.abs(input.value - lastInput.value);

      // Maximum change per millisecond (prevents teleportation)
      const maxChangePerMs = 0.01;
      if (timeDelta > 0 && valueDelta / timeDelta > maxChangePerMs) {
        console.warn(`Suspicious input change: ${valueDelta} in ${timeDelta}ms`);
        return false;
      }
    }

    // Store valid input for future validation
    this.lastValidInputs.set(playerId, {
      timestamp: input.timestamp,
      value: input.value
    });

    return true;
  }

  private checkInputRate(playerId: string, timestamp: number): boolean {
    const rates = this.inputRates.get(playerId) || [];

    // Remove inputs older than 1 second
    const cutoff = timestamp - 1000;
    const recentInputs = rates.filter(t => t > cutoff);

    // Add current input
    recentInputs.push(timestamp);

    // Check rate limit (120 inputs per second)
    if (recentInputs.length > 120) {
      this.inputRates.set(playerId, recentInputs.slice(-120));
      return false;
    }

    this.inputRates.set(playerId, recentInputs);
    return true;
  }

  clearPlayerData(playerId: string): void {
    this.lastValidInputs.delete(playerId);
    this.inputRates.delete(playerId);
  }
}

// ============================================================================
// State History Management
// ============================================================================

class StateHistoryManager {
  private history: StateHistory;

  constructor(maxSize: number = 1000) {
    this.history = {
      states: [],
      maxSize
    };
  }

  add(state: any, timestamp: number, sequence: number): void {
    this.history.states.push({ state: this.cloneState(state), timestamp, sequence });

    if (this.history.states.length > this.history.maxSize) {
      this.history.states.shift();
    }
  }

  getStateAt(timestamp: number): any {
    // Find state closest to timestamp
    let closest = null;
    let minDiff = Infinity;

    for (const entry of this.history.states) {
      const diff = Math.abs(entry.timestamp - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry.state;
      }
    }

    return closest;
  }

  getLatest(): any {
    if (this.history.states.length === 0) return null;
    return this.history.states[this.history.states.length - 1].state;
  }

  clear(): void {
    this.history.states = [];
  }

  private cloneState(state: any): any {
    return JSON.parse(JSON.stringify(state));
  }
}

// ============================================================================
// Server Game Engine with Lag Compensation
// ============================================================================

class ServerGameEngine {
  private pong: Pong;
  private lastUpdateTime: number;
  private accumulator: number = 0;
  private fixedTimeStep: number = 1000 / 60; // 60 FPS

  constructor(private session: GameSession) {
    this.pong = new Pong();
    this.lastUpdateTime = Date.now();
    this.session.gameState = this.pong.repr();
  }

  step(currentTime: number): any {
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedTimeStep) {
      this.updatePhysics(this.fixedTimeStep / 1000); // Convert to seconds
      this.accumulator -= this.fixedTimeStep;
    }

    return this.pong.repr();
  }

  applyInput(playerId: string, input: PlayerInput): void {
    // Convert PlayerInput to backend Input format
    const backendInput = new Input();
    backendInput.up = input.up || input.value > 0.1;
    backendInput.down = input.down || input.value < -0.1;

    // Apply input based on player side
    const player = this.session.players.find(p => p.id === playerId);
    if (!player) return;

    if (player.side === 'left') {
      this.applyInputWithLagCompensation(backendInput, null, input.timestamp);
    } else {
      this.applyInputWithLagCompensation(null, backendInput, input.timestamp);
    }
  }

  private applyInputWithLagCompensation(
    leftInput: Input | null,
    rightInput: Input | null,
    inputTimestamp: number
  ): void {
    // For now, apply input directly
    // In a more advanced system, we would:
    // 1. Rollback to the state at inputTimestamp
    // 2. Apply the input
    // 3. Re-simulate forward to current time

    const currentLeftInput = leftInput || new Input();
    const currentRightInput = rightInput || new Input();

    // Apply one frame of physics with the input
    this.pong.update(this.fixedTimeStep / 1000, currentLeftInput, currentRightInput);
  }

  private updatePhysics(deltaTime: number): void {
    // Get current player inputs (from last applied inputs)
    const leftInput = new Input(); // Would get from player state
    const rightInput = new Input(); // Would get from player state

    this.pong.update(deltaTime, leftInput, rightInput);

    // Update session game state
    this.session.gameState = this.pong.repr();

    // Check for game end
    if (this.pong.state !== PongState.Running) {
      this.session.state = 'finished';
      this.session.endedAt = new Date();

      if (this.pong.state === PongState.LeftWins) {
        this.session.winner = 'left';
      } else if (this.pong.state === PongState.RightWins) {
        this.session.winner = 'right';
      }
    }
  }

  getGameState(): any {
    return this.pong.repr();
  }

  getPong(): Pong {
    return this.pong;
  }
}

// ============================================================================
// Main Game Session Manager Interface
// ============================================================================

export interface IGameSessionManager {
  createSession(player1Id: string, player2Id: string, options: GameOptions): GameSession;
  getSession(sessionId: string): GameSession | null;
  updateSession(sessionId: string, update: Partial<GameSession>): void;
  endSession(sessionId: string, result: any): void;

  addPlayer(sessionId: string, playerId: string): void;
  removePlayer(sessionId: string, playerId: string): void;
  setPlayerReady(sessionId: string, playerId: string, ready: boolean): void;

  getGameState(sessionId: string): any;
  updateGameState(sessionId: string, state: any): void;

  processInput(sessionId: string, playerId: string, input: PlayerInput): void;
  broadcastState(sessionId: string, state: any): void;
}

// ============================================================================
// Main Game Session Manager Implementation
// ============================================================================

export class GameSessionManager implements IGameSessionManager {
  private sessions = new Map<string, GameSession>();
  private gameEngines = new Map<string, ServerGameEngine>();
  private stateHistory = new Map<string, StateHistoryManager>();
  private inputValidator = new InputValidator();
  private updateInterval: NodeJS.Timeout | null = null;
  private sequenceCounter = 0;

  constructor() {
    this.startGameLoop();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  createSession(player1Id: string, player2Id: string, options: GameOptions): GameSession {
    const sessionId = this.generateSessionId();

    const session: GameSession = {
      id: sessionId,
      players: [
        {
          id: player1Id,
          username: `Player1_${player1Id.substring(0, 8)}`,
          side: 'left',
          score: 0,
          connected: false,
          ready: false,
          lastPing: Date.now(),
          inputLatency: 50
        },
        {
          id: player2Id,
          username: `Player2_${player2Id.substring(0, 8)}`,
          side: 'right',
          score: 0,
          connected: false,
          ready: false,
          lastPing: Date.now(),
          inputLatency: 50
        }
      ],
      state: 'waiting',
      options,
      gameState: null,
      createdAt: new Date(),
      spectators: []
    };

    // Create game engine
    const engine = new ServerGameEngine(session);

    // Initialize state history
    const stateHistory = new StateHistoryManager(1000);
    stateHistory.add(session.gameState, Date.now(), this.sequenceCounter++);

    this.sessions.set(sessionId, session);
    this.gameEngines.set(sessionId, engine);
    this.stateHistory.set(sessionId, stateHistory);

    console.log(`🎮 Created game session ${sessionId} with players ${player1Id} vs ${player2Id}`);
    return session;
  }

  getSession(sessionId: string): GameSession | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId: string, update: Partial<GameSession>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, update);
  }

  endSession(sessionId: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'finished';
    session.endedAt = new Date();
    session.winner = result.winner;

    // Clean up
    this.gameEngines.delete(sessionId);
    this.stateHistory.delete(sessionId);

    // Clean up input validator data
    for (const player of session.players) {
      this.inputValidator.clearPlayerData(player.id);
    }

    // Keep session for a while for history
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 300000); // 5 minutes

    console.log(`🏁 Ended game session ${sessionId} - Winner: ${result.winner}`);
  }

  // ============================================================================
  // Player Management
  // ============================================================================

  addPlayer(sessionId: string, playerId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (player) {
      player.connected = true;
      player.lastPing = Date.now();
      console.log(`👤 Player ${playerId} connected to session ${sessionId}`);

      // Check if both players are connected and ready to start countdown
      this.checkReadyState(sessionId);
    }
  }

  // ============================================================================
  // Ready Check System
  // ============================================================================

  setPlayerReady(sessionId: string, playerId: string, ready: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Only allow ready changes in waiting state
    if (session.state !== 'waiting') {
      console.warn(`Cannot set ready - session ${sessionId} state is ${session.state}`);
      return;
    }

    const player = session.players.find(p => p.id === playerId);
    if (!player || !player.connected) {
      console.warn(`Player ${playerId} not found or disconnected in session ${sessionId}`);
      return;
    }

    const wasReady = player.ready;
    player.ready = ready;

    console.log(`🎮 Player ${playerId} ready state: ${ready} in session ${sessionId}`);

    // Broadcast ready update to all players
    this.broadcastReadyUpdate(sessionId);

    // Check if we can start countdown
    if (ready && !wasReady) {
      this.checkReadyState(sessionId);
    }
  }

  private checkReadyState(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'waiting') return;

    const connectedPlayers = session.players.filter(p => p.connected);
    const readyPlayers = session.players.filter(p => p.connected && p.ready);

    // Need exactly 2 connected players, both ready
    if (connectedPlayers.length === 2 && readyPlayers.length === 2) {
      this.startCountdown(sessionId);
    }
  }

  private startCountdown(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'countdown';
    console.log(`⏱️  Starting countdown for session ${sessionId}`);

    // Broadcast countdown start
    this.broadcastCountdownStart(sessionId);

    // Start 3-second countdown
    setTimeout(() => {
      this.startGame(sessionId);
    }, 3000);
  }

  private startGame(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'countdown') return;

    // Verify both players are still connected and ready
    const connectedPlayers = session.players.filter(p => p.connected);
    if (connectedPlayers.length < 2) {
      console.warn(`Cannot start game - insufficient players in session ${sessionId}`);
      session.state = 'waiting';
      // Reset all ready states
      session.players.forEach(p => p.ready = false);
      this.broadcastReadyUpdate(sessionId);
      return;
    }

    session.state = 'playing';
    session.startedAt = new Date();
    console.log(`🚀 Started game in session ${sessionId}`);

    // Broadcast game start
    this.broadcastGameStart(sessionId);
  }

  private broadcastReadyUpdate(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = {
      type: 'READY_UPDATE',
      timestamp: Date.now(),
      payload: {
        sessionId,
        leftReady: session.players.find(p => p.side === 'left')?.ready || false,
        rightReady: session.players.find(p => p.side === 'right')?.ready || false,
        sessionState: session.state
      }
    };

    this.broadcastToSession(sessionId, message);
  }

  private broadcastCountdownStart(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = {
      type: 'COUNTDOWN_START',
      timestamp: Date.now(),
      payload: {
        sessionId,
        countdownDuration: 3000 // 3 seconds
      }
    };

    this.broadcastToSession(sessionId, message);
  }

  private broadcastGameStart(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const engine = this.gameEngines.get(sessionId);
    const gameState = engine?.getGameState();

    const message = {
      type: 'GAME_START',
      timestamp: Date.now(),
      payload: {
        sessionId,
        gameState,
        serverTime: Date.now()
      }
    };

    this.broadcastToSession(sessionId, message);
  }

  private broadcastToSession(sessionId: string, message: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Send to all connected players
    for (const player of session.players) {
      if (player.connected && player.socket) {
        try {
          player.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to player ${player.id}:`, error);
          player.connected = false;
        }
      }
    }
  }

  removePlayer(sessionId: string, playerId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      player.ready = false; // Reset ready state on disconnect
      console.log(`👤 Player ${playerId} disconnected from session ${sessionId}`);

      // If game is in progress, pause it
      if (session.state === 'playing') {
        session.state = 'paused';
      }
      // If in countdown or waiting, reset to waiting and broadcast ready update
      else if (session.state === 'countdown' || session.state === 'waiting') {
        session.state = 'waiting';
        // Reset all ready states when someone disconnects during ready check
        session.players.forEach(p => p.ready = false);
        this.broadcastReadyUpdate(sessionId);
      }
    }
  }

  // ============================================================================
  // Game State Management
  // ============================================================================

  getGameState(sessionId: string): any {
    const engine = this.gameEngines.get(sessionId);
    return engine ? engine.getGameState() : null;
  }

  updateGameState(sessionId: string, state: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.gameState = state;

    // Add to history
    const history = this.stateHistory.get(sessionId);
    if (history) {
      history.add(state, Date.now(), this.sequenceCounter++);
    }
  }

  // ============================================================================
  // Input Processing with Validation
  // ============================================================================

  processInput(sessionId: string, playerId: string, input: PlayerInput): void {
    const engine = this.gameEngines.get(sessionId);
    const session = this.sessions.get(sessionId);

    if (!engine || !session) {
      console.warn(`Session ${sessionId} not found for input processing`);
      return;
    }

    // Only process inputs during active gameplay
    if (session.state !== 'playing') {
      return;
    }

    // Validate input
    if (!this.inputValidator.validateInput(sessionId, playerId, input)) {
      this.sendInputRejection(playerId, input.id);
      return;
    }

    // Apply input to game engine
    engine.applyInput(playerId, input);

    // Send acknowledgment
    this.sendInputAcknowledgment(sessionId, playerId, input.id);

    // Update and broadcast state
    const newState = engine.step(Date.now());
    this.updateGameState(sessionId, newState);
    this.broadcastState(sessionId, newState);
  }

  private sendInputRejection(playerId: string, inputId: string): void {
    // This would send a rejection message to the player
    console.warn(`Rejected input ${inputId} from player ${playerId}`);
  }

  private sendInputAcknowledgment(sessionId: string, playerId: string, inputId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.id === playerId);
    if (!player || !player.socket) return;

    const ackMessage = {
      type: 'INPUT_ACK',
      payload: {
        inputId,
        serverTime: Date.now()
      }
    };

    try {
      player.socket.send(JSON.stringify(ackMessage));
    } catch (error) {
      console.error(`Failed to send input ack to player ${playerId}:`, error);
    }
  }

  // ============================================================================
  // State Broadcasting
  // ============================================================================

  broadcastState(sessionId: string, state: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = {
      type: 'STATE_UPDATE',
      timestamp: Date.now(),
      sequence: this.sequenceCounter++,
      payload: {
        gameState: state,
        serverTime: Date.now()
      }
    };

    // Send to all connected players
    for (const player of session.players) {
      if (player.connected && player.socket) {
        try {
          player.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send state to player ${player.id}:`, error);
          player.connected = false;
        }
      }
    }

    // Send to spectators
    for (const spectatorId of session.spectators) {
      // Spectator broadcasting would be implemented here
    }
  }

  // ============================================================================
  // Game Loop
  // ============================================================================

  private startGameLoop(): void {
    const TARGET_FPS = 60;
    const FRAME_TIME = 1000 / TARGET_FPS;

    this.updateInterval = setInterval(() => {
      const currentTime = Date.now();

      for (const [sessionId, engine] of this.gameEngines) {
        const session = this.sessions.get(sessionId);
        if (!session || session.state !== 'playing') continue;

        // Update game state
        const newState = engine.step(currentTime);

        // Check for disconnected players
        const connectedPlayers = session.players.filter(p => p.connected);
        if (connectedPlayers.length < 2) {
          // Pause game if player disconnected
          if (session.state === 'playing') {
            session.state = 'paused';
          }
          continue;
        }

        // Update session state
        this.updateGameState(sessionId, newState);

        // Broadcast to clients
        this.broadcastState(sessionId, newState);

        // Check for game end
        if (session.state === 'finished') {
          this.handleGameEnd(sessionId, session);
        }
      }
    }, FRAME_TIME);
  }

  private handleGameEnd(sessionId: string, session: GameSession): void {
    const message = {
      type: 'GAME_END',
      timestamp: Date.now(),
      payload: {
        sessionId,
        winner: session.winner,
        finalScore: {
          left: session.players[0].score,
          right: session.players[1].score
        },
        gameState: session.gameState
      }
    };

    // Send to all players
    for (const player of session.players) {
      if (player.socket) {
        try {
          player.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send game end to player ${player.id}:`, error);
        }
      }
    }

    // Schedule session cleanup
    setTimeout(() => {
      this.endSession(sessionId, { winner: session.winner });
    }, 5000); // 5 second delay
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): GameSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.state === 'playing' || session.state === 'countdown'
    );
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  // Update player socket for reconnection
  updatePlayerSocket(sessionId: string, playerId: string, socket: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const player = session.players.find(p => p.id === playerId);
    if (!player) return false;

    player.socket = socket;
    player.connected = true;
    player.lastPing = Date.now();

    console.log(`🔄 Updated socket for player ${playerId} in session ${sessionId}`);
    return true;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.sessions.clear();
    this.gameEngines.clear();
    this.stateHistory.clear();
  }
}