import { appState, AppStateData } from '../state/AppState';

// Component simple pour tester les subscriptions multiples
export class StateMonitor {
  private element: HTMLElement;
  private unsubscribe?: () => void;
  private updateCount = 0;

  constructor(private id: string, private position: { x: number; y: number }) {
    this.element = this.createElement();
    this.subscribeToState();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.id = `state-monitor-${this.id}`;
    div.style.cssText = `
      position: fixed;
      top: ${this.position.y}px;
      right: ${this.position.x}px;
      width: 200px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid #4F46E5;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;

    div.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #4F46E5;">
        Monitor ${this.id}
      </div>
      <div id="monitor-content-${this.id}">
        Initializing...
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #333; font-size: 10px; color: #888;">
        Updates: <span id="update-count-${this.id}">0</span>
      </div>
      <button id="close-monitor-${this.id}" style="
        position: absolute;
        top: 4px;
        right: 4px;
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      ">×</button>
    `;

    // Bind close button
    const closeBtn = div.querySelector(`#close-monitor-${this.id}`);
    closeBtn?.addEventListener('click', () => this.destroy());

    return div;
  }

  private subscribeToState(): void {
    this.unsubscribe = appState.subscribe((state: AppStateData) => {
      this.updateCount++;
      this.updateDisplay(state);
    });

    console.log(`📺 StateMonitor ${this.id}: Subscribed to state`);
  }

  private updateDisplay(state: AppStateData): void {
    const content = this.element.querySelector(`#monitor-content-${this.id}`);
    const updateCounter = this.element.querySelector(`#update-count-${this.id}`);

    if (content) {
      content.innerHTML = `
        <div>👤 User: ${state.user?.username || 'null'}</div>
        <div>📍 Path: ${state.currentPath}</div>
        <div>🔢 Version: ${state.stateVersion}</div>
      `;
    }

    if (updateCounter && updateCounter instanceof HTMLElement) {
      updateCounter.textContent = this.updateCount.toString();
      updateCounter.style.color = this.updateCount > 5 ? '#10B981' : '#6B7280';
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    console.log(`📺 StateMonitor ${this.id}: Destroying monitor`);
    
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.element.remove();
  }

  public getUpdateCount(): number {
    return this.updateCount;
  }
}