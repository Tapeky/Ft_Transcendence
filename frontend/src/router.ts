export class Router {
  private routes: Map<string, () => Promise<HTMLElement>> = new Map();
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
      const { HomePage } = await import('./pages/Home');
      return new HomePage().getElement();
    });
    
    this.routes.set('/auth', async () => {
      const { AuthPage } = await import('./pages/Auth');
      return new AuthPage().getElement();
    });
    
    // Protected routes
    this.routes.set('/menu', async () => {
      const { MenuPage } = await import('./pages/Menu');
      return new MenuPage().getElement();
    });
    
    this.routes.set('/profile', async () => {
      const { ProfilePage } = await import('./pages/Profile');
      return new ProfilePage().getElement();
    });
    
    this.routes.set('/friends', async () => {
      const { FriendsPage } = await import('./pages/Friends');
      return new FriendsPage().getElement();
    });
    
    this.routes.set('/tournament', async () => {
      const { TournamentPage } = await import('./pages/Tournament');
      return new TournamentPage().getElement();
    });
    
    this.routes.set('/chat', async () => {
      const { ChatPage } = await import('./pages/Chat');
      return new ChatPage().getElement();
    });
    
    this.routes.set('/404', async () => {
      const { NotFoundPage } = await import('./pages/NotFound');
      return new NotFoundPage().getElement();
    });
    
    this.routes.set('/test', async () => {
      const { TestPage } = await import('./pages/Test');
      return new TestPage().getElement();
    });
    
    console.log('🛣️ Router: Routes enregistrées', Array.from(this.routes.keys()));
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
      // Trouver la page ou fallback vers 404
      const pageFactory = this.routes.get(path) || this.routes.get('/404')!;
      
      // Render la nouvelle page (await du dynamic import)
      const page = await pageFactory();
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
    
    console.log('✅ Router: Page rendue');
  }

  private handleInitialRoute(): void {
    // Gérer la route initiale au chargement
    const currentPath = window.location.pathname;
    console.log(`🚀 Router: Route initiale détectée: ${currentPath}`);
    
    this.navigate(currentPath);
  }

  private setupPopState(): void {
    // Gérer les boutons précédent/suivant du navigateur
    window.addEventListener('popstate', async () => {
      const currentPath = window.location.pathname;
      console.log(`⏪ Router: Popstate détecté: ${currentPath}`);
      
      try {
        // Navigate sans pushState pour éviter la boucle
        const pageFactory = this.routes.get(currentPath) || this.routes.get('/404')!;
        const page = await pageFactory();
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