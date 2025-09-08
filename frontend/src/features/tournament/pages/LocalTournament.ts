import { router } from '../../../core/app/Router';
import { api } from '../../../shared/services/api';

interface LocalPlayer {
  id: number;
  name: string;
  alias: string;
  type: 'human' | 'ai';
  aiLevel?: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
}

interface LocalMatch {
  id: number;
  round: number;
  position: number;
  player1: LocalPlayer;
  player2: LocalPlayer;
  winner?: LocalPlayer;
  status: 'scheduled' | 'in_progress' | 'completed' | 'simulated';
  player1Score?: number;
  player2Score?: number;
  isHumanMatch: boolean;
}

interface LocalTournamentBracket {
  tournamentId: number;
  players: LocalPlayer[];
  matches: LocalMatch[];
  rounds: number;
  currentMatch?: LocalMatch;
  status: 'setup' | 'in_progress' | 'completed';
  winner?: LocalPlayer;
}

export class LocalTournament {
  private element: HTMLElement;
  private tournament: LocalTournamentBracket | null = null;
  private humanPlayers: Array<{name: string, alias: string}> = [];

  constructor() {
    // Make methods available globally for onclick handlers
    (window as any).localTournament = this;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-900 text-white';
    
    // Add CSS link to document head if not already present
    if (!document.querySelector('link[href="/styles/local-tournament.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/styles/local-tournament.css';
      document.head.appendChild(link);
    }
    
    // Set the initial content
    container.innerHTML = this.render();
    this.setupEventListeners();
    
    return container;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private updateContent(): void {
    this.element.innerHTML = this.render();
    this.setupEventListeners();
  }

  private rerender(): void {
    this.updateContent();
  }

  private setupEventListeners(): void {
    // Player form submission
    const playerForm = this.element.querySelector('.player-form') as HTMLFormElement;
    if (playerForm) {
      playerForm.addEventListener('submit', (e) => this.addPlayer(e));
    }

    // Remove player buttons
    const removeButtons = this.element.querySelectorAll('[data-remove-player]');
    removeButtons.forEach((button) => {
      const index = parseInt(button.getAttribute('data-remove-player') || '0');
      button.addEventListener('click', () => this.removePlayer(index));
    });

    // Start tournament button
    const startTournamentBtn = this.element.querySelector('#start-tournament-btn');
    if (startTournamentBtn) {
      startTournamentBtn.addEventListener('click', () => this.startTournament());
    }

    // Begin tournament button
    const beginTournamentBtn = this.element.querySelector('#begin-tournament-btn');
    if (beginTournamentBtn) {
      beginTournamentBtn.addEventListener('click', () => this.beginTournament());
    }

    // Reset setup button
    const resetSetupBtn = this.element.querySelector('#reset-setup-btn');
    if (resetSetupBtn) {
      resetSetupBtn.addEventListener('click', () => this.resetSetup());
    }

    // Play match buttons
    const playMatchBtns = this.element.querySelectorAll('[data-play-match]');
    playMatchBtns.forEach(button => {
      const matchId = parseInt(button.getAttribute('data-play-match') || '0');
      button.addEventListener('click', () => this.playMatch(matchId));
    });

    // New tournament button
    const newTournamentBtn = this.element.querySelector('#new-tournament-btn');
    if (newTournamentBtn) {
      newTournamentBtn.addEventListener('click', () => this.newTournament());
    }

    // Back to tournaments button
    const backToTournamentsBtn = this.element.querySelector('#back-to-tournaments-btn');
    if (backToTournamentsBtn) {
      backToTournamentsBtn.addEventListener('click', () => router.navigate('/tournament'));
    }
  }

  private render(): string {
    if (!this.tournament) {
      return this.renderSetup();
    }

    if (this.tournament.status === 'setup') {
      return this.renderTournamentStart();
    }

    if (this.tournament.status === 'completed') {
      return this.renderTournamentComplete();
    }

    return this.renderTournamentInProgress();
  }

  private renderSetup(): string {
    return `
      <div class="local-tournament-setup">
        <div class="tournament-header">
          <h1>🏆 Local Tournament Setup</h1>
          <p>Multiple players on the same PC • AI opponents fill remaining slots</p>
        </div>

        <div class="player-registration">
          <h2>Register Human Players</h2>
          <div class="current-players">
            ${this.humanPlayers.map((player, index) => `
              <div class="player-card">
                <div class="player-info">
                  <span class="player-name">${player.name}</span>
                  <span class="player-alias">${player.alias}</span>
                </div>
                <button class="btn-danger btn-sm" data-remove-player="${index}">
                  Remove
                </button>
              </div>
            `).join('')}
          </div>

          <form class="player-form">
            <div class="form-group">
              <label for="playerName">Player Name</label>
              <input type="text" id="playerName" required placeholder="Enter your name">
            </div>
            <div class="form-group">
              <label for="playerAlias">Alias (Tournament Display)</label>
              <input type="text" id="playerAlias" required placeholder="Tournament nickname">
            </div>
            <button type="submit" class="btn-primary" ${this.humanPlayers.length >= 8 ? 'disabled' : ''}>
              Add Player (${this.humanPlayers.length}/8)
            </button>
          </form>

          <div class="tournament-info">
            <p><strong>Tournament Format:</strong> 8-player single elimination</p>
            <p><strong>Human Players:</strong> ${this.humanPlayers.length}</p>
            <p><strong>AI Opponents:</strong> ${8 - this.humanPlayers.length}</p>
            <p class="info-note">
              ${this.humanPlayers.length === 0 ? '⚠️ At least 1 human player required' : '✅ Ready to start tournament'}
            </p>
          </div>

          <button 
            class="btn-success btn-lg" 
            id="start-tournament-btn"
            ${this.humanPlayers.length === 0 ? 'disabled' : ''}
          >
            Start Local Tournament
          </button>
        </div>
      </div>
    `;
  }

  private renderTournamentStart(): string {
    if (!this.tournament) return '';

    return `
      <div class="tournament-start">
        <h1>🏆 Tournament Ready</h1>
        <div class="bracket-preview">
          <h3>Players (${this.tournament.players.length})</h3>
          <div class="players-grid">
            ${this.tournament.players.map(player => `
              <div class="player-card ${player.type}">
                <div class="player-name">${player.alias}</div>
                <div class="player-type">
                  ${player.type === 'human' ? '👤 Human' : `🤖 AI (${player.aiLevel})`}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="tournament-actions">
          <button class="btn-success btn-lg" id="begin-tournament-btn">
            Begin Tournament
          </button>
          <button class="btn-secondary" id="reset-setup-btn">
            Back to Setup
          </button>
        </div>
      </div>
    `;
  }

  private renderTournamentInProgress(): string {
    if (!this.tournament) return '';

    const currentMatch = this.tournament.currentMatch;
    const stats = this.getTournamentStats();

    return `
      <div class="tournament-progress">
        <div class="tournament-header">
          <h1>🏆 Tournament in Progress</h1>
          <div class="tournament-stats">
            <span>Round ${currentMatch?.round || 'Complete'}</span>
            <span>${stats.completedMatches}/${stats.totalMatches} matches</span>
          </div>
        </div>

        ${currentMatch ? this.renderCurrentMatch(currentMatch) : ''}
        
        <div class="bracket-display">
          ${this.renderBracket()}
        </div>

        <div class="ai-log">
          <h3>🤖 AI Match Results</h3>
          <div class="ai-results">
            ${this.renderAIResults()}
          </div>
        </div>
      </div>
    `;
  }

  private renderCurrentMatch(match: LocalMatch): string {
    return `
      <div class="current-match">
        <h2>Current Match - Round ${match.round}</h2>
        <div class="match-display">
          <div class="player player1">
            <div class="player-info">
              <span class="player-name">${match.player1.alias}</span>
              <span class="player-type">${match.player1.type === 'human' ? '👤' : '🤖'}</span>
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="player player2">
            <div class="player-info">
              <span class="player-name">${match.player2.alias}</span>
              <span class="player-type">${match.player2.type === 'human' ? '👤' : '🤖'}</span>
            </div>
          </div>
        </div>
        
        <div class="match-actions">
          <button class="btn-primary btn-lg" data-play-match="${match.id}">
            Play Match
          </button>
        </div>
      </div>
    `;
  }

  private renderBracket(): string {
    if (!this.tournament) return '';

    const rounds = [1, 2, 3];
    return `
      <div class="bracket">
        ${rounds.map(round => {
          const roundMatches = this.tournament!.matches.filter(m => m.round === round);
          return `
            <div class="bracket-round">
              <h3>Round ${round} ${round === 3 ? '(Final)' : ''}</h3>
              ${roundMatches.map(match => this.renderBracketMatch(match)).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderBracketMatch(match: LocalMatch): string {
    const getPlayerDisplay = (player: LocalPlayer) => {
      if (player.id === 0) return 'TBD';
      return `${player.alias} ${player.type === 'ai' ? '🤖' : '👤'}`;
    };

    const statusClass = match.status === 'completed' || match.status === 'simulated' ? 'completed' : 
                       match.status === 'in_progress' ? 'in-progress' : 'scheduled';

    return `
      <div class="bracket-match ${statusClass}">
        <div class="match-player ${match.winner?.id === match.player1.id ? 'winner' : ''}">
          ${getPlayerDisplay(match.player1)}
          ${match.player1Score !== undefined ? `(${match.player1Score})` : ''}
        </div>
        <div class="match-player ${match.winner?.id === match.player2.id ? 'winner' : ''}">
          ${getPlayerDisplay(match.player2)}
          ${match.player2Score !== undefined ? `(${match.player2Score})` : ''}
        </div>
        <div class="match-status">${this.getMatchStatusText(match)}</div>
      </div>
    `;
  }

  private renderTournamentComplete(): string {
    if (!this.tournament) return '';

    return `
      <div class="tournament-complete">
        <div class="champion">
          <h1>🏆 Tournament Champion</h1>
          <div class="winner-display">
            <div class="winner-name">${this.tournament.winner?.alias}</div>
            <div class="winner-type">
              ${this.tournament.winner?.type === 'human' ? '👤 Human Player' : '🤖 AI Player'}
            </div>
          </div>
        </div>

        <div class="final-bracket">
          ${this.renderBracket()}
        </div>

        <div class="tournament-actions">
          <button class="btn-primary" id="new-tournament-btn">
            New Tournament
          </button>
          <button class="btn-secondary" id="back-to-tournaments-btn">
            Back to Tournaments
          </button>
        </div>
      </div>
    `;
  }

  private renderAIResults(): string {
    if (!this.tournament) return '';

    const aiMatches = this.tournament.matches.filter(m => m.status === 'simulated');
    return aiMatches.slice(-5).map(match => `
      <div class="ai-result">
        ${match.player1.alias} ${match.player1Score} - ${match.player2Score} ${match.player2.alias}
        (Winner: ${match.winner?.alias})
      </div>
    `).join('');
  }

  private getMatchStatusText(match: LocalMatch): string {
    switch (match.status) {
      case 'completed': return '✅ Complete';
      case 'simulated': return '🤖 AI Match';
      case 'in_progress': return '🔄 Playing';
      default: return '⏳ Waiting';
    }
  }

  private getTournamentStats() {
    if (!this.tournament) return { totalMatches: 0, completedMatches: 0 };

    return {
      totalMatches: this.tournament.matches.length,
      completedMatches: this.tournament.matches.filter(m => 
        m.status === 'completed' || m.status === 'simulated'
      ).length
    };
  }

  // Event handlers
  addPlayer(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const name = formData.get('playerName') as string;
    const alias = formData.get('playerAlias') as string;

    if (!name || !alias) return;

    if (this.humanPlayers.length >= 8) {
      alert('Maximum 8 players allowed');
      return;
    }

    // Check for duplicate names/aliases
    if (this.humanPlayers.some(p => p.name === name || p.alias === alias)) {
      alert('Name or alias already taken');
      return;
    }

    this.humanPlayers.push({ name, alias });
    form.reset();
    this.rerender();
  }

  removePlayer(index: number): void {
    this.humanPlayers.splice(index, 1);
    this.rerender();
  }

  async startTournament(): Promise<void> {
    if (this.humanPlayers.length === 0) {
      alert('At least one human player is required');
      return;
    }

    try {
      const response = await api.post('/api/local-tournament/create', {
        humanPlayers: this.humanPlayers
      });

      this.tournament = response.data;
      this.rerender();
    } catch (error) {
      console.error('Failed to create tournament:', error);
      alert('Failed to create tournament');
    }
  }

  beginTournament(): void {
    if (!this.tournament) return;
    
    this.tournament.status = 'in_progress';
    this.rerender();
  }

  resetSetup(): void {
    this.tournament = null;
    this.humanPlayers = [];
    this.rerender();
  }

  async playMatch(matchId: number): Promise<void> {
    if (!this.tournament) return;

    const match = this.tournament.matches.find(m => m.id === matchId);
    if (!match || !match.isHumanMatch) return;

    // Navigate to game with local tournament match info
    const gameUrl = `/game?mode=local-tournament&tournamentId=${this.tournament.tournamentId}&matchId=${matchId}`;
    router.navigate(gameUrl);
  }

  async recordMatchResult(matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
    if (!this.tournament) return;

    try {
      const response = await api.post('/api/local-tournament/match-result', {
        tournamentId: this.tournament.tournamentId,
        matchId,
        winnerId,
        player1Score,
        player2Score
      });

      this.tournament = response.data;
      this.rerender();

      if (this.tournament.status === 'completed') {
        alert(`🏆 Tournament Complete! Winner: ${this.tournament.winner?.alias}`);
      }
    } catch (error) {
      console.error('Failed to record match result:', error);
      alert('Failed to record match result');
    }
  }

  newTournament(): void {
    this.tournament = null;
    this.humanPlayers = [];
    this.rerender();
  }

}