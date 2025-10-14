import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';

export class RegistrationViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    if (!tournament) return;

    const progress = state.registration.tournament
      ? Math.round(
          (state.registration.tournament.currentPlayers /
            state.registration.tournament.maxPlayers) *
            100
        )
      : 0;

    container.innerHTML = `
      <div class="bg-black/40 backdrop-blur-md border-white border-2 rounded-xl p-10 shadow-2xl max-w-4xl mx-auto">
        <div class="mb-10 text-center">
          <h2 class="text-4xl font-bold text-white font-iceland tracking-wider uppercase">${tournament.name}</h2>
          <div class="mt-3 h-0.5 bg-white/40 mx-auto" style="max-width: 200px;"></div>
        </div>

        <div class="space-y-4 mb-10">
          ${tournament.players
            .map(
              (player, index) => `
            <div class="flex items-center gap-4 bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-5 hover:bg-black/40 transition-colors">
              <span class="text-white font-iceland text-2xl font-bold">${index + 1}.</span>
              <span class="text-white font-iceland text-2xl">${player.alias}</span>
            </div>
          `
            )
            .join('')}
          ${Array.from(
            { length: tournament.maxPlayers - tournament.currentPlayers },
            (_, index) => `
            <div class="flex justify-between items-center bg-black/20 backdrop-blur-sm border-white border-2 border-dashed rounded-lg p-5 opacity-60">
              <div class="flex items-center gap-4">
                <span class="text-white/60 font-iceland text-2xl font-bold">${tournament.currentPlayers + index + 1}.</span>
                <span class="text-white/60 font-iceland text-2xl">Waiting...</span>
              </div>
              <span class="text-white/40 font-iceland text-xl">----</span>
            </div>
          `
          ).join('')}
        </div>

        ${
          tournament.status === 'ready'
            ? `
          <button id="start-tournament" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white border-white border-2 px-8 py-4 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 font-iceland text-2xl font-bold uppercase tracking-wide shadow-xl">
            Start Tournament
          </button>
        `
            : `
          <div class="w-full px-8 py-4 bg-black/40 backdrop-blur-sm border-white border-2 rounded-lg font-iceland text-xl text-center text-white/80">
            Waiting for ${tournament.maxPlayers - tournament.currentPlayers} more players
          </div>
        `
        }
      </div>
    `;

    this.bindEvents();
  }

  bindEvents(): void {
    if (!this.isElementReady()) return;

    const startButton = this.querySelector('#start-tournament');
    if (startButton) {
      startButton.addEventListener('click', async () => {
        await this.handleStartTournament();
      });
    }
  }

  private async handleStartTournament(): Promise<void> {
    try {
      await this.stateManager.refreshTournamentState();

      const currentTournament = this.stateManager.getCurrentTournament();

      if (
        !currentTournament ||
        (currentTournament.status !== 'ready' &&
          currentTournament.status !== 'in_progress' &&
          currentTournament.status !== 'running')
      ) {
        throw new Error(`Cannot start. Status: ${currentTournament?.status || 'unknown'}`);
      }

      await this.stateManager.startTournament();
    } catch (error) {
      console.error('Start failed:', error);
      this.showError('Failed to start tournament. Please ensure all players have joined.');
    }
  }
}
