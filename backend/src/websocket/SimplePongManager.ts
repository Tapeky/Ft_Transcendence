import { SimplePong, SimplePongState } from '../game/SimplePong';

interface SimplePongGame {
  id: string;
  pong: SimplePong;
  leftPlayerId: number;
  rightPlayerId: number;
  leftInput: { up: boolean; down: boolean };
  rightInput: { up: boolean; down: boolean };
  lastUpdate: number;
}

export class SimplePongManager {
  private static instance: SimplePongManager;
  private games = new Map<string, SimplePongGame>();
  private playerToGame = new Map<number, string>();
  private updateInterval: NodeJS.Timeout | null = null;

  static getInstance(): SimplePongManager {
    if (!SimplePongManager.instance) {
      SimplePongManager.instance = new SimplePongManager();
    }
    return SimplePongManager.instance;
  }

  startGame(gameId: string, leftPlayerId: number, rightPlayerId: number): void {
    // Nettoyer anciennes parties
    this.endGameForPlayer(leftPlayerId);
    this.endGameForPlayer(rightPlayerId);

    const game: SimplePongGame = {
      id: gameId,
      pong: new SimplePong(),
      leftPlayerId,
      rightPlayerId,
      leftInput: { up: false, down: false },
      rightInput: { up: false, down: false },
      lastUpdate: Date.now()
    };

    this.games.set(gameId, game);
    this.playerToGame.set(leftPlayerId, gameId);
    this.playerToGame.set(rightPlayerId, gameId);

    // Démarrer la boucle de mise à jour si pas déjà active
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => this.updateAllGames(), 1000 / 60);
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

  private updateAllGames(): void {
    const now = Date.now();
    
    for (const game of this.games.values()) {
      const deltaTime = (now - game.lastUpdate) / 1000;
      game.lastUpdate = now;

      game.pong.update(
        deltaTime,
        game.leftInput.up,
        game.leftInput.down,
        game.rightInput.up,
        game.rightInput.down
      );

      // Envoyer l'état aux joueurs via WebSocket
      const state = game.pong.getState();
      const wsManager = require('./WebSocketManager').WebSocketManager.getInstance();
      
      wsManager.sendToUser(game.leftPlayerId, {
        type: 'friend_pong_state',
        state
      });
      
      wsManager.sendToUser(game.rightPlayerId, {
        type: 'friend_pong_state',
        state
      });

      // Si partie terminée, nettoyer
      if (state.gameOver) {
        this.endGame(game.id);
      }
    }

    // Arrêter la boucle si plus de parties
    if (this.games.size === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private endGameForPlayer(playerId: number): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      this.endGame(gameId);
    }
  }

  private endGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    this.playerToGame.delete(game.leftPlayerId);
    this.playerToGame.delete(game.rightPlayerId);
    this.games.delete(gameId);
  }
}