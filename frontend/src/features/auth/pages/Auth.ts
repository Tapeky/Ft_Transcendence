import { authManager } from '../../../core/auth/AuthManager';

export class AuthPage {
  private element: HTMLElement;
  private currentMode: 'login' | 'register' = 'login';
  private currentAnimation = 0;
  private animations = ['pong', 'tournament', 'chat'];
  private isTransitioning = false;
  private authUnsubscribe?: () => void;
  private animationInterval?: number;
  private ripples: { x: number; y: number; id: number }[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToAuth();
    this.startAnimationCarousel();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        
        <div id="loading-overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden">
          <div class="flex items-center justify-center min-h-screen">
            <div class="bg-white/90 backdrop-blur-md rounded-xl p-8 text-center shadow-2xl">
              <div class="animate-spin w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p class="text-gray-900 font-medium">Authentification en cours...</p>
            </div>
          </div>
        </div>

        <div class="flex w-full max-w-[1600px] h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          <div class="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
            <div class="max-w-md w-full space-y-1">
              
              <div class="text-center">
                <h2 id="auth-title" class="text-3xl font-bold text-gray-900 mb-2">
                  Welcome Back!
                </h2>
                <p id="auth-subtitle" class="text-gray-600 text-sm leading-relaxed">
                  Sign in to access your Pong account and compete with players worldwide.
                </p>
              </div>

              <div id="form-container" class="space-y-6 transition-all duration-300">
                
                <div id="error-display" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <span id="error-message"></span>
                </div>

                <form id="login-form" class="space-y-6 auth-form active">
                  
                  <div class="floating-input-container">
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      autocomplete="email"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="login-email" class="floating-label">
                      Email*
                    </label>
                  </div>

                  <div class="floating-input-container">
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      autocomplete="current-password"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="login-password" class="floating-label">
                      Password*
                    </label>
                  </div>

                  <div class="floating-input-container flex flex-col">
                    <input
                      id="totp-password"
                      name="totp-password"
                      onkeypress="return (event.charCode != 8 && event.charCode == 0 || (event.charCode >= 48 && event.charCode <= 57))"
                      minlength="6"
                      maxlength="6"
                      placeholder="XXXXXX"
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      style="width: 25%; text-align:center;"
                    />
                    <label for="totp-password" class="floating-label">
                      2FA Key
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    id="login-submit"
                    class="premium-button relative w-full py-3 px-4 rounded-lg font-medium overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900 hover:shadow-xl cursor-pointer"
                  >
                    <span class="relative z-10 flex items-center justify-center">
                      <span id="login-submit-text">Sign In</span>
                      <div id="login-submit-spinner" class="hidden ml-2 w-5 h-5 animate-spin">
                        <svg viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    </span>
                    <div class="absolute inset-0 -z-10">
                      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </div>
                  </button>

                  <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                      <div class="w-full border-t border-gray-300"></div>
                    </div>
                    <div class="relative flex justify-center text-sm">
                      <span class="px-2 bg-white text-gray-500">Or sign in with</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    
                    <button
                      type="button"
                      id="google-auth"
                      class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-300 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                    >
                      <div class="absolute inset-0 bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      <svg class="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <div class="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
                    </button>

                    <button
                      type="button"
                      class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-300 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                    >
                      <div class="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      <svg class="w-5 h-5 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <div class="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
                    </button>

                    <button
                      type="button"
                      id="github-auth"
                      class="oauth-button relative flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-all duration-300 overflow-hidden group hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                    >
                      <div class="absolute inset-0 bg-gray-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      <svg class="w-5 h-5 relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <div class="absolute inset-0 -top-20 -left-20 w-40 h-40 bg-white/20 rotate-45 translate-x-full group-hover:translate-x-[-250%] transition-transform duration-1000"></div>
                    </button>

                  </div>

                  <div class="text-center">
                    <p class="text-sm text-gray-600">
                      Don't have an account?
                      <button
                        type="button"
                        id="switch-to-register"
                        class="font-medium text-gray-900 hover:text-gray-700 transition duration-200 ml-1"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>

                </form>

                <form id="register-form" class="space-y-6 auth-form hidden">
                  
                  <div class="floating-input-container">
                    <input
                      id="register-username"
                      name="username"
                      type="text"
                      required
                      minlength="3"
                      maxlength="20"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="register-username" class="floating-label">
                      Username*
                    </label>
                  </div>

                  <div class="floating-input-container">
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      required
                      autocomplete="email"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="register-email" class="floating-label">
                      Email*
                    </label>
                  </div>

                  <div class="floating-input-container">
                    <input
                      id="register-password"
                      name="password"
                      type="password"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="register-password" class="floating-label">
                      Password*
                    </label>
                  </div>

                  <div class="floating-input-container">
                    <input
                      id="register-display-name"
                      name="display_name"
                      type="text"
                      maxlength="30"
                      placeholder=""
                      class="floating-input peer w-full px-3 pt-5 pb-2 border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <label for="register-display-name" class="floating-label">
                      Display Name
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
                    <label for="register-consent" class="text-sm text-gray-600 leading-relaxed">
                      I accept the processing of my personal data according to the privacy policy*
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    id="register-submit"
                    class="premium-button relative w-full py-3 px-4 rounded-lg font-medium overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900 hover:shadow-xl cursor-pointer"
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
                    <div class="absolute inset-0 -z-10">
                      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </div>
                  </button>

                  <div class="text-center">
                    <p class="text-sm text-gray-600">
                      Already have an account?
                      <button
                        type="button"
                        id="switch-to-login"
                        class="font-medium text-gray-900 hover:text-gray-700 transition duration-200 ml-1"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>

                </form>

              </div>

            </div>
          </div>

          <div class="hidden lg:flex lg:w-3/5 pl-6 pr-3 py-3 items-center justify-center">
            <div class="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
              
              <div id="animation-pong" class="animation-container active">
                ${this.createPongAnimation()}
              </div>

              <div id="animation-tournament" class="animation-container hidden">
                ${this.createTournamentAnimation()}
              </div>

              <div id="animation-chat" class="animation-container hidden">
                ${this.createChatAnimation()}
              </div>

              <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                <button class="carousel-indicator w-2 h-2 rounded-full transition-all duration-300 bg-white scale-125" data-index="0"></button>
                <button class="carousel-indicator w-2 h-2 rounded-full transition-all duration-300 bg-white/30 hover:bg-white/50" data-index="1"></button>
                <button class="carousel-indicator w-2 h-2 rounded-full transition-all duration-300 bg-white/30 hover:bg-white/50" data-index="2"></button>
              </div>

              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
              <div class="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl animate-float"></div>
              <div class="absolute bottom-20 left-20 w-24 h-24 bg-white/3 rounded-full blur-lg animate-float-delayed"></div>
              <div class="absolute top-1/2 left-1/3 w-20 h-20 bg-white/2 rounded-full blur-xl animate-float-slow"></div>
              
              <div class="absolute inset-0 opacity-5">
                <div class="h-full w-full" style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 50px 50px;"></div>
              </div>
              
            </div>
          </div>

        </div>
      </div>

      ${this.createAnimationStyles()}
    `;
    return div.firstElementChild as HTMLElement;
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

    this.setupFloatingInputs();

    this.setupPremiumButtons();

    const githubBtn = this.element.querySelector('#github-auth');
    const googleBtn = this.element.querySelector('#google-auth');

    githubBtn?.addEventListener('click', () => this.handleGitHubAuth());
    googleBtn?.addEventListener('click', () => this.handleGoogleAuth());

    const indicators = this.element.querySelectorAll('.carousel-indicator');
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.setAnimation(index));
    });
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth(authState => {
      this.updateLoadingState(authState.loading);

      if (authState.isAuthenticated && authState.user) {
        import('../../../core/app/Router').then(({ router }) => {
          router.navigate('/menu');
        });
      }
    });
  }

  private startAnimationCarousel(): void {
    this.animationInterval = window.setInterval(() => {
      this.currentAnimation = (this.currentAnimation + 1) % this.animations.length;
      this.updateAnimationDisplay();
    }, 15000);
  }

  private setAnimation(index: number): void {
    this.currentAnimation = index;
    this.updateAnimationDisplay();
  }

  private updateAnimationDisplay(): void {
    const containers = this.element.querySelectorAll('.animation-container');
    containers.forEach(container => {
      container.classList.add('hidden');
      container.classList.remove('active');
    });

    const currentContainer = this.element.querySelector(
      `#animation-${this.animations[this.currentAnimation]}`
    );
    if (currentContainer) {
      currentContainer.classList.remove('hidden');
      currentContainer.classList.add('active');
    }

    const indicators = this.element.querySelectorAll('.carousel-indicator');
    indicators.forEach((indicator, index) => {
      if (index === this.currentAnimation) {
        indicator.classList.add('bg-white', 'scale-125');
        indicator.classList.remove('bg-white/30');
      } else {
        indicator.classList.remove('bg-white', 'scale-125');
        indicator.classList.add('bg-white/30');
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
        title: 'Welcome Back!',
        subtitle: 'Sign in to access your Pong account and compete with players worldwide.',
      },
      register: {
        title: 'Join the Game!',
        subtitle: 'Create your account and start your journey in the legendary Pong universe.',
      },
    };

    const title = this.element.querySelector('#auth-title');
    const subtitle = this.element.querySelector('#auth-subtitle');

    if (title) title.textContent = authConfig[this.currentMode].title;
    if (subtitle) subtitle.textContent = authConfig[this.currentMode].subtitle;

    const loginForm = this.element.querySelector('#login-form');
    const registerForm = this.element.querySelector('#register-form');

    this.hideError();

    if (this.currentMode === 'login') {
      loginForm?.classList.remove('hidden');
      loginForm?.classList.add('active');
      registerForm?.classList.add('hidden');
      registerForm?.classList.remove('active');
    } else {
      registerForm?.classList.remove('hidden');
      registerForm?.classList.add('active');
      loginForm?.classList.add('hidden');
      loginForm?.classList.remove('active');
    }
  }

  private setupFloatingInputs(): void {
    const floatingInputs = this.element.querySelectorAll('.floating-input');

    floatingInputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      const label = this.element.querySelector(`label[for="${inputElement.id}"]`) as HTMLElement;

      const updateInput = () => {
        const hasValue = inputElement.value.length > 0;

        if (hasValue) {
          inputElement.classList.add('bg-white');
          inputElement.classList.remove('bg-transparent');
        } else {
          inputElement.classList.remove('bg-white');
          inputElement.classList.add('bg-transparent');
        }
      };

      inputElement.addEventListener('focus', updateInput);
      inputElement.addEventListener('blur', updateInput);
      inputElement.addEventListener('input', updateInput);

      updateInput();
    });
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
      totp_password: formData.get('totp-password') as string
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
        router.navigate('/menu');
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
        router.navigate('/menu');
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

  private createPongAnimation(): string {
    return `
      <div class="relative z-10 text-center text-white px-12 animate-fade-in">
        <div class="mb-8">
          <div class="w-80 h-48 mx-auto relative">
            <div class="w-full h-full border-2 border-white/20 rounded-lg relative backdrop-blur-sm bg-white/5 shadow-2xl overflow-hidden">
              <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2">
                <div class="w-full h-full bg-gradient-to-b from-transparent via-white/50 to-transparent animate-pulse"></div>
              </div>
              <div class="absolute left-2 w-1.5 h-12 bg-white/80 rounded-full shadow-lg animate-paddle-realistic-left">
                <div class="absolute inset-0 bg-white/50 blur-sm animate-pulse"></div>
              </div>
              <div class="absolute right-2 w-1.5 h-12 bg-white/80 rounded-full shadow-lg animate-paddle-realistic-right">
                <div class="absolute inset-0 bg-white/50 blur-sm animate-pulse"></div>
              </div>
              <div class="absolute w-2 h-2 animate-ball-realistic">
                <div class="relative">
                  <div class="absolute inset-0 bg-white rounded-full blur-md scale-150 opacity-50"></div>
                  <div class="relative w-2 h-2 bg-white rounded-full shadow-lg">
                    <div class="absolute inset-0 bg-white rounded-full animate-ping"></div>
                  </div>
                </div>
              </div>
              <div class="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 opacity-0 animate-collision-left">
                <div class="w-full h-full bg-white/60 rounded-full blur-md"></div>
              </div>
              <div class="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 opacity-0 animate-collision-right">
                <div class="w-full h-full bg-white/60 rounded-full blur-md"></div>
              </div>
              <div class="absolute top-4 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-score-flash"></div>
              <div class="absolute top-4 right-1/4 w-1 h-1 bg-white/40 rounded-full animate-score-flash" style="animation-delay: 3s"></div>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <h3 class="text-2xl font-bold">Master the Classic</h3>
          <p class="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
            Experience the legendary Pong game with modern multiplayer features, tournaments, and real-time competitions.
          </p>
        </div>
      </div>
    `;
  }

  private createTournamentAnimation(): string {
    return `
      <div class="relative z-10 text-center text-white px-12 animate-fade-in">
        <div class="mb-8">
          <div class="w-80 h-60 mx-auto relative">
            <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <div class="w-8 h-8 animate-tournament-trophy">
                <div class="text-2xl animate-float-slow">🏆</div>
                <div class="absolute inset-0 animate-tournament-confetti">
                  <div class="absolute -top-2 -left-1 w-1 h-1 bg-yellow-400 rounded-full animate-confetti-1"></div>
                  <div class="absolute -top-1 left-2 w-1 h-1 bg-blue-400 rounded-full animate-confetti-2"></div>
                  <div class="absolute -top-3 right-0 w-1 h-1 bg-red-400 rounded-full animate-confetti-3"></div>
                  <div class="absolute -top-2 right-3 w-1 h-1 bg-green-400 rounded-full animate-confetti-4"></div>
                  <div class="absolute -top-1 -right-1 w-1 h-1 bg-purple-400 rounded-full animate-confetti-5"></div>
                </div>
              </div>
            </div>
            <svg class="w-full h-full" viewBox="0 0 320 240" fill="none">
              <line x1="160" y1="20" x2="160" y2="40" class="stroke-white/30 stroke-1 animate-tournament-final" stroke-dasharray="2,2" />
              <line x1="120" y1="40" x2="160" y2="40" class="stroke-white/40 animate-tournament-semi-1" stroke-dasharray="2,2" />
              <line x1="200" y1="40" x2="160" y2="40" class="stroke-white/40 animate-tournament-semi-2" stroke-dasharray="2,2" />
              <circle cx="40" cy="120" r="3" class="fill-white/60 animate-tournament-player-1" />
              <circle cx="80" cy="120" r="3" class="fill-white/60 animate-tournament-player-2" />
              <circle cx="120" cy="120" r="3" class="fill-white/60 animate-tournament-player-3" />
              <circle cx="160" cy="120" r="3" class="fill-white/60 animate-tournament-player-4" />
              <circle cx="200" cy="120" r="3" class="fill-white/60 animate-tournament-player-5" />
              <circle cx="240" cy="120" r="3" class="fill-white/60 animate-tournament-player-6" />
              <circle cx="280" cy="120" r="3" class="fill-white/60 animate-tournament-player-7" />
              <line x1="120" y1="120" x2="120" y2="100" class="stroke-yellow-400/80 stroke-2 animate-tournament-winner-path-1" />
              <circle cx="120" cy="120" r="4" class="fill-yellow-400 animate-tournament-winner-glow" />
            </svg>
          </div>
        </div>
        <div class="space-y-4">
          <h3 class="text-2xl font-bold">Tournament Glory</h3>
          <p class="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
            Compete in thrilling tournaments, climb the brackets, and claim your victory with style and strategy.
          </p>
        </div>
      </div>
    `;
  }

  private createChatAnimation(): string {
    return `
      <div class="relative z-10 text-center text-white px-12 animate-fade-in">
        <div class="mb-8">
          <div class="w-80 h-60 mx-auto relative">
            <div class="w-full h-full relative">
              <div class="absolute inset-0">
                <div class="absolute top-8 left-4 animate-chat-message-1">
                  <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 bg-white/60 rounded-full"></div>
                    <div class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                      <div class="text-sm opacity-90">Ready to play?</div>
                    </div>
                  </div>
                </div>
                <div class="absolute top-20 right-6 animate-chat-message-2">
                  <div class="flex items-center space-x-3 justify-end">
                    <div class="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                      <div class="text-sm opacity-90">Let's go!</div>
                    </div>
                    <div class="w-2 h-2 bg-white/80 rounded-full"></div>
                  </div>
                </div>
                <div class="absolute top-32 left-1/2 transform -translate-x-1/2 animate-chat-message-3">
                  <div class="bg-white/8 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/15 text-center">
                    <div class="text-xs opacity-70 mb-1">Game Invitation</div>
                    <div class="text-sm opacity-90">Join Tournament</div>
                  </div>
                </div>
                <div class="absolute top-44 left-8 animate-chat-typing">
                  <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 bg-white/40 rounded-full"></div>
                    <div class="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                      <div class="flex space-x-1 items-center">
                        <div class="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-1"></div>
                        <div class="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-2"></div>
                        <div class="w-1 h-1 bg-white/60 rounded-full animate-chat-dot-3"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <svg class="absolute inset-0 w-full h-full" viewBox="0 0 320 240" fill="none">
                <line x1="20" y1="40" x2="160" y2="120" class="stroke-white/20 stroke-1 animate-chat-connection-1" stroke-dasharray="3,3" />
                <line x1="300" y1="80" x2="160" y2="120" class="stroke-white/20 stroke-1 animate-chat-connection-2" stroke-dasharray="3,3" />
                <circle cx="160" cy="120" r="4" class="fill-white/30 animate-chat-hub" />
                <circle cx="160" cy="120" r="8" class="fill-none stroke-white/20 stroke-1 animate-chat-hub-ring" />
              </svg>
              <div class="absolute inset-0 pointer-events-none">
                <div class="absolute top-16 right-12 w-1 h-1 bg-white/40 rounded-full animate-chat-particle-1"></div>
                <div class="absolute top-36 left-12 w-1 h-1 bg-white/30 rounded-full animate-chat-particle-2"></div>
                <div class="absolute bottom-20 right-16 w-1 h-1 bg-white/35 rounded-full animate-chat-particle-3"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <h3 class="text-2xl font-bold">Connect & Communicate</h3>
          <p class="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
            Seamless real-time communication with players worldwide. Chat, invite, and build your gaming network.
          </p>
        </div>
      </div>
    `;
  }

  private createAnimationStyles(): string {
    return `
      <style>
        .floating-input-container {
          position: relative;
        }
        
        .floating-label {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          color: #6b7280;
          transition: all 0.2s ease-in-out;
          pointer-events: none;
          z-index: 10;
          background: transparent;
        }
        
        .floating-input:focus ~ .floating-label,
        .floating-input:not(:placeholder-shown) ~ .floating-label,
        .floating-input:valid ~ .floating-label {
          top: 0.5rem;
          transform: translateY(0);
          font-size: 0.75rem;
          color: #4b5563;
        }
        
        .floating-input:focus ~ .floating-label {
          color: #111827;
        }
        
        .floating-input {
          background: transparent !important;
        }
        
        .floating-label {
          color: #9ca3af !important;
        }
        .floating-input:focus ~ .floating-label,
        .floating-input:not(:placeholder-shown) ~ .floating-label,
        .floating-input:valid ~ .floating-label {
          color: #6b7280 !important;
        }
        .floating-input:focus ~ .floating-label {
          color: #111827 !important;
        }
        
        .floating-input-container .floating-label {
          position: absolute !important;
          left: 0.75rem !important;
          pointer-events: none !important;
          z-index: 10 !important;
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
        
        .animation-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.5s ease-in-out;
        }
        
        .animation-container.hidden {
          opacity: 0;
          pointer-events: none;
        }
        
        .animation-container.active {
          opacity: 1;
          pointer-events: auto;
        }
        
        @keyframes ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
        
        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
        
        @keyframes paddle-realistic-left {
          0%, 100% { top: 20%; }
          25% { top: 40%; }
          50% { top: 60%; }
          75% { top: 30%; }
        }
        
        @keyframes paddle-realistic-right {
          0%, 100% { top: 60%; }
          25% { top: 20%; }
          50% { top: 40%; }
          75% { top: 70%; }
        }
        
        @keyframes ball-realistic {
          0% { left: 10%; top: 50%; }
          25% { left: 45%; top: 30%; }
          50% { left: 90%; top: 40%; }
          75% { left: 55%; top: 70%; }
          100% { left: 10%; top: 50%; }
        }
        
        @keyframes collision-left {
          0%, 90%, 100% { opacity: 0; }
          95% { opacity: 1; }
        }
        
        @keyframes collision-right {
          0%, 40%, 50%, 100% { opacity: 0; }
          45% { opacity: 1; }
        }
        
        @keyframes score-flash {
          0%, 95%, 100% { opacity: 0.4; }
          97% { opacity: 1; }
        }
        
        .animate-paddle-realistic-left {
          animation: paddle-realistic-left 4s infinite ease-in-out;
        }
        
        .animate-paddle-realistic-right {
          animation: paddle-realistic-right 4s infinite ease-in-out;
        }
        
        .animate-ball-realistic {
          animation: ball-realistic 4s infinite linear;
        }
        
        .animate-collision-left {
          animation: collision-left 4s infinite;
        }
        
        .animate-collision-right {
          animation: collision-right 4s infinite;
        }
        
        .animate-score-flash {
          animation: score-flash 6s infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite 2s;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite 1s;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        @keyframes chat-message-1 {
          0%, 20%, 100% { opacity: 0; transform: translateX(-20px); }
          25%, 95% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes chat-message-2 {
          0%, 30%, 100% { opacity: 0; transform: translateX(20px); }
          35%, 85% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes chat-message-3 {
          0%, 40%, 100% { opacity: 0; transform: translateY(-10px); }
          45%, 75% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes chat-typing {
          0%, 60%, 100% { opacity: 0; }
          65%, 95% { opacity: 1; }
        }
        
        @keyframes chat-dot-1 {
          0%, 60% { opacity: 0.3; }
          20% { opacity: 1; }
          40% { opacity: 0.3; }
        }
        
        @keyframes chat-dot-2 {
          0%, 60% { opacity: 0.3; }
          30% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes chat-dot-3 {
          0%, 60% { opacity: 0.3; }
          40% { opacity: 1; }
          60% { opacity: 0.3; }
        }
        
        .animate-chat-message-1 { animation: chat-message-1 8s infinite; }
        .animate-chat-message-2 { animation: chat-message-2 8s infinite; }
        .animate-chat-message-3 { animation: chat-message-3 8s infinite; }
        .animate-chat-typing { animation: chat-typing 8s infinite; }
        .animate-chat-dot-1 { animation: chat-dot-1 1.5s infinite; }
        .animate-chat-dot-2 { animation: chat-dot-2 1.5s infinite 0.2s; }
        .animate-chat-dot-3 { animation: chat-dot-3 1.5s infinite 0.4s; }
        
        @keyframes tournament-trophy {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(5deg); }
        }
        
        @keyframes confetti-1 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(30px) rotate(180deg); opacity: 0; }
        }
        
        .animate-tournament-trophy { animation: tournament-trophy 3s infinite ease-in-out; }
        .animate-confetti-1 { animation: confetti-1 2s infinite; }
        .animate-confetti-2 { animation: confetti-1 2s infinite 0.2s; }
        .animate-confetti-3 { animation: confetti-1 2s infinite 0.4s; }
        .animate-confetti-4 { animation: confetti-1 2s infinite 0.6s; }
        .animate-confetti-5 { animation: confetti-1 2s infinite 0.8s; }
      </style>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    this.element.remove();
  }
}
