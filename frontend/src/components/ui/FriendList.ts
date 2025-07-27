import { apiService, Friend } from '../../services/api';
import { AddFriend } from './AddFriend';
import { BlockList } from './BlockList';
import { Requests } from './Requests';
import { FriendItem } from './FriendItem';
import { getAvatarUrl } from '../../utils/avatar';

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
  private activeTab: 'friends' | 'blocked' | 'requests' | 'chat' = 'friends';

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
        
        <!-- Header avec onglets et boutons -->
        <div class="flex justify-between items-center h-[60px] w-full flex-shrink-0 px-4 py-2 border-b-2 border-black">
          <!-- Navigation par onglets -->
          <div class="flex gap-1">
            <button id="tab-friends" class="tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-white text-black rounded-t transition-colors" data-tab="friends">
              Friends
            </button>
            <button id="tab-blocked" class="tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-gray-300 text-gray-600 rounded-t transition-colors" data-tab="blocked">
              Blocked
            </button>
            <button id="tab-requests" class="tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-gray-300 text-gray-600 rounded-t transition-colors" data-tab="requests">
              Requests
            </button>
            <button id="tab-chat" class="tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-gray-300 text-gray-600 rounded-t transition-colors" data-tab="chat">
              Chat
            </button>
          </div>

          <!-- Actions à droite -->
          <div class="flex gap-2 items-center">
            <!-- Refresh Button -->
            <button id="refresh-btn" 
                    class="border-2 h-[40px] w-[40px] bg-white border-black hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" 
                    aria-label="Refresh current tab" 
                    title="Refresh">
              <img src="/src/img/refresh.svg" alt="refresh" />
            </button>
            
            <!-- Close Button -->
            <button id="close-btn" 
                    class="w-[40px] h-[40px] bg-white border-2 border-black text-black text-[1.5rem] hover:bg-gray-200 focus:ring-2 focus:ring-blue-500" 
                    aria-label="Close friends list" 
                    title="Close">
              ×
            </button>
          </div>
        </div>

        <!-- Zone de contenu dynamique -->
        <div id="content-area" class="flex-grow overflow-auto flex flex-col items-center">
          <!-- Le contenu changera selon l'onglet actif -->
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
    refreshBtn?.addEventListener('click', () => this.refreshCurrentTab());

    // Tab navigation
    const tabButtons = this.element.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as 'friends' | 'blocked' | 'requests' | 'chat';
        this.switchTab(tab);
      });
    });

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
    // Create component instances pour les données
    this.blockListInstance = new BlockList();
    this.requestsInstance = new Requests();
    this.addFriendInstance = new AddFriend();

    // Initialiser avec l'onglet Friends actif
    this.renderCurrentTab();

    console.log('👥 FriendList: Components initialized with tab system');
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

  private renderFriendsList(container?: Element): void {
    const friendsList = container || this.element.querySelector('#friends-container');
    if (!friendsList) return;

    // Clear existing content and friend items (mais garder AddFriend si c'est le container principal)
    if (!container) {
      friendsList.innerHTML = '';
    } else {
      // Garder seulement AddFriend, supprimer le reste
      const addFriendEl = friendsList.querySelector('.add-friend');
      friendsList.innerHTML = '';
      if (addFriendEl) {
        friendsList.appendChild(addFriendEl);
      }
    }
    
    this.destroyFriendItems();

    if (this.friends.length === 0) {
      // No friends case - exact React reproduction
      const noFriendsDiv = document.createElement('div');
      noFriendsDiv.className = 'flex flex-col items-center mt-4';
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


  private switchTab(tab: 'friends' | 'blocked' | 'requests' | 'chat'): void {
    this.activeTab = tab;
    this.updateTabButtons();
    this.renderCurrentTab();
    console.log(`👥 FriendList: Switched to ${tab} tab`);
  }

  private updateTabButtons(): void {
    const tabs = this.element.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      const tabName = (tab as HTMLElement).dataset.tab;
      if (tabName === this.activeTab) {
        // Onglet actif
        tab.className = 'tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-white text-black rounded-t transition-colors';
      } else {
        // Onglet inactif
        tab.className = 'tab-btn px-3 py-1 text-[1.2rem] border-2 border-black bg-gray-300 text-gray-600 rounded-t transition-colors';
      }
    });
  }

  private async renderCurrentTab(): Promise<void> {
    const contentArea = this.element.querySelector('#content-area');
    if (!contentArea) return;

    // Clear content
    contentArea.innerHTML = '';

    switch (this.activeTab) {
      case 'friends':
        await this.renderFriendsTab(contentArea);
        break;
      case 'blocked':
        await this.renderBlockedTab(contentArea);
        break;
      case 'requests':
        await this.renderRequestsTab(contentArea);
        break;
      case 'chat':
        await this.renderChatTab(contentArea);
        break;
    }
  }

  private async renderFriendsTab(container: Element): Promise<void> {
    // Ajouter le composant AddFriend en haut
    if (this.addFriendInstance) {
      container.appendChild(this.addFriendInstance.getElement());
    }

    // Fetch et afficher les amis
    await this.fetchFriends();
    
    // Zone pour la liste des amis
    const friendsContainer = document.createElement('div');
    friendsContainer.id = 'friends-container';
    friendsContainer.className = 'flex flex-col items-center gap-4 w-full px-4';
    
    this.renderFriendsList(friendsContainer);
    container.appendChild(friendsContainer);
  }

  private async renderBlockedTab(container: Element): Promise<void> {
    if (!this.blockListInstance) return;
    
    // Fetch blocked users directement
    try {
      const data = await apiService.getBlockedUsers();
      this.renderBlockedContent(container, data);
    } catch (error) {
      console.error('❌ FriendList: Failed to fetch blocked users in tab:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-center text-white p-4';
      errorDiv.textContent = 'Failed to load blocked users';
      container.appendChild(errorDiv);
    }
  }

  private renderBlockedContent(container: Element, blockedUsers: any[]): void {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col w-full px-4 gap-2';

    if (blockedUsers.length === 0) {
      contentDiv.innerHTML = '<div class="text-center text-white p-4">No one in there :)</div>';
    } else {
      blockedUsers.forEach(user => {
        const blockedElement = this.createBlockedItem(user);
        contentDiv.appendChild(blockedElement);
      });
    }

    container.appendChild(contentDiv);
  }

  private createBlockedItem(user: any): HTMLElement {
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

    // Unblock functionality
    const unblockBtn = item.querySelector('button');
    unblockBtn?.addEventListener('click', async () => {
      try {
        await apiService.unblockUser(user.id);
        item.remove();
        console.log('🚫 User unblocked successfully');
      } catch (error) {
        console.error('❌ Failed to unblock user:', error);
      }
    });

    return item;
  }

  private async renderRequestsTab(container: Element): Promise<void> {
    if (!this.requestsInstance) return;
    
    // Fetch requests directement
    try {
      const data = await apiService.getFriendRequests();
      this.renderRequestsContent(container, data);
    } catch (error) {
      console.error('❌ FriendList: Failed to fetch requests in tab:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-center text-white p-4';
      errorDiv.textContent = 'Failed to load requests';
      container.appendChild(errorDiv);
    }
  }

  private renderRequestsContent(container: Element, requests: any[]): void {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col w-full px-4 gap-2';

    if (requests.length === 0) {
      contentDiv.innerHTML = '<div class="text-center text-white p-4">No requests. :(</div>';
    } else {
      requests.forEach(request => {
        const requestElement = this.createRequestItem(request);
        contentDiv.appendChild(requestElement);
      });
    }

    container.appendChild(contentDiv);
  }

  private createRequestItem(request: any): HTMLElement {
    const item = document.createElement('div');
    item.className = 'border-white border-2 min-h-[120px] w-full flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden';
    
    item.innerHTML = `
      <!-- Avatar Section -->
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(request.avatar_url)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <!-- Content Section -->
      <div class="flex flex-col flex-grow">
        <h2 class="mt-2 flex-grow text-white">${request.username}</h2>
        
        <!-- Action Buttons -->
        <div class="flex gap-2 items-end ml-12">
          <button class="block-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
            <img src="/src/img/block.svg" alt="block" />
          </button>
          <button class="reject-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
            <img src="/src/img/reject.svg" alt="reject" />
          </button>
          <button class="accept-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
            <img src="/src/img/accept.svg" alt="accept" />
          </button>
        </div>
      </div>
    `;

    // Bind actions avec event listeners fonctionnels
    this.bindRequestItemActions(item, request);

    return item;
  }

  private bindRequestItemActions(element: HTMLElement, request: any): void {
    const blockBtn = element.querySelector('.block-btn');
    const rejectBtn = element.querySelector('.reject-btn');
    const acceptBtn = element.querySelector('.accept-btn');

    blockBtn?.addEventListener('click', async () => {
      try {
        await apiService.blockUser(request.user_id);
        element.remove();
        console.log('User blocked successfully!');
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    });

    rejectBtn?.addEventListener('click', async () => {
      try {
        await apiService.declineFriendRequest(request.id);
        element.remove();
        console.log('Request rejected!');
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    });

    acceptBtn?.addEventListener('click', async () => {
      try {
        await apiService.acceptFriendRequest(request.id);
        element.remove();
        console.log('Request accepted!');
      } catch (error) {
        console.error('Error accepting request:', error);
      }
    });
  }

  private async renderChatTab(container: Element): Promise<void> {
    // Placeholder pour le chat - à implémenter plus tard
    const chatPlaceholder = document.createElement('div');
    chatPlaceholder.className = 'flex flex-col items-center justify-center h-full text-white text-center';
    chatPlaceholder.innerHTML = `
      <div class="text-[1.5rem] mb-4">💬 Chat</div>
      <div class="text-[1rem] text-gray-300">Chat functionality coming soon...</div>
      <div class="text-[0.8rem] text-gray-400 mt-2">Select a friend to start chatting</div>
    `;
    container.appendChild(chatPlaceholder);
  }

  private refreshCurrentTab(): void {
    console.log(`👥 FriendList: Refreshing ${this.activeTab} tab`);
    this.renderCurrentTab();
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