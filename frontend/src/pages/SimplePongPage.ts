import { Header } from '../shared/components/Header';
import { Banner } from '../shared/components/Banner';
import { router } from '../core/app/Router';
import { authManager } from '../core/auth/AuthManager';
import type { User as AppUser } from '../core/state/AppState';
import { config } from '../config/environment';
import { PongGameRenderer } from '../game/PongGameRenderer';
import { PongInputHandler } from '../game/PongInputHandler';

interface PongState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  leftPaddleY: number;
  rightPaddleY: number;
  leftScore: number;
  rightScore: number;
  gameOver: boolean;
  winner?: 'left' | 'right';
}

type BufferedState = { state: PongState; timestamp: number };

export class SimplePongPage {
  private element: HTMLElement;
  private header?: Header;
  private banner?: Banner;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private renderer!: PongGameRenderer;
  private inputHandler!: PongInputHandler;
  private ws: WebSocket | null = null;
  private gameState: PongState | null = null;
  private displayState: PongState | null = null;
  private stateBuffer: BufferedState[] = [];
  private renderLoopHandle: number | null = null;
  private readonly interpolationDelayMs = 100;
  private readonly maxBufferMs = 750;
  private readonly maxExtrapolationMs = 120;
  private myRole: 'left' | 'right' | null = null;
  private authToken: string | null = null;
  private gameId: string | undefined;
  private isInvitedGame: boolean = false;

  private isCountingDown: boolean = false;
  private countdownValue: number = 5;
  private countdownStartTime: number = 0;
  private lastFrameTime: number = 0;

  private playerNames: { left: string; right: string } = { left: '', right: '' };
  private lastPlayerIds: { left: number; right: number } | null = null;
  private gameStartTime: number | null = null;
  private authUnsubscribe?: () => void;
  private instructionsElement?: HTMLElement;
  private gameEndOverlay: HTMLElement | null = null;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToAuth();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className =
      'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true);
    this.banner = new Banner();

    const gameContent = document.createElement('main');
    gameContent.className =
      'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700 items-center justify-center p-8';
    gameContent.innerHTML = `
            <div class="text-center">
                <h1 class="text-6xl font-bold text-white mb-8 font-iceland">PONG GAME</h1>
                <div class="bg-black/30 backdrop-blur-sm border-white border-4 rounded-xl p-8 inline-block">
                    <div id="game-canvas-container" class="mb-6"></div>
                    <div class="text-white font-iceland">
                        <div id="game-instructions" class="text-xl mb-4"></div>
                        <div class="text-lg opacity-75">First to 5 points wins!</div>
                    </div>
                </div>
                <div class="mt-8">
                    <button id="back-to-menu"
                        class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
                        ← Back to Menu
                    </button>
                </div>
            </div>
        `;

    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(gameContent);

    return container;
  }

  private bindEvents(): void {
    setTimeout(() => {
      this.instructionsElement = this.element.querySelector('#game-instructions') as
        | HTMLElement
        | undefined;
      this.setStatusMessage('Waiting for opponent...', 'Use ↑/↓ arrow keys or W/S to move your paddle.');
      this.checkGameContext();
      this.initializeCanvas();
      this.startRenderLoop();
      this.setupKeyboardHandlers();
      this.setupBackButton();
      this.initializeConnection();
    }, 100);
  }

  private checkGameContext(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');

    if (gameIdFromUrl) {
      this.gameId = gameIdFromUrl;
      this.isInvitedGame = true;
      this.updateInterfaceForInvitedGame();
    }
  }

  private updateInterfaceForInvitedGame(): void {
    this.setStatusMessage('Joining your invitation...', 'Waiting for the other player to connect.');
  }

  private subscribeToAuth(): void {
    import('../core/auth/AuthManager').then(({ authManager }) => {
      this.authUnsubscribe = authManager.subscribeToAuth(authState => {
        if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
          import('../core/app/Router').then(({ router }) => {
            router.navigate('/');
          });
        }
      });

      if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
        import('../core/app/Router').then(({ router }) => {
          router.navigate('/');
        });
      }
    });
  }

  private initializeCanvas(): void {
    let canvas = this.element.querySelector('#game') as HTMLCanvasElement | null;

    if (!canvas) {
      const container = this.element.querySelector('#game-canvas-container') as HTMLElement | null;
      if (!container) {
        console.error('Canvas container not found');
        return;
      }

      canvas = document.createElement('canvas');
      canvas.id = 'game';
      canvas.width = 800;
      canvas.height = 500;
      canvas.className = 'border-4 border-white rounded-xl bg-black shadow-xl';
      container.appendChild(canvas);
    }

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = ctx;

    // Initialize renderer and input handler
    this.renderer = new PongGameRenderer(this.canvas, this.ctx);
    this.inputHandler = new PongInputHandler();
    this.inputHandler.setInputChangeCallback(input => {
      this.sendInput(input.up, input.down);
    });
  }

  private setupBackButton(): void {
    const backButton = this.element.querySelector('#back-to-menu');
    backButton?.addEventListener('click', () => {
      import('../core/app/Router').then(({ router }) => {
        this.destroy();
        router.navigate('/');
      });
    });
  }

  private setupKeyboardHandlers(): void {
    this.inputHandler.startListening();
  }

  private initializeConnection(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.connect(token);
    }
  }

  private async getUsernames(
    leftPlayerId: number,
    rightPlayerId: number
  ): Promise<{ left: string; right: string }> {
    try {
      const response = await fetch('/api/users/batch-info', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [leftPlayerId, rightPlayerId],
        }),
      });

      const result = await response.json();
      if (result.success && result.users) {
        const leftUser = result.users.find((u: any) => u.id === leftPlayerId);
        const rightUser = result.users.find((u: any) => u.id === rightPlayerId);

        const leftName = (leftUser?.display_name ?? leftUser?.username ?? '').trim();
        const rightName = (rightUser?.display_name ?? rightUser?.username ?? '').trim();

        return {
          left: leftName || `Player ${leftPlayerId}`,
          right: rightName || `Player ${rightPlayerId}`,
        };
      }
    } catch (error) {
      console.error('Error while fetching player names:', error);
    }

    return {
      left: `Player ${leftPlayerId}`,
      right: `Player ${rightPlayerId}`,
    };
  }

  private getPreferredUserName(user: AppUser | null | undefined): string | null {
    if (!user) {
      return null;
    }

    const displayName = typeof user.display_name === 'string' ? user.display_name.trim() : '';
    const username = user.username ? user.username.trim() : '';

    return displayName || username || null;
  }

  private getCurrentUserInfo(): { id: number; name: string } | null {
    const user = authManager.getCurrentUser() as AppUser | null;
    if (!user) {
      return null;
    }

    const preferredName = this.getPreferredUserName(user);
    if (!preferredName) {
      return null;
    }

    return { id: user.id, name: preferredName };
  }

  private async updatePlayerNamesByIds(leftPlayerId: number, rightPlayerId: number): Promise<void> {
    try {
      const names = await this.getUsernames(leftPlayerId, rightPlayerId);
      this.playerNames = names;
    } catch (error) {
      console.error('Error resolving player names by ids:', error);
    } finally {
      this.showPlayerNames();
    }
  }

  private preparePlayerNames(message: any): void {
    if (!message) {
      return;
    }

    if (message.players) {
      const leftName = typeof message.players.left === 'string' ? message.players.left.trim() : '';
      const rightName =
        typeof message.players.right === 'string' ? message.players.right.trim() : '';

      this.playerNames = {
        left: leftName || this.playerNames.left || 'Player 1',
        right: rightName || this.playerNames.right || 'Player 2',
      };
      this.lastPlayerIds = null;
      this.showPlayerNames();
      return;
    }

    const leftPlayerId =
      typeof message.leftPlayerId === 'number' ? message.leftPlayerId : undefined;
    const rightPlayerId =
      typeof message.rightPlayerId === 'number' ? message.rightPlayerId : undefined;
    const currentUser = this.getCurrentUserInfo();

    if (leftPlayerId !== undefined && rightPlayerId !== undefined) {
      if (currentUser && this.myRole) {
        if (this.myRole === 'left' && currentUser.id === leftPlayerId) {
          this.playerNames.left = currentUser.name;
        } else if (this.myRole === 'right' && currentUser.id === rightPlayerId) {
          this.playerNames.right = currentUser.name;
        }
      }
      this.showPlayerNames();
      const idsChanged =
        !this.lastPlayerIds ||
        this.lastPlayerIds.left !== leftPlayerId ||
        this.lastPlayerIds.right !== rightPlayerId;
      if (idsChanged) {
        this.lastPlayerIds = { left: leftPlayerId, right: rightPlayerId };
        void this.updatePlayerNamesByIds(leftPlayerId, rightPlayerId);
      }
      return;
    }

    const opponentId = typeof message.opponentId === 'number' ? message.opponentId : undefined;

    if (currentUser && opponentId !== undefined && this.myRole) {
      const inferredLeftId = this.myRole === 'left' ? currentUser.id : opponentId;
      const inferredRightId = this.myRole === 'left' ? opponentId : currentUser.id;

      this.playerNames = {
        left:
          inferredLeftId === currentUser.id
            ? currentUser.name
            : this.playerNames.left || 'Player 1',
        right:
          inferredRightId === currentUser.id
            ? currentUser.name
            : this.playerNames.right || 'Player 2',
      };
      this.showPlayerNames();
      const idsChanged =
        !this.lastPlayerIds ||
        this.lastPlayerIds.left !== inferredLeftId ||
        this.lastPlayerIds.right !== inferredRightId;
      if (idsChanged) {
        this.lastPlayerIds = { left: inferredLeftId, right: inferredRightId };
        void this.updatePlayerNamesByIds(inferredLeftId, inferredRightId);
      }
      return;
    }

    if (currentUser && this.myRole) {
      this.playerNames = {
        left: this.myRole === 'left' ? currentUser.name : this.playerNames.left || 'Player 1',
        right: this.myRole === 'right' ? currentUser.name : this.playerNames.right || 'Player 2',
      };
      this.showPlayerNames();
    }
  }

  private connect(token: string): void {
    this.authToken = token;

    const wsUrl = config.WS_BASE_URL;
    const webSocketUrl = `${wsUrl}/ws`;

    this.ws = new WebSocket(webSocketUrl);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'auth',
          token: token,
        })
      );
      this.setStatusMessage('Connected to the arena', 'Waiting for the match to begin.');
    };

    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'friend_pong_invite':
          if (confirm('Game invitation received! Accept?')) {
            this.ws?.send(
              JSON.stringify({
                type: 'friend_pong_accept',
                inviteId: msg.inviteId,
                fromUserId: msg.fromUserId,
              })
            );
          } else {
            this.ws?.send(
              JSON.stringify({
                type: 'friend_pong_decline',
                inviteId: msg.inviteId,
              })
            );
          }
          break;

        case 'friend_pong_countdown':
          this.myRole = msg.role;
          this.gameId = msg.gameId;
          this.preparePlayerNames(msg);

          this.setStatusMessage('Match starting...', 'Get ready for the countdown!');
          this.startCountdown();
          break;

        case 'friend_pong_start':
        case 'simple_pong_start':
          console.log('🎮 Game start message received:', {
            type: msg.type,
            role: msg.role,
            gameId: msg.gameId,
            leftPlayerId: msg.leftPlayerId,
            rightPlayerId: msg.rightPlayerId,
          });
          this.myRole = msg.role;
          this.gameId = msg.gameId;
          this.gameStartTime = Date.now(); // Record game start time for duration calculation
          this.preparePlayerNames(msg);

          this.setStatusMessage(
            `${this.playerNames.left || 'Player 1'} vs ${this.playerNames.right || 'Player 2'}`,
            `You control the ${this.myRole === 'left' ? 'left' : 'right'} paddle. Use ↑/↓ or W/S keys.`
          );

          if (!this.isCountingDown) {
            this.startCountdown();
          }
          break;

        case 'friend_pong_state':
        case 'simple_pong_state':
          this.handleGameStateMessage(msg);
          break;

        case 'friend_pong_end':
        case 'simple_pong_end':
          this.handleGameStateMessage(msg);
          // Don't reset myRole, gameStartTime, lastPlayerIds here!
          // They're needed by recordMatch() which runs asynchronously
          // They'll be reset in destroy() or when a new game starts
          this.isCountingDown = false; // Stop the countdown
          this.hidePlayerNames();
          break;
      }
    };

    this.ws.onerror = error => {
      console.error('🔥 WebSocket error:', error);
      this.setStatusMessage(
        'WebSocket connection error',
        'Please refresh the page or try again later.'
      );
    };
  }

  private showPlayerNames(): void {
    const leftName = this.playerNames.left || 'Player 1';
    const rightName = this.playerNames.right || 'Player 2';
    const matchup = `${leftName} vs ${rightName}`;
    const roleText = this.myRole
      ? `You control the ${this.myRole === 'left' ? 'left' : 'right'} paddle. Use ↑/↓ arrow keys to move.`
      : 'Use ↑/↓ arrow keys or W/S to move your paddle.';
    this.setStatusMessage(matchup, roleText);
  }

  private hidePlayerNames(): void {
    this.setStatusMessage(
      'Waiting for the next invitation...',
      'Check your notifications to start a new match.'
    );
  }

  private setStatusMessage(primary: string, secondary?: string): void {
    if (!this.instructionsElement) {
      this.instructionsElement = this.element.querySelector('#game-instructions') as
        | HTMLElement
        | undefined;
    }
    if (!this.instructionsElement) {
      return;
    }

    const secondaryLine = secondary
      ? `<div class="text-base opacity-80 mt-2">${secondary}</div>`
      : '';

    this.instructionsElement.innerHTML = `<div>${primary}</div>${secondaryLine}`;
  }

  private sendInput(up: boolean, down: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.gameId) {
      this.ws.send(
        JSON.stringify({
          type: 'simple_pong_input',
          gameId: this.gameId,
          input: { up, down },
        })
      );
    }
  }

  private handleGameStateMessage(msg: any): void {
    // Infer role from player IDs if not set (e.g., page reloaded during game)
    if (!this.myRole && msg.leftPlayerId && msg.rightPlayerId) {
      const currentUser = this.getCurrentUserInfo();
      if (currentUser) {
        if (currentUser.id === msg.leftPlayerId) {
          this.myRole = 'left';
          console.log('🔄 Inferred role from player IDs: left');
        } else if (currentUser.id === msg.rightPlayerId) {
          this.myRole = 'right';
          console.log('🔄 Inferred role from player IDs: right');
        }
      }
    }

    // Save current values BEFORE preparePlayerNames() might reset them
    const savedMyRole = this.myRole;

    // Extract player IDs directly from message instead of relying on this.lastPlayerIds
    const savedPlayerIds =
      msg.leftPlayerId !== undefined && msg.rightPlayerId !== undefined
        ? { left: msg.leftPlayerId, right: msg.rightPlayerId }
        : this.lastPlayerIds;

    this.preparePlayerNames(msg);

    const rawState = msg.state || msg.gameState;
    if (!rawState) {
      return;
    }

    const sanitized = this.sanitizeState(rawState);
    if (!sanitized) {
      return;
    }

    this.gameState = sanitized;
    if (!this.displayState) {
      this.displayState = this.cloneState(sanitized);
    }

    const now = performance.now();
    this.enqueueState(sanitized, now);

    if (sanitized.gameOver) {
      console.log('🏁 Game Over detected:', {
        winner: sanitized.winner,
        savedMyRole: savedMyRole,
        currentMyRole: this.myRole,
        leftScore: sanitized.leftScore,
        rightScore: sanitized.rightScore,
        savedPlayerIds: savedPlayerIds,
        currentPlayerIds: this.lastPlayerIds,
      });
      const won = sanitized.winner === savedMyRole;
      console.log(`🎯 Result: ${won ? 'You won!' : 'You lost!'}`);
      // Pass saved values to showGameEnd
      this.showGameEnd(won ? 'You won!' : 'You lost!', savedMyRole, savedPlayerIds);
    }
  }

  private sanitizeState(rawState: any): PongState | null {
    const requiredKeys: Array<keyof PongState> = [
      'ballX',
      'ballY',
      'ballVX',
      'ballVY',
      'leftPaddleY',
      'rightPaddleY',
      'leftScore',
      'rightScore',
      'gameOver',
    ];

    const isValid = requiredKeys.every(
      key => rawState[key] !== undefined && rawState[key] !== null
    );
    if (!isValid) {
      return null;
    }

    const winnerCandidate = rawState.winner;
    const winner: 'left' | 'right' | undefined =
      winnerCandidate === 'left' || winnerCandidate === 'right' ? winnerCandidate : undefined;

    return {
      ballX: Number(rawState.ballX),
      ballY: Number(rawState.ballY),
      ballVX: Number(rawState.ballVX),
      ballVY: Number(rawState.ballVY),
      leftPaddleY: Number(rawState.leftPaddleY),
      rightPaddleY: Number(rawState.rightPaddleY),
      leftScore: Number(rawState.leftScore),
      rightScore: Number(rawState.rightScore),
      gameOver: Boolean(rawState.gameOver),
      winner,
    };
  }

  private enqueueState(state: PongState, timestamp: number): void {
    this.stateBuffer.push({ state: this.cloneState(state), timestamp });

    const cutoff = timestamp - this.maxBufferMs;
    while (this.stateBuffer.length > 2 && this.stateBuffer[0].timestamp < cutoff) {
      this.stateBuffer.shift();
    }
  }

  private startRenderLoop(): void {
    if (this.renderLoopHandle !== null) {
      return;
    }

    const step = (time: number) => {
      this.renderLoopHandle = requestAnimationFrame(step);
      this.updateDisplayState(time);
      this.render();
    };

    this.renderLoopHandle = requestAnimationFrame(step);
  }

  private stopRenderLoop(): void {
    if (this.renderLoopHandle !== null) {
      cancelAnimationFrame(this.renderLoopHandle);
      this.renderLoopHandle = null;
    }
  }

  private updateDisplayState(currentTime: number): void {
    if (this.stateBuffer.length === 0) {
      if (this.gameState && !this.displayState) {
        this.displayState = this.cloneState(this.gameState);
      }
      return;
    }

    const targetTime = currentTime - this.interpolationDelayMs;
    const lastEntry = this.stateBuffer[this.stateBuffer.length - 1];

    if (targetTime > lastEntry.timestamp) {
      const prevEntry =
        this.stateBuffer.length > 1 ? this.stateBuffer[this.stateBuffer.length - 2] : null;
      const deltaMs = Math.min(targetTime - lastEntry.timestamp, this.maxExtrapolationMs);
      this.displayState = this.extrapolateState(lastEntry, prevEntry, deltaMs / 1000);
      return;
    }

    let previous = this.stateBuffer[0];
    let next = lastEntry;

    for (let i = 0; i < this.stateBuffer.length; i++) {
      const entry = this.stateBuffer[i];
      if (entry.timestamp <= targetTime) {
        previous = entry;
      }
      if (entry.timestamp >= targetTime) {
        next = entry;
        break;
      }
    }

    if (next.timestamp === previous.timestamp) {
      this.displayState = this.cloneState(next.state);
      return;
    }

    const alpha = (targetTime - previous.timestamp) / (next.timestamp - previous.timestamp);
    this.displayState = this.interpolateStates(previous.state, next.state, alpha);
  }

  private interpolateStates(a: PongState, b: PongState, alphaRaw: number): PongState {
    const alpha = Math.min(Math.max(alphaRaw, 0), 1);

    return {
      ballX: this.lerp(a.ballX, b.ballX, alpha),
      ballY: this.lerp(a.ballY, b.ballY, alpha),
      ballVX: this.lerp(a.ballVX, b.ballVX, alpha),
      ballVY: this.lerp(a.ballVY, b.ballVY, alpha),
      leftPaddleY: this.lerp(a.leftPaddleY, b.leftPaddleY, alpha),
      rightPaddleY: this.lerp(a.rightPaddleY, b.rightPaddleY, alpha),
      leftScore: alpha < 0.5 ? a.leftScore : b.leftScore,
      rightScore: alpha < 0.5 ? a.rightScore : b.rightScore,
      gameOver: a.gameOver || b.gameOver,
      winner: b.winner ?? a.winner,
    };
  }

  private extrapolateState(
    last: BufferedState,
    previous: BufferedState | null,
    deltaSeconds: number
  ): PongState {
    const canvasWidth = this.arenaWidth;
    const canvasHeight = this.serverArenaHeight;
    const paddleHalfHeight = this.paddleHeight / 2;
    const ballRadius = this.ballRadius;

    const timeBetween = previous ? (last.timestamp - previous.timestamp) / 1000 : 0;
    const prevState = previous?.state;

    const leftVelocity =
      prevState && timeBetween > 0
        ? (last.state.leftPaddleY - prevState.leftPaddleY) / timeBetween
        : 0;
    const rightVelocity =
      prevState && timeBetween > 0
        ? (last.state.rightPaddleY - prevState.rightPaddleY) / timeBetween
        : 0;

    let predictedBallX = last.state.ballX + last.state.ballVX * deltaSeconds;
    let predictedBallY = last.state.ballY + last.state.ballVY * deltaSeconds;

    if (predictedBallX < ballRadius) {
      predictedBallX = ballRadius;
    } else if (predictedBallX > canvasWidth - ballRadius) {
      predictedBallX = canvasWidth - ballRadius;
    }

    if (predictedBallY < ballRadius) {
      predictedBallY = ballRadius;
    } else if (predictedBallY > canvasHeight - ballRadius) {
      predictedBallY = canvasHeight - ballRadius;
    }

    const predictedLeft = last.state.leftPaddleY + leftVelocity * deltaSeconds;
    const predictedRight = last.state.rightPaddleY + rightVelocity * deltaSeconds;

    return {
      ballX: predictedBallX,
      ballY: predictedBallY,
      ballVX: last.state.ballVX,
      ballVY: last.state.ballVY,
      leftPaddleY: Math.max(
        paddleHalfHeight,
        Math.min(canvasHeight - paddleHalfHeight, predictedLeft)
      ),
      rightPaddleY: Math.max(
        paddleHalfHeight,
        Math.min(canvasHeight - paddleHalfHeight, predictedRight)
      ),
      leftScore: last.state.leftScore,
      rightScore: last.state.rightScore,
      gameOver: last.state.gameOver,
      winner: last.state.winner,
    };
  }

  private lerp(start: number, end: number, alpha: number): number {
    return start + (end - start) * alpha;
  }

  private cloneState(state: PongState): PongState {
    return { ...state };
  }

  private render(): void {
    this.renderer.render(
      this.displayState ?? this.gameState,
      this.playerNames,
      this.isCountingDown,
      this.countdownValue,
      this.countdownStartTime
    );
  }

  private async recordMatch(
    myRole: 'left' | 'right' | null,
    playerIds: { left: number; right: number } | null
  ): Promise<void> {
    try {
      // Import appState and apiService at the top if not already imported
      const { appState } = await import('../core/state/AppState');
      const { apiService } = await import('../shared/services/api');

      const currentUser = appState.getState().user;
      if (!currentUser) {
        console.warn('⚠️ No user authenticated, cannot record match');
        return;
      }

      if (!playerIds) {
        console.warn('⚠️ No player IDs available, cannot record match');
        return;
      }

      if (!myRole) {
        console.warn('⚠️ No player role assigned, cannot record match');
        return;
      }

      const finalState = this.gameState ?? this.displayState;
      if (!finalState) {
        console.warn('⚠️ No game state available, cannot record match');
        return;
      }

      // Calculate match duration
      const duration = this.gameStartTime
        ? Math.floor((Date.now() - this.gameStartTime) / 1000)
        : 0;

      // Determine player IDs based on role
      const myUserId = currentUser.id;
      const opponentUserId = myRole === 'left'
        ? playerIds.right
        : playerIds.left;

      // Determine scores based on role
      const myScore = myRole === 'left' ? finalState.leftScore : finalState.rightScore;
      const opponentScore = myRole === 'left' ? finalState.rightScore : finalState.leftScore;

      // Determine winner
      const winnerId = finalState.winner === myRole ? myUserId : opponentUserId;

      // Prepare match data
      const matchData = {
        player1_id: myUserId,
        player2_id: opponentUserId,
        player1_guest_name: undefined,
        player2_guest_name: undefined,
        player1_score: myScore,
        player2_score: opponentScore,
        winner_id: winnerId,
        game_type: 'pong',
        max_score: 5,
        duration_seconds: duration,
        // Stats tracking (basic for now, could be enhanced)
        player1_touched_ball: 0,
        player1_missed_ball: Math.max(0, opponentScore),
        player2_touched_ball: 0,
        player2_missed_ball: Math.max(0, myScore),
      };

      console.log('📝 Recording online match:', {
        myRole: myRole,
        myUserId,
        opponentUserId,
        myScore,
        opponentScore,
        winner: finalState.winner,
        winnerId,
        duration,
      });

      await apiService.recordMatch(matchData);
      console.log('✅ Online match recorded successfully');

      // Refresh user stats to update wins/losses on homepage
      const { authManager } = await import('../core/auth/AuthManager');
      await authManager.refreshUser();
      console.log('🔄 User stats refreshed');
    } catch (error) {
      console.error('❌ Failed to record online match:', error);
    }
  }

  private async showGameEnd(
    result: string,
    myRole: 'left' | 'right' | null,
    playerIds: { left: number; right: number } | null
  ): Promise<void> {
    if (this.gameEndOverlay) return;

    // Create and assign overlay IMMEDIATELY to prevent multiple calls
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    const finalState = this.gameState ?? this.displayState;
    overlay.innerHTML = `
            <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-12 text-center max-w-lg">
                <h2 class="text-4xl font-bold text-white font-iceland mb-6">🏆 Match Finished!</h2>
                <p class="text-3xl text-yellow-300 font-bold font-iceland mb-4">${result}</p>
                <p class="text-xl text-white font-iceland mb-8">
                    Final Score: ${finalState?.leftScore ?? 0} - ${finalState?.rightScore ?? 0}
                </p>
                <div class="flex gap-4 justify-center">
                    <button id="play-again"
                            class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg font-bold">
                        Play Again
                    </button>
                    <button id="back-to-menu-end"
                            class="text-white border-gray-400 border-2 px-6 py-3 rounded hover:bg-gray-400 hover:text-black transition-colors font-iceland text-lg">
                        Back to Menu
                    </button>
                </div>
            </div>
        `;

    overlay.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target.id === 'play-again') {
        this.destroy();
        import('../core/app/Router').then(({ router }) => {
          router.navigate('/simple-pong');
        });
      } else if (target.id === 'back-to-menu-end') {
        this.destroy();
        import('../core/app/Router').then(({ router }) => {
          router.navigate('/');
        });
      }
    });

    document.body.appendChild(overlay);
    this.gameEndOverlay = overlay;

    // Record the match result to database (using saved values to avoid null references)
    await this.recordMatch(myRole, playerIds);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if ((this as any).keydownHandler) {
      document.removeEventListener('keydown', (this as any).keydownHandler);
    }
    if ((this as any).keyupHandler) {
      document.removeEventListener('keyup', (this as any).keyupHandler);
    }

    if (this.ws) {
      this.ws.close();
    }

    this.stopRenderLoop();
    this.stateBuffer = [];
    this.displayState = null;
    this.playerNames = { left: '', right: '' };
    this.lastPlayerIds = null;
    this.gameStartTime = null;

    if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
      document.body.removeChild(this.gameEndOverlay);
    }

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    if (this.header) {
      this.header.destroy();
    }
    if (this.banner) {
      this.banner.destroy();
    }

    this.element.remove();
  }

  private startCountdown(): void {
    this.isCountingDown = true;
    this.countdownValue = 5;
    this.countdownStartTime = performance.now();
    this.lastFrameTime = performance.now();
    this.countdownLoop();
  }

  private countdownLoop(): void {
    if (!this.isCountingDown) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= 1000 / 60) {
      const elapsedTime = currentTime - this.countdownStartTime;
      const newCountdownValue = Math.ceil(5 - elapsedTime / 1000);

      if (newCountdownValue !== this.countdownValue) {
        this.countdownValue = newCountdownValue;
      }

      if (elapsedTime >= 5000) {
        this.isCountingDown = false;
        this.countdownValue = 0;

        setTimeout(() => {
          this.render();
        }, 1000);
        return;
      }

      this.lastFrameTime = currentTime;
    }

    requestAnimationFrame(() => this.countdownLoop());
  }
}
