import { authManager } from '../../core/auth/AuthManager';
import { apiService } from '../../shared/services/api';

interface TestUser {
  id: number;
  username: string;
  email: string;
  password: string;
  description: string;
}

export class UserSwitcher {
  private element: HTMLElement;
  private isVisible: boolean = false;

  private testUsers: TestUser[] = [
    {
      id: 1,
      username: 'alice',
      email: 'alice@test.com',
      password: 'password123',
      description: 'Test User 1',
    },
    {
      id: 2,
      username: 'bob',
      email: 'bob@test.com',
      password: 'password123',
      description: 'Test User 2',
    },
    {
      id: 3,
      username: 'charlie',
      email: 'charlie@test.com',
      password: 'password123',
      description: 'Test User 3',
    },
    {
      id: 4,
      username: 'diana',
      email: 'diana@test.com',
      password: 'password123',
      description: 'Test User 4',
    },
    {
      id: 5,
      username: 'eve',
      email: 'eve@test.com',
      password: 'password123',
      description: 'Test User 5',
    },
  ];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.attachToPage();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'user-switcher-dev';
    container.className = 'fixed top-4 left-4 z-[9999] font-sans';

    container.innerHTML = `
      <!-- Toggle Button -->
      <button id="toggle-btn" class="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg shadow-lg font-bold transition-colors">
        👥 DEV
      </button>

      <!-- Panel -->
      <div id="panel" class="${this.isVisible ? 'block' : 'hidden'} absolute top-12 left-0 bg-gray-800 text-white rounded-lg shadow-xl border-2 border-yellow-500 w-80 max-h-96 overflow-auto">
        
        <!-- Header -->
        <div class="bg-yellow-500 text-black p-3 rounded-t-lg">
          <h3 class="font-bold text-center">🔧 DEV: User Switcher</h3>
          <p class="text-sm text-center">Quick login for testing</p>
        </div>

        <!-- Current User -->
        <div class="p-3 border-b border-gray-600">
          <div class="text-sm text-gray-300">Currently logged as:</div>
          <div id="current-user" class="font-bold text-green-400">Loading...</div>
        </div>

        <!-- Test Users List -->
        <div class="p-3">
          <div class="text-sm text-gray-300 mb-3">Switch to test user:</div>
          <div id="users-list" class="space-y-2">
            ${this.testUsers
              .map(
                user => `
              <button 
                data-user-id="${user.id}"
                data-email="${user.email}"
                data-password="${user.password}"
                class="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors border border-gray-600"
              >
                <div class="font-semibold text-blue-400">${user.username}</div>
                <div class="text-xs text-gray-400">${user.description}</div>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Actions -->
        <div class="p-3 border-t border-gray-600 bg-gray-750 rounded-b-lg">
          <button id="logout-btn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors">
            Logout Current User
          </button>
        </div>

      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    const toggleBtn = this.element.querySelector('#toggle-btn');
    toggleBtn?.addEventListener('click', () => this.togglePanel());

    const userButtons = this.element.querySelectorAll('[data-user-id]');
    userButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const email = target.dataset.email!;
        const password = target.dataset.password!;
        this.switchToUser(email, password);
      });
    });

    const logoutBtn = this.element.querySelector('#logout-btn');
    logoutBtn?.addEventListener('click', () => this.handleLogout());

    this.updateCurrentUser();
  }

  private togglePanel(): void {
    this.isVisible = !this.isVisible;
    const panel = this.element.querySelector('#panel');
    if (panel) {
      panel.className = this.isVisible
        ? 'block absolute top-12 left-0 bg-gray-800 text-white rounded-lg shadow-xl border-2 border-yellow-500 w-80 max-h-96 overflow-auto'
        : 'hidden absolute top-12 left-0 bg-gray-800 text-white rounded-lg shadow-xl border-2 border-yellow-500 w-80 max-h-96 overflow-auto';
    }
  }

  private async switchToUser(email: string, password: string): Promise<void> {
    try {
      this.showStatus('Switching user...', 'loading');

      await authManager.login({ email, password });

      this.showStatus('User switched successfully!', 'success');
      this.updateCurrentUser();

      setTimeout(() => {
        this.isVisible = false;
        this.togglePanel();
      }, 1500);
    } catch (error) {
      console.error('🔧 UserSwitcher: Switch failed:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('User not found')) {
        this.showStatus('User not found, creating...', 'loading');
        await this.createAndLoginUser(email, password);
      } else {
        this.showStatus('Switch failed: ' + (error as Error).message, 'error');
      }
    }
  }

  private async createAndLoginUser(email: string, password: string): Promise<void> {
    try {
      const username = email.split('@')[0];

      await authManager.register({
        email,
        username,
        password,
        data_consent: true,
      });

      this.showStatus('User created! Logging in...', 'loading');

      await authManager.login({ email, password });

      this.showStatus('User created and logged in!', 'success');
      this.updateCurrentUser();

      setTimeout(() => {
        this.isVisible = false;
        this.togglePanel();
      }, 2000);
    } catch (createError) {
      console.error('🔧 UserSwitcher: Failed to create user:', createError);
      this.showStatus('Failed to create user: ' + (createError as Error).message, 'error');
    }
  }

  private async handleLogout(): Promise<void> {
    try {
      this.showStatus('Logging out...', 'loading');
      await authManager.logout();
      this.showStatus('Logged out successfully!', 'success');
      this.updateCurrentUser();
    } catch (error) {
      console.error('🔧 UserSwitcher: Logout failed:', error);
      this.showStatus('Logout failed', 'error');
    }
  }

  private updateCurrentUser(): void {
    const currentUserEl = this.element.querySelector('#current-user');
    if (currentUserEl) {
      const user = authManager.getCurrentUser();
      currentUserEl.textContent = user ? user.username : 'Not logged in';
      currentUserEl.className = user ? 'font-bold text-green-400' : 'font-bold text-red-400';
    }
  }

  private showStatus(message: string, type: 'loading' | 'success' | 'error'): void {
    let statusEl = this.element.querySelector('#status-message') as HTMLElement;
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'status-message';
      statusEl.className = 'p-2 text-center text-sm border-t border-gray-600';
      this.element.querySelector('#panel')?.appendChild(statusEl);
    }

    const colors = {
      loading: 'text-blue-400',
      success: 'text-green-400',
      error: 'text-red-400',
    };

    statusEl.textContent = message;
    statusEl.className = `p-2 text-center text-sm border-t border-gray-600 ${colors[type]}`;

    if (type !== 'loading') {
      setTimeout(() => {
        statusEl?.remove();
      }, 3000);
    }
  }

  private attachToPage(): void {
    document.body.appendChild(this.element);
  }

  public destroy(): void {
    this.element.remove();
  }

  public show(): void {
    this.element.style.display = 'block';
  }

  public hide(): void {
    this.element.style.display = 'none';
  }
}

let userSwitcherInstance: UserSwitcher | null = null;

export function initUserSwitcher(): void {
  if (!userSwitcherInstance) {
    userSwitcherInstance = new UserSwitcher();
  }
}

export function destroyUserSwitcher(): void {
  if (userSwitcherInstance) {
    userSwitcherInstance.destroy();
    userSwitcherInstance = null;
  }
}
