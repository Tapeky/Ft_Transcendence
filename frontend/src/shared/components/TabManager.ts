export type TabType = 'friends' | 'blocked' | 'requests' | 'chat';

export interface TabConfig {
  id: TabType;
  label: string;
  active: boolean;
}

export interface TabManagerOptions {
  tabs: TabConfig[];
  onTabChange: (tab: TabType) => void;
}

export class TabManager {
  private element: HTMLElement;
  private tabs: TabConfig[];
  private onTabChange: (tab: TabType) => void;
  private activeTab: TabType;

  constructor(options: TabManagerOptions) {
    this.tabs = options.tabs;
    this.onTabChange = options.onTabChange;
    this.activeTab = this.tabs.find(t => t.active)?.id || this.tabs[0].id;
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex gap-1';

    this.tabs.forEach(tab => {
      const button = document.createElement('button');
      button.className = this.getTabButtonClass(tab.id);
      button.textContent = tab.label;
      button.dataset.tab = tab.id;
      container.appendChild(button);
    });

    return container;
  }

  private getTabButtonClass(tabId: TabType): string {
    const baseClass =
      'tab-btn px-3 py-1 text-[1.2rem] border-2 border-black rounded-t transition-colors';
    const activeClass = 'bg-white text-black';
    const inactiveClass = 'bg-gray-300 text-gray-600';

    return `${baseClass} ${tabId === this.activeTab ? activeClass : inactiveClass}`;
  }

  private bindEvents(): void {
    this.element.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tab-btn')) {
        const tabId = target.dataset.tab as TabType;
        this.switchTab(tabId);
      }
    });
  }

  private switchTab(tabId: TabType): void {
    if (tabId === this.activeTab) return;

    this.activeTab = tabId;
    this.updateTabAppearance();
    this.onTabChange(tabId);
  }

  private updateTabAppearance(): void {
    const buttons = this.element.querySelectorAll('.tab-btn');
    buttons.forEach(button => {
      const tabId = (button as HTMLElement).dataset.tab as TabType;
      button.className = this.getTabButtonClass(tabId);
    });
  }

  public setActiveTab(tabId: TabType): void {
    this.switchTab(tabId);
  }

  public getActiveTab(): TabType {
    return this.activeTab;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.element.parentNode) {
      this.element.remove();
    }
  }
}
