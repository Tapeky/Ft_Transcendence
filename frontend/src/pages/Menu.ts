import { authManager } from '../auth/AuthManager';
import { router } from '../app/Router';
import { Header } from '../components/ui/Header';
import { Banner } from '../components/ui/Banner';
import { Choice } from '../components/ui/Choice';

export class MenuPage {
  private element: HTMLElement;
  private header?: Header;
  private banner?: Banner;
  private choice?: Choice;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    this.subscribeToAuth();
    
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    // Create components
    this.header = new Header(true); // userVisible = true
    this.banner = new Banner();
    this.choice = new Choice();

    // Assemble the page (reproduction exacte du React Menu)
    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(this.choice.getElement());

    return container;
  }

  private bindEvents(): void {
    // Les événements sont gérés par les composants individuels
  }

  private subscribeToAuth(): void {
    // Vérifier l'authentification comme dans le React Menu
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
        router.navigate('/');
      }
    });

    // Vérification initiale
    if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
      router.navigate('/');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    // Cleanup components
    if (this.header) {
      this.header.destroy();
    }
    if (this.banner) {
      this.banner.destroy();
    }
    if (this.choice) {
      this.choice.destroy();
    }

    // Cleanup auth subscription
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    
    this.element.remove();
  }
}