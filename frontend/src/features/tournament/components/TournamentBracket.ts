import { TournamentBracket, TournamentMatch, NextMatch } from '../services/TournamentService';

export class TournamentBracketComponent {
  private container: HTMLElement;
  private bracket: TournamentBracket | null = null;
  private nextMatch: NextMatch | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Met à jour l'affichage du bracket avec le prochain match en évidence
   */
  updateBracket(bracket: TournamentBracket, nextMatch?: NextMatch | null): void {
    this.bracket = bracket;
    this.nextMatch = nextMatch || null;
    this.render();
  }

  /**
   * Affiche l'annonce du prochain match (exigence sujet)
   */
  displayNextMatchAnnouncement(nextMatch: NextMatch | null): void {
    this.nextMatch = nextMatch;
    this.renderNextMatchAnnouncement();
  }

  private render(): void {
    if (!this.bracket) {
      this.container.innerHTML = '<div class="text-center text-gray-500">Aucun bracket disponible</div>';
      return;
    }

    this.container.innerHTML = `
      <div class="tournament-bracket-container">
        ${this.renderTournamentHeader()}
        ${this.renderNextMatchAnnouncement()}
        ${this.renderBracketTree()}
        ${this.renderParticipants()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderTournamentHeader(): string {
    if (!this.bracket) return '';

    const tournament = this.bracket.tournament;
    const statusBadge = this.getStatusBadge(tournament.status);

    return `
      <div class="tournament-header mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">${tournament.name}</h2>
            <p class="text-gray-600 dark:text-gray-400 mt-1">${tournament.description || 'Aucune description'}</p>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>👥 ${tournament.current_players}/${tournament.max_players} participants</span>
              <span>📅 ${new Date(tournament.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-2">
            ${statusBadge}
            ${tournament.winner_id ? `<div class="text-sm text-green-600 font-medium">🏆 Vainqueur: ID ${tournament.winner_id}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * EXIGENCE SUJET: Affichage du prochain match
   * "announce the next match"
   */
  private renderNextMatchAnnouncement(): string {
    if (!this.nextMatch) {
      return `
        <div class="next-match-announcement mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div class="flex items-center">
            <div class="text-blue-600 dark:text-blue-400">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">Aucun match suivant</h3>
              <p class="text-sm text-blue-600 dark:text-blue-400 mt-1">Tous les matches sont terminés ou le tournoi n'a pas encore commencé.</p>
            </div>
          </div>
        </div>
      `;
    }

    const isUpcoming = this.nextMatch.status === 'scheduled';
    const bgColor = isUpcoming ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    const textColor = isUpcoming ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200';
    const iconColor = isUpcoming ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400';

    return `
      <div class="next-match-announcement mb-6 p-4 ${bgColor} border rounded-lg">
        <div class="flex items-center">
          <div class="${iconColor}">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
            </svg>
          </div>
          <div class="ml-3 flex-grow">
            <h3 class="text-lg font-bold ${textColor}">🎮 Prochain Match</h3>
            <div class="mt-2 flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-center">
                  <div class="font-semibold ${textColor}">${this.nextMatch.player1?.alias || 'TBD'}</div>
                  <div class="text-xs opacity-75">${this.nextMatch.player1?.username || ''}</div>
                </div>
                <div class="${iconColor} text-xl font-bold">VS</div>
                <div class="text-center">
                  <div class="font-semibold ${textColor}">${this.nextMatch.player2?.alias || 'BYE'}</div>
                  <div class="text-xs opacity-75">${this.nextMatch.player2?.username || ''}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium ${textColor}">${this.getMatchStatusText(this.nextMatch.status)}</div>
                <div class="text-xs opacity-75">Match #${this.nextMatch.id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderBracketTree(): string {
    if (!this.bracket || !this.bracket.matches.length) {
      return '<div class="text-center text-gray-500 py-8">Bracket non généré</div>';
    }

    // Organiser les matches par round
    const matchesByRound = this.groupMatchesByRound(this.bracket.matches);
    const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));

    return `
      <div class="bracket-tree mb-6">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Bracket Tree</h3>
        <div class="bracket-rounds flex gap-8 overflow-x-auto pb-4">
          ${Array.from({length: maxRound}, (_, i) => i + 1).map(round => this.renderRound(round, matchesByRound[round] || [])).join('')}
        </div>
      </div>
    `;
  }

  private renderRound(round: number, matches: TournamentMatch[]): string {
    const roundTitle = this.getRoundTitle(round, matches.length);
    
    return `
      <div class="bracket-round min-w-64">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">${roundTitle}</h4>
        <div class="space-y-4">
          ${matches.map(match => this.renderMatch(match)).join('')}
        </div>
      </div>
    `;
  }

  private renderMatch(match: TournamentMatch): string {
    const isNextMatch = this.nextMatch && this.nextMatch.id === match.id;
    const isCompleted = match.status === 'completed';
    const isInProgress = match.status === 'in_progress';
    
    const containerClass = isNextMatch 
      ? 'border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
      : isCompleted 
        ? 'border border-green-300 bg-green-50 dark:bg-green-900/20' 
        : isInProgress
          ? 'border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
          : 'border border-gray-300 bg-white dark:bg-gray-700';

    return `
      <div class="match-card ${containerClass} rounded-lg p-3 transition-all duration-200" data-match-id="${match.id}">
        <div class="match-header flex justify-between items-center mb-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">Match #${match.id}</span>
          <span class="text-xs px-2 py-1 rounded ${this.getStatusStyle(match.status)}">${this.getMatchStatusText(match.status)}</span>
        </div>
        
        <div class="match-players space-y-1">
          <div class="player ${match.winner_id === match.player1_id ? 'font-bold text-green-600' : ''} flex justify-between">
            <span class="truncate">${match.player1_alias || 'TBD'}</span>
            <span class="ml-2">${isCompleted ? match.player1_score : '-'}</span>
          </div>
          <div class="player ${match.winner_id === match.player2_id ? 'font-bold text-green-600' : ''} flex justify-between">
            <span class="truncate">${match.player2_alias || 'BYE'}</span>
            <span class="ml-2">${isCompleted ? match.player2_score : '-'}</span>
          </div>
        </div>

        ${isNextMatch ? '<div class="mt-2 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">⭐ Prochain Match</div>' : ''}
      </div>
    `;
  }

  private renderParticipants(): string {
    if (!this.bracket || !this.bracket.participants.length) {
      return '';
    }

    return `
      <div class="tournament-participants">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Participants (${this.bracket.participants.length})</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          ${this.bracket.participants.map(participant => `
            <div class="participant-card bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div class="font-medium text-gray-900 dark:text-white">${participant.alias}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${participant.username}</div>
              <div class="text-xs text-gray-400 mt-1">${new Date(participant.joined_at).toLocaleDateString()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Méthodes utilitaires

  private groupMatchesByRound(matches: TournamentMatch[]): { [round: number]: TournamentMatch[] } {
    return matches.reduce((groups, match) => {
      const round = match.round || 1;
      if (!groups[round]) groups[round] = [];
      groups[round].push(match);
      return groups;
    }, {} as { [round: number]: TournamentMatch[] });
  }

  private getRoundTitle(round: number, matchCount: number): string {
    if (matchCount === 1) return 'Finale';
    if (matchCount === 2) return 'Demi-finales';
    if (matchCount === 4) return 'Quarts de finale';
    return `Round ${round}`;
  }

  private getStatusBadge(status: string): string {
    const styles = {
      'open': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'running': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };

    const labels = {
      'open': 'Ouvert',
      'running': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };

    return `<span class="px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.open}">${labels[status] || status}</span>`;
  }

  private getStatusStyle(status: string): string {
    const styles = {
      'scheduled': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-200',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-200'
    };
    return styles[status] || styles.scheduled;
  }

  private getMatchStatusText(status: string): string {
    const labels = {
      'scheduled': 'Programmé',
      'in_progress': 'En cours',
      'completed': 'Terminé'
    };
    return labels[status] || status;
  }

  private attachEventListeners(): void {
    // Ajout d'interactivité future
    const matchCards = this.container.querySelectorAll('.match-card');
    matchCards.forEach(card => {
      card.addEventListener('click', () => {
        const matchId = card.getAttribute('data-match-id');
        console.log(`Clicked on match ${matchId}`);
        // TODO: Ouvrir modal de détails du match
      });
    });
  }
}