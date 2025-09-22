import { ScoreHistory, ChartPoint } from '../../../types/UserStats';

export class ScoreChart {
  private container: HTMLElement;
  private history: ScoreHistory[];
  private chartId: string;

  constructor(container: HTMLElement, history: ScoreHistory[]) {
    this.container = container;
    this.history = history;
    this.chartId = `score-chart-${Date.now()}`;
    this.render();
  }

  private render(): void {
    if (!this.history || this.history.length === 0) {
      this.container.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg text-center">
          <div class="text-gray-400 text-lg">Aucun historique de scores disponible</div>
          <div class="text-gray-500 text-sm mt-2">Jouez quelques parties pour voir vos statistiques !</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="score-chart-container bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-semibold text-white mb-4">Progression des Scores</h3>
        <div id="${this.chartId}" class="chart-area">
          ${this.generateChart()}
        </div>
        <div class="chart-legend mt-4 flex justify-center space-x-6">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span class="text-gray-300 text-sm">Victoires</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span class="text-gray-300 text-sm">Défaites</span>
          </div>
        </div>
        <div class="recent-matches mt-6">
          ${this.generateRecentMatches()}
        </div>
      </div>
    `;
  }

  private generateChart(): string {
    const maxScore = Math.max(...this.history.map(h => Math.max(h.score, h.opponent_score)));
    const chartWidth = 800;
    const chartHeight = 300;
    const padding = 50;
    const dataWidth = chartWidth - 2 * padding;
    const dataHeight = chartHeight - 2 * padding;
    const chartData = this.history.slice(0, 10).reverse();
    const points = chartData.map((match, i) => {
      const x = padding + (i * dataWidth) / Math.max(chartData.length - 1, 1);
      const y = chartHeight - padding - (match.score / maxScore) * dataHeight;
      return {
        x,
        y,
        won: match.won,
        score: match.score,
        opponent: match.opponent_username,
        date: new Date(match.date).toLocaleDateString('fr-FR'),
        match
      };
    });
    const pathData = points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const pointsElements = points.map((point, i) => {
      const color = point.won ? '#10b981' : '#ef4444';
      const prevPoint = i > 0 ? points[i - 1] : null;
      return `
        <g class="chart-point" data-tooltip="${this.escapeHtml(`
          ${point.date}
          Score: ${point.score} - ${point.match.opponent_score}
          vs ${point.opponent}
          ${point.won ? 'Victoire' : 'Défaite'}
        `)}">
          ${prevPoint ? `<line x1="${prevPoint.x}" y1="${prevPoint.y}" x2="${point.x}" y2="${point.y}" stroke="${color}" stroke-width="2" opacity="0.7"/>` : ''}
          <circle cx="${point.x}" cy="${point.y}" r="6" fill="${color}" stroke="white" stroke-width="2" class="hover:r-8 transition-all duration-200 cursor-pointer"/>
        </g>
      `;
    }).join('');
    const gridLines = Array.from({ length: 6 }, (_, i) => {
      const y = padding + (i * dataHeight) / 5;
      const scoreValue = Math.round(maxScore - (i * maxScore) / 5);
      return `
        <line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#374151" stroke-width="1" opacity="0.3"/>
        <text x="${padding - 10}" y="${y + 5}" fill="#9ca3af" text-anchor="end" class="text-xs">${scoreValue}</text>
      `;
    }).join('');
    return `
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full h-64">
        ${gridLines}
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight - padding}" stroke="#6b7280" stroke-width="2"/>
        <line x1="${padding}" y1="${chartHeight - padding}" x2="${chartWidth - padding}" y2="${chartHeight - padding}" stroke="#6b7280" stroke-width="2"/>
        ${pointsElements}
        <text x="${chartWidth / 2}" y="30" text-anchor="middle" fill="white" class="text-lg font-semibold">Évolution des Scores (${chartData.length} dernières parties)</text>
        <text x="25" y="${chartHeight / 2}" text-anchor="middle" fill="#9ca3af" transform="rotate(-90 25 ${chartHeight / 2})" class="text-sm">Score</text>
      </svg>
    `;
  }

  private generateRecentMatches(): string {
    const recentMatches = this.history.slice(0, 5);
    if (recentMatches.length === 0) return '';
    return `
      <h4 class="text-lg font-semibold text-white mb-3">Dernières Parties</h4>
      <div class="space-y-2">
        ${recentMatches.map(match => `
          <div class="flex items-center justify-between bg-gray-800 p-3 rounded">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full ${match.won ? 'bg-green-500' : 'bg-red-500'}"></div>
              <div>
                <span class="text-white font-medium">${match.score} - ${match.opponent_score}</span>
                <span class="text-gray-400 ml-2">vs ${match.opponent_username}</span>
              </div>
            </div>
            <div class="text-gray-400 text-sm">${new Date(match.date).toLocaleDateString('fr-FR')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public update(newHistory: ScoreHistory[]): void {
    this.history = newHistory;
    this.render();
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}
