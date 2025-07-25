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
          
          <!-- Header -->
          <div class="text-center mb-12">
            <h1 class="text-5xl font-iceland font-bold text-white mb-4">
              ft_transcendence
            </h1>
            <p class="text-xl text-gray-300">
              Vanilla TypeScript Migration - Phase 2
            </p>
          </div>

          <!-- Navigation Cards -->
          <div class="max-w-5xl mx-auto grid md:grid-cols-4 gap-6">
            
            <!-- Auth Page Card -->
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div class="text-center">
                <div class="text-4xl mb-4">🔐</div>
                <h3 class="text-xl font-bold text-white mb-3">Auth Page</h3>
                <p class="text-gray-300 mb-4">Authentification</p>
                <button id="goto-auth" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Aller à /auth
                </button>
              </div>
            </div>

            <!-- 404 Page Card -->
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

            <!-- Test Page Card -->
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

            <!-- Router Info Card -->
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

          <!-- Current Route Info -->
          <div class="max-w-2xl mx-auto mt-12 bg-black/20 rounded-lg p-6">
            <h3 class="text-lg font-bold text-white mb-3">📍 Navigation Info</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400">Route actuelle:</span>
                <span class="text-green-400 font-mono" id="current-route">/</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Router chargé:</span>
                <span class="text-green-400">✅ Actif</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Histoire navigation:</span>
                <span class="text-green-400">✅ Fonctionnelle</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
    return div.firstElementChild as HTMLElement;
  }

  private bindEvents(): void {
    // Import dynamique du router pour éviter la dépendance circulaire
    const gotoAuthBtn = this.element.querySelector('#goto-auth');
    const goto404Btn = this.element.querySelector('#goto-404');
    const gotoTestBtn = this.element.querySelector('#goto-test');
    const showRoutesBtn = this.element.querySelector('#show-routes');

    gotoAuthBtn?.addEventListener('click', () => {
      console.log('🏠 HomePage: Navigation vers /auth');
      import('../router').then(({ router }) => {
        router.navigate('/auth');
      });
    });

    goto404Btn?.addEventListener('click', () => {
      console.log('🏠 HomePage: Navigation vers /404');
      import('../router').then(({ router }) => {
        router.navigate('/404');
      });
    });

    gotoTestBtn?.addEventListener('click', () => {
      console.log('🏠 HomePage: Navigation vers /test');
      import('../router').then(({ router }) => {
        router.navigate('/test');
      });
    });

    showRoutesBtn?.addEventListener('click', () => {
      import('../router').then(({ router }) => {
        const routes = router.getAvailableRoutes();
        alert(`Routes disponibles:\\n${routes.join('\\n')}`);
      });
    });

    // Mettre à jour l'affichage de la route actuelle
    this.updateCurrentRoute();
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