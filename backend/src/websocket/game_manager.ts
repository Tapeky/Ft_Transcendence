import { Pong, PongState } from '../game/Pong';
import { Input } from '../game/Input';

export class PongPlayer {
  public readonly input: Input = new Input();
  public isReady: boolean = false;

  public constructor(
    public readonly id: number,
    public readonly socket: any
  ) {}
}

export class PongGame {
  public readonly pong: Pong = new Pong();
  public gameState: 'waiting_ready' | 'countdown' | 'playing' | 'finished' = 'waiting_ready';
  public countdownTimer?: NodeJS.Timeout;

  public constructor(
    public readonly id: number,
    public readonly leftPlayer: PongPlayer,
    public readonly rightPlayer: PongPlayer
  ) {}

  public hasPlayer(id: number) {
    return id === this.leftPlayer.id || id === this.rightPlayer.id;
  }

  public getPlayerThrow(playerId: number) {
    if (playerId === this.leftPlayer.id) return this.leftPlayer;
    else if (playerId === this.rightPlayer.id) return this.rightPlayer;
    throw Error(`unknown player id ${playerId} in game ${this.id}`);
  }

  public getPlayer(playerId: number) {
    if (playerId === this.leftPlayer.id) return this.leftPlayer;
    else if (playerId === this.rightPlayer.id) return this.rightPlayer;
    return undefined;
  }

  public updateInput(playerId: number, input: Input) {
    this.getPlayerThrow(playerId).input.copy(input);
  }

  public setPlayerReady(playerId: number, ready: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isReady = ready;

      this.broadcastReadyStatus();
    }
  }

  public areAllPlayersReady(): boolean {
    return this.leftPlayer.isReady && this.rightPlayer.isReady;
  }

  public broadcastReadyStatus(): void {
    const statusMessage = {
      type: 'ready_status',
      data: {
        leftPlayerReady: this.leftPlayer.isReady,
        rightPlayerReady: this.rightPlayer.isReady,
        gameState: this.gameState,
      },
    };

    try {
      this.leftPlayer.socket.send(JSON.stringify(statusMessage));
      this.rightPlayer.socket.send(JSON.stringify(statusMessage));
    } catch (error) {
      console.error('Error broadcasting ready status:', error);
    }
  }

  public startCountdown(): void {
    if (this.gameState !== 'waiting_ready') return;

    this.gameState = 'countdown';
    let countdown = 3;

    const sendCountdown = () => {
      const countdownMessage = {
        type: 'countdown',
        data: { count: countdown },
      };

      try {
        this.leftPlayer.socket.send(JSON.stringify(countdownMessage));
        this.rightPlayer.socket.send(JSON.stringify(countdownMessage));
      } catch (error) {}

      countdown--;

      if (countdown >= 0) {
        this.countdownTimer = setTimeout(sendCountdown, 1000);
      } else {
        this.gameState = 'playing';
        const startMessage = {
          type: 'game_start',
          data: { message: 'Game started!' },
        };

        try {
          this.leftPlayer.socket.send(JSON.stringify(startMessage));
          this.rightPlayer.socket.send(JSON.stringify(startMessage));
        } catch (error) {
          console.error('Error sending game start:', error);
        }

        console.log(`🚀 Game ${this.id} started!`);
      }
    };

    sendCountdown();
  }

  public update(deltaTime: number) {
    if (this.gameState === 'playing') {
      this.pong.update(deltaTime, this.leftPlayer.input, this.rightPlayer.input);
    }
  }

  public repr(playerId: number) {
    let opponentInput: Input;
    if (this.leftPlayer.id == playerId) opponentInput = this.rightPlayer.input;
    else if (this.rightPlayer.id == playerId) opponentInput = this.leftPlayer.input;
    else throw Error(`unknown player id ${playerId} in game ${this.id}`);

    let repr = this.pong.repr();
    repr['opponentInput'] = opponentInput;

    return repr;
  }
}

const serverFps = 60;
const maxGameId = 10000000000;

export class GameManager {
  private _games = new Map<number, PongGame>();
  private _intervalId: ReturnType<typeof setInterval> | undefined = undefined;

  public getGame(id: number) {
    return this._games.get(id);
  }

  public getFromPlayerId(playerId: number) {
    for (const game of this._games.values()) {
      if (game.hasPlayer(playerId)) return game;
    }
    return undefined;
  }

  public startGame(
    leftPlayerId: number,
    rightPlayerId: number,
    leftPlayerSocket: any,
    rightPlayerSocket: any
  ) {
    let gameId: number;

    do gameId = Math.round(Math.random() * maxGameId);
    while (this._games.has(gameId));

    const game = new PongGame(
      gameId,
      new PongPlayer(leftPlayerId, leftPlayerSocket),
      new PongPlayer(rightPlayerId, rightPlayerSocket)
    );
    this._games.set(gameId, game);

    if (leftPlayerId === rightPlayerId) {
      game.gameState = 'playing';
    } else {
      game.broadcastReadyStatus();
    }

    return gameId;
  }

  public setPlayerReady(gameId: number, playerId: number, ready: boolean): void {
    const game = this._games.get(gameId);
    if (game) {
      game.setPlayerReady(playerId, ready);

      if (game.areAllPlayersReady() && game.gameState === 'waiting_ready') {
        game.startCountdown();
      }
    }
  }

  public stopGame(gameId: number) {
    this._games.delete(gameId);
  }

  public updateGameSockets(
    gameId: number,
    leftPlayerId: number,
    rightPlayerId: number,
    leftSocket: any,
    rightSocket: any
  ): boolean {
    const game = this._games.get(gameId);
    if (!game) {
      return false;
    }

    if (game.leftPlayer.id === leftPlayerId) {
      (game.leftPlayer as any).socket = leftSocket;
    }

    if (game.rightPlayer.id === rightPlayerId) {
      (game.rightPlayer as any).socket = rightSocket;
    }

    return true;
  }

  public registerLoop() {
    if (this._intervalId) return;

    const deltaTime = 1 / serverFps;
    this._intervalId = setInterval(() => {
      this.executeGameLoop(deltaTime);
    }, 1000 / serverFps);
  }

  private executeGameLoop(deltaTime: number): void {
    for (const game of this._games.values()) {
      this.updateGame(game, deltaTime);
      this.broadcastGameState(game);
      this.handleGameEnd(game);
    }
  }

  private updateGame(game: PongGame, deltaTime: number): void {
    game.update(deltaTime);
  }

  private broadcastGameState(game: PongGame): void {
    if (game.gameState !== 'playing') return;

    this.sendGameStateToPlayer(game.leftPlayer, game.repr(game.leftPlayer.id));
    this.sendGameStateToPlayer(game.rightPlayer, game.repr(game.rightPlayer.id));
  }

  private sendGameStateToPlayer(player: PongPlayer, gameData: any): void {
    try {
      player.socket.send(
        JSON.stringify({
          type: 'game_state',
          data: gameData,
        })
      );
    } catch (error) {
      console.error(`Failed to send game state to player ${player.id}:`, error);
    }
  }

  private handleGameEnd(game: PongGame): void {
    if (game.pong.state === PongState.Running) return;

    console.log(`game ${game.id} finished with state ${game.pong.state} !`);

    const gameEndMessage = this.createGameEndMessage(game);
    this.broadcastGameEnd(game, gameEndMessage);
    this._games.delete(game.id);
  }

  private createGameEndMessage(game: PongGame): any {
    return {
      type: 'game_end',
      data: {
        winner: this.determineWinner(game.pong.state),
        finalScore: {
          left: game.pong.leftScore,
          right: game.pong.rightScore,
        },
        gameId: game.id,
        state: game.pong.state,
      },
    };
  }

  private determineWinner(state: PongState): string {
    if (state === PongState.LeftWins) return 'Left Player';
    if (state === PongState.RightWins) return 'Right Player';
    if (state === PongState.Aborted) return 'Game Aborted';
    return 'Unknown';
  }

  private broadcastGameEnd(game: PongGame, message: any): void {
    this.sendGameEndToPlayer(game.leftPlayer, message);
    this.sendGameEndToPlayer(game.rightPlayer, message);
  }

  private sendGameEndToPlayer(player: PongPlayer, message: any): void {
    try {
      player.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send game_end to player ${player.id}:`, error);
    }
  }

  public deregisterLoop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }

  private static _instance: GameManager;

  public static get instance() {
    if (!GameManager._instance) {
      GameManager._instance = new GameManager();
    }

    return this._instance;
  }
}
