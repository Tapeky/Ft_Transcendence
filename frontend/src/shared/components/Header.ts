import { authManager } from '../../core/auth/AuthManager';
import { getAvatarUrl } from '../utils/avatar';
import { router } from '../../core/app/Router';
import { FriendListModal } from '../../features/friends/components/FriendList/FriendListModal';

// Header - Reproduction exacte de la version React
// Background image city.png + User profile card + Options dropdown

export class Header {
  private element: HTMLElement;
  private userVisible: boolean;
  private isClickHover = false;
  private isOptionsVisible = false;
  private optionsInstance?: Options;

  constructor(userVisible: boolean = true) {
    this.userVisible = userVisible;
    this.element = this.createElement();
    this.bindEvents();
    
  }

  private createElement(): HTMLElement {
    const header = document.createElement('header');
    const user = authManager.getCurrentUser();
    
    header.className = `flex bg-[url("./img/city.png")] bg-cover bg-center min-h-[150px] 
      items-center justify-center border-black border-solid border-b-[5px] border-[5px] sticky top-0 z-40`;

    header.innerHTML = `
      <!-- Spacer gauche -->
      <div class="flex-1"></div>

      <!-- Titre central -->
      <h1 class="text-[5rem] flex-1 text-center text-white backdrop-blur backdrop-brightness-90">
        TRANSCENDENCE
      </h1>

      <!-- Section utilisateur droite -->
      <div class="flex-1">
        <!-- Profile Card -->
        <div id="profile-card" class="${this.userVisible ? 'block' : 'hidden'} translate-y-1/2 flex absolute
          h-[100px] right-[20px] bottom-[70px] w-[260px] border-white border-[5px] cursor-pointer overflow-hidden
          text-white bg-gradient-to-t from-purple-900 to-blue-800">
          
          <!-- Avatar -->
          <div class="flex justify-center items-center">
            <img 
              id="user-avatar" 
              src="${getAvatarUrl(user?.avatar_url)}" 
              alt="icon" 
              class="h-[70px] w-[70px] min-h-[70px] min-w-[70px] border-2 border-solid m-2"
            />
          </div>

          <!-- User Info -->
          <div class="flex flex-grow flex-col">
            <h3 class="text-[1.5rem]" id="user-display-name">
              ${user?.display_name || 'User'}
            </h3>
            <h3 class="text-[1.2rem]" id="user-username">
              ${user?.username || 'username'}
            </h3>
          </div>

          <!-- Click Indicator -->
          <div class="absolute bottom-2 right-2">
            <img 
              id="click-indicator" 
              src="/src/img/click.svg" 
              alt="click" 
              class="${this.isClickHover ? 'block' : 'hidden'} h-[25px] w-[25px]"
            />
          </div>
        </div>

        <!-- Options Dropdown (sera injecté par Options component) -->
        <div id="options-container"></div>
      </div>
    `;

    return header;
  }

  private bindEvents(): void {
    const profileCard = this.element.querySelector('#profile-card');
    
    if (profileCard && this.userVisible) {
      // Mouse hover effects
      profileCard.addEventListener('mouseenter', () => this.showClickIndicator());
      profileCard.addEventListener('mouseleave', () => this.hideClickIndicator());
      
      // Click to toggle options
      profileCard.addEventListener('click', () => this.toggleOptions());
    }

    // Subscribe to auth changes
    authManager.subscribeToAuth((authState) => {
      this.updateUserInfo(authState.user);
    });

  }

  private showClickIndicator(): void {
    this.isClickHover = true;
    const indicator = this.element.querySelector('#click-indicator');
    indicator?.classList.remove('hidden');
    indicator?.classList.add('block');
  }

  private hideClickIndicator(): void {
    this.isClickHover = false;
    const indicator = this.element.querySelector('#click-indicator');
    indicator?.classList.add('hidden');
    indicator?.classList.remove('block');
  }

  private toggleOptions(): void {
    this.isOptionsVisible = !this.isOptionsVisible;
    
    if (this.isOptionsVisible) {
      this.showOptions();
    } else {
      this.hideOptions();
    }
  }

  private showOptions(): void {
    // Create Options instance (classe définie localement)
    if (!this.optionsInstance) {
      this.optionsInstance = new Options(() => this.hideOptions());
    }

    const container = this.element.querySelector('#options-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(this.optionsInstance.getElement());
    }
  }

  private hideOptions(): void {
    this.isOptionsVisible = false;
    const container = this.element.querySelector('#options-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  private updateUserInfo(user: any): void {
    const displayName = this.element.querySelector('#user-display-name');
    const username = this.element.querySelector('#user-username');
    const avatar = this.element.querySelector('#user-avatar') as HTMLImageElement;

    if (displayName) displayName.textContent = user?.display_name || 'User';
    if (username) username.textContent = user?.username || 'username';
    if (avatar) avatar.src = getAvatarUrl(user?.avatar_url);
  }


  public setUserVisible(visible: boolean): void {
    this.userVisible = visible;
    const profileCard = this.element.querySelector('#profile-card');
    
    if (profileCard) {
      if (visible) {
        profileCard.classList.remove('hidden');
        profileCard.classList.add('block');
      } else {
        profileCard.classList.add('hidden');
        profileCard.classList.remove('block');
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  // Method to refresh user data and update avatar/info
  public refresh(): void {
    const user = authManager.getCurrentUser();
    
    // Update avatar
    const avatar = this.element.querySelector('#user-avatar') as HTMLImageElement;
    if (avatar) {
      avatar.src = getAvatarUrl(user?.avatar_url);
    }
    
    // Update display name and username
    const displayName = this.element.querySelector('#user-display-name');
    const username = this.element.querySelector('#user-username');
    
    if (displayName) displayName.textContent = user?.display_name || user?.username || 'User';
    if (username) username.textContent = user?.username || 'username';
    
  }

  destroy(): void {
    if (this.optionsInstance) {
      this.optionsInstance.destroy();
    }
    
    this.element.remove();
  }
}

// Options Component (reproduction exacte)
export class Options {
  private element: HTMLElement;
  private onClose: () => void;
  private friendListInstance?: FriendListModal;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.className = `border-2 border-black absolute right-[20px] bottom-[-60px] w-[260px] translate-y-1/2 bg-white text-black`;

    div.innerHTML = `
      <ul class="text-[1.5rem] divide-y-2 cursor-pointer divide-black indent-2">
        
        <!-- Profile -->
        <li id="profile-option" class="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]">
          Profile 
          <span class="flex flex-grow justify-end items-center mr-6">
            <img src="/src/img/profile.svg" alt="profile" class="h-[25px] w-[25px]"/>
          </span>
        </li>

        <!-- Friends -->
        <li id="friends-option" class="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]">
          Friends
          <span class="flex flex-grow justify-end items-center mr-6">
            <img src="/src/img/friends.svg" alt="friends" class="h-[25px] w-[25px]"/>
          </span>
        </li>

        <!-- Log Out -->
        <li id="logout-option" class="py-2 pl-2 cursor-pointer hover:underline underline-offset-4 flex h-[52px]">
          Log Out
          <span class="flex flex-grow justify-end items-center mr-6">
            <img src="/src/img/logout.svg" alt="logout" class="h-[25px] w-[25px]"/>
          </span>
        </li>

      </ul>
      
      <!-- FriendList container -->
      <div id="friendlist-container"></div>
    `;

    return div;
  }

  private bindEvents(): void {
    // Profile navigation
    const profileOption = this.element.querySelector('#profile-option');
    profileOption?.addEventListener('click', () => {
      router.navigate('/profile');
      this.onClose();
    });

    // Friends popup
    const friendsOption = this.element.querySelector('#friends-option');
    friendsOption?.addEventListener('click', () => this.openFriends());

    // Logout
    const logoutOption = this.element.querySelector('#logout-option');
    logoutOption?.addEventListener('click', () => this.handleLogout());

  }

  private openFriends(): void {
    this.onClose(); // Fermer le menu d'abord comme React
    
    // Créer et afficher FriendListModal en overlay (pas de navigation)
    if (!this.friendListInstance) {
      this.friendListInstance = new FriendListModal({
        onClose: () => {
          // Callback pour fermer
          this.friendListInstance = undefined;
        }
      });
    }
    
    // Attacher à document.body (portal pattern)
    document.body.appendChild(this.friendListInstance.getElement());
    
  }

  private async handleLogout(): Promise<void> {
    try {
      await authManager.logout();
      router.navigate('/');
    } catch (error) {
      console.error('❌ Options: Logout failed:', error);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.friendListInstance) {
      this.friendListInstance.destroy();
    }
    
    this.element.remove();
  }
}