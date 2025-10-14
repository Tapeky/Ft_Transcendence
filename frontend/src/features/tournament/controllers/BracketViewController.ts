import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';

export class BracketViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    console.log('Rendering bracket for:', tournament?.name);

    if (!tournament) {
      container.innerHTML =
        '<div class="text-center text-white text-2xl font-iceland">No tournament loaded</div>';
      return;
    }

    if (!tournament.bracket) {
      this.renderNoBracketState(container, tournament);
      return;
    }

    container.innerHTML = `
      <div class="bg-black/40 backdrop-blur-md border-white border-2 rounded-xl p-10 shadow-2xl max-w-6xl mx-auto">
        <div class="mb-10 text-center">
          <h2 class="text-4xl font-bold text-white font-iceland tracking-wider uppercase">${tournament.name}</h2>
          <div class="mt-3 h-0.5 bg-white/40 mx-auto" style="max-width: 200px;"></div>
        </div>

        <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-6 mb-8">
          <div class="text-center mb-6">
            <div class="text-3xl font-bold text-white font-iceland">ROUND ${tournament.bracket.currentRound}</div>
          </div>
          ${
            tournament.status === 'in_progress' || tournament.status === 'running'
              ? `
            <div class="text-center">
              <button id="start-next-match" class="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-white border-2 px-10 py-4 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 font-iceland text-2xl font-bold uppercase tracking-wide shadow-xl">
                Start Next Match
              </button>
            </div>
          `
              : tournament.status === 'completed'
                ? `
            <div class="text-center text-3xl font-bold text-green-400 font-iceland uppercase">Tournament Complete</div>
          `
                : ''
          }
        </div>

        <div id="bracket-display" class="overflow-x-auto">
        </div>
      </div>
    `;

    this.renderBracket(tournament.bracket);
    this.bindEvents();
  }

  bindEvents(): void {
    if (!this.isElementReady()) {
      console.warn('BracketViewController: Element not ready for binding');
      return;
    }

    const startMatchButton = this.querySelector('#start-next-match');
    if (startMatchButton) {
      startMatchButton.addEventListener('click', async () => {
        await this.handleStartNextMatch();
      });
    }
  }

  private renderNoBracketState(container: Element, tournament: any): void {
    container.innerHTML = `
      <div class="bg-black/40 backdrop-blur-md border-white border-2 rounded-xl p-10 shadow-2xl max-w-4xl mx-auto">
        <div class="mb-10 text-center">
          <h2 class="text-4xl font-bold text-white font-iceland tracking-wider uppercase">${tournament.name}</h2>
          <div class="mt-3 h-0.5 bg-white/40 mx-auto" style="max-width: 200px;"></div>
        </div>

        <div class="bg-yellow-600/20 backdrop-blur-sm border-yellow-400 border-2 rounded-lg p-8 text-center">
          <p class="text-yellow-300 text-xl font-iceland uppercase tracking-wide">Bracket not yet generated</p>
          <p class="text-white/60 mt-3 font-iceland">Tournament may still be initializing...</p>
        </div>
      </div>
    `;
  }

  private renderBracket(bracket: any): void {
    const bracketContainer = this.querySelector('#bracket-display');
    if (!bracketContainer) return;

    const bracketHTML = bracket.rounds
      .map(
        (round: any, roundIndex: number) => `
      <div class="bracket-round mb-8">
        <h3 class="text-2xl font-bold mb-6 text-center text-white/80 font-iceland uppercase tracking-wider">Round ${roundIndex + 1}</h3>
        <div class="grid gap-6 ${round.length <= 2 ? 'max-w-2xl mx-auto' : round.length <= 4 ? 'grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-2 md:grid-cols-4'}">
          ${round
            .map(
              (match: any) => `
            <div class="match bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-5 ${match.status === 'in_progress' ? 'ring-4 ring-blue-400 ring-opacity-50' : ''} hover:bg-black/40 transition-all">
              <div class="space-y-3">
                <div class="flex justify-between items-center ${match.winnerAlias === match.player1Alias ? 'text-green-400' : 'text-white'} ${match.player1Alias === 'TBD' ? 'opacity-50' : ''}">
                  <span class="font-iceland text-xl ${match.winnerAlias === match.player1Alias ? 'font-bold' : ''}">${match.player1Alias || 'TBD'}</span>
                  <span class="font-iceland text-2xl font-bold">${match.player1Score || 0}</span>
                </div>
                <div class="h-px bg-white/20"></div>
                <div class="flex justify-between items-center ${match.winnerAlias === match.player2Alias ? 'text-green-400' : 'text-white'} ${match.player2Alias === 'TBD' ? 'opacity-50' : ''}">
                  <span class="font-iceland text-xl ${match.winnerAlias === match.player2Alias ? 'font-bold' : ''}">${match.player2Alias || 'TBD'}</span>
                  <span class="font-iceland text-2xl font-bold">${match.player2Score || 0}</span>
                </div>
              </div>
              ${
                match.status === 'completed'
                  ? `<div class="mt-3 pt-3 border-t border-white/20 text-center text-green-400 font-iceland text-sm uppercase">Completed</div>`
                  : match.status === 'in_progress'
                    ? `<div class="mt-3 pt-3 border-t border-white/20 text-center text-blue-400 font-iceland text-sm uppercase">In Progress</div>`
                    : match.player1Alias !== 'TBD' && match.player2Alias !== 'TBD'
                      ? `<div class="mt-3 pt-3 border-t border-white/20 text-center text-white/60 font-iceland text-sm uppercase">Pending</div>`
                      : `<div class="mt-3 pt-3 border-t border-white/20 text-center text-white/40 font-iceland text-sm uppercase">Waiting</div>`
              }
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      )
      .join('');

    bracketContainer.innerHTML = bracketHTML;
  }

  private async handleStartNextMatch(): Promise<void> {
    try {
      await this.stateManager.startNextMatch();
    } catch (error) {
      console.error('Failed to start next match:', error);
      this.showError('Failed to start next match.');
    }
  }
}
