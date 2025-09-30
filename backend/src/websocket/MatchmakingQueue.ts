import { SocketStream } from '@fastify/websocket';

interface QueuedPlayer {
  userId: number;
  username: string;
  socket: SocketStream;
  joinedAt: number;
}

export class MatchmakingQueue {
  private static instance: MatchmakingQueue;
  private queue: QueuedPlayer[] = [];

  static getInstance(): MatchmakingQueue {
    if (!MatchmakingQueue.instance) {
      MatchmakingQueue.instance = new MatchmakingQueue();
    }
    return MatchmakingQueue.instance;
  }

  addPlayer(userId: number, username: string, socket: SocketStream): void {
    const wasInQueue = this.removePlayer(userId);
    if (wasInQueue) {
    }

    const player: QueuedPlayer = {
      userId,
      username,
      socket,
      joinedAt: Date.now(),
    };

    this.queue.push(player);

    this.notifyQueuePosition(player);

    this.tryCreateMatch();
  }

  removePlayer(userId: number): boolean {
    const index = this.queue.findIndex(p => p.userId === userId);
    if (index !== -1) {
      const player = this.queue[index];
      this.queue.splice(index, 1);
      this.updateQueuePositions();
      return true;
    }
    return false;
  }

  private tryCreateMatch(): void {
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift()!;
      const player2 = this.queue.shift()!;

      const matchId = `match_${Date.now()}`;

      const message1 = {
        type: 'matchmaking:found',
        matchId,
        opponent: { id: player2.userId, username: player2.username },
      };

      const message2 = {
        type: 'matchmaking:found',
        matchId,
        opponent: { id: player1.userId, username: player1.username },
      };

      try {
        player1.socket.socket.send(JSON.stringify(message1));
      } catch (error) {
        console.error(`❌ [MATCHMAKING] Failed to send to ${player1.username}:`, error);
      }

      try {
        player2.socket.socket.send(JSON.stringify(message2));
      } catch (error) {
        console.error(`❌ [MATCHMAKING] Failed to send to ${player2.username}:`, error);
      }

      this.updateQueuePositions();
    }
  }

  private notifyQueuePosition(player: QueuedPlayer): void {
    const position = this.queue.findIndex(p => p.userId === player.userId) + 1;
    player.socket.socket.send(
      JSON.stringify({
        type: 'matchmaking:waiting',
        position,
        totalInQueue: this.queue.length,
      })
    );
  }

  private updateQueuePositions(): void {
    this.queue.forEach((player, index) => {
      player.socket.socket.send(
        JSON.stringify({
          type: 'matchmaking:waiting',
          position: index + 1,
          totalInQueue: this.queue.length,
        })
      );
    });
  }

  getStats() {
    return {
      playersInQueue: this.queue.length,
      players: this.queue.map(p => ({
        username: p.username,
        waitTime: Date.now() - p.joinedAt,
      })),
    };
  }
}
