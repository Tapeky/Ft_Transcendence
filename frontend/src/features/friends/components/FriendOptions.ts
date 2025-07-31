// FriendOptions - Reproduction EXACTE de la version React
// Modal 500x600px avec avatar, dashboard, block/remove actions

import { apiService } from '../../../shared/services/api';
import { router } from '../../../core/app/Router';
import { CloseBtn } from '../../../shared/components/CloseBtn';
import { getAvatarUrl } from '../../../shared/utils/avatar';
import { gameInviteService } from '../../invitations/services/GameInviteService';

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
    console.log('👥 FriendOptions: Initialized for user', props.username);
  }

  private createElement(): HTMLElement {
    // EXACTEMENT comme React - Overlay fullscreen avec modal 500x600
    const container = document.createElement('div');
    container.className = `${this.props.isOpen ? 'flex' : 'hidden'} fixed top-0 left-0 z-[60] bg-white bg-opacity-20 w-screen h-screen justify-center items-center text-white`;

    // Modal container - DIMENSIONS EXACTES React
    const modalContent = document.createElement('div');
    modalContent.className = 'z-[65] w-[500px] max-w-[90vw] h-[600px] max-h-[90vh] border-[5px] border-black bg-purple-800 text-[2rem] fixed';

    // Flex column layout - EXACTEMENT React
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex flex-col h-full z-[65]';

    // CloseBtn - EXACTEMENT React position
    this.closeBtn = new CloseBtn(() => this.props.setIsOpen());
    flexContainer.appendChild(this.closeBtn.getElement());

    // User info section - EXACTEMENT React layout
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

    // Dashboard section - EXACTEMENT React
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

    // Game invite section - NEW
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

    // Action buttons section - EXACTEMENT React
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
    // Dashboard button - EXACTEMENT React navigation
    const dashboardBtn = this.element.querySelector('#dashboard-btn');
    dashboardBtn?.addEventListener('click', () => this.handleDashboard());

    // Game invite button - NEW
    const inviteBtn = this.element.querySelector('#invite-btn');
    inviteBtn?.addEventListener('click', () => this.handleGameInvite());

    // Remove friend button - EXACTEMENT React
    const removeBtn = this.element.querySelector('#remove-btn');
    removeBtn?.addEventListener('click', () => this.handleRemoveFriend());

    // Block button - EXACTEMENT React
    const blockBtn = this.element.querySelector('#block-btn');
    blockBtn?.addEventListener('click', () => this.handleBlock());

  }

  private handleDashboard(): void {
    console.log('👥 FriendOptions: Opening dashboard for', this.props.username);
    
    // Navigate to dashboard - EXACTEMENT React
    router.navigate(`/dashboard/${this.props.id}`);
    this.props.setIsOpen();
  }

  private async handleGameInvite(): Promise<void> {
    try {
      console.log('🎮 FriendOptions: Sending KISS game invite to', this.props.username);
      
      // Vérifier que le service KISS est connecté
      if (!gameInviteService.isConnected()) {
        console.error('❌ KISS service not connected');
        alert('Service d\'invitations non connecté. Veuillez rafraîchir la page.');
        return;
      }
      
      // Send game invite via KISS system
      gameInviteService.sendInvite(this.props.id);
      
      console.log('✅ KISS Game invite sent successfully!');
      alert(`🎮 Game invite sent to ${this.props.username}!`);
      
      // Close the modal
      this.props.setIsOpen();
      
    } catch (error) {
      console.error('Error sending game invite:', error);
      alert(`Erreur lors de l'envoi de l'invitation: ${error}`);
    }
  }

  private async handleRemoveFriend(): Promise<void> {
    try {
      console.log('👥 FriendOptions: Removing friend', this.props.id);
      
      await apiService.removeFriend(this.props.id);
      console.log('Friend removed !');
      
      // EXACTEMENT React pattern: setDismiss PUIS setIsOpen
      this.props.setDismiss();
      this.props.setIsOpen();
      
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }

  private async handleBlock(): Promise<void> {
    try {
      console.log('👥 FriendOptions: Attempting to block user with ID:', this.props.id);
      
      await apiService.blockUser(this.props.id);
      console.log('User blocked successfully!');
      
      // EXACTEMENT React pattern: setDismiss PUIS setIsOpen
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
    console.log('👥 FriendOptions: Destroyed (React EXACT)');
    this.element.remove();
  }
}