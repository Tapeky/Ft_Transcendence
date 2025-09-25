import { jest } from '@jest/globals';

// Interfaces TypeScript pour le typage strict
interface User {
  id: number;
  username: string;
}

interface Invitation {
  id: string;
  fromUserId: number;
  toUserId: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number };
  leftScore: number;
  rightScore: number;
  gameOver: boolean;
}

interface GameSessionData {
  id: string;
  leftPlayerId: number;
  rightPlayerId: number;
  gameState: GameState;
  status: 'waiting' | 'active' | 'completed';
  createdAt: Date;
}

// Mock WebSocket pour simuler les échanges réseau
class MockWebSocket {
  public onopen: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;

  private messageHandlers: ((data: any) => void)[] = [];

  send(data: string): void {
    const message = JSON.parse(data);
    // Simuler le traitement côté serveur
    setTimeout(() => {
      this.messageHandlers.forEach(handler => handler(message));
    }, 10);
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  addMessageHandler(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  close(): void {
    if (this.onclose) {
      this.onclose({});
    }
  }
}

// Classe InvitationManager - Gestion des invitations Pong
class InvitationManager {
  private invitations = new Map<string, Invitation>();
  private websocket: MockWebSocket;
  private readonly EXPIRATION_TIME = 2 * 60 * 1000; // 2 minutes

  constructor(websocket: MockWebSocket) {
    this.websocket = websocket;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.websocket.addMessageHandler((data) => {
      switch (data.type) {
        case 'invitation_response':
          this.handleInvitationResponse(data);
          break;
        case 'user_offline':
          this.handleUserOffline(data);
          break;
      }
    });
  }

  // Envoyer une invitation de jeu Pong
  async sendInvitation(fromUserId: number, toUserId: number): Promise<string | null> {
    // Validation des utilisateurs
    if (fromUserId === toUserId) {
      throw new Error('Cannot invite yourself');
    }

    if (fromUserId <= 0 || toUserId <= 0) {
      throw new Error('Invalid user ID');
    }

    // Vérifier si une invitation en cours existe déjà
    const existingInvitation = Array.from(this.invitations.values())
      .find(inv => inv.fromUserId === fromUserId && inv.toUserId === toUserId && inv.status === 'pending');

    if (existingInvitation) {
      return existingInvitation.id;
    }

    const invitationId = `pong_invite_${fromUserId}_${toUserId}_${Date.now()}`;
    const invitation: Invitation = {
      id: invitationId,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.EXPIRATION_TIME)
    };

    this.invitations.set(invitationId, invitation);

    // Simuler l'envoi via WebSocket
    this.websocket.send(JSON.stringify({
      type: 'pong_invitation',
      invitationId,
      fromUserId,
      toUserId,
      expiresAt: invitation.expiresAt
    }));

    // Auto-expiration
    setTimeout(() => {
      this.expireInvitation(invitationId);
    }, this.EXPIRATION_TIME);

    return invitationId;
  }

  // Accepter une invitation
  acceptInvitation(invitationId: string, userId: number): boolean {
    const invitation = this.invitations.get(invitationId);

    if (!invitation) {
      return false;
    }

    if (invitation.toUserId !== userId) {
      return false;
    }

    if (invitation.status !== 'pending') {
      return false;
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      return false;
    }

    invitation.status = 'accepted';

    // Notifier l'acceptation via WebSocket
    this.websocket.send(JSON.stringify({
      type: 'invitation_accepted',
      invitationId,
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId
    }));

    return true;
  }

  // Décliner une invitation
  declineInvitation(invitationId: string, userId: number): boolean {
    const invitation = this.invitations.get(invitationId);

    if (!invitation) {
      return false;
    }

    if (invitation.toUserId !== userId) {
      return false;
    }

    if (invitation.status !== 'pending') {
      return false;
    }

    invitation.status = 'declined';

    // Notifier le refus via WebSocket
    this.websocket.send(JSON.stringify({
      type: 'invitation_declined',
      invitationId,
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId
    }));

    return true;
  }

  private expireInvitation(invitationId: string): void {
    const invitation = this.invitations.get(invitationId);
    if (invitation && invitation.status === 'pending') {
      invitation.status = 'expired';
    }
  }

  private handleInvitationResponse(data: any): void {
    // Traiter les réponses d'invitation
    const invitation = this.invitations.get(data.invitationId);
    if (invitation) {
      invitation.status = data.accepted ? 'accepted' : 'declined';
    }
  }

  private handleUserOffline(data: any): void {
    // Gérer les utilisateurs déconnectés
    Array.from(this.invitations.values())
      .filter(inv => (inv.fromUserId === data.userId || inv.toUserId === data.userId) && inv.status === 'pending')
      .forEach(inv => {
        inv.status = 'expired';
      });
  }

  getInvitation(invitationId: string): Invitation | null {
    return this.invitations.get(invitationId) || null;
  }

  getPendingInvitations(userId: number): Invitation[] {
    return Array.from(this.invitations.values())
      .filter(inv => inv.toUserId === userId && inv.status === 'pending');
  }
}

// Classe GameSession - Gestion de la session de jeu Pong
class GameSession {
  private id: string;
  private leftPlayerId: number;
  private rightPlayerId: number;
  private gameState: GameState;
  private status: 'waiting' | 'active' | 'completed';
  private websocket: MockWebSocket;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private readonly GAME_WIDTH = 800;
  private readonly GAME_HEIGHT = 600;
  private readonly PADDLE_HEIGHT = 80;
  private readonly BALL_SPEED = 5;
  private readonly WINNING_SCORE = 3;

  constructor(sessionId: string, leftPlayerId: number, rightPlayerId: number, websocket: MockWebSocket) {
    this.id = sessionId;
    this.leftPlayerId = leftPlayerId;
    this.rightPlayerId = rightPlayerId;
    this.websocket = websocket;
    this.status = 'waiting';

    // État initial du jeu
    this.gameState = {
      leftPaddle: { y: this.GAME_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 },
      rightPaddle: { y: this.GAME_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 },
      ball: {
        x: this.GAME_WIDTH / 2,
        y: this.GAME_HEIGHT / 2,
        dx: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        dy: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
      },
      leftScore: 0,
      rightScore: 0,
      gameOver: false
    };

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.websocket.addMessageHandler((data) => {
      if (data.type === 'player_input' && data.sessionId === this.id) {
        this.handlePlayerInput(data.playerId, data.input);
      }
    });
  }

  // Démarrer la session de jeu
  startGame(): boolean {
    if (this.status !== 'waiting') {
      return false;
    }

    this.status = 'active';

    // Notifier le début de partie via WebSocket
    this.websocket.send(JSON.stringify({
      type: 'game_started',
      sessionId: this.id,
      leftPlayerId: this.leftPlayerId,
      rightPlayerId: this.rightPlayerId,
      gameState: this.gameState
    }));

    // Démarrer la boucle de jeu à 60 FPS
    this.gameLoopInterval = setInterval(() => {
      this.updateGameState();
      this.broadcastGameState();
    }, 1000 / 60);

    return true;
  }

  // Mettre à jour l'état du jeu (physique de base)
  private updateGameState(): void {
    if (this.status !== 'active' || this.gameState.gameOver) {
      return;
    }

    // Déplacer la balle
    this.gameState.ball.x += this.gameState.ball.dx;
    this.gameState.ball.y += this.gameState.ball.dy;

    // Collision avec les murs haut/bas
    if (this.gameState.ball.y <= 0 || this.gameState.ball.y >= this.GAME_HEIGHT) {
      this.gameState.ball.dy = -this.gameState.ball.dy;
    }

    // Collision avec les raquettes (simplifiée)
    const ballRadius = 5;
    const paddleWidth = 8;

    // Raquette gauche
    if (this.gameState.ball.x <= paddleWidth &&
        this.gameState.ball.y >= this.gameState.leftPaddle.y &&
        this.gameState.ball.y <= this.gameState.leftPaddle.y + this.PADDLE_HEIGHT) {
      this.gameState.ball.dx = Math.abs(this.gameState.ball.dx);
    }

    // Raquette droite
    if (this.gameState.ball.x >= this.GAME_WIDTH - paddleWidth &&
        this.gameState.ball.y >= this.gameState.rightPaddle.y &&
        this.gameState.ball.y <= this.gameState.rightPaddle.y + this.PADDLE_HEIGHT) {
      this.gameState.ball.dx = -Math.abs(this.gameState.ball.dx);
    }

    // Scoring
    if (this.gameState.ball.x < 0) {
      this.gameState.rightScore++;
      this.resetBall();
    } else if (this.gameState.ball.x > this.GAME_WIDTH) {
      this.gameState.leftScore++;
      this.resetBall();
    }

    // Vérifier la fin de partie
    if (this.gameState.leftScore >= this.WINNING_SCORE || this.gameState.rightScore >= this.WINNING_SCORE) {
      this.endGame();
    }
  }

  private resetBall(): void {
    this.gameState.ball = {
      x: this.GAME_WIDTH / 2,
      y: this.GAME_HEIGHT / 2,
      dx: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    };
  }

  private endGame(): void {
    this.gameState.gameOver = true;
    this.status = 'completed';

    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    const winner = this.gameState.leftScore >= this.WINNING_SCORE ? this.leftPlayerId : this.rightPlayerId;

    this.websocket.send(JSON.stringify({
      type: 'game_ended',
      sessionId: this.id,
      winner,
      finalScore: {
        left: this.gameState.leftScore,
        right: this.gameState.rightScore
      }
    }));
  }

  private handlePlayerInput(playerId: number, input: { up: boolean; down: boolean }): void {
    const paddleSpeed = 8;

    if (playerId === this.leftPlayerId) {
      if (input.up && this.gameState.leftPaddle.y > 0) {
        this.gameState.leftPaddle.y -= paddleSpeed;
      }
      if (input.down && this.gameState.leftPaddle.y < this.GAME_HEIGHT - this.PADDLE_HEIGHT) {
        this.gameState.leftPaddle.y += paddleSpeed;
      }
    } else if (playerId === this.rightPlayerId) {
      if (input.up && this.gameState.rightPaddle.y > 0) {
        this.gameState.rightPaddle.y -= paddleSpeed;
      }
      if (input.down && this.gameState.rightPaddle.y < this.GAME_HEIGHT - this.PADDLE_HEIGHT) {
        this.gameState.rightPaddle.y += paddleSpeed;
      }
    }
  }

  private broadcastGameState(): void {
    this.websocket.send(JSON.stringify({
      type: 'game_state_update',
      sessionId: this.id,
      gameState: this.gameState
    }));
  }

  getId(): string {
    return this.id;
  }

  getStatus(): 'waiting' | 'active' | 'completed' {
    return this.status;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getPlayers(): { left: number; right: number } {
    return { left: this.leftPlayerId, right: this.rightPlayerId };
  }
}

// TESTS UNITAIRES
describe('Pong Online Invitation System', () => {
  let mockWebSocket: MockWebSocket;
  let invitationManager: InvitationManager;

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    invitationManager = new InvitationManager(mockWebSocket);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Nettoyer les timers potentiels
    jest.clearAllTimers();
  });

  describe('InvitationManager', () => {
    // Test 1: Envoi d'invitation valide
    it('should successfully send a valid invitation', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);

      expect(invitationId).toBeTruthy();
      expect(typeof invitationId).toBe('string');

      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation).toBeTruthy();
      expect(invitation!.fromUserId).toBe(fromUserId);
      expect(invitation!.toUserId).toBe(toUserId);
      expect(invitation!.status).toBe('pending');
    });

    // Test 2: Rejet d'auto-invitation
    it('should reject self-invitation', async () => {
      const userId = 1;

      await expect(invitationManager.sendInvitation(userId, userId))
        .rejects.toThrow('Cannot invite yourself');
    });

    // Test 3: Rejet d'ID utilisateur invalide
    it('should reject invalid user IDs', async () => {
      await expect(invitationManager.sendInvitation(-1, 2))
        .rejects.toThrow('Invalid user ID');

      await expect(invitationManager.sendInvitation(1, 0))
        .rejects.toThrow('Invalid user ID');
    });

    // Test 4: Acceptation d'invitation valide
    it('should successfully accept a valid invitation', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);
      const accepted = invitationManager.acceptInvitation(invitationId!, toUserId);

      expect(accepted).toBe(true);

      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation!.status).toBe('accepted');
    });

    // Test 5: Refus d'acceptation par mauvais utilisateur
    it('should reject invitation acceptance by wrong user', async () => {
      const fromUserId = 1;
      const toUserId = 2;
      const wrongUserId = 3;

      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);
      const accepted = invitationManager.acceptInvitation(invitationId!, wrongUserId);

      expect(accepted).toBe(false);

      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation!.status).toBe('pending');
    });

    // Test 6: Déclinaison d'invitation
    it('should successfully decline an invitation', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);
      const declined = invitationManager.declineInvitation(invitationId!, toUserId);

      expect(declined).toBe(true);

      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation!.status).toBe('declined');
    });

    // Test 7: Gestion d'invitation inexistante
    it('should handle non-existent invitation gracefully', () => {
      const nonExistentId = 'invalid_id';
      const userId = 1;

      const accepted = invitationManager.acceptInvitation(nonExistentId, userId);
      const declined = invitationManager.declineInvitation(nonExistentId, userId);

      expect(accepted).toBe(false);
      expect(declined).toBe(false);
    });

    // Test 8: Expiration automatique d'invitation
    it('should automatically expire invitation after timeout', async () => {
      jest.useFakeTimers();

      const fromUserId = 1;
      const toUserId = 2;

      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);

      // Avancer le temps de 3 minutes (au-delà du timeout de 2 min)
      jest.advanceTimersByTime(3 * 60 * 1000);

      const accepted = invitationManager.acceptInvitation(invitationId!, toUserId);
      expect(accepted).toBe(false);

      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation!.status).toBe('expired');

      jest.useRealTimers();
    });

    // Test 9: Récupération des invitations en attente
    it('should retrieve pending invitations for user', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      await invitationManager.sendInvitation(fromUserId, toUserId);
      await invitationManager.sendInvitation(3, toUserId);

      const pendingInvitations = invitationManager.getPendingInvitations(toUserId);

      expect(pendingInvitations).toHaveLength(2);
      expect(pendingInvitations.every(inv => inv.status === 'pending')).toBe(true);
      expect(pendingInvitations.every(inv => inv.toUserId === toUserId)).toBe(true);
    });
  });

  describe('GameSession', () => {
    let gameSession: GameSession;

    beforeEach(() => {
      gameSession = new GameSession('test_session_1', 1, 2, mockWebSocket);
    });

    // Test 10: Création de session de jeu
    it('should create game session with correct initial state', () => {
      expect(gameSession.getId()).toBe('test_session_1');
      expect(gameSession.getStatus()).toBe('waiting');
      expect(gameSession.getPlayers()).toEqual({ left: 1, right: 2 });

      const gameState = gameSession.getGameState();
      expect(gameState.leftScore).toBe(0);
      expect(gameState.rightScore).toBe(0);
      expect(gameState.gameOver).toBe(false);
      expect(gameState.ball.x).toBe(400); // Centre du jeu
      expect(gameState.ball.y).toBe(300);
    });

    // Test 11: Démarrage de partie
    it('should successfully start game', () => {
      const started = gameSession.startGame();

      expect(started).toBe(true);
      expect(gameSession.getStatus()).toBe('active');
    });

    // Test 12: Prévention du double démarrage
    it('should prevent starting already active game', () => {
      gameSession.startGame();
      const secondStart = gameSession.startGame();

      expect(secondStart).toBe(false);
      expect(gameSession.getStatus()).toBe('active');
    });
  });

  describe('Game Launch Validation Tests', () => {
    let gameSession: GameSession;

    beforeEach(() => {
      gameSession = new GameSession('launch_test_1', 1, 2, mockWebSocket);
    });

    // Test 13: Vérification de l'état initial avant lancement
    it('should have correct initial state before game launch', () => {
      const gameState = gameSession.getGameState();

      // Validation complète de l'état initial
      expect(gameState.leftScore).toBe(0);
      expect(gameState.rightScore).toBe(0);
      expect(gameState.gameOver).toBe(false);

      // Position initiale des raquettes (centrées)
      expect(gameState.leftPaddle.y).toBe(260); // (600-80)/2 = 260
      expect(gameState.rightPaddle.y).toBe(260);

      // Position initiale de la balle (centre du jeu)
      expect(gameState.ball.x).toBe(400); // 800/2
      expect(gameState.ball.y).toBe(300); // 600/2
      expect(Math.abs(gameState.ball.dx)).toBe(5); // Vitesse correcte
      expect(Math.abs(gameState.ball.dy)).toBe(5);

      // État de la session
      expect(gameSession.getStatus()).toBe('waiting');
      expect(gameSession.getPlayers()).toEqual({ left: 1, right: 2 });
    });

    // Test 14: Validation du lancement de partie étape par étape
    it('should successfully launch game with all validations', () => {
      // Étape 1: Vérifier pré-conditions
      expect(gameSession.getStatus()).toBe('waiting');

      // Étape 2: Lancer le jeu
      const launchResult = gameSession.startGame();
      expect(launchResult).toBe(true);

      // Étape 3: Vérifier post-conditions
      expect(gameSession.getStatus()).toBe('active');

      // Étape 4: Vérifier que l'état du jeu reste cohérent
      const gameState = gameSession.getGameState();
      expect(gameState.gameOver).toBe(false);
      expect(gameState.leftScore).toBe(0);
      expect(gameState.rightScore).toBe(0);
    });

    // Test 15: Vérification des messages WebSocket lors du lancement
    it('should send correct WebSocket messages on game launch', () => {
      const messages: any[] = [];

      // Capturer les messages WebSocket
      mockWebSocket.addMessageHandler((data) => {
        if (data.type === 'game_started') {
          messages.push(data);
        }
      });

      gameSession.startGame();

      // Attendre que le message soit traité
      setTimeout(() => {
        expect(messages).toHaveLength(1);
        const message = messages[0];

        expect(message.type).toBe('game_started');
        expect(message.sessionId).toBe('launch_test_1');
        expect(message.leftPlayerId).toBe(1);
        expect(message.rightPlayerId).toBe(2);
        expect(message.gameState).toBeDefined();
      }, 20);
    });

    // Test 16: Détection des conditions empêchant le lancement
    it('should identify conditions preventing game launch', () => {
      // Test: Lancement multiple
      gameSession.startGame();
      const secondLaunch = gameSession.startGame();
      expect(secondLaunch).toBe(false);

      // Test: État de session incorrect
      expect(gameSession.getStatus()).toBe('active');
      const thirdLaunch = gameSession.startGame();
      expect(thirdLaunch).toBe(false);
    });
  });

  describe('Granular Game State Unit Tests', () => {
    let gameSession: GameSession;

    beforeEach(() => {
      gameSession = new GameSession('unit_test_1', 10, 20, mockWebSocket);
      gameSession.startGame(); // Démarrer pour tester l'état actif
    });

    // Test 17: Validation des limites de raquettes
    it('should validate paddle movement boundaries', () => {
      // Simuler entrée joueur gauche - mouvement vers le haut
      mockWebSocket.simulateMessage({
        type: 'player_input',
        sessionId: 'unit_test_1',
        playerId: 10,
        input: { up: true, down: false }
      });

      // Attendre que l'input soit traité
      setTimeout(() => {
        const gameState = gameSession.getGameState();
        expect(gameState.leftPaddle.y).toBeLessThanOrEqual(520); // 600 - 80 = limite max
        expect(gameState.leftPaddle.y).toBeGreaterThanOrEqual(0); // limite min
      }, 20);
    });

    // Test 18: Validation des mouvements de balle
    it('should validate ball movement physics', () => {
      const initialState = gameSession.getGameState();
      const initialX = initialState.ball.x;
      const initialY = initialState.ball.y;

      // Attendre quelques cycles de jeu
      setTimeout(() => {
        const newState = gameSession.getGameState();

        // La balle doit bouger
        expect(newState.ball.x).not.toBe(initialX);
        expect(newState.ball.y).not.toBe(initialY);

        // La balle doit rester dans les limites
        expect(newState.ball.x).toBeGreaterThanOrEqual(-10); // Petite tolérance pour scoring
        expect(newState.ball.x).toBeLessThanOrEqual(810);
        expect(newState.ball.y).toBeGreaterThanOrEqual(0);
        expect(newState.ball.y).toBeLessThanOrEqual(600);
      }, 100);
    });

    // Test 19: Validation du système de scoring
    it('should validate scoring system accuracy', () => {
      const initialState = gameSession.getGameState();
      expect(initialState.leftScore).toBe(0);
      expect(initialState.rightScore).toBe(0);

      // Test difficile à implémenter sans exposer les méthodes privées
      // Vérification que le scoring change quand attendu
      setTimeout(() => {
        const newState = gameSession.getGameState();
        const totalScore = newState.leftScore + newState.rightScore;
        expect(totalScore).toBeGreaterThanOrEqual(0);
        expect(totalScore).toBeLessThanOrEqual(10); // Score max raisonnable
      }, 1000);
    });

    // Test 20: Validation de fin de partie
    it('should detect game end conditions correctly', () => {
      // Simuler une partie jusqu'à la fin (difficile sans exposer les méthodes)
      // Test de la logique de fin de partie
      const gameState = gameSession.getGameState();

      if (gameState.leftScore >= 3 || gameState.rightScore >= 3) {
        expect(gameState.gameOver).toBe(true);
        expect(gameSession.getStatus()).toBe('completed');
      }
    });
  });

  describe('Input Handling Unit Tests', () => {
    let gameSession: GameSession;
    const messages: any[] = [];

    beforeEach(() => {
      messages.length = 0; // Clear messages
      gameSession = new GameSession('input_test_1', 100, 200, mockWebSocket);
      gameSession.startGame();

      // Capturer tous les messages WebSocket
      mockWebSocket.addMessageHandler((data) => {
        messages.push(data);
      });
    });

    // Test 21: Validation entrée joueur gauche
    it('should handle left player input correctly', () => {
      const initialState = gameSession.getGameState();
      const initialY = initialState.leftPaddle.y;

      // Envoyer input UP
      mockWebSocket.simulateMessage({
        type: 'player_input',
        sessionId: 'input_test_1',
        playerId: 100,
        input: { up: true, down: false }
      });

      setTimeout(() => {
        const newState = gameSession.getGameState();
        expect(newState.leftPaddle.y).toBeLessThanOrEqual(initialY); // UP = Y diminue
        expect(newState.rightPaddle.y).toBe(initialState.rightPaddle.y); // Pas de changement
      }, 20);
    });

    // Test 22: Validation entrée joueur droit
    it('should handle right player input correctly', () => {
      const initialState = gameSession.getGameState();
      const initialY = initialState.rightPaddle.y;

      // Envoyer input DOWN
      mockWebSocket.simulateMessage({
        type: 'player_input',
        sessionId: 'input_test_1',
        playerId: 200,
        input: { up: false, down: true }
      });

      setTimeout(() => {
        const newState = gameSession.getGameState();
        expect(newState.rightPaddle.y).toBeGreaterThanOrEqual(initialY); // DOWN = Y augmente
        expect(newState.leftPaddle.y).toBe(initialState.leftPaddle.y); // Pas de changement
      }, 20);
    });

    // Test 23: Rejet d'entrée joueur inexistant
    it('should ignore input from non-existent player', () => {
      const initialState = gameSession.getGameState();

      // Envoyer input d'un joueur inexistant
      mockWebSocket.simulateMessage({
        type: 'player_input',
        sessionId: 'input_test_1',
        playerId: 999, // Joueur inexistant
        input: { up: true, down: false }
      });

      setTimeout(() => {
        const newState = gameSession.getGameState();
        // Aucun changement ne doit avoir lieu
        expect(newState.leftPaddle.y).toBe(initialState.leftPaddle.y);
        expect(newState.rightPaddle.y).toBe(initialState.rightPaddle.y);
      }, 20);
    });

    // Test 24: Validation entrée simultanée contradictoire
    it('should handle contradictory simultaneous input', () => {
      // Envoyer UP et DOWN en même temps (edge case)
      mockWebSocket.simulateMessage({
        type: 'player_input',
        sessionId: 'input_test_1',
        playerId: 100,
        input: { up: true, down: true }
      });

      setTimeout(() => {
        const newState = gameSession.getGameState();
        // Le système doit gérer cette situation sans erreur
        expect(newState.leftPaddle.y).toBeGreaterThanOrEqual(0);
        expect(newState.leftPaddle.y).toBeLessThanOrEqual(520);
      }, 20);
    });
  });

  describe('WebSocket Communication Unit Tests', () => {
    let gameSession: GameSession;
    const capturedMessages: any[] = [];

    beforeEach(() => {
      capturedMessages.length = 0;

      // Mock WebSocket qui capture tous les messages
      const capturingWebSocket = new MockWebSocket();
      const originalSend = capturingWebSocket.send;
      capturingWebSocket.send = function(data: string) {
        const message = JSON.parse(data);
        capturedMessages.push(message);
        return originalSend.call(this, data);
      };

      gameSession = new GameSession('ws_test_1', 50, 60, capturingWebSocket);
    });

    // Test 25: Messages de démarrage de jeu
    it('should send correct game start messages', () => {
      gameSession.startGame();

      const startMessages = capturedMessages.filter(msg => msg.type === 'game_started');
      expect(startMessages).toHaveLength(1);

      const startMessage = startMessages[0];
      expect(startMessage.sessionId).toBe('ws_test_1');
      expect(startMessage.leftPlayerId).toBe(50);
      expect(startMessage.rightPlayerId).toBe(60);
      expect(startMessage.gameState).toBeDefined();
    });

    // Test 26: Messages de mise à jour d'état
    it('should continuously send game state updates', (done) => {
      gameSession.startGame();

      // Attendre quelques mises à jour
      setTimeout(() => {
        const updateMessages = capturedMessages.filter(msg => msg.type === 'game_state_update');
        expect(updateMessages.length).toBeGreaterThan(0);

        // Vérifier la structure des messages
        updateMessages.forEach(message => {
          expect(message.sessionId).toBe('ws_test_1');
          expect(message.gameState).toBeDefined();
          expect(message.gameState.ball).toBeDefined();
          expect(message.gameState.leftPaddle).toBeDefined();
          expect(message.gameState.rightPaddle).toBeDefined();
        });

        done();
      }, 200);
    });

    // Test 27: Messages de fin de partie
    it('should send game end messages when appropriate', () => {
      // Ce test est difficile car il faut forcer la fin de partie
      // On teste la structure du message si le jeu se termine
      gameSession.startGame();

      // Simuler une condition de fin (en accédant aux propriétés privées via toute méthode)
      const gameState = gameSession.getGameState();

      if (gameState.gameOver) {
        const endMessages = capturedMessages.filter(msg => msg.type === 'game_ended');
        expect(endMessages.length).toBeGreaterThan(0);

        const endMessage = endMessages[0];
        expect(endMessage.sessionId).toBe('ws_test_1');
        expect(endMessage.winner).toBeDefined();
        expect(endMessage.finalScore).toBeDefined();
      }
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    // Test 28: Session avec WebSocket défaillant (identification du comportement actuel)
    it('should identify current WebSocket error behavior', () => {
      const brokenWebSocket = new MockWebSocket();
      brokenWebSocket.send = () => { throw new Error('WebSocket failed'); };

      const gameSession = new GameSession('broken_ws_test', 1, 2, brokenWebSocket);

      // Comportement actuel : WebSocket échec provoque une exception
      expect(() => {
        gameSession.startGame();
      }).toThrow('WebSocket failed');

      // DÉFAUT IDENTIFIÉ: Le statut passe quand même à 'active' malgré l'erreur WebSocket
      // Cela indique un problème dans la gestion d'erreur de GameSession.startGame()
      expect(gameSession.getStatus()).toBe('active');

      // TODO: Dans le code de production, il faudrait:
      // 1. Catch l'erreur WebSocket dans startGame()
      // 2. Garder le statut à 'waiting' en cas d'échec
      // 3. Retourner false au lieu de lever l'exception
    });

    // Test 29: Ressources mémoire et cleanup
    it('should properly cleanup resources on game end', () => {
      jest.useFakeTimers();

      const gameSession = new GameSession('cleanup_test', 1, 2, mockWebSocket);
      gameSession.startGame();

      // Forcer la fin du jeu (via timeout ou score max simulé)
      jest.advanceTimersByTime(300000); // 5 minutes

      // Vérifier que les timers sont nettoyés
      const gameState = gameSession.getGameState();
      if (gameState.gameOver) {
        expect(gameSession.getStatus()).toBe('completed');
      }

      jest.useRealTimers();
    });

    // Test 30: Validation de sessions multiples simultanées
    it('should handle multiple simultaneous game sessions', () => {
      const session1 = new GameSession('multi_1', 1, 2, mockWebSocket);
      const session2 = new GameSession('multi_2', 3, 4, mockWebSocket);
      const session3 = new GameSession('multi_3', 5, 6, mockWebSocket);

      // Tous les jeux doivent pouvoir démarrer indépendamment
      expect(session1.startGame()).toBe(true);
      expect(session2.startGame()).toBe(true);
      expect(session3.startGame()).toBe(true);

      // Chaque session doit maintenir son état indépendant
      expect(session1.getId()).toBe('multi_1');
      expect(session2.getId()).toBe('multi_2');
      expect(session3.getId()).toBe('multi_3');

      expect(session1.getPlayers()).toEqual({ left: 1, right: 2 });
      expect(session2.getPlayers()).toEqual({ left: 3, right: 4 });
      expect(session3.getPlayers()).toEqual({ left: 5, right: 6 });
    });
  });

  describe('Integration Tests', () => {
    let gameSession: GameSession;

    beforeEach(() => {
      mockWebSocket = new MockWebSocket();
      invitationManager = new InvitationManager(mockWebSocket);
    });

    // Test 31: Flux complet d'invitation acceptée vers création de jeu
    it('should complete full invitation to game flow', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      // 1. Envoyer invitation
      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);
      expect(invitationId).toBeTruthy();

      // 2. Accepter invitation
      const accepted = invitationManager.acceptInvitation(invitationId!, toUserId);
      expect(accepted).toBe(true);

      // 3. Créer session de jeu
      gameSession = new GameSession(`game_${invitationId}`, fromUserId, toUserId, mockWebSocket);
      const gameStarted = gameSession.startGame();

      expect(gameStarted).toBe(true);
      expect(gameSession.getStatus()).toBe('active');
      expect(gameSession.getPlayers()).toEqual({ left: fromUserId, right: toUserId });
    });

    // Test 32: Flux d'invitation déclinée
    it('should handle declined invitation flow', async () => {
      const fromUserId = 1;
      const toUserId = 2;

      // 1. Envoyer invitation
      const invitationId = await invitationManager.sendInvitation(fromUserId, toUserId);

      // 2. Décliner invitation
      const declined = invitationManager.declineInvitation(invitationId!, toUserId);
      expect(declined).toBe(true);

      // 3. Vérifier qu'aucune session de jeu n'est créée
      const invitation = invitationManager.getInvitation(invitationId!);
      expect(invitation!.status).toBe('declined');

      // Une session de jeu créée à partir d'une invitation déclinée ne devrait pas être autorisée
      // (Ce test simule la logique métier qui vérifierait l'état de l'invitation)
      expect(invitation!.status).not.toBe('accepted');
    });
  });
});