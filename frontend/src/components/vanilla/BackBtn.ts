// BackBtn - Reproduction exacte de la version React
// Bouton retour avec style Iceland et hover scale

export class BackBtn {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
    console.log('← BackBtn: Initialized (React-like style)');
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 flex items-center';

    container.innerHTML = `
      <button 
        id="back-btn"
        class="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[120px] 
               flex items-center justify-center text-[4rem] ml-6 text-white transition-transform"
      >
        ←
      </button>
    `;

    // Bind click event directly
    const backBtn = container.querySelector('#back-btn');
    backBtn?.addEventListener('click', () => {
      console.log('← BackBtn: Going back');
      window.history.back();
    });

    return container;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    console.log('← BackBtn: Destroyed');
    this.element.remove();
  }
}