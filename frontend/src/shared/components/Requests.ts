import { apiService, FriendRequest } from '../services/api';
import { getAvatarUrl } from '../utils/avatar';

export class Requests {
  private element: HTMLElement;
  private buttonElement?: HTMLElement;
  private dropdownElement?: HTMLElement;
  private isRequestWindowVisible: boolean = false;
  private requests: FriendRequest[] = [];

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'requests-container';

    this.buttonElement = document.createElement('button');
    this.buttonElement.id = 'toggle-btn';
    this.buttonElement.className =
      'border-2 h-[40px] w-[40px] bg-white border-black hover:bg-gray-100';
    this.buttonElement.setAttribute('title', 'Friend Requests');
    this.buttonElement.innerHTML = '<img src="/src/img/requests.svg" alt="requests" />';

    this.dropdownElement = document.createElement('div');
    this.dropdownElement.id = 'requests-dropdown';
    this.dropdownElement.className = `${this.isRequestWindowVisible ? 'flex' : 'hidden'} bg-pink-800 border-black border-2 h-[400px] w-[400px] absolute top-[70px] left-[-400px] flex-col items-center z-[45]`;
    this.dropdownElement.innerHTML = `
      <h2 class="text-white border-b-2 border-white">Friend requests</h2>
      <div id="requests-content" class="flex flex-col overflow-auto w-full"></div>
    `;

    container.appendChild(this.buttonElement);
    container.appendChild(this.dropdownElement);

    return container;
  }

  private bindEvents(): void {
    this.buttonElement?.addEventListener('click', () => this.toggleRequest());
  }

  private async toggleRequest(): Promise<void> {
    this.isRequestWindowVisible = !this.isRequestWindowVisible;
    this.updateVisibility();
    if (this.isRequestWindowVisible) {
      await this.fetchRequests();
    }
  }

  private updateVisibility(): void {
    if (!this.dropdownElement) return;
    if (this.isRequestWindowVisible) {
      this.dropdownElement.classList.remove('hidden');
      this.dropdownElement.classList.add('flex');
    } else {
      this.dropdownElement.classList.add('hidden');
      this.dropdownElement.classList.remove('flex');
    }
  }

  private async fetchRequests(): Promise<void> {
    try {
      const data = await apiService.getFriendRequests();
      this.requests = data;
      this.renderRequests();
    } catch (error) {}
  }

  private renderRequests(): void {
    const content = this.dropdownElement?.querySelector('#requests-content');
    if (!content) return;
    content.innerHTML = '';
    if (this.requests.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.textContent = 'No requests. :(';
      emptyDiv.className = 'text-center text-white p-4';
      content.appendChild(emptyDiv);
    } else {
      this.requests.forEach(request => {
        const requestElement = this.createFriendRequestItem(request);
        content.appendChild(requestElement);
      });
    }
  }

  private createFriendRequestItem(request: FriendRequest): HTMLElement {
    const item = document.createElement('div');
    item.className =
      'border-white border-2 min-h-[120px] w-[320px] flex bg-blue-800 text-[1.2rem] mt-4 overflow-hidden mx-2';
    item.dataset.requestId = request.id.toString();
    item.innerHTML = `
      <div class="flex items-center justify-center min-w-[120px]">
        <img src="${getAvatarUrl(request.avatar_url)}" alt="icon" class="h-[90px] w-[90px] border-2"/>
      </div>
      <div class="flex flex-col">
        <h2 class="mt-2 flex-grow">${request.username}</h2>
        <div class="flex gap-2 items-end ml-12">
          <button class="block-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end hover:scale-110 duration-100">
            <img src="/src/img/block.svg" alt="block" />
          </button>
          <button class="reject-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end hover:scale-110 duration-100">
            <img src="/src/img/reject.svg" alt="reject" />
          </button>
          <button class="accept-btn border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end hover:scale-110 duration-100">
            <img src="/src/img/accept.svg" alt="accept" />
          </button>
        </div>
      </div>
    `;
    this.bindRequestActions(item, request);
    return item;
  }

  private bindRequestActions(element: HTMLElement, request: FriendRequest): void {
    const blockBtn = element.querySelector('.block-btn');
    const rejectBtn = element.querySelector('.reject-btn');
    const acceptBtn = element.querySelector('.accept-btn');

    blockBtn?.addEventListener('click', async () => {
      try {
        await apiService.blockUser(request.user_id);
        this.dismissRequest(element);
      } catch (error) {}
    });

    rejectBtn?.addEventListener('click', async () => {
      try {
        await apiService.declineFriendRequest(request.id);
        this.dismissRequest(element);
      } catch (error) {}
    });

    acceptBtn?.addEventListener('click', async () => {
      try {
        await apiService.acceptFriendRequest(request.id);
        this.dismissRequest(element);
      } catch (error) {}
    });
  }

  private dismissRequest(element: HTMLElement): void {
    element.style.display = 'none';
    const requestId = element.dataset.requestId;
    if (requestId) {
      this.requests = this.requests.filter(req => req.id.toString() !== requestId);
    }
    if (this.requests.length === 0) {
      const content = this.dropdownElement?.querySelector('#requests-content');
      if (content) {
        content.innerHTML = '<div class="text-center text-white p-4">No requests. :(</div>';
      }
    }
  }

  public async refresh(): Promise<void> {
    if (this.isRequestWindowVisible) {
      await this.fetchRequests();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getButtonElement(): HTMLElement {
    return this.buttonElement!;
  }

  getDropdownElement(): HTMLElement {
    return this.dropdownElement!;
  }

  destroy(): void {
    this.element.remove();
  }
}
