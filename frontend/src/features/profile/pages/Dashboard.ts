import { Header } from '../../../shared/components/Header';
import { BackBtn } from '../../../shared/components/BackBtn';
import { apiService, User, Match } from '../../../shared/services/api';
import { appState } from '../../../core/state/AppState';

export class Dashboard {
	private container: HTMLElement;
	private player: User | null = null;
	private matches: Match[] = [];
	private loading = true;
	private playerId: string;
	private header: Header | null = null;
	private backBtn: BackBtn | null = null;

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

		await Promise.all([
			this.loadPlayer(),
			this.loadMatches()
		]);

		this.loading = false;
		this.render();
	}

	private async waitForAuthInitialization(): Promise<void> {
		return new Promise((resolve) => {
			if (!appState.getState().loading) {
				resolve();
				return;
			}

			const unsubscribe = appState.subscribe((state) => {
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
					include_guests: true
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
		const losses = this.player?.total_losses || 0;

		return {
			winRate: totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : '0',
			avgScore: this.calculateAverageScore(matches),
			bestScore: this.getBestScore(matches),
			recentForm: this.getRecentForm(matches)
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
		const recentMatches = matchesToUse.slice(-5);

		const results = recentMatches.map(match =>
			match.winner_id === currentUser?.id ? 'W' : 'L'
		);

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
					<h1 class="text-[3rem]">${victory ? "Victory" : "Defeat"}</h1>
					<h2>${match.created_at}</h2>
				</div>

				<div class="flex-[2] flex items-center justify-center">
					<div class="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
						<img src="${this.getAvatarUrl(match.player1_avatar_url)}" alt="icon" class="border-2 h-[100px] w-[100px]"/> 
						<h1>${match.player1_username || match.player1_guest_name || 'Unknown'}</h1>
						${match.player1_username && match.player1_username !== currentUser?.username ? `
							<button 
								data-invite-username="${match.player1_username}"
								class="mt-1 px-2 py-1 text-[0.8rem] bg-green-600 hover:bg-green-500 rounded transition">
								🎮 Rematch
							</button>
						` : ''}
					</div>

					<h1 class="flex-1 text-center text-[4rem]">${match.player1_score} - ${match.player2_score}</h1>
					
					<div class="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
						<img src="${this.getAvatarUrl(match.player2_avatar_url)}" alt="icon" class="border-2 h-[100px] w-[100px]"/> 
						<h1>${match.player2_username || match.player2_guest_name || 'Unknown'}</h1>
						${match.player2_username && match.player2_username !== currentUser?.username ? `
							<button 
								data-invite-username="${match.player2_username}"
								class="mt-1 px-2 py-1 text-[0.8rem] bg-green-600 hover:bg-green-500 rounded transition">
								🎮 Rematch
							</button>
						` : ''}
					</div>
				</div>
			</div>
		`;
	}

	private getAvatarUrl(avatarUrl: string | null | undefined): string {
		const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4';
		
		if (!avatarUrl || avatarUrl.trim() === '') {
			return DEFAULT_AVATAR_URL;
		}
		
		if (avatarUrl.startsWith('/uploads/')) {
			return `https://localhost:8000${avatarUrl}`;
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
			element.addEventListener('click', (e) => {
				const matchId = (e.currentTarget as HTMLElement).dataset.matchId;
				if (matchId) {
					this.showMatchStats(Number(matchId));
				}
			});
		});
	}

	private async showMatchStats(matchId: number) {
		const modal = document.createElement('div');
		modal.className = 'fixed top-0 left-0 bg-white z-40 bg-opacity-20 w-screen h-screen flex justify-center items-center text-white';
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

		modal.addEventListener('click', (e) => {
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
			<h1>${matchDetails.player2_username}</h1>
			<img src="${this.getAvatarUrl(matchDetails.player2_avatar_url)}" alt="icon" class="border-2 min-w-[120px] h-[120px]"/>
		</div>
		</div>
	
		<h2 class="text-[4rem]">${matchDetails.duration_seconds}s</h2>

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
				include_guests: true
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

		const lastMatches = matches.slice(-5);
		const currentUser = appState.getState().user;

		const scores = lastMatches.map(match => {
			return match.player1_username === currentUser?.username ? match.player1_score : match.player2_score;
		});

		const results = lastMatches.map(match => {
			return match.winner_id === currentUser?.id ? 1 : 0;
		});

		const left = this.container.querySelector('#graph-left');
		const right = this.container.querySelector('#graph-right');

		if (left)
			left.innerHTML = this.generateBarChart(scores, 'Last scores');
		if (right)
			right.innerHTML = this.generateWinrate(results, 'Winrate (5 last games)');
	}

	private renderDetailedStats(matches?: any[]): string {
		const stats = this.getPlayerStats(matches);
		const totalGames = this.player?.total_games || 0;
		const wins = this.player?.total_wins || 0;
		const losses = this.player?.total_losses || 0;
		const winRate = parseFloat(stats.winRate);

		return `
			<div class="h-full p-4 flex flex-col">
				<h3 class="text-center text-[2.5rem] mb-6 border-b-2 pb-2">Performance Analytics</h3>

				<div class="mb-6">
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Win Rate</h4>
					<div class="flex justify-center items-center">
						<div class="relative w-32 h-32">
							<svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
								<path class="text-gray-600" stroke="currentColor" stroke-width="3" fill="none" 
									d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
								<path class="text-green-400" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"
									stroke-dasharray="${winRate}, 100" 
									d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
							</svg>
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="text-[1.5rem] font-bold text-white">${stats.winRate}%</span>
							</div>
						</div>
					</div>
				</div>

				<div class="mb-6">
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Score Analysis</h4>
					<div class="space-y-2">
						<div class="flex justify-between items-center">
							<span class="text-[1.4rem]">Avg Score:</span>
							<div class="flex items-center">
								<div class="w-24 h-4 bg-gray-600 rounded mr-2">
									<div class="h-4 bg-blue-400 rounded" style="width: ${Math.min(parseFloat(stats.avgScore) / 21 * 100, 100)}%"></div>
								</div>
								<span class="text-[1.4rem] font-bold">${stats.avgScore}</span>
							</div>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-[1.4rem]">Best Score:</span>
							<div class="flex items-center">
								<div class="w-24 h-4 bg-gray-600 rounded mr-2">
									<div class="h-4 bg-yellow-400 rounded" style="width: ${Math.min(stats.bestScore / 21 * 100, 100)}%"></div>
								</div>
								<span class="text-[1.4rem] font-bold">${stats.bestScore}</span>
							</div>
						</div>
					</div>
				</div>

				<div>
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Games Distribution</h4>
					<div class="space-y-3">
						<div class="flex items-center">
							<span class="text-[1.4rem] w-20">Wins:</span>
							<div class="flex-1 mx-3 h-6 bg-gray-600 rounded">
								<div class="h-6 bg-green-400 rounded flex items-center justify-end pr-2" 
									style="width: ${totalGames > 0 ? (wins / totalGames * 100) : 0}%">
									<span class="text-[1rem] font-bold">${wins}</span>
								</div>
							</div>
						</div>
						<div class="flex items-center">
							<span class="text-[1.4rem] w-20">Losses:</span>
							<div class="flex-1 mx-3 h-6 bg-gray-600 rounded">
								<div class="h-6 bg-red-400 rounded flex items-center justify-end pr-2" 
									style="width: ${totalGames > 0 ? (losses / totalGames * 100) : 0}%">
									<span class="text-[1rem] font-bold">${losses}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-4">
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Recent Form</h4>
					<div class="flex justify-center space-x-2">
						${stats.recentForm.split('').map(result => 
							`<div class="w-8 h-8 rounded ${result === 'W' ? 'bg-green-400' : 'bg-red-400'} 
								flex items-center justify-center text-black font-bold text-[1.2rem]">${result}</div>`
						).join('')}
					</div>
				</div>
			</div>
		`;
	}

	private renderMatchBreakdown(matches?: any[]): string {
		const matchesToUse = matches || this.matches || [];
		if (matchesToUse.length === 0) {
			return '<div class="flex items-center justify-center h-full text-[2rem]">No matches to analyze</div>';
		}

		const currentUser = appState.getState().user;
		const recentMatches = matchesToUse.slice(-10);

		const matchResults = recentMatches.map((match, index) => {
			const isWin = match.winner_id === currentUser?.id;
			const playerScore = match.player1_username === currentUser?.username ? match.player1_score : match.player2_score;
			return { index, isWin, score: playerScore };
		});

		const maxScore = Math.max(...matchResults.map(m => m.score), 21);
		const chartHeight = 200;

		return `
			<div class="h-full p-4 flex flex-col">
				<h3 class="text-center text-[2.5rem] mb-4 border-b-2 pb-2">Match Progression</h3>

				<div class="mb-6">
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Score Evolution</h4>
					<div class="bg-gray-800 rounded p-4 relative" style="height: ${chartHeight}px;">
						${Array.from({length: 5}, (_, i) => {
							const y = (chartHeight - 40) * i / 4 + 20;
							const value = Math.round(maxScore * (4 - i) / 4);
							return `
								<div class="absolute left-0 right-0 border-t border-gray-600" style="top: ${y}px;"></div>
								<span class="absolute left-1 text-[0.8rem] text-gray-400" style="top: ${y - 8}px;">${value}</span>
							`;
						}).join('')}
						
						<svg class="absolute top-5 left-8 right-2 bottom-5" style="width: calc(100% - 40px); height: ${chartHeight - 40}px;">
							<polyline
								fill="none"
								stroke="#60a5fa"
								stroke-width="2"
								points="${matchResults.map((result, i) => {
									const x = (i / Math.max(matchResults.length - 1, 1)) * 100;
									const y = 100 - (result.score / maxScore * 100);
									return `${x}%,${y}%`;
								}).join(' ')}"
							/>
							${matchResults.map((result, i) => {
								const x = (i / Math.max(matchResults.length - 1, 1)) * 100;
								const y = 100 - (result.score / maxScore * 100);
								return `
									<circle
										cx="${x}%"
										cy="${y}%"
										r="4"
										fill="${result.isWin ? '#10b981' : '#ef4444'}"
										stroke="white"
										stroke-width="1"
									/>
								`;
							}).join('')}
						</svg>
					</div>
				</div>

				<div>
					<h4 class="text-[1.8rem] text-yellow-300 mb-3 text-center">Recent Results</h4>
					<div class="space-y-2 max-h-40 overflow-y-auto">
						${recentMatches.reverse().map((match, index) => {
							const isWin = match.winner_id === currentUser?.id;
							const playerScore = match.player1_username === currentUser?.username ? match.player1_score : match.player2_score;
							const opponentScore = match.player1_username === currentUser?.username ? match.player2_score : match.player1_score;
							const opponent = match.player1_username === currentUser?.username ?
								(match.player2_username || match.player2_guest_name) :
								(match.player1_username || match.player1_guest_name);

							const date = new Date(match.created_at);
							const timeAgo = this.getTimeAgo(date);

							return `
								<div class="flex items-center justify-between p-2 rounded ${isWin ? 'bg-green-800/20' : 'bg-red-800/20'}">
									<div class="flex items-center space-x-3">
										<div class="w-8 h-8 rounded ${isWin ? 'bg-green-400' : 'bg-red-400'} 
											flex items-center justify-center text-black font-bold text-[1.2rem]">
											${isWin ? 'W' : 'L'}
										</div>
										<span class="text-[1.3rem]">${playerScore}-${opponentScore}</span>
									</div>
									<div class="text-right">
										<div class="text-[1.1rem] text-gray-300 truncate max-w-[100px]">vs ${opponent || 'Unknown'}</div>
										<div class="text-[0.9rem] text-gray-500">${timeAgo}</div>
									</div>
								</div>
							`;
						}).join('')}
					</div>
				</div>
			</div>
		`;
	}

	private getTimeAgo(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 60) {
			return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else if (diffDays < 7) {
			return `${diffDays}d ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	private getCurrentWinStreak(): number {
		if (!this.matches || this.matches.length === 0) return 0;

		const currentUser = appState.getState().user;
		let streak = 0;

		for (let i = this.matches.length - 1; i >= 0; i--) {
			if (this.matches[i].winner_id === currentUser?.id) {
				streak++;
			} else {
				break;
			}
		}

		return streak;
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
		const bars = data.map((val, i) => {
			const height = (val / max) * 160;
			const x = 40 + i * 100;
			const y = 200 - height;
			return `
			<rect x="${x}" y="${y}" width="60" height="${height}" class="fill-blue-400"></rect>
			<text x="${x + 30}" y="220" text-anchor="middle" class="fill-white text-[1.7rem]">${i + 1}</text>
			<text x="${x + 30}" y="${y - 5}" text-anchor="middle" class="fill-white text-[1.5rem]">${val}</text>
			`;
		}).join('');

		return `
			<svg viewBox="0 0 600 250" class="w-full h-full">
			<text x="300" y="20" text-anchor="middle" class="fill-white text-[2.5rem]">${title}</text>
			<line x1="30" y1="200" x2="570" y2="200" stroke="white" />
			${bars}
			</svg>
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
		const bars = winrates.map((val, i) => {
			const height = (val / max) * 160;
			const x = 40 + i * 100;
			const y = 200 - height;
			return `
				<rect x="${x}" y="${y}" width="60" height="${height}" class="fill-green-400"></rect>
				<text x="${x + 30}" y="220" text-anchor="middle" class="fill-white text-[1.7rem]">${i + 1}</text>
				<text x="${x + 30}" y="${y - 5}" text-anchor="middle" class="fill-white text-[1.5rem]">${val}%</text>
			`;
		}).join('');

		return `
			<svg viewBox="0 0 600 250" class="w-full h-full">
				<text x="300" y="20" text-anchor="middle" class="fill-white text-[2.5rem]">${title}</text>
				<line x1="30" y1="200" x2="570" y2="200" stroke="white" />
				${bars}
			</svg>
		`;
	}

	async refreshData() {
		try {
			await Promise.all([
				this.loadPlayer(),
				this.loadMatches()
			]);

			this.render();

			console.log('Dashboard data refreshed successfully');
		} catch (error) {
			console.error('Error refreshing dashboard data:', error);
		}
	}

	destroy() {
		if (this.header) {
		this.header.destroy();
		}
		if (this.backBtn) {
		this.backBtn.destroy();
		}
	}
}
