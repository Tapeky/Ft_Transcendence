import { Friend, apiService } from '../../../shared/services/api';
import { chatService, Conversation } from '../services/ChatService';
import { getAvatarUrl } from '../../../shared/utils/avatar';

export interface ChatFriendsListOptions {
  friends: Friend[];
  onChatWithFriend: (friend: Friend) => void;
}

export class ChatFriendsList {
  private element: HTMLElement;
  private friends: Friend[];
  private onChatWithFriend: (friend: Friend) => void;

  constructor(options: ChatFriendsListOptions) {
    this.friends = options.friends;
    this.onChatWithFriend = options.onChatWithFriend;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center gap-4 w-full px-4';

    if (this.friends.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center mt-4">
          NO FRIENDS TO CHAT WITH
          <img src="/src/img/ouin.gif" alt="OUIN" class="w-[300px]"/>
          <div class="text-sm text-gray-300 mt-2">Add friends to start chatting</div>
        </div>
      `;
    } else {
      this.friends.forEach(friend => container.appendChild(this.createChatFriendItem(friend)));
    }

    return container;
  }

  private createChatFriendItem(friend: Friend): HTMLElement {
    const item = document.createElement('div');
    item.className =
      'border-white border-2 min-h-[120px] w-full flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden';
    item.innerHTML = `
      <div class="flex items-center justify-center min-w-[120px]">
        <img 
          id="avatar-img"
          src="${getAvatarUrl(friend.avatar_url)}" 
          alt="icon" 
          class="h-[90px] w-[90px] border-2"
        />
      </div>
      <div class="leading-none flex flex-col gap-1 flex-grow overflow-hidden">
        <h2 class="mt-2 text-[2rem]">${friend.display_name || friend.username}</h2>
        <h2 class="text-[1.5rem]">${friend.username}</h2>
      </div>
      <div class="min-w-[110px] flex flex-col pl-2">
        <div class="flex-1 flex justify-start items-center ml-1">
          <h2 class="text-[1.5rem]">${friend.is_online ? 'Online' : 'Offline'}</h2>
        </div>
        <div class="flex-1 flex justify-evenly items-start mt-1">
          <button id='invite-btn' class="border-2 min-h-[40px] px-4 bg-blue-600 hover:bg-blue-700 border-black mb-4 text-white rounded">Invite</button>
          <button id='chat-btn' class="border-2 min-h-[40px] px-4 mx-2 bg-green-600 hover:bg-green-700 border-black mb-4 text-white rounded">Chat</button>
        </div>
      </div>
    `;

    item.querySelector('#invite-btn')?.addEventListener('click', () => this.inviteToPong?.(friend));
    item.querySelector('#chat-btn')?.addEventListener('click', () => this.onChatWithFriend(friend));

    return item;
  }

  public updateFriends(friends: Friend[]): void {
    this.friends = friends;
    this.element.replaceWith(this.createElement());
  }

  private async inviteToPong(friend: Friend): Promise<void> {
    try {
      const inviteBtn = this.element.querySelector('#invite-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = true;
      }

      const result = await apiService.inviteFriendToPong(friend.id);

      if (result.success) {
        this.showNotification(`Invitation sent to ${friend.username}!`, 'success');
      } else {
        this.showNotification(result.message || "Erreur lors de l'envoi de l'invitation", 'error');
      }
    } catch (error) {
      console.error('❌ Failed to invite friend to pong:', error);
      this.showNotification("Invitation failed", 'error');
    } finally {
      const inviteBtn = this.element.querySelector('#invite-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = false;
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[100] px-4 py-2 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-0 ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('opacity-100');
    }, 10);

    setTimeout(() => {
      notification.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }


  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    this.element.remove();
  }
}
