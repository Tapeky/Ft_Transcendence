import { authManager } from '../core/auth/AuthManager';
import { router } from '../core/app/Router';
import { Header } from '../shared/components/Header';
import { Banner } from '../shared/components/Banner';
import { apiService } from '../shared/services/api';
import { appState } from '../core/state/AppState';
import { GameManager } from '../services/GameManager';
import { gameNotificationService } from '../shared/services/GameNotificationService';

interface GameState {
    leftPaddle: { pos: { x: number; y: number }; hitCount: number; };
    rightPaddle: { pos: { x: number; y: number }; hitCount: number; };
    ball: { pos: { x: number; y: number }; direction: { x: number; y: number }; };
    state: number;
    leftScore: number;
    rightScore: number;
}

interface TournamentGameContext {
    tournamentId: string;
    matchId: string;
    player1Alias: string;
    player2Alias: string;
    round: number;
    matchNumber: number;
}

export class GamePage {
    private element: HTMLElement;
    private header?: Header;
    private banner?: Banner;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private gameState: GameState | null = null;
    private localInputLeft = { up: false, down: false };
    private localInputRight = { up: false, down: false };
    private animationId: number | null = null;
    private gameEndOverlay: HTMLElement | null = null;
    private tournamentContext?: TournamentGameContext;
    private authUnsubscribe?: () => void;
    private gameEnded: boolean = false;
    private lastFrameTime: number = 0;
    private readonly TARGET_FPS = 60;
    private isCountingDown: boolean = false;
    private countdownValue: number = 5;
    private countdownStartTime: number = 0;
    private readonly ARENA_WIDTH = 800;
    private readonly ARENA_HEIGHT = 500;
    private readonly PADDLE_WIDTH = 8;
    private readonly PADDLE_HEIGHT = 80;
    private leftPlayerReady: boolean = false;
    private rightPlayerReady: boolean = false;
    private isPlayerReady: boolean = false;
    private readonly BALL_RADIUS = 8;
    private readonly INITIAL_BALL_SPEED = 4;
    private readonly SPEED_INCREASE = 0.3;
    private readonly MAX_BALL_SPEED = 12;
    
    // Debug utilities to reduce log spam
    private lastRenderLog = 0;
    private readonly LOG_THROTTLE = 5000; // 5s
    private previousState: GameState | null = null;
    
    // Online game properties
    private gameManager?: GameManager;
    private isOnlineGame: boolean = false;
    private sessionId?: string;
    private isLeftPlayer: boolean = true; // Legacy fallback - use getPlayerSide() instead

    constructor() {
        this.element = this.createElement();
        this.bindEvents();
        this.subscribeToAuth();
        this.checkTournamentContext();
        this.checkOnlineGameContext();
        this.setupCleanupHandlers();
    }

    private createElement(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';
        this.header = new Header(true);
        this.banner = new Banner();
        const gameContent = document.createElement('main');
        gameContent.className = 'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700 items-center justify-center p-8';
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
                    <button id="back-to-menu" class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
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
        const backButton = this.element.querySelector('#back-to-menu');
        backButton?.addEventListener('click', () => {
            this.destroy();
            router.navigate('/menu');
        });
        setTimeout(() => this.initializeGame(), 100);
    }

    private checkTournamentContext(): void {
        const urlParams = new URLSearchParams(window.location.search);
        const tournamentContextParam = urlParams.get('tournamentContext');
        if (tournamentContextParam) {
            try {
                this.tournamentContext = JSON.parse(decodeURIComponent(tournamentContextParam));
            } catch (e) {
                console.error('Failed to parse tournament context');
            }
        }
    }

    private checkOnlineGameContext(): void {
        // Check for sessionId in query params first
        const urlParams = new URLSearchParams(window.location.search);
        let sessionId = urlParams.get('sessionId');

        // If not found in query params, check URL path for /game/:gameId format
        if (!sessionId) {
            const pathSegments = window.location.pathname.split('/');
            if (pathSegments.length >= 3 && pathSegments[1] === 'game' && pathSegments[2]) {
                sessionId = pathSegments[2];
                console.log(`🎮 Game ID found in URL path: ${sessionId}`);
            }
        }

        if (sessionId) {
            this.isOnlineGame = true;
            this.sessionId = sessionId;
            console.log(`🎮 Online game detected with session ID: ${sessionId}`);
        }
    }

    private async setupOnlineGame(): Promise<void> {
        try {
            this.gameManager = GameManager.getInstance();
            await this.gameManager.initialize();
            
            if (!this.sessionId) {
                console.error('No session ID for online game');
                return;
            }
            
            // Set up online game event listeners
            this.gameManager.onGameStateUpdate = (gameData) => {
                this.handleOnlineGameUpdate(gameData);
            };
            
            this.gameManager.onGameStarted = (sessionId) => {
                console.log('🚀 Online game started!', sessionId);
                // Log utile : Game start with details
                const playerSide = this.getPlayerSide();
                const initialState = this.gameState;
                console.log(`🎮 Game Started: Session=${sessionId}, Side=${playerSide}, Initial State: Scores 0-0, Ball @ ${initialState?.ball.pos.x.toFixed(2) || 'unknown'},${initialState?.ball.pos.y.toFixed(2) || 'unknown'}`);
                this.startOnlineGame();
            };
            
            this.gameManager.onGameEnded = (result) => {
                console.log('🏁 Online game ended', result);
                this.handleOnlineGameEnd(result);
            };

            this.gameManager.onGameEvent = (event, data) => {
                if (event === 'ready_status_update') {
                    this.handleReadyStatusUpdate(data);
                } else if (event === 'player_side_assigned') {
                    console.log(`🎯 [GamePage] Player side assigned: ${data.playerSide}`);
                    this.render(); // Force UI update when side is assigned
                }
            };

            this.gameManager.onCountdown = (count) => {
                this.handleServerCountdown(count);
            };

            this.gameManager.onGameActuallyStarted = () => {
                this.handleGameActuallyStarted();
            };
            
            // Join the game session
            await this.gameManager.joinGameSession(this.sessionId);
            
            // Initialize game state for online play
            this.initializeOnlineGameState();
            
        } catch (error) {
            console.error('Failed to setup online game:', error);
            // Fallback to local game
            this.isOnlineGame = false;
            this.setupLocalGame();
        }
    }
    
    private initializeOnlineGameState(): void {
        this.gameState = {
            leftPaddle: { pos: { x: 20, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            rightPaddle: { pos: { x: this.ARENA_WIDTH - 28, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            ball: { pos: { x: this.ARENA_WIDTH / 2, y: this.ARENA_HEIGHT / 2 }, direction: { x: this.INITIAL_BALL_SPEED, y: 3 } },
            state: 0, // Waiting for game start
            leftScore: 0,
            rightScore: 0
        };
        
        this.setupKeyboardListeners();
        this.render();

        // Initialize Ready Check UI for online games
        this.updateReadyCheckUI();

        // Start render-only loop for online games
        this.startOnlineRenderLoop();
    }
    
    private startOnlineGame(): void {
        if (!this.gameState) return;

        console.log('🚀 Online game starting - waiting for server countdown');
        this.gameState.state = 1; // Game active
        this.render();
        // Server will send countdown events - no local countdown needed
    }
    
    private startOnlineRenderLoop(): void {
        if (!this.isOnlineGame) return;
        
        const renderFrame = () => {
            if (!this.isOnlineGame || this.gameEnded) return;
            
            // Only render - no simulation
            this.render();
            
            // Check for game end based on server state
            if (this.gameState && (this.gameState.leftScore >= 5 || this.gameState.rightScore >= 5)) {
                if (!this.gameEnded) {
                    this.gameEnded = true;
                    const winner = this.gameState.leftScore >= 5 ? 'Left Player' : 'Right Player';
                    const winnerAlias = this.getWinnerAlias(this.gameState.leftScore >= 5);
                    this.showGameEnd(winnerAlias || winner).catch(console.error);
                    return;
                }
            }
            
            this.animationId = requestAnimationFrame(renderFrame);
        };
        
        console.log('🎮 Starting online render-only loop');
        this.animationId = requestAnimationFrame(renderFrame);
    }
    
    private handleOnlineGameUpdate(gameData: any): void {
        if (!this.gameState) return;

        // Only log score changes and significant events
        const scoreChanged = (this.gameState.leftScore !== gameData.leftScore ||
                            this.gameState.rightScore !== gameData.rightScore);
        if (scoreChanged) {
            console.log(`🏓 Score: ${gameData.leftScore}-${gameData.rightScore}`);
        }

        // Update game state from server
        const oldLeftY = this.gameState.leftPaddle?.pos?.y || 0;
        const oldRightY = this.gameState.rightPaddle?.pos?.y || 0;

        this.gameState.leftPaddle = gameData.leftPaddle;
        this.gameState.rightPaddle = gameData.rightPaddle;

        // Log paddle movements
        const newLeftY = gameData.leftPaddle?.pos?.y || 0;
        const newRightY = gameData.rightPaddle?.pos?.y || 0;

        if (Math.abs(newLeftY - oldLeftY) > 1) {
            console.log(`🏓 LEFT PADDLE MOVED: ${oldLeftY.toFixed(1)} → ${newLeftY.toFixed(1)}`);
        }
        if (Math.abs(newRightY - oldRightY) > 1) {
            console.log(`🏓 RIGHT PADDLE MOVED: ${oldRightY.toFixed(1)} → ${newRightY.toFixed(1)}`);
        }

        // TEST: Block ball updates during countdown instead of blocking keys
        if (this.isCountingDown) {
            console.log(`⚠️ BALL BLOCKED: Ball update blocked by countdown (isCountingDown=${this.isCountingDown})`);
            // Don't update ball position during countdown
        } else {
            this.gameState.ball = gameData.ball;
        }

        this.gameState.leftScore = gameData.leftScore;
        this.gameState.rightScore = gameData.rightScore;
        this.gameState.state = gameData.state;

        this.render();
        
        // Check for game end
        if (gameData.leftScore >= 5 || gameData.rightScore >= 5) {
            if (!this.gameEnded) {
                this.gameEnded = true;
                const winner = gameData.leftScore >= 5 ? 'Left Player' : 'Right Player';
                this.showGameEnd(winner).catch(console.error);
            }
        }
    }
    
    private handleOnlineGameEnd(result: any): void {
        if (this.gameEnded) {
            console.log('🔄 Game already ended, skipping duplicate end');
            return;
        }

        this.gameEnded = true;
        console.log('Game ended with result:', result);

        // Stop the rendering loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Show game end screen
        if (result.winner) {
            this.showGameEnd(result.winner).catch(console.error);
        }
    }

    private handleReadyStatusUpdate(data: any): void {
        console.log('🟢 [GamePage] Ready status update:', data);
        console.log('🔍 [GamePage] Ready status data structure:', JSON.stringify(data, null, 2));
        console.log('🔍 [GamePage] leftPlayerReady from data:', data.leftPlayerReady);
        console.log('🔍 [GamePage] rightPlayerReady from data:', data.rightPlayerReady);

        this.leftPlayerReady = data.leftPlayerReady || false;
        this.rightPlayerReady = data.rightPlayerReady || false;

        console.log(`🔍 [GamePage] Updated ready states: left=${this.leftPlayerReady}, right=${this.rightPlayerReady}`);
        this.updateReadyCheckUI();
    }

    private handleServerCountdown(count: number): void {
        console.log(`⏰ [GamePage] Server countdown: ${count}, gameState=${this.gameState?.state}, isCountingDown=${this.isCountingDown}`);

        // ✅ FIX: Ne pas remettre isCountingDown à true si le jeu a déjà commencé
        if (count > 0) {
            this.isCountingDown = true;
            this.countdownValue = count;
        } else {
            // count === 0 signifie "GO!"
            console.log('🏁 [GamePage] Countdown reached 0 - calling handleGameActuallyStarted');
            this.handleGameActuallyStarted();
            return; // ✅ Important: sortir ici pour éviter le render
        }

        this.render();
    }

    private handleGameActuallyStarted(): void {
        console.log('🚀 [STEP 1] handleGameActuallyStarted called');
        
        // ✅ Déblocage forcé de tous les états
        this.isCountingDown = false;
        this.countdownValue = 0;
        console.log('🚀 [STEP 2] States reset - isCountingDown:', this.isCountingDown, 'countdownValue:', this.countdownValue);
        
        // ✅ Activer explicitement le jeu
        if (this.gameState) {
            this.gameState.state = 1; // PongState.Running
            console.log('🚀 [STEP 3] Game state explicitly set to Running:', this.gameState.state);
        } else {
            console.error('🚀 [STEP 3 ERROR] gameState is null!');
        }

        // ✅ Mise à jour UI immédiate
        const container = this.element.querySelector('#ready-check-container');
        if (container) {
            console.log('🚀 [STEP 4] Found ready-check-container, updating HTML');
            container.innerHTML = `
                <div class="text-green-300 font-bold animate-pulse">
                    🎮 Game Started! Controls active!
                </div>
            `;
        } else {
            console.error('🚀 [STEP 4 ERROR] ready-check-container not found in DOM!');
        }

        // ✅ Force render pour appliquer les changements
        console.log('🚀 [STEP 5] Calling render()...');
        this.render();
        console.log('🚀 [STEP 6] Render completed');
        
        // ✅ Log de confirmation
        console.log(`🚀 [STEP 7] Final state check: countdown=${this.isCountingDown}, gameState=${this.gameState?.state}`);
        
        // ✅ NOUVEAU: Test si le DOM a bien été mis à jour
        setTimeout(() => {
            const checkContainer = this.element.querySelector('#ready-check-container');
            console.log('🚀 [STEP 8] DOM check after render:', {
                containerExists: !!checkContainer,
                containerHTML: checkContainer?.innerHTML,
                isCountingDown: this.isCountingDown
            });
        }, 100);
    }

    private updateReadyCheckUI(): void {
        const container = this.element.querySelector('#ready-check-container');
        if (!container) return;

        const bothReady = this.leftPlayerReady && this.rightPlayerReady;

        if (bothReady) {
            container.innerHTML = `
                <div class="text-green-300 font-bold mb-2">
                    ✅ Both players ready - Starting countdown!
                </div>
            `;
        } else {
            const playerReadyText = this.isPlayerReady ? '✅ You are ready' : '⏳ Click Ready to start';
            const opponentReadyText = this.getIsLeftPlayer()
                ? (this.rightPlayerReady ? '✅ Opponent ready' : '⏳ Waiting for opponent')
                : (this.leftPlayerReady ? '✅ Opponent ready' : '⏳ Waiting for opponent');

            container.innerHTML = `
                <div class="mb-3">
                    <div class="text-white mb-2">${playerReadyText}</div>
                    <div class="text-gray-300 text-sm">${opponentReadyText}</div>
                </div>
                ${!this.isPlayerReady ? `
                    <button id="ready-button" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded border-2 border-green-400 transition-colors">
                        Ready!
                    </button>
                ` : `
                    <button id="unready-button" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded border-2 border-red-400 transition-colors">
                        Not Ready
                    </button>
                `}
            `;

            // Add click handlers
            const readyButton = container.querySelector('#ready-button');
            const unreadyButton = container.querySelector('#unready-button');

            if (readyButton) {
                readyButton.addEventListener('click', () => this.setPlayerReady(true));
            }
            if (unreadyButton) {
                unreadyButton.addEventListener('click', () => this.setPlayerReady(false));
            }
        }
    }

    private setPlayerReady(ready: boolean): void {
        if (!this.gameManager) {
            console.warn('Cannot set ready status - GameManager not available');
            return;
        }

        this.isPlayerReady = ready;
        this.gameManager.sendReady(ready);
        this.updateReadyCheckUI();
    }

    private subscribeToAuth(): void {
        this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
            if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
                router.navigate('/');
            }
        });
        if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
            router.navigate('/');
        }
    }

    private initializeGame(): void {
        const container = this.element.querySelector('#game-canvas-container');
        if (!container) {
            console.error('Game container not found');
            return;
        }
        this.initCanvas(container as HTMLElement);
        
        if (this.isOnlineGame) {
            this.setupOnlineGame();
        } else {
            this.setupLocalGame();
        }
        
        this.updateInstructions();
    }

    private initCanvas(container: HTMLElement): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.ARENA_WIDTH;
        this.canvas.height = this.ARENA_HEIGHT;
        this.canvas.style.border = '3px solid #fff';
        this.canvas.style.backgroundColor = '#000';
        this.canvas.style.display = 'block';
        this.canvas.style.borderRadius = '8px';
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
        container.appendChild(this.canvas);
    }

    private updateInstructions(): void {
        const instructionsElement = this.element.querySelector('#game-instructions');
        if (!instructionsElement) return;

        if (this.isOnlineGame) {
            instructionsElement.innerHTML = `
                <div class="text-xl font-bold mb-2 text-green-300">
                    🌐 Online Game
                </div>
                <div class="text-lg">
                    ${(() => {
                        const isLeft = this.getIsLeftPlayer();
                        const side = this.getPlayerSide();
                        console.log(`🖥️ [GamePage] UI Rendering: side=${side}, isLeft=${isLeft}`);
                        return isLeft ? 'You are Left Player (W/S Keys)' : 'You are Right Player (↑/↓ Keys)';
                    })()}
                </div>
                <div id="ready-check-container" class="mt-4">
                    <div class="text-sm text-gray-300 mb-2">
                        Waiting for ready check...
                    </div>
                </div>
            `;
        } else if (this.tournamentContext) {
            instructionsElement.innerHTML = `
                <div class="text-2xl font-bold mb-2">
                    ${this.tournamentContext.player1Alias} vs ${this.tournamentContext.player2Alias}
                </div>
                <div class="text-lg mb-2">
                    Round ${this.tournamentContext.round} • Match ${this.tournamentContext.matchNumber}
                </div>
                <div class="text-lg">
                    <span class="text-blue-300">${this.tournamentContext.player1Alias}</span>: W/S Keys (Left) | 
                    <span class="text-blue-300">${this.tournamentContext.player2Alias}</span>: ↑/↓ Keys (Right)
                </div>
            `;
        } else {
            instructionsElement.innerHTML = `
                <div class="text-lg">
                    Player 1: W/S Keys | Player 2: ↑/↓ Arrow Keys
                </div>
            `;
        }
    }

    private setupLocalGame(): void {
        this.gameState = {
            leftPaddle: { pos: { x: 20, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            rightPaddle: { pos: { x: this.ARENA_WIDTH - 28, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            ball: { pos: { x: this.ARENA_WIDTH / 2, y: this.ARENA_HEIGHT / 2 }, direction: { x: this.INITIAL_BALL_SPEED, y: 3 } },
            state: 1,
            leftScore: 0,
            rightScore: 0
        };
        this.setupKeyboardListeners();
        this.startLocalGame();
    }

    private startLocalGame(): void {
        this.render();
        this.startCountdown();
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
        if (deltaTime >= (1000 / this.TARGET_FPS)) {
            const elapsedTime = currentTime - this.countdownStartTime;
            const newCountdownValue = Math.ceil(5 - elapsedTime / 1000);
            if (newCountdownValue !== this.countdownValue) {
                this.countdownValue = newCountdownValue;
            }
            this.render();
            if (elapsedTime >= 5000) {
                this.isCountingDown = false;
                this.countdownValue = 0;
                this.lastFrameTime = performance.now();
                this.localGameLoop();
                return;
            }
            this.lastFrameTime = currentTime;
        }
        this.animationId = requestAnimationFrame(() => this.countdownLoop());
    }

    private localGameLoop(): void {
        if (!this.gameState || this.gameEnded) return;
        
        // Skip local simulation for online games - server handles everything
        if (this.isOnlineGame) {
            console.log('🔇 Skipping local game loop - server authoritative mode');
            return;
        }
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        if (deltaTime >= (1000 / this.TARGET_FPS)) {
            this.updateLocalGame();
            this.render();
            if (this.gameState.leftScore >= 5 || this.gameState.rightScore >= 5) {
                if (!this.gameEnded) {
                    this.gameEnded = true;
                    const winner = this.gameState.leftScore >= 5 ? 'Player 1' : 'Player 2';
                    const winnerAlias = this.getWinnerAlias(this.gameState.leftScore >= 5);
                    this.showGameEnd(winnerAlias || winner).catch(console.error);
                    return;
                }
            }
            this.lastFrameTime = currentTime;
        }
        this.animationId = requestAnimationFrame(() => this.localGameLoop());
    }

    private getWinnerAlias(leftPlayerWon: boolean): string | null {
        if (this.tournamentContext) {
            return leftPlayerWon ? this.tournamentContext.player1Alias : this.tournamentContext.player2Alias;
        }
        return null;
    }

    private updateLocalGame(): void {
        if (!this.gameState) return;
        
        // En mode online, ne simule que les paddles pour responsivité
        // Ball simulation = server only
        this.updateLocalPaddles();
        
        if (!this.isOnlineGame) {
            // Simulation de la balle seulement en mode local
            this.updateBall();
        }
    }

    private updateLocalPaddles(): void {
        if (!this.gameState) return;
        
        // Pour jeu en ligne, ne simule que ton paddle pour responsivité
        // L'autre paddle est mis à jour par le serveur uniquement
        if (this.isOnlineGame) {
            const speed = 6;
            if (this.getIsLeftPlayer()) {
                // Simulation locale seulement pour left paddle
                if (this.localInputLeft.up && this.gameState.leftPaddle.pos.y > 0) {
                    this.gameState.leftPaddle.pos.y -= speed;
                }
                if (this.localInputLeft.down && this.gameState.leftPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
                    this.gameState.leftPaddle.pos.y += speed;
                }
                // Right paddle: server-only, pas de simulation locale
            } else {
                // Simulation locale seulement pour right paddle
                if (this.localInputRight.up && this.gameState.rightPaddle.pos.y > 0) {
                    this.gameState.rightPaddle.pos.y -= speed;
                }
                if (this.localInputRight.down && this.gameState.rightPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
                    this.gameState.rightPaddle.pos.y += speed;
                }
                // Left paddle: server-only, pas de simulation locale
            }
        } else {
            // Jeu local : simule les deux paddles
            const speed = 6;
            if (this.localInputLeft.up && this.gameState.leftPaddle.pos.y > 0) {
                this.gameState.leftPaddle.pos.y -= speed;
            }
            if (this.localInputLeft.down && this.gameState.leftPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
                this.gameState.leftPaddle.pos.y += speed;
            }
            if (this.localInputRight.up && this.gameState.rightPaddle.pos.y > 0) {
                this.gameState.rightPaddle.pos.y -= speed;
            }
            if (this.localInputRight.down && this.gameState.rightPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
                this.gameState.rightPaddle.pos.y += speed;
            }
        }
    }

    private updateBall(): void {
        if (!this.gameState) return;
        const ball = this.gameState.ball;
        ball.pos.x += ball.direction.x;
        ball.pos.y += ball.direction.y;
        if (ball.pos.y <= this.BALL_RADIUS || ball.pos.y >= this.ARENA_HEIGHT - this.BALL_RADIUS) {
            ball.direction.y = -ball.direction.y;
        }
        if (ball.pos.x <= this.gameState.leftPaddle.pos.x + this.PADDLE_WIDTH &&
            ball.pos.y >= this.gameState.leftPaddle.pos.y &&
            ball.pos.y <= this.gameState.leftPaddle.pos.y + this.PADDLE_HEIGHT) {
            ball.direction.x = Math.abs(ball.direction.x);
            this.increaseBallSpeed();
            this.gameState.leftPaddle.hitCount++;
        }
        if (ball.pos.x >= this.gameState.rightPaddle.pos.x - this.BALL_RADIUS &&
            ball.pos.y >= this.gameState.rightPaddle.pos.y &&
            ball.pos.y <= this.gameState.rightPaddle.pos.y + this.PADDLE_HEIGHT) {
            ball.direction.x = -Math.abs(ball.direction.x);
            this.increaseBallSpeed();
            this.gameState.rightPaddle.hitCount++;
        }
        if (ball.pos.x < 0) {
            this.gameState.rightScore++;
            this.resetBall();
        } else if (ball.pos.x > this.ARENA_WIDTH) {
            this.gameState.leftScore++;
            this.resetBall();
        }
    }

    private resetBall(): void {
        if (!this.gameState) return;
        this.gameState.ball.pos.x = this.ARENA_WIDTH / 2;
        this.gameState.ball.pos.y = this.ARENA_HEIGHT / 2;
        this.gameState.ball.direction.x = Math.random() > 0.5 ? this.INITIAL_BALL_SPEED : -this.INITIAL_BALL_SPEED;
        this.gameState.ball.direction.y = (Math.random() - 0.5) * 6;
    }

    private increaseBallSpeed(): void {
        if (!this.gameState) return;
        const ball = this.gameState.ball;
        
        // Calculate current speed
        const currentSpeedX = Math.abs(ball.direction.x);
        const currentSpeedY = Math.abs(ball.direction.y);
        
        // Increase speed but cap at maximum
        const newSpeedX = Math.min(currentSpeedX + this.SPEED_INCREASE, this.MAX_BALL_SPEED);
        const newSpeedY = Math.min(currentSpeedY + this.SPEED_INCREASE, this.MAX_BALL_SPEED);
        
        // Maintain direction while increasing speed
        ball.direction.x = ball.direction.x > 0 ? newSpeedX : -newSpeedX;
        ball.direction.y = ball.direction.y > 0 ? newSpeedY : -newSpeedY;
    }

    private setupKeyboardListeners(): void {
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    private keydownHandler = (e: KeyboardEvent) => {
        // ✅ Debug avec logs colorés pour ressortir
        console.log(`%c🎮 [INPUT STEP 1] Key pressed: ${e.key}`, 'background: #ff0000; color: white; font-weight: bold; padding: 2px;');
        console.log(`%c🎮 [INPUT STEP 2] Game state check:`, 'background: #ff4500; color: white; font-weight: bold; padding: 2px;', {
            isCountingDown: this.isCountingDown,
            isOnlineGame: this.isOnlineGame,
            gameState: this.gameState?.state,
            playerSide: this.getPlayerSide(),
            hasGameManager: !!this.gameManager,
            hasSessionId: !!this.sessionId
        });
        
        if (this.isOnlineGame) {
            console.log(`🎮 [INPUT STEP 3] Online game - calling handleOnlineInput`);
            this.handleOnlineInput(e.key, true);
            console.log('🎮 [INPUT STEP 4] handleOnlineInput completed');
        } else {
            // Local game logic
            console.log('� [INPUT STEP 3] Local game input');
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.localInputLeft.up = true;
                    e.preventDefault();
                    break;
                case 's':
                    this.localInputLeft.down = true;
                    e.preventDefault();
                    break;
                case 'arrowup':
                    this.localInputRight.up = true;
                    e.preventDefault();
                    break;
                case 'arrowdown':
                    this.localInputRight.down = true;
                    e.preventDefault();
                    break;
            }
        }
        
        console.log(`🎮 [INPUT STEP 5] Input processing completed for ${e.key}`);
    }

    private keyupHandler = (e: KeyboardEvent) => {
        if (this.isOnlineGame) {
            // Send input to server for online games
            this.handleOnlineInput(e.key, false);
        } else {
            // Handle local input for local games
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.localInputLeft.up = false;
                    break;
                case 's':
                    this.localInputLeft.down = false;
                    break;
                case 'arrowup':
                    this.localInputRight.up = false;
                    break;
                case 'arrowdown':
                    this.localInputRight.down = false;
                    break;
            }
        }
    }
    
    private handleOnlineInput(key: string, isPressed: boolean): void {
        console.log(`🎮 [ONLINE INPUT STEP 1] handleOnlineInput called: ${key}, pressed=${isPressed}`);
        
        if (!this.gameManager) {
            console.error('🎮 [ONLINE INPUT ERROR] gameManager is null!');
            return;
        }
        if (!this.sessionId) {
            console.error('🎮 [ONLINE INPUT ERROR] sessionId is null!');
            return;
        }
        
        console.log(`🎮 [ONLINE INPUT STEP 2] Validation passed - gameManager and sessionId exist`);
        
        const playerSide = this.getPlayerSide();
        const normalizedKey = key.toLowerCase();
        
        console.log(`🎮 [ONLINE INPUT STEP 3] Player side: ${playerSide}, normalized key: ${normalizedKey}`);
        
        // Validation des touches par side
        let validKeys: string[] = [];
        if (playerSide === 'left') {
            validKeys = ['w', 's'];
        } else if (playerSide === 'right') {
            validKeys = ['arrowup', 'arrowdown'];
        }
        
        console.log(`🎮 [ONLINE INPUT STEP 4] Valid keys for ${playerSide}:`, validKeys);
        
        if (validKeys.includes(normalizedKey)) {
            // ✅ Log plus détaillé
            const action = normalizedKey === 'w' || normalizedKey === 'arrowup' ? 'Up' : 'Down';
            console.log(`🎮 [ONLINE INPUT STEP 5] Key ${normalizedKey} is valid - Action: ${action} ${isPressed ? 'pressed' : 'released'} [${playerSide}]`);
            
            console.log(`🎮 [ONLINE INPUT STEP 6] Calling gameManager.sendInput...`);
            this.gameManager.sendInput({
                key: normalizedKey,
                pressed: isPressed,
                player: playerSide,
                timestamp: Date.now(),
                type: isPressed ? 'PADDLE_MOVE' : 'PADDLE_STOP'  // ✅ Type dynamique
            });
            console.log(`🎮 [ONLINE INPUT STEP 7] gameManager.sendInput completed`);
        } else {
            console.warn(`🎮 [ONLINE INPUT WARNING] Key ${normalizedKey} is not valid for player ${playerSide}. Valid keys:`, validKeys);
        }
    }

    private async recordMatch(leftScore: number, rightScore: number): Promise<void> {
        try {
            const currentUser = appState.getState().user;
            if (!currentUser) {
                console.warn('No user, cannot record match');
                return;
            }
            const winnerId = leftScore > rightScore ? currentUser.id : undefined;
            const matchData = {
                player1_id: currentUser.id,
                player2_id: undefined,
                player1_guest_name: undefined,
                player2_guest_name: 'Guest Player',
                player1_score: leftScore,
                player2_score: rightScore,
                winner_id: winnerId,
                game_type: 'pong',
                max_score: 5,
                duration_seconds: 60,
                player1_touched_ball: this.gameState?.leftPaddle.hitCount || 0,
                player1_missed_ball: Math.max(0, rightScore),
                player2_touched_ball: this.gameState?.rightPaddle.hitCount || 0,
                player2_missed_ball: Math.max(0, leftScore)
            };
            await apiService.recordMatch(matchData);
        } catch (error) {
            console.error('Failed to record match');
        }
    }

    private async showGameEnd(winner: string): Promise<void> {
        if (this.gameEndOverlay) return;
        const leftScore = this.gameState?.leftScore || 0;
        const rightScore = this.gameState?.rightScore || 0;
        if (!this.tournamentContext) {
            await this.recordMatch(leftScore, rightScore);
        }
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        if (this.tournamentContext) {
            overlay.innerHTML = `
                <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-12 text-center max-w-lg">
                    <h2 class="text-4xl font-bold text-white font-iceland mb-6">🏆 Match Complete!</h2>
                    <p class="text-3xl text-yellow-300 font-bold font-iceland mb-4">Winner: ${winner}</p>
                    <p class="text-xl text-white font-iceland mb-6">Final Score: ${leftScore} - ${rightScore}</p>
                    <div class="bg-black/50 border border-white rounded-lg p-4 mb-6">
                        <div class="text-lg text-white font-iceland mb-2">${this.tournamentContext.player1Alias}: ${leftScore}</div>
                        <div class="text-lg text-white font-iceland">${this.tournamentContext.player2Alias}: ${rightScore}</div>
                    </div>
                    <p class="text-sm text-gray-300 font-iceland mb-6">Round ${this.tournamentContext.round} • Match ${this.tournamentContext.matchNumber}</p>
                    <div class="flex gap-4 justify-center">
                        <button id="continue-tournament" class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg font-bold">
                            Continue Tournament
                        </button>
                        <button id="back-to-tournament" class="text-white border-gray-400 border-2 px-6 py-3 rounded hover:bg-gray-400 hover:text-black transition-colors font-iceland text-lg">
                            Back to Tournament
                        </button>
                    </div>
                </div>
            `;
        } else {
            overlay.innerHTML = `
                <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-12 text-center max-w-lg">
                    <h2 class="text-4xl font-bold text-white font-iceland mb-6">🏆 Game Over!</h2>
                    <p class="text-3xl text-yellow-300 font-bold font-iceland mb-4">Winner: ${winner}</p>
                    <p class="text-xl text-white font-iceland mb-8">Final Score: ${leftScore} - ${rightScore}</p>
                    <div class="flex gap-4 justify-center">
                        <button id="play-again" class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg font-bold">
                            Play Again
                        </button>
                        <button id="back-to-menu-end" class="text-white border-gray-400 border-2 px-6 py-3 rounded hover:bg-gray-400 hover:text-black transition-colors font-iceland text-lg">
                            Back to Menu
                        </button>
                    </div>
                </div>
            `;
        }
        overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.id === 'continue-tournament') {
                this.handleTournamentMatchComplete();
            } else if (target.id === 'back-to-tournament') {
                this.destroy();
                router.navigate('/tournament');
            } else if (target.id === 'play-again') {
                this.destroy();
                router.navigate('/game');
            } else if (target.id === 'back-to-menu-end') {
                this.destroy();
                router.navigate('/menu');
            }
        });
        document.body.appendChild(overlay);
        this.gameEndOverlay = overlay;
    }

    private handleTournamentMatchComplete(): void {
        if (!this.tournamentContext || !this.gameState) return;
        const leftScore = this.gameState.leftScore;
        const rightScore = this.gameState.rightScore;
        const winnerAlias = leftScore > rightScore ? 
            this.tournamentContext.player1Alias : 
            this.tournamentContext.player2Alias;
        const matchResult = {
            tournamentId: this.tournamentContext.tournamentId,
            matchId: this.tournamentContext.matchId,
            player1Score: leftScore,
            player2Score: rightScore,
            winnerAlias: winnerAlias
        };
        sessionStorage.setItem('tournamentMatchResult', JSON.stringify(matchResult));
        this.destroy();
        router.navigate('/tournament');
    }

    private render(): void {
        // console.log(`🎨 [RENDER STEP 1] render() called - gameState exists: ${!!this.gameState}, ctx exists: ${!!this.ctx}, isCountingDown: ${this.isCountingDown}`);
        
        if (!this.gameState || !this.ctx) {
            console.error(`🎨 [RENDER ERROR] Missing requirements - gameState: ${!!this.gameState}, ctx: ${!!this.ctx}`);
            return;
        }
        
        // console.log(`🎨 [RENDER STEP 2] Starting canvas rendering...`);
        
        // Clear canvas and draw game elements
        this.ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.ARENA_WIDTH / 2, 0);
        this.ctx.lineTo(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(
            this.gameState.leftPaddle.pos.x,
            this.gameState.leftPaddle.pos.y,
            this.PADDLE_WIDTH,
            this.PADDLE_HEIGHT
        );
        this.ctx.fillRect(
            this.gameState.rightPaddle.pos.x,
            this.gameState.rightPaddle.pos.y,
            this.PADDLE_WIDTH,
            this.PADDLE_HEIGHT
        );
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.ball.pos.x,
            this.gameState.ball.pos.y,
            this.BALL_RADIUS,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '48px Iceland, monospace';
        this.ctx.fillText(
            this.gameState.leftScore.toString(),
            this.ARENA_WIDTH / 4,
            80
        );
        this.ctx.fillText(
            this.gameState.rightScore.toString(),
            (3 * this.ARENA_WIDTH) / 4,
            80
        );
        if (this.tournamentContext) {
            this.ctx.font = '24px Iceland, monospace';
            this.ctx.fillStyle = '#ADD8E6';
            this.ctx.fillText(
                this.tournamentContext.player1Alias,
                this.ARENA_WIDTH / 4,
                120
            );
            this.ctx.fillText(
                this.tournamentContext.player2Alias,
                (3 * this.ARENA_WIDTH) / 4,
                120
            );
        }
        if (this.isCountingDown) {
            // console.log(`🎨 [COUNTDOWN DEBUG] Rendering countdown overlay - isCountingDown: ${this.isCountingDown}, countdownValue: ${this.countdownValue}`);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
            const elapsedTime = performance.now() - this.countdownStartTime;
            const progress = (elapsedTime % 1000) / 1000;
            const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
            this.ctx.save();
            this.ctx.translate(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT / 2);
            this.ctx.scale(scale, scale);
            this.ctx.textAlign = 'center';
            if (this.countdownValue > 0) {
                console.log(`🎨 RENDERING COUNTDOWN: ${this.countdownValue}`);
                const colors = ['#FF0000', '#FF4500', '#FFD700', '#32CD32', '#1E90FF'];
                this.ctx.fillStyle = colors[this.countdownValue - 1] || '#FFD700';
                this.ctx.font = 'bold 120px Iceland, monospace';
                this.ctx.fillText(this.countdownValue.toString(), 0, 40);
            } else {
                this.ctx.fillStyle = '#00FF00';
                this.ctx.font = 'bold 120px Iceland, monospace';
                this.ctx.fillText('GO!', 0, 40);
            }
            this.ctx.restore();
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 32px Iceland, monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'GET READY!',
                this.ARENA_WIDTH / 2,
                this.ARENA_HEIGHT / 2 - 80
            );
            if (this.tournamentContext) {
                this.ctx.fillStyle = '#ADD8E6';
                this.ctx.font = '20px Iceland, monospace';
                this.ctx.fillText(
                    `${this.tournamentContext.player1Alias} vs ${this.tournamentContext.player2Alias}`,
                    this.ARENA_WIDTH / 2,
                    this.ARENA_HEIGHT / 2 + 120
                );
                this.ctx.fillText(
                    `Round ${this.tournamentContext.round} • Match ${this.tournamentContext.matchNumber}`,
                    this.ARENA_WIDTH / 2,
                    this.ARENA_HEIGHT / 2 + 150
                );
            }
        }
        
        // Render logs disabled for cleaner debugging

        // Log utile : Detect changes (pour debug desync)
        if (this.previousState) {
            const deltaLeftY = Math.abs(this.gameState.leftPaddle.pos.y - this.previousState.leftPaddle.pos.y);
            const deltaRightY = Math.abs(this.gameState.rightPaddle.pos.y - this.previousState.rightPaddle.pos.y);
            const deltaBallX = Math.abs(this.gameState.ball.pos.x - this.previousState.ball.pos.x);
            if (deltaLeftY > 0.1 || deltaRightY > 0.1 || deltaBallX > 1) {  // Threshold pour move
                const playerSide = this.getPlayerSide();
                console.log(`🔄 State Change Detected: LeftΔY=${deltaLeftY.toFixed(2)}, RightΔY=${deltaRightY.toFixed(2)}, BallΔX=${deltaBallX.toFixed(2)} | Side: ${playerSide}`);
            }
        }

        // Log utile : Score change (seulement si new score)
        if (this.previousState && (this.gameState.leftScore !== this.previousState.leftScore || this.gameState.rightScore !== this.previousState.rightScore)) {
            console.log(`⚽ Score Updated: ${this.previousState.leftScore || 0}-${this.previousState.rightScore || 0} → ${this.gameState.leftScore}-${this.gameState.rightScore} | Winner? ${this.gameState.state === 2 ? 'Left' : this.gameState.state === 3 ? 'Right' : 'No'}`);
        }

        this.previousState = { ...this.gameState };  // Shallow copy pour compare
    }

    getElement(): HTMLElement {
        return this.element;
    }

    /**
     * Get the actual player side from GameService (server-assigned)
     * Falls back to legacy isLeftPlayer if GameService not available
     */
    private getPlayerSide(): 'left' | 'right' {
        if (this.isOnlineGame && this.gameManager) {
            const gameService = this.gameManager.getGameService();
            const serverSide = gameService.getPlayerSide();
            if (serverSide) {
                console.log(`🎯 [GamePage] Using server-assigned side: ${serverSide}`);
                return serverSide;
            }
            console.warn(`⚠️ [GamePage] No server side assigned yet, using fallback: ${this.isLeftPlayer ? 'left' : 'right'}`);
        }
        // Fallback to legacy behavior
        return this.isLeftPlayer ? 'left' : 'right';
    }

    /**
     * Check if current player is left player (using server-assigned side)
     */
    private getIsLeftPlayer(): boolean {
        return this.getPlayerSide() === 'left';
    }

    private setupCleanupHandlers(): void {
        // Setup browser navigation event handlers
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        window.addEventListener('pagehide', this.handlePageHide);

        // Handle browser back/forward buttons
        window.addEventListener('popstate', this.handlePopState);
    }

    private handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (this.isOnlineGame && this.gameManager?.isInGame()) {
            // Prompt user about leaving active game
            event.preventDefault();
            event.returnValue = 'You are in an active game. Are you sure you want to leave?';

            // Perform immediate cleanup
            this.performGameCleanup(true);

            return event.returnValue;
        }
    };

    private handlePageHide = () => {
        // Page is being unloaded (more reliable than beforeunload)
        if (this.isOnlineGame && this.gameManager?.isInGame()) {
            console.log('🚪 Page hiding - performing game cleanup');
            this.performGameCleanup(true);
        }
    };

    private handlePopState = () => {
        // Browser navigation detected
        if (this.isOnlineGame && this.gameManager?.isInGame()) {
            console.log('🚪 Browser navigation detected - cleaning up game');
            this.performGameCleanup(false);
        }
    };

    private performGameCleanup(immediate: boolean = false): void {
        try {
            console.log(`🧹 GamePage cleanup starting (immediate: ${immediate})`);

            // Stop any ongoing game loops
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            // Notify server we're leaving the game
            if (this.isOnlineGame && this.gameManager) {
                try {
                    console.log('📤 Notifying server about leaving game');
                    this.gameManager.leaveCurrentGame();
                } catch (error) {
                    console.warn('Error leaving game via GameManager:', error);
                }
            }

            // Additional server notification via ChatService for redundancy
            if (this.isOnlineGame && immediate) {
                try {
                    const { chatService } = require('../features/friends/services/ChatService');
                    if (chatService.isCurrentlyInGame()) {
                        console.log('📤 Additional server notification via ChatService');
                        chatService.leaveGame();
                    }
                } catch (error) {
                    console.warn('Error accessing ChatService for cleanup:', error);
                }
            }

            // Mark game as ended
            this.gameEnded = true;

            console.log('✅ GamePage cleanup completed');
        } catch (error) {
            console.error('Error during game cleanup:', error);
        }
    }

    destroy(): void {
        console.log('💥 GamePage destroy() called');

        // Remove browser event handlers first
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.removeEventListener('pagehide', this.handlePageHide);
        window.removeEventListener('popstate', this.handlePopState);

        // Perform comprehensive game cleanup
        this.performGameCleanup(true);

        // Remove keyboard event handlers
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        // Cancel animation frames
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Remove game end overlay
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
            this.gameEndOverlay = null;
        }

        // Unsubscribe from auth
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
            this.authUnsubscribe = undefined;
        }

        // Clean up GameManager event handlers
        if (this.gameManager) {
            this.gameManager.onGameStateUpdate = null;
            this.gameManager.onGameStarted = null;
            this.gameManager.onGameActuallyStarted = null;
            this.gameManager.onGameEnded = null;
            this.gameManager.onGameEvent = null;
            this.gameManager.onCountdown = null;

            // Final attempt to leave game
            try {
                if (this.gameManager.isInGame()) {
                    console.log('🚪 Final attempt to leave game in destroy()');
                    this.gameManager.leaveCurrentGame();
                }
            } catch (error) {
                console.warn('Final game leave attempt failed:', error);
            }
        }

        // Clean up UI components
        if (this.header) {
            this.header.destroy();
        }
        if (this.banner) {
            this.banner.destroy();
        }

        // Remove DOM element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        console.log('✅ GamePage destroy() completed');
    }
}

