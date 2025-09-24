import { appState } from '../state/AppState';
import { router } from './Router';
import { AuthManager } from '../../core/auth/AuthManager';
import { RouteGuard } from './RouteGuard';
import { gameNotificationService } from '../../shared/services/GameNotificationService';
import { GameManager } from '../../services/GameManager';

export class Application {
  private static instance: Application;
  private routeGuard: RouteGuard;
  private authManager: AuthManager;
  private gameManager: GameManager;
  private isInitialized = false;

  private constructor() {
    this.authManager = AuthManager.getInstance();
    this.routeGuard = new RouteGuard();
    this.gameManager = GameManager.getInstance();
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.setupCoreDependencies();
    this.initializeRouteProtection();
    this.setupErrorHandling();
    await gameNotificationService.initialize();
    await this.gameManager.initialize(); // Initialize GameManager
    this.isInitialized = true;
  }

  private setupCoreDependencies(): void {
    appState.setRouter(router);
    router.setRouteGuard(this.routeGuard);
  }

  private initializeRouteProtection(): void {
    this.routeGuard.initialize();
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
    });
  }

  private handleGlobalError(error: any): void {
    console.error('Error:', error);
  }

  public getSystemStatus(): {
    initialized: boolean;
    authenticated: boolean;
    loading: boolean;
    currentPath: string;
  } {
    return {
      initialized: this.isInitialized,
      authenticated: this.authManager.isAuthenticated(),
      loading: this.authManager.isLoading(),
      currentPath: router.getCurrentPath()
    };
  }

  public getRouteGuard(): RouteGuard { return this.routeGuard; }
  public getAuthManager(): AuthManager { return this.authManager; }
  public getGameManager(): GameManager { return this.gameManager; }
  public shutdown(): void { this.isInitialized = false; }
}

export const application = Application.getInstance();

declare global {
  interface Window {
    router: typeof router;
    application: typeof application;
    GameManager: typeof GameManager;
  }
}

window.router = router;
window.application = application;
window.GameManager = GameManager;
