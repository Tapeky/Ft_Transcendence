import { authManager } from '../../../core/auth/AuthManager';
import { Header } from '../../../shared/components/Header';

export class AuthPage {
  private element: HTMLElement;
  private currentMode: 'login' | 'register' = 'login';
  private isTransitioning = false;
  private authUnsubscribe?: () => void;
  private ripples: { x: number; y: number; id: number }[] = [];
  private header?: Header;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToAuth();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland';

    this.header = new Header(false);

    div.appendChild(this.header.getElement());
    const content = document.createElement("div");
    content.className = 'flex flex-col flex-grow min-h-full'
    content.innerHTML = `
      <div id="loading-overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden">
        <div class="flex items-center justify-center min-h-screen">
          <div class="bg-white/90 backdrop-blur-md rounded-xl p-8 text-center shadow-2xl">
            <div class="animate-spin w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full mx-auto mb-4">
            </div>
            <p class="text-gray-900 font-medium">Authenticating...</p>
          </div>
        </div>
      </div>

      <div class="flex flex-grow items-center justify-center p-4 bg-gradient-to-t from-purple-900 to-blue-900">
 
        <div class="flex-1 flex flex-col justify-center items-center text-white">
          jsp quoi mettre ici
          <img class='border-2 border-white h-[600px] w-[400px]' src='/src/img/night.jpg'>
        </div>
        
        <div class="flex flex-grow flex-col items-center justify-center p-2 flex-1 backdrop-blur-md bg-white/10 rounded-md pb-6">

          <h2 id="auth-title" class="text-[5rem] font-bold text-white text-center mb-2">
            Welcome !
          </h2>
          
          <div class="w-full px-10 flex-grow">

            <div id="form-container" class="transition-all duration-100">
              
              <div id="error-display" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <span id="error-message"></span>
              </div>

              <form id="login-form" class="space-y-6 auth-form active text-[1.5rem]">
                <div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="login-email" class="floating-label text-white">
                    Email
                  </label>
                </div>

                <div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    autocomplete="current-password"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="login-password" class="floating-label text-white">
                    Password
                  </label>
                </div>

                <button 
                  type="submit" 
                  id="login-submit"
                  class="premium-button relative w-full py-3 px-4 rounded-lg duration-100 bg-blue-700 text-white hover:bg-blue-600 cursor-pointer"
                >
                  <span class="relative z-10 flex items-center justify-center">
                    <span id="login-submit-text">Sign in</span>
                    <div id="login-submit-spinner" class="hidden ml-2 w-5 h-5 animate-spin">
                      <svg viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </span>
                </button>

                <div class="relative flex flex-row min-h-10">
                  <div class="flex-1">
                    <div class="border-b-2 border-white h-1/3"></div>
                  </div>
                  <div class="flex-1 text-[1.2rem] text-white text-center">
                    <span class="px-2">Or sign in with</span>
                  </div>
                  <div class="flex-1">
                    <div class="border-b-2 border-white h-1/3"></div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  
                  <button
                    type="button"
                    id="google-auth"
                    class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-100 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                  >
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity duration-100"></div>
                    <svg class="w-5 h-5 relative z-10 transition-transform duration-100 group-hover:scale-110" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-100 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                  >
                    <div class="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-100"></div>
                    <svg class="w-5 h-5 relative z-10 transition-all duration-100 group-hover:scale-110 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    id="github-auth"
                    class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-100 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                  >
                    <div class="absolute inset-0 bg-gray-900 opacity-0 group-hover:opacity-10 transition-opacity duration-100"></div>
                    <svg class="w-5 h-5 relative z-10 transition-all duration-100 group-hover:scale-110 group-hover:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </button>

                </div>

              </form>

              <form id="register-form" class="space-y-3 auth-form text-[1.5rem] hidden">
                
                <div>
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    required
                    minlength="3"
                    maxlength="20"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="register-username" class="floating-label text-white">
                    Username
                  </label>
                </div>

                <div>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="register-email" class="floating-label text-white">
                    Email
                  </label>
                </div>

                <div>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    minlength="6"
                    autocomplete="new-password"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="register-password" class="floating-label text-white">
                    Password
                  </label>
                </div>

                <div>
                  <input
                    id="register-display-name"
                    name="display_name"
                    type="text"
                    maxlength="30"
                    placeholder=""
                    class="peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <label for="register-display-name" class="floating-label text-white">
                    Display Name <span class='text-blue-300'> (optional) </span>
                  </label>
                </div>

                <div class="flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id="register-consent" 
                    name="data_consent"
                    required
                    class="mt-1 w-4 h-4 text-gray-900 bg-white border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                  />
                  <label for="register-consent" class="text-white text-[1rem]">
                    I accept the processing of my personal data according to the privacy policy
                  </label>
                </div>

                <button 
                  type="submit" 
                  id="register-submit"
                  class="premium-button relative w-full py-3 px-4 rounded-lg font-medium overflow-hidden duration-100 bg-blue-700 text-white hover:bg-blue-600 cursor-pointer"
                >
                  <span class="relative z-10 flex items-center justify-center">
                    <span id="register-submit-text">Sign Up</span>
                    <div id="register-submit-spinner" class="hidden ml-2 w-5 h-5 animate-spin">
                      <svg viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </span>
                </button>

              </form>
            </div>
          </div>
        </div>

        <div class="flex-1 pt-20 self-start">
          <div class='text-[2rem] text-white flex flex-col justify-center items-center backdrop-blur-md bg-white/10 rounded-md py-6 mx-20' id='register-btn'>
            First time ?
            <button
              type="button"
              id="switch-to-register"
              class="hover:scale-110 duration-100 bg-blue-700 p-4 w-1/2 rounded-lg hover:bg-blue-600 cursor-pointer"
            >
              Register here !
            </button>
          </div>

          <div class='text-[2rem] text-white flex-col justify-center items-center backdrop-blur-md bg-white/10 rounded-md py-6 mx-20 hidden' id='login-btn'>
            Already have an account ?
            <button
              type="button"
              id="switch-to-login"
              class="hover:scale-110 duration-100 bg-blue-700 p-4 w-1/2 rounded-lg hover:bg-blue-600 cursor-pointer"
            >
              Log in here !
            </button>
          </div>
        </div>

      </div>
      `;
    div.appendChild(content);
    return div as HTMLElement;
  }

  private bindEvents(): void {
    const switchToRegister = this.element.querySelector('#switch-to-register');
    const switchToLogin = this.element.querySelector('#switch-to-login');

    switchToRegister?.addEventListener('click', () => this.switchMode('register'));
    switchToLogin?.addEventListener('click', () => this.switchMode('login'));

    const loginForm = this.element.querySelector('#login-form');
    const registerForm = this.element.querySelector('#register-form');

    loginForm?.addEventListener('submit', e => this.handleLogin(e));
    registerForm?.addEventListener('submit', e => this.handleRegister(e));

    this.setupPremiumButtons();

    const githubBtn = this.element.querySelector('#github-auth');
    const googleBtn = this.element.querySelector('#google-auth');

    githubBtn?.addEventListener('click', () => this.handleGitHubAuth());
    googleBtn?.addEventListener('click', () => this.handleGoogleAuth());
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth(authState => {
      this.updateLoadingState(authState.loading);

      if (authState.isAuthenticated && authState.user) {
        import('../../../core/app/Router').then(({ router }) => {
          router.navigate('/');
        });
      }
    });
  }

  private switchMode(newMode: 'login' | 'register'): void {
    this.isTransitioning = true;
    const formContainer = this.element.querySelector('#form-container');

    if (formContainer) {
      formContainer.classList.add('opacity-0', 'scale-95');
    }

    setTimeout(() => {
      this.currentMode = newMode;
      this.updateModeDisplay();
      this.isTransitioning = false;

      if (formContainer) {
        formContainer.classList.remove('opacity-0', 'scale-95');
        formContainer.classList.add('opacity-100', 'scale-100');
      }
    }, 150);
  }

  private updateModeDisplay(): void {
    const authConfig = {
      login: {
        title: 'Welcome !'
      },
      register: {
        title: 'Join us !'
      },
    };

    const title = this.element.querySelector('#auth-title');

    if (title) title.textContent = authConfig[this.currentMode].title;

    const loginForm = this.element.querySelector('#login-form');
    const registerForm = this.element.querySelector('#register-form');
    const registerBtn = this.element.querySelector('#register-btn');
    const loginBtn = this.element.querySelector('#login-btn');

    this.hideError();

    if (this.currentMode === 'login') {
      loginForm?.classList.remove('hidden');
      loginForm?.classList.add('active');
      registerForm?.classList.add('hidden');
      registerForm?.classList.remove('active');
      registerBtn?.classList.replace('hidden', 'flex');
      loginBtn?.classList.replace('flex', 'hidden');
    } else {
      registerForm?.classList.remove('hidden');
      registerForm?.classList.add('active');
      loginForm?.classList.add('hidden');
      loginForm?.classList.remove('active');
      loginBtn?.classList.replace('hidden', 'flex');
      registerBtn?.classList.replace('flex', 'hidden');
    }
  }


  private setupPremiumButtons(): void {
    const premiumButtons = this.element.querySelectorAll('.premium-button');

    premiumButtons.forEach(button => {
      const buttonElement = button as HTMLButtonElement;

      buttonElement.addEventListener('mousemove', e => {
        if (buttonElement.disabled) return;

        const rect = buttonElement.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = rect.width / 2;

        if (distance < maxDistance) {
          const translateX = (x / maxDistance) * 3;
          const translateY = (y / maxDistance) * 3;
          buttonElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(1.02)`;
        }
      });

      buttonElement.addEventListener('mouseleave', () => {
        buttonElement.style.transform = 'translate(0, 0) scale(1)';
      });

      buttonElement.addEventListener('click', e => {
        if (buttonElement.disabled) return;

        const rect = buttonElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        this.ripples.push({ x, y, id });

        const ripple = document.createElement('span');
        ripple.className = 'absolute bg-white/30 rounded-full pointer-events-none animate-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.transform = 'translate(-50%, -50%)';

        buttonElement.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
          this.ripples = this.ripples.filter(r => r.id !== id);
        }, 600);
      });
    });
  }

  private async handleLogin(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const credentials = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    if (!credentials.email || !credentials.password) {
      this.showError('Please fill in all fields');
      return;
    }

    this.setSubmitLoading('login', true);
    this.hideError();

    try {
      await authManager.login(credentials);
      import('../../../core/app/Router').then(({ router }) => {
        router.navigate('/');
      });
    } catch (error) {
      console.error('❌ AuthPage: Login failed:', error);
      this.showError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      this.setSubmitLoading('login', false);
    }
  }

  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const credentials = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      display_name: (formData.get('display_name') as string) || undefined,
      data_consent: formData.get('data_consent') === 'on',
    };

    if (!credentials.username || !credentials.email || !credentials.password) {
      this.showError('Please fill in all required fields');
      return;
    }

    if (!credentials.data_consent) {
      this.showError('You must accept the data processing policy');
      return;
    }

    this.setSubmitLoading('register', true);
    this.hideError();

    try {
      await authManager.register(credentials);
      import('../../../core/app/Router').then(({ router }) => {
        router.navigate('/');
      });
    } catch (error) {
      console.error('❌ AuthPage: Registration failed:', error);
      this.showError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      this.setSubmitLoading('register', false);
    }
  }

  private async handleGitHubAuth(): Promise<void> {
    const githubUrl = await authManager.getGitHubAuthUrl();
    window.location.href = githubUrl;
  }

  private async handleGoogleAuth(): Promise<void> {
    const googleUrl = await authManager.getGoogleAuthUrl();
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
        submitText.textContent = formType === 'login' ? 'Signing in...' : 'Signing up...';
        submitSpinner.classList.remove('hidden');
      } else {
        submitText.textContent = formType === 'login' ? 'Sign In' : 'Sign Up';
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
    this.element.remove();
  }
}
