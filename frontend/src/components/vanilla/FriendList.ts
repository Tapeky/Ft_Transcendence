import { apiService, Friend } from '../../services/api';
import { AddFriend } from './AddFriend';
import { BlockList } from './BlockList';
import { Requests } from './Requests';
import { FriendItem } from './FriendItem';

// FriendList - Reproduction exacte de la version React avec portal pattern
// Overlay modal 500x600px avec CloseBtn, BlockList, Requests, AddFriend + Friends list

export class FriendList {
  private element: HTMLElement;
  private onClose: () => void;
  private friends: Friend[] = [];
  private visible: boolean = true;
  private addFriendInstance?: AddFriend;
  private blockListInstance?: BlockList;
  private requestsInstance?: Requests;
  private friendItems: FriendItem[] = [];

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.element = this.createElement();
    this.bindEvents();
    this.initializeComponents();
    this.fetchFriends();
    
    console.log('👥 FriendList: Initialized with React portal pattern');
  }

  private createElement(): HTMLElement {
    // Portal pattern - overlay sur toute la page
    const container = document.createElement('div');
    container.className = `${this.visible ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-center text-white`;

    container.innerHTML = `
      <!-- Modal principal -->
      <div class="flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 min-w-[500px] h-[600px] border-[5px] border-black text-[2rem] box-border font-iceland select-none">
        
        <!-- Close Button -->
        <button id="close-btn" class="w-[40px] h-[40px] bg-white border-2 border-black absolute right-2 top-2 text-black text-[1.5rem] hover:bg-gray-200">
          ×
        </button>

        <!-- Components will be injected here by initializeComponents() -->
        <div id="components-container"></div>

        <!-- Refresh Button -->
        <button id="refresh-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black absolute ml-[7.2rem] mt-2 mb-0">
          <img src="/src/img/refresh.svg" alt="refresh" />
        </button>

        <!-- Friends List -->
        <div id="friends-list" class="flex-grow overflow-auto flex flex-col items-center gap-4">
          <!-- Friends seront injectés ici -->
        </div>

      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    // Close button
    const closeBtn = this.element.querySelector('#close-btn');
    closeBtn?.addEventListener('click', () => this.close());

    // Refresh button
    const refreshBtn = this.element.querySelector('#refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refreshList());

    // Click outside to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    console.log('👥 FriendList: Event listeners bound (React-like)');
  }

  private initializeComponents(): void {
    const container = this.element.querySelector('#components-container');
    if (!container) return;

    // Create component instances (React component structure)
    this.blockListInstance = new BlockList();
    this.requestsInstance = new Requests();
    this.addFriendInstance = new AddFriend();

    // Inject components into modal (absolute positioned like React)
    container.appendChild(this.blockListInstance.getElement());
    container.appendChild(this.requestsInstance.getElement());
    container.appendChild(this.addFriendInstance.getElement());

    console.log('👥 FriendList: All components initialized (React-like)');
  }

  private async fetchFriends(): Promise<void> {
    try {
      if (this.visible) {
        const data = await apiService.getFriends();
        this.friends = data;
        this.renderFriendsList();
      }
    } catch (error) {
      console.error('❌ FriendList: Failed to fetch friends:', error);
    }
  }

  private renderFriendsList(): void {
    const friendsList = this.element.querySelector('#friends-list');
    if (!friendsList) return;

    // Clear existing content and friend items
    friendsList.innerHTML = '';
    this.destroyFriendItems();

    if (this.friends.length === 0) {
      // No friends case - exact React reproduction
      const noFriendsDiv = document.createElement('div');
      noFriendsDiv.className = 'flex flex-col items-center';
      noFriendsDiv.innerHTML = `
        NO FRIEND
        <img src="/src/img/ouin.gif" alt="OUIN" class="w-[350px]"/>
      `;
      friendsList.appendChild(noFriendsDiv);
    } else {
      // Render friends using FriendItem components
      this.friends.forEach(friend => {
        const friendItem = new FriendItem({
          username: friend.username,
          displayName: friend.display_name,
          avatar: friend.avatar_url,
          is_online: friend.is_online,
          id: friend.id
        });

        this.friendItems.push(friendItem);
        friendsList.appendChild(friendItem.getElement());
      });
    }
  }

  private destroyFriendItems(): void {
    // Clean up all friend item instances
    this.friendItems.forEach(item => item.destroy());
    this.friendItems = [];
  }


  private refreshList(): void {
    console.log('👥 FriendList: Refreshing friends list and all components');
    
    // Refresh main friends list
    this.fetchFriends();
    
    // Refresh child components
    if (this.blockListInstance) {
      this.blockListInstance.refresh();
    }
    if (this.requestsInstance) {
      this.requestsInstance.refresh();
    }
  }

  private close(): void {
    this.visible = false;
    this.element.remove();
    this.onClose();
    console.log('👥 FriendList: Closed (React-like portal pattern)');
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.element.classList.remove('hidden');
      this.element.classList.add('flex');
      this.fetchFriends();
    } else {
      this.element.classList.add('hidden');
      this.element.classList.remove('flex');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    // Clean up all component instances
    this.destroyFriendItems();
    
    if (this.addFriendInstance) {
      this.addFriendInstance.destroy();
    }
    if (this.blockListInstance) {
      this.blockListInstance.destroy();
    }
    if (this.requestsInstance) {
      this.requestsInstance.destroy();
    }

    if (this.element.parentNode) {
      this.element.remove();
    }
    
    console.log('👥 FriendList: Destroyed with all components (React-like)');
  }
}