import { appState, AppStateData } from '../state/AppState';
import { StateMonitor } from '../components/StateMonitor';
import { authManager } from '../auth/AuthManager';

export class TestPage {
  private element: HTMLElement;
  private testResults: { [key: string]: boolean } = {};
  private stateUnsubscribers: (() => void)[] = [];
  private stateMonitors: StateMonitor[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToState();
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
            <div class="grid md:grid-cols-3 gap-6">
              
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

              <!-- State Management Tests -->
              <div class="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h3 class="text-xl font-bold text-white mb-4">🗄️ Tests State</h3>
                <div class="space-y-3">
                  <button id="test-login" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    Simuler Login
                  </button>
                  <button id="test-logout" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    Simuler Logout
                  </button>
                  <button id="test-loading" class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                    Toggle Loading
                  </button>
                  <button id="test-state-debug" class="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                    Debug State Info
                  </button>
                  <button id="test-monitors" class="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                    Test Multi-Monitors
                  </button>
                  <button id="test-auth-manager" class="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors">
                    Test AuthManager
                  </button>
                </div>
                
                <!-- Current State Display -->
                <div class="mt-4 p-3 bg-black/30 rounded-lg">
                  <div class="text-sm text-gray-300 mb-2">État Actuel:</div>
                  <div id="current-state" class="text-xs font-mono text-green-400">
                    Chargement...
                  </div>
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

    // State test buttons
    const testLoginBtn = this.element.querySelector('#test-login');
    const testLogoutBtn = this.element.querySelector('#test-logout');
    const testLoadingBtn = this.element.querySelector('#test-loading');
    const testStateDebugBtn = this.element.querySelector('#test-state-debug');
    const testMonitorsBtn = this.element.querySelector('#test-monitors');
    const testAuthManagerBtn = this.element.querySelector('#test-auth-manager');

    testNavigationBtn?.addEventListener('click', () => this.testNavigation());
    testHistoryBtn?.addEventListener('click', () => this.testHistory());
    testRoutesBtn?.addEventListener('click', () => this.testRoutes());
    testEventsBtn?.addEventListener('click', () => this.testEvents());
    testTailwindBtn?.addEventListener('click', () => this.testTailwind());
    testCleanupBtn?.addEventListener('click', () => this.testCleanup());

    // State test event listeners
    testLoginBtn?.addEventListener('click', () => this.testLogin());
    testLogoutBtn?.addEventListener('click', () => this.testLogout());
    testLoadingBtn?.addEventListener('click', () => this.testLoading());
    testStateDebugBtn?.addEventListener('click', () => this.testStateDebug());
    testMonitorsBtn?.addEventListener('click', () => this.testMultiMonitors());
    testAuthManagerBtn?.addEventListener('click', () => this.testAuthManager());
  }

  private subscribeToState(): void {
    // S'abonner aux changements d'état
    const unsubscribe = appState.subscribe((state: AppStateData) => {
      this.updateStateDisplay(state);
      this.log(`🗄️ State updated: ${JSON.stringify(state, null, 2)}`);
    });
    
    this.stateUnsubscribers.push(unsubscribe);
    this.log('✅ Subscribed to AppState');
  }

  private updateStateDisplay(state: AppStateData): void {
    const stateElement = this.element.querySelector('#current-state');
    if (stateElement) {
      stateElement.innerHTML = `
        <div>Auth: ${state.isAuthenticated ? '✅' : '❌'}</div>
        <div>User: ${state.user?.username || 'null'}</div>
        <div>Loading: ${state.loading ? '⌛' : '✅'}</div>
        <div>Path: ${state.currentPath}</div>
        <div>Version: ${state.stateVersion}</div>
        <div>Subscribers: ${appState.getSubscriberCount()}</div>
      `;
    }
  }

  private runTests(): void {
    // Tests automatiques au chargement
    setTimeout(() => {
      this.testBasicDOM();
      this.testRouterAvailability();
      this.testStateSystem();
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

  private testStateSystem(): void {
    const stateExists = !!(window as any).appState;
    const canGetState = !!appState.getState();
    const hasSubscribers = appState.getSubscriberCount() > 0;
    
    this.testResults['AppState Available'] = stateExists;
    this.testResults['State Gettable'] = canGetState;
    this.testResults['Has Subscribers'] = hasSubscribers;

    this.log(`🗄️ State Tests: Available(${stateExists}) Gettable(${canGetState}) Subscribers(${hasSubscribers})`);
  }

  // State test methods
  private testLogin(): void {
    this.log('🔑 Testing login simulation...');
    
    const mockUser = {
      id: 42,
      username: 'test_user',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: undefined,
      is_online: true,
      total_wins: 10,
      total_losses: 5,
      total_games: 15,
      created_at: new Date().toISOString()
    };

    appState.login(mockUser);
    this.log('✅ Login simulation complete');
  }

  private testLogout(): void {
    this.log('🚪 Testing logout simulation...');
    appState.logout();
    this.log('✅ Logout simulation complete');
  }

  private testLoading(): void {
    const currentState = appState.getState();
    const newLoadingState = !currentState.loading;
    
    this.log(`⌛ Toggling loading: ${currentState.loading} → ${newLoadingState}`);
    appState.setLoading(newLoadingState);
  }

  private testStateDebug(): void {
    this.log('🛠️ State debug info:');
    appState.debugInfo();
    
    const history = appState.getStateHistory();
    this.log(`📚 State history: ${history.length} entries`);
    
    if (history.length > 0) {
      this.log(`📖 Last state: ${JSON.stringify(history[history.length - 1], null, 2)}`);
    }
  }

  private testMultiMonitors(): void {
    if (this.stateMonitors.length > 0) {
      this.log('🧹 Clearing existing monitors...');
      this.stateMonitors.forEach(monitor => monitor.destroy());
      this.stateMonitors = [];
    }

    this.log('📺 Creating multiple state monitors...');
    
    // Créer 3 monitors à différentes positions
    const positions = [
      { x: 20, y: 100 },
      { x: 20, y: 250 },
      { x: 20, y: 400 }
    ];

    positions.forEach((pos, index) => {
      const monitor = new StateMonitor(`${index + 1}`, pos);
      document.body.appendChild(monitor.getElement());
      this.stateMonitors.push(monitor);
    });

    this.log(`✅ Created ${this.stateMonitors.length} state monitors`);
    this.log('💡 Tip: Change state using buttons to see all monitors update!');
  }

  private testAuthManager(): void {
    this.log('🔐 Testing AuthManager integration...');
    
    // Test 1: Vérifier que AuthManager existe
    const authManagerExists = !!(window as any).authManager || !!authManager;
    this.log(`📋 AuthManager exists: ${authManagerExists}`);
    
    // Test 2: Tester les méthodes getter
    try {
      const isAuth = authManager.isAuthenticated();
      const isLoading = authManager.isLoading();
      const currentUser = authManager.getCurrentUser();
      
      this.log(`📊 Current auth state:`);
      this.log(`  - Authenticated: ${isAuth}`);
      this.log(`  - Loading: ${isLoading}`);
      this.log(`  - User: ${currentUser?.username || 'null'}`);
      
    } catch (error) {
      this.log(`❌ Error testing AuthManager getters: ${error}`);
    }
    
    // Test 3: Tester subscription
    try {
      const unsubscribe = authManager.subscribeToAuth((authState) => {
        this.log(`🔔 AuthManager subscription update: auth=${authState.isAuthenticated}, user=${authState.user?.username || 'null'}`);
      });
      
      // Nettoyer après 5 secondes
      setTimeout(() => {
        unsubscribe();
        this.log('🧹 AuthManager subscription cleaned up');
      }, 5000);
      
      this.log('✅ AuthManager subscription test started (5s)');
      
    } catch (error) {
      this.log(`❌ Error testing AuthManager subscription: ${error}`);
    }
    
    // Test 4: OAuth URLs
    try {
      const githubUrl = authManager.getGitHubAuthUrl();
      const googleUrl = authManager.getGoogleAuthUrl();
      
      this.log(`🔗 OAuth URLs available:`);
      this.log(`  - GitHub: ${githubUrl ? '✅' : '❌'}`);
      this.log(`  - Google: ${googleUrl ? '✅' : '❌'}`);
      
    } catch (error) {
      this.log(`❌ Error testing OAuth URLs: ${error}`);
    }
    
    this.log('✅ AuthManager integration test complete');
    this.log('💡 Use login simulation to test auth flow through AuthManager');
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
    // Nettoyer les souscriptions d'état
    this.stateUnsubscribers.forEach(unsubscribe => {
      unsubscribe();
    });
    this.stateUnsubscribers = [];
    
    // Nettoyer les monitors
    this.stateMonitors.forEach(monitor => monitor.destroy());
    this.stateMonitors = [];
    
    this.log('🧹 TestPage: State subscriptions and monitors cleaned up');
    this.element.remove();
  }
}