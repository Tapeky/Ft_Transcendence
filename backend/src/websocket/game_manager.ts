import { Pong } from "../game/Pong";
import { Input } from "../game/Input";

export class PongPlayer {
  public readonly input: Input = new Input();

	public constructor(public readonly id: number, public readonly socket: any) { }
}

export class PongGame {
  public readonly pong: Pong = new Pong();

  public constructor(public readonly id: number, public readonly leftPlayer: PongPlayer, public readonly rightPlayer: PongPlayer) { }

  public hasPlayer(id: number) {
    return id == this.leftPlayer.id || id == this.rightPlayer.id;
  }

  public getPlayerThrow(playerId: number) {
    if (playerId == this.leftPlayer.id)
      return this.leftPlayer;
    else if (playerId == this.rightPlayer.id)
      return this.rightPlayer;
    throw Error(`unknown player id ${playerId} in game ${this.id}`);
  }

  public getPlayer(playerId: number) {
    if (playerId == this.leftPlayer.id)
      return this.leftPlayer;
    else if (playerId == this.rightPlayer.id)
      return this.rightPlayer;
    return undefined;
  }

  public updateInput(playerId: number, input: Input) {
    this.getPlayerThrow(playerId).input.copy(input);
  }

  public update(deltaTime: number) {
    this.pong.update(deltaTime, this.leftPlayer.input, this.rightPlayer.input);
  }

  public repr(playerId: number) {
    let opponentInput: Input;
    if (this.leftPlayer.id == playerId)
      opponentInput = this.rightPlayer.input;
    else if (this.rightPlayer.id == playerId)
      opponentInput = this.leftPlayer.input;
    else
      throw Error(`unknown player id ${playerId} in game ${this.id}`);

    console.log(opponentInput)
    let repr = this.pong.repr();
    repr["opponentInput"] = opponentInput;
    
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
      if (game.hasPlayer(playerId))
        return (game);
    }
    return undefined;
  }

  public startGame(leftPlayerId: number, rightPlayerId: number, leftPlayerSocket: any, rightPlayerSocket: any) {
    let gameId: number;

    // generate a unique game id
    do
      gameId = Math.round(Math.random() * maxGameId);
    while (this._games.has(gameId));

    const game = new PongGame(gameId, new PongPlayer(leftPlayerId, leftPlayerSocket), new PongPlayer(rightPlayerId, rightPlayerSocket));
    this._games.set(gameId, game);
    return gameId;
  }

  public stopGame(gameId: number) {
    this._games.delete(gameId);
  }

  public registerLoop() {
    if (this._intervalId)
      return;

    const deltaTime = 1 / serverFps;
    this._intervalId = setInterval(() => {
      for (const game of this._games.values()) {
        game.update(deltaTime);
        // TODO: handle errors lmao
        game.leftPlayer.socket.send(JSON.stringify({
          type: 'game_update',
          data: game.repr(game.leftPlayer.id)
        }));
        game.rightPlayer.socket.send(JSON.stringify({
          type: 'game_update',
          data: game.repr(game.rightPlayer.id)
        }));
      }
    }, 1000 / serverFps);
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
};
