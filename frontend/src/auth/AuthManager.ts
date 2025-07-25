import { appState } from '../state/AppState';
import { apiService, LoginCredentials, RegisterCredentials, User } from '../services/api';

// AuthManager - Bridge entre l'API existante et notre AppState
// Remplace AuthContext.tsx en gardant EXACTEMENT la même logique

export class AuthManager {
  constructor() {
    this.initializeAuth();
    console.log('🔐 AuthManager: Initialized');
  }

  private async initializeAuth(): Promise<void> {
    console.log('🔐 AuthManager: Starting initialization...');
    appState.setLoading(true);

    try {
      // Étape 1: Gérer callback OAuth (GitHub/Google)
      const callbackToken = apiService.handleAuthCallback();
      if (callbackToken) {
        console.log('🔐 AuthManager: Token reçu depuis callback OAuth');
      }
    } catch (error) {
      console.error('🔐 AuthManager: Erreur callback OAuth:', this.getErrorMessage(error));
    }

    try {
      // Étape 2: Vérifier si déjà authentifié
      if (apiService.isAuthenticated()) {
        console.log('🔐 AuthManager: Token trouvé, récupération des infos utilisateur...');
        const currentUser = await apiService.getCurrentUser();
        
        // Mettre à jour AppState au lieu de React state
        appState.setState({
          user: currentUser,
          isAuthenticated: true,
          loading: false
        });
        
        console.log('✅ AuthManager: Utilisateur authentifié:', currentUser.username);
      } else {
        // Pas de token valide
        appState.setState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
        console.log('ℹ️ AuthManager: Aucun token valide trouvé');
      }
    } catch (error) {
      console.error('🔐 AuthManager: Erreur lors de la récupération des infos utilisateur:', this.getErrorMessage(error));
      
      // Nettoyer token invalide
      apiService.clearToken();
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    }
  }

  // Login - EXACTEMENT la même logique que AuthContext
  public async login(credentials: LoginCredentials): Promise<void> {
    console.log('🔐 AuthManager: Tentative de connexion pour:', credentials.email);
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
      
      console.log('✅ AuthManager: Connexion réussie:', authResponse.user.username);
      
      // Navigation automatique vers menu (comme dans AuthContext)
      this.navigateToMenu();
      
    } catch (error) {
      appState.setLoading(false);
      const errorMessage = this.getErrorMessage(error);
      console.error('❌ AuthManager: Échec de connexion:', errorMessage);
      
      // Re-throw pour que le formulaire puisse afficher l'erreur
      throw new Error(errorMessage);
    }
  }

  // Register - EXACTEMENT la même logique que AuthContext  
  public async register(credentials: RegisterCredentials): Promise<void> {
    console.log('🔐 AuthManager: Tentative d\'inscription pour:', credentials.username);
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
      
      console.log('✅ AuthManager: Inscription réussie:', authResponse.user.username);
      
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
        console.error('❌ AuthManager: Erreur inscription inattendue:', errorMessage);
      }
      
      // Re-throw pour que le formulaire puisse afficher l'erreur
      throw new Error(errorMessage);
    }
  }

  // Logout - EXACTEMENT la même logique que AuthContext
  public async logout(): Promise<void> {
    console.log('🔐 AuthManager: Déconnexion...');
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
      
      console.log('✅ AuthManager: Déconnexion réussie');
      
      // Navigation vers page d'accueil
      this.navigateToHome();
      
    } catch (error) {
      console.error('❌ AuthManager: Erreur lors de la déconnexion:', this.getErrorMessage(error));
      
      // Même si l'API échoue, on déconnecte côté client
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      
      this.navigateToHome();
    }
  }

  // Refresh user data
  public async refreshUser(): Promise<void> {
    try {
      const currentUser = await apiService.getCurrentUser();
      appState.setState({ user: currentUser });
      console.log('✅ AuthManager: Informations utilisateur mises à jour');
    } catch (error) {
      console.error('❌ AuthManager: Erreur lors de la mise à jour des infos utilisateur:', this.getErrorMessage(error));
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
    import('../router').then(({ router }) => {
      router.navigate('/menu');
    });
  }

  private navigateToHome(): void {
    import('../router').then(({ router }) => {
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
}

// Export singleton
export const authManager = new AuthManager();

// Export pour testing
export const createAuthManager = () => new AuthManager();