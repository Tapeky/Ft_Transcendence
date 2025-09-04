import { appState } from '../state/AppState';
import { AuthManager } from '../../core/auth/AuthManager';

export class RouteGuard {
  private authManager: AuthManager;
  
  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  isProtectedRoute(path: string): boolean {
    const protectedRoutes = [
      '/menu',
      '/profile',
      '/tournament',
      '/game'
    ];
    
    return protectedRoutes.some(route => path.startsWith(route));
  }

  isGuestOnlyRoute(path: string): boolean {
    const guestRoutes = ['/auth', '/login', '/register'];
    return guestRoutes.some(route => path.startsWith(route));
  }

  validateRouteAccess(targetPath: string): { allowed: boolean; redirectTo?: string } {
    if (appState.getState().loading) {
      return { allowed: true };
    }

    const isAuthenticated = this.authManager.isAuthenticated();
    const isProtected = this.isProtectedRoute(targetPath);
    const isGuestOnly = this.isGuestOnlyRoute(targetPath);

    if (!isAuthenticated && isProtected) {
      return {
        allowed: false,
        redirectTo: '/auth'
      };
    }

    if (isAuthenticated && isGuestOnly) {
      return {
        allowed: false,
        redirectTo: '/menu'
      };
    }

    return { allowed: true };
  }

  canNavigateTo(targetPath: string): boolean {
    const validation = this.validateRouteAccess(targetPath);
    
    if (!validation.allowed && validation.redirectTo) {
      if (appState.router) {
        appState.router.navigate(validation.redirectTo, true);
      }
      return false;
    }
    return true;
  }

  private redirectIfNeeded(): void {
    if (!appState.getState().loading && appState.router) {
      const currentPath = appState.router.getCurrentPath();
      const validation = this.validateRouteAccess(currentPath);
      
      if (!validation.allowed && validation.redirectTo) {
        appState.router.navigate(validation.redirectTo, true);
      }
    }
  }

  initialize(): void {
    this.authManager.onAuthStateChange((isAuthenticated: boolean) => {
      this.redirectIfNeeded();
    });

    appState.subscribe((state) => {
      this.redirectIfNeeded();
    });
  }

  async logout(): Promise<void> {
    try {
      await this.authManager.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (appState.router) {
        appState.router.navigate('/auth', true);
      }
    }
  }
}