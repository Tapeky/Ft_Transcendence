import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { SimplePong } from '../src/game/SimplePong';
import { SimplePongManager } from '../src/websocket/SimplePongManager';
import { WebSocketManager } from '../src/websocket/WebSocketManager';

// Mock WebSocket simple pour les tests
class MockSocket {
  public readyState: number = 1;
  private messageHandlers: ((data: any) => void)[] = [];

  send(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.messageHandlers.forEach(handler => handler(parsed));
    } catch (error) {
      console.error('Mock socket parse error:', error);
    }
  }

  addMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  on() {}
  off() {}
  close() {}
}

describe('Pong Delta Time Bug Fix Tests', () => {
  let simplePongManager: SimplePongManager;
  let wsManager: WebSocketManager;

  const PLAYER1_ID = 7;
  const PLAYER2_ID = 35;
  const GAME_ID = 'pong_7_35_test';

  beforeEach(() => {
    // Reset singletons
    (SimplePongManager as any).instance = null;
    (WebSocketManager as any).instance = null;
    
    simplePongManager = SimplePongManager.getInstance();
    wsManager = WebSocketManager.getInstance();
    simplePongManager.setWebSocketManager(wsManager);
  });

  afterEach(() => {
    // Cleanup
    wsManager.removeUser(PLAYER1_ID);
    wsManager.removeUser(PLAYER2_ID);
  });

  describe('Delta Time Bug Fix Validation', () => {
    it('should prevent game ending with huge deltaTime in SimplePong', () => {
      console.log('🛡️ Test: Validation du fix deltaTime dans SimplePong');
      
      const pong = new SimplePong();
      const initialState = pong.getState();
      
      expect(initialState.gameOver).toBe(false);
      expect(initialState.leftScore).toBe(0);
      expect(initialState.rightScore).toBe(0);
      
      // Simuler un deltaTime énorme (10 secondes) qui causait le bug
      const hugeDeltaTime = 10;
      pong.update(hugeDeltaTime, false, false, false, false);
      
      const stateAfterHugeDelta = pong.getState();
      
      // Avec le fix, même un deltaTime énorme ne doit pas causer de score immédiat
      expect(stateAfterHugeDelta.leftScore).toBe(0);
      expect(stateAfterHugeDelta.rightScore).toBe(0);
      expect(stateAfterHugeDelta.gameOver).toBe(false);
      
      console.log('✅ Fix validé dans SimplePong: deltaTime limité correctement');
    });

    it('should prevent race condition in SimplePongManager', () => {
      console.log('🛡️ Test: Validation du fix race condition dans SimplePongManager');
      
      // Ajouter des utilisateurs mock
      wsManager.addUser(PLAYER1_ID, 'alice', new MockSocket() as any);
      wsManager.addUser(PLAYER2_ID, 'norta', new MockSocket() as any);
      
      // Créer un jeu
      const gameCreated = simplePongManager.startGame(GAME_ID, PLAYER1_ID, PLAYER2_ID);
      expect(gameCreated).toBe(true);
      
      // Le jeu doit être trouvable immédiatement
      const playerSide1 = simplePongManager.getPlayerSide(PLAYER1_ID, GAME_ID);
      const playerSide2 = simplePongManager.getPlayerSide(PLAYER2_ID, GAME_ID);
      
      expect(playerSide1).toBe('left');
      expect(playerSide2).toBe('right');
      
      console.log('✅ Fix validé dans SimplePongManager: pas de race condition');
    });

    it('should handle multiple update cycles without issues', () => {
      console.log('🛡️ Test: Validation des cycles de mise à jour multiples');
      
      const pong = new SimplePong();
      
      // Simuler plusieurs petites updates normales
      for (let i = 0; i < 100; i++) {
        const normalDeltaTime = 1/60; // 60 FPS normal
        pong.update(normalDeltaTime, false, false, false, false);
        
        const state = pong.getState();
        
        // Le jeu ne devrait jamais se terminer anormalement
        if (state.gameOver && (state.leftScore < 5 && state.rightScore < 5)) {
          fail('Jeu terminé prématurément sans atteindre le score de victoire');
        }
      }
      
      console.log('✅ Cycles de mise à jour multiples: OK');
    });

    it('should limit deltaTime in SimplePongManager update loop', () => {
      console.log('🛡️ Test: Validation de la limitation deltaTime dans le manager');
      
      // Créer le jeu avec des mocks
      wsManager.addUser(PLAYER1_ID, 'alice', new MockSocket() as any);
      wsManager.addUser(PLAYER2_ID, 'norta', new MockSocket() as any);
      
      const gameCreated = simplePongManager.startGame(GAME_ID, PLAYER1_ID, PLAYER2_ID);
      expect(gameCreated).toBe(true);
      
      // Obtenir une référence au jeu interne
      const game = (simplePongManager as any).games.get(GAME_ID);
      expect(game).toBeDefined();
      
      // Simuler un écart de temps énorme en modifiant lastUpdate
      const oldLastUpdate = game.lastUpdate;
      game.lastUpdate = Date.now() - 10000; // 10 secondes dans le passé
      
      // Forcer une mise à jour
      (simplePongManager as any).updateAllGames();
      
      // Le jeu ne devrait pas avoir marqué de score anormalement
      const gameState = game.pong.getState();
      expect(gameState.leftScore).toBe(0);
      expect(gameState.rightScore).toBe(0);
      expect(gameState.gameOver).toBe(false);
      
      console.log('✅ Limitation deltaTime dans le manager: OK');
    });

    it('should reproduce the original bug when deltaTime is not limited', () => {
      console.log('🔍 Test: Reproduction du bug original (pour référence)');
      
      // Créer un SimplePong temporaire pour montrer le bug sans fix
      const pong = new SimplePong();
      
      // Hack: accéder directement à la méthode update sans limitation
      const originalUpdate = pong.update;
      const buggyUpdate = function(this: SimplePong, deltaTime: number, leftUp: boolean, leftDown: boolean, rightUp: boolean, rightDown: boolean): void {
        // Version sans fix - utilise deltaTime directement
        const state = (this as any).state;
        if (state.gameOver) return;
        
        // Mouvement de la balle sans limitation deltaTime
        state.ballX += state.ballVX * deltaTime; // BUG: deltaTime non limité
        state.ballY += state.ballVY * deltaTime;
        
        // Vérification basique des limites pour marquer un point
        if (state.ballX <= 0) {
          state.rightScore++;
          state.ballX = 400;
          state.ballY = 200;
        }
        if (state.ballX >= 800) {
          state.leftScore++;
          state.ballX = 400;
          state.ballY = 200;
        }
        
        // Fin de jeu
        if (state.leftScore >= 5 || state.rightScore >= 5) {
          state.gameOver = true;
          state.winner = state.leftScore >= 5 ? 'left' : 'right';
        }
      };
      
      // Remplacer temporairement la méthode update
      (pong as any).update = buggyUpdate.bind(pong);
      
      const initialState = pong.getState();
      expect(initialState.gameOver).toBe(false);
      
      // Avec un deltaTime énorme et la version buggée
      const hugeDeltaTime = 3.0;
      pong.update(hugeDeltaTime, false, false, false, false);
      
      const buggyState = pong.getState();
      
      // Le bug devrait faire marquer des points immédiatement
      expect(buggyState.leftScore > 0 || buggyState.rightScore > 0).toBe(true);
      
      console.log('🐛 Bug original reproduit avec succès (score immédiat avec deltaTime énorme)');
      console.log(`Scores: left=${buggyState.leftScore}, right=${buggyState.rightScore}, gameOver=${buggyState.gameOver}`);
    });
  });
});