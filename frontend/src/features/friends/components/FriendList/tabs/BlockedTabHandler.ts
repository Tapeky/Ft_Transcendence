import { apiService } from '../../../../../shared/services/api';
import { getAvatarUrl } from '../../../../../shared/utils/avatar';
import { BlockedUser, TabHandlerConfig } from '../types';

export class BlockedTabHandler {
  private container: Element;
  private blockedUsers: BlockedUser[] = [];
  private onRefresh?: () => void;

  constructor(config: TabHandlerConfig) {
    this.container = config.container;
    this.onRefresh = config.onRefresh;
  }

  async initialize(): Promise<void> {
    await this.fetchAndRenderBlockedUsers();
  }

  private async fetchAndRenderBlockedUsers(): Promise<void> {
    try {
      this.blockedUsers = await apiService.getBlockedUsers();
      this.renderBlockedContent();
    } catch (error) {
      console.error('❌ Failed to fetch blocked users:', error);
      this.renderErrorMessage('Failed to load blocked users');
    }
  }

  private renderBlockedContent(): void {
    this.container.innerHTML = '';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col w-full px-4 gap-2';

    if (this.blockedUsers.length === 0) {
      this.renderNoBlockedUsersMessage(contentDiv);
    } else {
      this.renderBlockedUsers(contentDiv);
    }

    this.container.appendChild(contentDiv);
  }

  private renderNoBlockedUsersMessage(container: Element): void {
    container.innerHTML = '<div class="text-center text-white p-4">No one in there :)</div>';
  }

  private renderBlockedUsers(container: Element): void {
    this.blockedUsers.forEach(user => {
      const blockedElement = this.createBlockedItem(user);
      container.appendChild(blockedElement);
    });
  }

  private createBlockedItem(user: BlockedUser): HTMLElement {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 p-2 text-white border-b border-gray-600 w-full';
    
    item.innerHTML = `
      <img src="${getAvatarUrl(user.avatar_url)}" alt="avatar" class="w-[40px] h-[40px] border-2 border-white"/>
      <div class="flex flex-col flex-grow">
        <span class="text-[1rem]">${user.display_name || user.username}</span>
        <span class="text-[0.8rem] text-gray-300">@${user.username}</span>
      </div>
      <button class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm" data-user-id="${user.id}">
        Unblock
      </button>
    `;

    this.bindUnblockAction(item, user);
    return item;
  }

  private bindUnblockAction(item: HTMLElement, user: BlockedUser): void {
    const unblockBtn = item.querySelector('button');
    unblockBtn?.addEventListener('click', async () => {
      try {
        await apiService.unblockUser(user.id);
        item.remove();
        
        // Update local state
        this.blockedUsers = this.blockedUsers.filter(u => u.id !== user.id);
        
        // If no more blocked users, show empty message
        if (this.blockedUsers.length === 0) {
          this.renderBlockedContent();
        }
      } catch (error) {
        console.error('❌ Failed to unblock user:', error);
      }
    });
  }

  private renderErrorMessage(message: string): void {
    this.container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center text-white p-4';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }

  async refresh(): Promise<void> {
    await this.fetchAndRenderBlockedUsers();
    // Note: onRefresh callback removed to prevent infinite loop
  }

  getBlockedUsers(): BlockedUser[] {
    return [...this.blockedUsers];
  }

  destroy(): void {
    // No specific cleanup needed for this handler
  }
}