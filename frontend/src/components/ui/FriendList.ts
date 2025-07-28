import { apiService, Friend } from '../../services/api';
import { AddFriend } from './AddFriend';
import { BlockList } from './BlockList';
import { Requests } from './Requests';
import { FriendItem } from './FriendItem';
import { getAvatarUrl } from '../../utils/avatar';
import { chatService, Conversation, Message } from '../../services/ChatService';
import { authManager } from '../../auth/AuthManager';

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
  
  // Chat state  
  private conversations: Conversation[] = [];
  private currentConversation: Conversation | null = null;
  private messages: Message[] = [];
  private currentUser: any = null;
  private chatView: 'friends' | 'conversation' = 'friends'; // État de la vue chat
  
  // Navigation cleanup
  private originalPushState?: typeof history.pushState;
  private originalReplaceState?: typeof history.replaceState;
  private navigationCleanup?: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.currentUser = authManager.getCurrentUser();
    this.element = this.createElement();
    this.bindEvents();
    this.initializeComponents();
    this.fetchFriends();
    this.setupNavigationListener();
    
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

  private setupNavigationListener(): void {
    // Écouter les changements de route pour fermer automatiquement la modal
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const closeOnNavigation = () => {
      // Se fermer si on navigue vers une autre page
      console.log('👥 FriendList: Navigation détectée, fermeture automatique');
      this.close();
    };
    
    // Override pushState pour détecter les navigations
    history.pushState = function(state, title, url) {
      const result = originalPushState.call(this, state, title, url);
      closeOnNavigation();
      return result;
    };
    
    // Override replaceState pour détecter les navigations  
    history.replaceState = function(state, title, url) {
      const result = originalReplaceState.call(this, state, title, url);
      closeOnNavigation();
      return result;
    };
    
    // Écouter les événements popstate (bouton retour)
    window.addEventListener('popstate', closeOnNavigation);
    
    // Nettoyer les listeners quand on détruit le composant
    this.originalPushState = originalPushState;
    this.originalReplaceState = originalReplaceState;
    this.navigationCleanup = closeOnNavigation;
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
    
    // Si on passe à l'onglet chat, remettre la vue des amis
    if (tab === 'chat') {
      this.chatView = 'friends';
      this.currentConversation = null;
    }
    
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
    // Initialiser le chat service si pas déjà fait
    await this.initializeChat();
    
    if (this.chatView === 'friends') {
      // Vue liste des amis (comme l'onglet Friends)
      await this.renderChatFriendsList(container);
    } else if (this.chatView === 'conversation') {
      // Vue conversation (interface chat complète)
      await this.renderChatConversation(container);
    }
  }

  private async renderChatFriendsList(container: Element): Promise<void> {
    // Fetch les amis comme dans l'onglet Friends
    await this.fetchFriends();
    
    // Conteneur principal pour les amis
    const friendsListContainer = document.createElement('div');
    friendsListContainer.className = 'flex flex-col items-center gap-4 w-full px-4';
    
    if (this.friends.length === 0) {
      // Pas d'amis - même style que l'onglet Friends
      const noFriendsDiv = document.createElement('div');
      noFriendsDiv.className = 'flex flex-col items-center mt-4';
      noFriendsDiv.innerHTML = `
        NO FRIENDS TO CHAT WITH
        <img src="/src/img/ouin.gif" alt="OUIN" class="w-[300px]"/>
        <div class="text-sm text-gray-300 mt-2">Add friends to start chatting</div>
      `;
      friendsListContainer.appendChild(noFriendsDiv);
    } else {
      // Liste des amis avec boutons Chat
      this.friends.forEach(friend => {
        const friendChatItem = this.createChatFriendItem(friend);
        friendsListContainer.appendChild(friendChatItem);
      });
    }
    
    container.appendChild(friendsListContainer);
  }

  private createChatFriendItem(friend: Friend): HTMLElement {
    const item = document.createElement('div');
    item.className = 'border-white border-2 min-h-[120px] w-full flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden';
    
    item.innerHTML = `
      <!-- Avatar Section -->
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(friend.avatar_url)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <!-- Content Section -->
      <div class="flex flex-col flex-grow">
        <h2 class="mt-2 flex-grow text-white">${friend.display_name || friend.username}</h2>
        <div class="text-sm text-gray-300">@${friend.username}</div>
        <div class="text-xs text-gray-400 mt-1">
          ${friend.is_online ? '🟢 Online' : '🔴 Offline'}
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-2 items-end ml-12">
          <button class="invite-btn border-2 min-h-[40px] px-4 bg-blue-600 hover:bg-blue-700 border-black mb-4 self-end text-white text-sm rounded">
            ✈️ Invite
          </button>
          <button class="chat-btn border-2 min-h-[40px] px-4 bg-green-600 hover:bg-green-700 border-black mb-4 self-end text-white text-sm rounded">
            💬 Chat
          </button>
        </div>
      </div>
    `;

    // Bind click events
    const inviteBtn = item.querySelector('.invite-btn');
    inviteBtn?.addEventListener('click', async () => {
      await this.sendGameInviteToFriend(friend);
    });

    const chatBtn = item.querySelector('.chat-btn');
    chatBtn?.addEventListener('click', async () => {
      await this.openChatWithFriend(friend);
    });

    return item;
  }

  private async sendGameInviteToFriend(friend: Friend): Promise<void> {
    try {
      console.log(`✈️ Sending game invite to ${friend.username}`);
      
      // Envoyer l'invitation via l'API
      await apiService.sendGameInvite(friend.id);
      
      console.log('✅ Game invite sent successfully!');
      alert(`✈️ Game invite sent to ${friend.username}!`);
      
    } catch (error) {
      console.error('❌ Error sending game invite:', error);
      alert(`Erreur lors de l'envoi de l'invitation: ${error}`);
    }
  }

  private async openChatWithFriend(friend: Friend): Promise<void> {
    try {
      // Créer ou récupérer la conversation avec cet ami
      const conversation = await chatService.createOrGetConversation(friend.id);
      this.currentConversation = conversation;
      
      // Charger les messages de cette conversation
      this.messages = await chatService.loadConversationMessages(conversation.id);
      
      // Passer en vue conversation
      this.chatView = 'conversation';
      
      // Re-render l'onglet chat avec la vue conversation
      await this.renderCurrentTab();
      
      console.log(`💬 Opened chat with ${friend.username}`);
    } catch (error) {
      console.error('❌ Error opening chat with friend:', error);
    }
  }

  private async renderChatConversation(container: Element): Promise<void> {
    // Bouton retour vers la liste des amis
    const backButton = document.createElement('div');
    backButton.className = 'bg-gray-700 p-2 border-b border-gray-600';
    backButton.innerHTML = `
      <button id="back-to-friends" class="text-white text-sm hover:text-blue-400 flex items-center gap-2">
        ← Back to Friends
      </button>
    `;
    
    // Layout du chat (comme avant mais sans sidebar)
    const chatContainer = document.createElement('div');
    chatContainer.className = 'flex flex-col w-full h-full';
    
    const messagesArea = document.createElement('div');
    messagesArea.className = 'flex-1 flex flex-col bg-gray-900';
    messagesArea.innerHTML = `
      <!-- Header de la conversation -->
      <div id="chat-header" class="bg-gray-700 p-2 border-b border-gray-600 text-white text-sm">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">
            ${this.getOtherUserInConversation()?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <span id="chat-username">${this.getOtherUserInConversation()?.username || 'Unknown'}</span>
        </div>
      </div>
      
      <!-- Messages -->
      <div id="messages-container" class="flex-1 overflow-y-auto p-2">
        <div id="messages-list" class="space-y-2"></div>
      </div>
      
      <!-- Input de message -->
      <div id="message-input-area" class="bg-gray-700 p-2 border-t border-gray-600">
        <div class="flex gap-2">
          <input id="message-input" type="text" placeholder="Type a message..." 
                 class="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button id="send-btn" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm">
            Send
          </button>
        </div>
      </div>
    `;
    
    chatContainer.appendChild(backButton);
    chatContainer.appendChild(messagesArea);
    container.appendChild(chatContainer);
    
    // Bind events
    this.bindChatEvents();
    
    // Bind back button
    const backBtn = container.querySelector('#back-to-friends');
    backBtn?.addEventListener('click', () => {
      this.chatView = 'friends';
      this.currentConversation = null;
      this.renderCurrentTab();
    });
    
    // Render messages
    this.renderMessages();
    this.scrollToBottom();
  }
  
  private getOtherUserInConversation() {
    if (!this.currentConversation) return null;
    return chatService.getOtherUserInConversation(this.currentConversation, this.currentUser?.id);
  }

  // ============ Chat Methods ============
  
  private async initializeChat(): Promise<void> {
    try {
      await chatService.connect();
      this.setupChatEvents();
      console.log('💬 Chat initialized in FriendList');
    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
    }
  }
  
  private setupChatEvents(): void {
    // Message reçu
    chatService.on('message_received', (data: { message: Message; conversation: Conversation }) => {
      this.handleMessageReceived(data);
    });
    
    // Message envoyé confirmé
    chatService.on('message_sent', (data: { message: Message; conversation: Conversation }) => {
      this.handleMessageSent(data);
    });
    
    // Conversations mises à jour
    chatService.on('conversations_updated', (conversations: Conversation[]) => {
      this.conversations = conversations;
      this.renderConversationsList();
    });
  }
  
  private handleMessageReceived(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    // Mettre à jour la conversation dans la liste
    const index = this.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      this.conversations[index] = conversation;
    } else {
      this.conversations.unshift(conversation);
    }
    
    // Si c'est la conversation active, ajouter le message
    if (this.currentConversation && this.currentConversation.id === conversation.id) {
      this.messages.push(message);
      this.renderMessages();
      this.scrollToBottom();
    }
    
    this.renderConversationsList();
  }
  
  private handleMessageSent(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    // Le message est déjà affiché (envoyé en optimistic)
    // Juste mettre à jour la conversation
    const index = this.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      this.conversations[index] = conversation;
      this.renderConversationsList();
    }
  }
  
  private async loadConversations(): Promise<void> {
    try {
      this.conversations = await chatService.loadConversations();
      this.renderConversationsList();
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
    }
  }
  
  private renderConversationsList(): void {
    const listContainer = this.element.querySelector('#conversations-list');
    if (!listContainer) return;
    
    if (this.conversations.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center text-gray-400 p-4 text-xs">
          No conversations yet<br>
          Start chatting with your friends!
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = this.conversations.map(conversation => {
      const otherUser = chatService.getOtherUserInConversation(conversation, this.currentUser?.id);
      const isActive = this.currentConversation?.id === conversation.id;
      
      return `
        <div class="conversation-item ${isActive ? 'bg-blue-600' : 'hover:bg-gray-700'} p-2 cursor-pointer border-b border-gray-600" 
             data-conversation-id="${conversation.id}">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white">
              ${otherUser.username.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-white text-xs font-medium truncate">${otherUser.username}</div>
              <div class="text-gray-300 text-xs truncate">
                ${conversation.last_message || 'No messages yet'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Bind click events
    listContainer.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = parseInt(item.getAttribute('data-conversation-id') || '0');
        this.selectConversation(conversationId);
      });
    });
  }
  
  private async selectConversation(conversationId: number): Promise<void> {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    try {
      this.currentConversation = conversation;
      this.messages = await chatService.loadConversationMessages(conversationId);
      
      this.renderChatHeader();
      this.renderMessages();
      this.showChatArea();
      this.renderConversationsList(); // Re-render pour highlight
      this.scrollToBottom();
    } catch (error) {
      console.error('❌ Error selecting conversation:', error);
    }
  }
  
  private renderChatHeader(): void {
    if (!this.currentConversation) return;
    
    const header = this.element.querySelector('#chat-header');
    const username = this.element.querySelector('#chat-username');
    
    const otherUser = chatService.getOtherUserInConversation(this.currentConversation, this.currentUser?.id);
    
    if (username) username.textContent = otherUser.username;
    header?.classList.remove('hidden');
  }
  
  private renderMessages(): void {
    const messagesList = this.element.querySelector('#messages-list');
    if (!messagesList) return;
    
    messagesList.innerHTML = this.messages.map(message => {
      const isOwn = message.sender_id === this.currentUser?.id;
      
      return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[70%] ${isOwn ? 'bg-blue-600' : 'bg-gray-700'} text-white rounded-lg px-3 py-1">
            <div class="text-xs">${message.content}</div>
            <div class="text-xs text-gray-300 mt-1">
              ${this.formatMessageTime(message.created_at)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  private showChatArea(): void {
    this.element.querySelector('#no-conversation')?.classList.add('hidden');
    this.element.querySelector('#messages-list')?.classList.remove('hidden');
    this.element.querySelector('#message-input-area')?.classList.remove('hidden');
  }
  
  private bindChatEvents(): void {
    // Send message
    const messageInput = this.element.querySelector('#message-input') as HTMLInputElement;
    const sendBtn = this.element.querySelector('#send-btn');
    
    const sendMessage = () => {
      const content = messageInput?.value.trim();
      if (!content || !this.currentConversation) return;
      
      this.sendMessage(content);
      messageInput.value = '';
    };
    
    sendBtn?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  private async sendMessage(content: string): Promise<void> {
    if (!this.currentConversation) return;
    
    try {
      const otherUser = chatService.getOtherUserInConversation(this.currentConversation, this.currentUser?.id);
      
      // Affichage optimiste
      const optimisticMessage: Message = {
        id: Date.now(),
        conversation_id: this.currentConversation.id,
        sender_id: this.currentUser?.id || 0,
        content: content,
        type: 'text',
        created_at: new Date().toISOString(),
        username: this.currentUser?.username || 'You',
        avatar_url: this.currentUser?.avatar_url,
        display_name: this.currentUser?.display_name
      };
      
      this.messages.push(optimisticMessage);
      this.renderMessages();
      this.scrollToBottom();
      
      // Envoyer via WebSocket
      await chatService.sendMessage(otherUser.id, content);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }
  
  private scrollToBottom(): void {
    const messagesContainer = this.element.querySelector('#messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  private formatMessageTime(timestamp: string): string {
    return chatService.formatMessageTime(timestamp);
  }
  
  // ============ End Chat Methods ============

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
    
    // Clean up chat service events
    chatService.off('message_received', () => {});
    chatService.off('message_sent', () => {});
    chatService.off('conversations_updated', () => {});
    
    // Clean up navigation listeners
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
    if (this.navigationCleanup) {
      window.removeEventListener('popstate', this.navigationCleanup);
    }

    if (this.element.parentNode) {
      this.element.remove();
    }
    
    console.log('👥 FriendList: Destroyed with all components (React-like)');
  }
}