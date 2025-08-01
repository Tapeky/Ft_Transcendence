import { apiService, Friend } from '../../../../../shared/services/api';
import { ChatConversation } from '../../ChatConversation';
import { ChatFriendsList } from '../../ChatFriendsList';
import { ChatManager } from '../chat/ChatManager';
import { TabHandlerConfig } from '../types';
import { gameInviteService } from '../../../../invitations/services/GameInviteService';

export class ChatTabHandler {
  private container: Element;
  private chatManager: ChatManager;
  private chatConversation?: ChatConversation;
  private chatFriendsList?: ChatFriendsList;
  private onRefresh?: () => void;
  
  // ✅ Event handler for messages updates
  private messagesUpdatedHandler?: (data: { conversationId: number; messages: any[] }) => void;

  constructor(config: TabHandlerConfig, chatManager: ChatManager) {
    this.container = config.container;
    this.chatManager = chatManager;
    this.onRefresh = config.onRefresh;
  }

  async initialize(): Promise<void> {
    await this.chatManager.initialize();
    
    // ✅ Setup event listener for message updates
    this.messagesUpdatedHandler = (data) => {
      
      // If we're in conversation view and it's the right conversation
      const chatState = this.chatManager.getState();
      if (chatState.chatView === 'conversation' && this.chatConversation) {
        this.chatConversation.updateMessages(data.messages);
      }
    };

    this.chatManager.on('messages_updated', this.messagesUpdatedHandler);
    
    await this.renderChatContent();
  }

  private async renderChatContent(): Promise<void> {
    const chatState = this.chatManager.getState();
    
    if (chatState.chatView === 'friends') {
      await this.renderChatFriendsList();
    } else if (chatState.chatView === 'conversation' && chatState.currentConversation) {
      await this.renderChatConversation();
    }
  }

  private async renderChatFriendsList(): Promise<void> {
    this.container.innerHTML = '';

    // Clean up existing chat friends list
    if (this.chatFriendsList) {
      this.chatFriendsList.destroy();
    }

    try {
      // Fetch friends for chat
      const friends = await apiService.getFriends();

      // Create new ChatFriendsList component
      this.chatFriendsList = new ChatFriendsList({
        friends: friends,
        onChatWithFriend: (friend: Friend) => this.openChatWithFriend(friend),
        onGameInvite: (friend: Friend) => this.sendGameInviteToFriend(friend)
      });

      this.container.appendChild(this.chatFriendsList.getElement());
    } catch (error) {
      console.error('❌ Failed to load friends for chat:', error);
      this.renderErrorMessage('Failed to load friends for chat');
    }
  }

  private async renderChatConversation(): Promise<void> {
    this.container.innerHTML = '';

    const chatState = this.chatManager.getState();
    if (!chatState.currentConversation) {
      return;
    }

    // Clean up existing chat conversation
    if (this.chatConversation) {
      this.chatConversation.destroy();
    }

    // Create new ChatConversation component
    this.chatConversation = new ChatConversation({
      conversation: chatState.currentConversation,
      currentUser: this.chatManager.getCurrentUser(),
      messages: chatState.messages,
      onBack: () => {
        this.chatManager.switchToFriendsView();
        this.renderChatContent();
      },
      onMessageSent: (message) => {
      }
    });

    this.container.appendChild(this.chatConversation.getElement());
  }

  private async openChatWithFriend(friend: Friend): Promise<void> {
    if (!friend?.id) {
      console.error('❌ Invalid friend data for chat');
      return;
    }

    try {
      await this.chatManager.openConversation(friend.id);
      await this.renderChatContent(); // Re-render to show conversation
    } catch (error) {
      console.error('❌ Error opening chat with friend:', error);
    }
  }

  private async sendGameInviteToFriend(friend: Friend): Promise<void> {
    if (!friend?.id || !friend?.username) {
      console.error('❌ Invalid friend data for game invite');
      return;
    }

    try {
      // Vérifier que le service KISS est connecté
      if (!gameInviteService.isConnected()) {
        console.error('❌ KISS service not connected');
        alert('Service d\'invitations non connecté. Veuillez rafraîchir la page.');
        return;
      }
      
      // Send game invite via KISS system
      gameInviteService.sendInvite(friend.id);
      alert(`✈️ Game invite sent to ${friend.username}!`);
    } catch (error) {
      console.error('❌ Error sending KISS game invite:', error);
      alert(`Failed to send invitation to ${friend.username}`);
    }
  }

  private renderErrorMessage(message: string): void {
    this.container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center text-white p-4';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }

  // Method called when messages are received/sent to update the current view
  updateMessages(): void {
    const chatState = this.chatManager.getState();
    
    if (chatState.chatView === 'conversation' && this.chatConversation) {
      this.chatConversation.updateMessages(chatState.messages);
    }
  }

  async refresh(): Promise<void> {
    // Refresh current view
    await this.renderChatContent();
    // Note: onRefresh callback removed to prevent infinite loop
  }

  switchToFriendsView(): void {
    this.chatManager.switchToFriendsView();
    this.renderChatContent();
  }

  getCurrentConversation(): any {
    return this.chatManager.getState().currentConversation;
  }

  destroy(): void {
    // ✅ Clean up event listener
    if (this.messagesUpdatedHandler) {
      this.chatManager.off('messages_updated', this.messagesUpdatedHandler);
      this.messagesUpdatedHandler = undefined;
    }

    if (this.chatConversation) {
      this.chatConversation.destroy();
      this.chatConversation = undefined;
    }

    if (this.chatFriendsList) {
      this.chatFriendsList.destroy();
      this.chatFriendsList = undefined;
    }

    // Note: ChatManager is destroyed by the main modal, not here
  }
}