import { getAvatarUrl } from '../../../shared/utils/avatar';
import { FriendOptions } from './FriendOptions';
import { router } from '../../../core/app/Router';
import { apiService } from '../../../shared/services/api';

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

    inviteBtn?.addEventListener('click', () => this.inviteToPong());
    optionsBtn?.addEventListener('click', () => this.openOptions());
  }

  private async inviteToPong(): Promise<void> {
    try {
      const inviteBtn = this.element.querySelector('#invite-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = true;
        inviteBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mx-auto"></div>';
      }

      const result = await apiService.inviteFriendToPong(this.props.id);
      
      if (result.success) {
        this.showNotification(`Invitation envoyée à ${this.props.username}!`, 'success');
      } else {
        this.showNotification(result.message || 'Erreur lors de l\'envoi de l\'invitation', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to invite friend to pong:', error);
      this.showNotification('Erreur lors de l\'envoi de l\'invitation', 'error');
    } finally {
      // Restaurer le bouton
      const inviteBtn = this.element.querySelector('#invite-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = false;
        inviteBtn.innerHTML = '<img src="/src/img/paper-plane-icon-free-vector-1131209362.jpg" alt="invite to game" class="w-[36px] h-[36px] m-auto" />';
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[100] px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-0 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation d'apparition
    setTimeout(() => {
      notification.classList.add('opacity-100');
    }, 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
      notification.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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
