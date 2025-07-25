export class TestPage {
  private element: HTMLElement;
  private testResults: { [key: string]: boolean } = {};

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.runTests();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-900 to-teal-900">
        <div class="container mx-auto px-6 py-12">
          
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-4xl font-iceland font-bold text-white mb-2">
              🧪 Page de Test
            </h1>
            <p class="text-lg text-gray-300">
              Validation des fonctionnalités - Phase 2
            </p>
          </div>

          <!-- Navigation -->
          <div class="max-w-2xl mx-auto mb-8">
            <div class="flex gap-4 justify-center">
              <button id="goto-home" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                ← Accueil
              </button>
              <button id="goto-404" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Page 404
              </button>
            </div>
          </div>

          <!-- Test Results -->
          <div class="max-w-4xl mx-auto">
            <div class="bg-black/30 rounded-xl p-6 mb-6">
              <h2 class="text-2xl font-bold text-white mb-4">📊 Résultats des Tests</h2>
              <div id="test-results" class="space-y-3">
                <!-- Tests will be populated here -->
              </div>
            </div>

            <!-- Interactive Tests -->
            <div class="grid md:grid-cols-2 gap-6">
              
              <!-- Router Tests -->
              <div class="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h3 class="text-xl font-bold text-white mb-4">🛣️ Tests Router</h3>
                <div class="space-y-3">
                  <button id="test-navigation" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                    Test Navigation Programmatique
                  </button>
                  <button id="test-history" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                    Test Historique Navigateur
                  </button>
                  <button id="test-routes" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                    Lister Routes Disponibles
                  </button>
                </div>
              </div>

              <!-- DOM Tests -->
              <div class="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h3 class="text-xl font-bold text-white mb-4">🏗️ Tests DOM</h3>
                <div class="space-y-3">
                  <button id="test-events" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                    Test Event Listeners
                  </button>
                  <button id="test-tailwind" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                    Test Tailwind CSS
                  </button>
                  <button id="test-cleanup" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                    Test Memory Cleanup
                  </button>
                </div>
              </div>

            </div>

            <!-- Console Output -->
            <div class="mt-6 bg-black/50 rounded-xl p-6">
              <h3 class="text-lg font-bold text-white mb-3">💻 Console Output</h3>
              <div id="console-output" class="bg-black rounded-lg p-4 font-mono text-sm text-green-400 min-h-[100px] max-h-[200px] overflow-y-auto">
                <div>✅ TestPage initialized</div>
                <div>🧪 Running automated tests...</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
    return div.firstElementChild as HTMLElement;
  }

  private bindEvents(): void {
    // Navigation buttons
    const gotoHomeBtn = this.element.querySelector('#goto-home');
    const goto404Btn = this.element.querySelector('#goto-404');

    gotoHomeBtn?.addEventListener('click', () => {
      this.log('🏠 Navigation vers accueil');
      import('../router').then(({ router }) => {
        router.navigate('/');
      });
    });

    goto404Btn?.addEventListener('click', () => {
      this.log('🚫 Navigation vers 404');
      import('../router').then(({ router }) => {
        router.navigate('/404');
      });
    });

    // Test buttons
    const testNavigationBtn = this.element.querySelector('#test-navigation');
    const testHistoryBtn = this.element.querySelector('#test-history');
    const testRoutesBtn = this.element.querySelector('#test-routes');
    const testEventsBtn = this.element.querySelector('#test-events');
    const testTailwindBtn = this.element.querySelector('#test-tailwind');
    const testCleanupBtn = this.element.querySelector('#test-cleanup');

    testNavigationBtn?.addEventListener('click', () => this.testNavigation());
    testHistoryBtn?.addEventListener('click', () => this.testHistory());
    testRoutesBtn?.addEventListener('click', () => this.testRoutes());
    testEventsBtn?.addEventListener('click', () => this.testEvents());
    testTailwindBtn?.addEventListener('click', () => this.testTailwind());
    testCleanupBtn?.addEventListener('click', () => this.testCleanup());
  }

  private runTests(): void {
    // Tests automatiques au chargement
    setTimeout(() => {
      this.testBasicDOM();
      this.testRouterAvailability();
      this.updateTestResults();
    }, 100);
  }

  private testBasicDOM(): void {
    const rootExists = !!document.getElementById('root');
    const currentPageExists = !!this.element;
    const tailwindLoaded = getComputedStyle(this.element).background.includes('gradient');

    this.testResults['DOM Root'] = rootExists;
    this.testResults['Current Page'] = currentPageExists;
    this.testResults['Tailwind CSS'] = tailwindLoaded;

    this.log(`✅ DOM Tests: Root(${rootExists}) Page(${currentPageExists}) Tailwind(${tailwindLoaded})`);
  }

  private testRouterAvailability(): void {
    const routerExists = !!(window as any).router;
    const currentPath = window.location.pathname;
    
    this.testResults['Router Available'] = routerExists;
    this.testResults['Current Path'] = currentPath === '/test';

    this.log(`🛣️ Router Tests: Available(${routerExists}) Path(${currentPath})`);
  }

  private testNavigation(): void {
    this.log('🧪 Test navigation programmatique...');
    import('../router').then(({ router }) => {
      const routes = router.getAvailableRoutes();
      this.log(`📋 Routes disponibles: ${routes.join(', ')}`);
      
      // Test navigation rapide
      setTimeout(() => {
        router.navigate('/');
        setTimeout(() => router.navigate('/test'), 1000);
      }, 500);
    });
  }

  private testHistory(): void {
    this.log('⏪ Test historique navigateur - Utilisez les boutons ←/→');
    window.history.pushState(null, '', '/test-history');
    setTimeout(() => {
      window.history.back();
    }, 1000);
  }

  private testRoutes(): void {
    import('../router').then(({ router }) => {
      const routes = router.getAvailableRoutes();
      const current = router.getCurrentPath();
      this.log(`📍 Route actuelle: ${current}`);
      this.log(`📋 Routes: ${routes.join(', ')}`);
    });
  }

  private testEvents(): void {
    this.log('👆 Test événements DOM...');
    const testDiv = document.createElement('div');
    testDiv.textContent = 'Test Element';
    testDiv.addEventListener('click', () => {
      this.log('✅ Event listener fonctionne !');
      testDiv.remove();
    });
    
    this.element.appendChild(testDiv);
    setTimeout(() => testDiv.click(), 500);
  }

  private testTailwind(): void {
    this.log('🎨 Test Tailwind CSS...');
    const styles = getComputedStyle(this.element);
    const hasGradient = styles.background.includes('gradient');
    const hasCorrectFont = styles.fontFamily.includes('Iceland') || styles.fontFamily.includes('system');
    
    this.log(`🎨 Gradient: ${hasGradient}, Font: ${hasCorrectFont}`);
  }

  private testCleanup(): void {
    this.log('🧹 Test nettoyage mémoire...');
    const testElement = document.createElement('div');
    const cleanup = () => {
      testElement.remove();
      this.log('✅ Cleanup effectué');
    };
    
    setTimeout(cleanup, 1000);
  }

  private updateTestResults(): void {
    const resultsContainer = this.element.querySelector('#test-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';
    
    Object.entries(this.testResults).forEach(([test, result]) => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';
      div.innerHTML = `
        <span class="text-gray-300">${test}:</span>
        <span class="${result ? 'text-green-400' : 'text-red-400'}">
          ${result ? '✅ PASS' : '❌ FAIL'}
        </span>
      `;
      resultsContainer.appendChild(div);
    });
  }

  private log(message: string): void {
    const consoleOutput = this.element.querySelector('#console-output');
    if (consoleOutput) {
      const div = document.createElement('div');
      div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      consoleOutput.appendChild(div);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    console.log(message);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}