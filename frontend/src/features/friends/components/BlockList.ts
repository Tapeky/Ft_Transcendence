import { apiService, User } from '../../../shared/services/api';

export class BlockList {
  private element: HTMLElement;
  private buttonElement?: HTMLElement;
  private dropdownElement?: HTMLElement;
  private isListVisible: boolean = false;
  private blockedUsers: User[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'block-list-container';

    this.buttonElement = document.createElement('button');
    this.buttonElement.id = 'toggle-btn';
    this.buttonElement.className =
      'border-2 h-[40px] w-[40px] bg-white border-black hover:bg-gray-100';
    this.buttonElement.setAttribute('title', 'Blocked Users');
    this.buttonElement.innerHTML = '<img src="/src/img/blocklist.svg" alt="block list" />';

    this.dropdownElement = document.createElement('div');
    this.dropdownElement.id = 'blocked-dropdown';
    this.dropdownElement.className = `${this.isListVisible ? 'flex' : 'hidden'} bg-blue-800 border-black border-2 h-[400px] w-[350px] absolute top-[70px] left-[-350px] flex-col items-center z-[45]`;
    this.dropdownElement.innerHTML = `
      <h2 class="text-white border-b-2 border-white">Blocked users</h2>
      <div id="blocked-content" class="flex flex-col overflow-auto w-full"></div>
    `;

    container.appendChild(this.buttonElement);
    container.appendChild(this.dropdownElement);

    return container;
  }

  private bindEvents(): void {
    this.buttonElement?.addEventListener('click', () => this.toggleList());
  }

  private async toggleList(): Promise<void> {
    this.isListVisible = !this.isListVisible;
    this.updateVisibility();
    if (this.isListVisible) {
      await this.fetchBlockedUsers();
    }
  }

  private updateVisibility(): void {
    if (!this.dropdownElement) return;
    if (this.isListVisible) {
      this.dropdownElement.classList.remove('hidden');
      this.dropdownElement.classList.add('flex');
    } else {
      this.dropdownElement.classList.add('hidden');
      this.dropdownElement.classList.remove('flex');
    }
  }

  private async fetchBlockedUsers(): Promise<void> {
    try {
      const data = await apiService.getBlockedUsers();
      this.blockedUsers = data;
      this.renderBlockedUsers();
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    }
  }

  private renderBlockedUsers(): void {
    const content = this.dropdownElement?.querySelector('#blocked-content');
    if (!content) return;
    content.innerHTML = '';
    if (this.blockedUsers.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.textContent = 'No one in there :)';
      emptyDiv.className = 'text-center text-white p-4';
      content.appendChild(emptyDiv);
    } else {
      this.blockedUsers.forEach(user => {
        const blockedUserElement = this.createBlockedUserItem(user);
        content.appendChild(blockedUserElement);
      });
    }
  }

  private createBlockedUserItem(user: User): HTMLElement {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 p-2 text-white border-b border-gray-600 w-full';
    item.innerHTML = `
      <img src="${user.avatar_url || '/src/img/default-avatar.png'}" alt="avatar" class="w-[40px] h-[40px] border-2 border-white"/>
      <div class="flex flex-col flex-grow">
        <span class="text-[1rem]">${user.display_name || user.username}</span>
        <span class="text-[0.8rem] text-gray-300">@${user.username}</span>
      </div>
      <button class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm" data-user-id="${user.id}">
        Unblock
      </button>
    `;
    const unblockBtn = item.querySelector('button');
    unblockBtn?.addEventListener('click', () => this.unblockUser(user.id));
    return item;
  }

  private async unblockUser(userId: number): Promise<void> {
    try {
      await apiService.unblockUser(userId);
      await this.fetchBlockedUsers();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  }

  public async refresh(): Promise<void> {
    if (this.isListVisible) {
      await this.fetchBlockedUsers();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getButtonElement(): HTMLElement {
    return this.buttonElement!;
  }

  getDropdownElement(): HTMLElement {
    return this.dropdownElement!;
  }

  destroy(): void {
    this.element.remove();
  }
}
