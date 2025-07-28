import { getAvatarUrl } from '../../utils/avatar';
import { FriendOptions } from './FriendOptions';
import { router } from '../../app/Router';
import { apiService } from '../../services/api';

// FriendItem - Reproduction exacte de la version React
// Avatar + Display name + Username + Online status + Chat/Options buttons + FriendOptions modal

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
    
    console.log('👥 FriendItem: Initialized with React-like behavior');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `${this.isVisible ? 'block' : 'hidden'} ${this.isOptionsOpen ? 'z-[55]' : 'z-[50]'} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`;

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
          
          <!-- Game Invite Button -->
          <button id="invite-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black hover:bg-blue-100 transition">
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

    // Game invite button - send game invitation
    inviteBtn?.addEventListener('click', () => {
      this.sendGameInvite();
    });

    // Chat button - navigate to chat (React NavLink behavior)
    chatBtn?.addEventListener('click', () => {
      router.navigate(`/chat/${this.props.id}`);
      console.log(`👥 FriendItem: Navigating to chat with ${this.props.username}`);
    });

    // Options button - open FriendOptions modal
    optionsBtn?.addEventListener('click', () => this.openOptions());

  }

  private async sendGameInvite(): Promise<void> {
    try {
      console.log(`✈️ FriendItem: Sending game invite to ${this.props.username}`);
      
      // Envoyer l'invitation via l'API
      await apiService.sendGameInvite(this.props.id);
      
      console.log('✅ Game invite sent successfully!');
      alert(`✈️ Game invite sent to ${this.props.username}!`);
      
    } catch (error) {
      console.error('❌ Error sending game invite:', error);
      alert(`Erreur lors de l'envoi de l'invitation: ${error}`);
    }
  }

  private openOptions(): void {
    this.isOptionsOpen = true;
    this.updateZIndex();

    // Create FriendOptions instance (modal overlay)
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

    // Attach to document.body (portal pattern like React)
    document.body.appendChild(this.friendOptionsInstance.getElement());

    console.log(`👥 FriendItem: Options opened for ${this.props.username}`);
  }

  private closeOptions(): void {
    this.isOptionsOpen = false;
    this.updateZIndex();

    if (this.friendOptionsInstance) {
      this.friendOptionsInstance.destroy();
      this.friendOptionsInstance = undefined;
    }

    console.log(`👥 FriendItem: Options closed for ${this.props.username}`);
  }

  private dismissItem(): void {
    // React behavior: setVisible(false) - hide the item
    this.isVisible = false;
    this.updateVisibility();
    
    // Also close options if open
    if (this.isOptionsOpen) {
      this.closeOptions();
    }

    console.log(`👥 FriendItem: Item dismissed for ${this.props.username}`);
  }

  private updateVisibility(): void {
    if (this.isVisible) {
      this.element.classList.remove('hidden');
      this.element.classList.add('block');
    } else {
      this.element.classList.add('hidden');
      this.element.classList.remove('block');
    }
  }

  private updateZIndex(): void {
    // Update z-index based on options state (React className logic)
    this.element.className = `${this.isVisible ? 'block' : 'hidden'} ${this.isOptionsOpen ? 'z-[55]' : 'z-[50]'} border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800 relative`;
  }

  // Public method to update props (if needed)
  public updateProps(newProps: Partial<FriendItemProps>): void {
    this.props = { ...this.props, ...newProps };
    
    // Re-render with new props
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
    
    console.log(`👥 FriendItem: Destroyed for ${this.props.username} (React-like)`);
    this.element.remove();
  }
}