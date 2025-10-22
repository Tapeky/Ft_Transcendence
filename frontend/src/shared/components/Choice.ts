import { router } from '../../core/app/Router';

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
      <div class="flex-1 flex items-center justify-end">
        <div 
          id="pong-choice" 
          class="text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                 text-[4rem] bg-[url('./img/jinx.gif')] bg-cover 
                 flex justify-center items-center hover:scale-125 duration-500 cursor-pointer"
          data-route="/game"
        >
          PONG
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center text-[5rem] text-center text-white">
        CHOOSE YOUR MODE
      </div>

      <div class="flex-1 flex items-center justify-start">
        <div 
          id="tournament-choice" 
          class="text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                 text-[4rem] bg-[url('./img/city.png')] bg-cover bg-center 
                 flex justify-center items-center hover:scale-125 duration-500 cursor-pointer"
          data-route="/tournament"
        >
          TOURNAMENT
        </div>
      </div>
    `;

    return main;
  }

  private bindEvents(): void {
    const pongChoice = this.element.querySelector('#pong-choice');
    pongChoice?.addEventListener('click', () => this.navigateToGame());

    const tournamentChoice = this.element.querySelector('#tournament-choice');
    tournamentChoice?.addEventListener('click', () => this.navigateToTournament());

    this.setupHoverEffects();
  }

  private setupHoverEffects(): void {
    const choices = this.element.querySelectorAll('[data-route]');

    choices.forEach(choice => {
      choice.addEventListener('mouseenter', () => {});
      choice.addEventListener('mouseleave', () => {});
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
