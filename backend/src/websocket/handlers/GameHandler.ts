import { SocketStream } from '@fastify/websocket';
import { DatabaseManager } from '../../database/DatabaseManager';
import { UserRepository } from '../../repositories/UserRepository';
import { WebSocketManager } from '../WebSocketManager';
import { GameManager } from '../game_manager';
import { Input } from '../../game/Input';

export class GameHandler {
  constructor(
    private wsManager: WebSocketManager,
    private gameManager: GameManager
  ) {}

  async handleStartGame(
    connection: SocketStream,
    userId: number,
    message: { opponentId: number }
  ): Promise<void> {
    if (!message.opponentId) return;

    // Validation checks
    if (message.opponentId === userId) {
      connection.socket.send(JSON.stringify({
        type: 'err_self',
        message: 'You cannot fight yourself!'
      }));
      return;
    }

    if (this.gameManager.getFromPlayerId(userId)) {
      connection.socket.send(JSON.stringify({
        type: 'err_game_started',
        message: 'You are already in a game!'
      }));
      return;
    }

    // Check opponent exists
    const db = DatabaseManager.getInstance().getDb();
    const userRepo = new UserRepository(db);
    const user = await userRepo.findById(message.opponentId);
    if (!user) {
      connection.socket.send(JSON.stringify({
        type: 'err_unknown_id',
        message: 'This ID is not associated with a user!'
      }));
      return;
    }

    // Check opponent is online
    const opponent = this.wsManager.getUser(message.opponentId);
    if (!opponent) {
      connection.socket.send(JSON.stringify({
        type: 'err_user_offline',
        message: 'This user is not online!'
      }));
      return;
    }

    // Check opponent not already in game
    if (this.gameManager.getFromPlayerId(message.opponentId)) {
      connection.socket.send(JSON.stringify({
        type: 'err_game_started',
        message: 'A game is already in progress for this player'
      }));
      return;
    }

    // Start the game
    const gameId = this.gameManager.startGame(
      userId, 
      message.opponentId, 
      connection.socket, 
      opponent.socket.socket
    );

    connection.socket.send(JSON.stringify({
      type: 'success',
      data: { gameId }
    }));
  }

  handleStartLocalGame(connection: SocketStream, userId: number): void {
    if (this.gameManager.getFromPlayerId(userId)) {
      connection.socket.send(JSON.stringify({
        type: 'err_game_started',
        message: 'You are already in a game!'
      }));
      return;
    }

    // For local game, use same user ID for both players but different socket references
    const gameId = this.gameManager.startGame(
      userId, 
      userId, 
      connection.socket, 
      connection.socket
    );

    connection.socket.send(JSON.stringify({
      type: 'success',
      data: { gameId }
    }));
  }

  handleJoinExistingGame(
    connection: SocketStream,
    userId: number,
    username: string,
    message: { gameId: number; opponentId: number }
  ): void {
    if (!message.gameId || !message.opponentId) return;

    // Get the game to determine positions
    const game = this.gameManager.getGame(message.gameId);
    if (!game) {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
      return;
    }
    
    const opponentUser = this.wsManager.getUser(message.opponentId);
    let success = false;
    
    // Determine who is left/right and update sockets correctly
    if (game.leftPlayer.id === userId && game.rightPlayer.id === message.opponentId) {
      success = this.gameManager.updateGameSockets(
        message.gameId,
        userId,
        message.opponentId,
        connection.socket,
        opponentUser?.socket.socket || null
      );
    } else if (game.leftPlayer.id === message.opponentId && game.rightPlayer.id === userId) {
      success = this.gameManager.updateGameSockets(
        message.gameId,
        message.opponentId,
        userId,
        opponentUser?.socket.socket || null,
        connection.socket
      );
    }
    
    if (success) {
      connection.socket.send(JSON.stringify({
        type: 'success',
        data: { gameId: message.gameId, message: 'Rejoined existing game' }
      }));
    } else {
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Game not found or failed to join'
      }));
    }
  }

  handlePlayerReady(message: { gameId: number; ready: boolean }, userId: number): void {
    if (typeof message.gameId === 'number' && typeof message.ready === 'boolean') {
      this.gameManager.setPlayerReady(message.gameId, userId, message.ready);
    }
  }

  handleUpdateInput(
    connection: SocketStream,
    userId: number,
    message: { input: { up: boolean; down: boolean } }
  ): void {
    if (!message.input || 
        typeof message.input.up !== 'boolean' || 
        typeof message.input.down !== 'boolean') {
      return;
    }

    const game = this.gameManager.getFromPlayerId(userId);
    if (!game) {
      connection.socket.send(JSON.stringify({
        type: 'err_not_in_game',
        message: 'This player is not in a game!'
      }));
      return;
    }

    const userInput = new Input();
    userInput.up = message.input.up;
    userInput.down = message.input.down;
    game.updateInput(userId, userInput);
  }

  handleUpdateLocalInput(
    connection: SocketStream,
    userId: number,
    message: { leftInput: { up: boolean; down: boolean }, rightInput: { up: boolean; down: boolean } }
  ): void {
    if (!message.leftInput || !message.rightInput) return;

    const game = this.gameManager.getFromPlayerId(userId);
    if (!game) {
      connection.socket.send(JSON.stringify({
        type: 'err_not_in_game',
        message: 'This player is not in a game!'
      }));
      return;
    }

    // For local games, both players have the same ID but we need to update both inputs
    const leftInput = new Input();
    leftInput.up = message.leftInput.up;
    leftInput.down = message.leftInput.down;
    
    const rightInput = new Input();
    rightInput.up = message.rightInput.up;
    rightInput.down = message.rightInput.down;
    
    // In local games, left and right player have same ID, so we update the game directly
    game.leftPlayer.input.copy(leftInput);
    game.rightPlayer.input.copy(rightInput);
  }

  handleLeaveGame(connection: SocketStream, userId: number): void {
    const game = this.gameManager.getFromPlayerId(userId);
    if (game) {
      this.gameManager.stopGame(game.id);
    }
    
    connection.socket.send(JSON.stringify({
      type: 'game_left',
      message: 'Successfully left the game'
    }));
  }

  handleGameInviteReceived(message: { invite: any }): void {
    if (message.invite?.receiver_id) {
      this.wsManager.sendToUser(message.invite.receiver_id, {
        type: 'game_invite_received',
        data: { invite: message.invite }
      });
    }
  }

  handleGameInviteResponse(message: { response: any }): void {
    if (message.response?.sender_id) {
      this.wsManager.sendToUser(message.response.sender_id, {
        type: 'game_invite_response',
        data: { response: message.response }
      });
    }
  }
}