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

export class Game {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private ws: WebSocket | null = null;
    private gameState: GameState | null = null;
    private input = { up: false, down: false };
    private localInputLeft = { up: false, down: false };
    private localInputRight = { up: false, down: false };
    private animationId: number | null = null;
    private container: HTMLElement;
    private gameMode: 'local' | 'online' | 'tournament';
    private opponentId?: number;
    private gameEndOverlay: HTMLElement | null = null;
    private tournamentContext?: TournamentGameContext;
    
    // Ready system
    private gameId?: number;
    private isReady: boolean = false;
    private readyOverlay: HTMLElement | null = null;
    private gameEnded: boolean = false;
    private lastFrameTime: number = 0;
    private readonly TARGET_FPS = 60; // 60fps for faster gameplay

    // AI configuration for local games
    private aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

    // Game constants
    private readonly ARENA_WIDTH = 400;
    private readonly ARENA_HEIGHT = 300;
    private readonly PADDLE_WIDTH = 5;
    private readonly PADDLE_HEIGHT = 30;
    private readonly BALL_RADIUS = 5;

    constructor(
        container: HTMLElement, 
        opponentId?: number, 
        gameMode: 'local' | 'online' | 'tournament' = 'online',
        tournamentContext?: TournamentGameContext
    ) {
        console.log('🎮 Game constructor called with:', { container, opponentId, gameMode, tournamentContext });
        this.container = container;
        this.gameMode = gameMode;
        this.opponentId = opponentId;
        this.tournamentContext = tournamentContext;
        
        this.initCanvas();
        this.initializeGame();
    }

    private initCanvas(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.ARENA_WIDTH;
        this.canvas.height = this.ARENA_HEIGHT;
        this.canvas.style.border = '2px solid #fff';
        this.canvas.style.backgroundColor = '#000';
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
        
        this.container.appendChild(this.canvas);

        // Add instructions
        const instructions = document.createElement('div');
        if (this.gameMode === 'local') {
            instructions.innerHTML = `<p>Player 1: W/S | Player 2: ↑/↓</p><p>Mode: LOCAL</p>`;
        } else if (this.gameMode === 'tournament') {
            if (this.tournamentContext) {
                instructions.innerHTML = `
                    <p>${this.tournamentContext.player1Alias} vs ${this.tournamentContext.player2Alias}</p>
                    <p>Round ${this.tournamentContext.round} • Match ${this.tournamentContext.matchNumber}</p>
                    <p>Player 1: W/S | Player 2: ↑/↓</p>
                    <p>Mode: TOURNAMENT</p>
                `;
            } else {
                instructions.innerHTML = `<p>Player 1: W/S | Player 2: ↑/↓</p><p>Mode: TOURNAMENT</p>`;
            }
        } else {
            instructions.innerHTML = `<p>Use W/S or ↑/↓ keys to move</p><p>Mode: ONLINE</p>`;
        }
        instructions.style.textAlign = 'center';
        instructions.style.color = 'white';
        instructions.style.marginTop = '10px';
        this.container.appendChild(instructions);
    }

    private async initializeGame() {
        if (this.gameMode === 'local' || this.gameMode === 'tournament') {
            this.setupLocalGame();
            return;
        }

        // Get user token for online game
        const token = localStorage.getItem('token');
        if (!token) {
            this.showError('Authentication required for online games');
            return;
        }

        this.connectWebSocket(token);
    }

    private setupLocalGame() {
        // Initialize local game state
        this.gameState = {
            leftPaddle: { pos: { x: 10, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            rightPaddle: { pos: { x: this.ARENA_WIDTH - 15, y: this.ARENA_HEIGHT / 2 - this.PADDLE_HEIGHT / 2 }, hitCount: 0 },
            ball: { 
                pos: { x: this.ARENA_WIDTH / 2, y: this.ARENA_HEIGHT / 2 }, 
                direction: { x: 3, y: 2 } 
            },
            state: 1,
            leftScore: 0,
            rightScore: 0
        };

        this.setupKeyboardListeners();
        this.startLocalGame();
    }

    private startLocalGame() {
        this.render();
        
        // Initialize frame timing
        this.lastFrameTime = performance.now();
        this.localGameLoop();
    }

    private localGameLoop() {
        if (!this.gameState || this.gameEnded) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Target 60 FPS (16.67ms per frame)
        if (deltaTime >= (1000 / this.TARGET_FPS)) {
            this.updateLocalGame();
            this.render();
            
            // Check for game end (first to 3 points)
            if (this.gameState.leftScore >= 3 || this.gameState.rightScore >= 3) {
                if (!this.gameEnded) {
                    this.gameEnded = true;
                    const winner = this.gameState.leftScore >= 3 ? 'Player 1' : 'Player 2';
                    this.showGameEnd(winner);
                    return;
                }
            }
            
            this.lastFrameTime = currentTime;
        }
        
        this.animationId = requestAnimationFrame(() => this.localGameLoop());
    }

    private updateLocalGame() {
        if (!this.gameState) return;

        this.updateLocalPaddles();
        this.updateBall();
    }

    private updateLocalPaddles() {
        if (!this.gameState) return;

        const speed = 5;

        // Left paddle (Player 1 - W/S keys)
        if (this.localInputLeft.up && this.gameState.leftPaddle.pos.y > 0) {
            this.gameState.leftPaddle.pos.y -= speed;
        }
        if (this.localInputLeft.down && this.gameState.leftPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
            this.gameState.leftPaddle.pos.y += speed;
        }

        // Right paddle (Player 2 - Arrow keys or AI)
        if (this.localInputRight.up && this.gameState.rightPaddle.pos.y > 0) {
            this.gameState.rightPaddle.pos.y -= speed;
        }
        if (this.localInputRight.down && this.gameState.rightPaddle.pos.y < this.ARENA_HEIGHT - this.PADDLE_HEIGHT) {
            this.gameState.rightPaddle.pos.y += speed;
        }
    }

    private updateBall() {
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

    private resetBall() {
        if (!this.gameState) return;
        
        this.gameState.ball.pos.x = this.ARENA_WIDTH / 2;
        this.gameState.ball.pos.y = this.ARENA_HEIGHT / 2;
        
        // Random direction
        this.gameState.ball.direction.x = Math.random() > 0.5 ? 3 : -3;
        this.gameState.ball.direction.y = (Math.random() - 0.5) * 4;
    }

    private setupKeyboardListeners(): void {
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    private keydownHandler = (e: KeyboardEvent) => {
        if (this.gameMode === 'local' || this.gameMode === 'tournament') {
            switch(e.key.toLowerCase()) {
                case 'w':
                    this.localInputLeft.up = true;
                    break;
                case 's':
                    this.localInputLeft.down = true;
                    break;
                case 'arrowup':
                    this.localInputRight.up = true;
                    break;
                case 'arrowdown':
                    this.localInputRight.down = true;
                    break;
            }
        } else {
            // Online game controls
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    if (!this.input.up) {
                        this.input.up = true;
                        this.sendInput();
                    }
                    break;
                case 's':
                case 'arrowdown':
                    if (!this.input.down) {
                        this.input.down = true;
                        this.sendInput();
                    }
                    break;
            }
        }
    }

    private keyupHandler = (e: KeyboardEvent) => {
        if (this.gameMode === 'local' || this.gameMode === 'tournament') {
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
        } else {
            // Online game controls
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    if (this.input.up) {
                        this.input.up = false;
                        this.sendInput();
                    }
                    break;
                case 's':
                case 'arrowdown':
                    if (this.input.down) {
                        this.input.down = false;
                        this.sendInput();
                    }
                    break;
            }
        }
    }

    private connectWebSocket(token: string): void {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/game?token=${token}`;
        
        if (this.opponentId) {
            // Add opponent ID for direct invites
        }
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            this.showReadyOverlay();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = (event) => {
            console.log('❌ WebSocket closed:', event.code, event.reason);
            this.handleWebSocketClose();
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.showError('Connection error. Please try again.');
        };
    }

    private handleWebSocketMessage(data: any): void {
        switch (data.type) {
            case 'gameState':
                this.gameState = data.state;
                this.render();
                break;
                
            case 'gameStart':
                console.log('🎮 Game started!');
                if (this.readyOverlay && document.body.contains(this.readyOverlay)) {
                    document.body.removeChild(this.readyOverlay);
                    this.readyOverlay = null;
                }
                break;
                
            case 'gameEnd':
                console.log('🏁 Game ended:', data);
                this.showGameEnd(data.winner || 'Unknown');
                break;
                
            case 'waiting':
                console.log('⏳ Waiting for opponent...');
                break;
                
            case 'error':
                console.error('❌ Game error:', data.message);
                this.showError(data.message);
                break;
                
            default:
                console.log('📦 Unknown message type:', data.type);
        }
    }

    private handleWebSocketClose(): void {
        if (this.gameState && !this.gameEnded) {
            this.showError('Connection lost. Game ended.');
        }
    }

    private sendInput(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'input',
                input: this.input
            }));
        }
    }

    private sendReady(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ready'
            }));
            this.isReady = true;
        }
    }

    private showReadyOverlay(): void {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;
            z-index: 1000; color: white; text-align: center; font-family: Arial, sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="background: #333; padding: 40px; border-radius: 10px;">
                <h2 style="margin-bottom: 20px;">Ready to Play?</h2>
                <p style="margin-bottom: 30px;">Press SPACE when you're ready!</p>
                <button id="ready-btn" style="background: #28a745; color: white; border: none; padding: 15px 30px; border-radius: 5px; font-size: 16px; cursor: pointer;">
                    Ready (SPACE)
                </button>
            </div>
        `;
        
        const readyBtn = overlay.querySelector('#ready-btn') as HTMLButtonElement;
        const markReady = () => {
            this.sendReady();
            readyBtn.textContent = 'Waiting for opponent...';
            readyBtn.disabled = true;
            readyBtn.style.backgroundColor = '#6c757d';
        };
        
        readyBtn.addEventListener('click', markReady);
        
        const spaceHandler = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !this.isReady) {
                e.preventDefault();
                markReady();
            }
        };
        
        document.addEventListener('keydown', spaceHandler);
        
        // Cleanup function
        const cleanup = () => {
            document.removeEventListener('keydown', spaceHandler);
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };
        
        // Store cleanup reference
        (overlay as any).cleanup = cleanup;
        
        document.body.appendChild(overlay);
        this.readyOverlay = overlay;
    }

    private showGameEnd(winner: string): void {
        if (this.gameEndOverlay) return;

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';
        overlay.style.color = 'white';
        overlay.style.textAlign = 'center';
        overlay.style.fontFamily = 'Arial, sans-serif';

        const leftScore = this.gameState?.leftScore || 0;
        const rightScore = this.gameState?.rightScore || 0;

        if (this.gameMode === 'tournament' && this.tournamentContext) {
            // Tournament mode - show match result
            const winnerAlias = leftScore > rightScore ? this.tournamentContext.player1Alias : this.tournamentContext.player2Alias;
            
            overlay.innerHTML = `
                <div style="background: #333; padding: 40px; border-radius: 10px;">
                    <h2>Match Complete!</h2>
                    <p style="font-size: 24px; margin: 20px 0; color: #4ade80;">🏆 Winner: ${winnerAlias}</p>
                    <p>Final Score: ${leftScore} - ${rightScore}</p>
                    <div style="margin: 20px 0; padding: 15px; background: #444; border-radius: 5px;">
                        <p style="margin: 5px 0;">${this.tournamentContext.player1Alias}: ${leftScore}</p>
                        <p style="margin: 5px 0;">${this.tournamentContext.player2Alias}: ${rightScore}</p>
                    </div>
                    <p style="font-size: 14px; color: #888;">Round ${this.tournamentContext.round} • Match ${this.tournamentContext.matchNumber}</p>
                </div>
            `;
        } else {
            // Regular game mode
            overlay.innerHTML = `
                <div style="background: #333; padding: 40px; border-radius: 10px;">
                    <h2>Game Over!</h2>
                    <p>Winner: ${winner}</p>
                    <p>Final Score: ${leftScore} - ${rightScore}</p>
                </div>
            `;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '20px';

        if (this.gameMode === 'tournament') {
            // Tournament mode - continue to next match or back to tournament
            const continueButton = document.createElement('button');
            continueButton.textContent = 'Continue Tournament';
            continueButton.style.cssText = `
                background-color: #10b981; color: white; border: none; padding: 12px 24px;
                border-radius: 5px; font-size: 16px; cursor: pointer; margin: 0 10px;
            `;
            continueButton.addEventListener('click', () => {
                this.handleTournamentMatchComplete();
            });

            const backButton = document.createElement('button');
            backButton.textContent = 'Back to Tournament';
            backButton.style.cssText = `
                background-color: #6b7280; color: white; border: none; padding: 12px 24px;
                border-radius: 5px; font-size: 16px; cursor: pointer; margin: 0 10px;
            `;
            backButton.addEventListener('click', () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                this.destroy();
                // Navigate back to the specific tournament using its ID
                if (this.tournamentContext) {
                    window.location.href = `/tournament?id=${this.tournamentContext.tournamentId}`;
                } else {
                    (window as any).router?.navigate('/tournament');
                }
            });

            buttonContainer.appendChild(continueButton);
            buttonContainer.appendChild(backButton);
        } else {
            // Regular mode - back to menu
            const backButton = document.createElement('button');
            backButton.textContent = 'Back to Menu';
            backButton.style.cssText = `
                background-color: #007bff; color: white; border: none; padding: 12px 24px;
                border-radius: 5px; font-size: 16px; cursor: pointer;
            `;
            backButton.addEventListener('click', () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                this.destroy();
                (window as any).router?.navigate('/menu');
            });

            buttonContainer.appendChild(backButton);
        }

        overlay.firstElementChild!.appendChild(buttonContainer);
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

        // Store tournament result in sessionStorage for the tournament system to handle
        const matchResult = {
            tournamentId: this.tournamentContext.tournamentId,
            matchId: this.tournamentContext.matchId,
            player1Score: leftScore,
            player2Score: rightScore,
            winnerAlias: winnerAlias
        };

        sessionStorage.setItem('tournamentMatchResult', JSON.stringify(matchResult));

        // Close overlay and navigate back to tournament
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
        }
        this.destroy();
        window.location.href = '/tournament';
    }

    private showError(message: string): void {
        // Clear canvas and show error message
        this.ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Error: ' + message, this.ARENA_WIDTH / 2, this.ARENA_HEIGHT / 2);
        
        setTimeout(() => {
            (window as any).router?.navigate('/menu');
        }, 3000);
    }

    private render(): void {
        if (!this.gameState || !this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);

        // Draw center line
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.ARENA_WIDTH / 2, 0);
        this.ctx.lineTo(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT);
        this.ctx.strokeStyle = '#fff';
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

        // Draw scores
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.gameState.leftScore.toString(),
            this.ARENA_WIDTH / 4,
            30
        );
        this.ctx.fillText(
            this.gameState.rightScore.toString(),
            (3 * this.ARENA_WIDTH) / 4,
            30
        );
    }

    public destroy(): void {
        // Remove event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Remove overlays
        if (this.readyOverlay && document.body.contains(this.readyOverlay)) {
            document.body.removeChild(this.readyOverlay);
        }
        
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
        }

        // Clear container
        this.container.innerHTML = '';
    }

    public getElement(): HTMLElement {
        return this.container;
    }
}