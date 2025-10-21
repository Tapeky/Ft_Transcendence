import { router } from '../core/app/Router';

export class NotFoundPage {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
        <div class="text-white text-center max-w-md mx-auto px-6">
          <div class="mb-8">
            <h1 class="text-6xl font-iceland font-bold mb-4">404</h1>
            <h2 class="text-2xl font-iceland mb-6">Page Non Trouvée</h2>
            <p class="text-gray-300 mb-8">
              La page que vous cherchez n'existe pas ou a été déplacée.
            </p>
          </div>
          
          <div class="space-y-4">
            <button id="home-btn" class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors duration-200">
              Retour à l'Accueil
            </button>
          </div>
        </div>
      </div>
    `;
    return div.firstElementChild as HTMLElement;
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
