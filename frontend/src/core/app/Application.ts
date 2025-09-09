import { appState } from '../state/AppState';
import { router } from './Router';
import { AuthManager } from '../../core/auth/AuthManager';
import { RouteGuard } from './RouteGuard';

export class Application {
  private static instance: Application;
  private routeGuard: RouteGuard;
  private authManager: AuthManager;
  private isInitialized = false;

  private constructor() {
    this.authManager = AuthManager.getInstance();
    this.routeGuard = new RouteGuard();
  }

  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.setupCoreDependencies();
      this.initializeRouteProtection();
      this.setupErrorHandling();
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
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
    console.error('Global error:', error);
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
  public shutdown(): void { this.isInitialized = false; }

}

export const application = Application.getInstance();
(window as any).router = router;
(window as any).application = application;