import { apiService, User, LoginCredentials, RegisterCredentials } from './src/services/api';

type Listener = (user: User | null, loading: boolean) => void;

class Auth {
  private user: User | null = null;
  private loading = true;
  private listeners: Listener[] = [];
  private heartbeatInterval: number | null = null;

  constructor() {
    this.initAuth();
    this.setupEvents();
  }

  private notify() {
    this.listeners.forEach((l) => l(this.user, this.loading));
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: Listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private async initAuth() {
    try {
      const callbackToken = apiService.handleAuthCallback();
      if (callbackToken) {
        console.log('Token reçu depuis callback GitHub');
      }
    } catch (e) {
      console.error('Erreur callback GitHub:', e);
    }

    if (apiService.isAuthenticated()) {
      try {
        this.user = await apiService.getCurrentUser();
        console.log('Token trouvé, récupération des infos utilisateur...');
      } catch (e) {
        console.error('Erreur récupération utilisateur:', e);
        apiService.clearToken();
        this.user = null;
      }
    }
    this.loading = false;
    this.notify();

    if (this.user) {
      this.startHeartbeat();
    }
  }

  private setupEvents() {
    window.addEventListener('beforeunload', () => {
      if (this.user) {
        const data = JSON.stringify({});
        const token = localStorage.getItem('auth_token');
        if (token) {
          navigator.sendBeacon(`https://localhost:8000/api/auth/logout`, data);
        }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.user) {
        setTimeout(async () => {
          if (document.hidden) {
            try {
              await apiService.logout();
              this.user = null;
              this.notify();
            } catch (e) {
              console.error('Erreur auto-logout:', e);
            }
          }
        }, 5 * 60 * 1000);
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(async () => {
      try {
        await apiService.heartbeat();
      } catch (e) {
        console.error('Erreur heartbeat:', e);
        if (e instanceof Error && e.message.includes('401')) {
          apiService.clearToken();
          this.user = null;
          this.notify();
        }
      }
    }, 60000);
  }

  async login(credentials: LoginCredentials) {
    this.loading = true;
    this.notify();
    try {
      const authResponse = await apiService.login(credentials);
      this.user = authResponse.user;
    } catch (e) {
      console.error('Login failed:', e);
      throw e;
    } finally {
      this.loading = false;
      this.notify();
      if (this.user) this.startHeartbeat();
    }
  }

  async register(credentials: RegisterCredentials) {
    this.loading = true;
    this.notify();
    try {
      const authResponse = await apiService.register(credentials);
      this.user = authResponse.user;
      console.log('Inscription réussie, utilisateur:', authResponse.user);
    } catch (e) {
      console.error('Erreur lors de l\'inscription:', e);
      throw e;
    } finally {
      this.loading = false;
      this.notify();
      if (this.user) this.startHeartbeat();
    }
  }

  async logout() {
    this.loading = true;
    this.notify();
    try {
      await apiService.logout();
      this.user = null;
      console.log('Déconnexion réussie');
    } catch (e) {
      console.error('Erreur lors de la déconnexion:', e);
      this.user = null;
    } finally {
      this.loading = false;
      this.notify();
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    }
  }

  async refreshUser() {
    try {
      this.user = await apiService.getCurrentUser();
      console.log('Informations utilisateur mises à jour');
      this.notify();
    } catch (e) {
      console.error('Erreur lors de la mise à jour des infos utilisateur:', e);
    }
  }

  getUser() {
    return this.user;
  }

  isLoading() {
    return this.loading;
  }

  isAuthenticated() {
    return !!this.user;
  }
}

export const auth = new Auth();