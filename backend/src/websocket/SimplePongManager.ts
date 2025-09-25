import { SimplePong, SimplePongState } from '../game/SimplePong';
import { WebSocketManager } from './WebSocketManager';

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
  private wsManager: WebSocketManager | null = null;
  private disconnectionTimers = new Map<string, NodeJS.Timeout>(); // Timers pour délai de grâce

  static getInstance(): SimplePongManager {
    if (!SimplePongManager.instance) {
      SimplePongManager.instance = new SimplePongManager();
    }
    return SimplePongManager.instance;
  }

  // Méthode pour injecter le WebSocketManager
  setWebSocketManager(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  startGame(gameId: string, leftPlayerId: number, rightPlayerId: number): boolean {
    console.log(`🎮 [SimplePongManager] Tentative création jeu: ${gameId}, left: ${leftPlayerId}, right: ${rightPlayerId}`);
    console.log(`🎮 [SimplePongManager] État avant création - Jeux existants: ${this.games.size} [${Array.from(this.games.keys()).join(', ')}]`);

    try {
      // 1. Vérifications préalables
      if (this.games.has(gameId)) {
        console.log(`❌ [SimplePongManager] Jeu ${gameId} existe déjà`);
        return false;
      }

      if (!this.wsManager) {
        throw new Error('WebSocketManager non initialisé');
      }

      // 2. Vérifier la connectivité WebSocket AVANT de créer le jeu
      const leftConnected = this.wsManager.hasUser(leftPlayerId);
      const rightConnected = this.wsManager.hasUser(rightPlayerId);

      if (!leftConnected) {
        throw new Error(`Joueur gauche ${leftPlayerId} non connecté`);
      }

      if (!rightConnected) {
        throw new Error(`Joueur droit ${rightPlayerId} non connecté`);
      }

      // 3. Nettoyer anciennes parties seulement après validation
      this.endGameForPlayer(leftPlayerId);
      this.endGameForPlayer(rightPlayerId);

      // 4. Créer le jeu
      const game: SimplePongGame = {
        id: gameId,
        pong: new SimplePong(),
        leftPlayerId,
        rightPlayerId,
        leftInput: { up: false, down: false },
        rightInput: { up: false, down: false },
        lastUpdate: Date.now()
      };

      // Vérifier que le jeu n'est pas déjà terminé à la création (debug)
      const initialState = game.pong.getState();
      if (initialState.gameOver) {
        console.error(`🚨 [SimplePongManager] ERREUR: Jeu ${gameId} créé avec gameOver=true! leftScore=${initialState.leftScore}, rightScore=${initialState.rightScore}`);
        return false;
      }
      
      console.log(`🎮 [SimplePongManager] État initial du jeu ${gameId}: gameOver=${initialState.gameOver}, leftScore=${initialState.leftScore}, rightScore=${initialState.rightScore}`);

      // 5. Tester l'envoi WebSocket AVANT de valider le jeu
      const messageType = gameId.startsWith('pong_') ? 'simple_pong_start' : 'friend_pong_ready';

      const leftSuccess = this.wsManager.sendToUser(leftPlayerId, {
        type: messageType,
        gameId,
        role: 'left',
        opponentId: rightPlayerId
      });

      const rightSuccess = this.wsManager.sendToUser(rightPlayerId, {
        type: messageType,
        gameId,
        role: 'right',
        opponentId: leftPlayerId
      });

      if (!leftSuccess || !rightSuccess) {
        throw new Error('Impossible d\'envoyer les messages de démarrage');
      }

      // 6. SEULEMENT maintenant, enregistrer le jeu (statut actif implicite)
      this.games.set(gameId, game);
      this.playerToGame.set(leftPlayerId, gameId);
      this.playerToGame.set(rightPlayerId, gameId);

      console.log(`✅ [SimplePongManager] Jeu ${gameId} créé avec succès. Total games: ${this.games.size}`);
      console.log(`🎮 [SimplePongManager] Player mappings: ${leftPlayerId}->${gameId}, ${rightPlayerId}->${gameId}`);
      console.log(`🎮 [SimplePongManager] Jeux après création: [${Array.from(this.games.keys()).join(', ')}]`);

      // 7. Démarrer la boucle de mise à jour
      this.startUpdateLoop();
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`❌ [SimplePongManager] Échec création jeu ${gameId}:`, errorMessage);
      
      // Nettoyer en cas d'échec partiel (important!)
      this.games.delete(gameId);
      this.playerToGame.delete(leftPlayerId);
      this.playerToGame.delete(rightPlayerId);
      
      return false;
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

  getPlayerSide(playerId: number, gameId: string): 'left' | 'right' | null {
    console.log(`🔍 [SimplePongManager] getPlayerSide: playerId=${playerId}, gameId=${gameId}`);
    console.log(`🔍 [SimplePongManager] État actuel: ${this.games.size} jeux, ${this.disconnectionTimers.size} timers actifs`);
    
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`❌ [SimplePongManager] Jeu ${gameId} non trouvé`);
      console.log(`🎯 [SimplePongManager] Jeux disponibles: [${Array.from(this.games.keys()).join(', ')}]`);
      console.log(`🎯 [SimplePongManager] Timers de déconnexion: [${Array.from(this.disconnectionTimers.keys()).join(', ')}]`);
      return null;
    }

    // Annuler le timer de déconnexion si le joueur se reconnecte
    const timer = this.disconnectionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectionTimers.delete(gameId);
      console.log(`🔌 [SimplePongManager] Timer de déconnexion annulé pour ${gameId} - joueur ${playerId} reconnecté`);
    }

    console.log(`✅ [SimplePongManager] Jeu trouvé: left=${game.leftPlayerId}, right=${game.rightPlayerId}`);
    
    if (game.leftPlayerId === playerId) return 'left';
    if (game.rightPlayerId === playerId) return 'right';
    return null;
  }

  private startUpdateLoop(): void {
    // Only start if not already running and games exist
    if (!this.updateInterval && this.games.size > 0) {
      console.log(`🚀 [SimplePongManager] Starting update loop for ${this.games.size} game(s)`);
      this.updateInterval = setInterval(() => this.updateAllGames(), 1000 / 60);
    }
  }

  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      console.log(`⏹️ [SimplePongManager] Stopping update loop`);
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateAllGames(): void {
    // Early exit if no games
    if (this.games.size === 0) {
      this.stopUpdateLoop();
      return;
    }

    const now = Date.now();
    const finishedGames: string[] = [];
    let gamesProcessed = 0;

    for (const game of this.games.values()) {
      // Skip sending updates if WebSocket manager not available, but continue processing
      if (!this.wsManager) {
        console.warn(`⚠️ [SimplePongManager] WebSocketManager not available, skipping updates for game ${game.id}`);
        // Still process the game logic, just don't send updates
      }

      gamesProcessed++;

      const deltaTime = Math.min((now - game.lastUpdate) / 1000, 1/30); // Cap deltaTime to prevent huge jumps
      game.lastUpdate = now;

      game.pong.update(
        deltaTime,
        game.leftInput.up,
        game.leftInput.down,
        game.rightInput.up,
        game.rightInput.down
      );

      // Get game state for both updates and cleanup check
      const state = game.pong.getState();

      // Envoyer l'état aux joueurs via WebSocket (only if WebSocketManager available)
      if (this.wsManager) {
        // Send appropriate message type based on game ID pattern
        const messageType = game.id.startsWith('pong_') ? 'simple_pong_state' : 'friend_pong_state';

        this.wsManager.sendToUser(game.leftPlayerId, {
          type: messageType,
          gameId: game.id,
          gameState: state // Use gameState for simple_pong compatibility
        });

        this.wsManager.sendToUser(game.rightPlayerId, {
          type: messageType,
          gameId: game.id,
          gameState: state // Use gameState for simple_pong compatibility
        });
      }

      // Collect finished games for cleanup
      if (state.gameOver) {
        console.log(`🏁 [SimplePongManager] Jeu ${game.id} terminé: left=${state.leftScore}, right=${state.rightScore}, winner=${state.winner}`);
        finishedGames.push(game.id);
      }
    }

    // Clean up finished games after a delay, but protect new games
    finishedGames.forEach(gameId => {
      const game = this.games.get(gameId);
      if (game) {
        const gameAge = Date.now() - game.lastUpdate;
        if (gameAge < 5000) { // Protéger les jeux créés il y a moins de 5 secondes
          console.log(`🛡️ [SimplePongManager] Protection: Jeu ${gameId} trop récent pour être supprimé (âge: ${gameAge}ms)`);
          return;
        }
      }
      setTimeout(() => this.endGame(gameId), 3000);
    });

    // Debug logging
    console.log(`🔄 [SimplePongManager] Update cycle: ${gamesProcessed} games processed, ${this.games.size} total games, WebSocket: ${this.wsManager ? 'available' : 'unavailable'}`);

    // Auto-stop loop if no games remaining
    if (this.games.size === 0) {
      this.stopUpdateLoop();
    }
  }

  private endGameForPlayer(playerId: number): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      console.log(`🧹 [SimplePongManager] Nettoyage ancien jeu pour player ${playerId}: ${gameId}`);
      this.endGame(gameId);
    } else {
      console.log(`🧹 [SimplePongManager] Pas d'ancien jeu à nettoyer pour player ${playerId}`);
    }
  }

  private endGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    console.log(`🛑 [SimplePongManager] Fin de partie SimplePong: ${gameId}`);
    console.log(`🛑 [SimplePongManager] Raison: Appelé depuis`, new Error().stack?.split('\n')[2]?.trim());

    // Nettoyer le timer de déconnexion si il existe
    const timer = this.disconnectionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectionTimers.delete(gameId);
      console.log(`🛑 [SimplePongManager] Timer de déconnexion nettoyé pour ${gameId}`);
    }

    // Notifier les joueurs de la fin
    if (this.wsManager) {
      const messageType = gameId.startsWith('pong_') ? 'simple_pong_end' : 'friend_pong_end';

      this.wsManager.sendToUser(game.leftPlayerId, {
        type: messageType,
        gameId,
        gameState: game.pong.getState() // Include final state
      });

      this.wsManager.sendToUser(game.rightPlayerId, {
        type: messageType,
        gameId,
        gameState: game.pong.getState() // Include final state
      });
    }

    this.playerToGame.delete(game.leftPlayerId);
    this.playerToGame.delete(game.rightPlayerId);
    this.games.delete(gameId);
    
    console.log(`🛑 [SimplePongManager] Jeu ${gameId} supprimé. Jeux restants: ${this.games.size}`);
  }

  // Méthode pour gérer les déconnexions
  handlePlayerDisconnect(playerId: number): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (!game) return;

      console.log(`🔌 [SimplePongManager] Player ${playerId} disconnected from game ${gameId}`);
      
      // Annuler un timer existant si il y en a un
      const existingTimer = this.disconnectionTimers.get(gameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectionTimers.delete(gameId);
        console.log(`🔌 [SimplePongManager] Timer de déconnexion existant annulé pour ${gameId}`);
      }
      
      // Vérifier si l'autre joueur est toujours connecté
      const otherPlayerId = game.leftPlayerId === playerId ? game.rightPlayerId : game.leftPlayerId;
      const otherPlayerConnected = this.wsManager?.hasUser(otherPlayerId);
      
      if (otherPlayerConnected) {
        console.log(`🔌 [SimplePongManager] Autre joueur ${otherPlayerId} toujours connecté, délai de grâce de 10 secondes`);
        
        // Créer un nouveau timer avec délai de grâce
        const timer = setTimeout(() => {
          // Vérifier si le joueur s'est reconnecté entre temps
          const currentGame = this.games.get(gameId);
          if (currentGame && !this.wsManager?.hasUser(playerId)) {
            console.log(`🔌 [SimplePongManager] Player ${playerId} toujours déconnecté après délai de grâce`);
            this.disconnectionTimers.delete(gameId);
            this.endGame(gameId);
          } else if (currentGame) {
            console.log(`🔌 [SimplePongManager] Player ${playerId} s'est reconnecté, jeu ${gameId} conservé`);
            this.disconnectionTimers.delete(gameId);
          }
        }, 10000); // 10 secondes de délai de grâce
        
        this.disconnectionTimers.set(gameId, timer);
      } else {
        // Tous les joueurs sont déconnectés - mais on garde le jeu avec un délai de grâce
        console.log(`🔌 [SimplePongManager] Tous les joueurs déconnectés, délai de grâce de 10 secondes pour ${gameId}`);
        
        // Créer un timer pour laisser le temps aux joueurs de se reconnecter
        const timer = setTimeout(() => {
          const currentGame = this.games.get(gameId);
          if (currentGame) {
            // Vérifier si au moins un joueur s'est reconnecté
            const leftConnected = this.wsManager?.hasUser(currentGame.leftPlayerId);
            const rightConnected = this.wsManager?.hasUser(currentGame.rightPlayerId);
            
            if (!leftConnected && !rightConnected) {
              console.log(`🔌 [SimplePongManager] Aucun joueur reconnecté après délai de grâce, fin du jeu ${gameId}`);
              this.disconnectionTimers.delete(gameId);
              this.endGame(gameId);
            } else {
              console.log(`🔌 [SimplePongManager] Au moins un joueur s'est reconnecté, jeu ${gameId} conservé`);
              this.disconnectionTimers.delete(gameId);
            }
          }
        }, 10000); // 10 secondes de délai de grâce
        
        this.disconnectionTimers.set(gameId, timer);
      }
    }
  }
}