import { appState } from '../state/AppState';
import { router } from './Router';
import { AuthManager } from '../auth/AuthManager';
import { RouteGuard } from './RouteGuard';
import { gameInviteManager } from '../services/GameInviteManager';

/**
 * Application bootstrapper
 * Initializes all core systems and their dependencies
 */
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

  /**
   * Initialize the application
   * Sets up all dependencies and starts the application
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Step 1: Setup core dependencies
      this.setupCoreDependencies();

      // Step 2: Initialize route protection
      this.initializeRouteProtection();

      // Step 3: Initialize game invite system
      this.initializeGameInviteSystem();

      // Step 4: Setup global error handling
      this.setupErrorHandling();

      // Step 5: Mark as initialized
      this.isInitialized = true;

    } catch (error) {
      console.error('Application initialization failed:', error);
      throw error;
    }
  }

  private setupCoreDependencies(): void {
    // Connect AppState with Router
    appState.setRouter(router);

    // Connect Router with RouteGuard
    router.setRouteGuard(this.routeGuard);
  }

  private initializeRouteProtection(): void {
    // Initialize route guard (sets up auth state monitoring)
    this.routeGuard.initialize();
  }

  private initializeGameInviteSystem(): void {
    // Initialize game invite manager (sets up WebSocket listeners)
    console.log('🎮 Application: Initializing game invite system...');
    
    // The manager is already initialized as singleton
    // Load any pending invites when user is authenticated
    this.authManager.onAuthStateChange((user) => {
      if (user) {
        // User is authenticated, load pending invites
        gameInviteManager.loadPendingInvites();
      } else {
        // User logged out, clear notifications
        gameInviteManager.clearAllNotifications();
      }
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global Error:', event.error);
      this.handleGlobalError(event.error);
    });

    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
  }

  private handleGlobalError(error: any): void {
    // Log error details
    console.error('Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // You could add error reporting service here
    // errorReportingService.report(error);
  }

  private logSystemStatus(): void {
    // System status logging for debugging - can be called via browser console
    // application.logSystemStatus()
  }

  /**
   * Get current system status
   */
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

  /**
   * Get route guard instance
   */
  public getRouteGuard(): RouteGuard {
    return this.routeGuard;
  }

  /**
   * Get auth manager instance
   */
  public getAuthManager(): AuthManager {
    return this.authManager;
  }

  /**
   * Shutdown the application (for testing)
   */
  public shutdown(): void {
    this.isInitialized = false;
  }
}

// Export singleton
export const application = Application.getInstance();

// Make available globally for debugging
(window as any).application = application;