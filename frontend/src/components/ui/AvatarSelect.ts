// AvatarSelect - Reproduction exacte de la version React
// Grille d'avatars prédéfinis avec sélection et API integration

import { apiService, Avatar } from '../../services/api';
import { authManager } from '../../auth/AuthManager';
import { getAvatarUrl } from '../../utils/avatar';

export class AvatarSelect {
  private element: HTMLElement;
  private avatars: Avatar[] = [];
  private onAvatarChange?: () => void;

  constructor(onAvatarChange?: () => void) {
    this.onAvatarChange = onAvatarChange;
    this.element = this.createElement();
    this.loadAvatars();
    console.log('🎭 AvatarSelect: Initialized (React-like style)');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex gap-10 flex-wrap justify-center mt-3';
    container.id = 'avatar-select-container';

    // Initial loading state
    container.innerHTML = `
      <p class="text-white text-[1.5rem]">Loading avatars...</p>
    `;

    return container;
  }

  private async loadAvatars(): Promise<void> {
    try {
      console.log('🎭 AvatarSelect: Loading avatars from API');
      this.avatars = await apiService.getAvatars();
      this.renderAvatars();
    } catch (error) {
      console.error("Can't load avatars.", error);
      this.renderError();
    }
  }

  private renderAvatars(): void {
    const container = this.element;
    
    if (this.avatars.length === 0) {
      container.innerHTML = `
        <p class="text-white text-[1.5rem]">No avatars available</p>
      `;
      return;
    }

    // Clear loading and render avatars (React exact)
    container.innerHTML = '';
    
    this.avatars.forEach((avatar, index) => {
      const avatarImg = document.createElement('img');
      avatarImg.src = getAvatarUrl(avatar.url); // Use consistent avatar URL handling
      avatarImg.alt = 'avatar';
      avatarImg.className = 'h-[170px] w-[170px] cursor-pointer border-2 border-black hover:scale-125 transition duration-300';
      avatarImg.dataset.avatarId = avatar.id;
      
      // Click handler for avatar selection (React exact)
      avatarImg.addEventListener('click', () => this.handleAvatarClick(avatar.id));
      
      container.appendChild(avatarImg);
    });

    console.log(`🎭 AvatarSelect: Rendered ${this.avatars.length} avatars`);
  }

  private renderError(): void {
    this.element.innerHTML = `
      <p class="text-red-400 text-[1.5rem]">Error loading avatars</p>
    `;
  }

  private async handleAvatarClick(avatarId: string): Promise<void> {
    try {
      console.log('🎭 AvatarSelect: Setting avatar to:', avatarId);
      
      // Call API to set avatar (React exact)
      await apiService.setAvatar(avatarId);
      
      // Refresh user data (React exact)
      await authManager.refreshUser();
      
      // Notify parent component
      if (this.onAvatarChange) {
        this.onAvatarChange();
      }
      
      // Visual feedback
      this.showFeedback('Avatar updated successfully!');
      
    } catch (error) {
      console.error('Erreur lors du changement d\'avatar:', error);
      alert('Erreur lors du changement d\'avatar');
    }
  }

  private showFeedback(message: string): void {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium bg-green-600';
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    // Remove after 2 seconds
    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    console.log('🎭 AvatarSelect: Destroyed');
    this.element.remove();
  }
}