import { UserStats } from '../../../types/UserStats';

export class ScoreStats {
  private container: HTMLElement;
  private stats: UserStats;

  constructor(container: HTMLElement, stats: UserStats) {
    this.container = container;
    this.stats = stats;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="score-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="stat-card bg-gradient-to-br from-blue-800 to-blue-600 p-4 rounded-lg text-center hover:scale-105 transition-transform duration-200">
          <div class="text-3xl font-bold text-white">${this.formatScore(this.stats.avg_score)}</div>
          <div class="text-sm opacity-80 text-blue-100">Score Moyen</div>
          <div class="text-xs opacity-60 text-blue-200 mt-1">
            ${this.stats.total_games} match${this.stats.total_games > 1 ? 's' : ''}
          </div>
        </div>

        <div class="stat-card bg-gradient-to-br from-green-800 to-green-600 p-4 rounded-lg text-center hover:scale-105 transition-transform duration-200">
          <div class="text-3xl font-bold text-white">${this.stats.highest_score}</div>
          <div class="text-sm opacity-80 text-green-100">Meilleur Score</div>
          <div class="text-xs opacity-60 text-green-200 mt-1">Record personnel</div>
        </div>

        <div class="stat-card bg-gradient-to-br from-purple-800 to-purple-600 p-4 rounded-lg text-center hover:scale-105 transition-transform duration-200">
          <div class="text-3xl font-bold text-white">${this.stats.win_rate}%</div>
          <div class="text-sm opacity-80 text-purple-100">Taux de Victoire</div>
          <div class="text-xs opacity-60 text-purple-200 mt-1">
            ${this.stats.total_wins}/${this.stats.total_games} victoires
          </div>
        </div>

        <div class="stat-card bg-gradient-to-br from-pink-800 to-pink-600 p-4 rounded-lg text-center hover:scale-105 transition-transform duration-200">
          <div class="text-3xl font-bold text-white">${this.formatDuration(this.stats.avg_game_duration)}</div>
          <div class="text-sm opacity-80 text-pink-100">Durée Moyenne</div>
          <div class="text-xs opacity-60 text-pink-200 mt-1">Par partie</div>
        </div>
      </div>

      <div class="performance-stats grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="stat-card bg-gradient-to-br from-cyan-800 to-cyan-600 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-3">Précision</h3>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-2xl font-bold text-white">${this.stats.hit_rate}%</div>
              <div class="text-sm opacity-80 text-cyan-100">Taux de réussite</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-cyan-100">${this.stats.total_hits} touches</div>
              <div class="text-sm text-cyan-100">${this.stats.total_misses} ratés</div>
            </div>
          </div>
          <div class="mt-3 bg-cyan-900 rounded-full h-2">
            <div class="bg-cyan-300 h-2 rounded-full transition-all duration-500"
                 style="width: ${this.stats.hit_rate}%"></div>
          </div>
        </div>

        <div class="stat-card bg-gradient-to-br from-orange-800 to-orange-600 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-3">Performance</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-orange-100">Parties jouées:</span>
              <span class="text-white font-semibold">${this.stats.total_games}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-orange-100">Total touches:</span>
              <span class="text-white font-semibold">${this.stats.total_hits}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-orange-100">Temps total:</span>
              <span class="text-white font-semibold">${this.formatTotalTime()}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private formatScore(score: number): string {
    return score % 1 === 0 ? score.toString() : score.toFixed(1);
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
  }

  private formatTotalTime(): string {
    const totalSeconds = this.stats.avg_game_duration * this.stats.total_games;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  public update(newStats: UserStats): void {
    this.stats = newStats;
    this.render();
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}