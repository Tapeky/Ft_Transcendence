export class Router {
  private routes: Map<string, (path?: string) => Promise<HTMLElement>> = new Map();
  private currentPage: HTMLElement | null = null;
  private routeGuard: any = null; // Will be set by RouteGuard

  constructor() {
    this.setupRoutes();
    this.handleInitialRoute();
    this.setupPopState();
  }

  public setRouteGuard(guard: any): void {
    this.routeGuard = guard;
  }

  private setupRoutes(): void {
    // Enregistrer les routes avec leurs factory functions dynamiques
    this.routes.set('/', async () => {
      const { HomePage } = await import('../../pages/Home');
      return new HomePage().getElement();
    });
    
    this.routes.set('/auth', async () => {
      const { AuthPage } = await import('../../features/auth/pages/Auth');
      return new AuthPage().getElement();
    });
    
    // Protected routes
    this.routes.set('/menu', async () => {
      const { MenuPage } = await import('../../pages/Menu');
      return new MenuPage().getElement();
    });
    
    this.routes.set('/profile', async () => {
      const { ProfilePage } = await import('../../features/profile/pages/Profile');
      return new ProfilePage().getElement();
    });
    
    this.routes.set('/friends', async () => {
      const { FriendsPage } = await import('../../features/friends/pages/Friends');
      return new FriendsPage().getElement();
    });
    
    this.routes.set('/tournament', async () => {
      const { TournamentPage } = await import('../../features/tournament/pages/Tournament');
      return new TournamentPage().getElement();
    });
    
    // Dynamic route for dashboard with user ID pattern: /dashboard/123
    this.routes.set('/dashboard', async (path?: string) => {
      const currentPath = path || window.location.pathname;
      const pathSegments = currentPath.split('/');
      const userId = pathSegments[2]; // /dashboard/123 -> segments[2] = "123"
      
      console.log('🔍 Router Dashboard - Debug:', {
        originalPath: path,
        currentPath: currentPath,
        pathSegments,
        userId,
        userIdExists: !!userId,
        matchesPattern: userId?.match(/^\d+$/)
      });
      
      if (!userId || !userId.match(/^\d+$/)) {
        console.log('❌ Router: Invalid userId, loading 404');
        const { NotFoundPage } = await import('../../pages/NotFound');
        return new NotFoundPage().getElement();
      }
      
      // Success;
      const { Dashboard } = await import('../../features/profile/pages/Dashboard');
      const container = document.createElement('div');
      new Dashboard(container, userId);
      return container;
    });
    
    // Route pour game mode selector
    this.routes.set('/game', async (path?: string) => {
      const currentPath = path || window.location.pathname;
      const pathSegments = currentPath.split('/');
      const gameMode = pathSegments[2]; // /game/local or /game/online or /game/123
      
      console.log('🎮 Router Game - Debug:', {
        originalPath: path,
        currentPath: currentPath,
        pathSegments,
        gameMode,
        gameModeExists: !!gameMode
      });
      
      // Si pas de mode spécifié, afficher le sélecteur de mode
      if (!gameMode) {
        const { PongModeSelector } = await import('../../features/game/pages/PongModeSelector');
        const container = document.createElement('div');
        new PongModeSelector(container);
        return container;
      }
      
      // Si mode local
      if (gameMode === 'local') {
        const { Game } = await import('../../features/game/pages/Game');
        const container = document.createElement('div');
        new Game(container, undefined, 'local');
        return container;
      }
      
      // Si mode online sans ID spécifique, afficher la sélection d'adversaire
      if (gameMode === 'online') {
        const { OnlinePlayerSelector } = await import('../../features/game/pages/OnlinePlayerSelector');
        const container = document.createElement('div');
        new OnlinePlayerSelector(container);
        return container;
      }
      
      // Si ID d'adversaire spécifique (mode online avec joueur)
      if (gameMode.match(/^\d+$/)) {
        const { Game } = await import('../../features/game/pages/Game');
        const container = document.createElement('div');
        const opponentId = parseInt(gameMode);
        new Game(container, opponentId, 'online');
        return container;
      }
      
      // Route invalide, rediriger vers 404
      const { NotFoundPage } = await import('../../pages/NotFound');
      return new NotFoundPage().getElement();
    });
    
    this.routes.set('/404', async () => {
      const { NotFoundPage } = await import('../../pages/NotFound');
      return new NotFoundPage().getElement();
    });
    
    
    console.log('🛣️ Router: Routes enregistrées', Array.from(this.routes.keys()));
  }

  private findRoute(path: string): ((path?: string) => Promise<HTMLElement>) | undefined {
    // Essayer match exact d'abord
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }
    
    // Essayer match dynamique pour dashboard
    if (path.startsWith('/dashboard/')) {
      const segments = path.split('/');
      if (segments.length === 3 && segments[2].match(/^\d+$/)) {
        return this.routes.get('/dashboard');
      }
    }
    
    // Essayer match dynamique pour game (avec tous les modes)
    if (path.startsWith('/game')) {
      const segments = path.split('/');
      // Accepter /game, /game/local, /game/online, ou /game/123
      if (segments.length === 2 || 
          (segments.length === 3 && (segments[2] === 'local' || segments[2] === 'online' || segments[2].match(/^\d+$/)))) {
        return this.routes.get('/game');
      }
    }
    
    return undefined;
  }

  public async navigate(path: string, skipGuard: boolean = false): Promise<void> {
    console.log(`🧭 Router: Navigation vers ${path}`);
    
    // Check route protection if guard is available and not skipped
    if (!skipGuard && this.routeGuard) {
      if (!this.routeGuard.canNavigateTo(path)) {
        console.log(`🚫 Router: Navigation bloquée vers ${path}`);
        return;
      }
    }
    
    try {
      // Trouver la page avec matching intelligent
      const pageFactory = this.findRoute(path) || this.routes.get('/404')!;
      
      // Render la nouvelle page (await du dynamic import)
      const page = await pageFactory(path);
      this.render(page);
      
      // Mettre à jour l'URL du navigateur
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    } catch (error) {
      console.error('❌ Router: Erreur navigation:', error);
      // Fallback vers une page d'erreur simple
      this.renderError(`Erreur de navigation: ${error}`);
    }
  }

  private render(page: HTMLElement): void {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    // Nettoyer la page précédente
    root.innerHTML = '';

    // Afficher la nouvelle page
    root.appendChild(page);
    this.currentPage = page;
    
    // Success;
  }

  private handleInitialRoute(): void {
    // Gérer la route initiale au chargement
    const currentPath = window.location.pathname;
    
    this.navigate(currentPath);
  }

  private setupPopState(): void {
    // Gérer les boutons précédent/suivant du navigateur
    window.addEventListener('popstate', async () => {
      const currentPath = window.location.pathname;
      console.log(`⏪ Router: Popstate détecté: ${currentPath}`);
      
      try {
        // Navigate sans pushState pour éviter la boucle
        const pageFactory = this.findRoute(currentPath) || this.routes.get('/404')!;
        const page = await pageFactory(currentPath);
        this.render(page);
      } catch (error) {
        console.error('❌ Router: Erreur popstate:', error);
        this.renderError(`Erreur navigation historique: ${error}`);
      }
    });
  }

  private renderError(message: string): void {
    const root = document.getElementById('root');
    if (!root) return;

    root.innerHTML = `
      <div style="min-height: 100vh; background: linear-gradient(135deg, #ef4444, #dc2626); 
                  display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
        <div style="text-align: center; padding: 40px; background: rgba(0,0,0,0.2); border-radius: 10px;">
          <h1 style="font-size: 3rem; margin-bottom: 20px;">⚠️ Erreur Router</h1>
          <p style="font-size: 1.2rem; margin-bottom: 20px;">${message}</p>
          <button onclick="window.location.reload()" 
                  style="padding: 10px 20px; font-size: 1rem; background: white; color: #dc2626; 
                         border: none; border-radius: 5px; cursor: pointer;">
            Recharger la page
          </button>
        </div>
      </div>
    `;
  }

  // Méthode utilitaire pour debug
  public getCurrentPath(): string {
    return window.location.pathname;
  }

  public getAvailableRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

// Export singleton pour usage global
export const router = new Router();

// Rendre disponible globalement pour debug
(window as any).router = router;