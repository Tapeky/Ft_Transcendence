import { Pong, PongState } from "../game/Pong";
import { Input } from "../game/Input";

export class PongPlayer {
  public readonly input: Input = new Input();
  public isReady: boolean = false;

	public constructor(public readonly id: number, public readonly socket: any) { }
}

export class PongGame {
  public readonly pong: Pong = new Pong();
  public gameState: 'waiting_ready' | 'countdown' | 'playing' | 'finished' = 'waiting_ready';
  public countdownTimer?: NodeJS.Timeout;

  public constructor(public readonly id: number, public readonly leftPlayer: PongPlayer, public readonly rightPlayer: PongPlayer) { }

  public hasPlayer(id: number) {
    return id === this.leftPlayer.id || id === this.rightPlayer.id;
  }

  public getPlayerThrow(playerId: number) {
    if (playerId === this.leftPlayer.id)
      return this.leftPlayer;
    else if (playerId === this.rightPlayer.id)
      return this.rightPlayer;
    throw Error(`unknown player id ${playerId} in game ${this.id}`);
  }

  public getPlayer(playerId: number) {
    if (playerId === this.leftPlayer.id)
      return this.leftPlayer;
    else if (playerId === this.rightPlayer.id)
      return this.rightPlayer;
    return undefined;
  }

  public updateInput(playerId: number, input: Input) {
    this.getPlayerThrow(playerId).input.copy(input);
  }

  public setPlayerReady(playerId: number, ready: boolean): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isReady = ready;
      // Player ready status updated
      
      // Notifier tous les joueurs du changement de statut
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
        gameState: this.gameState
      }
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
    
    // Starting game countdown
    
    const sendCountdown = () => {
      const countdownMessage = {
        type: 'countdown',
        data: { count: countdown }
      };

      try {
        this.leftPlayer.socket.send(JSON.stringify(countdownMessage));
        this.rightPlayer.socket.send(JSON.stringify(countdownMessage));
      } catch (error) {
        // Error sending countdown message
      }

      countdown--;
      
      if (countdown >= 0) {
        this.countdownTimer = setTimeout(sendCountdown, 1000);
      } else {
        // Démarrer la partie
        this.gameState = 'playing';
        const startMessage = {
          type: 'game_start',
          data: { message: 'Game started!' }
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
    // Ne mettre à jour la physique que si le jeu est en cours
    if (this.gameState === 'playing') {
      this.pong.update(deltaTime, this.leftPlayer.input, this.rightPlayer.input);
    }
  }

  public repr(playerId: number) {
    let opponentInput: Input;
    if (this.leftPlayer.id == playerId)
      opponentInput = this.rightPlayer.input;
    else if (this.rightPlayer.id == playerId)
      opponentInput = this.leftPlayer.input;
    else
      throw Error(`unknown player id ${playerId} in game ${this.id}`);

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
    
    // Si c'est une partie locale (même joueur), démarrer immédiatement
    if (leftPlayerId === rightPlayerId) {
      console.log(`🎮 Local game ${gameId} - starting immediately`);
      game.gameState = 'playing';
    } else {
      // Partie online: envoyer le statut ready
      console.log(`🎮 Online game ${gameId} - waiting for ready check`);
      game.broadcastReadyStatus();
    }
    
    return gameId;
  }

  public setPlayerReady(gameId: number, playerId: number, ready: boolean): void {
    const game = this._games.get(gameId);
    if (game) {
      game.setPlayerReady(playerId, ready);
      
      // Si tous les joueurs sont ready, démarrer le countdown
      if (game.areAllPlayersReady() && game.gameState === 'waiting_ready') {
        game.startCountdown();
      }
    }
  }

  public stopGame(gameId: number) {
    this._games.delete(gameId);
  }

  // 🔄 Mettre à jour les sockets d'une partie existante (pour KISS handoff)
  public updateGameSockets(gameId: number, leftPlayerId: number, rightPlayerId: number, leftSocket: any, rightSocket: any): boolean {
    const game = this._games.get(gameId);
    if (!game) {
      console.log(`❌ Game ${gameId} not found for socket update`);
      return false;
    }

    // Vérifier que les IDs correspondent et mettre à jour via l'objet socket
    if (game.leftPlayer.id === leftPlayerId) {
      // Remplacer l'objet socket readonly par une approche compatible
      (game.leftPlayer as any).socket = leftSocket;
      console.log(`🔄 Updated left player socket for game ${gameId}`);
    }
    
    if (game.rightPlayer.id === rightPlayerId) {
      // Remplacer l'objet socket readonly par une approche compatible
      (game.rightPlayer as any).socket = rightSocket;
      console.log(`🔄 Updated right player socket for game ${gameId}`);
    }

    return true;
  }

  public registerLoop() {
    if (this._intervalId)
      return;

    const deltaTime = 1 / serverFps;
    this._intervalId = setInterval(() => {
      for (const game of this._games.values()) {
        game.update(deltaTime);
        
        // N'envoyer les game_state que si le jeu est en cours
        if (game.gameState === 'playing') {
          // Handle socket send errors gracefully
          game.leftPlayer.socket.send(JSON.stringify({
            type: 'game_state',
            data: game.repr(game.leftPlayer.id)
          }));
          game.rightPlayer.socket.send(JSON.stringify({
            type: 'game_state',
            data: game.repr(game.rightPlayer.id)
          }));
        }
        if (game.pong.state !== PongState.Running) {
          console.log(`game ${game.id} finished with state ${game.pong.state} !`);
          
          // Determine winner and send game_end message to both players
          let winner = 'Unknown';
          if (game.pong.state === PongState.LeftWins) {
            winner = 'Left Player';
          } else if (game.pong.state === PongState.RightWins) {
            winner = 'Right Player';
          } else if (game.pong.state === PongState.Aborted) {
            winner = 'Game Aborted';
          }
          
          const gameEndMessage = {
            type: 'game_end',
            data: {
              winner: winner,
              finalScore: {
                left: game.pong.leftScore,
                right: game.pong.rightScore
              },
              gameId: game.id,
              state: game.pong.state
            }
          };
          
          // Send game_end message to both players
          try {
            game.leftPlayer.socket.send(JSON.stringify(gameEndMessage));
          } catch (error) {
            console.error(`Failed to send game_end to left player:`, error);
          }
          
          try {
            game.rightPlayer.socket.send(JSON.stringify(gameEndMessage));
          } catch (error) {
            console.error(`Failed to send game_end to right player:`, error);
          }
          
          this._games.delete(game.id);
        }
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
