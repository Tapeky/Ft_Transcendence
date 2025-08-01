import { getAvatarUrl } from '../../../shared/utils/avatar';
import { FriendOptions } from './FriendOptions';
import { router } from '../../../core/app/Router';
import { gameInviteService } from '../../invitations/services/GameInviteService';

export interface FriendItemProps {
  username: string;
  displayName: string;
  avatar: string | null;
  is_online: boolean;
  id: number;
}

export class FriendItem {
  private element: HTMLElement;
  private props: FriendItemProps;
  private isVisible: boolean = true;
  private isOptionsOpen: boolean = false;
  private friendOptionsInstance?: FriendOptions;

  constructor(props: FriendItemProps) {
    this.props = props;
    this.element = this.createElement();
    this.bindEvents();
  }

  private getContainerClasses(): string {
    const visibility = this.isVisible ? 'block' : 'hidden';
    const zIndex = this.isOptionsOpen ? 'z-[55]' : 'z-[50]';
    return `${visibility} ${zIndex} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`;
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();

    container.innerHTML = `
      <!-- Avatar Section -->
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(this.props.avatar)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <!-- User Info Section -->
      <div class="leading-none flex flex-col gap-1 flex-grow overflow-hidden">
        <h2 class="mt-2">${this.props.displayName}</h2>
        <h2 class="text-[1.5rem]">${this.props.username}</h2>
      </div>

      <!-- Actions Section -->
      <div class="min-w-[110px] flex flex-col pl-2">
        
        <!-- Online Status -->
        <div class="flex-1 flex justify-start items-center ml-1">
          <h2 class="text-[1.5rem]">${this.props.is_online ? 'Online' : 'Offline'}</h2>
        </div>

        <!-- Action Buttons -->
        <div class="flex-1 flex justify-evenly items-start mt-1">
          
          <!-- Game Invite Button - KISS Integration -->
          <button 
            id="invite-btn" 
            data-invite-user="${this.props.id}"
            data-invite-username="${this.props.username}"
            class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black hover:bg-blue-100 hover:scale-110 transition">
            <img src="/src/img/paper-plane-icon-free-vector-1131209362.jpg" alt="invite to game" class="w-[36px] h-[36px] m-auto" />
          </button>

          <!-- Chat Button -->
          <button id="chat-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
            <img src="/src/img/chat.svg" alt="chat" />
          </button>

          <!-- Options Button -->
          <button id="options-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
            <img src="/src/img/plus.svg" alt="more" />
          </button>

        </div>
      </div>

      <!-- FriendOptions container (modal will be injected here) -->
      <div id="friend-options-container"></div>
    `;

    return container;
  }

  private bindEvents(): void {
    const inviteBtn = this.element.querySelector('#invite-btn');
    const chatBtn = this.element.querySelector('#chat-btn');
    const optionsBtn = this.element.querySelector('#options-btn');

    inviteBtn?.addEventListener('click', () => {
      this.sendGameInvite();
    });

    chatBtn?.addEventListener('click', () => {
      router.navigate(`/chat/${this.props.id}`);
    });

    optionsBtn?.addEventListener('click', () => this.openOptions());

  }

  private async sendGameInvite(): Promise<void> {
    try {
      if (!gameInviteService.isConnected()) {
        alert('Service d\'invitations non connecté. Veuillez rafraîchir la page.');
        return;
      }
      
      gameInviteService.sendInvite(this.props.id);
      alert(`✈️ Game invite sent to ${this.props.username}!`);
      
    } catch (error) {
      alert(`Erreur lors de l'envoi de l'invitation: ${error}`);
    }
  }

  private openOptions(): void {
    this.isOptionsOpen = true;
    this.updateZIndex();

    if (!this.friendOptionsInstance) {
      this.friendOptionsInstance = new FriendOptions({
        username: this.props.username,
        displayName: this.props.displayName,
        avatar: this.props.avatar,
        id: this.props.id,
        isOpen: this.isOptionsOpen,
        setIsOpen: () => this.closeOptions(),
        setDismiss: () => this.dismissItem()
      });
    }

    document.body.appendChild(this.friendOptionsInstance.getElement());
  }

  private closeOptions(): void {
    this.isOptionsOpen = false;
    this.updateZIndex();

    if (this.friendOptionsInstance) {
      this.friendOptionsInstance.destroy();
      this.friendOptionsInstance = undefined;
    }
  }

  private dismissItem(): void {
    this.isVisible = false;
    this.updateVisibility();
    
    if (this.isOptionsOpen) {
      this.closeOptions();
    }
  }

  private updateVisibility(): void {
    this.element.className = this.getContainerClasses();
  }

  private updateZIndex(): void {
    this.element.className = this.getContainerClasses();
  }

  public updateProps(newProps: Partial<FriendItemProps>): void {
    const hasChanged = Object.keys(newProps).some(key => 
      this.props[key as keyof FriendItemProps] !== newProps[key as keyof FriendItemProps]
    );
    
    if (!hasChanged) return;
    
    this.props = { ...this.props, ...newProps };
    
    if (newProps.displayName) {
      const displayNameEl = this.element.querySelector('h2');
      if (displayNameEl) displayNameEl.textContent = newProps.displayName;
    }
    
    if (newProps.username) {
      const usernameEl = this.element.querySelector('h2:nth-of-type(2)');
      if (usernameEl) usernameEl.textContent = newProps.username;
    }
    
    if (newProps.avatar !== undefined) {
      const avatarEl = this.element.querySelector('img');
      if (avatarEl) avatarEl.src = getAvatarUrl(newProps.avatar);
    }
    
    if (newProps.is_online !== undefined) {
      const statusEl = this.element.querySelector('.text-\\[1\\.5rem\\]');
      if (statusEl) statusEl.textContent = newProps.is_online ? 'Online' : 'Offline';
    }
    
    if (newProps.id) {
      const inviteBtn = this.element.querySelector('#invite-btn');
      if (inviteBtn) {
        inviteBtn.setAttribute('data-invite-user', newProps.id.toString());
        inviteBtn.setAttribute('data-invite-username', newProps.username || this.props.username);
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.friendOptionsInstance) {
      this.friendOptionsInstance.destroy();
    }
    
    this.element.remove();
  }
}