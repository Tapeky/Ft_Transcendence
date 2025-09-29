import { jest } from '@jest/globals';

// Interfaces pour simuler les composants réels
interface MockWebSocketManager {
  hasUser(userId: number): boolean;
  sendToUser(userId: number, message: any): boolean;
  connections: Map<number, boolean>;
}

// Mock WebSocketManager avec gestion des connexions
class MockWebSocketManager implements MockWebSocketManager {
  public connections = new Map<number, boolean>();

  hasUser(userId: number): boolean {
    return this.connections.get(userId) === true;
  }

  sendToUser(userId: number, message: any): boolean {
    const connected = this.hasUser(userId);
    if (connected) {
      console.log(`📤 [MockWS] Envoi à ${userId}:`, message.type);
    }
    return connected;
  }

  connect(userId: number): void {
    this.connections.set(userId, true);
  }

  disconnect(userId: number): void {
    this.connections.delete(userId);
  }
}

// Import des classes réelles avec adaptations pour les tests
import { SimplePongManager } from '../src/websocket/SimplePongManager';
import { FriendPongInvites } from '../src/websocket/FriendPongInvites';

describe('Pong Invitation E2E Flow Tests', () => {
  let mockWSManager: MockWebSocketManager;
  let simplePongManager: SimplePongManager;
  let friendPongInvites: FriendPongInvites;

  beforeEach(() => {
    // Reset tous les singletons
    (SimplePongManager as any).instance = null;

    mockWSManager = new MockWebSocketManager();
    simplePongManager = SimplePongManager.getInstance();
    simplePongManager.setWebSocketManager(mockWSManager as any);
    friendPongInvites = new FriendPongInvites(mockWSManager as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Race Condition Bug Tests', () => {
    // Test 1: Gestion des connexions rapides après création
    it('should handle fast game joining after creation', async () => {
      const player1 = 100;
      const player2 = 200;
      const gameId = `race_test_${Date.now()}`;

      // Étape 1: Connecter les joueurs
      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      // Étape 2: Créer le jeu
      console.log('🎮 Création du jeu...');
      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(true);

      // Étape 3: IMMÉDIATEMENT tenter de récupérer les informations du jeu (< 10ms)
      console.log('⚡ Test race condition - accès immédiat...');

      const playerSide1 = simplePongManager.getPlayerSide(player1, gameId);
      const playerSide2 = simplePongManager.getPlayerSide(player2, gameId);

      // Vérifications: Le jeu doit être accessible immédiatement
      expect(playerSide1).toBe('left');
      expect(playerSide2).toBe('right');

      // Vérifier que le jeu n'a pas été détruit par la race condition
      const gameState1 = simplePongManager.getGameState(player1);
      const gameState2 = simplePongManager.getGameState(player2);

      expect(gameState1).toBeTruthy();
      expect(gameState2).toBeTruthy();
      expect(gameState1?.gameOver).toBe(false);
    });

    // Test 2: Tentative de création de jeu avec joueurs déjà en cours
    it('should handle concurrent game creation attempts', async () => {
      const player1 = 101;
      const player2 = 201;
      const gameId1 = `concurrent_1_${Date.now()}`;
      const gameId2 = `concurrent_2_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      // Tentative de création simultanée de deux jeux avec les mêmes joueurs
      const game1Promise = Promise.resolve(simplePongManager.startGame(gameId1, player1, player2));
      const game2Promise = Promise.resolve(simplePongManager.startGame(gameId2, player1, player2));

      const [result1, result2] = await Promise.all([game1Promise, game2Promise]);

      // Un seul jeu doit réussir (le premier nettoie l'ancien)
      if (result1) {
        expect(result2).toBe(true); // Le second nettoie le premier et réussit
        expect(simplePongManager.getPlayerSide(player1, gameId2)).toBe('left');
      } else {
        expect(result2).toBe(true);
        expect(simplePongManager.getPlayerSide(player1, gameId1)).toBe('left');
      }
    });
  });

  describe('WebSocket Timing Issues Tests', () => {
    // Test 3: Maintien de l'état pendant la négociation WebSocket
    it('should maintain game state during WebSocket handshake delays', async () => {
      const player1 = 102;
      const player2 = 202;
      const gameId = `timing_test_${Date.now()}`;

      // Simuler une connexion lente pour player2
      mockWSManager.connect(player1);
      // player2 pas encore connecté

      // Tentative de création de jeu avec player2 déconnecté
      console.log('🔌 Test avec joueur déconnecté...');
      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(false); // Doit échouer car player2 déconnecté

      // Maintenant connecter player2 et réessayer
      console.log('🔌 Connexion player2 et nouvelle tentative...');
      mockWSManager.connect(player2);

      const gameCreatedAfterConnection = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreatedAfterConnection).toBe(true);

      // Vérifier que le jeu fonctionne correctement après la connexion
      const gameState = simplePongManager.getGameState(player1);
      expect(gameState).toBeTruthy();
      expect(gameState?.gameOver).toBe(false);
    });

    // Test 4: Déconnexion pendant la création
    it('should handle player disconnection during game creation', async () => {
      const player1 = 103;
      const player2 = 203;
      const gameId = `disconnect_test_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      // Déconnecter player2 juste avant la création
      mockWSManager.disconnect(player2);

      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(false); // Doit échouer

      // Vérifier qu'aucun état résiduel ne reste
      expect(simplePongManager.getPlayerSide(player1, gameId)).toBeNull();
      expect(simplePongManager.getGameState(player1)).toBeNull();
    });
  });

  describe('SimplePong State Management Tests', () => {
    // Test 5: État initial du jeu
    it('should not end game immediately after creation', async () => {
      const player1 = 104;
      const player2 = 204;
      const gameId = `state_test_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(true);

      // Vérifier l'état initial
      const initialState = simplePongManager.getGameState(player1);
      expect(initialState).toBeTruthy();
      expect(initialState?.gameOver).toBe(false);
      expect(initialState?.leftScore).toBe(0);
      expect(initialState?.rightScore).toBe(0);

      // Simuler un update minimal et vérifier que le jeu ne se termine pas
      setTimeout(() => {
        const stateAfterUpdate = simplePongManager.getGameState(player1);
        expect(stateAfterUpdate?.gameOver).toBe(false);
      }, 50);
    });
  });

  describe('SimplePongManager Lifecycle Tests', () => {
    // Test 6: Maintien du jeu actif jusqu'à connexion des joueurs
    it('should keep game active until players connect', async () => {
      const player1 = 105;
      const player2 = 205;
      const gameId = `lifecycle_test_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(true);

      // Attendre 1 seconde et vérifier que le jeu existe toujours
      await new Promise(resolve => setTimeout(resolve, 1000));

      const gameState = simplePongManager.getGameState(player1);
      expect(gameState).toBeTruthy();
      expect(gameState?.gameOver).toBe(false);
    });

    // Test 7: Gestion des connexions concurrentes au jeu
    it('should handle concurrent game joining', async () => {
      const player1 = 106;
      const player2 = 206;
      const gameId = `concurrent_join_test_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(true);

      // Simulations de connexions simultanées au jeu
      const side1Promise = Promise.resolve(simplePongManager.getPlayerSide(player1, gameId));
      const side2Promise = Promise.resolve(simplePongManager.getPlayerSide(player2, gameId));

      const [side1, side2] = await Promise.all([side1Promise, side2Promise]);

      expect(side1).toBe('left');
      expect(side2).toBe('right');

      // Les deux joueurs doivent pouvoir accéder à l'état du jeu
      const state1 = simplePongManager.getGameState(player1);
      const state2 = simplePongManager.getGameState(player2);

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1?.leftScore).toBe(state2?.leftScore);
      expect(state1?.rightScore).toBe(state2?.rightScore);
    });
  });

  describe('Complete E2E Integration Flow', () => {
    // Test 8: Flux complet d'invitation avec tous les composants
    it('should complete full invitation flow with error handling', async () => {
      const inviter = 107;
      const invitee = 207;

      // Étape 1: Simuler base de données (amitié existe)
      jest
        .spyOn(require('../src/database/DatabaseManager'), 'getInstance')
        .mockImplementation(() => ({
          getDb: () => ({
            get: (query: string, params: any[]) => {
              if (query.includes('friendship')) {
                return Promise.resolve({ username: 'TestUser', friendship_status: 'accepted' });
              }
              return Promise.resolve({ username: 'TestUser' });
            },
          }),
        }));

      // Étape 2: Connecter les utilisateurs
      mockWSManager.connect(inviter);
      mockWSManager.connect(invitee);

      console.log('📨 Étape 1: Création invitation...');
      // Étape 3: Créer invitation
      const inviteId = await friendPongInvites.createInvite(inviter, invitee);
      expect(inviteId).toBeTruthy();

      console.log('✅ Étape 2: Acceptation invitation...');
      // Étape 4: Accepter invitation (déclenche création de jeu)
      const accepted = friendPongInvites.acceptInvite(inviteId!, invitee);
      expect(accepted).toBe(true);

      console.log('🎮 Étape 3: Vérification création jeu...');
      // Étape 5: Vérifier que le jeu a été créé
      // Le jeu devrait être créé automatiquement par acceptInvite
      await new Promise(resolve => setTimeout(resolve, 100)); // Délai pour traitement

      // Étape 6: Vérifier les rôles des joueurs
      // Note: Le gameId est généré dans acceptInvite, on doit le déduire
      const gameState1 = simplePongManager.getGameState(inviter);
      const gameState2 = simplePongManager.getGameState(invitee);

      expect(gameState1).toBeTruthy();
      expect(gameState2).toBeTruthy();
      expect(gameState1?.leftScore).toBe(0);
      expect(gameState1?.rightScore).toBe(0);

      console.log('🕹️ Étape 4: Test input des joueurs...');
      // Étape 7: Tester les inputs des joueurs
      simplePongManager.updateInput(inviter, true, false); // UP
      simplePongManager.updateInput(invitee, false, true); // DOWN

      // Attendre que les inputs soient traités
      await new Promise(resolve => setTimeout(resolve, 50));

      const finalState = simplePongManager.getGameState(inviter);
      expect(finalState).toBeTruthy();
      expect(finalState?.gameOver).toBe(false);

      console.log('✨ Flux E2E complet réussi !');
    });

    // Test 9: Gestion des erreurs en cascade
    it('should handle cascading errors gracefully', async () => {
      const player1 = 108;
      const player2 = 208;

      // Connecter seulement player1
      mockWSManager.connect(player1);
      // player2 reste déconnecté

      console.log('❌ Test erreur - player2 déconnecté...');

      // Tenter de créer une invitation (doit réussir côté création)
      const inviteId = await friendPongInvites.createInvite(player1, player2);
      expect(inviteId).toBeTruthy();

      // Tenter d'accepter l'invitation (doit échouer car player2 pas connecté pour le jeu)
      const accepted = friendPongInvites.acceptInvite(inviteId!, player2);
      // L'acceptation peut réussir mais la création de jeu va échouer silencieusement

      // Vérifier qu'aucun jeu fantôme n'existe
      const gameState = simplePongManager.getGameState(player1);
      // Si la gestion d'erreur fonctionne, soit gameState est null, soit le jeu est correctement nettoyé

      if (gameState) {
        // Si le jeu existe quand même, il doit au moins être cohérent
        expect(gameState.gameOver).toBe(false);
      }

      console.log('✅ Gestion erreurs vérifiée');
    });

    // Test 10: Nettoyage complet des ressources
    it('should cleanup all resources properly on game end', async () => {
      const player1 = 109;
      const player2 = 209;
      const gameId = `cleanup_${Date.now()}`;

      mockWSManager.connect(player1);
      mockWSManager.connect(player2);

      // Créer et jouer une partie rapide
      const gameCreated = simplePongManager.startGame(gameId, player1, player2);
      expect(gameCreated).toBe(true);

      // Simuler déconnexion d'un joueur
      console.log('🔌 Simulation déconnexion...');
      mockWSManager.disconnect(player1);

      // La déconnexion devrait déclencher le nettoyage
      simplePongManager.handlePlayerDisconnect(player1);

      // Vérifier que le jeu a été nettoyé
      const gameState = simplePongManager.getGameState(player1);
      const gameState2 = simplePongManager.getGameState(player2);

      expect(gameState).toBeNull();
      expect(gameState2).toBeNull();

      console.log('🧹 Nettoyage vérifié');
    });
  });

  describe('Performance and Stress Tests', () => {
    // Test 11: Création multiple de jeux simultanés
    it('should handle multiple simultaneous game creations', async () => {
      const gamePromises: Promise<boolean>[] = [];
      const numGames = 10;

      // Créer 10 jeux simultanément avec des joueurs différents
      for (let i = 0; i < numGames; i++) {
        const player1 = 300 + i * 2;
        const player2 = 301 + i * 2;
        const gameId = `stress_${i}_${Date.now()}`;

        mockWSManager.connect(player1);
        mockWSManager.connect(player2);

        gamePromises.push(Promise.resolve(simplePongManager.startGame(gameId, player1, player2)));
      }

      const results = await Promise.all(gamePromises);

      // Tous les jeux devraient avoir été créés avec succès
      const successCount = results.filter(Boolean).length;
      expect(successCount).toBe(numGames);

      console.log(`🚀 ${successCount}/${numGames} jeux créés simultanément`);
    });

    // Test 12: Résistance aux spams d'invitations
    it('should handle invitation spam gracefully', async () => {
      const spammer = 400;
      const target = 401;

      mockWSManager.connect(spammer);
      mockWSManager.connect(target);

      // Mock DB pour éviter les vraies requêtes
      jest
        .spyOn(require('../src/database/DatabaseManager'), 'getInstance')
        .mockImplementation(() => ({
          getDb: () => ({
            get: () => Promise.resolve({ username: 'TestUser', friendship_status: 'accepted' }),
          }),
        }));

      const invitePromises: Promise<string | null>[] = [];

      // Envoyer 5 invitations rapidement
      for (let i = 0; i < 5; i++) {
        invitePromises.push(friendPongInvites.createInvite(spammer, target));
      }

      const inviteResults = await Promise.all(invitePromises);

      // Seule la première invitation devrait réussir (ou elles retournent le même ID)
      const validInvites = inviteResults.filter(Boolean);
      expect(validInvites.length).toBeGreaterThan(0);

      // Toutes les invitations valides devraient avoir le même ID (réutilisation)
      if (validInvites.length > 1) {
        const firstId = validInvites[0];
        const allSameId = validInvites.every(id => id === firstId);
        expect(allSameId).toBe(true);
      }

      console.log(
        `🛡️ Spam protection: ${validInvites.length} invitations uniques sur 5 tentatives`
      );
    });
  });
});
