import { apiService, Friend } from '../../../../../shared/services/api';
import { ChatConversation } from '../../ChatConversation';
import { ChatFriendsList } from '../../ChatFriendsList';
import { ChatManager } from '../chat/ChatManager';
import { TabHandlerConfig } from '../types';

export class ChatTabHandler {
  private container: Element;
  private chatManager: ChatManager;
  private chatConversation?: ChatConversation;
  private chatFriendsList?: ChatFriendsList;
  private onRefresh?: () => void;

  private messagesUpdatedHandler?: (data: { conversationId: number; messages: any[] }) => void;
  private conversationUpdatedHandler?: (data: { conversation: any }) => void;

  constructor(config: TabHandlerConfig, chatManager: ChatManager) {
    this.container = config.container;
    this.chatManager = chatManager;

    window.addEventListener('friendsListRefresh', () => {
      this.refreshFriendsList();
    });
    this.onRefresh = config.onRefresh;
  }

  async initialize(): Promise<void> {
    await this.chatManager.initialize();

    this.messagesUpdatedHandler = data => {
      const chatState = this.chatManager.getState();
      if (chatState.chatView === 'conversation' && this.chatConversation) {
        this.chatConversation.updateMessages(data.messages);
      }
    };

    this.conversationUpdatedHandler = data => {
      const chatState = this.chatManager.getState();
      if (chatState.chatView === 'conversation' && this.chatConversation) {
        this.chatConversation.updateConversation(data.conversation);
      }
    };

    this.chatManager.on('messages_updated', this.messagesUpdatedHandler);
    this.chatManager.on('conversation_updated', this.conversationUpdatedHandler);

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

  private async refreshFriendsList(): Promise<void> {
    if (this.chatFriendsList) {
      await this.renderChatFriendsList();
    }
  }

  async renderChatFriendsList(): Promise<void> {
    this.container.innerHTML = '';

    if (this.chatFriendsList) {
      this.chatFriendsList.destroy();
    }

    try {
      const friends = await apiService.getFriends();

      this.chatFriendsList = new ChatFriendsList({
        friends: friends,
        onChatWithFriend: (friend: Friend) => this.openChatWithFriend(friend),
        onGameInvite: (friend: Friend) => this.inviteFriendToGame(friend),
      });

      this.container.appendChild(this.chatFriendsList.getElement());
    } catch (error) {
      console.error('Failed to load friends for chat:', error);
      this.renderErrorMessage('Failed to load friends for chat');
    }
  }

  private async renderChatConversation(): Promise<void> {
    this.container.innerHTML = '';

    const chatState = this.chatManager.getState();
    if (!chatState.currentConversation) {
      return;
    }

    if (this.chatConversation) {
      this.chatConversation.destroy();
    }

    this.chatConversation = new ChatConversation({
      conversation: chatState.currentConversation,
      currentUser: this.chatManager.getCurrentUser(),
      messages: chatState.messages,
      onBack: () => {
        this.chatManager.switchToFriendsView();
        this.renderChatContent();
      },
      onMessageSent: message => {},
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
      await this.renderChatContent();
    } catch (error) {
      console.error('❌ Error opening chat with friend:', error);
    }
  }

  private async inviteFriendToGame(friend: Friend): Promise<void> {
    try {
      const result = await apiService.inviteFriendToPong(friend.id);

      if (result.success) {
        console.log(`✅ Invitation sent to ${friend.username}`);
      } else {
        console.error(`❌ Failed to invite ${friend.username}:`, result.message);
      }
    } catch (error) {
      console.error('❌ Failed to invite friend to pong:', error);
    }
  }

  private renderErrorMessage(message: string): void {
    this.container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center text-white p-4';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }

  updateMessages(): void {
    const chatState = this.chatManager.getState();

    if (chatState.chatView === 'conversation' && this.chatConversation) {
      this.chatConversation.updateMessages(chatState.messages);
    }
  }

  async refresh(): Promise<void> {
    await this.renderChatContent();
  }

  switchToFriendsView(): void {
    this.chatManager.switchToFriendsView();
    this.renderChatContent();
  }

  getCurrentConversation(): any {
    return this.chatManager.getState().currentConversation;
  }

  destroy(): void {
    if (this.messagesUpdatedHandler) {
      this.chatManager.off('messages_updated', this.messagesUpdatedHandler);
      this.messagesUpdatedHandler = undefined;
    }

    if (this.conversationUpdatedHandler) {
      this.chatManager.off('conversation_updated', this.conversationUpdatedHandler);
      this.conversationUpdatedHandler = undefined;
    }

    if (this.chatConversation) {
      this.chatConversation.destroy();
      this.chatConversation = undefined;
    }

    if (this.chatFriendsList) {
      this.chatFriendsList.destroy();
      this.chatFriendsList = undefined;
    }
  }
}
