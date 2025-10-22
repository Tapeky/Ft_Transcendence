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
  wins: number;
  losses: number;
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
    modalContent.className =
      'z-[65] w-[700px] h-[900px] border-[5px] border-purple-950 bg-gradient-to-b from-purple-700 to-blue-800 text-[2rem] fixed rounded-md';

    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex flex-col h-full z-[65]';

    this.closeBtn = new CloseBtn(() => this.props.setIsOpen());
    flexContainer.appendChild(this.closeBtn.getElement());

    const userInfoSection = document.createElement('div');
    userInfoSection.className = 'flex justify-center items-start border-b-4 border-white w-4/5 self-center pb-6 mb-6';
    userInfoSection.innerHTML = `
      <div class="flex-1 flex items-center justify-start">
        <img src="${getAvatarUrl(this.props.avatar)}" alt="icon" class="h-[200px] w-[200px] border-2 m-5" />
      </div>
      <div class="flex-1 flex flex-col flex-grow items-start justify-start overflow-hidden">
        <h1 class="text-[2.6rem]">${this.props.displayName}</h1>
        <h2>${this.props.username}</h2>
      </div>
    `;
    flexContainer.appendChild(userInfoSection);

    const statsSection = document.createElement('div');
    statsSection.className = 'self-center w-3/4 border-b-4 border-white pb-12 gap-12 flex flex-col';
    statsSection.innerHTML = `
            <div class='flex flex-row items-center justify-evenly mt-2 w-full text-[2.5rem]'
              <h2>Wins : ${this.props.wins}</h2>
              <h2>Losses : ${this.props.losses}</h2>
            </div>
            <div class='flex flex-row items-center justify-evenly'>
                <div class='flex-1'>
                  <button id="dashboard-btn" class='text-[2.5rem] hover:scale-110 rounded-md bg-blue-500 h-full transition duration-200 self-center w-3/4'>
                    Stats
                  </button>
                </div>
                <div class='flex-1'>
                  ↼ More stats here !
                </div>
            </div>
            <div class='flex flex-row items-center justify-evenly'>
              <div class='flex-1'>
                Send an invite ! ⇁
              </div>
              <div class='flex-1'>
                <button id="invite-btn" class='text-[2.5rem] hover:scale-110 rounded-md bg-green-500 h-full transition duration-200 self-center w-3/4'>
                  Fight
                </button>
              </div>
            </div>
          `;
          flexContainer.appendChild(statsSection);

    const actionsSection = document.createElement('div');
    actionsSection.className = 'flex-grow flex justify-evenly items-center text-[1.5rem]';
    actionsSection.innerHTML = `
      <button id="block-btn" class="w-[200px] h-[70px] bg-red-600 border-white hover:scale-110 hover:bg-red-700 duration-500 rounded-md">
        Block user
      </button>
      <button id="remove-btn" class="w-[200px] h-[70px] bg-red-600 border-white hover:scale-110 hover:bg-red-700 duration-500 rounded-md">
        Remove friend
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
