import { authManager } from '../auth/AuthManager';
import { router } from '../router';

export class ChatPage {
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
                <h1 class="text-xl font-bold text-white">Chat</h1>
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
        <main class="flex-1 flex">
          <div class="w-full max-w-6xl mx-auto flex">
            <!-- Chat Sidebar -->
            <div class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
              <!-- Search -->
              <div class="p-4 border-b border-gray-700">
                <input 
                  type="text" 
                  placeholder="Search conversations..." 
                  class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <!-- Conversation List -->
              <div class="flex-1 overflow-y-auto">
                <div class="p-2 space-y-1">
                  <!-- Active conversation -->
                  <div class="bg-blue-600 rounded-lg p-3 cursor-pointer">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        👤
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                          <h3 class="font-medium text-sm truncate">General Chat</h3>
                          <span class="text-xs text-blue-200">2m</span>
                        </div>
                        <p class="text-xs text-blue-200 truncate">Welcome to the general chat!</p>
                      </div>
                    </div>
                  </div>

                  <!-- Other conversations -->
                  <div class="hover:bg-gray-700 rounded-lg p-3 cursor-pointer transition-colors">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center relative">
                        👤
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                          <h3 class="font-medium text-sm truncate">Friend Username</h3>
                          <span class="text-xs text-gray-400">1h</span>
                        </div>
                        <p class="text-xs text-gray-400 truncate">Good game! Want to play again?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- New Chat Button -->
              <div class="p-4 border-t border-gray-700">
                <button class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors">
                  New Chat
                </button>
              </div>
            </div>

            <!-- Chat Messages Area -->
            <div class="flex-1 flex flex-col">
              <!-- Chat Header -->
              <div class="bg-gray-800 border-b border-gray-700 p-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    👥
                  </div>
                  <div>
                    <h2 class="font-semibold">General Chat</h2>
                    <p class="text-sm text-gray-400">42 members online</p>
                  </div>
                </div>
              </div>

              <!-- Messages -->
              <div class="flex-1 overflow-y-auto p-4 space-y-4">
                <!-- Message -->
                <div class="flex space-x-3">
                  <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                    👤
                  </div>
                  <div>
                    <div class="flex items-baseline space-x-2">
                      <span class="font-medium text-sm">Player1</span>
                      <span class="text-xs text-gray-400">10:30 AM</span>
                    </div>
                    <p class="text-sm">Anyone up for a game?</p>
                  </div>
                </div>

                <!-- Own message -->
                <div class="flex space-x-3">
                  <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">
                    ${user?.username?.charAt(0).toUpperCase() || '🎮'}
                  </div>
                  <div>
                    <div class="flex items-baseline space-x-2">
                      <span class="font-medium text-sm text-blue-400">${user?.username || 'You'}</span>
                      <span class="text-xs text-gray-400">10:31 AM</span>
                    </div>
                    <p class="text-sm">I'm ready! Let's play some Pong!</p>
                  </div>
                </div>

                <!-- System message -->
                <div class="text-center">
                  <span class="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                    Player1 started a game
                  </span>
                </div>
              </div>

              <!-- Message Input -->
              <div class="bg-gray-800 border-t border-gray-700 p-4">
                <div class="flex space-x-3">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    class="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                  <button class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
                    Send
                  </button>
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

    // Send message on Enter
    const messageInput = container.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage(messageInput.value);
          messageInput.value = '';
        }
      });
    }

    // Send button
    const sendBtn = container.querySelector('button:last-child');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (messageInput) {
          this.sendMessage(messageInput.value);
          messageInput.value = '';
        }
      });
    }

    console.log('💬 ChatPage: Event listeners bound');
    return container;
  }

  private setupEventListeners(): void {
    // This method is now unused - events are bound in createElement()
    // Keeping for potential future use or additional event handling
  }

  private sendMessage(message: string): void {
    if (!message.trim()) return;
    
    // TODO: Implement actual message sending
    console.log('Sending message:', message);
  }

  public getElement(): HTMLElement {
    return this.element;
  }
}