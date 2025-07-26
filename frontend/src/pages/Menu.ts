import { authManager } from '../auth/AuthManager';
import { router } from '../router';

export class MenuPage {
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
              <div class="flex items-center">
                <h1 class="text-xl font-bold text-white">ft_transcendence</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-300">Welcome, ${user?.username || 'User'}</span>
                <button id="logout-btn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 flex items-center justify-center">
          <div class="max-w-4xl mx-auto px-4 text-center">
            <h2 class="text-4xl font-bold mb-8">Main Menu</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Profile -->
              <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer" data-route="/profile">
                <div class="text-4xl mb-4">👤</div>
                <h3 class="text-xl font-semibold mb-2">Profile</h3>
                <p class="text-gray-400">View and edit your profile</p>
              </div>

              <!-- Friends -->
              <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer" data-route="/friends">
                <div class="text-4xl mb-4">👥</div>
                <h3 class="text-xl font-semibold mb-2">Friends</h3>
                <p class="text-gray-400">Manage your friends list</p>
              </div>

              <!-- Tournament -->
              <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer" data-route="/tournament">
                <div class="text-4xl mb-4">🏆</div>
                <h3 class="text-xl font-semibold mb-2">Tournament</h3>
                <p class="text-gray-400">Join or create tournaments</p>
              </div>

              <!-- Chat -->
              <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer" data-route="/chat">
                <div class="text-4xl mb-4">💬</div>
                <h3 class="text-xl font-semibold mb-2">Chat</h3>
                <p class="text-gray-400">Chat with other players</p>
              </div>

              <!-- Play Game -->
              <div class="bg-blue-600 hover:bg-blue-700 rounded-lg p-6 transition-colors cursor-pointer" data-route="/game">
                <div class="text-4xl mb-4">🎮</div>
                <h3 class="text-xl font-semibold mb-2">Play Pong</h3>
                <p class="text-blue-100">Start a game of Pong</p>
              </div>

              <!-- Settings -->
              <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer" data-route="/settings">
                <div class="text-4xl mb-4">⚙️</div>
                <h3 class="text-xl font-semibold mb-2">Settings</h3>
                <p class="text-gray-400">Configure your preferences</p>
              </div>
            </div>
          </div>
        </main>

        <!-- Footer -->
        <footer class="bg-gray-800 border-t border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="text-center text-gray-400 text-sm">
              ft_transcendence - Built with Vanilla TypeScript
            </div>
          </div>
        </footer>
      </div>
    `;

    this.setupEventListeners();
    return container;
  }

  private setupEventListeners(): void {
    // Logout button
    const logoutBtn = this.element.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await authManager.logout();
          // Navigation will be handled by AuthManager
        } catch (error) {
          console.error('Logout error:', error);
        }
      });
    }

    // Menu navigation
    const menuItems = this.element.querySelectorAll('[data-route]');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const route = item.getAttribute('data-route');
        if (route) {
          router.navigate(route);
        }
      });
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}