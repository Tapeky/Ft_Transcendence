import { apiService } from '../../../shared/services/api';
import { router } from '../../../core/app/Router';
import { CloseBtn } from '../../../shared/components/CloseBtn';
import { getAvatarUrl } from '../../../shared/utils/avatar';

export interface FriendOptionsProps {
  username: string;
  displayName: string;
  avatar: string | null;
  id: number;
  isOpen: boolean;
  setIsOpen: () => void;
  setDismiss: () => void;
}

export class FriendOptions {
  private element: HTMLElement;
  private props: FriendOptionsProps;
  private closeBtn?: CloseBtn;

  constructor(props: FriendOptionsProps) {
    this.props = props;
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `${this.props.isOpen ? 'flex' : 'hidden'} fixed top-0 left-0 z-[60] bg-white bg-opacity-20 w-screen h-screen justify-center items-center text-white font-iceland`;

    const modalContent = document.createElement('div');
    modalContent.className = 'z-[65] w-[500px] max-w-[90vw] h-[600px] max-h-[90vh] border-[5px] border-black bg-purple-800 text-[2rem] fixed';

    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex flex-col h-full z-[65]';

    this.closeBtn = new CloseBtn(() => this.props.setIsOpen());
    flexContainer.appendChild(this.closeBtn.getElement());

    const userInfoSection = document.createElement('div');
    userInfoSection.className = 'flex justify-center items-start';
    userInfoSection.innerHTML = `
      <img src="${getAvatarUrl(this.props.avatar)}" alt="icon" class="h-[150px] w-[150px] border-2 m-5" />
      <div class="flex flex-col flex-grow items-start justify-start overflow-hidden">
        <h1 class="text-[2.6rem]">${this.props.username}</h1>
        <h2>${this.props.displayName}</h2>
      </div>
    `;
    flexContainer.appendChild(userInfoSection);

    const dashboardSection = document.createElement('div');
    dashboardSection.className = 'flex flex-col items-center justify-center gap-2 mt-2';
    dashboardSection.innerHTML = `
      <h2 class="text-[2rem]">▼ See ${this.props.username}'s stats ▼</h2>
      <div class="h-[100px] w-3/4 text-center">
        <button 
          id="dashboard-btn"
          class="text-[2.5rem] border-2 px-4 hover:scale-110 rounded-md bg-blue-800 w-full h-full transition duration-200"
        >
          Dashboard
        </button>
      </div>
    `;
    flexContainer.appendChild(dashboardSection);

    const gameSection = document.createElement('div');
    gameSection.className = 'flex flex-col items-center justify-center gap-2 mt-2';
    gameSection.innerHTML = `
      <h2 class="text-[1.8rem]">🎮 Challenge ${this.props.username} 🎮</h2>
      <div class="h-[80px] w-3/4 text-center">
        <button 
          id="invite-btn"
          class="text-[2rem] border-2 px-4 hover:scale-110 rounded-md bg-green-700 w-full h-full transition duration-200"
        >
          Send Game Invite
        </button>
      </div>
    `;
    flexContainer.appendChild(gameSection);

    const actionsSection = document.createElement('div');
    actionsSection.className = 'flex-grow flex justify-evenly items-center';
    actionsSection.innerHTML = `
      <button id="block-btn" class="border-2 h-[60px] w-[60px] mr-2 bg-white border-black">
        <img src="/src/img/block.svg" alt="block"/>
      </button>
      <button id="remove-btn" class="border-2 h-[60px] w-[60px] mr-2 bg-white border-black">
        <img src="/src/img/remove.svg" alt="remove"/>
      </button>
    `;
    flexContainer.appendChild(actionsSection);

    modalContent.appendChild(flexContainer);
    container.appendChild(modalContent);

    return container;
  }

  private setupEventListeners(): void {
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    dashboardBtn?.addEventListener('click', () => this.handleDashboard());

    const removeBtn = this.element.querySelector('#remove-btn');
    removeBtn?.addEventListener('click', () => this.handleRemoveFriend());

    const blockBtn = this.element.querySelector('#block-btn');
    blockBtn?.addEventListener('click', () => this.handleBlock());

  }

  private handleDashboard(): void {
    router.navigate(`/dashboard/${this.props.id}`);
    this.props.setIsOpen();
  }

  private async handleRemoveFriend(): Promise<void> {
    try {
      await apiService.removeFriend(this.props.id);
      this.props.setDismiss();
      this.props.setIsOpen();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }

  private async handleBlock(): Promise<void> {
    try {
      await apiService.blockUser(this.props.id);
      this.props.setDismiss();
      this.props.setIsOpen();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert(`Erreur lors du blocage: ${error}`);
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.closeBtn) {
      this.closeBtn.destroy();
    }
    this.element.remove();
  }
}
