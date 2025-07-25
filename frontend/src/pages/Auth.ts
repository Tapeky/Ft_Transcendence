import { authManager } from '../auth/AuthManager';
import { appState } from '../state/AppState';

// AuthPage - Page d'authentification principale
// Remplace AuthPage.tsx en gardant la même UX

export class AuthPage {
  private element: HTMLElement;
  private currentTab: 'login' | 'register' = 'login';
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToAuth();
    
    console.log('🔐 AuthPage: Initialized');
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
        
        <!-- Loading Overlay -->
        <div id="loading-overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden">
          <div class="flex items-center justify-center min-h-screen">
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center">
              <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p class="text-white font-medium">Authentification en cours...</p>
            </div>
          </div>
        </div>

        <!-- Main Auth Container -->
        <div class="w-full max-w-md">
          
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-4xl font-iceland font-bold text-white mb-2">
              ft_transcendence
            </h1>
            <p class="text-gray-300 text-lg">
              Vanilla TypeScript - Phase 4
            </p>
          </div>

          <!-- Auth Card -->
          <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
            
            <!-- Tab Navigation -->
            <div class="flex border-b border-white/20">
              <button id="login-tab" class="flex-1 py-4 px-6 text-center font-medium transition-all duration-200 tab-button active">
                <span class="text-white">Connexion</span>
              </button>
              <button id="register-tab" class="flex-1 py-4 px-6 text-center font-medium transition-all duration-200 tab-button">
                <span class="text-gray-400">Inscription</span>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="p-6">
              
              <!-- Error Display -->
              <div id="error-display" class="hidden mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span id="error-message" class="text-red-400 text-sm"></span>
                </div>
              </div>

              <!-- Login Form -->
              <div id="login-form" class="auth-form active">
                <form id="login-form-element" class="space-y-4">
                  
                  <div class="space-y-2">
                    <label for="login-email" class="block text-sm font-medium text-gray-300">
                      Adresse e-mail
                    </label>
                    <input 
                      type="email" 
                      id="login-email" 
                      name="email"
                      required
                      class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div class="space-y-2">
                    <label for="login-password" class="block text-sm font-medium text-gray-300">
                      Mot de passe
                    </label>
                    <div class="relative">
                      <input 
                        type="password" 
                        id="login-password" 
                        name="password"
                        required
                        class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" id="login-toggle-password" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                        <svg id="login-eye-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        <svg id="login-eye-closed" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    id="login-submit"
                    class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <span id="login-submit-text">Se connecter</span>
                    <div id="login-submit-spinner" class="hidden ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </button>

                </form>
              </div>

              <!-- Register Form -->
              <div id="register-form" class="auth-form hidden">
                <form id="register-form-element" class="space-y-4">
                  
                  <div class="space-y-2">
                    <label for="register-username" class="block text-sm font-medium text-gray-300">
                      Nom d'utilisateur
                    </label>
                    <input 
                      type="text" 
                      id="register-username" 
                      name="username"
                      required
                      minlength="3"
                      maxlength="20"
                      class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="username"
                    />
                  </div>

                  <div class="space-y-2">
                    <label for="register-email" class="block text-sm font-medium text-gray-300">
                      Adresse e-mail
                    </label>
                    <input 
                      type="email" 
                      id="register-email" 
                      name="email"
                      required
                      class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div class="space-y-2">
                    <label for="register-password" class="block text-sm font-medium text-gray-300">
                      Mot de passe
                    </label>
                    <div class="relative">
                      <input 
                        type="password" 
                        id="register-password" 
                        name="password"
                        required
                        minlength="6"
                        class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" id="register-toggle-password" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                        <svg id="register-eye-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        <svg id="register-eye-closed" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label for="register-display-name" class="block text-sm font-medium text-gray-300">
                      Nom d'affichage <span class="text-gray-500">(optionnel)</span>
                    </label>
                    <input 
                      type="text" 
                      id="register-display-name" 
                      name="display_name"
                      maxlength="30"
                      class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Nom d'affichage"
                    />
                  </div>

                  <div class="flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      id="register-consent" 
                      name="data_consent"
                      required
                      class="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label for="register-consent" class="text-sm text-gray-300 leading-relaxed">
                      J'accepte le traitement de mes données personnelles selon la politique de confidentialité
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    id="register-submit"
                    class="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    <span id="register-submit-text">S'inscrire</span>
                    <div id="register-submit-spinner" class="hidden ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </button>

                </form>
              </div>

              <!-- OAuth Section -->
              <div class="mt-6 pt-6 border-t border-white/20">
                <p class="text-center text-gray-400 text-sm mb-4">Ou continuez avec</p>
                
                <div class="grid grid-cols-2 gap-3">
                  <button 
                    id="github-auth" 
                    class="flex items-center justify-center px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                  >
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                  </button>
                  
                  <button 
                    id="google-auth" 
                    class="flex items-center justify-center px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg transition-all duration-200"
                  >
                    <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Footer -->
          <div class="text-center mt-6">
            <p class="text-gray-400 text-sm">
              Phase 4: Authentication System with AuthManager
            </p>
          </div>

        </div>
      </div>

      <style>
        .tab-button.active {
          background: rgba(59, 130, 246, 0.2);
          border-bottom: 2px solid #3b82f6;
        }
        .tab-button.active span {
          color: white;
        }
        .auth-form {
          transition: all 0.3s ease-in-out;
        }
        .auth-form.hidden {
          display: none;
        }
        .auth-form.active {
          display: block;
        }
      </style>
    `;
    return div.firstElementChild as HTMLElement;
  }

  private bindEvents(): void {
    // Tab switching
    const loginTab = this.element.querySelector('#login-tab');
    const registerTab = this.element.querySelector('#register-tab');

    loginTab?.addEventListener('click', () => this.switchTab('login'));
    registerTab?.addEventListener('click', () => this.switchTab('register'));

    // Form submissions
    const loginForm = this.element.querySelector('#login-form-element');
    const registerForm = this.element.querySelector('#register-form-element');

    loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    registerForm?.addEventListener('submit', (e) => this.handleRegister(e));

    // Password toggles
    this.setupPasswordToggle('login');
    this.setupPasswordToggle('register');

    // OAuth buttons
    const githubBtn = this.element.querySelector('#github-auth');
    const googleBtn = this.element.querySelector('#google-auth');

    githubBtn?.addEventListener('click', () => this.handleGitHubAuth());
    googleBtn?.addEventListener('click', () => this.handleGoogleAuth());

    console.log('🔐 AuthPage: Event listeners bound');
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      this.updateLoadingState(authState.loading);
      
      // Si déjà connecté, rediriger vers menu
      if (authState.isAuthenticated && authState.user) {
        console.log('🔐 AuthPage: User already authenticated, redirecting...');
        import('../router').then(({ router }) => {
          router.navigate('/menu');
        });
      }
    });
  }

  private switchTab(tab: 'login' | 'register'): void {
    this.currentTab = tab;
    
    // Update tab buttons
    const loginTab = this.element.querySelector('#login-tab');
    const registerTab = this.element.querySelector('#register-tab');
    const loginForm = this.element.querySelector('#login-form');
    const registerForm = this.element.querySelector('#register-form');

    // Clear any existing error
    this.hideError();

    if (tab === 'login') {
      loginTab?.classList.add('active');
      registerTab?.classList.remove('active');
      loginForm?.classList.remove('hidden');
      loginForm?.classList.add('active');
      registerForm?.classList.remove('active');
      registerForm?.classList.add('hidden');
    } else {
      registerTab?.classList.add('active');
      loginTab?.classList.remove('active');
      registerForm?.classList.remove('hidden');
      registerForm?.classList.add('active');
      loginForm?.classList.remove('active');
      loginForm?.classList.add('hidden');
    }

    console.log(`🔐 AuthPage: Switched to ${tab} tab`);
  }

  private setupPasswordToggle(formType: 'login' | 'register'): void {
    const toggleBtn = this.element.querySelector(`#${formType}-toggle-password`);
    const passwordInput = this.element.querySelector(`#${formType}-password`) as HTMLInputElement;
    const eyeOpen = this.element.querySelector(`#${formType}-eye-open`);
    const eyeClosed = this.element.querySelector(`#${formType}-eye-closed`);

    toggleBtn?.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      if (isPassword) {
        eyeOpen?.classList.add('hidden');
        eyeClosed?.classList.remove('hidden');
      } else {
        eyeOpen?.classList.remove('hidden');
        eyeClosed?.classList.add('hidden');
      }
    });
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    console.log('🔐 AuthPage: Login form submitted');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const credentials = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    };

    if (!credentials.email || !credentials.password) {
      this.showError('Veuillez remplir tous les champs');
      return;
    }

    this.setSubmitLoading('login', true);
    this.hideError();

    try {
      await authManager.login(credentials);
      console.log('✅ AuthPage: Login successful');
      // AuthManager will handle navigation
    } catch (error) {
      console.error('❌ AuthPage: Login failed:', error);
      this.showError(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      this.setSubmitLoading('login', false);
    }
  }

  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();
    console.log('🔐 AuthPage: Register form submitted');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const credentials = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      display_name: formData.get('display_name') as string || undefined,
      data_consent: formData.get('data_consent') === 'on'
    };

    if (!credentials.username || !credentials.email || !credentials.password) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!credentials.data_consent) {
      this.showError('Vous devez accepter le traitement des données personnelles');
      return;
    }

    this.setSubmitLoading('register', true);
    this.hideError();

    try {
      await authManager.register(credentials);
      console.log('✅ AuthPage: Registration successful');
      // AuthManager will handle navigation
    } catch (error) {
      console.error('❌ AuthPage: Registration failed:', error);
      this.showError(error instanceof Error ? error.message : 'Erreur d\'inscription');
    } finally {
      this.setSubmitLoading('register', false);
    }
  }

  private handleGitHubAuth(): void {
    console.log('🔐 AuthPage: GitHub auth initiated');
    const githubUrl = authManager.getGitHubAuthUrl();
    window.location.href = githubUrl;
  }

  private handleGoogleAuth(): void {
    console.log('🔐 AuthPage: Google auth initiated');
    const googleUrl = authManager.getGoogleAuthUrl();
    window.location.href = googleUrl;
  }

  private showError(message: string): void {
    const errorDisplay = this.element.querySelector('#error-display');
    const errorMessage = this.element.querySelector('#error-message');
    
    if (errorDisplay && errorMessage) {
      errorMessage.textContent = message;
      errorDisplay.classList.remove('hidden');
    }
  }

  private hideError(): void {
    const errorDisplay = this.element.querySelector('#error-display');
    errorDisplay?.classList.add('hidden');
  }

  private setSubmitLoading(formType: 'login' | 'register', loading: boolean): void {
    const submitBtn = this.element.querySelector(`#${formType}-submit`) as HTMLButtonElement;
    const submitText = this.element.querySelector(`#${formType}-submit-text`);
    const submitSpinner = this.element.querySelector(`#${formType}-submit-spinner`);

    if (submitBtn && submitText && submitSpinner) {
      submitBtn.disabled = loading;
      
      if (loading) {
        submitText.textContent = formType === 'login' ? 'Connexion...' : 'Inscription...';
        submitSpinner.classList.remove('hidden');
      } else {
        submitText.textContent = formType === 'login' ? 'Se connecter' : 'S\'inscrire';
        submitSpinner.classList.add('hidden');
      }
    }
  }

  private updateLoadingState(loading: boolean): void {
    const loadingOverlay = this.element.querySelector('#loading-overlay');
    
    if (loading) {
      loadingOverlay?.classList.remove('hidden');
    } else {
      loadingOverlay?.classList.add('hidden');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    
    console.log('🔐 AuthPage: Destroyed');
    this.element.remove();
  }
}