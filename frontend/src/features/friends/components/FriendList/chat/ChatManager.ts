import { chatService } from '../../../services/ChatService';
import { authManager } from '../../../../../core/auth/AuthManager';
import { ChatState, MessageEvent, Conversation, Message, User } from '../types';

type ChatEventListener = (data: MessageEvent) => void;

export class ChatManager {
  private state: ChatState = {
    conversations: [],
    currentConversation: null,
    messages: [],
    allMessages: new Map(),
    chatView: 'friends',
    initialized: false
  };

  private currentUser: User | null = null;
  private messageReceivedHandler?: ChatEventListener;
  private messageSentHandler?: ChatEventListener;
  private conversationsUpdatedHandler?: (conversations: Conversation[]) => void;
  
  // ✅ Event system for UI updates
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.currentUser = authManager.getCurrentUser();
  }

  // ✅ Event subscription methods
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  async initialize(): Promise<void> {
    if (this.state.initialized) {
      return;
    }

    try {
      await chatService.connect();
      this.setupChatEvents();
      this.state.initialized = true;
      console.log('💬 ChatManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ChatManager:', error);
      throw error;
    }
  }

  private setupChatEvents(): void {
    if (this.messageReceivedHandler) {
      return; // Already setup
    }

    this.messageReceivedHandler = (data: MessageEvent) => {
      this.handleMessageReceived(data);
    };

    this.messageSentHandler = (data: MessageEvent) => {
      this.handleMessageSent(data);
    };

    this.conversationsUpdatedHandler = (conversations: Conversation[]) => {
      this.state.conversations = conversations;
    };

    chatService.on('message_received', this.messageReceivedHandler);
    chatService.on('message_sent', this.messageSentHandler);
    chatService.on('conversations_updated', this.conversationsUpdatedHandler);
  }

  private handleMessageReceived(data: MessageEvent): void {
    const { message, conversation } = data;

    // Update conversations list
    const index = this.state.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      this.state.conversations[index] = conversation;
    } else {
      this.state.conversations.unshift(conversation);
    }

    // Store message
    const conversationMessages = this.state.allMessages.get(conversation.id) || [];
    const existingMessage = conversationMessages.find(m => m.id === message.id);

    if (!existingMessage) {
      conversationMessages.push(message);
      this.state.allMessages.set(conversation.id, conversationMessages);

      // Update current conversation if active
      if (this.state.currentConversation?.id === conversation.id) {
        this.state.messages = conversationMessages;
        
        // ✅ Emit event to notify UI components
        this.emit('messages_updated', {
          conversationId: conversation.id,
          messages: this.state.messages
        });
      }
    }
  }

  private handleMessageSent(data: MessageEvent): void {
    const { message, conversation } = data;

    // Update conversations list
    const index = this.state.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      this.state.conversations[index] = conversation;
    } else {
      this.state.conversations.unshift(conversation);
    }

    // Store message if not duplicate
    const conversationMessages = this.state.allMessages.get(conversation.id) || [];
    const existingMessage = conversationMessages.find(m => m.id === message.id);

    if (!existingMessage) {
      conversationMessages.push(message);
      this.state.allMessages.set(conversation.id, conversationMessages);

      // Update current conversation if active
      if (this.state.currentConversation?.id === conversation.id) {
        this.state.messages = conversationMessages;
        
        // ✅ Emit event to notify UI components
        this.emit('messages_updated', {
          conversationId: conversation.id,
          messages: this.state.messages
        });
      }
    }
  }

  async openConversation(friendId: number): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation = await chatService.createOrGetConversation(friendId);
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    this.state.currentConversation = conversation;
    const loadedMessages = await chatService.loadConversationMessages(conversation.id);
    const localMessages = this.state.allMessages.get(conversation.id) || [];
    
    // Merge and deduplicate messages
    const allMessages = this.mergeMessages(loadedMessages, localMessages);
    
    this.state.messages = allMessages;
    this.state.allMessages.set(conversation.id, allMessages);
    this.state.chatView = 'conversation';

    return { conversation, messages: allMessages };
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

  switchToFriendsView(): void {
    this.state.chatView = 'friends';
    this.state.currentConversation = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getState(): ChatState {
    return { ...this.state };
  }

  getOtherUserInConversation(): any {
    if (!this.state.currentConversation || !this.currentUser?.id) {
      return null;
    }
    return chatService.getOtherUserInConversation(this.state.currentConversation, this.currentUser.id);
  }

  destroy(): void {
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

    this.state.initialized = false;
  }
}