// Application State Management - Vanilla TypeScript
// Remplace React Context pour la gestion d'état globale

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  is_online: boolean;
  total_wins: number;
  total_losses: number;
  total_games: number;
  created_at: string;
}

export interface AppStateData {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // UI state
  currentPath: string;
  
  // App state
  lastActivity: Date;
  
  // Debug info
  stateVersion: number;
}

type StateSubscriber = (state: AppStateData) => void;
type StateUpdater = Partial<AppStateData>;

export class AppState {
  private state: AppStateData;
  private subscribers: StateSubscriber[] = [];
  private stateHistory: AppStateData[] = [];
  private maxHistorySize = 10;
  public router: any = null; // Will be set by main initialization

  constructor() {
    this.state = this.getInitialState();
    this.setupDevTools();
    
  }

  public setRouter(router: any): void {
    this.router = router;
  }

  private getInitialState(): AppStateData {
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      currentPath: window.location.pathname,
      lastActivity: new Date(),
      stateVersion: 1
    };
  }

  // Core state management methods
  public setState(updates: StateUpdater): void {
    
    // Save current state to history
    this.saveToHistory();
    
    // Update state immutably
    const previousState = { ...this.state };
    this.state = {
      ...this.state,
      ...updates,
      stateVersion: this.state.stateVersion + 1,
      lastActivity: new Date()
    };
    
    
    // Notify all subscribers
    this.notifySubscribers();
  }

  public getState(): AppStateData {
    return { ...this.state };
  }

  public subscribe(callback: StateSubscriber): () => void {
    
    this.subscribers.push(callback);
    
    // Immediately call with current state
    callback(this.getState());
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(): void {
    
    const currentState = this.getState();
    this.subscribers.forEach((callback, index) => {
      try {
        callback(currentState);
      } catch (error) {
      }
    });
  }

  // Utility methods
  public getSubscriberCount(): number {
    return this.subscribers.length;
  }

  public getStateHistory(): AppStateData[] {
    return [...this.stateHistory];
  }

  private saveToHistory(): void {
    this.stateHistory.push({ ...this.state });
    
    // Keep only last N states
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  // Authentication helpers
  public login(user: User): void {
    this.setState({
      user,
      isAuthenticated: true,
      loading: false
    });
  }

  public logout(): void {
    this.setState({
      user: null,
      isAuthenticated: false,
      loading: false
    });
  }

  public setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  // Navigation helpers
  public updateCurrentPath(path: string): void {
    this.setState({ currentPath: path });
  }

  // Debug and development tools
  private setupDevTools(): void {
    // Make available in browser console for debugging
    (window as any).appState = this;
    (window as any).getAppState = () => this.getState();
    (window as any).setAppState = (updates: StateUpdater) => this.setState(updates);
    
  }

  public debugInfo(): void {
  }

  // Batch updates to prevent multiple notifications
  public batchUpdate(updater: (currentState: AppStateData) => StateUpdater): void {
    const currentState = this.getState();
    const updates = updater(currentState);
    this.setState(updates);
  }

  // Reset state (useful for testing)
  public reset(): void {
    this.state = this.getInitialState();
    this.stateHistory = [];
    this.notifySubscribers();
  }
}

// Export singleton instance
export const appState = new AppState();

// Export for testing
export const createAppState = () => new AppState();