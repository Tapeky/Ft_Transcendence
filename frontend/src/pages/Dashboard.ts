import { Header } from '../components/ui/Header';
import { BackBtn } from '../components/ui/BackBtn';
import { apiService, User, Match } from '../services/api';
import { appState } from '../state/AppState';

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
    // DEBUG: Afficher l'état d'auth au moment du Dashboard
    const state = appState.getState();
    console.log('🔍 Dashboard INIT - État auth:', {
      loading: state.loading,
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      userExists: !!state.user
    });

    if (state.loading) {
      // Afficher un état de chargement pendant l'initialisation
      this.showLoadingState();
      
      // Attendre la fin de l'initialisation
      await this.waitForAuthInitialization();
    }

    // Vérifier l'authentification APRÈS initialisation
    const finalState = appState.getState();
    console.log('🔍 Dashboard FINAL - État auth:', {
      loading: finalState.loading,
      isAuthenticated: finalState.isAuthenticated,
      user: finalState.user,
      userExists: !!finalState.user
    });

    if (!finalState.isAuthenticated || !finalState.user) {
      console.log('❌ Dashboard: Auth check failed, navigating to /');
      appState.router?.navigate('/');
      return;
    }

    // Success;

    // Charger les données
    await Promise.all([
      this.loadPlayer(),
      this.loadMatches()
    ]);

    this.loading = false;
    this.render();
  }

  private async waitForAuthInitialization(): Promise<void> {
    return new Promise((resolve) => {
      // Si déjà initialisé, résoudre immédiatement
      if (!appState.getState().loading) {
        resolve();
        return;
      }

      // Sinon, attendre le changement d'état
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
        const response = await apiService.getMatches({ player_id: Number(this.playerId) });
        this.matches = response.data || [];
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      this.matches = [];
    }
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

    // Vérifier à nouveau l'auth après loading
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
            <div id="back-btn-container"></div>
            <h1 class="flex-1">${this.player?.username || 'Unknown'}'s <br /> Dashboard</h1>
            <div class="flex-1"></div>
          </div>

          <div class="flex flex-col mt-6 mx-10 flex-grow text-white text-[3rem]">
            <div class="border-b-2 pb-6 border-dashed mb-10">
              <h3 class="text-center text-[2.5rem]">Games played : ${this.player?.total_games || 0}</h3>
              <ul class="flex justify-evenly text-[2.2rem]">
                <li>Wins : ${this.player?.total_wins || 0}</li>
                <li>Losses : ${this.player?.total_losses || 0}</li>
              </ul>
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

    // Initialiser les composants
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
      <div class="${victory ? 'bg-blue-800' : 'bg-pink-800'} h-[180px] w-4/5 border-2 
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
    // Initialiser Header
    const headerContainer = this.container.querySelector('#header-container') as HTMLElement;
    if (headerContainer) {
      this.header = new Header(true);
      headerContainer.appendChild(this.header.getElement());
    }

    // Initialiser BackBtn
    const backBtnContainer = this.container.querySelector('#back-btn-container') as HTMLElement;
    if (backBtnContainer) {
      this.backBtn = new BackBtn();
      backBtnContainer.appendChild(this.backBtn.getElement());
    }

    // Ajouter les event listeners pour les matches
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
    // Créer le modal de statistiques
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

    // Ajouter event listener pour fermer
    modal.addEventListener('click', (e) => {
      if (e.target === modal || (e.target as HTMLElement).classList.contains('match-stats-close')) {
        document.body.removeChild(modal);
      }
    });
  }

  private renderMatchStatsModal(modal: HTMLElement, matchDetails: any) {
    const modalContent = modal.querySelector('div') as HTMLElement;
    modalContent.innerHTML = `
      <div class="flex justify-end p-2">
        <button class="match-stats-close text-white hover:text-red-300 text-[2rem]">✕</button>
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

  destroy() {
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }
  }
}