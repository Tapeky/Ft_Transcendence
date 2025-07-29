import { apiService, Friend } from '../../services/api';
import { AddFriend } from './AddFriend';
import { BlockList } from './BlockList';
import { Requests } from './Requests';
import { FriendItem } from './FriendItem';
import { getAvatarUrl } from '../../utils/avatar';
import { chatService, Conversation, Message } from '../../services/ChatService';
import { authManager } from '../../auth/AuthManager';
import { ChatConversation } from './ChatConversation';
import { ChatFriendsList } from './ChatFriendsList';
import { TabManager, TabType } from './TabManager';

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
  private activeTab: TabType = 'friends';
  
  // New component instances
  private tabManager?: TabManager;
  private chatConversation?: ChatConversation;
  private chatFriendsList?: ChatFriendsList;
  
  // Chat state  
  private conversations: Conversation[] = [];
  private currentConversation: Conversation | null = null;
  private messages: Message[] = [];
  private allMessages: Map<number, Message[]> = new Map(); // conversationId -> messages[]
  private currentUser: any = null;
  private chatView: 'friends' | 'conversation' = 'friends'; // État de la vue chat
  
  // Event handlers pour cleanup
  private messageReceivedHandler?: (data: { message: Message; conversation: Conversation }) => void;
  private messageSentHandler?: (data: { message: Message; conversation: Conversation }) => void;
  private conversationsUpdatedHandler?: (conversations: Conversation[]) => void;
  private chatInitialized: boolean = false;
  
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
          <!-- Navigation par onglets (sera remplacé par TabManager) -->
          <div id="tab-navigation" class="flex gap-1">
            <!-- TabManager will be inserted here -->
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

    // Tab navigation handled by TabManager

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

    // Initialize TabManager
    this.tabManager = new TabManager({
      tabs: [
        { id: 'friends', label: 'Friends', active: true },
        { id: 'blocked', label: 'Blocked', active: false },
        { id: 'requests', label: 'Requests', active: false },
        { id: 'chat', label: 'Chat', active: false }
      ],
      onTabChange: (tab: TabType) => this.switchTab(tab)
    });

    // Insert TabManager into navigation area
    const tabNavigation = this.element.querySelector('#tab-navigation');
    if (tabNavigation) {
      tabNavigation.appendChild(this.tabManager.getElement());
    }

    // Initialiser avec l'onglet Friends actif
    this.renderCurrentTab();

  }

  private async fetchFriends(): Promise<void> {
    if (!this.visible) return;
    
    try {
      this.friends = await apiService.getFriends();
      this.renderFriendsList();
    } catch (error) {
      console.error('❌ FriendList: Failed to fetch friends:', error);
    }
  }

  private renderFriendsList(container?: Element): void {
    const friendsList = container || this.element.querySelector('#friends-container');
    if (!friendsList) return;

    this.clearFriendsList(friendsList, container);
    this.destroyFriendItems();

    if (this.friends.length === 0) {
      this.renderNoFriendsMessage(friendsList);
    } else {
      this.renderFriendItems(friendsList);
    }
  }

  private clearFriendsList(friendsList: Element, container?: Element): void {
    if (!container) {
      friendsList.innerHTML = '';
      return;
    }
    
    const addFriendEl = friendsList.querySelector('.add-friend');
    friendsList.innerHTML = '';
    if (addFriendEl) {
      friendsList.appendChild(addFriendEl);
    }
  }

  private renderNoFriendsMessage(friendsList: Element): void {
    const noFriendsDiv = document.createElement('div');
    noFriendsDiv.className = 'flex flex-col items-center mt-4';
    noFriendsDiv.innerHTML = `
      NO FRIEND
      <img src="/src/img/ouin.gif" alt="OUIN" class="w-[350px]"/>
    `;
    friendsList.appendChild(noFriendsDiv);
  }

  private renderFriendItems(friendsList: Element): void {
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

  private destroyFriendItems(): void {
    // Clean up all friend item instances
    this.friendItems.forEach(item => item.destroy());
    this.friendItems = [];
  }


  private switchTab(tab: TabType): void {
    this.activeTab = tab;
    
    // Si on passe à l'onglet chat, remettre la vue des amis
    if (tab === 'chat') {
      this.chatView = 'friends';
      this.currentConversation = null;
    }
    
    this.renderCurrentTab();
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
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    });

    rejectBtn?.addEventListener('click', async () => {
      try {
        await apiService.declineFriendRequest(request.id);
        element.remove();
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    });

    acceptBtn?.addEventListener('click', async () => {
      try {
        await apiService.acceptFriendRequest(request.id);
        element.remove();
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
    
    // Clean up existing chat friends list
    if (this.chatFriendsList) {
      this.chatFriendsList.destroy();
    }
    
    // Create new ChatFriendsList component
    this.chatFriendsList = new ChatFriendsList({
      friends: this.friends,
      onChatWithFriend: (friend: Friend) => this.openChatWithFriend(friend),
      onGameInvite: (friend: Friend) => this.sendGameInviteToFriend(friend)
    });
    
    container.appendChild(this.chatFriendsList.getElement());
  }

  // createChatFriendItem method moved to ChatFriendsList component

  private async sendGameInviteToFriend(friend: Friend): Promise<void> {
    if (!friend?.id || !friend?.username) {
      console.error('❌ Invalid friend data for game invite');
      return;
    }

    try {
      await apiService.sendGameInvite(friend.id);
      alert(`✈️ Game invite sent to ${friend.username}!`);
    } catch (error) {
      console.error('❌ Error sending game invite:', error);
      alert(`Failed to send invitation to ${friend.username}`);
    }
  }

  private async openChatWithFriend(friend: Friend): Promise<void> {
    if (!friend?.id) {
      console.error('❌ Invalid friend data for chat');
      return;
    }

    try {
      const conversation = await chatService.createOrGetConversation(friend.id);
      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      this.currentConversation = conversation;
      const loadedMessages = await chatService.loadConversationMessages(conversation.id);
      const localMessages = this.allMessages.get(conversation.id) || [];
      
      // Merge and deduplicate messages
      const allMessages = this.mergeMessages(loadedMessages, localMessages);
      
      this.messages = allMessages;
      this.allMessages.set(conversation.id, allMessages);
      this.chatView = 'conversation';
      
      await this.renderCurrentTab();
    } catch (error) {
      console.error('❌ Error opening chat with friend:', error);
    }
  }

  private mergeMessages(loadedMessages: Message[], localMessages: Message[]): Message[] {
    const allMessages = [...loadedMessages];
    localMessages.forEach(localMsg => {
      if (!allMessages.find(m => m.id === localMsg.id)) {
        allMessages.push(localMsg);
      }
    });
    
    return allMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  private async renderChatConversation(container: Element): Promise<void> {
    if (!this.currentConversation) return;
    
    // Clean up existing chat conversation
    if (this.chatConversation) {
      this.chatConversation.destroy();
    }
    
    // Create new ChatConversation component
    this.chatConversation = new ChatConversation({
      conversation: this.currentConversation,
      currentUser: this.currentUser,
      messages: this.messages, // Pass current messages to component
      onBack: () => {
        this.chatView = 'friends';
        this.currentConversation = null;
        this.renderCurrentTab();
      },
      onMessageSent: (message: Message) => {
        // Handle message sent callback if needed
        console.log('Message sent:', message);
      }
    });
    
    container.appendChild(this.chatConversation.getElement());
  }
  
  private getOtherUserInConversation() {
    if (!this.currentConversation) return null;
    return chatService.getOtherUserInConversation(this.currentConversation, this.currentUser?.id);
  }

  // ============ Chat Methods ============
  
  private async initializeChat(): Promise<void> {
    // Éviter d'initialiser plusieurs fois
    if (this.chatInitialized) {
      console.log('⚠️ Chat déjà initialisé, on ignore');
      return;
    }
    
    try {
      await chatService.connect();
      this.setupChatEvents();
      this.chatInitialized = true;
      console.log('💬 Chat initialized in FriendList');
    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
    }
  }
  
  private setupChatEvents(): void {
    console.log('🔧 FriendList: setupChatEvents() appelé');
    
    // Vérifier si les handlers sont déjà définis pour éviter les doublons
    if (this.messageReceivedHandler) {
      console.log('⚠️ FriendList: Event listeners déjà configurés, on ignore');
      return;
    }
    
    // Stocker les handlers pour pouvoir les supprimer plus tard
    this.messageReceivedHandler = (data: { message: Message; conversation: Conversation }) => {
      console.log('🔵 FriendList: messageReceivedHandler appelé pour message ID:', data.message.id);
      this.handleMessageReceived(data);
    };
    
    this.messageSentHandler = (data: { message: Message; conversation: Conversation }) => {
      console.log('🟢 FriendList: messageSentHandler appelé pour message ID:', data.message.id);
      this.handleMessageSent(data);
    };
    
    this.conversationsUpdatedHandler = (conversations: Conversation[]) => {
      console.log('🟡 FriendList: conversationsUpdatedHandler appelé');
      this.conversations = conversations;
      // renderConversationsList removed - handled by ChatConversation component
    };

    // S'abonner avec les handlers stockés
    chatService.on('message_received', this.messageReceivedHandler);
    chatService.on('message_sent', this.messageSentHandler);
    chatService.on('conversations_updated', this.conversationsUpdatedHandler);
    
    console.log('✅ FriendList: Event listeners attachés');
  }
  
  private handleMessageReceived(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    console.log('🔍 DEBUG: handleMessageReceived appelé pour message ID:', message.id);

    // Mettre à jour la conversation dans la liste
    const index = this.conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      this.conversations[index] = conversation;
    } else {
      this.conversations.unshift(conversation);
    }
    
    // Stocker le message dans la Map globale des messages
    const conversationMessages = this.allMessages.get(conversation.id) || [];
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    
    if (!existingMessage) {
      conversationMessages.push(message);
      this.allMessages.set(conversation.id, conversationMessages);
      console.log('✅ Message stocké dans allMessages pour conversation', conversation.id);
      
      // Si c'est la conversation active, mettre à jour l'affichage
      if (this.currentConversation && this.currentConversation.id === conversation.id) {
        this.messages = conversationMessages;
        console.log('🔍 DEBUG FriendList: ChatConversation exists?', !!this.chatConversation);
        console.log('🔍 DEBUG FriendList: ChatView is:', this.chatView);
        console.log('🔍 DEBUG FriendList: ActiveTab is:', this.activeTab);
        // Update ChatConversation component if it exists
        if (this.chatConversation) {
          console.log('🔍 DEBUG FriendList: Calling chatConversation.updateMessages');
          this.chatConversation.updateMessages(this.messages);
        }
        console.log('✅ Message affiché dans la conversation active');
      }
    } else {
      console.log('⚠️ Message déjà présent dans allMessages, ignoré');
    }
    
    // renderConversationsList removed - handled by ChatConversation component
  }
  
  private handleMessageSent(data: { message: Message; conversation: Conversation }): void {
    const { message, conversation } = data;
    
    console.log('🔍 DEBUG: handleMessageSent appelé pour message ID:', message.id);

    // Mettre à jour la conversation dans la liste
    const index = this.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      this.conversations[index] = conversation;
    } else {
      this.conversations.unshift(conversation);
    }
    
    // Déduplication simple pour les messages envoyés
    const conversationMessages = this.allMessages.get(conversation.id) || [];
    const existingMessage = conversationMessages.find(m => m.id === message.id);
    
    if (!existingMessage) {
      conversationMessages.push(message);
      this.allMessages.set(conversation.id, conversationMessages);
      
      // Si c'est la conversation active, mettre à jour l'affichage
      if (this.currentConversation && this.currentConversation.id === conversation.id) {
        this.messages = conversationMessages;
        // Update ChatConversation component if it exists
        if (this.chatConversation) {
          console.log('🔍 DEBUG FriendList: Calling chatConversation.updateMessages for sent message');
          this.chatConversation.updateMessages(this.messages);
        }
      }
    }
    
    // renderConversationsList removed - handled by ChatConversation component
  }
  
  // loadConversations method no longer needed with simplified chat flow
  
  // renderConversationsList method no longer needed with ChatConversation component
  
  // selectConversation method no longer needed with ChatConversation component
  
  // renderChatHeader method moved to ChatConversation component
  
  // renderMessages method moved to ChatConversation component
  
  // showChatArea method moved to ChatConversation component
  
  // bindChatEvents method moved to ChatConversation component
  
  // sendMessage method moved to ChatConversation component
  
  // scrollToBottom method moved to ChatConversation component
  
  // formatMessageTime method moved to ChatConversation component
  
  // ============ End Chat Methods ============

  private refreshCurrentTab(): void {
    this.renderCurrentTab();
  }

  private close(): void {
    this.visible = false;
    this.element.remove();
    this.onClose();
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
    this.destroyComponentInstances();
    this.cleanupChatServiceEvents();
    this.cleanupNavigationListeners();
    
    // Reset chat initialization flag
    this.chatInitialized = false;

    if (this.element.parentNode) {
      this.element.remove();
    }
  }

  private destroyComponentInstances(): void {
    const components = [
      this.addFriendInstance,
      this.blockListInstance, 
      this.requestsInstance,
      this.tabManager,
      this.chatConversation,
      this.chatFriendsList
    ];

    components.forEach(component => {
      if (component) {
        component.destroy();
      }
    });
  }

  private cleanupChatServiceEvents(): void {
    const handlers = [
      { event: 'message_received', handler: this.messageReceivedHandler },
      { event: 'message_sent', handler: this.messageSentHandler },
      { event: 'conversations_updated', handler: this.conversationsUpdatedHandler }
    ];

    handlers.forEach(({ event, handler }) => {
      if (handler) {
        chatService.off(event, handler);
      }
    });
  }

  private cleanupNavigationListeners(): void {
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
    if (this.navigationCleanup) {
      window.removeEventListener('popstate', this.navigationCleanup);
    }
  }
}