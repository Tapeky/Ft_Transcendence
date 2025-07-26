import { apiService } from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';

// BlockedUser - Reproduction exacte de la version React
// Avatar + Username + Unblock button avec dismiss behavior

export interface BlockedUserProps {
  username: string;
  avatar: string | undefined;
  id: number;
}

export class BlockedUser {
  private element: HTMLElement;
  private props: BlockedUserProps;
  private isVisible: boolean = true;

  constructor(props: BlockedUserProps) {
    this.props = props;
    this.element = this.createElement();
    this.bindEvents();
    
    console.log('🚫 BlockedUser: Initialized with React-like behavior');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `${this.isVisible ? 'block' : 'hidden'} border-white border-2 min-h-[120px] w-[260px] flex bg-pink-800 text-[1.2rem] mt-4 overflow-hidden mx-2`;

    container.innerHTML = `
      <!-- Avatar Section -->
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(this.props.avatar)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <!-- Content Section -->
      <div class="flex flex-col">
        <h2 class="mt-2 flex-grow">${this.props.username}</h2>
        
        <!-- Unblock Button -->
        <button id="unblock-btn" class="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
          <img src="/src/img/unblock.svg" alt="unblock" />
        </button>
      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    const unblockBtn = this.element.querySelector('#unblock-btn');

    // Unblock button click
    unblockBtn?.addEventListener('click', () => this.unblock());

    console.log('🚫 BlockedUser: Event listeners bound (React-like)');
  }

  private async unblock(): Promise<void> {
    try {
      await apiService.unblockUser(this.props.id);
      console.log('User unblocked !');
      this.dismiss();

    } catch (error) {
      console.error('❌ BlockedUser: Failed to unblock user:', error);
    }
  }

  private dismiss(): void {
    // React behavior: setVisible(false) - hide the item
    this.isVisible = false;
    this.updateVisibility();

    console.log(`🚫 BlockedUser: User ${this.props.username} dismissed`);
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

  // Public method to update props (if needed)
  public updateProps(newProps: Partial<BlockedUserProps>): void {
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
    console.log(`🚫 BlockedUser: Destroyed for ${this.props.username} (React-like)`);
    this.element.remove();
  }
}