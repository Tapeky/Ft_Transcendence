interface GameState {
    leftPaddle: { pos: { x: number; y: number }; hitCount: number; };
    rightPaddle: { pos: { x: number; y: number }; hitCount: number; };
    ball: { pos: { x: number; y: number }; direction: { x: number; y: number }; };
    state: number;
    leftScore: number;
    rightScore: number;
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
    private gameMode: 'local' | 'online';
    private opponentId?: number;
    private gameEndOverlay: HTMLElement | null = null;

    // Constants
    private readonly ARENA_WIDTH = 500;
    private readonly ARENA_HEIGHT = 200; 
    private readonly PADDLE_WIDTH = 8;
    private readonly PADDLE_HEIGHT = 30;
    private readonly BALL_RADIUS = 5;

    constructor(container: HTMLElement, opponentId?: number, gameMode: 'local' | 'online' = 'online') {
        console.log('🏗️ Game constructor called');
        console.log('🏗️ Container:', container);
        console.log('🏗️ OpponentId:', opponentId);
        console.log('🏗️ Game mode:', gameMode);
        
        this.container = container;
        this.gameMode = gameMode;
        this.opponentId = opponentId;
        
        console.log('🏗️ Setting up canvas...');
        this.setupCanvas();
        console.log('🏗️ Setting up UI...');
        this.setupUI();
        console.log('🏗️ Initializing game...');
        this.initializeGame();
    }

    private setupCanvas() {
        console.log('🎨 Setting up canvas...');
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.ARENA_WIDTH;
        this.canvas.height = this.ARENA_HEIGHT;
        this.canvas.style.border = '1px solid #fff';
        this.canvas.style.backgroundColor = '#000';
        
        console.log('🎨 Canvas created:', this.canvas);
        console.log('🎨 Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.fillStyle = '#fff';
        console.log('🎨 Canvas context:', this.ctx);
        console.log('✅ Canvas setup complete');
    }

    private setupUI() {
        console.log('🖼️ Setting up UI...');
        console.log('🖼️ Container:', this.container);
        console.log('🖼️ Game mode:', this.gameMode);
        
        this.container.innerHTML = '';
        this.container.style.backgroundColor = '#222';
        this.container.style.color = '#fff';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.minHeight = '100vh';
        this.container.style.margin = '0';

        const title = document.createElement('h1');
        title.textContent = 'Pong Game';
        title.style.marginBottom = '20px';
        console.log('🖼️ Title created:', title);

        const instructions = document.createElement('div');
        instructions.innerHTML = this.gameMode === 'local' 
            ? `<p>Player 1: W/S | Player 2: ↑/↓</p><p>Mode: LOCAL (server-side)</p>`
            : `<p>Use W/S or ↑/↓ keys to move</p><p>Mode: ONLINE</p>`;
        instructions.style.textAlign = 'center';
        instructions.style.marginBottom = '20px';
        console.log('🖼️ Instructions created:', instructions);

        console.log('🖼️ Adding elements to container...');
        this.container.appendChild(title);
        this.container.appendChild(instructions);
        this.container.appendChild(this.canvas);
        
        console.log('🖼️ UI elements added to container');
        console.log('🖼️ Container children count:', this.container.children.length);
        console.log('✅ UI setup complete');
    }

    private async initializeGame() {
        console.log('🎮 initializeGame() called');
        console.log('🎮 Game mode:', this.gameMode);
        
        console.log('🔍 Checking for authentication token...');
        let token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        console.log('🔍 Token found:', token ? `${token.substring(0, 20)}...` : 'NULL');
        
        if (!token) {
            console.error('❌ No authentication token found!');
            this.showError('No authentication token found');
            return;
        }

        console.log('✅ Token found, connecting to WebSocket...');
        this.connectWebSocket(token);
    }

    private connectWebSocket(token: string) {
        console.log('🔌 Connecting to WebSocket...');
        console.log('🔌 WebSocket URL: wss://localhost:8000/ws');
        
        this.ws = new WebSocket('wss://localhost:8000/ws');
        console.log('🔌 WebSocket instance created:', this.ws);
        
        this.setupWebSocketListeners(token);
        this.setupKeyboardListeners();
    }

    private setupWebSocketListeners(token: string) {
        if (!this.ws) {
            console.error('❌ No WebSocket instance to setup listeners on!');
            return;
        }

        console.log('🎧 Setting up WebSocket listeners...');

        this.ws.onopen = () => {
            console.log('✅ WebSocket connection opened!');
            console.log('🔑 Sending authentication with token:', token ? `${token.substring(0, 20)}...` : 'NULL');
            this.sendMessage('auth', { token });
        };

        this.ws.onmessage = (event) => {
            console.log('📨 WebSocket message received:', event.data);
            
            try {
                const message = JSON.parse(event.data);
                console.log('📋 Parsed message:', message);
                
                switch(message.type) {
                    case 'auth_success':
                        console.log('✅ Authentication successful!', message.data);
                        if (this.gameMode === 'local') {
                            console.log('🏠 Starting local game...');
                            console.log('🏠 Sending start_local_game message to backend...');
                            this.sendMessage('start_local_game', {});
                        } else {
                            console.log('🌐 Starting online game with opponent:', this.opponentId);
                            this.sendMessage('start_game', { opponentId: this.opponentId });
                        }
                        break;

                    case 'auth_error':
                        console.error('❌ Authentication failed:', message.message);
                        this.showError('Authentication failed: ' + message.message);
                        break;

                    case 'connected':
                        console.log('🔌 Server connected message:', message.message);
                        // Message informatif, pas d'action requise
                        break;

                    case 'success':
                        console.log('🎮 Game started successfully!');
                        this.startGameLoop();
                        break;

                    case 'game_state':
                        console.log('📊 Game state received:', message.data);
                        this.gameState = message.data;
                        
                        // Defensive: Check for game end conditions in case backend doesn't send game_end
                        if (this.gameState && (this.gameState.leftScore >= 5 || this.gameState.rightScore >= 5)) {
                            console.log('🛡️ Defensive game end detection: Score reached 5');
                            console.log('🛡️ Final scores:', this.gameState.leftScore, '-', this.gameState.rightScore);
                            setTimeout(() => {
                                if (this.animationId) { // Double-check we haven't already stopped
                                    console.log('🛡️ Stopping game loop defensively');
                                    this.stopGameLoop();
                                    const winner = this.gameState!.leftScore >= 5 ? 'Left Player' : 'Right Player';
                                    this.showGameEnd(winner);
                                }
                            }, 100); // Small delay to allow backend message to arrive first
                        }
                        break;

                    case 'game_end':
                        console.log('🏁 Game ended:', message.data);
                        this.stopGameLoop();
                        this.showGameEnd(message.data.winner);
                        break;

                    case 'err_self':
                    case 'err_game_started':
                    case 'err_unknown_id':
                    case 'err_user_offline':
                    case 'err_not_in_game':
                        console.error('❌ Game error:', message.message);
                        this.showError(message.message);
                        break;

                    case 'error':
                        console.error('❌ Server error:', message.message);
                        this.showError(message.message);
                        break;

                    default:
                        console.log('❓ Unknown message type:', message.type, message);
                        if (message.message) {
                            console.warn('⚠️ Unhandled server message:', message.message);
                        }
                }
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error);
                console.error('❌ Raw message:', event.data);
            }
        };

        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket connection closed');
            console.log('🔍 Close event details:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            this.stopGameLoop();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            console.error('❌ WebSocket state:', this.ws?.readyState);
            this.showError('Connection error');
        };

        console.log('✅ WebSocket listeners setup complete');
    }

    private setupKeyboardListeners() {
        console.log('⌨️ Setting up keyboard listeners...');
        
        const keydownHandler = (e: KeyboardEvent) => {
            console.log('⌨️ Key down:', e.key, 'Mode:', this.gameMode);
            
            let changed = false;
            
            if (this.gameMode === 'local') {
                // Local mode: handle both players, send to backend
                switch(e.key.toLowerCase()) {
                    case 'w':
                        console.log('⌨️ Player 1 UP');
                        if (!this.localInputLeft.up) {
                            this.localInputLeft.up = true;
                            changed = true;
                        }
                        break;
                    case 's':
                        console.log('⌨️ Player 1 DOWN');
                        if (!this.localInputLeft.down) {
                            this.localInputLeft.down = true;
                            changed = true;
                        }
                        break;
                    case 'arrowup':
                        console.log('⌨️ Player 2 UP');
                        if (!this.localInputRight.up) {
                            this.localInputRight.up = true;
                            changed = true;
                        }
                        break;
                    case 'arrowdown':
                        console.log('⌨️ Player 2 DOWN');
                        if (!this.localInputRight.down) {
                            this.localInputRight.down = true;
                            changed = true;
                        }
                        break;
                }
                
                if (changed) {
                    console.log('⌨️ Local input changed:', { left: this.localInputLeft, right: this.localInputRight });
                    this.sendMessage('update_local_input', { 
                        leftInput: this.localInputLeft, 
                        rightInput: this.localInputRight 
                    });
                }
            } else {
                // Online mode: handle current player only
                switch(e.key.toLowerCase()) {
                    case 'w':
                    case 'arrowup':
                        if (!this.input.up) {
                            this.input.up = true;
                            changed = true;
                        }
                        break;
                    case 's':
                    case 'arrowdown':
                        if (!this.input.down) {
                            this.input.down = true;
                            changed = true;
                        }
                        break;
                }
                
                if (changed) {
                    console.log('⌨️ Online input changed:', this.input);
                    this.sendMessage('update_input', { input: this.input });
                }
            }
        };

        const keyupHandler = (e: KeyboardEvent) => {
            let changed = false;
            
            if (this.gameMode === 'local') {
                // Local mode: handle keyup for both players, send to backend
                switch(e.key.toLowerCase()) {
                    case 'w':
                        if (this.localInputLeft.up) {
                            this.localInputLeft.up = false;
                            changed = true;
                        }
                        break;
                    case 's':
                        if (this.localInputLeft.down) {
                            this.localInputLeft.down = false;
                            changed = true;
                        }
                        break;
                    case 'arrowup':
                        if (this.localInputRight.up) {
                            this.localInputRight.up = false;
                            changed = true;
                        }
                        break;
                    case 'arrowdown':
                        if (this.localInputRight.down) {
                            this.localInputRight.down = false;
                            changed = true;
                        }
                        break;
                }
                
                if (changed) {
                    this.sendMessage('update_local_input', { 
                        leftInput: this.localInputLeft, 
                        rightInput: this.localInputRight 
                    });
                }
            } else {
                // Online mode: handle current player only
                switch(e.key.toLowerCase()) {
                    case 'w':
                    case 'arrowup':
                        if (this.input.up) {
                            this.input.up = false;
                            changed = true;
                        }
                        break;
                    case 's':
                    case 'arrowdown':
                        if (this.input.down) {
                            this.input.down = false;
                            changed = true;
                        }
                        break;
                }
                
                if (changed) {
                    this.sendMessage('update_input', { input: this.input });
                }
            }
        };

        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);
    }

    private sendMessage(type: string, data: any) {
        const message = { type, ...data };
        console.log('📤 Sending message:', message);
        
        if (!this.ws) {
            console.error('❌ Cannot send message: WebSocket is null');
            return;
        }
        
        console.log('🔍 WebSocket state:', this.ws.readyState, {
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED
        });
        
        if (this.ws.readyState === WebSocket.OPEN) {
            const jsonMessage = JSON.stringify(message);
            console.log('📤 Sending JSON:', jsonMessage);
            this.ws.send(jsonMessage);
        } else {
            console.warn('⚠️ Cannot send message: WebSocket not open (state:', this.ws.readyState, ')');
        }
    }

    private startGameLoop() {
        console.log('🎬 Starting game loop...');
        if (this.animationId) {
            console.log('⚠️ Game loop already running, skipping');
            return;
        }
        
        let frameCount = 0;
        const gameLoop = () => {
            // Stop if no animation ID (cancelled)
            if (!this.animationId) {
                console.log('🛑 Game loop stopped - no animationId');
                return;
            }
            
            frameCount++;
            if (frameCount % 60 === 0) { // Log every 60 frames (1 second at 60fps)
                console.log('🎬 Game loop running, frame:', frameCount, 'gameState:', !!this.gameState);
            }
            
            // Both local and online modes now use backend physics
            this.render();
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        console.log('🎬 Requesting first animation frame...');
        this.animationId = requestAnimationFrame(gameLoop);
        console.log('✅ Game loop started');
    }

    private stopGameLoop() {
        console.log('🛑 Stopping game loop...');
        console.log('🛑 Current animationId:', this.animationId);
        if (this.animationId) {
            console.log('🛑 Calling cancelAnimationFrame for id:', this.animationId);
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            console.log('✅ Game loop stopped - animationId set to null');
        } else {
            console.log('⚠️ No game loop to stop - animationId is already null');
        }
    }

    private render() {
        if (!this.gameState) {
            // Show a debug message on canvas when no game state
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Waiting for game state...', this.ARENA_WIDTH / 2, this.ARENA_HEIGHT / 2);
            this.ctx.textAlign = 'start';
            return;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
        this.ctx.fillStyle = '#fff';

        // Center line
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.ARENA_WIDTH / 2, 0);
        this.ctx.lineTo(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Left paddle
        this.ctx.fillRect(
            this.gameState.leftPaddle.pos.x,
            this.gameState.leftPaddle.pos.y,
            this.PADDLE_WIDTH,
            this.PADDLE_HEIGHT
        );

        // Right paddle
        this.ctx.fillRect(
            this.gameState.rightPaddle.pos.x - this.PADDLE_WIDTH,
            this.gameState.rightPaddle.pos.y,
            this.PADDLE_WIDTH,
            this.PADDLE_HEIGHT
        );

        // Ball
        this.ctx.beginPath();
        this.ctx.arc(
            this.gameState.ball.pos.x,
            this.gameState.ball.pos.y,
            this.BALL_RADIUS,
            0,
            2 * Math.PI
        );
        this.ctx.fill();

        // Scores
        this.ctx.font = '24px Arial';
        this.ctx.fillText(
            (this.gameState.leftScore || 0).toString(),
            this.ARENA_WIDTH / 4,
            30
        );
        this.ctx.fillText(
            (this.gameState.rightScore || 0).toString(),
            (3 * this.ARENA_WIDTH) / 4,
            30
        );
    }

    private showGameEnd(winner: string) {
        // Prevent multiple overlays - if one already exists, don't create another
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            console.log('🛡️ Game end overlay already exists, skipping creation');
            return;
        }

        console.log('🏁 Creating game end overlay');
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.color = '#fff';
        overlay.style.fontSize = '24px';
        overlay.style.zIndex = '1000';

        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Menu';
        backButton.style.padding = '10px 20px';
        backButton.style.fontSize = '18px';
        backButton.style.backgroundColor = '#007bff';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';
        backButton.style.marginTop = '20px';

        backButton.addEventListener('click', () => {
            console.log('🔘 Back to Menu button clicked');
            // Remove the overlay first
            if (document.body.contains(overlay)) {
                console.log('✅ Removing game end overlay from body');
                document.body.removeChild(overlay);
                this.gameEndOverlay = null; // Clear reference
            }
            // Clean up the game
            this.destroy();
            // Navigate to main menu
            (window as any).router?.navigate('/menu');
        });

        overlay.innerHTML = `<h2>Game Over!</h2><p>Winner: ${winner}</p>`;
        overlay.appendChild(backButton);
        document.body.appendChild(overlay);
        
        // Store reference to prevent duplicate overlays
        this.gameEndOverlay = overlay;
        console.log('✅ Game end overlay created and stored');
    }


    private showError(message: string) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.backgroundColor = '#ff4444';
        errorDiv.style.color = '#fff';
        errorDiv.style.padding = '10px 20px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.zIndex = '1000';
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }

    public destroy() {
        console.log('🧹 Destroying game instance');
        this.stopGameLoop();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Clean up any remaining game end overlay
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            console.log('🧹 Cleaning up remaining game end overlay');
            document.body.removeChild(this.gameEndOverlay);
            this.gameEndOverlay = null;
        }

        document.removeEventListener('keydown', this.setupKeyboardListeners);
        document.removeEventListener('keyup', this.setupKeyboardListeners);

        this.container.innerHTML = '';
        this.gameState = null;
    }
}