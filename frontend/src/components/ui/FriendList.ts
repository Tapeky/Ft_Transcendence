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
    container.className = `${this.visible ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-start pt-20 text-white transition-opacity duration-200`;
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'friends-title');

    container.innerHTML = `
      <!-- Modal principal -->
      <div class="flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[500px] max-w-[90vw] h-[600px] max-h-[90vh] border-[5px] border-black text-[2rem] box-border font-iceland select-none transform transition-transform duration-300 ease-out">
        
        <!-- Screen reader title -->
        <h1 id="friends-title" class="sr-only">Friends Management</h1>
        
        <!-- Header zone for buttons -->
        <div class="flex justify-between items-center h-[60px] w-full flex-shrink-0 px-4 py-2">
          <!-- Left buttons group -->
          <div id="left-buttons" class="flex gap-2 items-center">
            <!-- Refresh Button -->
            <button id="refresh-btn" 
                    class="border-2 h-[40px] w-[40px] bg-white border-black hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" 
                    aria-label="Refresh friends list" 
                    title="Refresh">
              <img src="/src/img/refresh.svg" alt="refresh" />
            </button>
            <!-- BlockList and Requests buttons will be inserted here -->
          </div>

          <!-- Right button -->
          <button id="close-btn" 
                  class="w-[40px] h-[40px] bg-white border-2 border-black text-black text-[1.5rem] hover:bg-gray-200 focus:ring-2 focus:ring-blue-500" 
                  aria-label="Close friends list" 
                  title="Close">
            ×
          </button>
        </div>

        <!-- Components will be injected here by initializeComponents() -->
        <div id="components-container"></div>

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
    const closeButton = this.element.querySelector('#close-btn');
    closeButton?.addEventListener('click', () => this.close());

    // Refresh button
    const refreshBtn = this.element.querySelector('#refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refreshList());

    // Click outside to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // Keyboard accessibility - Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.close();
      }
    });

    // Focus management - focus close button on open
    const closeBtnFocus = this.element.querySelector('#close-btn') as HTMLButtonElement;
    if (closeBtnFocus) {
      setTimeout(() => closeBtnFocus.focus(), 100);
    }

  }

  private initializeComponents(): void {
    const leftButtonsContainer = this.element.querySelector('#left-buttons');
    const componentsContainer = this.element.querySelector('#components-container');
    if (!leftButtonsContainer || !componentsContainer) return;

    // Create component instances
    this.blockListInstance = new BlockList();
    this.requestsInstance = new Requests();
    this.addFriendInstance = new AddFriend();

    // Add buttons to header (properly positioned)
    leftButtonsContainer.appendChild(this.blockListInstance.getButtonElement());
    leftButtonsContainer.appendChild(this.requestsInstance.getButtonElement());

    // Add dropdown containers to components area
    componentsContainer.appendChild(this.blockListInstance.getDropdownElement());
    componentsContainer.appendChild(this.requestsInstance.getDropdownElement());
    componentsContainer.appendChild(this.addFriendInstance.getElement());

    console.log('👥 FriendList: All components initialized with proper positioning');
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