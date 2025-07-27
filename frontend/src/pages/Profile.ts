import { authManager } from '../auth/AuthManager';
import { router } from '../app/Router';
import { Header } from '../components/ui/Header';
import { BackBtn } from '../components/ui/BackBtn';
import { CloseBtn } from '../components/ui/CloseBtn';
import { AvatarSelect } from '../components/ui/AvatarSelect';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../utils/avatar';

export class ProfilePage {
  private element: HTMLElement;
  private header?: Header;
  private backBtn?: BackBtn;
  private showPasswordModal: boolean = false;
  private showAvatarModal: boolean = false;
  private passwordModalCloseBtn?: CloseBtn;
  private avatarModalCloseBtn?: CloseBtn;
  private avatarSelect?: AvatarSelect;

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    // Main container with React exact styling
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white';

    const user = authManager.getCurrentUser();

    // Create Header component (like React)
    this.header = new Header(true);
    container.appendChild(this.header.getElement());

    // Center container with React exact gradient and borders
    const centerContainer = document.createElement('div');
    centerContainer.className = 'w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600 self-center border-x-4 border-t-4 flex flex-col p-4 overflow-auto';

    // Header section with BackBtn (React exact)
    const headerSection = document.createElement('div');
    headerSection.className = 'text-center text-[4rem] border-b-2 w-full flex';

    // Create BackBtn component
    this.backBtn = new BackBtn();
    headerSection.appendChild(this.backBtn.getElement());

    // Title (React exact)
    const title = document.createElement('h1');
    title.className = 'flex-1';
    title.textContent = 'Profile';
    headerSection.appendChild(title);

    // Right spacer (React exact)
    const rightSpacer = document.createElement('div');
    rightSpacer.className = 'flex-1';
    headerSection.appendChild(rightSpacer);

    centerContainer.appendChild(headerSection);

    // Main content layout (React exact 2-columns)
    const mainContent = document.createElement('div');
    mainContent.className = 'flex m-10 flex-grow';

    // Left column: User info + forms (React exact)
    const leftColumn = document.createElement('div');
    leftColumn.className = 'flex flex-col flex-[1.5] text-[2rem] gap-10';

    // Username section (React exact)
    const usernameSection = document.createElement('div');
    usernameSection.className = 'flex gap-[9.5rem]';
    usernameSection.innerHTML = `
      <h4>Username</h4>
      <h2>${user?.username || 'User'}</h2>
    `;
    leftColumn.appendChild(usernameSection);

    // Display Name section (functional)
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
          class="bg-blue-400 w-[50px] rounded-md hover:scale-90 ml-3 border-2 border-white transition-transform"
        >
          &#x2713;
        </button>
      </div>
    `;
    leftColumn.appendChild(displayNameSection);

    // Password section (functional)
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

    mainContent.appendChild(leftColumn);

    // Right column: Avatar (React exact)
    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex-[0.5] flex justify-center relative';
    
    // Avatar (functional with proper URL handling)
    rightColumn.innerHTML = `
      <img 
        id="user-avatar"
        src="${getAvatarUrl(user?.avatar_url)}" 
        alt="Avatar" 
        class="h-[295px] w-[300px] border-4 p-0 border-blue-800"
      />
      
      <button 
        id="edit-avatar-btn"
        class="absolute top-[275px] border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.3rem] rounded-md transition-transform"
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
    // Display Name Save Button
    const saveDisplayNameBtn = this.element.querySelector('#save-display-name');
    saveDisplayNameBtn?.addEventListener('click', () => this.handleSaveDisplayName());

    // Change Password Button
    const changePasswordBtn = this.element.querySelector('#change-password-btn');
    changePasswordBtn?.addEventListener('click', () => this.openPasswordModal());

    // Edit Avatar Button
    const editAvatarBtn = this.element.querySelector('#edit-avatar-btn');
    editAvatarBtn?.addEventListener('click', () => this.openAvatarModal());

  }

  private async handleSaveDisplayName(): Promise<void> {
    const input = this.element.querySelector('#display-name-input') as HTMLInputElement;
    if (!input) return;

    const newDisplayName = input.value.trim();
    const user = authManager.getCurrentUser();
    const currentDisplayName = user?.display_name?.trim() ?? '';

    // Validation
    if (newDisplayName.length < 3) {
      alert('Display name must be at least 3 characters long');
      return;
    }

    if (newDisplayName === currentDisplayName) {
      console.log('Display name unchanged, no update needed');
      return;
    }

    try {
      await apiService.updateProfileDisplayName(newDisplayName);
      
      // Refresh user data
      await authManager.refreshUser();
      
      // Update Header display name too!
      if (this.header) {
        this.header.refresh();
      }
      
      // Show success feedback
      this.showFeedback('Display name updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error updating display name:', error);
      this.showFeedback('Error updating display name', 'error');
    }
  }

  private openPasswordModal(): void {
    this.showPasswordModal = true;
    this.renderPasswordModal();
  }

  private openAvatarModal(): void {
    this.showAvatarModal = true;
    this.renderAvatarModal();
  }

  private renderPasswordModal(): void {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'password-modal';
    modalOverlay.className = 'fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center';

    // Modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem]';

    // Create CloseBtn component (React exact)
    this.passwordModalCloseBtn = new CloseBtn(() => this.closePasswordModal());
    modalContainer.appendChild(this.passwordModalCloseBtn.getElement());

    // Modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'flex flex-col justify-center items-center mt-6 gap-4 px-8';
    modalContent.innerHTML = `
      <div>
        <h2>Current password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="current-password"/>
          <button id="toggle-current" class="w-[50px] rounded-md ml-3 border-2 border-white">
            👁️
          </button>
        </div>
      </div>

      <div>
        <h2>New password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="new-password"/>
          <button id="toggle-new" class="w-[50px] rounded-md ml-3 border-2 border-white">
            👁️
          </button>
        </div>
      </div>

      <div>
        <h2>Confirm new password</h2>
        <div class="flex">
          <input type="password" class="text-black rounded-md indent-4" id="confirm-password"/>
          <button id="toggle-confirm" class="w-[50px] rounded-md ml-3 border-2 border-white">
            👁️
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

    // Bind events
    this.setupPasswordModalEvents();
  }

  private setupPasswordModalEvents(): void {
    const modal = document.getElementById('password-modal');
    if (!modal) return;

    // Toggle password visibility (React exact)
    const toggles = ['current', 'new', 'confirm'];
    toggles.forEach(type => {
      const toggleBtn = modal.querySelector(`#toggle-${type}`);
      const input = modal.querySelector(`#${type}-password`) as HTMLInputElement;
      
      toggleBtn?.addEventListener('click', () => {
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
          toggleBtn.textContent = input.type === 'password' ? '👁️' : '🙈';
        }
      });
    });

    // Save password
    const saveBtn = modal.querySelector('#save-password');
    saveBtn?.addEventListener('click', () => this.handleSavePassword());
  }

  private async handleSavePassword(): Promise<void> {
    const modal = document.getElementById('password-modal');
    if (!modal) return;

    const currentPassword = (modal.querySelector('#current-password') as HTMLInputElement)?.value;
    const newPassword = (modal.querySelector('#new-password') as HTMLInputElement)?.value;
    const confirmPassword = (modal.querySelector('#confirm-password') as HTMLInputElement)?.value;
    const statusElement = modal.querySelector('#password-status');

    // Validation
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
      
      // Use actual API call (React exact)
      await apiService.changePassword(currentPassword, newPassword);
      
      this.updatePasswordStatus('Password updated successfully!', 'success');
      
      setTimeout(() => {
        this.closePasswordModal();
      }, 1500);
      
    } catch (error) {
      console.error('Error updating password:', error);
      this.updatePasswordStatus('Error updating password', 'error');
    }
  }

  private renderAvatarModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'avatar-modal';
    modalOverlay.className = 'fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center';

    // Modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'flex flex-col bg-pink-800 w-[500px] h-[600px] border-[5px] border-white text-[2rem]';

    // Create CloseBtn component (React exact)
    this.avatarModalCloseBtn = new CloseBtn(() => this.closeAvatarModal());
    modalContainer.appendChild(this.avatarModalCloseBtn.getElement());

    // Create AvatarSelect component (React exact)
    this.avatarSelect = new AvatarSelect(() => {
      // Avatar change callback - update main avatar
      this.updateMainAvatar();
    });
    modalContainer.appendChild(this.avatarSelect.getElement());

    // Upload section (like React but with AvatarSelect above)
    const uploadSection = document.createElement('div');
    uploadSection.className = 'flex-grow flex items-center justify-center';
    uploadSection.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <input type="file" id="avatar-file-input" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden"/>
        
        <button id="upload-avatar-btn" class="border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.5rem] rounded-md transition-transform">
          IMPORT FILE
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

    // Upload button
    const uploadBtn = modal.querySelector('#upload-avatar-btn');
    const fileInput = modal.querySelector('#avatar-file-input') as HTMLInputElement;
    
    uploadBtn?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.handleAvatarUpload(file);
      }
    });
  }

  private updateMainAvatar(): void {
    // Update the main avatar image when avatar changes (permanent)
    const user = authManager.getCurrentUser();
    const mainAvatar = document.querySelector('#user-avatar') as HTMLImageElement;
    
    if (mainAvatar) {
      const newAvatarUrl = getAvatarUrl(user?.avatar_url);
      mainAvatar.src = newAvatarUrl;
    }
    
    // CRUCIAL: Update Header avatar too!
    if (this.header) {
      this.header.refresh();
    }
  }

  private async handleAvatarUpload(file: File): Promise<void> {
    try {
      this.updateUploadStatus('Uploading avatar...', 'info');
      
      const result = await apiService.uploadAvatar(file);
      
      // Refresh user data (React exact)
      await authManager.refreshUser();
      
      // Update main avatar
      this.updateMainAvatar();
      
      this.updateUploadStatus('Avatar updated successfully!', 'success');
      
      setTimeout(() => {
        this.closeAvatarModal();
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      this.updateUploadStatus('Error uploading avatar', 'error');
    }
  }

  private closePasswordModal(): void {
    this.showPasswordModal = false;
    
    // Cleanup components
    if (this.passwordModalCloseBtn) {
      this.passwordModalCloseBtn.destroy();
      this.passwordModalCloseBtn = undefined;
    }
    
    const modal = document.getElementById('password-modal');
    modal?.remove();
  }

  private closeAvatarModal(): void {
    this.showAvatarModal = false;
    
    // Cleanup components
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
        type === 'success' ? 'text-green-400' : 
        type === 'error' ? 'text-red-400' : 
        'text-blue-400'
      }`;
    }
  }

  private updateUploadStatus(message: string, type: 'success' | 'error' | 'info'): void {
    const statusElement = document.querySelector('#upload-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `text-[1.2rem] min-h-[1.5rem] text-center ${
        type === 'success' ? 'text-green-400' : 
        type === 'error' ? 'text-red-400' : 
        'text-blue-400'
      }`;
    }
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    // Remove after 3 seconds
    setTimeout(() => {
      feedback.remove();
    }, 3000);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    // Cleanup components
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }
    
    this.element.remove();
  }
}