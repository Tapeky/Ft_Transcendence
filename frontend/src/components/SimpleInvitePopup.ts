// 🎯 KISS Invite Popup - Une seule classe, pas de manager
export class SimpleInvitePopup {
  private element: HTMLElement;

  constructor(private invite: { id: string; from: string; fromId: number }) {
    this.element = this.create();
    this.show();
  }

  private create(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = `
      fixed top-4 right-4 z-50 
      bg-blue-600 text-white p-4 rounded-lg shadow-lg
      w-80 border-2 border-white
    `;

    popup.innerHTML = `
      <h3 class="text-lg font-bold mb-2">🎮 Game Invite</h3>
      <p class="mb-4">${this.invite.from} wants to play!</p>
      <div class="flex gap-2">
        <button id="accept" class="flex-1 bg-green-500 hover:bg-green-600 px-3 py-1 rounded">
          Accept
        </button>
        <button id="decline" class="flex-1 bg-red-500 hover:bg-red-600 px-3 py-1 rounded">
          Decline
        </button>
        <button id="close" class="px-2">✕</button>
      </div>
    `;

    // Events simples
    popup.querySelector('#accept')?.addEventListener('click', () => {
      this.respond(true);
    });
    
    popup.querySelector('#decline')?.addEventListener('click', () => {
      this.respond(false);
    });
    
    popup.querySelector('#close')?.addEventListener('click', () => {
      this.close();
    });

    return popup;
  }

  private respond(accept: boolean): void {
    // Import dynamique pour éviter les dépendances circulaires
    import('../services/GameInviteService').then(({ gameInvites }) => {
      gameInvites.respondToInvite(this.invite.id, accept);
    });
    
    this.close();
  }

  private show(): void {
    document.body.appendChild(this.element);
    
    // Auto-close après 30 secondes
    setTimeout(() => this.close(), 30000);
  }

  private close(): void {
    this.element.remove();
  }
}