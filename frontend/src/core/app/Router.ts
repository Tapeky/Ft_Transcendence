import { RouteGuard } from './RouteGuard';
import { PongRenderer } from '../../features/game/PongRenderer';
import { GameManager } from '../../services/GameManager';

let pongRenderer: PongRenderer | null = null;

export class Router {
  private routes: Map<string, (path?: string) => Promise<HTMLElement>> = new Map();
  private routeGuard: RouteGuard | null = null;
  private currentPath: string = '';
  private gameManager: GameManager | null = null;

  constructor() {
    this.setupRoutes();
    this.handleInitialRoute();
    this.setupPopState();
    this.setupGameCleanup();
  }

  public setRouteGuard(guard: RouteGuard): void {
    this.routeGuard = guard;
  }

  private createComponentContainer<T>(ComponentClass: new (container: HTMLElement, ...args: any[]) => T, ...args: any[]): HTMLElement {
    const container = document.createElement('div');
    new ComponentClass(container, ...args);
    return container;
  }

  private setupRoutes(): void {
    this.routes.set('/', async () => {
      const { HomePage } = await import('../../pages/Home');
      return new HomePage().getElement();
    });

    this.routes.set('/auth', async () => {
      const { AuthPage } = await import('../../features/auth/pages/Auth');
      return new AuthPage().getElement();
    });

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
      const { LocalTournament } = await import('../../features/tournament/pages/LocalTournament');
      const tournament = new LocalTournament();
      await tournament.waitForInitialization();
      return tournament.getElement();
    });

    this.routes.set('/tournament-history', async () => {
      const { TournamentHistory } = await import('../../features/tournament/pages/TournamentHistory');
      return new TournamentHistory().getElement();
    });

    this.routes.set('/dashboard', async (path?: string) => {
      const currentPath = path || window.location.pathname;
      const pathSegments = currentPath.split('/');
      const userId = pathSegments[2];

      if (!userId || !userId.match(/^\d+$/)) {
        const { NotFoundPage } = await import('../../pages/NotFound');
        return new NotFoundPage().getElement();
      }

      const { Dashboard } = await import('../../features/profile/pages/Dashboard');
      return this.createComponentContainer(Dashboard, userId);
    });

    this.routes.set('/game', async (path?: string) => {
      const { GamePage } = await import('../../pages/Game');
      return new GamePage().getElement();
    });

    this.routes.set('/game-vanilla', async (path?: string) => {
      // Extract session ID from path /game/:id
      const segments = (path || '').split('/');
      const sessionId = segments.length >= 3 ? segments[2] : 'test-session';

      // Destroy existing renderer if any
      if (pongRenderer) {
        pongRenderer.destroy();
      }

      // Create container for PongRenderer
      const container = document.createElement('div');
      container.id = 'game-root';
      container.style.width = '100%';
      container.style.height = '100vh';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      container.style.backgroundColor = '#000';

      // Create new PongRenderer singleton
      pongRenderer = new PongRenderer('game-root');
      pongRenderer.setSessionId(sessionId);

      // Cleanup on page leave
      const cleanup = () => {
        if (pongRenderer) {
          pongRenderer.destroy();
          pongRenderer = null;
        }
        window.removeEventListener('beforeunload', cleanup);
      };
      window.addEventListener('beforeunload', cleanup);

      return container;
    });

    this.routes.set('/404', async () => {
      const { NotFoundPage } = await import('../../pages/NotFound');
      return new NotFoundPage().getElement();
    });
  }

  private findRoute(path: string): ((path?: string) => Promise<HTMLElement>) | undefined {
    if (this.routes.has(path)) return this.routes.get(path);

    if (path.startsWith('/dashboard/')) {
      const pathname = path.split('?')[0];
      const segments = pathname.split('/');
      if (segments.length === 3 && segments[2].match(/^\d+$/)) {
        return this.routes.get('/dashboard');
      }
    }

    if (path.startsWith('/game')) {
      const segments = path.split('/');
      if (segments.length >= 3 && segments[2] === 'vanilla') {
        // /game/vanilla/:id format - redirect to game-vanilla
        return (path?: string) => this.routes.get('/game-vanilla')!(path);
      }
      // All other /game paths (including /game/:id) go to regular game
      return this.routes.get('/game');
    }

    return undefined;
  }

  private async renderPath(path: string): Promise<void> {
    const pageFactory = this.findRoute(path) || this.routes.get('/404')!;
    const page = await pageFactory(path);
    this.render(page);
  }

  public async navigate(path: string, skipGuard: boolean = false): Promise<void> {
    if (!skipGuard && this.routeGuard)
      if (!this.routeGuard.canNavigateTo(path))
        return;

    try {
      // Check if navigating away from game page - trigger cleanup
      await this.handleNavigationCleanup(this.currentPath, path);

      if (window.location.pathname + window.location.search !== path)
        window.history.pushState(null, '', path);

      this.currentPath = path;
      await this.renderPath(path);
    } catch (error) {
      this.renderError(`Erreur de navigation: ${error}`);
    }
  }

  private render(page: HTMLElement): void {
    const root = document.getElementById('root');
    if (!root) throw new Error('Root element not found');

    root.innerHTML = '';
    root.appendChild(page);
  }

  private handleInitialRoute(): void {
    const currentPath = window.location.pathname + window.location.search;
    this.navigate(currentPath);
  }

  private setupPopState(): void {
    window.addEventListener('popstate', async () => {
      const newPath = window.location.pathname + window.location.search;

      try {
        // Handle cleanup for back/forward navigation
        await this.handleNavigationCleanup(this.currentPath, newPath);
        this.currentPath = newPath;
        await this.renderPath(newPath);
      } catch (error) {
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

  private setupGameCleanup(): void {
    // Setup browser event handlers for cleanup
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('unload', this.handleUnload);

    // Handle visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleBeforeUnload = (event: BeforeUnloadEvent) => {
    // Only prompt if user is in an active online game
    if (this.isInGamePage() && this.isInOnlineGame()) {
      event.preventDefault();
      event.returnValue = 'You are in an active game. Are you sure you want to leave?';

      // Attempt immediate cleanup
      this.performGameCleanup(true);

      return event.returnValue;
    }
  };

  private handleUnload = () => {
    // Final cleanup attempt when page unloads
    if (this.isInGamePage()) {
      this.performGameCleanup(true);
    }
  };

  private handleVisibilityChange = () => {
    // If tab becomes hidden while in game, this could indicate navigation
    if (document.hidden && this.isInGamePage()) {
      console.log('🔄 Tab hidden while in game - preparing for potential cleanup');
      // Don't cleanup immediately, just prepare
    }
  };

  private async handleNavigationCleanup(fromPath: string, toPath: string): Promise<void> {
    // Check if leaving a game page
    if (this.isGamePath(fromPath) && !this.isGamePath(toPath)) {
      console.log(`🧹 Navigating away from game (${fromPath} → ${toPath}) - triggering cleanup`);
      await this.performGameCleanup(false);
    }
  }

  private isGamePath(path: string): boolean {
    return path.startsWith('/game') || path.includes('game');
  }

  private isInGamePage(): boolean {
    return this.isGamePath(this.currentPath || window.location.pathname);
  }

  private isInOnlineGame(): boolean {
    try {
      if (!this.gameManager) {
        this.gameManager = GameManager.getInstance();
      }
      return this.gameManager.isOnlineGame();
    } catch (error) {
      console.warn('Could not check online game status:', error);
      return false;
    }
  }

  private performGameCleanup(immediate: boolean = false): void {
    try {
      console.log(`🧹 Performing game cleanup (immediate: ${immediate})`);

      // Get GameManager instance
      if (!this.gameManager) {
        this.gameManager = GameManager.getInstance();
      }

      // Leave current game if any
      if (this.gameManager.isInGame()) {
        console.log('🚪 Leaving current game via GameManager');
        this.gameManager.leaveCurrentGame();
      }

      // Cleanup PongRenderer if exists
      if (pongRenderer) {
        console.log('🧹 Cleaning up PongRenderer');
        pongRenderer.destroy();
        pongRenderer = null;
      }

      // Additional cleanup for immediate mode (page unload)
      if (immediate) {
        // Force server notification via ChatService
        try {
          const { ChatService } = require('../../features/friends/services/ChatService');
          const chatService = ChatService.getInstance();
          if (chatService.isCurrentlyInGame()) {
            chatService.leaveGame();
          }
        } catch (error) {
          console.warn('Could not access ChatService for cleanup:', error);
        }
      }

    } catch (error) {
      console.error('Error during game cleanup:', error);
    }
  }

  public getCurrentPath(): string { return window.location.pathname; }

  public getAvailableRoutes(): string[] {
    return Array.from(this.routes.keys());
  }

  // Cleanup method for proper router destruction
  public destroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('unload', this.handleUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Final cleanup
    this.performGameCleanup(true);
  }
}

export const router = new Router();
