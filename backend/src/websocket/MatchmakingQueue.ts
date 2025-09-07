// Ultra Simple Matchmaking Queue - FIFO basique
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

  // Ajouter joueur à la queue
  addPlayer(userId: number, username: string, socket: SocketStream): void {
    console.log(`🔍 [MATCHMAKING] addPlayer called - userId: ${userId}, username: ${username}`);
    console.log(`🔍 [MATCHMAKING] Current queue size BEFORE: ${this.queue.length}`);
    console.log(`🔍 [MATCHMAKING] Current queue players:`, this.queue.map(p => `${p.username}(${p.userId})`));
    
    // Supprimer s'il existe déjà
    const wasInQueue = this.removePlayer(userId);
    if (wasInQueue) {
      console.log(`⚠️ [MATCHMAKING] Player ${username} was already in queue, removed first`);
    }
    
    const player: QueuedPlayer = {
      userId,
      username,
      socket,
      joinedAt: Date.now()
    };
    
    this.queue.push(player);
    console.log(`✅ [MATCHMAKING] ${username} added to queue`);
    console.log(`🔍 [MATCHMAKING] Queue size AFTER: ${this.queue.length}`);
    console.log(`🎯 ${username} rejoint le matchmaking (${this.queue.length} en attente)`);
    
    // Notifier position dans la queue
    this.notifyQueuePosition(player);
    
    // Essayer de matcher immédiatement
    console.log(`🔍 [MATCHMAKING] Trying to create match...`);
    this.tryCreateMatch();
  }

  // Retirer joueur de la queue
  removePlayer(userId: number): boolean {
    const index = this.queue.findIndex(p => p.userId === userId);
    if (index !== -1) {
      const player = this.queue[index];
      this.queue.splice(index, 1);
      console.log(`🚪 ${player.username} quitte le matchmaking`);
      this.updateQueuePositions();
      return true;
    }
    return false;
  }

  // Essayer de créer un match (FIFO simple)
  private tryCreateMatch(): void {
    console.log(`🔍 [MATCHMAKING] tryCreateMatch - Queue size: ${this.queue.length}`);
    
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift()!;
      const player2 = this.queue.shift()!;
      
      console.log(`🎮 [MATCHMAKING] Match créé: ${player1.username}(${player1.userId}) vs ${player2.username}(${player2.userId})`);
      
      // Créer l'ID de match (timestamp simple)
      const matchId = `match_${Date.now()}`;
      console.log(`🔍 [MATCHMAKING] Generated matchId: ${matchId}`);
      
      const message1 = {
        type: 'matchmaking:found',
        matchId,
        opponent: { id: player2.userId, username: player2.username }
      };
      
      const message2 = {
        type: 'matchmaking:found', 
        matchId,
        opponent: { id: player1.userId, username: player1.username }
      };
      
      console.log(`📤 [MATCHMAKING] Sending to ${player1.username}:`, JSON.stringify(message1));
      console.log(`📤 [MATCHMAKING] Sending to ${player2.username}:`, JSON.stringify(message2));
      
      // Notifier les deux joueurs
      try {
        player1.socket.socket.send(JSON.stringify(message1));
        console.log(`✅ [MATCHMAKING] Message sent to ${player1.username}`);
      } catch (error) {
        console.error(`❌ [MATCHMAKING] Failed to send to ${player1.username}:`, error);
      }
      
      try {
        player2.socket.socket.send(JSON.stringify(message2));
        console.log(`✅ [MATCHMAKING] Message sent to ${player2.username}`);
      } catch (error) {
        console.error(`❌ [MATCHMAKING] Failed to send to ${player2.username}:`, error);
      }
      
      console.log(`🔍 [MATCHMAKING] Queue size after match creation: ${this.queue.length}`);
      
      // Mettre à jour les positions pour les autres
      this.updateQueuePositions();
    } else {
      console.log(`⏳ [MATCHMAKING] Not enough players (${this.queue.length}/2) - waiting for more`);
    }
  }

  // Notifier position dans la queue
  private notifyQueuePosition(player: QueuedPlayer): void {
    const position = this.queue.findIndex(p => p.userId === player.userId) + 1;
    player.socket.socket.send(JSON.stringify({
      type: 'matchmaking:waiting',
      position,
      totalInQueue: this.queue.length
    }));
  }

  // Mettre à jour toutes les positions
  private updateQueuePositions(): void {
    this.queue.forEach((player, index) => {
      player.socket.socket.send(JSON.stringify({
        type: 'matchmaking:waiting',
        position: index + 1,
        totalInQueue: this.queue.length
      }));
    });
  }

  // Stats pour debug
  getStats() {
    return {
      playersInQueue: this.queue.length,
      players: this.queue.map(p => ({ 
        username: p.username, 
        waitTime: Date.now() - p.joinedAt 
      }))
    };
  }
}