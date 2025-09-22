import { authManager } from '../core/auth/AuthManager';
import { router } from '../core/app/Router';
import { Header } from '../shared/components/Header';
import { Banner } from '../shared/components/Banner';
import { Choice } from '../shared/components/Choice';

export class MenuPage {
  private element: HTMLElement;
  private header?: Header;
  private banner?: Banner;
  private choice?: Choice;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.subscribeToAuth();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true);
    this.banner = new Banner();
    this.choice = new Choice();

    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(this.choice.getElement());

    return container;
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
        router.navigate('/');
      }
    });

    if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
      router.navigate('/');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.header) this.header.destroy();
    if (this.banner) this.banner.destroy();
    if (this.choice) this.choice.destroy();
    if (this.authUnsubscribe) this.authUnsubscribe();
    this.element.remove();
  }
}
