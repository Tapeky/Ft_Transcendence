import { authManager } from '../auth/AuthManager';
import { router } from '../router';

export class ProfilePage {
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
                <h1 class="text-xl font-bold text-white">Profile</h1>
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
          <div class="max-w-4xl mx-auto">
            <div class="bg-gray-800 rounded-lg p-8">
              <div class="flex items-center space-x-8 mb-8">
                <div class="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center text-3xl">
                  👤
                </div>
                <div>
                  <h2 class="text-3xl font-bold mb-2">${user?.display_name || user?.username || 'User'}</h2>
                  <p class="text-gray-400">@${user?.username || 'username'}</p>
                  <p class="text-gray-400">${user?.email || 'email@example.com'}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-gray-700 rounded-lg p-6 text-center">
                  <div class="text-2xl font-bold text-green-400">${user?.total_wins || 0}</div>
                  <div class="text-gray-400">Wins</div>
                </div>
                <div class="bg-gray-700 rounded-lg p-6 text-center">
                  <div class="text-2xl font-bold text-red-400">${user?.total_losses || 0}</div>
                  <div class="text-gray-400">Losses</div>
                </div>
                <div class="bg-gray-700 rounded-lg p-6 text-center">
                  <div class="text-2xl font-bold text-blue-400">${user?.total_games || 0}</div>
                  <div class="text-gray-400">Total Games</div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-semibold">Profile Actions</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Edit Profile
                  </button>
                  <button class="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Change Password
                  </button>
                  <button class="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Game History
                  </button>
                  <button class="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Achievements
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.setupEventListeners();
    return container;
  }

  private setupEventListeners(): void {
    // Back button
    const backBtn = this.element.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    // Logout button
    const logoutBtn = this.element.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await authManager.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      });
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}