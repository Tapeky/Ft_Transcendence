// ============================================================================
// GameService.ts - Frontend game service with prediction and reconciliation
// ============================================================================

import {
  GameState,
  Input,
  GAME_CONSTANTS,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  Vector2
} from '../features/game/types/GameTypes';

import {
  PlayerInput,
  GameSession,
  GameMessage,
  MessageType,
  StateUpdateMessage,
  InputMessage,
  InputAckMessage,
  GameEventMessage,
  StateSnapshot,
  TimedGameState,
  Desync,
  NetworkMetrics,
  PredictionSettings,
  ConnectionState,
  OnlineGameError,
  NetworkError,
  SyncError,
  generateId,
  lerp,
  clamp,
  GameState as OnlineGameState
} from '../shared/types/OnlineGameTypes';

import { PredictionEngine } from './PredictionEngine';
import { ReconciliationEngine } from './ReconciliationEngine';
import { ConnectionManager } from './ConnectionManager';
import { GameProtocol } from './GameProtocol';
import { ChatService } from '../features/friends/services/ChatService';

// ============================================================================
// Utility functions for type conversion
// ============================================================================

function createVector2(x: number, y: number): Vector2 {
  return {
    x,
    y,
    clone(): Vector2 {
      return createVector2(this.x, this.y);
    },
    add(other: Vector2): Vector2 {
      return createVector2(this.x + other.x, this.y + other.y);
    },
    sub(other: Vector2): Vector2 {
      return createVector2(this.x - other.x, this.y - other.y);
    },
    scale(factor: number): Vector2 {
      return createVector2(this.x * factor, this.y * factor);
    },
    get length(): number {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
  };
}

function convertOnlineStateToLocal(onlineState: OnlineGameState): GameState {
  return {
    leftPaddle: {
      pos: createVector2(
        Math.round(onlineState.leftPaddle.pos.x * 100) / 100,
        Math.round(onlineState.leftPaddle.pos.y * 100) / 100
      ),
      hitCount: onlineState.leftPaddle.hitCount
    },
    rightPaddle: {
      pos: createVector2(
        Math.round(onlineState.rightPaddle.pos.x * 100) / 100,
        Math.round(onlineState.rightPaddle.pos.y * 100) / 100
      ),
      hitCount: onlineState.rightPaddle.hitCount
    },
    ball: {
      pos: createVector2(
        Math.round(onlineState.ball.pos.x * 100) / 100,
        Math.round(onlineState.ball.pos.y * 100) / 100
      ),
      direction: createVector2(onlineState.ball.direction.x, onlineState.ball.direction.y)
    },
    state: onlineState.state as any, // Cast enum conversion
    leftScore: onlineState.leftScore || 0,
    rightScore: onlineState.rightScore || 0
  };
}

function convertLocalStateToOnline(localState: GameState): OnlineGameState {
  return {
    leftPaddle: {
      pos: { x: localState.leftPaddle.pos.x, y: localState.leftPaddle.pos.y },
      hitCount: localState.leftPaddle.hitCount
    },
    rightPaddle: {
      pos: { x: localState.rightPaddle.pos.x, y: localState.rightPaddle.pos.y },
      hitCount: localState.rightPaddle.hitCount
    },
    ball: {
      pos: { x: localState.ball.pos.x, y: localState.ball.pos.y },
      direction: { x: localState.ball.direction.x, y: localState.ball.direction.y }
    },
    state: localState.state as any, // Cast enum conversion
    leftScore: localState.leftScore || 0,
    rightScore: localState.rightScore || 0
  };
}

function lerpStates(oldState: GameState, newState: GameState, factor: number): GameState {
  return {
    leftPaddle: {
      pos: createVector2(
        oldState.leftPaddle.pos.x + (newState.leftPaddle.pos.x - oldState.leftPaddle.pos.x) * factor,
        oldState.leftPaddle.pos.y + (newState.leftPaddle.pos.y - oldState.leftPaddle.pos.y) * factor
      ),
      hitCount: newState.leftPaddle.hitCount // snap hitCount
    },
    rightPaddle: {
      pos: createVector2(
        oldState.rightPaddle.pos.x + (newState.rightPaddle.pos.x - oldState.rightPaddle.pos.x) * factor,
        oldState.rightPaddle.pos.y + (newState.rightPaddle.pos.y - oldState.rightPaddle.pos.y) * factor
      ),
      hitCount: newState.rightPaddle.hitCount // snap hitCount
    },
    ball: {
      pos: createVector2(
        oldState.ball.pos.x + (newState.ball.pos.x - oldState.ball.pos.x) * factor,
        oldState.ball.pos.y + (newState.ball.pos.y - oldState.ball.pos.y) * factor
      ),
      direction: newState.ball.direction // snap direction
    },
    state: newState.state, // snap state
    leftScore: newState.leftScore, // snap scores
    rightScore: newState.rightScore
  };
}

// ============================================================================
// Input Buffer Management
// ============================================================================

class InputBuffer {
  private inputs: PlayerInput[] = [];
  private acknowledgedInputs = new Set<string>();

  constructor(private maxSize: number = 60) {}

  add(input: PlayerInput): void {
    this.inputs.push(input);
    if (this.inputs.length > this.maxSize) {
      this.inputs.shift();
    }
  }

  acknowledge(inputId: string): void {
    this.acknowledgedInputs.add(inputId);
    // Remove acknowledged inputs older than 1 second
    const cutoff = Date.now() - 1000;
    this.inputs = this.inputs.filter(input =>
      input.id && (!this.acknowledgedInputs.has(input.id) || (input.timestamp && input.timestamp > cutoff))
    );
  }

  getUnacknowledgedInputs(): PlayerInput[] {
    // Remove inputs older than cutoff to prevent memory leaks
    const cutoff = Date.now() - 5000; // 5 seconds
    return this.inputs.filter(input => 
      input.id && (!this.acknowledgedInputs.has(input.id) || (input.timestamp && input.timestamp > cutoff))
    );
  }

  clearInputsBefore(timestamp: number): void {
    this.inputs = this.inputs.filter(input => input.timestamp && input.timestamp > timestamp);
  }

  getUnacknowledged(): PlayerInput[] {
    return this.inputs.filter(input => input.id && !this.acknowledgedInputs.has(input.id));
  }

  getLastUnacknowledged(): PlayerInput | null {
    const unacknowledged = this.getUnacknowledged();
    return unacknowledged.length > 0 ? unacknowledged[unacknowledged.length - 1] : null;
  }

  getAfter(timestamp: number): PlayerInput[] {
    return this.inputs.filter(input => input.timestamp && input.timestamp > timestamp);
  }

  clear(): void {
    this.inputs = [];
    this.acknowledgedInputs.clear();
  }
}

// ============================================================================
// State Buffer for Interpolation
// ============================================================================

class StateBuffer {
  private states: TimedGameState[] = [];

  constructor(private maxSize: number = 120) {}

  add(state: TimedGameState): void {
    this.states.push(state);
    this.states.sort((a, b) => a.timestamp - b.timestamp);

    if (this.states.length > this.maxSize) {
      this.states.shift();
    }
  }

  getAt(timestamp: number): TimedGameState | null {
    if (this.states.length < 2) return null;

    // Find states before and after timestamp
    let beforeState = null;
    let afterState = null;

    for (let i = 0; i < this.states.length - 1; i++) {
      if (this.states[i].timestamp <= timestamp && this.states[i + 1].timestamp > timestamp) {
        beforeState = this.states[i];
        afterState = this.states[i + 1];
        break;
      }
    }

    if (!beforeState || !afterState) {
      return this.states[this.states.length - 1];
    }

    // Interpolate between states
    const alpha = (timestamp - beforeState.timestamp) / (afterState.timestamp - beforeState.timestamp);
    return this.interpolateStates(beforeState, afterState, alpha);
  }

  getLatest(): TimedGameState | null {
    return this.states.length > 0 ? this.states[this.states.length - 1] : null;
  }

  private interpolateStates(from: TimedGameState, to: TimedGameState, alpha: number): TimedGameState {
    const clampedAlpha = clamp(alpha, 0, 1);

    return {
      ...to,
      timestamp: lerp(from.timestamp, to.timestamp, clampedAlpha),
      interpolationAlpha: clampedAlpha,
      ball: {
        ...to.ball,
        pos: {
          x: lerp(from.ball.pos.x, to.ball.pos.x, clampedAlpha),
          y: lerp(from.ball.pos.y, to.ball.pos.y, clampedAlpha)
        }
      },
      leftPaddle: {
        ...to.leftPaddle,
        pos: {
          x: lerp(from.leftPaddle.pos.x, to.leftPaddle.pos.x, clampedAlpha),
          y: lerp(from.leftPaddle.pos.y, to.leftPaddle.pos.y, clampedAlpha)
        }
      },
      rightPaddle: {
        ...to.rightPaddle,
        pos: {
          x: lerp(from.rightPaddle.pos.x, to.rightPaddle.pos.x, clampedAlpha),
          y: lerp(from.rightPaddle.pos.y, to.rightPaddle.pos.y, clampedAlpha)
        }
      }
    };
  }

  clear(): void {
    this.states = [];
  }
}

// ============================================================================
// Main GameService Interface
// ============================================================================

export interface IGameService {
  // Mode management
  mode: 'local' | 'online';

  // Session management
  initializeSession(gameId: string, mode: 'local' | 'online'): Promise<void>;
  connectToGameServer(sessionId: string): Promise<WebSocket>;

  // State management
  currentState: GameState | null;
  stateHistory: StateSnapshot[];

  // Input handling
  sendInput(input: PlayerInput): void;
  sendReady(ready: boolean): void;
  applyPrediction(input: PlayerInput): GameState | null;
  reconcileState(serverState: GameState, timestamp: number): void;

  // Interpolation
  interpolateState(from: GameState, to: GameState, alpha: number): GameState;
  extrapolateState(state: GameState, deltaTime: number): GameState;
  getInterpolatedState(currentTime: number): GameState | null;

  // Event handling
  onStateUpdate: ((state: GameState) => void) | null;
  onGameEvent: ((event: string, data: any) => void) | null;
  onError: ((error: OnlineGameError) => void) | null;

  // Connection
  isConnected(): boolean;
  getNetworkMetrics(): NetworkMetrics;

  // Cleanup
  disconnect(): void;
  destroy(): void;
}

// ============================================================================
// GameService Implementation
// ============================================================================

export class GameService implements IGameService {
  // Mode and state
  public mode: 'local' | 'online' = 'local';
  public currentState: GameState | null = null;
  public previousState: GameState | null = null;
  public stateHistory: StateSnapshot[] = [];

  // Server authoritative mode
  private isServerAuthoritative = false;
  private playerSide: 'left' | 'right' | null = null;
  private localUpdateInterval: any = null;

  // Network components
  private ws: WebSocket | null = null;
  private connectionManager: ConnectionManager;
  private predictionEngine: PredictionEngine;
  private reconciliationEngine: ReconciliationEngine;

  // Buffers
  private inputBuffer: InputBuffer;
  private stateBuffer: StateBuffer;

  // Sequence tracking
  private inputSequence = 0;
  private messageSequence = 0;

  // Timing
  private serverTimeOffset = 0;
  private lastServerTime = 0;
  private renderDelay = 100; // 100ms delay for smooth interpolation

  // Configuration
  private predictionSettings: PredictionSettings = {
    enabled: true,
    maxPredictionTime: 100,
    reconciliationThreshold: 50,
    smoothingFactor: 0.1,
    rollbackWindow: 1000
  };

  // Event handlers
  public onStateUpdate: ((state: GameState) => void) | null = null;
  public onGameEvent: ((event: string, data: any) => void) | null = null;
  public onError: ((error: OnlineGameError) => void) | null = null;

  // Session info
  private sessionId: string | null = null;
  private playerId: string | null = null;
  private chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
    this.inputBuffer = new InputBuffer(60);
    this.stateBuffer = new StateBuffer(120);
    this.predictionEngine = new PredictionEngine();
    this.reconciliationEngine = new ReconciliationEngine();
    this.connectionManager = new ConnectionManager();

    // Enable lag compensation by default
    this.predictionSettings.lagCompensation = true;

    // Setup connection manager callbacks
    this.setupConnectionManagerCallbacks();
  }

  private setupConnectionManagerCallbacks(): void {
    // Network updates for lag compensation
    this.connectionManager.onNetworkUpdate = (rtt: number, quality: string) => {
      this.predictionEngine.updateNetworkMetrics(rtt);

      // Adjust prediction settings based on network quality
      if (quality === 'poor') {
        this.predictionSettings.maxPredictionTime = 150; // More aggressive prediction for poor networks
        this.predictionSettings.smoothingFactor = 0.05; // Smoother corrections
      } else if (quality === 'excellent') {
        this.predictionSettings.maxPredictionTime = 80; // Less prediction needed
        this.predictionSettings.smoothingFactor = 0.15; // More responsive corrections
      }
    };

    // Connection event handlers
    this.connectionManager.onConnected = () => {
      console.log('✅ Game connection established');
    };

    this.connectionManager.onDisconnected = () => {
      console.warn('🔌 Game connection lost');
      this.handleConnectionLost();
    };

    this.connectionManager.onReconnected = () => {
      console.log('🔄 Game connection restored');
    };

    this.connectionManager.onMessage = (data: ArrayBuffer) => {
      try {
        const message = GameProtocol.decode(data);
        this.handleServerMessage(message);
      } catch (error) {
        console.error('Failed to decode server message:', error);
      }
    };

    this.connectionManager.onError = (error: NetworkError) => {
      this.handleError(error);
    };
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async initializeSession(gameId: string, mode: 'local' | 'online'): Promise<void> {
    this.mode = mode;
    this.sessionId = gameId;

    if (mode === 'online') {
      // For online games, we don't initialize local state - we wait for server state
      await this.connectToGameServer(gameId);
      console.log(`🌐 Online game session ${gameId} ready - waiting for server state`);
    } else {
      this.initializeLocalGame();
    }
  }

  async connectToGameServer(sessionId: string): Promise<WebSocket> {
    try {
      if (!this.chatService.isConnected()) {
        await this.chatService.connect();
      }

      this.setupChatServiceGameListeners();

      // ✅ MODE SIMPLE : Serveur autoritaire, pas de simulation locale
      this.isServerAuthoritative = true;
      this.stopLocalSimulation(); // On stoppe tout, on ne garde que le serveur

      console.log(`🎮 Connected to game ${sessionId} - Simple server mode`);
      
      // Simuler une connexion réussie pour compatibilité
      this.ws = {} as WebSocket; // Mock object pour éviter les null checks
      this.sessionId = sessionId;
      
      console.log(`✅ Switched to simple server authoritative mode for game ${sessionId}`);
      
      return Promise.resolve(this.ws);
    } catch (error) {
      const networkError = new NetworkError(`Failed to connect to game server: ${error}`);
      this.handleError(networkError);
      throw networkError;
    }
  }

  private stopLocalSimulation(): void {
    if (this.localUpdateInterval) {
      clearInterval(this.localUpdateInterval);
      this.localUpdateInterval = null;
      console.log('🔇 Local simulation stopped');
    }
  }

  private startPaddlePrediction(): void {
    // ✅ Simulation légère uniquement pour les paddles du joueur
    this.localUpdateInterval = setInterval(() => {
      if (this.currentState && this.playerSide) {
        this.applyLocalPaddlePrediction();
      }
    }, 16); // 60fps pour la réactivité
    console.log('🎯 Paddle prediction started for local responsiveness');
  }

  private applyLocalPaddlePrediction(): void {
    // Simulation légère pour réactivité des paddles seulement
    if (!this.currentState) return;
    
    // Applique les inputs locaux immédiatement pour la réactivité
    // Le serveur restera autoritaire pour la position finale
    const paddle = this.playerSide === 'left' ? this.currentState.leftPaddle : this.currentState.rightPaddle;
    if (paddle) {
      // La prédiction locale sera écrasée par les updates du serveur
      // Mais elle donne une réactivité immédiate
      this.notifyStateUpdate(this.currentState);
    }
  }

  public getPlayerSide(): 'left' | 'right' | null {
    return this.playerSide;
  }

  private setupChatServiceGameListeners(): void {
    // Listen for game state updates from ChatService
    this.chatService.on('game_state_update', (gameState: any) => {
      this.handleChatServiceStateUpdate(gameState);
    });

    // Listen for other game events
    this.chatService.on('game_ended', (data: any) => {
      this.handleGameEnded(data);
    });

    this.chatService.on('player_disconnected', (data: any) => {
      this.handlePlayerDisconnected(data);
    });

    // Listen for ready status updates
    this.chatService.on('ready_status_update', (data: any) => {
      this.handleReadyStatusUpdate(data);
    });
  }

  private handleChatServiceStateUpdate(gameState: any): void {
    
    // Extract player side assignment if present
    if (gameState.playerSide) {
      this.playerSide = gameState.playerSide;
      console.log(`🎮 [GameService] Player side assigned: ${this.playerSide}`);

      // Notify about player side assignment for UI update
      if (this.onGameEvent) {
        this.onGameEvent('player_side_assigned', { playerSide: this.playerSide });
      }
    }
    
    // Convertir le format ChatService vers le format GameState
    const convertedState = this.convertChatServiceState(gameState);
    
    // Force server state in authoritative mode
    if (this.isServerAuthoritative) {
      this.currentState = convertedState;
      this.notifyStateUpdate(convertedState);
    } else {
      // Use prediction/reconciliation for local mode
      if (this.predictionSettings.enabled && this.currentState) {
        this.currentState = convertedState;
        this.notifyStateUpdate(convertedState);
      } else {
        this.currentState = convertedState;
        this.notifyStateUpdate(convertedState);
      }
    }
  }

  private convertChatServiceState(chatState: any): any {
    // Créer un objet Vector2 compatible
    const createVector2 = (x: number, y: number) => ({
      x, y,
      clone: () => createVector2(x, y),
      add: (v: any) => createVector2(x + v.x, y + v.y),
      sub: (v: any) => createVector2(x - v.x, y - v.y),
      scale: (s: number) => createVector2(x * s, y * s),
      length: () => Math.sqrt(x * x + y * y)
    });

    return {
      leftPaddle: {
        pos: createVector2(
          chatState.leftPaddle?.x || 20, 
          chatState.leftPaddle?.y || 300
        ),
        hitCount: chatState.leftPaddle?.hitCount || 0
      },
      rightPaddle: {
        pos: createVector2(
          chatState.rightPaddle?.x || 772, 
          chatState.rightPaddle?.y || 300
        ),
        hitCount: chatState.rightPaddle?.hitCount || 0
      },
      ball: {
        pos: createVector2(
          chatState.ball?.x || 400, 
          chatState.ball?.y || 300
        ),
        direction: createVector2(
          chatState.ball?.vx || 300, 
          chatState.ball?.vy || 0
        )
      },
      state: chatState.status || 'Running',
      leftScore: chatState.scores?.left || 0,
      rightScore: chatState.scores?.right || 0,
      lastUpdate: Date.now()
    };
  }

  private handleGameEnded(data: any): void {
    console.log('🎮 Game ended:', data);
    if (this.onGameEvent) {
      this.onGameEvent('game_ended', data);
    }
  }

  private handlePlayerDisconnected(data: any): void {
    console.log('🎮 Player disconnected:', data);
    if (this.onGameEvent) {
      this.onGameEvent('player_disconnected', data);
    }
  }

  private handleReadyStatusUpdate(data: any): void {
    console.log('🟢 [GameService] Ready status update:', data);
    if (this.onGameEvent) {
      this.onGameEvent('ready_status_update', data);
    }
  }

  private buildWebSocketUrl(sessionId: string): string {
    // Use the same logic as ApiService for consistent backend connection
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://localhost:8000';
    const wsUrl = apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    return `${wsUrl}/ws/game/${sessionId}`;
  }

  private initializeLocalGame(): void {
    this.currentState = this.createInitialState();
    this.mode = 'local';
  }

  private createInitialState(): GameState {
    return {
      leftPaddle: {
        pos: createVector2(20, GAME_CONSTANTS.arena.height / 2),
        hitCount: 0
      },
      rightPaddle: {
        pos: createVector2(GAME_CONSTANTS.arena.width - 28, GAME_CONSTANTS.arena.height / 2),
        hitCount: 0
      },
      ball: {
        pos: createVector2(GAME_CONSTANTS.arena.width / 2, GAME_CONSTANTS.arena.height / 2),
        direction: createVector2(GAME_CONSTANTS.ball.speed, 0)
      },
      state: 0 as any, // PongState.WAITING cast as any for type compatibility
      leftScore: 0,
      rightScore: 0
    };
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  private handleServerMessage(message: GameMessage): void {
    this.updateServerTime(message.timestamp);

    switch (message.type) {
      case MessageType.STATE_UPDATE:
        this.handleStateUpdate(message as StateUpdateMessage);
        break;

      case MessageType.INPUT_ACK:
        this.handleInputAck(message as InputAckMessage);
        break;

      case MessageType.GAME_EVENT:
        this.handleGameEvent(message as GameEventMessage);
        break;

      case MessageType.ERROR:
        this.handleServerError(message);
        break;

      default:
        console.warn('Unhandled message type:', message.type);
    }
  }

  private handleStateUpdate(message: StateUpdateMessage): void {
    const { gameState, serverTime, acknowledgedInput } = message.payload;

    // Add server state to buffer
    const timedState: TimedGameState = {
      ...gameState,
      timestamp: serverTime,
      serverTime: serverTime,
      frame: 0 // Add default frame number
    };

    this.stateBuffer.add(timedState);

    // Acknowledge input if provided
    if (acknowledgedInput) {
      this.inputBuffer.acknowledge(acknowledgedInput);
    }

    // Perform reconciliation if prediction is enabled
    if (this.predictionSettings.enabled && this.currentState) {
      const localState = convertOnlineStateToLocal(gameState);
      this.reconcileState(localState, serverTime);
    } else {
      // Direct state update without prediction
      const localState = convertOnlineStateToLocal(gameState);
      this.currentState = localState;
      this.notifyStateUpdate(localState);
    }
  }

  private handleInputAck(message: InputAckMessage): void {
    const { inputId } = message.payload;
    this.inputBuffer.acknowledge(inputId);
  }

  private handleGameEvent(message: GameEventMessage): void {
    const { event, data } = message.payload;

    if (this.onGameEvent) {
      this.onGameEvent(event, data);
    }
  }

  private handleServerError(message: GameMessage): void {
    const error = new OnlineGameError(
      message.payload.message || 'Server error',
      message.payload.code || 'UNKNOWN_ERROR',
      this.sessionId || undefined
    );
    this.handleError(error);
  }

  private handleConnectionLost(): void {
    // Attempt reconnection
    this.connectionManager.handleDisconnection();
  }

  // ============================================================================
  // Input Handling
  // ============================================================================

  sendInput(input: PlayerInput): void {
    console.log(`🎮 [GAMESERVICE SIMPLE] sendInput called:`, input);
    
    if (this.mode === 'local') {
      console.log(`🎮 [GAMESERVICE SIMPLE] Local mode - calling handleLocalInput`);
      this.handleLocalInput(input);
      return;
    }

    console.log(`🎮 [GAMESERVICE SIMPLE] Online mode - direct server send`);
    
    // ✅ SIMPLICITÉ MAXIMALE : Envoi direct au serveur sans prédiction ni buffer
    this.sendInputToServer(input);
    console.log(`🎮 [GAMESERVICE SIMPLE] Direct send completed`);
  }

  sendReady(ready: boolean): void {
    if (!this.sessionId) {
      console.warn('Cannot send ready status - no active session');
      return;
    }

    // For local games, we don't need ready check
    if (this.mode === 'local') {
      console.log('Local game - skipping ready check');
      return;
    }

    // Send ready status through ChatService
    try {
      // Parse gameId from sessionId if it contains it, otherwise use a default
      const gameId = parseInt(this.sessionId) || 0;
      this.chatService.sendPlayerReady(gameId, ready);
      console.log(`🎮 [GameService] Sent ready status: ${ready} for session ${this.sessionId}`);
    } catch (error) {
      console.error('Failed to send ready status:', error);
    }
  }

  private handleLocalInput(input: PlayerInput): void {
    if (!this.currentState) return;

    // Apply input directly to local state
    this.applyInputToState(this.currentState, input);
    this.notifyStateUpdate(this.currentState);
  }

  private sendInputToServer(input: PlayerInput): void {
    console.log(`🎮 [SERVER SIMPLE] sendInputToServer:`, { key: input.key, pressed: input.pressed });
    
    if (!this.chatService.isConnected()) {
      console.error('🎮 [SERVER SIMPLE] ChatService not connected!');
      return;
    }

    // ✅ CONVERSION SIMPLE ET DIRECTE
    const convertedInput = {
      up: (input.key === 'w' || input.key === 'arrowup') && input.pressed,
      down: (input.key === 's' || input.key === 'arrowdown') && input.pressed
    };

    console.log(`🎮 [SERVER SIMPLE] Sending:`, convertedInput);
    this.chatService.sendGameInput(convertedInput);
    console.log(`🎮 [SERVER SIMPLE] ✅ Sent to ChatService`);
  }

  public sendGameInput(input: { up: boolean; down: boolean }): void {
    const playerSide = this.getPlayerSide();
    if (!playerSide) {
      console.warn('No side assigned, ignoring input');
      return;
    }

    // Only send input if we have actual movement
    if (!input.up && !input.down) {
      return;
    }

    // Route input par side - envoie seulement ton input
    console.log(`⌨️ Input Sent [Side=${playerSide}]: Up=${input.up}, Down=${input.down}`);

    const playerInput: PlayerInput = {
      key: input.up ? (playerSide === 'left' ? 'w' : 'arrowup') : (playerSide === 'left' ? 's' : 'arrowdown'),
      pressed: true,
      player: playerSide,
      timestamp: Date.now()
    };
    this.sendInputToServer(playerInput);
  }

  // ============================================================================
  // Prediction and Reconciliation
  // ============================================================================

  applyPrediction(input: PlayerInput): GameState | null {
    if (!this.currentState) return null;

    // Get current network metrics for adaptive prediction
    const networkMetrics = this.getNetworkMetrics();
    const currentRTT = networkMetrics.rtt || 50; // Default 50ms if no data

    // Update prediction engine with network metrics
    this.predictionEngine.updateNetworkMetrics(currentRTT);

    // Use enhanced prediction with lag compensation
    if (this.predictionSettings.lagCompensation) {
      return this.predictionEngine.predictWithLagCompensation(
        this.currentState,
        input,
        currentRTT,
        16 // 60 FPS deltaTime
      );
    }

    // Fallback to standard prediction
    return this.predictionEngine.predict(
      this.currentState,
      input,
      16
    );
  }

  reconcileState(serverState: GameState, timestamp: number): void {
    if (!this.currentState) {
      this.currentState = serverState;
      this.notifyStateUpdate(serverState);
      return;
    }

    const currentTime = this.getServerTime();

    // Try advanced lag compensation first if enabled
    if (this.predictionSettings.lagCompensation) {
      // Use rewind and replay for significant time discrepancies
      const timeDiff = Math.abs(currentTime - timestamp);
      if (timeDiff > 100) { // 100ms threshold for rewind
        const replayedState = this.predictionEngine.rewindAndReplay(
          serverState,
          timestamp,
          currentTime
        );
        this.currentState = replayedState;
        this.notifyStateUpdate(replayedState);
        return;
      }

      // Use temporal prediction for smaller discrepancies
      if (timeDiff > 25) { // 25ms threshold for temporal adjustment
        const lastInput = this.inputBuffer.getLastUnacknowledged();
        if (lastInput) {
          const temporalState = this.predictionEngine.predictWithTemporal(
            this.currentState,
            lastInput,
            16, // deltaTime
            timestamp,
            currentTime
          );
          this.currentState = temporalState;
          this.notifyStateUpdate(temporalState);
          return;
        }
      }
    }

    // Fallback to standard reconciliation
    const reconciledState = this.reconciliationEngine.reconcile(
      this.currentState,
      serverState,
      timestamp
    );

    this.currentState = reconciledState;
    this.notifyStateUpdate(reconciledState);
  }

  private applyInputToState(state: GameState, input: PlayerInput): void {
    // Apply input based on player side
    if (input.type === 'PADDLE_MOVE') {
      const paddle = input.playerId === 'left' ? state.leftPaddle : state.rightPaddle;
      const speed = GAME_CONSTANTS.paddle.speed;

      // Smooth paddle movement
      const inputValue = input.value ?? 0; // Default to 0 if undefined
      const targetY = paddle.pos.y + (inputValue * speed * 0.016); // 60 FPS
      paddle.pos.y = clamp(targetY, 0, GAME_CONSTANTS.arena.height - GAME_CONSTANTS.paddle.height);
    }
  }

  // ============================================================================
  // Interpolation and Extrapolation
  // ============================================================================

  interpolateState(from: GameState, to: GameState, alpha: number): GameState {
    const clampedAlpha = clamp(alpha, 0, 1);

    return {
      ...to,
      ball: {
        ...to.ball,
        pos: createVector2(
          lerp(from.ball.pos.x, to.ball.pos.x, clampedAlpha),
          lerp(from.ball.pos.y, to.ball.pos.y, clampedAlpha)
        )
      },
      leftPaddle: {
        ...to.leftPaddle,
        pos: createVector2(
          lerp(from.leftPaddle.pos.x, to.leftPaddle.pos.x, clampedAlpha),
          lerp(from.leftPaddle.pos.y, to.leftPaddle.pos.y, clampedAlpha)
        )
      },
      rightPaddle: {
        ...to.rightPaddle,
        pos: createVector2(
          lerp(from.rightPaddle.pos.x, to.rightPaddle.pos.x, clampedAlpha),
          lerp(from.rightPaddle.pos.y, to.rightPaddle.pos.y, clampedAlpha)
        )
      }
    };
  }

  extrapolateState(state: GameState, deltaTime: number): GameState {
    const extrapolated = { ...state };

    // Extrapolate ball position
    extrapolated.ball = {
      ...state.ball,
      pos: createVector2(
        state.ball.pos.x + (state.ball.direction.x * deltaTime),
        state.ball.pos.y + (state.ball.direction.y * deltaTime)
      )
    };

    return extrapolated;
  }

  getInterpolatedState(currentTime: number): GameState | null {
    if (this.mode === 'local') {
      return this.currentState;
    }

    // Calculate render time (current time minus render delay)
    const renderTime = currentTime - this.renderDelay;

    // Get interpolated state from buffer
    const interpolatedState = this.stateBuffer.getAt(renderTime);

    // Convert TimedGameState to GameState if needed
    if (interpolatedState && 'timestamp' in interpolatedState) {
      return convertOnlineStateToLocal(interpolatedState as OnlineGameState);
    }

    return (interpolatedState as unknown as GameState) || this.currentState;
  }

  // ============================================================================
  // Time Synchronization
  // ============================================================================

  private updateServerTime(serverTime: number): void {
    const clientTime = Date.now();
    this.serverTimeOffset = serverTime - clientTime;
    this.lastServerTime = serverTime;
  }

  private getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  // ============================================================================
  // Network Loop
  // ============================================================================

  private startNetworkLoop(): void {
    // Send periodic ping messages for latency measurement
    setInterval(() => {
      this.sendPing();
    }, 1000);
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: GameMessage = {
      id: generateId(),
      type: MessageType.PING,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: { clientTime: Date.now() }
    };

    const encoded = GameProtocol.encode(message);
    this.ws.send(encoded);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getNetworkMetrics(): NetworkMetrics {
    // This would be implemented with actual network measurements
    return {
      rtt: 50,
      jitter: 5,
      packetLoss: 0.01,
      bandwidth: 1000000,
      quality: 'good'
    };
  }

  private notifyStateUpdate(state: GameState): void {
    // Apply simple lerp for smooth rendering
    if (this.previousState) {
      this.currentState = lerpStates(this.previousState, state, 0.2);
    } else {
      this.currentState = state;
    }
    this.previousState = { ...this.currentState }; // clone

    if (this.onStateUpdate) {
      this.onStateUpdate(this.currentState);
    }
  }

  private handleError(error: OnlineGameError): void {
    console.error('GameService error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  disconnect(): void {
    // Use ChatService to properly leave the game instead of directly closing WebSocket
    if (this.chatService) {
      this.chatService.leaveGame();
    }
    
    // Clear the mock WebSocket reference
    this.ws = null;

    this.connectionManager.disconnect();
  }

  destroy(): void {
    this.disconnect();

    // Clear buffers
    this.inputBuffer.clear();
    this.stateBuffer.clear();
    this.stateHistory = [];

    // Reset state
    this.currentState = null;
    this.sessionId = null;
    this.playerId = null;

    // Clear event handlers
    this.onStateUpdate = null;
    this.onGameEvent = null;
    this.onError = null;
  }
}