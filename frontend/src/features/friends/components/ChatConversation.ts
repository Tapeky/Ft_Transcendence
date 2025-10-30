import { chatService, Conversation, Message } from '../services/ChatService';
import { authManager } from '../../../core/auth/AuthManager';
import { apiService } from '../../../shared/services/api';
import { getAvatarUrl } from '../../../shared/utils/avatar';

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
    container.className = 'flex flex-col w-full h-full text-[1.2rem]';

    const otherUser = this.getOtherUser();

    container.innerHTML = `
      <div class="bg-gray-800 p-3 border-b-2 border-blue-600">
        <button id="back-to-friends" class="text-gray-300 hover:text-white flex items-center gap-2">
          ← Back to Friends
        </button>
      </div>

      <div class="flex-1 flex flex-col bg-gray-900">
        <div id="chat-header" class="bg-gray-800 px-4 py-3 border-b-2 border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="${getAvatarUrl(otherUser.avatar)}"
                   alt="${otherUser.username}"
                   class="w-12 h-12 rounded-full border-2 border-white object-cover"
                   onerror="this.src='/default-avatar.png'" />
              <h3 id="chat-username" class="text-white text-[1.6rem] font-bold">${otherUser.username || 'Unknown'}</h3>
            </div>

            <button id="invite-to-pong-btn"
                    class="bg-green-600 hover:bg-green-700 active:bg-green-800
                           px-4 py-2 border-2 border-white text-white font-bold text-[1.1rem]
                           transition-colors">
              Invite to Pong
            </button>
          </div>
        </div>

        <div id="messages-container" class="flex-1 overflow-y-auto p-4 bg-gray-900">
          <div id="messages-list" class="space-y-3"></div>
        </div>

        <div id="message-input-area" class="bg-gray-800 p-4 border-t-2 border-gray-700">
          <div class="flex gap-2">
            <input id="message-input"
                   type="text"
                   placeholder="Type a message..."
                   class="flex-1 bg-gray-900 text-white px-3 py-2 border-2 border-gray-600
                          focus:outline-none focus:border-blue-500 placeholder-gray-500" />
            <button id="send-btn"
                    class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                           px-4 py-2 border-2 border-white text-white font-bold transition-colors">
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

    const inviteBtn = this.element.querySelector('#invite-to-pong-btn');
    inviteBtn?.addEventListener('click', () => this.inviteToPong());

    const messageInput = this.element.querySelector('#message-input') as HTMLInputElement;
    const sendBtn = this.element.querySelector('#send-btn');

    const sendMessage = () => {
      const content = messageInput?.value.trim();
      if (!content) return;

      this.sendMessage(content);
      messageInput.value = '';
    };

    sendBtn?.addEventListener('click', sendMessage);
    messageInput?.addEventListener('keypress', e => {
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

    const otherUser = this.getOtherUser();

    messagesList.innerHTML = this.messages
      .map(message => {
        const isOwn = message.sender_id === this.currentUser?.id;

        if (message.type === 'game_invite') {
          let metadata: any = {};
          try {
            metadata = message.metadata ? JSON.parse(message.metadata) : {};
          } catch (e) {
            console.error('Failed to parse invite metadata', e);
          }

          const inviteId = metadata.inviteId || '';
          const isOwn = message.sender_id === this.currentUser?.id;

          return `
            <div class="flex justify-center my-3">
              <div class="bg-green-700 border-2 border-green-500 text-white px-4 py-3 rounded-lg max-w-[80%]">
                <div class="text-center font-bold text-[1.3rem]">🏓 Pong Invitation</div>
                <div class="text-center mt-1">${isOwn ? 'You' : message.username} invited ${isOwn ? message.username : 'you'} to play!</div>
                <div class="text-[0.9rem] text-green-200 mt-1 text-center">
                  ${this.formatMessageTime(message.created_at)}
                </div>
                ${!isOwn && inviteId ? `
                  <div class="flex gap-2 justify-center mt-3">
                    <button
                      class="accept-invite-btn bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 rounded transition"
                      data-invite-id="${inviteId}"
                    >
                      ✓ Accept
                    </button>
                    <button
                      class="decline-invite-btn bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition"
                      data-invite-id="${inviteId}"
                    >
                      ✗ Decline
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }

        if (message.type === 'system') {
          return `
            <div class="flex justify-center my-2">
              <div class="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[0.95rem] italic">
                ${message.content}
              </div>
            </div>
          `;
        }

        if (isOwn) {
          return `
            <div class="flex justify-end">
              <div class="max-w-[70%] bg-blue-600 text-white px-4 py-2 rounded-2xl">
                <div class="break-words">${this.escapeHtml(message.content)}</div>
                <div class="text-[0.85rem] text-blue-200 mt-1">
                  ${this.formatMessageTime(message.created_at)}
                </div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="flex justify-start items-end gap-2">
              <img src="${getAvatarUrl(otherUser.avatar)}"
                   alt="${otherUser.username}"
                   class="w-8 h-8 rounded-full border border-gray-600 object-cover flex-shrink-0"
                   onerror="this.src='/default-avatar.png'" />
              <div class="max-w-[70%] bg-gray-700 text-white px-4 py-2 rounded-2xl">
                <div class="break-words">${this.escapeHtml(message.content)}</div>
                <div class="text-[0.85rem] text-gray-400 mt-1">
                  ${this.formatMessageTime(message.created_at)}
                </div>
              </div>
            </div>
          `;
        }
      })
      .join('');

    // Bind event listeners for invite buttons
    this.bindInviteButtons();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async sendMessage(content: string): Promise<void> {
    try {
      const otherUser = this.getOtherUser();
      await chatService.sendMessage(otherUser.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  private bindInviteButtons(): void {
    // Bind accept buttons
    const acceptButtons = this.element.querySelectorAll('.accept-invite-btn');
    acceptButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const inviteId = target.dataset.inviteId;
        if (inviteId) {
          this.acceptInvite(inviteId);
        }
      });
    });

    // Bind decline buttons
    const declineButtons = this.element.querySelectorAll('.decline-invite-btn');
    declineButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const inviteId = target.dataset.inviteId;
        if (inviteId) {
          this.declineInvite(inviteId);
        }
      });
    });
  }

  private async acceptInvite(inviteId: string): Promise<void> {
    try {
      if (chatService.ws && chatService.ws.readyState === WebSocket.OPEN) {
        chatService.ws.send(
          JSON.stringify({
            type: 'friend_pong_accept',
            inviteId: inviteId,
          })
        );
        console.log('✅ Invitation accepted, game starting soon...');
      } else {
        console.error('WebSocket not connected');
      }
    } catch (error) {
      console.error('Accept error:', error);
    }
  }

  private async declineInvite(inviteId: string): Promise<void> {
    try {
      if (chatService.ws && chatService.ws.readyState === WebSocket.OPEN) {
        chatService.ws.send(
          JSON.stringify({
            type: 'friend_pong_decline',
            inviteId: inviteId,
          })
        );
        console.log('Invitation declined');
      } else {
        console.error('WebSocket not connected');
      }
    } catch (error) {
      console.error('Decline error:', error);
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
    this.refreshAvatars();
  }

  private refreshAvatars(): void {
    const otherUser = this.getOtherUser();
    const newAvatarUrl = getAvatarUrl(otherUser.avatar, true);

    const headerAvatar = this.element.querySelector('#chat-header img') as HTMLImageElement;
    if (headerAvatar) {
      headerAvatar.src = newAvatarUrl;
    }

    const messageAvatars = this.element.querySelectorAll('#messages-list img');
    messageAvatars.forEach((img: Element) => {
      if (img instanceof HTMLImageElement) {
        img.src = newAvatarUrl;
      }
    });
  }

  public refreshUserData(): void {
    this.refreshAvatars();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private async inviteToPong(): Promise<void> {
    try {
      const inviteBtn = this.element.querySelector('#invite-to-pong-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = true;
        inviteBtn.innerHTML = 'Sending...';
      }

      const otherUser = this.getOtherUser();
      const result = await apiService.inviteFriendToPong(otherUser.id);

      if (result.success) {
        this.showNotification(`Invitation sent to ${otherUser.username}!`, 'success');
      } else {
        this.showNotification(result.message || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to invite to pong:', error);
      this.showNotification('Failed to send invitation', 'error');
    } finally {
      const inviteBtn = this.element.querySelector('#invite-to-pong-btn') as HTMLButtonElement;
      if (inviteBtn) {
        inviteBtn.disabled = false;
        inviteBtn.innerHTML = 'Invite to Pong';
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[100] px-4 py-3 border-2 text-white font-bold ${
      type === 'success' ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  public destroy(): void {
    if (this.element.parentNode) {
      this.element.remove();
    }
  }
}
