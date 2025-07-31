import { appState } from '../state/AppState';
import { apiService, LoginCredentials, RegisterCredentials, User } from '../../shared/services/api';

// AuthManager - Bridge entre l'API existante et notre AppState
// Remplace AuthContext.tsx en gardant EXACTEMENT la même logique

export class AuthManager {
  private static instance: AuthManager;
  private authStateCallbacks: ((isAuthenticated: boolean) => void)[] = [];

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private async initializeAuth(): Promise<void> {
    appState.setLoading(true);

    try {
      // Étape 1: Gérer callback OAuth (GitHub/Google)
      const callbackToken = apiService.handleAuthCallback();
      if (callbackToken) {
        // Token received from OAuth callback
      }
    } catch (error) {
      console.error('AuthManager OAuth callback error:', this.getErrorMessage(error));
    }

    try {
      // Étape 2: Vérifier si déjà authentifié
      if (apiService.isAuthenticated()) {
        // Token found, retrieving user info
        const currentUser = await apiService.getCurrentUser();
        
        // Mettre à jour AppState au lieu de React state
        appState.setState({
          user: currentUser,
          isAuthenticated: true,
          loading: false
        });
        
        // Notify auth state change
        this.notifyAuthStateChange(true);
        
        // User authenticated successfully
      } else {
        // Pas de token valide
        appState.setState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
        
        // Notify auth state change
        this.notifyAuthStateChange(false);
        
        // No valid token found
      }
    } catch (error) {
      console.error('AuthManager user info retrieval error:', this.getErrorMessage(error));
      
      // Nettoyer token invalide
      apiService.clearToken();
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      
      // Notify auth state change
      this.notifyAuthStateChange(false);
    }
  }

  // Login - EXACTEMENT la même logique que AuthContext
  public async login(credentials: LoginCredentials): Promise<void> {
    appState.setLoading(true);

    try {
      // Utiliser l'API service existant - AUCUN changement !
      const authResponse = await apiService.login(credentials);
      
      // Mettre à jour AppState au lieu de React state
      appState.setState({
        user: authResponse.user,
        isAuthenticated: true,
        loading: false
      });
      
      // Notify auth state change
      this.notifyAuthStateChange(true);
      
      // Login successful
      
      // Navigation automatique vers menu (comme dans AuthContext)
      this.navigateToMenu();
      
    } catch (error) {
      appState.setLoading(false);
      const errorMessage = this.getErrorMessage(error);
      console.error('AuthManager login failed:', errorMessage);
      
      // Re-throw pour que le formulaire puisse afficher l'erreur
      throw new Error(errorMessage);
    }
  }

  // Register - EXACTEMENT la même logique que AuthContext  
  public async register(credentials: RegisterCredentials): Promise<void> {
    appState.setLoading(true);

    try {
      // Utiliser l'API service existant - AUCUN changement !
      const authResponse = await apiService.register(credentials);
      
      // Mettre à jour AppState au lieu de React state
      appState.setState({
        user: authResponse.user,
        isAuthenticated: true,
        loading: false
      });
      
      // Notify auth state change
      this.notifyAuthStateChange(true);
      
      // Registration successful
      
      // Navigation automatique vers menu
      this.navigateToMenu();
      
    } catch (error) {
      appState.setLoading(false);
      const errorMessage = this.getErrorMessage(error);
      
      // Ne pas logger les erreurs de validation attendues
      const isValidationError = errorMessage.includes('déjà pris') || 
        errorMessage.includes('déjà utilisé') || 
        errorMessage.includes('existe déjà') ||
        errorMessage.includes('invalide') ||
        errorMessage.includes('incorrect');
      
      if (!isValidationError) {
        console.error('AuthManager unexpected registration error:', errorMessage);
      }
      
      // Re-throw pour que le formulaire puisse afficher l'erreur
      throw new Error(errorMessage);
    }
  }

  // Logout - EXACTEMENT la même logique que AuthContext
  public async logout(): Promise<void> {
    appState.setLoading(true);

    try {
      // Utiliser l'API service existant - AUCUN changement !
      await apiService.logout();
      
      // Mettre à jour AppState
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      
      // Notify auth state change
      this.notifyAuthStateChange(false);
      
      // Logout successful
      
      // Navigation vers page d'accueil
      this.navigateToHome();
      
    } catch (error) {
      console.error('AuthManager logout error:', this.getErrorMessage(error));
      
      // Même si l'API échoue, on déconnecte côté client
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      
      // Notify auth state change
      this.notifyAuthStateChange(false);
      
      this.navigateToHome();
    }
  }

  // Refresh user data
  public async refreshUser(): Promise<void> {
    try {
      const currentUser = await apiService.getCurrentUser();
      appState.setState({ user: currentUser });
      // User info updated successfully
    } catch (error) {
      console.error('AuthManager user refresh error:', this.getErrorMessage(error));
    }
  }

  // OAuth URLs - réutilise apiService
  public getGitHubAuthUrl(): string {
    return apiService.getGitHubAuthUrl();
  }

  public getGoogleAuthUrl(): string {
    return apiService.getGoogleAuthUrl();
  }

  // Helpers privés
  private navigateToMenu(): void {
    // Utiliser le router pour naviguer
    import('../app/Router').then(({ router }) => {
      router.navigate('/menu');
    });
  }

  private navigateToHome(): void {
    import('../app/Router').then(({ router }) => {
      router.navigate('/');
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // Méthodes utilitaires pour les composants
  public getCurrentUser(): User | null {
    return appState.getState().user;
  }

  public isAuthenticated(): boolean {
    return appState.getState().isAuthenticated;
  }

  public isLoading(): boolean {
    return appState.getState().loading;
  }

  // Subscribe aux changements d'auth (pour les composants)
  public subscribeToAuth(callback: (state: { user: User | null; isAuthenticated: boolean; loading: boolean }) => void): () => void {
    return appState.subscribe(state => {
      callback({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading
      });
    });
  }

  // Auth state change callbacks for RouteGuard
  public onAuthStateChange(callback: (isAuthenticated: boolean) => void): () => void {
    this.authStateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  private notifyAuthStateChange(isAuthenticated: boolean): void {
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(isAuthenticated);
      } catch (error) {
        console.error('Error in auth state change callback:', error);
      }
    });
  }
}

// Export singleton - use getInstance
export const authManager = AuthManager.getInstance();