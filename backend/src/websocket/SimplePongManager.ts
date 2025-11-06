import { SimplePong, SimplePongState } from '../game/SimplePong';
import { WebSocketManager } from './WebSocketManager';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import type { User } from '../types/database';

interface SimplePongGame {
  id: string;
  pong: SimplePong;
  leftPlayerId: number;
  rightPlayerId: number;
  leftInput: { up: boolean; down: boolean };
  rightInput: { up: boolean; down: boolean };
  lastUpdate: number;
  leftPlayerName: string;
  rightPlayerName: string;
  leftPlayerReady: boolean;
  rightPlayerReady: boolean;
  gameStarted: boolean;
}

export class SimplePongManager {
  private static instance: SimplePongManager;
  private games = new Map<string, SimplePongGame>();
  private playerToGame = new Map<number, string>();
  private updateInterval: NodeJS.Timeout | null = null;
  private wsManager: WebSocketManager | null = null;
  private disconnectionTimers = new Map<string, NodeJS.Timeout>(); // Timers pour délai de grâce
  private userRepository: UserRepository;

  static getInstance(): SimplePongManager {
    if (!SimplePongManager.instance) {
      SimplePongManager.instance = new SimplePongManager();
    }
    return SimplePongManager.instance;
  }

  private constructor() {
    const db = DatabaseManager.getInstance().getDb();
    this.userRepository = new UserRepository(db);
  }

  setWebSocketManager(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  async startGame(gameId: string, leftPlayerId: number, rightPlayerId: number): Promise<boolean> {
    try {
      if (this.games.has(gameId)) {
        return false;
      }

      if (!this.wsManager) {
        throw new Error('WebSocketManager non initialisé');
      }

      const leftConnected = this.wsManager.hasUser(leftPlayerId);
      const rightConnected = this.wsManager.hasUser(rightPlayerId);

      if (!leftConnected) {
        throw new Error(`Joueur gauche ${leftPlayerId} non connecté`);
      }

      if (!rightConnected) {
        throw new Error(`Joueur droit ${rightPlayerId} non connecté`);
      }

      this.endGameForPlayer(leftPlayerId);
      this.endGameForPlayer(rightPlayerId);

      const { leftName, rightName } = await this.resolvePlayerNames(leftPlayerId, rightPlayerId);

      const game: SimplePongGame = {
        id: gameId,
        pong: new SimplePong(),
        leftPlayerId,
        rightPlayerId,
        leftInput: { up: false, down: false },
        rightInput: { up: false, down: false },
        lastUpdate: Date.now(),
        leftPlayerName: leftName,
        rightPlayerName: rightName,
        leftPlayerReady: false,
        rightPlayerReady: false,
        gameStarted: false,
      };

      const initialState = game.pong.getState();
      if (initialState.gameOver) {
        return false;
      }

      const messageType = gameId.startsWith('pong_') ? 'simple_pong_start' : 'friend_pong_start';

      const playersPayload = {
        left: leftName,
        right: rightName,
      };

      const leftSuccess = this.wsManager.sendToUser(leftPlayerId, {
        type: messageType,
        gameId,
        role: 'left',
        opponentId: rightPlayerId,
        leftPlayerId,
        rightPlayerId,
        players: playersPayload,
      });

      const rightSuccess = this.wsManager.sendToUser(rightPlayerId, {
        type: messageType,
        gameId,
        role: 'right',
        opponentId: leftPlayerId,
        leftPlayerId,
        rightPlayerId,
        players: playersPayload,
      });

      if (!leftSuccess || !rightSuccess) {
        throw new Error("Impossible d'envoyer les messages de démarrage");
      }

      this.games.set(gameId, game);
      this.playerToGame.set(leftPlayerId, gameId);
      this.playerToGame.set(rightPlayerId, gameId);

      this.startUpdateLoop();

      return true;
    } catch (error) {
      this.games.delete(gameId);
      this.playerToGame.delete(leftPlayerId);
      this.playerToGame.delete(rightPlayerId);
      return false;
    }
  }

  private getPreferredUserName(user: User | null, fallbackId: number): string {
    if (!user) {
      return `Player ${fallbackId}`;
    }

    const displayName = typeof user.display_name === 'string' ? user.display_name.trim() : '';
    const username = typeof user.username === 'string' ? user.username.trim() : '';

    return displayName || username || `Player ${fallbackId}`;
  }

  private async resolvePlayerNames(
    leftPlayerId: number,
    rightPlayerId: number
  ): Promise<{ leftName: string; rightName: string }> {
    try {
      const [leftUser, rightUser] = await Promise.all([
        this.userRepository.findById(leftPlayerId),
        this.userRepository.findById(rightPlayerId),
      ]);

      return {
        leftName: this.getPreferredUserName(leftUser, leftPlayerId),
        rightName: this.getPreferredUserName(rightUser, rightPlayerId),
      };
    } catch (error) {
      return {
        leftName: `Player ${leftPlayerId}`,
        rightName: `Player ${rightPlayerId}`,
      };
    }
  }

  updateInput(playerId: number, up: boolean, down: boolean): void {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game) return;

    if (playerId === game.leftPlayerId) {
      game.leftInput = { up, down };
    } else if (playerId === game.rightPlayerId) {
      game.rightInput = { up, down };
    }
  }

  getGameState(playerId: number): SimplePongState | null {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    return game.pong.getState();
  }

  getGameInfo(gameId: string): SimplePongGame | null {
    return this.games.get(gameId) || null;
  }

  getPlayerSide(playerId: number, gameId: string): 'left' | 'right' | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const timer = this.disconnectionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectionTimers.delete(gameId);
    }

    if (game.leftPlayerId === playerId) return 'left';
    if (game.rightPlayerId === playerId) return 'right';
    return null;
  }

  private startUpdateLoop(): void {
    if (!this.updateInterval && this.games.size > 0) {
      this.updateInterval = setInterval(() => this.updateAllGames(), 1000 / 60);
    }
  }

  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateAllGames(): void {
    if (this.games.size === 0) {
      this.stopUpdateLoop();
      return;
    }

    const now = Date.now();
    const finishedGames: string[] = [];
    let gamesProcessed = 0;

    for (const game of this.games.values()) {
      if (!this.wsManager) {
        continue;
      }

      // Skip games that haven't started yet (waiting for both players to be ready)
      if (!game.gameStarted) {
        continue;
      }

      gamesProcessed++;

      const deltaTime = Math.min((now - game.lastUpdate) / 1000, 1 / 30); // Cap deltaTime to prevent huge jumps
      game.lastUpdate = now;

      game.pong.update(
        deltaTime,
        game.leftInput.up,
        game.leftInput.down,
        game.rightInput.up,
        game.rightInput.down
      );

      const state = game.pong.getState();

      if (this.wsManager) {
        const messageType = game.id.startsWith('pong_') ? 'simple_pong_state' : 'friend_pong_state';
        const playersPayload = {
          left: game.leftPlayerName,
          right: game.rightPlayerName,
        };

        this.wsManager.sendToUser(game.leftPlayerId, {
          type: messageType,
          gameId: game.id,
          gameState: state, // Use gameState for simple_pong compatibility
          leftPlayerId: game.leftPlayerId,
          rightPlayerId: game.rightPlayerId,
          players: playersPayload,
        });

        this.wsManager.sendToUser(game.rightPlayerId, {
          type: messageType,
          gameId: game.id,
          gameState: state, // Use gameState for simple_pong compatibility
          leftPlayerId: game.leftPlayerId,
          rightPlayerId: game.rightPlayerId,
          players: playersPayload,
        });
      }

      if (state.gameOver) {
        finishedGames.push(game.id);
      }
    }

    finishedGames.forEach(gameId => {
      const game = this.games.get(gameId);
      if (game) {
        const gameAge = Date.now() - game.lastUpdate;
        if (gameAge < 5000) {
          return;
        }
      }
      setTimeout(() => this.endGame(gameId), 3000);
    });

    if (this.games.size === 0) {
      this.stopUpdateLoop();
    }
  }

  private endGameForPlayer(playerId: number): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      this.endGame(gameId);
    } else {
    }
  }

  private endGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const timer = this.disconnectionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectionTimers.delete(gameId);
    }

    if (this.wsManager) {
      const messageType = gameId.startsWith('pong_') ? 'simple_pong_end' : 'friend_pong_end';
      const playersPayload = {
        left: game.leftPlayerName,
        right: game.rightPlayerName,
      };

      this.wsManager.sendToUser(game.leftPlayerId, {
        type: messageType,
        gameId,
        gameState: game.pong.getState(), // Include final state
        leftPlayerId: game.leftPlayerId,
        rightPlayerId: game.rightPlayerId,
        players: playersPayload,
      });

      this.wsManager.sendToUser(game.rightPlayerId, {
        type: messageType,
        gameId,
        gameState: game.pong.getState(), // Include final state
        leftPlayerId: game.leftPlayerId,
        rightPlayerId: game.rightPlayerId,
        players: playersPayload,
      });
    }

    this.playerToGame.delete(game.leftPlayerId);
    this.playerToGame.delete(game.rightPlayerId);
    this.games.delete(gameId);
  }

  setPlayerReady(gameId: string, playerId: number): void {
    const game = this.games.get(gameId);
    if (!game) {
      return;
    }

    if (game.leftPlayerId === playerId) {
      game.leftPlayerReady = true;
    } else if (game.rightPlayerId === playerId) {
      game.rightPlayerReady = true;
    } else {
      return;
    }

    // Notify the other player that this player is ready
    const otherPlayerId = game.leftPlayerId === playerId ? game.rightPlayerId : game.leftPlayerId;
    if (this.wsManager) {
      this.wsManager.sendToUser(otherPlayerId, {
        type: 'player_ready_update',
        gameId: gameId,
        playerId: playerId,
        message: `${game.leftPlayerId === playerId ? game.leftPlayerName : game.rightPlayerName} is ready!`,
      });
    }

    if (game.leftPlayerReady && game.rightPlayerReady && !game.gameStarted) {
      game.gameStarted = true;
      game.pong.reset();
      const messageType = gameId.startsWith('pong_') ? 'simple_pong_actually_started' : 'friend_pong_actually_started';

      if (this.wsManager) {
        this.wsManager.sendToUser(game.leftPlayerId, {
          type: messageType,
          gameId: gameId,
          message: 'Both players ready! Game starting now!',
        });

        this.wsManager.sendToUser(game.rightPlayerId, {
          type: messageType,
          gameId: gameId,
          message: 'Both players ready! Game starting now!',
        });
      }
    }
  }

  handlePlayerDisconnect(playerId: number): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (!game) return;

      const existingTimer = this.disconnectionTimers.get(gameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectionTimers.delete(gameId);
      }

      const otherPlayerId = game.leftPlayerId === playerId ? game.rightPlayerId : game.leftPlayerId;
      const otherPlayerConnected = this.wsManager?.hasUser(otherPlayerId);

      // Determine winner: the player who disconnected loses
      const disconnectedIsLeft = game.leftPlayerId === playerId;
      const winner = disconnectedIsLeft ? 'right' : 'left';

      // Set winner and game over in the pong state
      const currentState = game.pong.getState();
      currentState.gameOver = true;
      currentState.winner = winner;

      // Give winning score to the remaining player
      if (winner === 'left') {
        currentState.leftScore = 5;
      } else {
        currentState.rightScore = 5;
      }

      // Notify the other player that opponent disconnected with final game state
      if (otherPlayerConnected) {
        this.wsManager?.sendToUser(otherPlayerId, {
          type: 'opponent_disconnected',
          gameId: gameId,
          message: 'Your opponent has disconnected. You win!',
          gameState: currentState,
          leftPlayerId: game.leftPlayerId,
          rightPlayerId: game.rightPlayerId,
        });
      }

      // End game immediately when a player disconnects
      this.endGame(gameId);
    }
  }
}
