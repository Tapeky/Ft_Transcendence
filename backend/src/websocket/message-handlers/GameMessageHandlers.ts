import { BaseMessageHandler, MessageContext } from '../handlers/MessageHandler';
import { GameHandler } from '../handlers/GameHandler';
import { WebSocketManager } from '../WebSocketManager';
import { GameManager } from '../game_manager';

export class StartGameMessageHandler extends BaseMessageHandler {
  readonly messageType = 'start_game';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  validate(message: any): boolean {
    return typeof message.opponentId === 'number';
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    await this.gameHandler.handleStartGame(connection, userState.userId, {
      opponentId: message.opponentId,
    });
  }
}

export class StartLocalGameMessageHandler extends BaseMessageHandler {
  readonly messageType = 'start_local_game';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handleStartLocalGame(connection, userState.userId);
  }
}

export class JoinExistingGameMessageHandler extends BaseMessageHandler {
  readonly messageType = 'join_existing_game';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  validate(message: any): boolean {
    return typeof message.gameId === 'number' && typeof message.opponentId === 'number';
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId || !userState.username) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handleJoinExistingGame(
      connection,
      userState.userId,
      userState.username,
      {
        gameId: message.gameId,
        opponentId: message.opponentId,
      }
    );
  }
}

export class PlayerReadyMessageHandler extends BaseMessageHandler {
  readonly messageType = 'player_ready';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  validate(message: any): boolean {
    return typeof message.gameId === 'number' && typeof message.ready === 'boolean';
  }

  async handle(context: MessageContext): Promise<void> {
    const { userState, message } = context;

    if (!userState.userId) {
      this.sendError(context.connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handlePlayerReady(
      { gameId: message.gameId, ready: message.ready },
      userState.userId
    );
  }
}

export class UpdateInputMessageHandler extends BaseMessageHandler {
  readonly messageType = 'update_input';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  validate(message: any): boolean {
    return message.input && typeof message.input === 'object';
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handleUpdateInput(connection, userState.userId, {
      input: message.input,
    });
  }
}

export class UpdateLocalInputMessageHandler extends BaseMessageHandler {
  readonly messageType = 'update_local_input';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  validate(message: any): boolean {
    return (
      message.leftInput &&
      typeof message.leftInput === 'object' &&
      message.rightInput &&
      typeof message.rightInput === 'object'
    );
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handleUpdateLocalInput(connection, userState.userId, {
      leftInput: message.leftInput,
      rightInput: message.rightInput,
    });
  }
}

export class LeaveGameMessageHandler extends BaseMessageHandler {
  readonly messageType = 'leave_game';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    this.gameHandler.handleLeaveGame(connection, userState.userId);
  }
}

export class GameInviteReceivedMessageHandler extends BaseMessageHandler {
  readonly messageType = 'game_invite_received';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  requiresAuth(): boolean {
    return false;
  }

  validate(message: any): boolean {
    return message.invite && typeof message.invite === 'object';
  }

  async handle(context: MessageContext): Promise<void> {
    this.gameHandler.handleGameInviteReceived({ invite: context.message.invite });
  }
}

export class GameInviteResponseMessageHandler extends BaseMessageHandler {
  readonly messageType = 'game_invite_response';
  private gameHandler: GameHandler;

  constructor(wsManager: WebSocketManager, gameManager: GameManager) {
    super();
    this.gameHandler = new GameHandler(wsManager, gameManager);
  }

  requiresAuth(): boolean {
    return false;
  }

  validate(message: any): boolean {
    return message.response && typeof message.response === 'object';
  }

  async handle(context: MessageContext): Promise<void> {
    this.gameHandler.handleGameInviteResponse({ response: context.message.response });
  }
}