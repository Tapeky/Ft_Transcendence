import { apiService, FriendRequest } from '../../../../services/api';
import { getAvatarUrl } from '../../../../utils/avatar';
import { TabHandlerConfig } from '../types';

export class RequestsTabHandler {
  private container: Element;
  private requests: FriendRequest[] = [];
  private onRefresh?: () => void;

  constructor(config: TabHandlerConfig) {
    this.container = config.container;
    this.onRefresh = config.onRefresh;
  }

  async initialize(): Promise<void> {
    await this.fetchAndRenderRequests();
  }

  private async fetchAndRenderRequests(): Promise<void> {
    try {
      this.requests = await apiService.getFriendRequests();
      this.renderRequestsContent();
    } catch (error) {
      console.error('❌ Failed to fetch requests:', error);
      this.renderErrorMessage('Failed to load requests');
    }
  }

  private renderRequestsContent(): void {
    // Clear existing content
    this.container.innerHTML = '';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col w-full px-4 gap-2';

    if (this.requests.length === 0) {
      this.renderNoRequestsMessage(contentDiv);
    } else {
      this.renderRequests(contentDiv);
    }

    this.container.appendChild(contentDiv);
  }

  private renderNoRequestsMessage(container: Element): void {
    container.innerHTML = '<div class="text-center text-white p-4">No requests. :(</div>';
  }

  private renderRequests(container: Element): void {
    this.requests.forEach(request => {
      const requestElement = this.createRequestItem(request);
      container.appendChild(requestElement);
    });
  }

  private createRequestItem(request: FriendRequest): HTMLElement {
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

    this.bindRequestItemActions(item, request);
    return item;
  }

  private bindRequestItemActions(element: HTMLElement, request: FriendRequest): void {
    const blockBtn = element.querySelector('.block-btn');
    const rejectBtn = element.querySelector('.reject-btn');
    const acceptBtn = element.querySelector('.accept-btn');

    blockBtn?.addEventListener('click', async () => {
      try {
        await apiService.blockUser(request.user_id);
        element.remove();
        this.removeRequestFromState(request.id);
      } catch (error) {
        console.error('❌ Error blocking user:', error);
      }
    });

    rejectBtn?.addEventListener('click', async () => {
      try {
        await apiService.declineFriendRequest(request.id);
        element.remove();
        this.removeRequestFromState(request.id);
      } catch (error) {
        console.error('❌ Error rejecting request:', error);
      }
    });

    acceptBtn?.addEventListener('click', async () => {
      try {
        await apiService.acceptFriendRequest(request.id);
        element.remove();
        this.removeRequestFromState(request.id);
      } catch (error) {
        console.error('❌ Error accepting request:', error);
      }
    });
  }

  private removeRequestFromState(requestId: number): void {
    this.requests = this.requests.filter(r => r.id !== requestId);
    
    // If no more requests, show empty message
    if (this.requests.length === 0) {
      this.renderRequestsContent();
    }
  }

  private renderErrorMessage(message: string): void {
    this.container.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center text-white p-4';
    errorDiv.textContent = message;
    this.container.appendChild(errorDiv);
  }

  async refresh(): Promise<void> {
    await this.fetchAndRenderRequests();
    // Note: onRefresh callback removed to prevent infinite loop
  }

  getRequests(): FriendRequest[] {
    return [...this.requests];
  }

  destroy(): void {
    // No specific cleanup needed for this handler
  }
}