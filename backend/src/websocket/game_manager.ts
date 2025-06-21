import { Pong } from "../game/Pong";
import { Input } from "../game/Input";

export class PongGame {
  public readonly pong: Pong = new Pong();
  public leftInput = new Input();
  public rightInput = new Input();

  public constructor(public readonly id: number, public readonly leftPlayerId: number, public readonly rightPlayerId: number) { }

  public hasPlayer(id: number) {
    return id == this.leftPlayerId || id == this.rightPlayerId;
  }

  public updateInput(playerId: number, input: Input) {
    if (playerId == this.leftPlayerId) {
      this.leftInput.down = input.down;
      this.leftInput.up = input.up;
    }
    else if (playerId == this.rightPlayerId) {
      this.rightInput.down = input.down;
      this.rightInput.up = input.up;
    }
    else
      throw Error(`unknown player id ${playerId} in game ${this.id}`);
  }

  public update(deltaTime: number) {
    this.pong.update(deltaTime, this.leftInput, this.rightInput);
  }

  public json(playerId: number) {
    let opponentInput: Input;
    if (this.leftPlayerId == playerId)
      opponentInput = this.rightInput;
    else if (this.rightPlayerId == playerId)
      opponentInput = this.leftInput;
    else
      throw Error(`unknown player id ${playerId} in game ${this.id}`);

    let repr = this.pong.repr();
    repr["opponentInput"] = opponentInput;
    
    return JSON.stringify(repr);
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

  public startGame(leftPlayerId: number, rightPlayerId: number) {
    let gameId: number;

    // generate a unique game id
    do
      gameId = Math.round(Math.random() * maxGameId);
    while (gameId in this._games.keys());

    const game = new PongGame(gameId, leftPlayerId, rightPlayerId);
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
