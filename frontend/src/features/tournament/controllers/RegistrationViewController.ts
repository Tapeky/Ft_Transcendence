import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';

/**
 * Controller for the tournament registration view
 * Handles player registration and tournament starting
 */
export class RegistrationViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    if (!tournament) return;

    const progress = state.registration.tournament ?
      Math.round((state.registration.tournament.currentPlayers / state.registration.tournament.maxPlayers) * 100) : 0;

    container.innerHTML = `
      <div class="mb-6 text-center">
        <h2 class="text-4xl font-bold text-white font-iceland">${tournament.name}</h2>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-8">
        <div class="text-center mb-6">
          <p class="text-white text-2xl font-iceland">Tournament Registration</p>
            <div class="mt-4">
              <div class="text-lg text-white mb-2 font-iceland">Tournament ID:
                <span class="text-blue-300 font-mono">${tournament.id}</span>
                <button id="copy-id" class="ml-3 text-white border-white border-2 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors font-iceland">Copy</button>
              </div>
            </div>
          </div>

          <div class="mb-8">
            <div class="flex justify-between text-xl mb-3 text-white font-iceland">
              <span>Players Registered</span>
              <span>${tournament.currentPlayers}/${tournament.maxPlayers}</span>
            </div>
            <div class="w-full bg-black/50 border border-white rounded-full h-4">
              <div class="bg-gradient-to-r from-blue-400 to-green-400 h-4 rounded-full transition-all duration-500"
                   style="width: ${progress}%"></div>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="text-2xl font-semibold mb-6 text-white font-iceland">Registered Players</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              ${tournament.players.map((player, index) => `
                <div class="bg-black/30 border border-white rounded-lg p-4 text-center">
                  <div class="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold font-iceland text-lg">
                    ${index + 1}
                  </div>
                  <div class="text-lg font-medium text-white font-iceland">${player.alias}</div>
                </div>
              `).join('')}
              ${Array.from({ length: tournament.maxPlayers - tournament.currentPlayers }, (_, index) => `
                <div class="bg-black/10 rounded-lg p-4 text-center border-2 border-dashed border-white/50">
                  <div class="w-10 h-10 bg-gray-600 rounded-full mx-auto mb-3 flex items-center justify-center text-gray-400 font-iceland text-lg">
                    ${tournament.currentPlayers + index + 1}
                  </div>
                  <div class="text-lg text-gray-300 font-iceland">Waiting...</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="flex gap-6">
            ${tournament.status === 'ready' ? `
              <div class="flex-1">
                <div class="mb-4 text-center text-green-300 text-xl font-iceland">
                  ✅ Tournament ready! Click to start the bracket and begin matches.
                </div>
                <button id="start-tournament" class="w-full text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-2xl font-bold">
                  Start Tournament
                </button>
              </div>
            ` : `
              <div class="flex-1 px-8 py-4 bg-black/20 border border-white rounded font-iceland text-xl text-center text-white">
                Waiting for ${tournament.maxPlayers - tournament.currentPlayers} more players
              </div>
            `}
            <button id="refresh-tournament" class="text-white border-white border-2 px-6 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
              Refresh
            </button>
          </div>
        </div>
    `;

    this.bindEvents();
  }

  bindEvents(): void {
    if (!this.isElementReady()) {
      console.warn('RegistrationViewController: Attempting to bind events before element is ready');
      return;
    }

    const copyButton = this.querySelector('#copy-id');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        this.handleCopyTournamentId();
      });
    }

    const startButton = this.querySelector('#start-tournament');
    if (startButton) {
      startButton.addEventListener('click', async () => {
        await this.handleStartTournament();
      });
    }

    const refreshButton = this.querySelector('#refresh-tournament');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        await this.handleRefreshTournament();
      });
    }
  }

  private handleCopyTournamentId(): void {
    const currentState = this.stateManager.getState();
    const tournamentId = currentState.tournament?.id;

    if (tournamentId) {
      navigator.clipboard.writeText(tournamentId).then(() => {
        const button = this.querySelector('#copy-id') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          button.classList.add('bg-green-600');
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-600');
          }, 2000);
        }
      });
    }
  }

  private async handleStartTournament(): Promise<void> {
    try {
      await this.stateManager.refreshTournamentState();

      const currentTournament = this.stateManager.getCurrentTournament();
      console.log('Tournament status before start (registration view):', currentTournament?.status);

      if (!currentTournament || (
        currentTournament.status !== 'ready' &&
        currentTournament.status !== 'in_progress' &&
        currentTournament.status !== 'running'
      )) {
        throw new Error(`Tournament cannot be started. Current status: ${currentTournament?.status || 'unknown'}`);
      }

      await this.stateManager.startTournament();
    } catch (error) {
      console.error('Failed to start tournament:', error);
      this.showError('Failed to start tournament. Please ensure all players have joined.');
    }
  }

  private async handleRefreshTournament(): Promise<void> {
    try {
      await this.stateManager.refreshTournament();
    } catch (error) {
      console.error('Failed to refresh tournament:', error);
      this.showError('Failed to refresh tournament.');
    }
  }
}