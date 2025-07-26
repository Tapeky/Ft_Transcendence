import { appState } from '../state/AppState';
import { AuthManager } from '../auth/AuthManager';

/**
 * Route protection system for the application
 * Manages authentication requirements and redirections
 */
export class RouteGuard {
  private authManager: AuthManager;
  
  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authManager.isAuthenticated();
  }

  /**
   * Check if a route requires authentication
   */
  isProtectedRoute(path: string): boolean {
    const protectedRoutes = [
      '/menu',
      '/profile',
      '/friends',
      '/tournament',
      '/chat',
      '/game'
    ];
    
    return protectedRoutes.some(route => path.startsWith(route));
  }

  /**
   * Check if a route is for guests only (auth page)
   */
  isGuestOnlyRoute(path: string): boolean {
    const guestRoutes = ['/auth', '/login', '/register'];
    return guestRoutes.some(route => path.startsWith(route));
  }

  /**
   * Validate route access and handle redirections
   */
  validateRouteAccess(targetPath: string): { allowed: boolean; redirectTo?: string } {
    // CRITICAL FIX: Wait for auth initialization to complete
    // This prevents race condition where routes are validated before auth check finishes
    if (appState.getState().loading) {
      return { allowed: true }; // Allow navigation during loading, validation will happen after init
    }

    const isAuthenticated = this.isAuthenticated();
    const isProtected = this.isProtectedRoute(targetPath);
    const isGuestOnly = this.isGuestOnlyRoute(targetPath);

    // If user is not authenticated and tries to access protected route
    if (!isAuthenticated && isProtected) {
      return {
        allowed: false,
        redirectTo: '/auth'
      };
    }

    // If user is authenticated and tries to access guest-only route
    if (isAuthenticated && isGuestOnly) {
      return {
        allowed: false,
        redirectTo: '/menu'
      };
    }

    // Route access is allowed
    return { allowed: true };
  }

  /**
   * Guard function to be called before route navigation
   */
  canNavigateTo(targetPath: string): boolean {
    const validation = this.validateRouteAccess(targetPath);
    
    if (!validation.allowed && validation.redirectTo) {
      // Redirect to appropriate page
      if (appState.router) {
        appState.router.navigate(validation.redirectTo, true); // Skip guard check for redirects
      }
      return false;
    }
    
    return true;
  }

  /**
   * Initialize route protection
   * Sets up authentication state monitoring
   */
  initialize(): void {
    // Listen for authentication state changes
    this.authManager.onAuthStateChange((isAuthenticated: boolean) => {
      // Only process auth changes when not loading (auth init complete)
      if (!appState.getState().loading && appState.router) {
        const currentPath = appState.router.getCurrentPath();
        const validation = this.validateRouteAccess(currentPath);
        
        if (!validation.allowed && validation.redirectTo) {
          appState.router.navigate(validation.redirectTo, true); // Skip guard check for redirects
        }
      }
    });

    // Listen for loading state changes to validate route after auth init
    appState.subscribe((state) => {
      // When loading finishes, validate current route
      if (!state.loading && appState.router) {
        const currentPath = appState.router.getCurrentPath();
        const validation = this.validateRouteAccess(currentPath);
        
        if (!validation.allowed && validation.redirectTo) {
          console.log('🛡️ RouteGuard: Post-auth validation, redirecting to:', validation.redirectTo);
          appState.router.navigate(validation.redirectTo, true);
        }
      }
    });

    // Skip initial route check - will be handled after auth initialization completes
    console.log('🛡️ RouteGuard: Initialized with loading-aware validation');
  }

  /**
   * Logout and redirect to auth page
   */
  async logout(): Promise<void> {
    try {
      await this.authManager.logout();
      if (appState.router) {
        appState.router.navigate('/auth', true); // Skip guard check
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation even if logout fails
      if (appState.router) {
        appState.router.navigate('/auth', true); // Skip guard check
      }
    }
  }

  /**
   * Check if current route is valid for user's auth state
   */
  validateCurrentRoute(): void {
    if (appState.router) {
      const currentPath = appState.router.getCurrentPath();
      this.canNavigateTo(currentPath);
    }
  }
}