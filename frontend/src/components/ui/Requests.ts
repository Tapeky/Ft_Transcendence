import { apiService, FriendRequest } from '../../services/api';
import { getAvatarUrl } from '../../utils/avatar';

// Requests - Reproduction exacte de la version React
// Button requests.svg + Toggle dropdown avec FriendRequests items

export class Requests {
  private element: HTMLElement;
  private isRequestWindowVisible: boolean = false;
  private requests: FriendRequest[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    
    console.log('📮 Requests: Initialized with React-like toggle logic');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'absolute ml-[4rem] mt-2 mb-0';

    container.innerHTML = `
      <!-- Toggle Button -->
      <button id="toggle-btn" class="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
        <img src="/src/img/requests.svg" alt="requests" />
      </button>

      <!-- Dropdown Window -->
      <div id="requests-dropdown" class="${this.isRequestWindowVisible ? 'flex' : 'hidden'} bg-pink-800 border-black border-2 h-[400px] w-[400px] relative right-[472px] bottom-[150px] z-[45] flex-col items-center">
        
        <!-- Header -->
        <h2 class="text-white border-b-2 border-white">Friend requests</h2>
        
        <!-- Content Container -->
        <div id="requests-content" class="flex flex-col overflow-auto w-full">
          <!-- Friend requests will be injected here -->
        </div>
        
      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    const toggleBtn = this.element.querySelector('#toggle-btn');

    // Toggle button click
    toggleBtn?.addEventListener('click', () => this.toggleRequest());

  }

  private async toggleRequest(): Promise<void> {
    this.isRequestWindowVisible = !this.isRequestWindowVisible;
    this.updateVisibility();

    // Fetch requests when window becomes visible (React behavior)
    if (this.isRequestWindowVisible) {
      await this.fetchRequests();
    }
  }

  private updateVisibility(): void {
    const dropdown = this.element.querySelector('#requests-dropdown');
    if (!dropdown) return;

    if (this.isRequestWindowVisible) {
      dropdown.classList.remove('hidden');
      dropdown.classList.add('flex');
    } else {
      dropdown.classList.add('hidden');
      dropdown.classList.remove('flex');
    }
  }

  private async fetchRequests(): Promise<void> {
    try {
      const data = await apiService.getFriendRequests();
      this.requests = data;
      this.renderRequests();
      
      console.log('📮 Requests: Fetched friend requests:', data.length);

    } catch (error) {
      console.error('❌ Requests: Failed to fetch friend requests:', error);
    }
  }

  private renderRequests(): void {
    const content = this.element.querySelector('#requests-content');
    if (!content) return;

    // Clear existing content
    content.innerHTML = '';

    if (this.requests.length === 0) {
      // No requests case
      const emptyDiv = document.createElement('div');
      emptyDiv.textContent = 'No requests. :(';
      emptyDiv.className = 'text-center text-white p-4';
      content.appendChild(emptyDiv);
    } else {
      // Render friend requests
      this.requests.forEach(request => {
        const requestElement = this.createFriendRequestItem(request);
        content.appendChild(requestElement);
      });
    }
  }

  private createFriendRequestItem(request: FriendRequest): HTMLElement {
    // FriendRequest item - reproduction exacte du React FriendRequests.tsx
    const item = document.createElement('div');
    item.className = 'border-white border-2 min-h-[120px] w-[320px] flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden mx-2';
    item.dataset.requestId = request.id.toString();
    
    item.innerHTML = `
      <!-- Avatar Section -->
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(request.avatar_url)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>

      <!-- Content Section -->
      <div class="flex flex-col">
        <h2 class="mt-2 flex-grow">${request.username}</h2>
        
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

    // Bind individual request actions
    this.bindRequestActions(item, request);

    return item;
  }

  private bindRequestActions(element: HTMLElement, request: FriendRequest): void {
    const blockBtn = element.querySelector('.block-btn');
    const rejectBtn = element.querySelector('.reject-btn');
    const acceptBtn = element.querySelector('.accept-btn');

    // Block user action
    blockBtn?.addEventListener('click', async () => {
      try {
        console.log('Attempting to block user with ID:', request.user_id);
        await apiService.blockUser(request.user_id);
        console.log('User blocked successfully!');
        this.dismissRequest(element);
      } catch (error) {
        console.error('Error blocking user:', error);
        // Could show user notification here
      }
    });

    // Reject request action
    rejectBtn?.addEventListener('click', async () => {
      try {
        await apiService.declineFriendRequest(request.id);
        console.log('Request rejected!');
        this.dismissRequest(element);
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    });

    // Accept request action
    acceptBtn?.addEventListener('click', async () => {
      try {
        await apiService.acceptFriendRequest(request.id);
        console.log('Request accepted!');
        this.dismissRequest(element);
      } catch (error) {
        console.error('Error accepting request:', error);
      }
    });
  }

  private dismissRequest(element: HTMLElement): void {
    // React behavior: setVisible(false) → hide the element
    element.style.display = 'none';
    
    // Remove from local array
    const requestId = element.dataset.requestId;
    if (requestId) {
      this.requests = this.requests.filter(req => req.id.toString() !== requestId);
    }

    // If no more requests, show empty message
    if (this.requests.length === 0) {
      const content = this.element.querySelector('#requests-content');
      if (content) {
        content.innerHTML = '<div class="text-center text-white p-4">No requests. :(</div>';
      }
    }
  }

  // Public method to refresh the requests (called from parent)
  public async refresh(): Promise<void> {
    if (this.isRequestWindowVisible) {
      await this.fetchRequests();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    console.log('📮 Requests: Destroyed (React-like)');
    this.element.remove();
  }
}