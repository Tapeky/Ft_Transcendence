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
      <div class="mb-6 text-center">
        <h2 class="text-4xl font-bold text-white font-iceland">${tournament.name}</h2>
        <p class="text-white text-2xl font-iceland mt-2">Tournament Bracket</p>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-6 mb-6">
        <div class="text-center mb-6">
          <div class="text-3xl font-bold text-blue-300 font-iceland">Round ${tournament.bracket.currentRound}</div>
        </div>
        <div class="text-center">
          ${
            tournament.status === 'in_progress' || tournament.status === 'running'
              ? `
            <button id="start-next-match" class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-2xl font-bold">
              Start Next Match
            </button>
          `
              : tournament.status === 'completed'
                ? `
            <div class="text-3xl font-bold text-yellow-300 font-iceland">Tournament Complete!</div>
          `
                : ''
          }
        </div>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-8">
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

    const refreshButton = this.querySelector('#refresh-bracket');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        await this.handleRefreshBracket();
      });
    }
  }

  private renderNoBracketState(container: Element, tournament: any): void {
    container.innerHTML = `
      <div class="mb-6 text-center">
        <h2 class="text-4xl font-bold text-white font-iceland">${tournament.name}</h2>
        <p class="text-white text-xl font-iceland mt-2">Tournament Status: ${tournament.status}</p>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-8">
        <div class="bg-yellow-600/30 border border-yellow-400 rounded-lg p-6 text-center">
          <p class="text-yellow-300 mb-6 text-xl font-iceland">Bracket not yet generated. Tournament may still be initializing...</p>
          <button id="refresh-bracket" class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
            Refresh Bracket
          </button>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  private renderBracket(bracket: any): void {
    const bracketContainer = this.querySelector('#bracket-display');
    if (!bracketContainer) return;

    const bracketHTML = bracket.rounds
      .map(
        (round: any, roundIndex: number) => `
      <div class="bracket-round mb-10">
        <h3 class="text-2xl font-bold mb-6 text-center text-white font-iceland">Round ${roundIndex + 1}</h3>
        <div class="grid gap-6 ${round.length <= 2 ? 'max-w-lg mx-auto' : ''}">
          ${round
            .map(
              (match: any) => `
            <div class="match bg-black/20 border border-white rounded-lg p-6 ${match.status === 'in_progress' ? 'border-2 border-blue-300' : ''}">
              <div class="flex justify-between items-center">
                <div class="flex-1">
                  <div class="player text-lg font-iceland ${match.winnerAlias === match.player1Alias ? 'text-green-300 font-bold' : 'text-white'}">
                    ${match.player1Alias || 'Player 1'} <span class="float-right text-xl">${match.player1Score || 0}</span>
                  </div>
                  <div class="player text-lg font-iceland ${match.winnerAlias === match.player2Alias ? 'text-green-300 font-bold' : 'text-white'}">
                    ${match.player2Alias || 'Player 2'} <span class="float-right text-xl">${match.player2Score || 0}</span>
                  </div>
                </div>
                <div class="ml-6 text-2xl">
                  ${
                    match.status === 'completed'
                      ? '✓'
                      : match.status === 'in_progress'
                        ? '▶'
                        : match.player1Alias !== 'TBD' && match.player2Alias !== 'TBD'
                          ? '⏳'
                          : '⏸'
                  }
                </div>
              </div>
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

  private async handleRefreshBracket(): Promise<void> {
    try {
      await this.stateManager.refreshTournamentState();
    } catch (error) {
      console.error('Failed to refresh bracket:', error);
      this.showError('Failed to refresh bracket');
    }
  }
}
