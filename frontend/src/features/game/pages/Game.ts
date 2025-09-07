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
    
    // Ready system
    private gameId?: number;
    private isReady: boolean = false;
    private readyOverlay: HTMLElement | null = null;
    private gameEnded: boolean = false;

    // Constants
    private readonly ARENA_WIDTH = 500;
    private readonly ARENA_HEIGHT = 200; 
    private readonly PADDLE_WIDTH = 8;
    private readonly PADDLE_HEIGHT = 30;
    private readonly BALL_RADIUS = 5;

    constructor(container: HTMLElement, opponentId?: number, gameMode: 'local' | 'online' = 'online') {
        this.container = container;
        this.gameMode = gameMode;
        this.opponentId = opponentId;
        
        this.setupCanvas();
        this.setupUI();
        this.initializeGame();
        this.registerWithInviteService();
    }

    private setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.ARENA_WIDTH;
        this.canvas.height = this.ARENA_HEIGHT;
        this.canvas.style.border = '1px solid #fff';
        this.canvas.style.backgroundColor = '#000';
        
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.fillStyle = '#fff';
    }

    private setupUI() {
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

        const instructions = document.createElement('div');
        instructions.innerHTML = this.gameMode === 'local' 
            ? `<p>Player 1: W/S | Player 2: ↑/↓</p><p>Mode: LOCAL (server-side)</p>`
            : `<p>Use W/S or ↑/↓ keys to move</p><p>Mode: ONLINE</p>`;
        instructions.style.textAlign = 'center';
        instructions.style.marginBottom = '20px';

        this.container.appendChild(title);
        this.container.appendChild(instructions);
        this.container.appendChild(this.canvas);
    }

    private async initializeGame() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        
        if (!token) {
            this.showError('No authentication token found');
            return;
        }

        this.connectWebSocket(token);
    }

    private connectWebSocket(token: string) {
        this.ws = new WebSocket('wss://localhost:8000/ws');
        
        this.setupWebSocketListeners(token);
        this.setupKeyboardListeners();
    }

    private setupWebSocketListeners(token: string) {
        if (!this.ws) {
            return;
        }

        this.ws.onopen = () => {
            this.sendMessage('auth', { token });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                switch(message.type) {
                    case 'auth_success':
                        // 🎯 KISS: Check if coming from accepted invitation
                        const existingGameId = localStorage.getItem('kiss_game_id');
                        const existingOpponentId = localStorage.getItem('kiss_opponent_id');
                        
                        if (existingGameId && existingOpponentId) {
                            this.sendMessage('join_existing_game', { 
                                gameId: parseInt(existingGameId),
                                opponentId: parseInt(existingOpponentId)
                            });
                            localStorage.removeItem('kiss_game_id');
                            localStorage.removeItem('kiss_opponent_id');
                        } else if (this.gameMode === 'local') {
                            this.sendMessage('start_local_game', {});
                        } else {
                            this.sendMessage('start_game', { opponentId: this.opponentId });
                        }
                        break;

                    case 'auth_error':
                        console.error('❌ Authentication failed:', message.message);
                        this.showError('Authentication failed: ' + message.message);
                        break;

                    case 'connected':
                        break;

                    case 'success':
                        this.gameId = message.data.gameId;
                        
                        if (this.gameMode === 'online') {
                            this.showReadyScreen();
                        } else {
                            this.startGameLoop();
                        }
                        break;

                    case 'ready_status':
                        this.updateReadyStatus(message.data);
                        break;

                    case 'countdown':
                        this.showCountdown(message.data.count);
                        break;

                    case 'game_start':
                        this.hideReadyScreen();
                        this.startGameLoop();
                        break;

                    case 'game_state':
                        this.gameState = message.data;
                        
                        // Defensive: Check for game end conditions in case backend doesn't send game_end
                        if (this.gameState && (this.gameState.leftScore >= 5 || this.gameState.rightScore >= 5) && !this.gameEnded) {
                            setTimeout(() => {
                                if (this.animationId && !this.gameEnded) {
                                    this.gameEnded = true;
                                    this.stopGameLoop();
                                    const winner = this.gameState!.leftScore >= 5 ? 'Left Player' : 'Right Player';
                                    this.showGameEnd(winner);
                                }
                            }, 100);
                        }
                        break;

                    case 'game_end':
                        this.gameEnded = true;
                        this.stopGameLoop();
                        this.showGameEnd(message.data.winner);
                        break;

                    case 'game_left':
                        break;

                    case 'game_invite_received':
                        this.forwardToKissService(message);
                        break;

                    case 'invite_sent':
                    case 'invite_declined':
                    case 'invite_error':
                    case 'invite_expired':
                        this.forwardToKissService(message);
                        break;

                    case 'err_self':
                    case 'err_game_started':
                    case 'err_unknown_id':
                    case 'err_user_offline':
                    case 'err_not_in_game':
                        // Handle "not in game" error - could mean game ended
                        if (message.type === 'err_not_in_game') {
                            if (this.gameEnded) {
                                console.log('🎮 Game already ended, ignoring "not in game" error');
                                break;
                            } else {
                                // Mark game as ended if we get this error during active play
                                this.gameEnded = true;
                                this.stopGameLoop();
                                console.log('🎮 Received "not in game" error - marking game as ended');
                                break;
                            }
                        }
                        console.error('❌ Game error:', message.message);
                        this.showError(message.message);
                        break;

                    case 'error':
                        console.error('❌ Server error:', message.message);
                        this.showError(message.message);
                        break;

                    default:
                        if (process.env.NODE_ENV === 'development') {
                        }
                }
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            if (process.env.NODE_ENV === 'development') {
            }
            this.stopGameLoop();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.showError('Connection error');
        };

    }

    private async forwardToKissService(message: any) {
        try {
            const { gameInviteService } = await import('../../invitations');
            
            if (!gameInviteService || !message?.type) {
                return;
            }
            
            (gameInviteService as any).handleMessage(message);
            
        } catch (error) {
            console.error('🎮 KISS: Error forwarding message to GameInviteService:', error);
        }
    }

    private async registerWithInviteService() {
        try {
            const { gameInviteService } = await import('../../invitations');
            if (gameInviteService) {
                // S'enregistrer comme handler externe pour les invitations
                gameInviteService.setExternalWebSocketHandler((message: any) => {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify(message));
                    }
                });
            }
        } catch (error) {
            console.error('🎮 Error registering with invite service:', error);
        }
    }

    private async ensureKissReconnection() {
        try {
            const { gameInviteService } = await import('../../invitations');
            if (gameInviteService) {
                gameInviteService.removeExternalWebSocketHandler();
            }
        } catch (error) {
            console.error('🎮 KISS: Error forcing reconnection:', error);
        }
    }

    private keydownHandler = (e: KeyboardEvent) => {
            let changed = false;
            
            if (this.gameMode === 'local') {
                switch(e.key.toLowerCase()) {
                    case 'w':
                        if (!this.localInputLeft.up) {
                            this.localInputLeft.up = true;
                            changed = true;
                        }
                        break;
                    case 's':
                        if (!this.localInputLeft.down) {
                            this.localInputLeft.down = true;
                            changed = true;
                        }
                        break;
                    case 'arrowup':
                        if (!this.localInputRight.up) {
                            this.localInputRight.up = true;
                            changed = true;
                        }
                        break;
                    case 'arrowdown':
                        if (!this.localInputRight.down) {
                            this.localInputRight.down = true;
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
                    this.sendMessage('update_input', { input: this.input });
                }
            }
        };

    private keyupHandler = (e: KeyboardEvent) => {
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

    private setupKeyboardListeners() {
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    private sendMessage(type: string, data: any) {
        const message = { type, ...data };
        
        if (!this.ws) {
            console.error('❌ Cannot send message: WebSocket is null');
            return;
        }
        
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Cannot send message: WebSocket not open (state:', this.ws.readyState, ')');
        }
    }

    private startGameLoop() {
        if (this.animationId) {
            return;
        }
        
        const gameLoop = () => {
            if (!this.animationId) {
                return;
            }
            
            this.render();
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }

    private stopGameLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
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

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.ARENA_WIDTH, this.ARENA_HEIGHT);
        this.ctx.fillStyle = '#fff';

        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.ARENA_WIDTH / 2, 0);
        this.ctx.lineTo(this.ARENA_WIDTH / 2, this.ARENA_HEIGHT);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillRect(
            this.gameState.leftPaddle.pos.x,
            this.gameState.leftPaddle.pos.y,
            this.PADDLE_WIDTH,
            this.PADDLE_HEIGHT
        );

        this.ctx.fillRect(
            this.gameState.rightPaddle.pos.x - this.PADDLE_WIDTH,
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
            2 * Math.PI
        );
        this.ctx.fill();

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
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            return;
        }

        // Vérifier si c'est un match de tournoi
        const tournamentMatchInfo = this.getTournamentMatchInfo();
        const isTournamentMatch = tournamentMatchInfo !== null;

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

        // Message différent pour les tournois
        let gameOverMessage = `<h2>Game Over!</h2><p>Winner: ${winner}</p>`;
        if (isTournamentMatch) {
            gameOverMessage = `
                <h2>🏆 Match de Tournoi Terminé!</h2>
                <p>Winner: ${winner}</p>
                <p class="tournament-info">Scores: ${this.gameState?.leftScore || 0} - ${this.gameState?.rightScore || 0}</p>
                <p class="tournament-saving">💾 Sauvegarde automatique du résultat...</p>
            `;
        }

        const backButton = document.createElement('button');
        backButton.style.padding = '10px 20px';
        backButton.style.fontSize = '18px';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';
        backButton.style.marginTop = '20px';

        if (isTournamentMatch) {
            backButton.textContent = 'Retour au Tournoi';
            backButton.style.backgroundColor = '#28a745'; // Vert pour tournoi
            
            backButton.addEventListener('click', async () => {
                // Sauvegarder automatiquement le résultat du match
                await this.saveTournamentMatchResult(tournamentMatchInfo!, winner);
                
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                    this.gameEndOverlay = null;
                }
                this.destroy();
                
                // Retourner au tournoi
                (window as any).router?.navigate(tournamentMatchInfo!.returnUrl);
            });
        } else {
            backButton.textContent = 'Back to Menu';
            backButton.style.backgroundColor = '#007bff';
            
            backButton.addEventListener('click', () => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                    this.gameEndOverlay = null;
                }
                this.destroy();
                (window as any).router?.navigate('/menu');
            });
        }

        overlay.innerHTML = gameOverMessage;
        overlay.appendChild(backButton);
        document.body.appendChild(overlay);
        this.gameEndOverlay = overlay;

        // Auto-sauvegarder pour les tournois après un délai
        if (isTournamentMatch) {
            setTimeout(async () => {
                await this.saveTournamentMatchResult(tournamentMatchInfo!, winner);
            }, 2000);
        }
    }

    private getTournamentMatchInfo(): any {
        try {
            const storedInfo = localStorage.getItem('tournament_match_info');
            if (storedInfo) {
                const matchInfo = JSON.parse(storedInfo);
                // Vérifier que l'info n'est pas trop ancienne (1 heure max)
                const oneHour = 60 * 60 * 1000;
                if (Date.now() - matchInfo.timestamp < oneHour) {
                    return matchInfo;
                }
            }
        } catch (error) {
            console.error('Erreur lecture info match tournoi:', error);
        }
        return null;
    }

    private async saveTournamentMatchResult(matchInfo: any, winner: string): Promise<void> {
        try {
            console.log('💾 Sauvegarde du résultat du match de tournoi...', {
                matchId: matchInfo.matchId,
                winner,
                scores: {
                    left: this.gameState?.leftScore || 0,
                    right: this.gameState?.rightScore || 0
                }
            });

            // Import de l'API pour sauvegarder le résultat
            const { api } = await import('../../../shared/services/api');
            
            // Déterminer l'ID du gagnant (simplifié pour l'instant)
            // TODO: Améliorer la détection du winner ID basée sur les positions
            const winnerId = matchInfo.opponentId; // Placeholder
            
            // Appel API pour mettre à jour le résultat
            await api.put(`/tournaments/matches/${matchInfo.matchId}/result`, {
                winnerId,
                player1Score: this.gameState?.leftScore || 0,
                player2Score: this.gameState?.rightScore || 0
            });

            console.log('✅ Résultat sauvegardé avec succès');
            
            // Nettoyer les informations stockées
            localStorage.removeItem('tournament_match_info');

        } catch (error) {
            console.error('❌ Erreur sauvegarde résultat tournoi:', error);
            // On garde les informations au cas où l'utilisateur voudrait réessayer
        }
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
        this.stopGameLoop();
        
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                // Only send leave_game if the game hasn't ended yet
                if (!this.gameEnded) {
                    this.sendMessage('leave_game', {});
                }
                
                setTimeout(() => {
                    if (this.ws) {
                        this.ws.close();
                        this.ws = null;
                    }
                    this.ensureKissReconnection();
                }, 200);
            } else {
                this.ws = null;
            }
        }

        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
            this.gameEndOverlay = null;
        }

        if (this.readyOverlay && document.body.contains(this.readyOverlay)) {
            document.body.removeChild(this.readyOverlay);
            this.readyOverlay = null;
        }

        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        this.container.innerHTML = '';
        this.gameState = null;
    }

    // 🎮 Ready System Methods
    private showReadyScreen(): void {
        if (this.readyOverlay) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 text-white font-iceland';
        
        overlay.innerHTML = `
            <div class="bg-gradient-to-b from-blue-900 to-purple-900 p-8 rounded-lg border-4 border-white text-center">
                <h1 class="text-4xl mb-6">🎮 Game Ready Check</h1>
                <div class="mb-6">
                    <p class="text-xl mb-4">Waiting for both players to be ready...</p>
                    <div id="ready-status" class="text-lg">
                        <div>You: <span id="your-status" class="text-red-400">Not Ready</span></div>
                        <div>Opponent: <span id="opponent-status" class="text-red-400">Not Ready</span></div>
                    </div>
                </div>
                <button id="ready-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded text-xl border-2 border-white transition-colors">
                    Click when READY!
                </button>
            </div>
        `;

        // Event listener pour le bouton ready
        const readyBtn = overlay.querySelector('#ready-btn') as HTMLButtonElement;
        readyBtn?.addEventListener('click', () => {
            this.toggleReady();
        });

        document.body.appendChild(overlay);
        this.readyOverlay = overlay;
    }

    private hideReadyScreen(): void {
        if (this.readyOverlay && document.body.contains(this.readyOverlay)) {
            document.body.removeChild(this.readyOverlay);
            this.readyOverlay = null;
        }
    }

    private toggleReady(): void {
        this.isReady = !this.isReady;
        
        if (this.gameId) {
            this.sendMessage('player_ready', {
                gameId: this.gameId,
                ready: this.isReady
            });
        }

        this.updateReadyButton();
    }

    private updateReadyStatus(data: any): void {
        if (!this.readyOverlay) return;

        const yourStatus = this.readyOverlay.querySelector('#your-status');
        const opponentStatus = this.readyOverlay.querySelector('#opponent-status');

        if (yourStatus) {
            yourStatus.textContent = this.isReady ? 'Ready' : 'Not Ready';
            yourStatus.className = this.isReady ? 'text-green-400' : 'text-red-400';
        }

        if (opponentStatus) {
            // Simple: si on est tous les deux ready, ou si l'autre est ready mais pas nous
            const bothReady = data.leftPlayerReady && data.rightPlayerReady;
            const opponentReady = bothReady || ((data.leftPlayerReady || data.rightPlayerReady) && !this.isReady);
            
            opponentStatus.textContent = opponentReady ? 'Ready' : 'Not Ready';
            opponentStatus.className = opponentReady ? 'text-green-400' : 'text-red-400';
        }
    }

    private updateReadyButton(): void {
        if (!this.readyOverlay) return;

        const readyBtn = this.readyOverlay.querySelector('#ready-btn') as HTMLButtonElement;
        if (readyBtn) {
            if (this.isReady) {
                readyBtn.textContent = 'Ready! (Click to cancel)';
                readyBtn.className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded text-xl border-2 border-white transition-colors';
            } else {
                readyBtn.textContent = 'Click when READY!';
                readyBtn.className = 'bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded text-xl border-2 border-white transition-colors';
            }
        }
    }

    private showCountdown(count: number): void {
        if (!this.readyOverlay) return;
        
        const overlay = this.readyOverlay;
        overlay.innerHTML = `
            <div class="bg-gradient-to-b from-red-900 to-orange-900 p-12 rounded-lg border-4 border-white text-center">
                <h1 class="text-6xl mb-4 animate-pulse">${count}</h1>
                <p class="text-2xl">Game starting...</p>
            </div>
        `;
    }
}