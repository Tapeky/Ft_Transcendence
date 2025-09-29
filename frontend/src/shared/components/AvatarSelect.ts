import { apiService, Avatar } from '../services/api';
import { authManager } from '../../core/auth/AuthManager';
import { getAvatarUrl } from '../utils/avatar';

export class AvatarSelect {
  private element: HTMLElement;
  private avatars: Avatar[] = [];
  private onAvatarChange?: () => void;

  constructor(onAvatarChange?: () => void) {
    this.onAvatarChange = onAvatarChange;
    this.element = this.createElement();
    this.loadAvatars();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex gap-10 flex-wrap justify-center mt-3';
    container.id = 'avatar-select-container';
    container.innerHTML = '<p class="text-white text-[1.5rem]">Loading avatars...</p>';
    return container;
  }

  private async loadAvatars(): Promise<void> {
    try {
      this.avatars = await apiService.getAvatars();
      this.renderAvatars();
    } catch (error) {
      console.error('Failed to load avatars', error);
      this.renderError();
    }
  }

  private renderAvatars(): void {
    const container = this.element;
    if (this.avatars.length === 0) {
      container.innerHTML = '<p class="text-white text-[1.5rem]">No avatars available</p>';
      return;
    }
    container.innerHTML = '';
    this.avatars.forEach(avatar => {
      const avatarImg = document.createElement('img');
      avatarImg.src = getAvatarUrl(avatar.url);
      avatarImg.alt = 'avatar';
      avatarImg.className =
        'h-[170px] w-[170px] cursor-pointer border-2 border-black hover:scale-125 transition duration-300';
      avatarImg.dataset.avatarId = avatar.id;
      avatarImg.addEventListener('click', () => this.handleAvatarClick(avatar.id));
      container.appendChild(avatarImg);
    });
  }

  private renderError(): void {
    this.element.innerHTML = '<p class="text-red-400 text-[1.5rem]">Error loading avatars</p>';
  }

  private async handleAvatarClick(avatarId: string): Promise<void> {
    try {
      await apiService.setAvatar(avatarId);
      await authManager.refreshUser();
      if (this.onAvatarChange) this.onAvatarChange();
      this.showFeedback('Avatar updated successfully!');
    } catch (error) {
      console.error('Failed to update avatar', error);
      alert('Failed to update avatar');
    }
  }

  private showFeedback(message: string): void {
    const feedback = document.createElement('div');
    feedback.className =
      'fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium bg-green-600';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2000);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
