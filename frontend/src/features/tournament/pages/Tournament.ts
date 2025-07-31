import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';

export class TournamentPage {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-900 text-white';

    const user = authManager.getCurrentUser();
    
    container.innerHTML = `
      <div class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-gray-800 border-b border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center space-x-4">
                <button id="back-btn" class="text-gray-400 hover:text-white transition-colors">
                  ← Back to Menu
                </button>
                <h1 class="text-xl font-bold text-white">Tournament</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-300">${user?.username || 'User'}</span>
                <button id="logout-btn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 p-8">
          <div class="max-w-6xl mx-auto">
            <div class="mb-6">
              <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold">Tournaments</h2>
                <button class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors">
                  Create Tournament
                </button>
              </div>
            </div>

            <!-- Tournament Tabs -->
            <div class="flex space-x-4 mb-6">
              <button class="bg-blue-600 px-4 py-2 rounded-lg font-medium">Active</button>
              <button class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">Upcoming</button>
              <button class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">Completed</button>
            </div>

            <!-- Active Tournaments -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Tournament Card -->
              <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-xl font-semibold mb-2">🏆 Weekly Championship</h3>
                    <p class="text-gray-400 text-sm">Single Elimination • 16 Players</p>
                  </div>
                  <span class="bg-green-600 text-green-100 px-2 py-1 rounded text-xs font-medium">
                    LIVE
                  </span>
                </div>
                
                <div class="space-y-2 mb-4">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Prize Pool:</span>
                    <span class="text-yellow-400 font-medium">1000 pts</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Round:</span>
                    <span>Quarter Finals</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Players:</span>
                    <span>4/16 remaining</span>
                  </div>
                </div>

                <div class="flex space-x-2">
                  <button class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors">
                    View Bracket
                  </button>
                  <button class="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors">
                    Watch
                  </button>
                </div>
              </div>

              <!-- Empty state / Create tournament card -->
              <div class="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                <div class="text-6xl mb-4">🏆</div>
                <h3 class="text-xl font-semibold mb-2">Join a Tournament</h3>
                <p class="text-gray-400 mb-6">Compete against other players and climb the leaderboard!</p>
                <div class="space-y-2 w-full">
                  <button class="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition-colors">
                    Create Tournament
                  </button>
                  <button class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors">
                    Quick Join
                  </button>
                </div>
              </div>
            </div>

            <!-- Tournament Leaderboard -->
            <div class="mt-8">
              <h3 class="text-xl font-semibold mb-4">🏅 Tournament Leaderboard</h3>
              <div class="bg-gray-800 rounded-lg p-6">
                <div class="space-y-3">
                  <div class="flex items-center justify-between py-2 border-b border-gray-700">
                    <div class="flex items-center space-x-4">
                      <span class="text-yellow-400 font-bold">1</span>
                      <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                        👤
                      </div>
                      <span class="font-medium">Champion Player</span>
                    </div>
                    <div class="text-right">
                      <div class="text-yellow-400 font-bold">2,450 pts</div>
                      <div class="text-gray-400 text-xs">5 wins</div>
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between py-2 border-b border-gray-700">
                    <div class="flex items-center space-x-4">
                      <span class="text-gray-300 font-bold">2</span>
                      <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                        👤
                      </div>
                      <span class="font-medium">Runner Up</span>
                    </div>
                    <div class="text-right">
                      <div class="text-gray-300 font-bold">1,890 pts</div>
                      <div class="text-gray-400 text-xs">4 wins</div>
                    </div>
                  </div>

                  <div class="text-center py-4">
                    <button class="text-blue-400 hover:text-blue-300 transition-colors">
                      View Full Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    // Bind events directly on container before returning it
    const backBtn = container.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    const logoutBtn = container.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await authManager.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      });
    }

    return container;
  }

  private setupEventListeners(): void {
    // This method is now unused - events are bound in createElement()
    // Keeping for potential future use or additional event handling
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}