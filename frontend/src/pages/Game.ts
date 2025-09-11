import { authManager } from '../core/auth/AuthManager';
import { router } from '../core/app/Router';
import { Header } from '../shared/components/Header';
import { Banner } from '../shared/components/Banner';

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

    // Countdown system
    private isCountingDown: boolean = false;
    private countdownValue: number = 5;
    private countdownStartTime: number = 0;

    // Game constants
    private readonly ARENA_WIDTH = 800;
    private readonly ARENA_HEIGHT = 500;
    private readonly PADDLE_WIDTH = 8;
    private readonly PADDLE_HEIGHT = 80;
    private readonly BALL_RADIUS = 8;

    constructor() {
        this.element = this.createElement();
        this.bindEvents();
        this.subscribeToAuth();
        this.checkTournamentContext();
    }

    private createElement(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

        this.header = new Header(true);
        this.banner = new Banner();

        // Game content
        const gameContent = document.createElement('main');
        gameContent.className = 'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700 items-center justify-center p-8';
        
        gameContent.innerHTML = `
            <div class="text-center">
                <h1 class="text-6xl font-bold text-white mb-8 font-iceland">PONG GAME</h1>
                
                <!-- Game Arena Container -->
                <div class="bg-black/30 backdrop-blur-sm border-white border-4 rounded-xl p-8 inline-block">
                    <div id="game-canvas-container" class="mb-6">
                        <!-- Canvas will be inserted here -->
                    </div>
                    
                    <!-- Game Instructions -->
                    <div class="text-white font-iceland">
                        <div id="game-instructions" class="text-xl mb-4">
                            <!-- Instructions will be updated based on game mode -->
                        </div>
                        <div class="text-lg opacity-75">
                            First to 5 points wins!
                        </div>
                    </div>
                </div>
                
                <!-- Back Button -->
                <div class="mt-8">
                    <button id="back-to-menu" class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
                        ← Back to Menu
                    </button>
                </div>
            </div>
        `;

        // Assemble the page
        container.appendChild(this.header.getElement());
        container.appendChild(this.banner.getElement());
        container.appendChild(gameContent);

        return container;
    }

    private bindEvents(): void {
        // Back to menu button
        const backButton = this.element.querySelector('#back-to-menu');
        backButton?.addEventListener('click', () => {
            router.navigate('/menu');
        });

        // Initialize game after DOM is ready
        setTimeout(() => {
            this.initializeGame();
        }, 100);
    }

    private checkTournamentContext(): void {
        // Check for tournament context in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const tournamentContextParam = urlParams.get('tournamentContext');
        
        if (tournamentContextParam) {
            try {
                this.tournamentContext = JSON.parse(decodeURIComponent(tournamentContextParam));
                console.log('✅ Tournament context loaded:', this.tournamentContext);
            } catch (e) {
                console.error('❌ Failed to parse tournament context:', e);
            }
        }
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
        this.setupLocalGame();
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

        if (this.tournamentContext) {
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
        // Initialize local game state
        this.gameState = {
            leftPaddle: { pos: { x: 20, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            rightPaddle: { pos: { x: this.ARENA_WIDTH - 28, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            ball: { 
                pos: { x: this.ARENA_WIDTH / 2, y: this.ARENA_HEIGHT / 2 }, 
                direction: { x: 4, y: 3 } 
            },
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

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Target 60 FPS
        if (deltaTime >= (1000 / this.TARGET_FPS)) {
            this.updateLocalGame();
            this.render();
            
            // Check for game end (first to 5 points)
            if (this.gameState.leftScore >= 5 || this.gameState.rightScore >= 5) {
                if (!this.gameEnded) {
                    this.gameEnded = true;
                    const winner = this.gameState.leftScore >= 5 ? 'Player 1' : 'Player 2';
                    const winnerAlias = this.getWinnerAlias(this.gameState.leftScore >= 5);
                    this.showGameEnd(winnerAlias || winner);
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

        this.updateLocalPaddles();
        this.updateBall();
    }

    private updateLocalPaddles(): void {
        if (!this.gameState) return;

        const speed = 6;

        // Left paddle (Player 1 - W/S keys)
        if (this.localInputLeft.up && this.gameState.leftPaddle.pos.y > 0) {
            this.gameState.leftPaddle.pos.y -= speed;
        }
        if (this.localInputLeft.down && this.gameState.leftPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
            this.gameState.leftPaddle.pos.y += speed;
        }

        // Right paddle (Player 2 - Arrow keys)
        if (this.localInputRight.up && this.gameState.rightPaddle.pos.y > 0) {
            this.gameState.rightPaddle.pos.y -= speed;
        }
        if (this.localInputRight.down && this.gameState.rightPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
            this.gameState.rightPaddle.pos.y += speed;
        }
    }

    private updateBall(): void {
        if (!this.gameState) return;

        const ball = this.gameState.ball;
        
        // Move ball
        ball.pos.x += ball.direction.x;
        ball.pos.y += ball.direction.y;

        // Ball collision with top/bottom walls
        if (ball.pos.y <= this.BALL_RADIUS || ball.pos.y >= this.ARENA_HEIGHT - this.BALL_RADIUS) {
            ball.direction.y = -ball.direction.y;
        }

        // Ball collision with left paddle
        if (ball.pos.x <= this.gameState.leftPaddle.pos.x + this.PADDLE_WIDTH &&
            ball.pos.y >= this.gameState.leftPaddle.pos.y &&
            ball.pos.y <= this.gameState.leftPaddle.pos.y + this.PADDLE_HEIGHT) {
            ball.direction.x = Math.abs(ball.direction.x);
            this.gameState.leftPaddle.hitCount++;
        }

        // Ball collision with right paddle
        if (ball.pos.x >= this.gameState.rightPaddle.pos.x - this.BALL_RADIUS &&
            ball.pos.y >= this.gameState.rightPaddle.pos.y &&
            ball.pos.y <= this.gameState.rightPaddle.pos.y + this.PADDLE_HEIGHT) {
            ball.direction.x = -Math.abs(ball.direction.x);
            this.gameState.rightPaddle.hitCount++;
        }

        // Ball out of bounds - scoring
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
        
        // Random direction
        this.gameState.ball.direction.x = Math.random() > 0.5 ? 4 : -4;
        this.gameState.ball.direction.y = (Math.random() - 0.5) * 6;
    }

    private setupKeyboardListeners(): void {
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    private keydownHandler = (e: KeyboardEvent) => {
        // Don't allow input during countdown
        if (this.isCountingDown) return;
        
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

    private keyupHandler = (e: KeyboardEvent) => {
        // Still process keyup events to avoid stuck keys
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

    private showGameEnd(winner: string): void {
        if (this.gameEndOverlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';

        const leftScore = this.gameState?.leftScore || 0;
        const rightScore = this.gameState?.rightScore || 0;

        if (this.tournamentContext) {
            // Tournament mode - show match result
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
            // Regular game mode
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

        // Bind button events
        overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            if (target.id === 'continue-tournament') {
                this.handleTournamentMatchComplete();
            } else if (target.id === 'back-to-tournament') {
                this.destroy();
                router.navigate('/tournament');
            } else if (target.id === 'play-again') {
                this.destroy();
                // Reload the game page
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

        // Store tournament result for the tournament system
        const matchResult = {
            tournamentId: this.tournamentContext.tournamentId,
            matchId: this.tournamentContext.matchId,
            player1Score: leftScore,
            player2Score: rightScore,
            winnerAlias: winnerAlias
        };

        sessionStorage.setItem('tournamentMatchResult', JSON.stringify(matchResult));

        // Navigate back to tournament
        this.destroy();
        router.navigate('/tournament');
    }

    private render(): void {
        if (!this.gameState || !this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);

        // Draw center line
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.ARENA_WIDTH / 2, 0);
        this.ctx.lineTo(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw paddles
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

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.ball.pos.x,
            this.gameState.ball.pos.y,
            this.BALL_RADIUS,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Draw scores and player names
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        
        // Draw scores (larger font)
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

        // Draw player names in tournament mode
        if (this.tournamentContext) {
            this.ctx.font = '24px Iceland, monospace';
            this.ctx.fillStyle = '#ADD8E6'; // Light blue color for player names
            
            // Left player name (Player 1)
            this.ctx.fillText(
                this.tournamentContext.player1Alias,
                this.ARENA_WIDTH / 4,
                120
            );
            
            // Right player name (Player 2)
            this.ctx.fillText(
                this.tournamentContext.player2Alias,
                (3 * this.ARENA_WIDTH) / 4,
                120
            );
        }

        // Draw countdown overlay
        if (this.isCountingDown) {
            // Semi-transparent overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
            
            // Calculate scale effect (pulsing)
            const elapsedTime = performance.now() - this.countdownStartTime;
            const progress = (elapsedTime % 1000) / 1000; // 0 to 1 every second
            const scale = 1 + Math.sin(progress * Math.PI) * 0.2; // Pulsing effect
            
            // Save context for transformation
            this.ctx.save();
            this.ctx.translate(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT / 2);
            this.ctx.scale(scale, scale);
            
            this.ctx.textAlign = 'center';
            
            if (this.countdownValue > 0) {
                // Countdown number with color change based on value
                const colors = ['#FF0000', '#FF4500', '#FFD700', '#32CD32', '#1E90FF']; // Red to Blue
                this.ctx.fillStyle = colors[this.countdownValue - 1] || '#FFD700';
                this.ctx.font = 'bold 120px Iceland, monospace';
                this.ctx.fillText(this.countdownValue.toString(), 0, 40);
            } else {
                // Show "GO!" when countdown reaches 0
                this.ctx.fillStyle = '#00FF00'; // Bright green
                this.ctx.font = 'bold 120px Iceland, monospace';
                this.ctx.fillText('GO!', 0, 40);
            }
            
            // Restore context
            this.ctx.restore();
            
            // "Get Ready" text (not scaled)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 32px Iceland, monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'GET READY!',
                this.ARENA_WIDTH / 2,
                this.ARENA_HEIGHT / 2 - 80
            );

            // Tournament info during countdown
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
    }

    getElement(): HTMLElement {
        return this.element;
    }

    destroy(): void {
        // Remove event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Remove overlays
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
        }

        // Clean up auth subscription
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }

        // Clean up components
        if (this.header) {
            this.header.destroy();
        }
        if (this.banner) {
            this.banner.destroy();
        }

        this.element.remove();
    }
}