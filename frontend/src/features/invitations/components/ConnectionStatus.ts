// ConnectionStatus - Pastille de statut de connexion en bas à gauche
import { gameInviteService } from '../services/GameInviteService';

export class ConnectionStatus {
  private element: HTMLElement;
  private statusInterval?: number;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.startStatusMonitoring();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-iceland';
    
    container.innerHTML = `
      <div id="status-dot" class="w-3 h-3 rounded-full bg-gray-500 transition-colors"></div>
      <span id="status-text">Connecting...</span>
    `;

    return container;
  }

  private bindEvents(): void {
    // Tooltip on hover
    this.element.addEventListener('mouseenter', () => {
      this.element.title = this.getDetailedStatus();
    });
  }

  private startStatusMonitoring(): void {
    // Update immédiatement
    this.updateStatus();
    
    // Puis toutes les 2 secondes
    this.statusInterval = window.setInterval(() => {
      this.updateStatus();
    }, 2000);
  }

  private updateStatus(): void {
    const dot = this.element.querySelector('#status-dot') as HTMLElement;
    const text = this.element.querySelector('#status-text') as HTMLElement;
    
    if (!dot || !text) return;

    const isConnected = gameInviteService.isConnected();
    
    if (isConnected) {
      // 🟢 Connecté
      dot.className = 'w-3 h-3 rounded-full bg-green-500 transition-colors shadow-sm shadow-green-400';
      text.textContent = 'Connected';
      this.element.className = this.element.className.replace('bg-opacity-70', 'bg-opacity-60');
    } else {
      // 🔴 Déconnecté  
      dot.className = 'w-3 h-3 rounded-full bg-red-500 transition-colors shadow-sm shadow-red-400 animate-pulse';
      text.textContent = 'Disconnected';
      this.element.className = this.element.className.replace('bg-opacity-60', 'bg-opacity-70');
    }
  }

  private getDetailedStatus(): string {
    const isConnected = gameInviteService.isConnected();
    
    if (isConnected) {
      return 'Connected to game invite service - Ready to send/receive invitations';
    } else {
      return 'Disconnected from game invite service - Invitations unavailable';
    }
  }

  public show(): void {
    if (!document.body.contains(this.element)) {
      document.body.appendChild(this.element);
    }
  }

  public hide(): void {
    if (document.body.contains(this.element)) {
      this.element.remove();
    }
  }

  public destroy(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = undefined;
    }
    this.hide();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}