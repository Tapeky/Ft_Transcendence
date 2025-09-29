import { Router } from '../app/Router';

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
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  currentPath: string;
  lastActivity: Date;
  stateVersion: number;
}

type StateSubscriber = (state: AppStateData) => void;
type StateUpdater = Partial<AppStateData>;

export class AppState {
  private state: AppStateData;
  private subscribers: StateSubscriber[] = [];
  private stateHistory: AppStateData[] = [];
  private maxHistorySize = 10;
  public router: Router | null = null;

  constructor() {
    this.state = this.getInitialState();
  }

  public getState(): AppStateData {
    return { ...this.state };
  }
  public getRouter(): Router | null {
    return this.router;
  }
  public getSubscriberCount(): number {
    return this.subscribers.length;
  }
  public getStateHistory(): AppStateData[] {
    return [...this.stateHistory];
  }
  public setRouter(router: Router): void {
    this.router = router;
  }
  public setLoading(loading: boolean): void {
    this.setState({ loading });
  }
  public updateCurrentPath(path: string): void {
    this.setState({ currentPath: path });
  }

  private getInitialState(): AppStateData {
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      currentPath: window.location.pathname,
      lastActivity: new Date(),
      stateVersion: 1,
    };
  }

  public setState(updates: StateUpdater): void {
    this.saveToHistory();
    const previousState = { ...this.state };
    this.state = {
      ...this.state,
      ...updates,
      stateVersion: this.state.stateVersion + 1,
      lastActivity: new Date(),
    };
    this.notifySubscribers();
  }

  public subscribe(callback: StateSubscriber): () => void {
    this.subscribers.push(callback);
    callback(this.getState());
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(): void {
    const currentState = this.getState();
    this.subscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  private saveToHistory(): void {
    this.stateHistory.push({ ...this.state });
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  public batchUpdate(updater: (currentState: AppStateData) => StateUpdater): void {
    const currentState = this.getState();
    const updates = updater(currentState);
    this.setState(updates);
  }

  public reset(): void {
    this.state = this.getInitialState();
    this.stateHistory = [];
    this.notifySubscribers();
  }
}

export const appState = new AppState();
