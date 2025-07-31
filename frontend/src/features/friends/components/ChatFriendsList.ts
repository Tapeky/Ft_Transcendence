import { Friend, apiService } from '../../../shared/services/api';
import { chatService, Conversation } from '../services/ChatService';
import { getAvatarUrl } from '../../../shared/utils/avatar';

export interface ChatFriendsListOptions {
  friends: Friend[];
  onChatWithFriend: (friend: Friend) => void;
  onGameInvite?: (friend: Friend) => void;
}

export class ChatFriendsList {
  private element: HTMLElement;
  private friends: Friend[];
  private onChatWithFriend: (friend: Friend) => void;
  private onGameInvite?: (friend: Friend) => void;

  constructor(options: ChatFriendsListOptions) {
    this.friends = options.friends;
    this.onChatWithFriend = options.onChatWithFriend;
    this.onGameInvite = options.onGameInvite;
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
      this.friends.forEach(friend => {
        const friendItem = this.createChatFriendItem(friend);
        container.appendChild(friendItem);
      });
    }
    
    return container;
  }

  private createChatFriendItem(friend: Friend): HTMLElement {
    const item = document.createElement('div');
    item.className = 'border-white border-2 min-h-[120px] w-full flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden';
    
    item.innerHTML = `
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(friend.avatar_url)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <div class="flex flex-col flex-grow">
        <h2 class="mt-2 flex-grow text-white">${friend.display_name || friend.username}</h2>
        <div class="text-sm text-gray-300">@${friend.username}</div>
        <div class="text-xs text-gray-400 mt-1">
          ${friend.is_online ? '🟢 Online' : '🔴 Offline'}
        </div>
        
        <div class="flex gap-2 items-end ml-12">
          <button class="invite-btn border-2 min-h-[40px] px-4 bg-blue-600 hover:bg-blue-700 border-black mb-4 text-white text-sm rounded">
            ✈️ Invite
          </button>
          <button class="chat-btn border-2 min-h-[40px] px-4 bg-green-600 hover:bg-green-700 border-black mb-4 text-white text-sm rounded">
            💬 Chat
          </button>
        </div>
      </div>
    `;

    // Bind events
    const inviteBtn = item.querySelector('.invite-btn');
    inviteBtn?.addEventListener('click', () => {
      if (this.onGameInvite) {
        this.onGameInvite(friend);
      }
    });

    const chatBtn = item.querySelector('.chat-btn');
    chatBtn?.addEventListener('click', () => {
      this.onChatWithFriend(friend);
    });

    return item;
  }

  public updateFriends(friends: Friend[]): void {
    this.friends = friends;
    this.element.replaceWith(this.createElement());
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.element.parentNode) {
      this.element.remove();
    }
  }
}