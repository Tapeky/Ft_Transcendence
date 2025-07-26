import { Header } from '../components/vanilla/Header';
import { Banner } from '../components/vanilla/Banner';
import { Choice } from '../components/vanilla/Choice';

// MenuTest - Test page pour tester les composants Menu sans protection auth
export class MenuTestPage {
  private element: HTMLElement;
  private header?: Header;
  private banner?: Banner;
  private choice?: Choice;

  constructor() {
    this.element = this.createElement();
    console.log('🧪 MenuTestPage: Initialized for testing');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    // Create components for testing
    this.header = new Header(true); // userVisible = true
    this.banner = new Banner();
    this.choice = new Choice();

    // Assemble the page (reproduction exacte du React Menu)
    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(this.choice.getElement());

    return container;
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
    
    console.log('🧪 MenuTestPage: Destroyed');
    this.element.remove();
  }
}