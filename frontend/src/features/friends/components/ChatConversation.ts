import { chatService, Conversation, Message } from '../services/ChatService';
import { authManager } from '../../../core/auth/AuthManager';

export interface ChatConversationOptions {
  conversation: Conversation;
  currentUser: any;
  messages?: Message[];
  onBack: () => void;
  onMessageSent?: (message: Message) => void;
}

export class ChatConversation {
  private element: HTMLElement;
  private conversation: Conversation;
  private currentUser: any;
  private messages: Message[] = [];
  private onBack: () => void;
  private onMessageSent?: (message: Message) => void;

  constructor(options: ChatConversationOptions) {
    this.conversation = options.conversation;
    this.currentUser = options.currentUser;
    this.onBack = options.onBack;
    this.onMessageSent = options.onMessageSent;
    this.messages = options.messages || [];
    this.element = this.createElement();
    this.bindEvents();
    
    if (options.messages && options.messages.length > 0) {
      this.renderMessages();
      this.scrollToBottom();
    } else {
      this.loadMessages();
    }
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col w-full h-full';
    
    container.innerHTML = `
      <div class="bg-gray-700 p-2 border-b border-gray-600">
        <button id="back-to-friends" class="text-white text-sm hover:text-blue-400 flex items-center gap-2">
          ← Back to Friends
        </button>
      </div>
      
      <div class="flex-1 flex flex-col bg-gray-900">
        <div id="chat-header" class="bg-gray-700 p-2 border-b border-gray-600 text-white text-sm">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">
              ${this.getOtherUser().username?.charAt(0).toUpperCase() || '?'}
            </div>
            <span id="chat-username">${this.getOtherUser().username || 'Unknown'}</span>
          </div>
        </div>
        
        <div id="messages-container" class="flex-1 overflow-y-auto p-2">
          <div id="messages-list" class="space-y-2"></div>
        </div>
        
        <div id="message-input-area" class="bg-gray-700 p-2 border-t border-gray-600">
          <div class="flex gap-2">
            <input id="message-input" type="text" placeholder="Type a message..." 
                   class="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <button id="send-btn" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm">
              Send
            </button>
          </div>
        </div>
      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    const backBtn = this.element.querySelector('#back-to-friends');
    backBtn?.addEventListener('click', this.onBack);

    const messageInput = this.element.querySelector('#message-input') as HTMLInputElement;
    const sendBtn = this.element.querySelector('#send-btn');
    
    const sendMessage = () => {
      const content = messageInput?.value.trim();
      if (!content) return;
      
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

  private async loadMessages(): Promise<void> {
    try {
      this.messages = await chatService.loadConversationMessages(this.conversation.id);
      this.renderMessages();
      this.scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
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

  private async sendMessage(content: string): Promise<void> {
    try {
      const otherUser = this.getOtherUser();
      await chatService.sendMessage(otherUser.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
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

  private getOtherUser() {
    return chatService.getOtherUserInConversation(this.conversation, this.currentUser?.id);
  }

  public addMessage(message: Message): void {
    if (!this.messages.find(m => m.id === message.id)) {
      this.messages.push(message);
      this.renderMessages();
      this.scrollToBottom();
    }
  }

  public updateMessages(messages: Message[]): void {
    this.messages = messages;
    this.renderMessages();
    this.scrollToBottom();
  }

  public updateConversation(conversation: Conversation): void {
    this.conversation = conversation;
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
