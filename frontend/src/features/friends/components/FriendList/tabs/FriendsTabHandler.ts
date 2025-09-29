import { apiService, Friend } from '../../../../../shared/services/api';
import { AddFriend } from '../../AddFriend';
import { FriendItem } from '../../FriendItem';
import { TabHandlerConfig } from '../types';

export class FriendsTabHandler {
  private container: Element;
  private friends: Friend[] = [];
  private addFriendInstance?: AddFriend;
  private friendItems: FriendItem[] = [];
  private onRefresh?: () => void;

  constructor(config: TabHandlerConfig) {
    this.container = config.container;
    this.onRefresh = config.onRefresh;
  }

  async initialize(): Promise<void> {
    this.createAddFriendComponent();
    await this.fetchAndRenderFriends();
  }

  private createAddFriendComponent(): void {
    this.addFriendInstance = new AddFriend();
    this.container.appendChild(this.addFriendInstance.getElement());
  }

  private async fetchAndRenderFriends(): Promise<void> {
    try {
      this.friends = await apiService.getFriends();
      this.renderFriendsList();
    } catch (error) {
      console.error('❌ Failed to fetch friends:', error);
      this.renderErrorMessage('Failed to load friends');
    }
  }

  private renderFriendsList(): void {
    const friendsContainer = document.createElement('div');
    friendsContainer.id = 'friends-container';
    friendsContainer.className = 'flex flex-col items-center gap-4 w-full px-4';

    this.clearFriendsList();

    if (this.friends.length === 0) {
      this.renderNoFriendsMessage(friendsContainer);
    } else {
      this.renderFriendItems(friendsContainer);
    }

    this.container.appendChild(friendsContainer);
  }

  private clearFriendsList(): void {
    this.destroyFriendItems();

    const existingContainer = this.container.querySelector('#friends-container');
    if (existingContainer) {
      existingContainer.remove();
    }
  }

  private renderNoFriendsMessage(container: Element): void {
    const noFriendsDiv = document.createElement('div');
    noFriendsDiv.className = 'flex flex-col items-center mt-4';
    noFriendsDiv.innerHTML = `
      NO FRIEND
      <img src="/src/img/ouin.gif" alt="OUIN" class="w-[350px]"/>
    `;
    container.appendChild(noFriendsDiv);
  }

  private renderFriendItems(container: Element): void {
    this.friends.forEach(friend => {
      const friendItem = new FriendItem({
        username: friend.username,
        displayName: friend.display_name,
        avatar: friend.avatar_url,
        is_online: friend.is_online,
        id: friend.id,
      });

      this.friendItems.push(friendItem);
      container.appendChild(friendItem.getElement());
    });
  }

  private renderErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center text-white p-4';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }

  private destroyFriendItems(): void {
    this.friendItems.forEach(item => item.destroy());
    this.friendItems = [];
  }

  async refresh(): Promise<void> {
    await this.fetchAndRenderFriends();
  }

  getFriends(): Friend[] {
    return [...this.friends];
  }

  destroy(): void {
    this.destroyFriendItems();

    if (this.addFriendInstance) {
      this.addFriendInstance.destroy();
      this.addFriendInstance = undefined;
    }
  }
}
