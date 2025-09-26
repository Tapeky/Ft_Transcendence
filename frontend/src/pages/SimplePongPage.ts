export class SimplePongPage {
    private element: HTMLElement;
    private header?: any; // Header component
    private banner?: any; // Banner component
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private ws: WebSocket | null = null;
    private gameState: any = null;
    private myRole: 'left' | 'right' | null = null;
    private keys = { up: false, down: false };
    private authToken: string | null = null;
    private gameId: string | undefined;
    private isInvitedGame: boolean = false;
    private authUnsubscribe?: () => void;
    private gameEndOverlay: HTMLElement | null = null;

    constructor() {
        this.element = this.createElement();
        this.bindEvents();
        this.subscribeToAuth();
    }

    private createElement(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

        // Import des composants Header et Banner de manière asynchrone
        setTimeout(async () => {
            const { Header } = await import('../shared/components/Header');
            const { Banner } = await import('../shared/components/Banner');
            
            this.header = new Header(true);
            this.banner = new Banner();
            
            // Insérer les composants dans le container
            container.insertBefore(this.header.getElement(), container.firstChild);
            container.insertBefore(this.banner.getElement(), gameContent);
        }, 0);

        const gameContent = document.createElement('main');
        gameContent.className = 'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700 items-center justify-center p-8';
        gameContent.innerHTML = `
            <div class="text-center">
                <h1 class="text-6xl font-bold text-white mb-8 font-iceland">SIMPLE PONG</h1>
                <div class="bg-black/30 backdrop-blur-sm border-white border-4 rounded-xl p-8 inline-block">
                    <div id="game-status" class="text-white font-iceland text-xl mb-4">En attente...</div>
                    
                    <div id="invite-section" class="mb-6">
                        <div class="text-white font-iceland text-lg mb-3">Inviter un ami à jouer:</div>
                        <div class="flex gap-3 justify-center">
                            <input type="number" id="friend-id" placeholder="ID de l'ami" 
                                   class="px-4 py-2 bg-black/50 text-white border-2 border-white/30 rounded-lg font-iceland placeholder-white/50 focus:border-white/70 focus:outline-none">
                            <button id="send-invite" 
                                    class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white border-2 border-white/30 rounded-lg font-iceland font-bold transition-colors">
                                Inviter
                            </button>
                        </div>
                    </div>
                    


                    <div id="game-canvas-container" class="mb-6">
                        <canvas id="game" width="800" height="400" 
                                class="border-3 border-white bg-black rounded-lg block"></canvas>
                    </div>
                    
                    <div class="text-white font-iceland">
                        <div class="text-lg mb-2">Contrôles: ↑/↓ pour bouger votre paddle</div>
                        <div class="text-sm opacity-75">Premier à 5 points gagne!</div>
                    </div>
                </div>
                
                <div class="mt-8">
                    <button id="back-to-menu" 
                            class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
                        ← Retour au Menu
                    </button>
                </div>
            </div>
        `;

        container.appendChild(gameContent);

        return container;
    }

    private bindEvents(): void {
        // Attendre que l'élément soit inséré dans le DOM
        setTimeout(() => {
            this.checkGameContext();
            this.initializeCanvas();
            this.setupInviteHandler();
            this.setupKeyboardHandlers();
            this.setupBackButton();
            this.initializeConnection();
        }, 100);
    }

    private checkGameContext(): void {
        // Vérifier si on arrive via une invitation (gameId dans l'URL)
        const urlParams = new URLSearchParams(window.location.search);
        const gameIdFromUrl = urlParams.get('gameId');
        
        if (gameIdFromUrl) {
            this.gameId = gameIdFromUrl;
            this.isInvitedGame = true;
            this.updateInterfaceForInvitedGame();
        }
    }

    private updateInterfaceForInvitedGame(): void {
        // Masquer la section d'invitation
        const inviteSection = this.element.querySelector('#invite-section');
        if (inviteSection) {
            inviteSection.classList.add('hidden');
        }

        // Mettre à jour le statut
        const status = this.element.querySelector('#game-status');
        if (status) {
            status.textContent = 'Connexion à la partie invitée...';
        }
    }

    private subscribeToAuth(): void {
        // Import dynamique pour éviter les dépendances circulaires
        import('../core/auth/AuthManager').then(({ authManager }) => {
            this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
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
        this.canvas = this.element.querySelector('#game') as HTMLCanvasElement;
        if (!this.canvas) {
            console.error('Canvas not found');
            return;
        }
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        this.ctx = ctx;
    }

    private setupBackButton(): void {
        const backButton = this.element.querySelector('#back-to-menu');
        backButton?.addEventListener('click', () => {
            import('../core/app/Router').then(({ router }) => {
                this.destroy();
                router.navigate('/menu');
            });
        });
    }

    private setupInviteHandler(): void {
        const sendInviteBtn = this.element.querySelector('#send-invite') as HTMLButtonElement;
        const friendIdInput = this.element.querySelector('#friend-id') as HTMLInputElement;
        const status = this.element.querySelector('#game-status') as HTMLElement;

        sendInviteBtn?.addEventListener('click', async () => {
            const friendId = friendIdInput.value;
            if (!friendId || !this.authToken) {
                status.textContent = 'Veuillez entrer un ID d\'ami valide et vous connecter';
                return;
            }

            try {
                sendInviteBtn.disabled = true;
                sendInviteBtn.textContent = 'Envoi...';
                
                const response = await fetch(`/api/friends/pong-invite/${friendId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                
                if (result.success) {
                    status.textContent = `Invitation envoyée à l'ami ${friendId}!`;
                    friendIdInput.value = '';
                } else {
                    status.textContent = result.message || 'Erreur lors de l\'envoi de l\'invitation';
                }
            } catch (error) {
                console.error('Erreur:', error);
                status.textContent = 'Erreur de connexion';
            } finally {
                sendInviteBtn.disabled = false;
                sendInviteBtn.textContent = 'Inviter';
            }
        });
    }

    private setupKeyboardHandlers(): void {
        const keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                this.keys.up = true;
                this.sendInput();
                e.preventDefault();
            }
            if (e.key === 'ArrowDown') {
                this.keys.down = true;
                this.sendInput();
                e.preventDefault();
            }
        };

        const keyupHandler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                this.keys.up = false;
                this.sendInput();
            }
            if (e.key === 'ArrowDown') {
                this.keys.down = false;
                this.sendInput();
            }
        };

        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);

        // Stocker les handlers pour pouvoir les supprimer plus tard
        (this as any).keydownHandler = keydownHandler;
        (this as any).keyupHandler = keyupHandler;
    }

    private initializeConnection(): void {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.connect(token);
        }
    }

    private connect(token: string): void {
        this.authToken = token;
        
        // Utiliser la même logique que l'API pour déterminer l'URL WebSocket
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://localhost:8000';
        const wsUrl = apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');
        const webSocketUrl = `${wsUrl}/ws`;
        
        this.ws = new WebSocket(webSocketUrl);
        const status = this.element.querySelector('#game-status') as HTMLElement;
        
        this.ws.onopen = () => {
            this.ws?.send(JSON.stringify({
                type: 'auth',
                token: token
            }));
        };
        
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            
            switch(msg.type) {
                case 'friend_pong_invite':
                    if (confirm(`Invitation de jeu reçue! Accepter?`)) {
                        this.ws?.send(JSON.stringify({
                            type: 'friend_pong_accept',
                            inviteId: msg.inviteId,
                            fromUserId: msg.fromUserId
                        }));
                    } else {
                        this.ws?.send(JSON.stringify({
                            type: 'friend_pong_decline',
                            inviteId: msg.inviteId
                        }));
                    }
                    break;
                    
                case 'friend_pong_start':
                case 'simple_pong_start':
                    this.myRole = msg.role;
                    this.gameId = msg.gameId;
                    status.textContent = `Partie commencée! Vous êtes ${this.myRole === 'left' ? 'le joueur de gauche' : 'le joueur de droite'}`;
                    break;
                    
                case 'friend_pong_state':
                case 'simple_pong_state':
                    if (msg.gameId || msg.gameState) {
                        // Pour simple_pong, l'état est dans msg.gameState au lieu de msg.state
                        this.gameState = msg.state || msg.gameState;
                        this.render();
                        
                        if (this.gameState.gameOver) {
                            const won = this.gameState.winner === this.myRole;
                            this.showGameEnd(won ? 'Vous avez gagné!' : 'Vous avez perdu!');
                        }
                    }
                    break;
                    
                case 'friend_pong_end':
                case 'simple_pong_end':
                    this.gameState = null;
                    this.myRole = null;
                    status.textContent = 'Partie terminée. En attente d\'une nouvelle invitation...';
                    if (this.ctx) {
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    }
                    break;
            }
        };
    }

    private sendInput(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'friend_pong_input',
                up: this.keys.up,
                down: this.keys.down
            }));
        }
    }

    private render(): void {
        if (!this.gameState || !this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Ligne centrale
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Paddles
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(10, this.gameState.leftPaddleY - 40, 10, 80);
        this.ctx.fillRect(780, this.gameState.rightPaddleY - 40, 10, 80);
        
        // Balle
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.ballX, this.gameState.ballY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Score
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '48px Iceland, monospace';
        this.ctx.fillText(this.gameState.leftScore.toString(), this.canvas.width / 4, 80);
        this.ctx.fillText(this.gameState.rightScore.toString(), (3 * this.canvas.width) / 4, 80);
    }

    private async showGameEnd(result: string): Promise<void> {
        if (this.gameEndOverlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-12 text-center max-w-lg">
                <h2 class="text-4xl font-bold text-white font-iceland mb-6">🏆 Partie Terminée!</h2>
                <p class="text-3xl text-yellow-300 font-bold font-iceland mb-4">${result}</p>
                <p class="text-xl text-white font-iceland mb-8">
                    Score Final: ${this.gameState?.leftScore || 0} - ${this.gameState?.rightScore || 0}
                </p>
                <div class="flex gap-4 justify-center">
                    <button id="play-again" 
                            class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg font-bold">
                        Nouvelle Partie
                    </button>
                    <button id="back-to-menu-end" 
                            class="text-white border-gray-400 border-2 px-6 py-3 rounded hover:bg-gray-400 hover:text-black transition-colors font-iceland text-lg">
                        Retour au Menu
                    </button>
                </div>
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.id === 'play-again') {
                this.destroy();
                import('../core/app/Router').then(({ router }) => {
                    router.navigate('/simple-pong');
                });
            } else if (target.id === 'back-to-menu-end') {
                this.destroy();
                import('../core/app/Router').then(({ router }) => {
                    router.navigate('/menu');
                });
            }
        });

        document.body.appendChild(overlay);
        this.gameEndOverlay = overlay;
    }

    getElement(): HTMLElement {
        return this.element;
    }

    destroy(): void {
        // Nettoyer les event listeners
        if ((this as any).keydownHandler) {
            document.removeEventListener('keydown', (this as any).keydownHandler);
        }
        if ((this as any).keyupHandler) {
            document.removeEventListener('keyup', (this as any).keyupHandler);
        }

        // Fermer la connexion WebSocket
        if (this.ws) {
            this.ws.close();
        }

        // Nettoyer l'overlay
        if (this.gameEndOverlay && document.body.contains(this.gameEndOverlay)) {
            document.body.removeChild(this.gameEndOverlay);
        }

        // Nettoyer l'auth subscription
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }

        // Nettoyer les composants
        if (this.header) {
            this.header.destroy();
        }
        if (this.banner) {
            this.banner.destroy();
        }

        this.element.remove();
    }
}