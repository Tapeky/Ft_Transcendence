import { apiService } from '../../../shared/services/api';
import { authManager } from '../../../core/auth/AuthManager';

export class AddFriend {
  private element: HTMLElement;
  private status: string = 'ok';
  private showStatus: boolean = false;
  private statusTimer?: NodeJS.Timeout;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mx-3 mb-4 border-b-2 z-50';

    container.innerHTML = `
      <div class="flex items-start">
        <h2 class="flex-1">Add friend</h2>
        <h3 id="status-message" class="${this.status === 'ok' ? 'text-green-500' : 'text-orange-500'} ${this.showStatus ? 'block' : 'hidden'} flex-1">
          ${this.getStatusMessage()}
        </h3>
      </div>

      <div class="flex items-center">
        <input 
          id="nameInput" 
          type="text" 
          class="rounded-md mr-3 mb-5 text-black indent-4 w-[330px] focus:ring-2 focus:ring-blue-500" 
          maxlength="12"
          placeholder="Username..."
          aria-label="Enter username to add as friend"
          aria-describedby="status-message"
        />
        <button 
          id="add-btn" 
          class="rounded-md border-[2px] px-3 hover:scale-110 ml-4 mb-5 focus:ring-2 focus:ring-blue-500"
          aria-label="Send friend request">
          ADD
        </button>
      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    const addBtn = this.element.querySelector('#add-btn');
    const nameInput = this.element.querySelector('#nameInput') as HTMLInputElement;

    addBtn?.addEventListener('click', () => this.addFriend());

    nameInput?.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.addFriend();
      }
    });
  }

  private async addFriend(): Promise<void> {
    const nameInput = this.element.querySelector('#nameInput') as HTMLInputElement;
    if (!nameInput) return;

    const username = nameInput.value.trim();
    const currentUser = authManager.getCurrentUser();

    if (username.length < 3) {
      this.setStatus('len');
      return;
    }

    if (username === currentUser?.username) {
      this.setStatus('self');
      return;
    }

    try {
      const users = await apiService.searchUsers(username);
      const foundUser = users.find(user => user.username === username);

      if (!foundUser) {
        this.setStatus('ko');
        return;
      }

      await apiService.sendFriendRequest(foundUser.id);

      this.setStatus('ok');
      nameInput.value = '';
    } catch (error) {
      console.error('Failed to send friend request:', error);
      this.setStatus('ko');
    }
  }

  private setStatus(newStatus: string): void {
    this.status = newStatus;
    this.showStatus = true;
    this.updateStatusDisplay();

    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }

    this.statusTimer = setTimeout(() => {
      this.showStatus = false;
      this.updateStatusDisplay();
    }, 5000);
  }

  private updateStatusDisplay(): void {
    const statusMessage = this.element.querySelector('#status-message');
    if (!statusMessage) return;

    if (this.showStatus) {
      statusMessage.classList.remove('hidden');
      statusMessage.classList.add('block');
    } else {
      statusMessage.classList.add('hidden');
      statusMessage.classList.remove('block');
    }

    statusMessage.className = `${this.status === 'ok' ? 'text-green-500' : 'text-orange-500'} ${this.showStatus ? 'block' : 'hidden'} flex-1`;
    statusMessage.textContent = this.getStatusMessage();
  }

  private getStatusMessage(): string {
    switch (this.status) {
      case 'ok':
        return 'Request sent !';
      case 'ko':
        return 'User not found';
      case 'len':
        return '3 characters min';
      case 'self':
        return "Can't add yourself";
      default:
        return '';
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }

    this.element.remove();
  }
}
