export class HomePage {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900">
        <div class="container mx-auto px-6 py-12">
          <div class="text-center mb-12">
            <h1 class="text-5xl font-iceland font-bold text-white mb-4">
              ft_transcendence
            </h1>
            <p class="text-xl text-gray-300">
              Vanilla TypeScript Migration - Phase 2
            </p>
          </div>
          <div class="max-w-5xl mx-auto grid md:grid-cols-4 gap-6">
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div class="text-center">
                <h3 class="text-xl font-bold text-white mb-3">Auth Page</h3>
                <p class="text-gray-300 mb-4">Authentification</p>
                <button id="goto-auth" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Aller à /auth
                </button>
              </div>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div class="text-center">
                <div class="text-4xl mb-4">🚫</div>
                <h3 class="text-xl font-bold text-white mb-3">Page 404</h3>
                <p class="text-gray-300 mb-4">Test de la page d'erreur</p>
                <button id="goto-404" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Aller à /404
                </button>
              </div>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div class="text-center">
                <div class="text-4xl mb-4">🧪</div>
                <h3 class="text-xl font-bold text-white mb-3">Page Test</h3>
                <p class="text-gray-300 mb-4">Fonctionnalités de test</p>
                <button id="goto-test" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                  Aller à /test
                </button>
              </div>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div class="text-center">
                <div class="text-4xl mb-4">🛣️</div>
                <h3 class="text-xl font-bold text-white mb-3">Router Status</h3>
                <p class="text-gray-300 mb-4">Système de navigation</p>
                <button id="show-routes" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Voir Routes
                </button>
              </div>
            </div>
          </div>
          <div class="max-w-6xl mx-auto mt-12">
            <div class="mb-8">
              <h3 class="text-xl font-bold text-white mb-4">🌐 Routes Publiques</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button id="goto-home" class="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                  🏠 Home (/)
                </button>
                <button id="goto-auth" class="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                  🔐 Auth (/auth)
                </button>
                <button id="goto-test" class="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">
                  🧪 Test (/test)
                </button>
                <button id="goto-404" class="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                  🚫 404 (/404)
                </button>
              </div>
            </div>
            <div class="mb-8">
              <h3 class="text-xl font-bold text-white mb-4">🔒 Routes Protégées (Nécessite Auth)</h3>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button id="goto-menu" class="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium">
                  🍔 Menu (/menu)
                </button>
                <button id="goto-profile" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium">
                  👤 Profile (/profile)
                </button>
                <button id="goto-friends" class="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium">
                  👥 Friends (/friends)  
                </button>
                <button id="goto-chat" class="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors font-medium">
                  💬 Chat (/chat)
                </button>
                <button id="goto-tournament" class="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium">
                  🏆 Tournament (/tournament)
                </button>
                <button id="goto-menutest" class="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium">
                  🧪 MenuTest (/menutest)
                </button>
              </div>
            </div>
            <div class="bg-black/20 rounded-lg p-6">
              <h3 class="text-lg font-bold text-white mb-3">📍 Navigation Info</h3>
              <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">Route actuelle:</span>
                  <span class="text-green-400 font-mono" id="current-route">/</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Status Router:</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Auth Status:</span>
                  <span class="text-blue-400" id="auth-status">❓ Vérification...</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Total Routes:</span>
                  <span class="text-green-400" id="total-routes">-</span>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t border-gray-600">
                <button id="show-routes" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                  Voir Routes
                </button>
                <button id="clear-auth" class="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm">
                  🚪 Clear Auth (test)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return div.firstElementChild as HTMLElement;
  }

  private bindEvents(): void {
    this.setupNavigationButtons();
    this.setupInfoButtons();
    this.updateCurrentRoute();
    this.updateAuthStatus();
    this.updateTotalRoutes();
  }

  private setupNavigationButtons(): void {
    const routes = [
      { id: 'goto-home', path: '/', label: 'Home' },
      { id: 'goto-auth', path: '/auth', label: 'Auth' },
      { id: 'goto-test', path: '/test', label: 'Test' },
      { id: 'goto-404', path: '/404', label: '404' },
      { id: 'goto-menu', path: '/menu', label: 'Menu' },
      { id: 'goto-profile', path: '/profile', label: 'Profile' },
      { id: 'goto-friends', path: '/friends', label: 'Friends' },
      { id: 'goto-chat', path: '/chat', label: 'Chat' },
      { id: 'goto-tournament', path: '/tournament', label: 'Tournament' },
      { id: 'goto-menutest', path: '/menutest', label: 'MenuTest' },
    ];
    routes.forEach(route => {
      const btn = this.element.querySelector(`#${route.id}`);
      btn?.addEventListener('click', () => {
        import('../core/app/Router').then(({ router }) => {
          router.navigate(route.path);
        });
      });
    });
  }

  private setupInfoButtons(): void {
    const showRoutesBtn = this.element.querySelector('#show-routes');
    showRoutesBtn?.addEventListener('click', () => {
      import('../core/app/Router').then(({ router }) => {
        const routes = router.getAvailableRoutes();
      });
    });
    const clearAuthBtn = this.element.querySelector('#clear-auth');
    clearAuthBtn?.addEventListener('click', () => {
      import('../core/auth/AuthManager').then(({ authManager }) => {
        authManager.logout();
        this.updateAuthStatus();
        alert('Auth cleared. Protected routes will redirect to /auth');
      });
    });
  }

  private updateAuthStatus(): void {
    import('../core/auth/AuthManager').then(({ authManager }) => {
      const authStatusElement = this.element.querySelector('#auth-status');
      if (authStatusElement) {
        const isAuthenticated = authManager.isAuthenticated();
        const user = authManager.getCurrentUser();
        if (isAuthenticated && user) {
          authStatusElement.className = 'text-green-400';
        } else {
          authStatusElement.innerHTML = '❌ Non connecté';
          authStatusElement.className = 'text-red-400';
        }
      }
    });
  }

  private updateTotalRoutes(): void {
    import('../core/app/Router').then(({ router }) => {
      const totalRoutesElement = this.element.querySelector('#total-routes');
      if (totalRoutesElement) {
        const routes = router.getAvailableRoutes();
        totalRoutesElement.textContent = routes.length.toString();
      }
    });
  }

  private updateCurrentRoute(): void {
    const routeElement = this.element.querySelector('#current-route');
    if (routeElement) {
      routeElement.textContent = window.location.pathname;
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
