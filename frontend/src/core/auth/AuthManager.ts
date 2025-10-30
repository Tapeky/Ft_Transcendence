import { appState } from '../state/AppState';
import { apiService, LoginCredentials, RegisterCredentials, User } from '../../shared/services/api';
import { router } from '../app/Router';
import { chatService } from '../../features/friends/services/ChatService';

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
      if (apiService.isAuthenticated()) {
        const currentUser = await apiService.getCurrentUser();

        appState.setState({
          user: currentUser,
          isAuthenticated: true,
          loading: false,
        });
        this.notifyAuthStateChange(true);

        this.connectChatService();
      } else {
        appState.setState({
          user: null,
          isAuthenticated: false,
          loading: false,
        });

        this.notifyAuthStateChange(false);
      }
    } catch (error) {
      console.error('AuthManager user info retrieval error:', this.getErrorMessage(error));

      apiService.clearToken();
      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });

      this.notifyAuthStateChange(false);
    }
  }

  public async login(credentials: LoginCredentials): Promise<void> {
    appState.setLoading(true);

    try {
      const authResponse = await apiService.login(credentials);

      appState.setState({
        user: authResponse.user,
        isAuthenticated: true,
        loading: false,
      });

      this.notifyAuthStateChange(true);
      this.navigateToHome();

      this.connectChatService();
    } catch (error) {
      appState.setLoading(false);
      const errorMessage = this.getErrorMessage(error);

      const isUserError =
        errorMessage.includes('Wrong') ||
        errorMessage.includes('password') ||
        errorMessage.includes('email') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('incorrect');

      if (!isUserError) {
        console.error('AuthManager unexpected login error:', errorMessage);
      }

      throw new Error(errorMessage);
    }
  }

  public async register(credentials: RegisterCredentials): Promise<void> {
    appState.setLoading(true);

    try {
      const authResponse = await apiService.register(credentials);

      appState.setState({
        user: authResponse.user,
        isAuthenticated: true,
        loading: false,
      });

      this.notifyAuthStateChange(true);
      this.navigateToHome();

      this.connectChatService();
    } catch (error) {
      appState.setLoading(false);
      const errorMessage = this.getErrorMessage(error);

      const isValidationError =
        errorMessage.includes('déjà pris') ||
        errorMessage.includes('déjà utilisé') ||
        errorMessage.includes('existe déjà') ||
        errorMessage.includes('invalide') ||
        errorMessage.includes('incorrect');

      if (!isValidationError) {
        console.error('AuthManager unexpected registration error:', errorMessage);
      }

      throw new Error(errorMessage);
    }
  }

  public async logout(): Promise<void> {
    appState.setLoading(true);

    try {
      await apiService.logout();

      chatService.disconnect();

      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });

      this.notifyAuthStateChange(false);
      this.navigateToHome();
    } catch (error) {
      console.error('AuthManager logout error:', this.getErrorMessage(error));

      chatService.disconnect();

      appState.setState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });

      this.notifyAuthStateChange(false);
      this.navigateToHome();
    }
  }

  public async refreshUser(): Promise<void> {
    try {
      const currentUser = await apiService.getCurrentUser();
      appState.setState({ user: currentUser });
    } catch (error) {
      console.error('AuthManager user refresh error:', this.getErrorMessage(error));
    }
  }

  public async getGitHubAuthUrl(): Promise<string> {
    return await apiService.getGitHubAuthUrl();
  }
  public async getGoogleAuthUrl(): Promise<string> {
    return await apiService.getGoogleAuthUrl();
  }

  private navigateToHome(): void {
    router.navigate('/');
  }

  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  public getCurrentUser(): User | null {
    return appState.getState().user;
  }
  public isAuthenticated(): boolean {
    return appState.getState().isAuthenticated;
  }
  public isLoading(): boolean {
    return appState.getState().loading;
  }

  public clearUser(): void {
   appState.setState({
    user: null,
    isAuthenticated: false,
    loading: false,
  });
  chatService.disconnect();
  apiService.clearToken();
}

  public subscribeToAuth(
    callback: (state: { user: User | null; isAuthenticated: boolean; loading: boolean }) => void
  ): () => void {
    return appState.subscribe(state => {
      callback({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
      });
    });
  }

  public onAuthStateChange(callback: (isAuthenticated: boolean) => void): () => void {
    this.authStateCallbacks.push(callback);
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

  private async connectChatService(): Promise<void> {
    try {
      await chatService.connect();

      (window as any).chatService = chatService;
    } catch (error) {
      console.error('[AuthManager] Erreur lors de la connexion du ChatService:', error);
    }
  }
}


export const authManager = AuthManager.getInstance();
