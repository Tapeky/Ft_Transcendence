import { router } from '../core/app/Router';
import { Header } from '../shared/components/Header';

export class NotFoundPage {
  private element: HTMLElement;
  private header?: Header;
  

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    this.header = new Header(false);

    const div = document.createElement('div');
    div.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland';
    const content = document.createElement('div');
    div.appendChild(this.header.getElement());
    content.className = 'flex flex-col flex-grow min-h-full';
    content.innerHTML = `
      <div class="flex-grow flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 font-iceland">
        <div class="text-white text-center max-w-md mx-auto px-6">
          <div class="mb-8">
            <h1 class="text-[8rem] font-iceland">404</h1>
            <h2 class="text-[3rem] font-iceland mb-6">Not found</h2>
            <p class="text-white text-[2rem]">
              Are you lost ?
            </p>
          </div>
          
          <div class="space-y-4">
            <button id="home-btn" class="w-full px-6 py-3 bg-blue-700 hover:bg-blue-600 hover:scale-110 rounded-lg text-[1.7rem] duration-200">
              Back to main page
            </button>
          </div>
        </div>
      </div>
    `;
    div.appendChild(content);
    return div as HTMLElement;
  }

  private bindEvents(): void {
    const homeButton = this.element.querySelector('#home-btn');

    homeButton?.addEventListener('click', () => router.navigate('/'));
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
