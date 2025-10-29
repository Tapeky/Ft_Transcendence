import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';
import { Header } from '../../../shared/components/Header';
import { BackBtn } from '../../../shared/components/BackBtn';
import { CloseBtn } from '../../../shared/components/CloseBtn';
import { AvatarSelect } from '../../../shared/components/AvatarSelect';
import { apiService } from '../../../shared/services/api';
import { getAvatarUrl } from '../../../shared/utils/avatar';

export class ProfilePage {
  private element: HTMLElement;
  private header?: Header;
  private backBtn?: BackBtn;
  private showPasswordModal: boolean = false;
  private showAvatarModal: boolean = false;
  private showDeleteModal: boolean = false;
  private passwordModalCloseBtn?: CloseBtn;
  private deleteModalCloseBtn?: CloseBtn;
  private avatarModalCloseBtn?: CloseBtn;
  private avatarSelect?: AvatarSelect;

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className =
      'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white';

    const user = authManager.getCurrentUser();

    this.header = new Header(true);
    container.appendChild(this.header.getElement());

    const centerContainer = document.createElement('div');
    centerContainer.className =
      'w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600 self-center border-x-4 border-t-4 flex flex-col p-4 overflow-auto';

    const headerSection = document.createElement('div');
    headerSection.className = 'text-center text-[4rem] border-b-2 w-full flex';

    this.backBtn = new BackBtn();
    headerSection.appendChild(this.backBtn.getElement());

    const title = document.createElement('h1');
    title.className = 'flex-1';
    title.textContent = 'Profile';
    headerSection.appendChild(title);

    const rightSpacer = document.createElement('div');
    rightSpacer.className = 'flex-1';
    headerSection.appendChild(rightSpacer);

    centerContainer.appendChild(headerSection);

    const mainContent = document.createElement('div');
    mainContent.className = 'flex m-10 flex-grow';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'flex flex-col flex-[1.5] text-[2rem] gap-10';

    const usernameSection = document.createElement('div');
    usernameSection.className = 'flex gap-[9.5rem]';
    usernameSection.innerHTML = `
      <h4>Username</h4>
      <h2>${user?.username || 'User'}</h2>
    `;
    leftColumn.appendChild(usernameSection);

    const displayNameSection = document.createElement('div');
    displayNameSection.className = 'flex justify-between';
    displayNameSection.innerHTML = `
      <h4 class="flex-1">Display name</h4>
      <input 
        id="display-name-input"
        type="text" 
        value="${user?.display_name || ''}" 
        class="flex-1 rounded-md text-black indent-4" 
        minlength="3" 
        maxlength="12"
      />
      <div class="flex-1">
        <button 
          id="save-display-name"
          class="bg-blue-800 w-[50px] rounded-md hover:scale-90 ml-3 border-2 border-white transition-transform"
        >
          &#x2713;
        </button>
      </div>
    `;
    leftColumn.appendChild(displayNameSection);

    const passwordSection = document.createElement('div');
    passwordSection.className = 'flex justify-center';
    passwordSection.innerHTML = `
      <h4 class="flex-1">Password</h4>
      <div class="flex-1">
        <button 
          id="change-password-btn"
          class="border-2 w-full bg-blue-800 hover:scale-105 text-white rounded-md translate-x-[-20px] transition-transform"
        >
          Change
        </button>
      </div>
      <div class="flex-1"></div>
    `;
    leftColumn.appendChild(passwordSection);

    const deleteSection = document.createElement('div');
    deleteSection.className = 'flex justify-center';
    deleteSection.innerHTML = `
      <h4 class="flex-1">Account</h4>
      <div class="flex-1">
        <button 
          id="delete-btn"
          class="border-2 w-full bg-red-600 hover:scale-105 text-white rounded-md translate-x-[-20px] transition-transform"
        >
          Delete
        </button>
      </div>
      <div class="flex-1"></div>
    `;
    leftColumn.appendChild(deleteSection);




    mainContent.appendChild(leftColumn);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex-[0.5] flex justify-center relative';

    rightColumn.innerHTML = `
      <img 
        id="profile-main-avatar"
        src="${getAvatarUrl(user?.avatar_url)}" 
        alt="Avatar" 
        class="h-[295px] w-[300px] border-4 p-0 border-blue-800"
      />
      
      <button 
        id="edit-avatar-btn"
        class="absolute top-[275px] border-2 p-2 px-6 bg-blue-800 hover:scale-110 text-white text-[1.3rem] rounded-md transition-transform"
      >
        EDIT
      </button>
    `;

    mainContent.appendChild(rightColumn);
    centerContainer.appendChild(mainContent);
    container.appendChild(centerContainer);

    return container;
  }

  private setupEventListeners(): void {
    const saveDisplayNameBtn = this.element.querySelector('#save-display-name');
    saveDisplayNameBtn?.addEventListener('click', () => this.handleSaveDisplayName());

    const changePasswordBtn = this.element.querySelector('#change-password-btn');
    changePasswordBtn?.addEventListener('click', () => this.openPasswordModal());

    const editAvatarBtn = this.element.querySelector('#edit-avatar-btn');
    editAvatarBtn?.addEventListener('click', () => this.openAvatarModal());

    const deleteAccountBtn = this.element.querySelector('#delete-btn');
    deleteAccountBtn?.addEventListener('click', () => this.openDeleteModal());
  }

  private async handleSaveDisplayName(): Promise<void> {
    const input = this.element.querySelector('#display-name-input') as HTMLInputElement;
    if (!input) return;

    const newDisplayName = input.value.trim();
    const user = authManager.getCurrentUser();
    const currentDisplayName = user?.display_name?.trim() ?? '';

    if (newDisplayName.length < 3) {
      alert('Display name must be at least 3 characters long');
      return;
    }

    if (newDisplayName === currentDisplayName) {
      return;
    }

    try {
      await apiService.updateProfileDisplayName(newDisplayName);

      await authManager.refreshUser();

      if (this.header) {
        this.header.refresh();
      }

      this.showFeedback('Display name updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update display name:', error);
      this.showFeedback('Error updating display name', 'error');
    }
  }

  private async deleteAccount() {
    const token = localStorage.getItem('auth_token');
    const user = authManager.getCurrentUser();

    try {
      const response = await fetch(`/delete_account/${user?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // console.log(response);
      const data = await response.json();

      if (data.success) {
        console.log(data.message);
        this.deleteSuccess();
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  }


  private openPasswordModal(): void {
    this.showPasswordModal = true;
    this.renderPasswordModal();
  }

  private openDeleteModal(): void {
  this.showDeleteModal = true;
  this.renderDeleteModal();
  }

  private openAvatarModal(): void {
    this.showAvatarModal = true;
    this.renderAvatarModal();
  }

  private renderDeleteModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'delete-modal';
    modalOverlay.className =
      'fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center';

    const modalContainer = document.createElement('div');
    modalContainer.className =
      'flex flex-col bg-blue-800 w-[600px] h-[300px] border-[5px] border-blue-900 rounded-md text-[2rem] font-iceland items-center justify-center';
    const modalContent = document.createElement('div');
    modalContent.className = 'flex flex-col justify-center items-center gap-4 text-white h-full my-4 px-8';
    modalContent.id = 'delete-content';
    modalContent.innerHTML = `
      <div class='text-[2.5rem] text-center flex-1 pt-8'>
        <h2>Are you sure you want to delete your account ?</h2>
      </div>
      <div class='flex-1 flex flex-row w-full justify-evenly items-center text-[2.2rem]'>
        <button id='no-delete-btn' class='border-2 border-white bg-blue-600 py-2 w-[150px] rounded-md hover:scale-110 hover:bg-blue-700 duration-300'>
          Cancel
        </button>
        <button id='yes-delete-btn' class='border-2 border-white bg-red-600 py-2 w-[150px] rounded-md hover:scale-110 hover:bg-red-700 duration-500'>
          Delete
        </button>
      </div>

    `;
    modalContainer.appendChild(modalContent);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);
    
    document.body.querySelector('#no-delete-btn')?.addEventListener('click', () => this.closeDeleteModal());
    document.body.querySelector('#yes-delete-btn')?.addEventListener('click', () => this.deleteAccount());
  }

  private deleteSuccess(): void {
    const content = document.body.querySelector('#delete-content');
    if (!content)
      return;
    content.innerHTML=`
      <div class='text-center text-white text-[3rem]'>
        Account deleted !
      </div>
    `;
    setTimeout(() => router.navigate('/auth'), 2000);
    setTimeout(() => this.closeDeleteModal(), 2000);
  }

  private renderPasswordModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'password-modal';
    modalOverlay.className =
      'fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center';

    const modalContainer = document.createElement('div');
    modalContainer.className =
      'flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem] font-iceland';

    this.passwordModalCloseBtn = new CloseBtn(() => this.closePasswordModal());
    modalContainer.appendChild(this.passwordModalCloseBtn.getElement());

    const modalContent = document.createElement('div');
    modalContent.className = 'flex flex-col justify-center items-center mt-6 gap-4 px-8';
    modalContent.innerHTML = `
      <div>
        <h2 class='text-white text-[2rem]'>Current password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="current-password"/>
          <button id="toggle-current" class="w-[50px] rounded-md ml-3 border-2 border-white">
            <img src='/src/img/eye_white.svg' class='p-1'>
          </button>
        </div>
      </div>

      <div>
        <h2 class='text-white text-[2rem]'>New password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="new-password"/>
          <button id="toggle-new" class="w-[50px] rounded-md ml-3 border-2 border-white">
            <img src='/src/img/eye_white.svg' class='p-1'>
          </button>
        </div>
      </div>

      <div>
        <h2 class='text-white text-[2rem]'>Confirm new password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="confirm-password"/>
          <button id="toggle-confirm" class="w-[50px] rounded-md ml-3 border-2 border-white">
            <img src='/src/img/eye_white.svg' class='p-1'>
          </button>
        </div>
      </div>

      <div id="password-status" class="text-[1.5rem] min-h-[2rem]"></div>

      <button id="save-password" class="border-2 p-2 px-6 bg-blue-800 hover:scale-110 text-white rounded-md transition-transform">
        OK
      </button>
    `;

    modalContainer.appendChild(modalContent);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    this.setupPasswordModalEvents();
  }

  private setupPasswordModalEvents(): void {
    const modal = document.getElementById('password-modal');
    if (!modal) return;

    const toggles = ['current', 'new', 'confirm'];
    toggles.forEach(type => {
      const toggleBtn = modal.querySelector(`#toggle-${type}`);
      const input = modal.querySelector(`#${type}-password`) as HTMLInputElement;

      toggleBtn?.addEventListener('click', () => {
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
          toggleBtn.innerHTML = input.type === 'password' ? "<img src='/src/img/eye_white.svg' class='p-1'>" : "<img src='/src/img/eye_black.svg' class='p-1 bg-white'>";
        }
      });
    });

    const saveBtn = modal.querySelector('#save-password');
    saveBtn?.addEventListener('click', () => this.handleSavePassword());
  }

  private async handleSavePassword(): Promise<void> {
    const modal = document.getElementById('password-modal');
    if (!modal) return;

    const currentPassword = (modal.querySelector('#current-password') as HTMLInputElement)?.value;
    const newPassword = (modal.querySelector('#new-password') as HTMLInputElement)?.value;
    const confirmPassword = (modal.querySelector('#confirm-password') as HTMLInputElement)?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.updatePasswordStatus('Please fill all fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.updatePasswordStatus('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      this.updatePasswordStatus('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      this.updatePasswordStatus('Updating password...', 'info');

      await apiService.changePassword(currentPassword, newPassword);

      this.updatePasswordStatus('Password updated successfully!', 'success');

      setTimeout(() => {
        this.closePasswordModal();
      }, 1500);
    } catch (error) {
      console.error('Failed to update password:', error);
      this.updatePasswordStatus('Error updating password', 'error');
    }
  }

  private renderAvatarModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'avatar-modal';
    modalOverlay.className =
      'fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center';

    const modalContainer = document.createElement('div');
    modalContainer.className =
      'flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem] font-iceland';

    this.avatarModalCloseBtn = new CloseBtn(() => this.closeAvatarModal());
    modalContainer.appendChild(this.avatarModalCloseBtn.getElement());

    this.avatarSelect = new AvatarSelect(() => {
      this.updateMainAvatar();
    });
    modalContainer.appendChild(this.avatarSelect.getElement());

    const uploadSection = document.createElement('div');
    uploadSection.className = 'flex-grow flex items-center justify-center';
    uploadSection.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <input type="file" id="avatar-file-input" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden"/>
        
        <button id="upload-avatar-btn" class="border-2 p-2 px-6 bg-blue-800 hover:scale-110 text-white text-[1.5rem] rounded-md transition-transform">
          Import file
        </button>
        
        <div id="upload-status" class="text-[1.2rem] min-h-[1.5rem] text-center"></div>
      </div>
    `;

    modalContainer.appendChild(uploadSection);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    this.setupAvatarModalEvents();
  }

  private setupAvatarModalEvents(): void {
    const modal = document.getElementById('avatar-modal');
    if (!modal) return;

    const uploadBtn = modal.querySelector('#upload-avatar-btn');
    const fileInput = modal.querySelector('#avatar-file-input') as HTMLInputElement;

    uploadBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleAvatarUpload(file);
      }
    });
  }

  private updateMainAvatar(): void {
    const user = authManager.getCurrentUser();
    const mainAvatar = document.querySelector('#profile-main-avatar') as HTMLImageElement;

    if (mainAvatar) {
      const newAvatarUrl = getAvatarUrl(user?.avatar_url);

      const hasQueryParams = newAvatarUrl.includes('?');
      const cacheBuster = hasQueryParams ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      const finalUrl = newAvatarUrl + cacheBuster;

      mainAvatar.src = finalUrl;
    }

    if (this.header) {
      this.header.refresh();
    }
  }

  private async handleAvatarUpload(file: File): Promise<void> {
    try {
      this.updateUploadStatus('Uploading avatar...', 'info');

      const result = await apiService.uploadAvatar(file);

      await authManager.refreshUser();

      this.updateMainAvatar();

      this.updateUploadStatus('Avatar updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      this.updateUploadStatus('Error uploading avatar', 'error');
    }
  }

  private closePasswordModal(): void {
    this.showPasswordModal = false;

    if (this.passwordModalCloseBtn) {
      this.passwordModalCloseBtn.destroy();
      this.passwordModalCloseBtn = undefined;
    }

    const modal = document.getElementById('password-modal');
    modal?.remove();
  }

  private closeDeleteModal(): void {
    this.showDeleteModal = false;

    const modal = document.getElementById('delete-modal');
    modal?.remove();
  }

  private closeAvatarModal(): void {
    this.showAvatarModal = false;

    if (this.avatarModalCloseBtn) {
      this.avatarModalCloseBtn.destroy();
      this.avatarModalCloseBtn = undefined;
    }

    if (this.avatarSelect) {
      this.avatarSelect.destroy();
      this.avatarSelect = undefined;
    }

    const modal = document.getElementById('avatar-modal');
    modal?.remove();
  }

  private updatePasswordStatus(message: string, type: 'success' | 'error' | 'info'): void {
    const statusElement = document.querySelector('#password-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `text-[1.5rem] min-h-[2rem] ${
        type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'
      }`;
    }
  }

  private updateUploadStatus(message: string, type: 'success' | 'error' | 'info'): void {
    const statusElement = document.querySelector('#upload-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `text-[1.2rem] min-h-[1.5rem] text-center ${
        type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'
      }`;
    }
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    const feedback = document.createElement('div');
    feedback.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    feedback.textContent = message;

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 3000);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }

    this.element.remove();
  }
}
