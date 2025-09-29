import { authManager } from '../../core/auth/AuthManager';
import { router } from '../../core/app/Router';

export class Banner {
  private element: HTMLElement;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.subscribeToAuth();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    const user = authManager.getCurrentUser();

    div.className = 'text-[30px] p-2 border-b-2 border-black bg-white text-black';

    div.innerHTML = `
      <ul class="flex justify-evenly">
        <li>Welcome <span id="welcome-username" class="text-blue-400">${user?.display_name || user?.username || 'User'}</span>!</li>
        <li>Wins: <span id="user-wins">${user?.total_wins || 0}</span></li>
        <li>Losses: <span id="user-losses">${user?.total_losses || 0}</span></li>
        <li class="border-x-2 border-black px-6">
          <button id="dashboard-btn" class="hover:text-blue-400 transition-colors cursor-pointer" data-user-id="${user?.id ? String(user.id) : ''}">► Dashboard ◄</button>
        </li>
      </ul>
    `;

    const dashboardBtn = div.querySelector('#dashboard-btn');
    dashboardBtn?.addEventListener('click', () => this.navigateToDashboard());

    return div;
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth(authState => {
      this.updateUserStats(authState.user);
    });
  }

  private updateUserStats(user: any): void {
    const welcomeUsername = this.element.querySelector('#welcome-username');
    if (welcomeUsername) {
      welcomeUsername.textContent = user?.display_name || user?.username || 'User';
    }

    const userWins = this.element.querySelector('#user-wins');
    if (userWins) {
      userWins.textContent = String(user?.total_wins || 0);
    }

    const userLosses = this.element.querySelector('#user-losses');
    if (userLosses) {
      userLosses.textContent = String(user?.total_losses || 0);
    }

    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    if (dashboardBtn && user?.id) {
      dashboardBtn.setAttribute('data-user-id', String(user.id));
    }
  }

  private navigateToDashboard(): void {
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    let userId = dashboardBtn?.getAttribute('data-user-id');

    if (!userId || userId === '') {
      const currentUser = authManager.getCurrentUser();
      userId = currentUser?.id ? String(currentUser.id) : null;

      if (userId && dashboardBtn) {
        dashboardBtn.setAttribute('data-user-id', userId);
      }
    }

    if (userId && userId !== '') {
      router.navigate(`/dashboard/${userId}`);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    this.element.remove();
  }
}
