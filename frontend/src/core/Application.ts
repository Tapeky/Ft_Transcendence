import { appState } from '../state/AppState';
import { router } from '../router';
import { AuthManager } from '../auth/AuthManager';
import { RouteGuard } from './RouteGuard';

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
      console.warn('🚀 Application: Already initialized');
      return;
    }

    console.log('🚀 Application: Starting initialization...');

    try {
      // Step 1: Setup core dependencies
      this.setupCoreDependencies();

      // Step 2: Initialize route protection
      this.initializeRouteProtection();

      // Step 3: Setup global error handling
      this.setupErrorHandling();

      // Step 4: Mark as initialized
      this.isInitialized = true;

      console.log('✅ Application: Successfully initialized');

      // Log system status
      this.logSystemStatus();

    } catch (error) {
      console.error('❌ Application: Failed to initialize:', error);
      throw error;
    }
  }

  private setupCoreDependencies(): void {
    console.log('🔧 Application: Setting up core dependencies...');

    // Connect AppState with Router
    appState.setRouter(router);

    // Connect Router with RouteGuard
    router.setRouteGuard(this.routeGuard);

    console.log('✅ Application: Core dependencies connected');
  }

  private initializeRouteProtection(): void {
    console.log('🛡️ Application: Initializing route protection...');

    // Initialize route guard (sets up auth state monitoring)
    this.routeGuard.initialize();

    console.log('✅ Application: Route protection initialized');
  }

  private setupErrorHandling(): void {
    console.log('⚠️ Application: Setting up error handling...');

    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('🚨 Global Error:', event.error);
      this.handleGlobalError(event.error);
    });

    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });

    console.log('✅ Application: Error handling configured');
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
    console.group('📊 Application: System Status');
    console.log('✅ AppState:', appState ? 'Connected' : 'Missing');
    console.log('✅ Router:', router ? 'Connected' : 'Missing');
    console.log('✅ AuthManager:', this.authManager ? 'Connected' : 'Missing');
    console.log('✅ RouteGuard:', this.routeGuard ? 'Connected' : 'Missing');
    console.log('📍 Current Path:', router?.getCurrentPath());
    console.log('🔐 Authenticated:', this.authManager?.isAuthenticated());
    console.log('⏳ Loading:', this.authManager?.isLoading());
    console.groupEnd();
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
    console.log('🛑 Application: Shutting down...');
    this.isInitialized = false;
    console.log('✅ Application: Shutdown complete');
  }
}

// Export singleton
export const application = Application.getInstance();

// Make available globally for debugging
(window as any).application = application;