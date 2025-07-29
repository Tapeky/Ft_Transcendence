import { TabManager, TabType } from '../TabManager';
import { ChatManager } from './chat/ChatManager';
import { FriendsTabHandler } from './tabs/FriendsTabHandler';
import { BlockedTabHandler } from './tabs/BlockedTabHandler';
import { RequestsTabHandler } from './tabs/RequestsTabHandler';
import { ChatTabHandler } from './tabs/ChatTabHandler';
import { FriendListConfig, TabHandlerConfig } from './types';

export class FriendListModal {
  private element: HTMLElement;
  private onClose: () => void;
  private visible: boolean = true;
  private activeTab: TabType = 'friends';

  // Components
  private tabManager?: TabManager;
  private chatManager: ChatManager;
  
  // Tab handlers
  private friendsTabHandler?: FriendsTabHandler;
  private blockedTabHandler?: BlockedTabHandler;
  private requestsTabHandler?: RequestsTabHandler;
  private chatTabHandler?: ChatTabHandler;

  // Navigation cleanup
  private originalPushState?: typeof history.pushState;
  private originalReplaceState?: typeof history.replaceState;
  private navigationCleanup?: () => void;

  constructor(config: FriendListConfig) {
    this.onClose = config.onClose;
    this.chatManager = new ChatManager();
    this.element = this.createElement();
    this.bindEvents();
    this.initializeComponents();
    this.setupNavigationListener();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = `${this.visible ? 'flex' : 'hidden'} fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-start pt-20 text-white transition-opacity duration-200`;
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'friends-title');

    container.innerHTML = `
      <!-- Modal principal -->
      <div class="flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[500px] max-w-[90vw] h-[600px] max-h-[90vh] border-[5px] border-black text-[2rem] box-border font-iceland select-none transform transition-transform duration-300 ease-out">
        
        <!-- Screen reader title -->
        <h1 id="friends-title" class="sr-only">Friends Management</h1>
        
        <!-- Header avec onglets et boutons -->
        <div class="flex justify-between items-center h-[60px] w-full flex-shrink-0 px-4 py-2 border-b-2 border-black">
          <!-- Navigation par onglets -->
          <div id="tab-navigation" class="flex gap-1">
            <!-- TabManager will be inserted here -->
          </div>

          <!-- Actions à droite -->
          <div class="flex gap-2 items-center">
            <!-- Refresh Button -->
            <button id="refresh-btn" 
                    class="border-2 h-[40px] w-[40px] bg-white border-black hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" 
                    aria-label="Refresh current tab" 
                    title="Refresh">
              <img src="/src/img/refresh.svg" alt="refresh" />
            </button>
            
            <!-- Close Button -->
            <button id="close-btn" 
                    class="w-[40px] h-[40px] bg-white border-2 border-black text-black text-[1.5rem] hover:bg-gray-200 focus:ring-2 focus:ring-blue-500" 
                    aria-label="Close friends list" 
                    title="Close">
              ×
            </button>
          </div>
        </div>

        <!-- Zone de contenu dynamique -->
        <div id="content-area" class="flex-grow overflow-auto flex flex-col items-center">
          <!-- Le contenu changera selon l'onglet actif -->
        </div>

      </div>
    `;

    return container;
  }

  private bindEvents(): void {
    // Close button
    const closeButton = this.element.querySelector('#close-btn');
    closeButton?.addEventListener('click', () => this.close());

    // Refresh button
    const refreshBtn = this.element.querySelector('#refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refreshCurrentTab());

    // Click outside to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.close();
      }
    });

    // Focus management
    const closeBtnFocus = this.element.querySelector('#close-btn') as HTMLButtonElement;
    if (closeBtnFocus) {
      setTimeout(() => closeBtnFocus.focus(), 100);
    }
  }

  private initializeComponents(): void {
    // Initialize TabManager
    this.tabManager = new TabManager({
      tabs: [
        { id: 'friends', label: 'Friends', active: true },
        { id: 'blocked', label: 'Blocked', active: false },
        { id: 'requests', label: 'Requests', active: false },
        { id: 'chat', label: 'Chat', active: false }
      ],
      onTabChange: (tab: TabType) => this.switchTab(tab)
    });

    // Insert TabManager into navigation area
    const tabNavigation = this.element.querySelector('#tab-navigation');
    if (tabNavigation) {
      tabNavigation.appendChild(this.tabManager.getElement());
    }

    // Initialize with Friends tab
    this.renderCurrentTab();
  }

  private setupNavigationListener(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const closeOnNavigation = () => {
      this.close();
    };
    
    history.pushState = function(state, title, url) {
      const result = originalPushState.call(this, state, title, url);
      closeOnNavigation();
      return result;
    };
    
    history.replaceState = function(state, title, url) {
      const result = originalReplaceState.call(this, state, title, url);
      closeOnNavigation();
      return result;
    };
    
    window.addEventListener('popstate', closeOnNavigation);
    
    this.originalPushState = originalPushState;
    this.originalReplaceState = originalReplaceState;
    this.navigationCleanup = closeOnNavigation;
  }

  private switchTab(tab: TabType): void {
    this.activeTab = tab;
    this.renderCurrentTab();
  }

  private async renderCurrentTab(): Promise<void> {
    const contentArea = this.element.querySelector('#content-area');
    if (!contentArea) return;

    // Clear content
    contentArea.innerHTML = '';

    // Destroy existing handlers to prevent memory leaks
    this.destroyCurrentHandler();

    const handlerConfig: TabHandlerConfig = {
      container: contentArea,
      onRefresh: () => this.refreshCurrentTab()
    };

    try {
      switch (this.activeTab) {
        case 'friends':
          this.friendsTabHandler = new FriendsTabHandler(handlerConfig);
          await this.friendsTabHandler.initialize();
          break;

        case 'blocked':
          this.blockedTabHandler = new BlockedTabHandler(handlerConfig);
          await this.blockedTabHandler.initialize();
          break;

        case 'requests':
          this.requestsTabHandler = new RequestsTabHandler(handlerConfig);
          await this.requestsTabHandler.initialize();
          break;

        case 'chat':
          this.chatTabHandler = new ChatTabHandler(handlerConfig, this.chatManager);
          await this.chatTabHandler.initialize();
          break;
      }
    } catch (error) {
      console.error(`❌ Error rendering ${this.activeTab} tab:`, error);
    }
  }

  private destroyCurrentHandler(): void {
    const handlers = [
      this.friendsTabHandler,
      this.blockedTabHandler,
      this.requestsTabHandler,
      this.chatTabHandler
    ];

    handlers.forEach(handler => {
      if (handler) {
        handler.destroy();
      }
    });

    // Reset handlers
    this.friendsTabHandler = undefined;
    this.blockedTabHandler = undefined;
    this.requestsTabHandler = undefined;
    this.chatTabHandler = undefined;
  }

  private async refreshCurrentTab(): Promise<void> {
    const currentHandler = this.getCurrentHandler();
    if (currentHandler) {
      await currentHandler.refresh();
    }
  }

  private getCurrentHandler(): any {
    switch (this.activeTab) {
      case 'friends': return this.friendsTabHandler;
      case 'blocked': return this.blockedTabHandler;
      case 'requests': return this.requestsTabHandler;
      case 'chat': return this.chatTabHandler;
      default: return null;
    }
  }

  private close(): void {
    this.visible = false;
    this.element.remove();
    this.onClose();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.element.classList.remove('hidden');
      this.element.classList.add('flex');
    } else {
      this.element.classList.add('hidden');
      this.element.classList.remove('flex');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.destroyCurrentHandler();
    this.chatManager.destroy();
    
    if (this.tabManager) {
      this.tabManager.destroy();
    }

    // Cleanup navigation listeners
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
    if (this.navigationCleanup) {
      window.removeEventListener('popstate', this.navigationCleanup);
    }

    if (this.element.parentNode) {
      this.element.remove();
    }
  }
}