import { TournamentViewController } from './TournamentViewController';
import { TournamentSystemState } from '../managers/TournamentStateManager';

/**
 * Controller for the tournament game view
 * Handles game launch and match transitions
 */
export class GameViewController extends TournamentViewController {
  render(container: Element, state: TournamentSystemState): void {
    const matchOrchestrator = this.stateManager.getMatchOrchestrator();
    const matchInfo = matchOrchestrator?.getCurrentMatchInfo();

    if (!matchInfo) return;

    container.innerHTML = `
      <div class="text-center">
        <h2 class="text-5xl font-bold mb-12 text-white font-iceland">${matchInfo.roundName}</h2>
        <div class="bg-black/30 backdrop-blur-sm border-white border-2 rounded-xl p-12 max-w-3xl mx-auto">
          <div class="text-3xl font-bold mb-12 text-white font-iceland">
            ${matchInfo.player1Alias} <span class="text-blue-300">vs</span> ${matchInfo.player2Alias}
          </div>

          <div class="mb-12">
            <p class="text-white mb-6 text-xl font-iceland">Match will start automatically...</p>
            <div class="animate-pulse text-8xl">⚡</div>
          </div>

          <div class="text-lg text-white font-iceland">
            Match ${matchInfo.matchNumber} • Round ${matchInfo.round}
          </div>
        </div>
      </div>
    `;

    // Auto-redirect to game after a short delay
    setTimeout(() => {
      this.redirectToGame(state);
    }, 3000);
  }

  bindEvents(): void {
    // No specific events needed for game view - just auto-redirect
  }

  private redirectToGame(state: TournamentSystemState): void {
    const matchOrchestrator = this.stateManager.getMatchOrchestrator();
    const gameContext = matchOrchestrator?.getCurrentGameContext();

    if (gameContext) {
      // Navigate to game with tournament context
      const contextParam = encodeURIComponent(JSON.stringify(gameContext));
      console.log('🚀 Redirecting to game with context:', gameContext);
      // Force page reload instead of SPA navigation to fix HTTPS routing issue
      window.location.href = `/game?tournamentContext=${contextParam}`;
    }
  }
}