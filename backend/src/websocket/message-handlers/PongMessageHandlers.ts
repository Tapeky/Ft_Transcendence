import { BaseMessageHandler, MessageContext } from '../handlers/MessageHandler';
import { SimplePongManager } from '../SimplePongManager';
import { FriendPongInvites } from '../FriendPongInvites';

export class FriendPongAcceptMessageHandler extends BaseMessageHandler {
  readonly messageType = 'friend_pong_accept';

  constructor(private inviteManager: FriendPongInvites) {
    super();
  }

  validate(message: any): boolean {
    return typeof message.inviteId === 'string' && message.inviteId.length > 0;
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    const success = await this.inviteManager.acceptInvite(message.inviteId, userState.userId);
    if (!success) {
      this.sendError(connection, 'Unable to accept invitation');
    }
  }
}

export class FriendPongDeclineMessageHandler extends BaseMessageHandler {
  readonly messageType = 'friend_pong_decline';

  constructor(private inviteManager: FriendPongInvites) {
    super();
  }

  validate(message: any): boolean {
    return typeof message.inviteId === 'string' && message.inviteId.length > 0;
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    const success = this.inviteManager.declineInvite(message.inviteId, userState.userId);
    if (!success) {
      this.sendError(connection, 'Unable to decline invitation');
    }
  }
}

export class FriendPongInputMessageHandler extends BaseMessageHandler {
  readonly messageType = 'friend_pong_input';

  validate(message: any): boolean {
    return typeof message.up === 'boolean' && typeof message.down === 'boolean';
  }

  async handle(context: MessageContext): Promise<void> {
    const { userState, message } = context;

    if (!userState.userId) {
      this.sendError(context.connection, 'User not authenticated');
      return;
    }

    const simplePongManager = SimplePongManager.getInstance();
    simplePongManager.updateInput(userState.userId, message.up, message.down);
  }
}

export class JoinSimplePongMessageHandler extends BaseMessageHandler {
  readonly messageType = 'join_simple_pong';

  validate(message: any): boolean {
    return (
      typeof message.gameId === 'string' &&
      message.gameId.length > 0 &&
      message.gameId.length <= 100
    );
  }

  async handle(context: MessageContext): Promise<void> {
    const { connection, userState, message } = context;

    if (!userState.userId) {
      this.sendError(connection, 'User not authenticated');
      return;
    }

    const simplePongManager = SimplePongManager.getInstance();
    const playerSide = simplePongManager.getPlayerSide(userState.userId, message.gameId);

    if (playerSide) {
      console.log(
        `✅ [JoinSimplePong] Player ${userState.userId} joined game ${message.gameId} as ${playerSide}`
      );
      this.sendSuccess(connection, 'simple_pong_joined', {
        gameId: message.gameId,
        player: playerSide,
      });
    } else {
      console.log(
        `❌ [JoinSimplePong] Player ${userState.userId} failed to join game ${message.gameId}`
      );
      connection.socket.send(
        JSON.stringify({
          type: 'simple_pong_join_failed',
          gameId: message.gameId,
          error: 'PLAYER_NOT_FOUND',
          message: 'Could not join SimplePong game - player not found in game',
          suggestion: 'Game may still be initializing. Please try again in a moment.',
          retryAfter: 2000,
        })
      );
    }
  }
}

export class SimplePongInputMessageHandler extends BaseMessageHandler {
  readonly messageType = 'simple_pong_input';

  validate(message: any): boolean {
    return (
      typeof message.gameId === 'string' &&
      message.gameId.length > 0 &&
      message.gameId.length <= 100 &&
      message.input &&
      typeof message.input === 'object' &&
      typeof message.input.up === 'boolean' &&
      typeof message.input.down === 'boolean'
    );
  }

  async handle(context: MessageContext): Promise<void> {
    const { userState, message } = context;

    if (!userState.userId) {
      this.sendError(context.connection, 'User not authenticated');
      return;
    }

    const simplePongManager = SimplePongManager.getInstance();
    simplePongManager.updateInput(userState.userId, message.input.up, message.input.down);
  }
}