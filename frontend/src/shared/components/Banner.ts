import { authManager } from '../../core/auth/AuthManager';
import { router } from '../../core/app/Router';

// Banner - Reproduction exacte de la version React
// User stats + Dashboard link

export class Banner {
  private element: HTMLElement;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.subscribeToAuth();
    
    console.log('🎨 Banner: Initialized with React-like design');
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    const user = authManager.getCurrentUser();
    
    div.className = 'text-[30px] p-2 border-b-2 border-black bg-white text-black';

    div.innerHTML = `
      <ul class="flex justify-evenly">
        
        <!-- Welcome Message -->
        <li>
          Welcome <span id="welcome-username" class="text-blue-400">${user?.display_name || user?.username || 'User'}</span> !
        </li>
        
        <!-- Wins -->
        <li>
          Wins : <span id="user-wins">${user?.total_wins || 0}</span>
        </li>
        
        <!-- Losses -->
        <li>
          Losses : <span id="user-losses">${user?.total_losses || 0}</span>
        </li>
        
        <!-- Dashboard Link -->
        <li class="border-x-2 border-black px-6">
          <button 
            id="dashboard-btn" 
            class="hover:text-blue-400 transition-colors cursor-pointer"
            data-user-id="${user?.id ? String(user.id) : ''}"
          >
            ► Dashboard ◄
          </button>
        </li>
        
      </ul>
    `;

    // Bind events directly on the div before returning it
    const dashboardBtn = div.querySelector('#dashboard-btn');
    dashboardBtn?.addEventListener('click', () => this.navigateToDashboard());

    return div;
  }

  private bindEvents(): void {
    // This method is now called after this.element is set
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    dashboardBtn?.addEventListener('click', () => this.navigateToDashboard());

  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      this.updateUserStats(authState.user);
    });
  }

  private updateUserStats(user: any): void {
    // Update welcome username
    const welcomeUsername = this.element.querySelector('#welcome-username');
    if (welcomeUsername) {
      welcomeUsername.textContent = user?.display_name || user?.username || 'User';
    }

    // Update wins
    const userWins = this.element.querySelector('#user-wins');
    if (userWins) {
      userWins.textContent = String(user?.total_wins || 0);
    }

    // Update losses
    const userLosses = this.element.querySelector('#user-losses');
    if (userLosses) {
      userLosses.textContent = String(user?.total_losses || 0);
    }

    // Update dashboard button user ID
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    if (dashboardBtn && user?.id) {
      dashboardBtn.setAttribute('data-user-id', String(user.id));
    }
  }

  private navigateToDashboard(): void {
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    let userId = dashboardBtn?.getAttribute('data-user-id');
    
    // Si pas d'userId dans l'attribut, essayer de le récupérer directement
    if (!userId || userId === '') {
      const currentUser = authManager.getCurrentUser();
      userId = currentUser?.id ? String(currentUser.id) : null;
      
      // Mettre à jour l'attribut pour les prochaines fois
      if (userId && dashboardBtn) {
        dashboardBtn.setAttribute('data-user-id', userId);
      }
    }
    
    if (userId && userId !== '') {
      router.navigate(`/dashboard/${userId}`);
      console.log(`🎨 Banner: Navigating to dashboard for user ${userId}`);
    } else {
      console.warn('🎨 Banner: No user ID available for dashboard navigation');
      console.warn('🎨 Banner: Current user:', authManager.getCurrentUser());
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    
    console.log('🎨 Banner: Destroyed (React-like)');
    this.element.remove();
  }
}