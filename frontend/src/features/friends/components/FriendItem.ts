import { getAvatarUrl } from '../../../shared/utils/avatar';
import { FriendOptions } from './FriendOptions';
import { router } from '../../../core/app/Router';
import { apiService } from '../../../shared/services/api';
import { GameManager } from '../../../services/GameManager';

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

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `${this.isVisible ? 'block' : 'hidden'} ${this.isOptionsOpen ? 'z-[55]' : 'z-[50]'} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`;

    container.innerHTML = `
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(this.props.avatar)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>
      <div class="leading-none flex flex-col gap-1 flex-grow overflow-hidden">
        <h2 class="mt-2">${this.props.displayName}</h2>
        <h2 class="text-[1.5rem]">${this.props.username}</h2>
      </div>
      <div class="min-w-[110px] flex flex-col pl-2">
        <div class="flex-1 flex justify-start items-center ml-1">
          <h2 class="text-[1.5rem]">${this.props.is_online ? 'Online' : 'Offline'}</h2>
        </div>
        <div class="flex-1 flex justify-evenly items-start mt-1">
          <button 
            id="invite-btn" 
            data-invite-user="${this.props.id}"
            data-invite-username="${this.props.username}"
            class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black hover:bg-blue-100 hover:scale-110 transition">
            <img src="/src/img/paper-plane-icon-free-vector-1131209362.jpg" alt="invite to game" class="w-[36px] h-[36px] m-auto" />
          </button>
          <button id="options-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
            <img src="/src/img/plus.svg" alt="more" />
          </button>
        </div>
      </div>
      <div id="friend-options-container"></div>
    `;

    return container;
  }

  private bindEvents(): void {
    const inviteBtn = this.element.querySelector('#invite-btn');
    const optionsBtn = this.element.querySelector('#options-btn');

    inviteBtn?.addEventListener('click', () => this.handleGameInvite());
    optionsBtn?.addEventListener('click', () => this.openOptions());
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

  private async handleGameInvite(): Promise<void> {
    try {
      const gameManager = GameManager.getInstance();
      await gameManager.initialize();

      const inviteId = await gameManager.sendGameInvite(this.props.id, this.props.username);
      console.log(`🎮 Game invite sent to ${this.props.username} (ID: ${inviteId})`);

      // Visual feedback
      const inviteBtn = this.element.querySelector('#invite-btn') as HTMLButtonElement;
      if (inviteBtn) {
        const img = inviteBtn.querySelector('img');
        const originalSrc = img?.src;

        // Change to checkmark or success indicator
        inviteBtn.style.backgroundColor = '#065f46'; // dark green
        inviteBtn.disabled = true;

        if (img) {
          img.style.filter = 'brightness(0) invert(1)'; // Make icon white
        }

        setTimeout(() => {
          inviteBtn.style.backgroundColor = 'white';
          inviteBtn.disabled = false;
          if (img) {
            img.style.filter = 'none'; // Reset icon color
          }
        }, 3000);
      }

    } catch (error) {
      console.error('Error sending game invite:', error);
      alert(`Erreur lors de l'envoi de l'invitation: ${error}`);
    }
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
    this.element.classList.toggle('hidden', !this.isVisible);
    this.element.classList.toggle('block', this.isVisible);
  }

  private updateZIndex(): void {
    this.element.className = `${this.isVisible ? 'block' : 'hidden'} ${this.isOptionsOpen ? 'z-[55]' : 'z-[50]'} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`;
  }

  public updateProps(newProps: Partial<FriendItemProps>): void {
    this.props = { ...this.props, ...newProps };
    
    const newElement = this.createElement();
    this.element.parentNode?.replaceChild(newElement, this.element);
    this.element = newElement;
    this.bindEvents();
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
