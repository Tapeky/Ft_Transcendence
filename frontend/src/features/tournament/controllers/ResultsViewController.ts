import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';

export class ResultsViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    if (!tournament) return;

    // Get winner from tournament or from final match in bracket
    let winner = tournament.winnerAlias;
    if (!winner && tournament.bracket?.rounds?.length) {
      const finalRound = tournament.bracket.rounds[tournament.bracket.rounds.length - 1];
      const finalMatch = finalRound?.[0];
      if (finalMatch?.winnerAlias) {
        winner = finalMatch.winnerAlias;
      }
    }

    const stats = this.stateManager.getTournamentStatistics();

    container.innerHTML = `
      <div class="mb-6 text-center">
        <h2 class="text-4xl font-bold text-white font-iceland">Tournament Results</h2>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-12 text-center mb-8">
        <div class="text-8xl mb-6">🏆</div>
        <h3 class="text-3xl font-bold mb-4 text-white font-iceland">Tournament Complete!</h3>
        <div class="text-2xl text-yellow-300 font-semibold font-iceland">Winner: ${winner || 'Unknown'}</div>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-8 mb-8">
        <h3 class="text-2xl font-bold mb-6 text-white font-iceland text-center">Tournament Statistics</h3>
        <div class="grid grid-cols-2 gap-8">
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-300 font-iceland">${stats?.totalPlayers || 0}</div>
            <div class="text-xl text-white font-iceland">Total Players</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-green-300 font-iceland">${stats?.completedMatches || 0}</div>
            <div class="text-xl text-white font-iceland">Matches Played</div>
          </div>
        </div>
      </div>

      <div class="flex gap-6 justify-center">
        <button id="new-tournament" class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
          New Tournament
        </button>
        <button id="view-bracket" class="text-white border-white border-2 px-6 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
          View Bracket
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents(): void {
    if (!this.isElementReady()) {
      console.warn('Element not ready for binding');
      return;
    }

    const newTournamentButton = this.querySelector('#new-tournament');
    if (newTournamentButton) {
      newTournamentButton.addEventListener('click', () => this.handleNewTournament());
    }

    const viewBracketButton = this.querySelector('#view-bracket');
    if (viewBracketButton) {
      viewBracketButton.addEventListener('click', () => this.handleViewBracket());
    }
  }

  private handleNewTournament(): void {
    this.stateManager.reset();
    this.stateManager.navigateToView('lobby');
  }

  private handleViewBracket(): void {
    this.stateManager.navigateToView('bracket');
  }
}
