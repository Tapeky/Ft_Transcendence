export class CloseBtn {
  private element: HTMLElement;
  private onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col h-[50px] justify-center items-end';

    container.innerHTML = `
      <button 
        id="close-btn"
        class="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[50px] 
               mt-2 mr-2 flex items-center z-50 text-[2rem] text-white transition-transform 
               justify-center border-white"
      >
        X
      </button>
    `;

    container.querySelector('#close-btn')?.addEventListener('click', this.onClose);
    return container;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
