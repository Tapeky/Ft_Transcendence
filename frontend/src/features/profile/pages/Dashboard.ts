import { Header } from '../../../shared/components/Header';
import { BackBtn } from '../../../shared/components/BackBtn';
import { apiService, User, Match } from '../../../shared/services/api';
import { appState } from '../../../core/state/AppState';
import { config } from '../../../config/environment';

export class Dashboard {
  private container: HTMLElement;
  private player: User | null = null;
  private matches: Match[] = [];
  private loading = true;
  private playerId: string;
  private header: Header | null = null;
  private backBtn: BackBtn | null = null;
  private refreshIntervalId: number | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(container: HTMLElement, playerId: string) {
    this.container = container;
    this.playerId = playerId;
    this.init();
  }

  private async init() {
    const state = appState.getState();

    if (state.loading) {
      this.showLoadingState();
      await this.waitForAuthInitialization();
    }

    const finalState = appState.getState();

    if (!finalState.isAuthenticated || !finalState.user) {
      appState.router?.navigate('/');
      return;
    }

    await Promise.all([this.loadPlayer(), this.loadMatches()]);

    this.loading = false;
    this.render();
    this.startAutoRefresh();
  }

  private async waitForAuthInitialization(): Promise<void> {
    return new Promise(resolve => {
      if (!appState.getState().loading) {
        resolve();
        return;
      }

      const unsubscribe = appState.subscribe(state => {
        if (!state.loading) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  private showLoadingState(): void {
    this.container.innerHTML = `
			<div class="min-h-screen bg-blue-900 text-white flex items-center justify-center">
				<div class="text-4xl font-iceland">
					Loading Dashboard...
				</div>
			</div>
		`;
  }

  private async loadPlayer() {
    try {
      this.player = await apiService.getUserById(Number(this.playerId));
    } catch (error) {
      console.error('Error loading player:', error);
    }
  }

  private async loadMatches() {
    try {
      if (this.playerId) {
        const response = await apiService.getMatches({
          player_id: Number(this.playerId),
          include_guests: true,
        });
        this.matches = Array.isArray(response) ? response : response.data;
      } else {
        console.warn('No playerId provided for loadMatches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      this.matches = [];
    }
  }

  private getPlayerStats(matches?: any[]) {
    const totalGames = this.player?.total_games || 0;
    const wins = this.player?.total_wins || 0;

    return {
      winRate: totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0',
      avgScore: this.calculateAverageScore(matches),
      bestScore: this.getBestScore(matches),
      recentForm: this.getRecentForm(matches),
    };
  }

  private calculateAverageScore(matches?: any[]): string {
    const matchesToUse = matches || this.matches || [];
    if (matchesToUse.length === 0) return '0';

    const currentUsername = appState.getState().user?.username;
    const scores = matchesToUse.map(match =>
      match.player1_username === currentUsername ? match.player1_score : match.player2_score
    );

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average.toFixed(1);
  }

  private getBestScore(matches?: any[]): number {
    const matchesToUse = matches || this.matches || [];
    if (matchesToUse.length === 0) return 0;

    const currentUsername = appState.getState().user?.username;
    const scores = matchesToUse.map(match =>
      match.player1_username === currentUsername ? match.player1_score : match.player2_score
    );

    return Math.max(...scores);
  }

  private getRecentForm(matches?: any[]): string {
    const matchesToUse = matches || this.matches || [];
    if (matchesToUse.length === 0) return 'N/A';

    const currentUser = appState.getState().user;
    const recentMatches = matchesToUse.slice(0,5).reverse();

    const results = recentMatches.map(match => (match.winner_id === currentUser?.id ? 'W' : 'L'));

    return results.join('');
  }

  private renderAdvancedStats(): string {
    const stats = this.getPlayerStats();

    return `
			<div class="grid grid-cols-2 gap-4 text-[1.8rem] px-4">
				<div class="text-center">
					<div class="text-yellow-300">Win Rate</div>
					<div class="text-[2rem] font-bold">${stats.winRate}%</div>
				</div>
				<div class="text-center">
					<div class="text-blue-300">Avg Score</div>
					<div class="text-[2rem] font-bold">${stats.avgScore}</div>
				</div>
				<div class="text-center">
					<div class="text-green-300">Best Score</div>
					<div class="text-[2rem] font-bold">${stats.bestScore}</div>
				</div>
				<div class="text-center">
					<div class="text-purple-300">Recent Form</div>
					<div class="text-[2rem] font-bold tracking-wider">${stats.recentForm}</div>
				</div>
			</div>
		`;
  }

  private render() {
    if (this.loading) {
      this.container.innerHTML = `
				<div class="bg-purple-800 text-white text-3xl min-h-screen flex items-center justify-center">
					Loading...
				</div>
			`;
      return;
    }

    const state = appState.getState();
    if (!state.isAuthenticated || !state.user) {
      this.container.innerHTML = '';
      return;
    }

    this.container.innerHTML = `
			<div class="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white">
				<div id="header-container"></div>
				
				<div class="w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600 self-center border-x-4 border-t-4 flex flex-col p-4">
					<div class="text-center text-[4rem] border-b-2 w-full flex">
						<div id="back-btn-container" class="flex-1"></div>
						<h1 class="flex-1">${this.player?.username || 'Unknown'}'s <br /> Dashboard</h1>
						
			<div class="flex-1 flex items-center justify-center">
				<button id="graph-toggle" class="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[120px] flex items-center justify-center text-[3rem]">
					More
				</button>
			</div>

					</div>

					<div class="flex flex-col mt-6 mx-10 flex-grow text-white text-[3rem]">
						<div class="border-b-2 pb-6 border-dashed mb-10">
							<h3 class="text-center text-[2.5rem]">Games played : ${this.player?.total_games || 0}</h3>
							<ul class="flex justify-evenly text-[2.2rem] mb-4">
								<li>Wins : ${this.player?.total_wins || 0}</li>
								<li>Losses : ${this.player?.total_losses || 0}</li>
							</ul>
							${this.renderAdvancedStats()}
						</div>
						
						<div class="flex flex-col gap-2 items-center">
							<h3 class="border-b-2 border-white">Match history</h3>
							<div id="matches-container">
								${this.renderMatches()}
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

    const modalHTML = `
	<div id="graph-modal" class="hidden fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen justify-center items-center text-white font-iceland">
		<div class="h-[500px] w-[1200px] bg-gradient-to-tl from-purple-700 to-blue-800 border-4 flex flex-col gap-10">

			<div class="flex justify-end">
				<button id="close-graph" class='border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[50px] mt-2 mr-2 flex items-center z-50 text-[2rem]'>
					X
				</button>
			</div>



			<div class="flex h-full text-[3rem] px-4 gap-4">
				<div class="flex-1 h-full" id="graph-left"></div>
				<div class="flex-1 h-full" id="graph-right"></div>
			</div>
		</div>
	</div>
	`;

    this.container.insertAdjacentHTML('beforeend', modalHTML);

    this.initializeComponents();
  }

  private renderMatches(): string {
    if (!this.matches || this.matches.length === 0) {
      return '<div class="text-white text-3xl">Nothing to see here</div>';
    }

    return this.matches.map(match => this.renderMatchRecap(match)).join('');
  }

  private renderMatchRecap(match: Match): string {
    const state = appState.getState();
    const currentUser = state.user;
    const victory = match.winner_id === currentUser?.id;

    return `
			<div class="${victory ? 'bg-blue-800' : 'bg-pink-800'} h-[180px] w-[800px] border-2 
				self-center cursor-pointer hover:scale-105 transition duration-300 text-[2rem] p-4 flex mb-4"
				data-match-id="${match.id}">
				
				<div class="flex-1">
					<h1 class="text-[3rem]">${victory ? 'Victory' : 'Defeat'}</h1>
					<h2>${match.created_at}</h2>
				</div>

				<div class="flex-[2] flex items-center justify-center">
					<div class="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
						<img src="${this.getAvatarUrl(match.player1_avatar_url)}" alt="icon" class="border-2 h-[100px] w-[100px]"/> 
						<h1>${match.player1_username || match.player1_guest_name || 'Unknown'}</h1>
					</div>

					<h1 class="flex-1 text-center text-[4rem]">${match.player1_score} - ${match.player2_score}</h1>
					
					<div class="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
						<img src="${this.getAvatarUrl(match.player2_avatar_url)}" alt="icon" class="border-2 h-[100px] w-[100px]"/> 
						<h1>${match.player2_username || match.player2_guest_name || 'Unknown'}</h1>
					</div>
				</div>
			</div>
		`;
  }

  private getAvatarUrl(avatarUrl: string | null | undefined): string {
    const DEFAULT_AVATAR_URL =
      'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4';

    if (!avatarUrl || avatarUrl.trim() === '') {
      return DEFAULT_AVATAR_URL;
    }

    if (avatarUrl.startsWith('/uploads/')) {
      return `${config.API_BASE_URL}${avatarUrl}`;
    }

    return avatarUrl;
  }

  private initializeComponents() {
    const headerContainer = this.container.querySelector('#header-container') as HTMLElement;
    if (headerContainer) {
      this.header = new Header(true);
      headerContainer.appendChild(this.header.getElement());
    }

    const backBtnContainer = this.container.querySelector('#back-btn-container') as HTMLElement;
    if (backBtnContainer) {
      this.backBtn = new BackBtn();
      backBtnContainer.appendChild(this.backBtn.getElement());
    }

    const graphBtn = this.container.querySelector('#graph-toggle');
    const modal = this.container.querySelector('#graph-modal');
    const closeBtn = this.container.querySelector('#close-graph');

    if (graphBtn && modal && closeBtn) {
      graphBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.renderGraphs().catch(console.error);
      });

      closeBtn.addEventListener('click', () => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
      });
    }

    this.addMatchEventListeners();
  }

  private addMatchEventListeners() {
    const matchElements = this.container.querySelectorAll('[data-match-id]');
    matchElements.forEach(element => {
      element.addEventListener('click', e => {
        const matchId = (e.currentTarget as HTMLElement).dataset.matchId;
        if (matchId) {
          this.showMatchStats(Number(matchId));
        }
      });
    });
  }

  private async showMatchStats(matchId: number) {
    const modal = document.createElement('div');
    modal.className =
      'fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen flex justify-center items-center text-white';
    modal.innerHTML = `
			<div class="flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[1000px] h-[600px] border-[5px] border-black text-[3rem] box-border font-iceland select-none">
				<div class="text-center p-4">Loading match statistics...</div>
			</div>
		`;

    document.body.appendChild(modal);

    try {
      const matchDetails = await apiService.getMatchById(matchId);
      this.renderMatchStatsModal(modal, matchDetails);
    } catch (error) {
      console.error('Error loading match stats:', error);
      modal.querySelector('div')!.innerHTML = `
				<div class="text-center p-4">Error loading stats</div>
				<button class="match-stats-close bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Close</button>
			`;
    }

    modal.addEventListener('click', e => {
      if (e.target === modal || (e.target as HTMLElement).classList.contains('match-stats-close')) {
        document.body.removeChild(modal);
      }
    });
  }

  private renderMatchStatsModal(modal: HTMLElement, matchDetails: any) {
    const modalContent = modal.querySelector('div') as HTMLElement;
    modalContent.innerHTML = `

	<div class="flex justify-end">
		<button class='match-stats-close border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[50px] mt-2 mr-2 flex items-center z-50 text-[2rem]'>
			X
		</button>
	</div>
			
	<div class="flex flex-col items-center border-collapse m-2">
		<div class="flex w-full text-center gap-10">
		<div class="text-[3rem] flex-1 flex overflow-hidden gap-4 justify-start">
			<img src="${this.getAvatarUrl(matchDetails.player1_avatar_url)}" alt="icon" class="border-2 min-w-[120px] h-[120px]"/>
			<h1>${matchDetails.player1_username}</h1>
		</div>

		<div class="text-[3rem] flex-1 flex overflow-hidden gap-4 justify-end">
			<h1>${matchDetails.player2_username ? matchDetails.player2_username : "Guest"}</h1>
			<img src="${this.getAvatarUrl(matchDetails.player2_avatar_url)}" alt="icon" class="border-2 min-w-[120px] h-[120px]"/>
		</div>
		</div>
	
		<h2 class="text-[4rem]">${Math.floor(matchDetails.duration_seconds)}s</h2>

		<div class="flex justify-evenly w-full text-center mb-4">
		<h2 class="flex-1">${matchDetails.player1_score}</h2>
		<h2 class="flex-1 border-b-2 border-dashed">Score</h2>
		<h2 class="flex-1">${matchDetails.player2_score}</h2>
		</div>

		<div class="flex justify-evenly w-full text-center mb-4">
		<h2 class="flex-1">${matchDetails.player1_touched_ball}</h2>
		<h2 class="flex-1 border-b-2 border-dashed">Hits</h2>
		<h2 class="flex-1">${matchDetails.player2_touched_ball}</h2>
		</div>

		<div class="flex justify-evenly w-full text-center">
		<h2 class="flex-1">${matchDetails.player1_missed_ball}</h2>
		<h2 class="flex-1 border-b-2 border-dashed">Misses</h2>
		<h2 class="flex-1">${matchDetails.player2_missed_ball}</h2>
		</div>
	</div>
	`;
  }

  private async renderGraphs() {
    let matches: Match[] = [];
    try {
      const response = await apiService.getMatches({
        player_id: Number(this.playerId),
        include_guests: true,
      });
      matches = Array.isArray(response) ? response : response.data || [];
    } catch (error) {
      console.error('Failed to load matches for modal:', error);
    }

    if (!matches || matches.length === 0) {
      const left = this.container.querySelector('#graph-left');
      const right = this.container.querySelector('#graph-right');

      const noDataMessage = this.generateBarChart([], 'No match data');
      if (left) left.innerHTML = noDataMessage;
      if (right) right.innerHTML = noDataMessage;
      return;
    }

    const lastMatches = matches.slice(0,5).reverse();
    const currentUser = appState.getState().user;

    const scores = lastMatches.map(match => {
      return match.player1_username === currentUser?.username
        ? match.player1_score
        : match.player2_score;
    });

    const results = lastMatches.map(match => {
      return match.winner_id === currentUser?.id ? 1 : 0;
    });

    const left = this.container.querySelector('#graph-left');
    const right = this.container.querySelector('#graph-right');

    if (left) left.innerHTML = this.generateBarChart(scores, 'Last scores');
    if (right) right.innerHTML = this.generateWinrate(results, 'Winrate (5 last games)');
  }

  private generateBarChart(data: number[], title: string): string {
    if (!data || data.length === 0) {
      return `
				<svg viewBox="0 0 600 250" class="w-full h-full">
				<text x="300" y="20" text-anchor="middle" class="fill-white text-[2.5rem]">${title}</text>
				<text x="300" y="125" text-anchor="middle" class="fill-white text-[2rem]">No data to display</text>
				</svg>
			`;
    }

    const max = Math.max(...data);
    const bars = data
      .map((val, i) => {
        const height = (val / max) * 160;
        const x = 40 + i * 100;
        const y = 200 - height;
        return `
			<rect x="${x}" y="${y}" width="60" height="${height}" class="fill-blue-400"></rect>
			<text x="${x + 30}" y="220" text-anchor="middle" class="fill-white text-[1.7rem]">${i + 1}</text>
			<text x="${x + 30}" y="${y - 5}" text-anchor="middle" class="fill-white text-[1.5rem]">${val}</text>
			`;
      })
      .join('');

    return `
      <div class='flex flex-col justify-center items-center'>
        <h1 class='text-[2.5rem]'>${title}</h1>
        <svg viewBox="0 0 600 250" class="w-full h-full">
          <line x1="30" y1="200" x2="570" y2="200" stroke="white" />
          ${bars}
        </svg>
      </div>
		`;
  }

  private generateWinrate(data: number[], title: string): string {
    if (!data || data.length === 0) {
      return `
				<svg viewBox="0 0 600 250" class="w-full h-full">
				<text x="300" y="20" text-anchor="middle" class="fill-white text-[2.5rem]">${title}</text>
				<text x="300" y="125" text-anchor="middle" class="fill-white text-[2rem]">No data to display</text>
				</svg>
			`;
    }

    let wins = 0;
    const winrates = data.map((val, i) => {
      wins += val;
      return Math.round((wins / (i + 1)) * 100);
    });

    const max = 100;
    const bars = winrates
      .map((val, i) => {
        const height = (val / max) * 160;
        const x = 40 + i * 100;
        const y = 200 - height;
        return `
				<rect x="${x}" y="${y}" width="60" height="${height}" class="fill-green-400"></rect>
				<text x="${x + 30}" y="220" text-anchor="middle" class="fill-white text-[1.7rem]">${i + 1}</text>
				<text x="${x + 30}" y="${y - 5}" text-anchor="middle" class="fill-white text-[1.5rem]">${val}%</text>
			`;
      })
      .join('');

    return `
      <div class='flex flex-col justify-center items-center'>
        <h1 class='text-[2.5rem]'>${title}</h1>
        <svg viewBox="0 0 600 250" class="w-full h-full">
          <line x1="30" y1="200" x2="570" y2="200" stroke="white" />
          ${bars}
        </svg>
      </div>
		`;
  }

  private startAutoRefresh(): void {
    // Refresh when page becomes visible
    this.visibilityChangeHandler = () => {
      if (!document.hidden) {
        this.refreshData().catch(error => {
          console.error('Error auto-refreshing dashboard:', error);
        });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Refresh every 30 seconds while dashboard is active
    this.refreshIntervalId = window.setInterval(() => {
      if (!document.hidden) {
        this.refreshData().catch(error => {
          console.error('Error auto-refreshing dashboard:', error);
        });
      }
    }, 30000);
  }

  private stopAutoRefresh(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  async refreshData() {
    try {
      await Promise.all([this.loadPlayer(), this.loadMatches()]);

      this.render();
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  }

  destroy() {
    this.stopAutoRefresh();
    
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }
  }
}
