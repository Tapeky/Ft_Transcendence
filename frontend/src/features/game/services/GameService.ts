import { GameState, Input } from '../types/GameTypes';
import { router } from '../../../core/app/Router';

// Game-specific WebSocket message interfaces
export interface GameStartMessage {
  type: 'start_game';
  opponentId: number;
}

export interface GameInputMessage {
  type: 'update_input';
  input: Input;
}

export interface GameUpdateMessage {
  type: 'game_update';
  data: GameState;
}

export interface GameSuccessMessage {
  type: 'success';
  data: { gameId: number };
}

export interface GameErrorMessage {
  type: 'error' | 'err_game_not_found' | 'err_player_not_in_game' | 'err_game_already_ended' | 'err_invalid_input';
  message: string;
}

export type GameWebSocketMessage = 
  | GameStartMessage 
  | GameInputMessage 
  | GameUpdateMessage 
  | GameSuccessMessage 
  | GameErrorMessage;

interface GameStartedMessage {
  type: 'game_started';
  data: {
    gameId: number;
    opponent: { id: number; username: string; avatar: string };
    playerSide: 'left' | 'right';
  };
}

interface GameEndedMessage {
  type: 'game_ended';
  data: any;
}

type GameEventListener<T = any> = (data: T) => void;

export interface GameServiceState {
  currentGameId: number | null;
  gameState: GameState | null;
  isInGame: boolean;
}

export class GameService {
  private static instance: GameService;
  private currentGameId: number | null = null;
  private gameState: GameState | null = null;
  private isInGame = false;
  private listeners: Map<string, GameEventListener[]> = new Map();
  private ws: WebSocket | null = null;

  private constructor() {}

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  // ============ WebSocket Integration ============

  setWebSocket(ws: WebSocket | null): void {
    this.ws = ws;
  }

  private validateWebSocketConnection(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
  }

  // ============ Game Message Handlers ============

  handleGameSuccess(data: GameSuccessMessage): void {
    this.currentGameId = data.data.gameId;
    this.isInGame = true;
    
    this.emit('game_joined', { gameId: this.currentGameId });
  }

  handleGameUpdate(data: GameUpdateMessage): void {
    if (!this.isInGame || !this.currentGameId) {
      console.warn('GameService: Received game update but not in game');
      return;
    }
    
    this.gameState = data.data;
    this.emit('game_state_update', this.gameState);
  }

  handleGameStarted(data: GameStartedMessage): void {
    const { gameId, opponent, playerSide } = data.data;
    
    this.currentGameId = gameId;
    this.isInGame = true;
    
    this.emit('game_started', {
      gameId,
      opponent,
      playerSide
    });
    
    this.navigateToGame(gameId);
  }

  private async navigateToGame(gameId: number): Promise<void> {
    try {
      await router.navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('GameService: Failed to navigate to game:', error);
      this.emit('game_navigation_error', { error, gameId });
    }
  }

  handleGameEnded(data: GameEndedMessage): void {
    this.emit('game_ended', data.data);
    this.cleanupGameState();
  }

  handleGameError(type: string, message: string): void {
    console.error('GameService: Game error:', message);
    this.emit('game_error', { type, message });
  }

  private cleanupGameState(): void {
    this.currentGameId = null;
    this.gameState = null;
    this.isInGame = false;
  }

  // ============ Game API ============

  /**
   * Start a new Pong game with specified opponent
   */
  async startGame(opponentId: number): Promise<void> {
    this.validateWebSocketConnection();

    if (this.isInGame) {
      throw new Error('Already in game');
    }

    this.ws!.send(JSON.stringify({
      type: 'start_game',
      opponentId
    }));
  }

  /**
   * Send player input to the current game
   */
  sendGameInput(input: Input): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('GameService: Cannot send input - WebSocket not connected');
      return;
    }

    if (!this.isInGame || !this.currentGameId) {
      console.warn('GameService: Cannot send input - not in game');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'update_input',
      input
    }));
  }

  /**
   * Leave the current game
   */
  leaveGame(): void {
    if (this.isInGame && this.currentGameId) {
      this.emit('game_left', { gameId: this.currentGameId });
      this.cleanupGameState();
    }
  }

  // ============ Game State Getters ============

  getCurrentGameId(): number | null {
    return this.currentGameId;
  }

  getCurrentGameState(): GameState | null {
    return this.gameState;
  }

  isCurrentlyInGame(): boolean {
    return this.isInGame;
  }

  // ============ Event System ============

  on(event: string, listener: GameEventListener): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: GameEventListener): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.listeners.set(event, listeners);
    } else {
      console.warn(`GameService: Cannot remove listener for '${event}' - listener not found`);
    }
  }

  private emit<T = any>(event: string, data: T): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`GameService: Error in ${event} listener:`, error);
      }
    });
  }
}

// Export singleton instance
export const gameService = GameService.getInstance();