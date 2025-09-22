import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';
import { TournamentSize } from '../types/tournament';

export class LobbyViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    container.innerHTML = `
      <div class="mb-6 text-center">
        <h2 class="text-4xl font-bold text-white font-iceland">Tournament Setup</h2>
      </div>

      <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-lg p-8">
          <form id="local-tournament-form">
            <div class="space-y-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-xl font-medium mb-3 text-white font-iceland">Tournament Name</label>
                  <input
                    type="text"
                    id="tournament-name"
                    class="w-full px-4 py-3 bg-black/20 border border-white rounded text-white font-iceland text-lg placeholder-gray-300 focus:ring-2 focus:ring-white"
                    placeholder="Enter tournament name"
                    required
                    maxlength="50"
                  />
                </div>
                <div>
                  <label class="block text-xl font-medium mb-3 text-white font-iceland">Number of Players</label>
                  <select
                    id="max-players"
                    class="w-full px-4 py-3 bg-black/20 border border-white rounded text-white font-iceland text-lg focus:ring-2 focus:ring-white"
                  >
                    <option value="4">4 Players</option>
                    <option value="8" selected>8 Players</option>
                    <option value="16">16 Players</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xl font-medium mb-4 text-white font-iceland">Player Names</label>
                <div id="players-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                </div>
              </div>

              <button
                type="submit"
                class="w-full text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-2xl font-bold"
              >
                Create Tournament
              </button>
            </div>
          </form>
        </div>
    `;

    this.generatePlayerInputs(8);
    this.bindEvents();
  }

  bindEvents(): void {
    if (!this.isElementReady()) {
      console.warn('Element not ready');
      return;
    }

    const playersSelect = this.querySelector('#max-players') as HTMLSelectElement;
    if (playersSelect) {
      playersSelect.addEventListener('change', () => {
        const playerCount = parseInt(playersSelect.value);
        this.generatePlayerInputs(playerCount);
      });
    }

    const localForm = this.querySelector('#local-tournament-form');
    if (localForm) {
      localForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleTournamentCreation();
      });
    }
  }

  private generatePlayerInputs(playerCount: number): void {
    const container = this.querySelector('#players-container');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
      const playerInput = document.createElement('div');
      playerInput.innerHTML = `
        <input
          type="text"
          id="player-${i}"
          placeholder="Player ${i}"
          class="w-full px-4 py-3 bg-black/20 border border-white rounded text-white font-iceland text-lg placeholder-gray-300 focus:ring-2 focus:ring-white"
          required
          maxlength="20"
        />
      `;
      container.appendChild(playerInput);
    }
  }

  private async handleTournamentCreation(): Promise<void> {
    const nameInput = this.querySelector('#tournament-name') as HTMLInputElement;
    const playersSelect = this.querySelector('#max-players') as HTMLSelectElement;

    if (!nameInput || !playersSelect) {
      console.error('Form elements missing');
      return;
    }

    const name = nameInput.value.trim();
    const maxPlayers = parseInt(playersSelect.value);
    const players: string[] = [];
    for (let i = 1; i <= maxPlayers; i++) {
      const playerInput = this.querySelector(`#player-${i}`) as HTMLInputElement;
      if (!playerInput) {
        console.error(`Player ${i} input missing`);
        return;
      }
      const playerName = playerInput.value.trim();
      if (!playerName) {
        alert(`Enter name for Player ${i}`);
        return;
      }
      players.push(playerName);
    }
    const uniqueNames = new Set(players);
    if (uniqueNames.size !== players.length) {
      alert('Names must be unique');
      return;
    }

    if (name && [4, 8, 16].includes(maxPlayers)) {
      try {
        await this.createLocalTournament(name, maxPlayers as TournamentSize, players);
      } catch (error) {
        console.error('Tournament creation failed:', error);
        this.showError('Creation failed. Try again.');
      }
    }
  }

  private async createLocalTournament(name: string, maxPlayers: TournamentSize, players: string[]): Promise<void> {
    try {
      await this.stateManager.createTournament(name, maxPlayers);
      const currentState = this.stateManager.getState();
      const tournamentId = currentState.tournament?.id;

      if (!tournamentId) {
        throw new Error('No tournament ID');
      }
      for (const playerName of players) {
        await this.stateManager.joinTournament(tournamentId, playerName);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.stateManager.refreshTournamentState();

      const currentTournament = this.stateManager.getCurrentTournament();
      console.log('Status:', currentTournament?.status);

      if (!currentTournament || !['ready', 'in_progress', 'running'].includes(currentTournament.status)) {
        throw new Error(`Can't start. Status: ${currentTournament?.status || 'unknown'}`);
      }

      console.log('Tournament created. Go to registration.');

    } catch (error) {
      console.error('Tournament start failed:', error);
      throw error;
    }
  }
}
