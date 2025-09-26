import { RouteGuard } from './RouteGuard';

export class Router {
  private routes: Map<string, (path?: string) => Promise<HTMLElement>> = new Map();
  private routeGuard: RouteGuard | null = null;

  constructor() {
    this.setupRoutes();
    this.handleInitialRoute();
    this.setupPopState();
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

    this.routes.set('/simple-pong', async () => {
      const { SimplePongPage } = await import('../../pages/SimplePongPage');
      return new SimplePongPage().getElement();
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
      return this.routes.get('/game');
    }

    if (path.startsWith('/simple-pong')) {
      return this.routes.get('/simple-pong');
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
      if (window.location.pathname + window.location.search !== path)
        window.history.pushState(null, '', path);

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
      const currentPath = window.location.pathname + window.location.search;

      try {
        await this.renderPath(currentPath);
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

  public getCurrentPath(): string { return window.location.pathname; }
  
  public getAvailableRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

export const router = new Router();
