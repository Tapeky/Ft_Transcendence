import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';
import { PongInviteModal } from '../components/PongInviteModal';

export class FriendsPage {
  private element: HTMLElement;
  private pongInviteModal?: PongInviteModal;

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
                <h1 class="text-xl font-bold text-white">Friends</h1>
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
            <div class="mb-6">
              <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold">Friends List</h2>
                <div class="flex space-x-3">
                  <button id="pong-invite-btn" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors">
                    🎮 Inviter au Pong
                  </button>
                  <button class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
                    Add Friend
                  </button>
                </div>
              </div>
            </div>

            <!-- Friends List -->
            <div class="space-y-4">
              <!-- Placeholder friend -->
              <div class="bg-gray-800 rounded-lg p-6 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <div>
                    <h3 class="font-semibold">Friend Username</h3>
                    <p class="text-gray-400 text-sm">🟢 Online</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition-colors">
                    Invite to Game
                  </button>
                  <button class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition-colors">
                    Message
                  </button>
                  <button class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
                    Remove
                  </button>
                </div>
              </div>

              <!-- Empty state -->
              <div class="bg-gray-800 rounded-lg p-8 text-center">
                <div class="text-6xl mb-4">👥</div>
                <h3 class="text-xl font-semibold mb-2">No friends yet</h3>
                <p class="text-gray-400 mb-4">Add friends to see them here and play games together!</p>
                <button class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors">
                  Find Friends
                </button>
              </div>
            </div>

            <!-- Friend Requests -->
            <div class="mt-8">
              <h3 class="text-xl font-semibold mb-4">Friend Requests</h3>
              <div class="bg-gray-800 rounded-lg p-6 text-center">
                <p class="text-gray-400">No pending friend requests</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    const backBtn = container.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    const pongInviteBtn = container.querySelector('#pong-invite-btn');
    if (pongInviteBtn) {
      pongInviteBtn.addEventListener('click', () => {
        this.openPongInviteModal();
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

  private openPongInviteModal(): void {
    if (!this.pongInviteModal) {
      this.pongInviteModal = new PongInviteModal(() => {
        this.pongInviteModal = undefined;
      });
    }
    this.pongInviteModal.open();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.pongInviteModal) {
      this.pongInviteModal.destroy();
    }
  }
}