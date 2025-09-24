import { apiService } from '../../../shared/services/api';

export class PongInviteModal {
  private element: HTMLElement;
  private isOpen: boolean = false;
  private onClose?: () => void;

  constructor(onClose?: () => void) {
    this.onClose = onClose;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] hidden';
    
    modal.innerHTML = `
      <div class="bg-gray-800 text-white rounded-lg p-6 w-96 mx-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">🎮 Inviter à une partie Pong</h2>
          <button id="close-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">ID de l'ami :</label>
            <input 
              type="number" 
              id="friend-id-input" 
              placeholder="Entrez l'ID de votre ami"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            >
          </div>
          
          <div class="text-sm text-gray-400">
            💡 Vous pouvez trouver l'ID de vos amis dans leur profil ou demandez-leur directement.
          </div>
          
          <div class="flex space-x-3">
            <button 
              id="send-invite" 
              class="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🚀 Envoyer l'invitation
            </button>
            <button 
              id="cancel-invite" 
              class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
        
        <div id="invite-status" class="mt-4 text-center text-sm hidden"></div>
      </div>
    `;

    this.bindEvents();
    return modal;
  }

  private bindEvents(): void {
    const closeBtn = this.element.querySelector('#close-modal');
    const sendBtn = this.element.querySelector('#send-invite');
    const cancelBtn = this.element.querySelector('#cancel-invite');
    const input = this.element.querySelector('#friend-id-input') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());
    sendBtn?.addEventListener('click', () => this.sendInvite());
    
    // Fermer en cliquant sur le fond
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // Envoyer avec Entrée
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendInvite();
      }
    });
  }

  private async sendInvite(): Promise<void> {
    const input = this.element.querySelector('#friend-id-input') as HTMLInputElement;
    const sendBtn = this.element.querySelector('#send-invite') as HTMLButtonElement;
    const statusDiv = this.element.querySelector('#invite-status') as HTMLElement;
    
    const friendId = parseInt(input.value);
    
    if (!friendId || friendId <= 0) {
      this.showStatus('Veuillez entrer un ID valide', 'error');
      return;
    }

    try {
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Envoi...';
      
      const result = await apiService.inviteFriendToPong(friendId);
      
      if (result.success) {
        this.showStatus('✅ Invitation envoyée avec succès!', 'success');
        setTimeout(() => {
          this.close();
        }, 2000);
      } else {
        this.showStatus(`❌ ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ Failed to send invite:', error);
      this.showStatus('❌ Erreur de connexion', 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '🚀 Envoyer l\'invitation';
    }
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    const statusDiv = this.element.querySelector('#invite-status') as HTMLElement;
    statusDiv.textContent = message;
    statusDiv.className = `mt-4 text-center text-sm ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
    statusDiv.classList.remove('hidden');
  }

  public open(): void {
    this.isOpen = true;
    this.element.classList.remove('hidden');
    document.body.appendChild(this.element);
    
    // Focus sur l'input
    const input = this.element.querySelector('#friend-id-input') as HTMLInputElement;
    setTimeout(() => input?.focus(), 100);
  }

  public close(): void {
    this.isOpen = false;
    this.element.classList.add('hidden');
    
    // Réinitialiser le formulaire
    const input = this.element.querySelector('#friend-id-input') as HTMLInputElement;
    const statusDiv = this.element.querySelector('#invite-status') as HTMLElement;
    
    if (input) input.value = '';
    if (statusDiv) statusDiv.classList.add('hidden');
    
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    if (this.onClose) {
      this.onClose();
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    this.close();
  }
}