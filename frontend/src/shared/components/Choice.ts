import { router } from '../../core/app/Router';

// Choice - Reproduction exacte de la version React  
// 2 boutons Pong et Tournament avec animations hover et backgrounds GIF

export class Choice {
  private element: HTMLElement;

  constructor() {
    this.element = this.createElement();
    this.bindEvents();
    
  }

  private createElement(): HTMLElement {
    const main = document.createElement('main');
    main.id = 'bg';
    main.className = 'flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700';

    main.innerHTML = `
      <!-- Section Gauche - PONG -->
      <div class="flex-1 flex items-center justify-end">
        <div 
          id="pong-choice" 
          class="text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                 text-[4rem] bg-[url('./img/jinx.gif')] bg-cover 
                 flex justify-center items-center hover:scale-125 transition duration-500 cursor-pointer"
          data-route="/game"
        >
          PONG
        </div>
      </div>

      <!-- Section Centre - Titre -->
      <div class="flex-1 flex items-center justify-center text-[5rem] text-center text-white">
        CHOOSE YOUR MODE
      </div>

      <!-- Section Droite - TOURNAMENT -->
      <div class="flex-1 flex items-center justify-start">
        <div 
          id="tournament-choice" 
          class="text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                 text-[4rem] bg-[url('./img/tournament.gif')] bg-cover bg-center 
                 flex justify-center items-center hover:scale-125 transition duration-500 cursor-pointer"
          data-route="/tournament"
        >
          TOURNAMENT
        </div>
      </div>
    `;

    return main;
  }

  private bindEvents(): void {
    // Pong choice navigation
    const pongChoice = this.element.querySelector('#pong-choice');
    pongChoice?.addEventListener('click', () => this.navigateToGame());

    // Tournament choice navigation  
    const tournamentChoice = this.element.querySelector('#tournament-choice');
    tournamentChoice?.addEventListener('click', () => this.navigateToTournament());

    this.setupHoverEffects();

  }

  private setupHoverEffects(): void {
    // Effet sonore hover (optionnel)
    const choices = this.element.querySelectorAll('[data-route]');
    
    choices.forEach(choice => {
      choice.addEventListener('mouseenter', () => {
        // Ajouter un effet sonore de hover si désiré
      });

      choice.addEventListener('mouseleave', () => {
        // Effet de sortie de hover si désiré
      });
    });
  }

  private navigateToGame(): void {
    router.navigate('/game');
  }

  private navigateToTournament(): void {
    router.navigate('/tournament');
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}