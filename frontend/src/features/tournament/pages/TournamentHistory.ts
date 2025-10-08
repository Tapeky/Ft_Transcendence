import { Tournament } from '../types/tournament';
import { TournamentService } from '../services/TournamentService';
import { Header } from '../../../shared/components/Header';
import { Banner } from '../../../shared/components/Banner';
import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';

export class TournamentHistory {
  private element: HTMLElement;
  private tournaments: Tournament[] = [];
  private isLoading: boolean = false;
  private header?: Header;
  private banner?: Banner;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.subscribeToAuth();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadTournaments();
  }

  private async loadTournaments(): Promise<void> {
    this.isLoading = true;
    this.updateLoadingState();

    try {
      this.tournaments = await TournamentService.getHistory();
      this.render();
    } catch (error) {
      console.error('Failed to load tournament history:', error);
      this.renderError("Impossible de charger l'historique des tournois");
    } finally {
      this.isLoading = false;
    }
  }

  private async clearHistory(): Promise<void> {
    const confirmationHTML = `
      <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="bg-black/40 backdrop-blur-sm rounded-lg p-8 text-center text-white max-w-md w-[90%] border-2 border-white font-iceland">
          <h2 class="text-3xl font-bold mb-4 text-red-400">Confirm Deletion</h2>
          <p class="mb-4 text-white/90 text-lg">Are you sure you want to delete ALL tournament history?</p>
          <p class="text-red-400 font-bold mb-6 text-xl">This action cannot be undone!</p>
          <div class="flex justify-center gap-4 flex-wrap">
            <button id="confirm-clear" class="text-white border-red-400 border-2 px-6 py-3 rounded hover:bg-red-400 hover:text-white transition-colors text-lg font-bold">
              Delete All
            </button>
            <button id="cancel-clear" class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors text-lg font-bold">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    const confirmationEl = document.createElement('div');
    confirmationEl.innerHTML = confirmationHTML;
    document.body.appendChild(confirmationEl);

    return new Promise((resolve, reject) => {
      const confirmBtn = confirmationEl.querySelector('#confirm-clear') as HTMLButtonElement;
      const cancelBtn = confirmationEl.querySelector('#cancel-clear') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(confirmationEl);
      };

      confirmBtn?.addEventListener('click', async () => {
        cleanup();
        try {
          this.isLoading = true;
          this.updateLoadingState();

          const result = await TournamentService.clearHistory();

          await this.loadTournaments();

          this.showMessage('History cleared successfully!', 'success');

          resolve();
        } catch (error) {
          console.error('Failed to clear tournament history:', error);
          this.showMessage('Error deleting history', 'error');
          reject(error);
        }
      });

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve();
      });

      const overlay = confirmationEl.firstElementChild as HTMLElement;
      overlay?.addEventListener('click', e => {
        if (e.target === overlay) {
          cleanup();
          resolve();
        }
      });
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageEl = document.createElement('div');
    const borderColor = type === 'success' ? 'border-green-400' : 'border-red-400';
    const bgColor = type === 'success' ? 'bg-green-600/20' : 'bg-red-600/20';
    messageEl.className = `fixed top-5 right-5 px-6 py-4 rounded-lg text-white font-bold z-50 backdrop-blur-sm border-2 ${borderColor} ${bgColor} font-iceland text-lg`;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          if (messageEl.parentNode) {
            document.body.removeChild(messageEl);
          }
        }, 300);
      }
    }, 3000);
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className =
      'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true);
    this.banner = new Banner();

    const mainContent = document.createElement('div');
    mainContent.className =
      'tournament-history-main flex-grow bg-gradient-to-r from-blue-800 to-red-700';
    mainContent.id = 'tournament-content';

    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(mainContent);

    return container;
  }

  private subscribeToAuth(): void {
    this.authUnsubscribe = authManager.subscribeToAuth(authState => {
      if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
        router.navigate('/');
      }
    });

    if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
      router.navigate('/');
    }
  }

  private updateLoadingState(): void {
    if (this.isLoading) {
      const mainContent = this.element.querySelector('#tournament-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="p-8 w-full">
            <div class="bg-black/20 backdrop-blur-sm rounded-lg mb-6 p-4 border-white border-2">
              <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold text-white font-iceland">Tournament History</h1>
              </div>
            </div>
            
            <div class="flex items-center justify-center min-h-[400px]">
              <div class="text-center bg-black/30 backdrop-blur-sm rounded-lg p-12 border-white border-2">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto mb-6"></div>
                <p class="text-2xl text-white font-iceland">Loading history...</p>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  private renderError(message: string): void {
    const mainContent = this.element.querySelector('#tournament-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="p-8 w-full">
          <div class="bg-black/20 backdrop-blur-sm rounded-lg mb-6 p-4 border-white border-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-4">
                <button id="back-btn" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
                  ← Back to Menu
                </button>
                <h1 class="text-2xl font-bold text-white font-iceland">Tournament History</h1>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-center min-h-[400px]">
            <div class="text-center bg-black/30 backdrop-blur-sm rounded-lg p-12 border-2 border-red-400">
              <h3 class="text-3xl font-bold mb-4 text-red-400 font-iceland">Error</h3>
              <p class="text-red-300 mb-6 text-xl font-iceland">${message}</p>
              <button id="retry-btn" class="text-white border-white border-2 px-6 py-3 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg font-bold">
                Retry
              </button>
            </div>
          </div>
        </div>
      `;

      const retryBtn = mainContent.querySelector('#retry-btn') as HTMLButtonElement;
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadTournaments());
      }
      
      const backBtn = mainContent.querySelector('#back-btn') as HTMLButtonElement;
      if (backBtn) {
        backBtn.addEventListener('click', () => router.navigate('/menu'));
      }
    }
  }

  private render(): void {
    const mainContent = this.element.querySelector('#tournament-content');
    if (!mainContent) return;

    if (this.tournaments.length === 0) {
      mainContent.innerHTML = `
        <div class="p-8 w-full">
          <div class="bg-black/20 backdrop-blur-sm rounded-lg mb-6 p-4 border-white border-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-4">
                <button id="back-btn" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
                  ← Back to Menu
                </button>
                <h1 class="text-2xl font-bold text-white font-iceland">Tournament History</h1>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-center min-h-[400px]">
            <div class="text-center bg-black/30 backdrop-blur-sm rounded-lg p-12 border-white border-2">
              <h3 class="text-3xl font-bold mb-4 text-white font-iceland">No Tournaments Yet</h3>
              <p class="text-white/80 mb-8 text-xl font-iceland">Completed tournaments will appear here.</p>
              <button id="create-tournament-btn" class="text-white border-white border-2 px-8 py-4 rounded hover:bg-white hover:text-black transition-colors font-iceland text-xl font-bold">
                Create New Tournament
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      mainContent.innerHTML = `
        <div class="p-8 w-full">
          <div class="bg-black/20 backdrop-blur-sm rounded-lg mb-6 p-4 border-white border-2">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-4">
                <button id="back-btn" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-black transition-colors font-iceland text-lg">
                  ← Back to Menu
                </button>
                <h1 class="text-2xl font-bold text-white font-iceland">Tournament History</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-white font-iceland text-lg">Total: ${this.tournaments.length}</span>
                <button id="clear-history-btn" class="text-white border-white border-2 px-4 py-2 rounded hover:bg-white hover:text-red-600 transition-colors font-iceland text-lg">
                  Clear All
                </button>
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${this.tournaments.map(tournament => this.renderTournamentCard(tournament)).join('')}
          </div>
        </div>
      `;
    }

    this.attachEventListeners();
  }

  private renderTournamentCard(tournament: Tournament): string {
    const statusIcon = this.getStatusIcon(tournament.status);
    const statusColorClass = this.getStatusColorClass(tournament.status);
    const completedDate = tournament.completedAt
      ? new Date(tournament.completedAt).toLocaleString('fr-FR')
      : 'Not completed';
    const winner = tournament.winnerAlias;

    return `
      <div class="bg-black/30 backdrop-blur-sm rounded-lg p-6 border-2 border-white cursor-pointer transition duration-300 transform hover:scale-105 hover:shadow-2xl text-white font-iceland" data-tournament-id="${tournament.id}">
        
        <div class="flex justify-between items-start mb-4 gap-3">
          <h3 class="text-2xl font-bold text-white flex-1">${tournament.name}</h3>
          <span class="px-3 py-1 rounded text-sm font-bold bg-black/40 whitespace-nowrap ${statusColorClass} border border-white/20">
            ${statusIcon} ${this.getStatusText(tournament.status)}
          </span>
        </div>
        
        <div class="space-y-2 mb-4 text-lg">
          <div class="flex justify-between items-center border-b border-white/20 pb-2">
            <span class="text-white/90">Players:</span>
            <span class="font-medium text-white">${tournament.currentPlayers}/${tournament.maxPlayers}</span>
          </div>
          <div class="flex justify-between items-center border-b border-white/20 pb-2">
            <span class="text-white/90">Created:</span>
            <span class="font-medium text-white">${new Date(tournament.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
          ${
            tournament.status === 'completed'
              ? `
            <div class="bg-green-600/20 p-3 rounded border-2 border-green-400/50 mt-2">
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-green-200">Winner:</span>
                <span class="font-bold text-green-100 text-xl">${winner || 'N/A'}</span>
              </div>
              <div class="flex justify-between items-center text-base">
                <span class="text-white/90">Completed:</span>
                <span class="text-white/80">${completedDate}</span>
              </div>
            </div>
          `
              : tournament.status !== 'cancelled'
                ? `
            <div class="bg-blue-600/20 p-3 rounded border-2 border-blue-400/50 mt-2">
              <div class="flex justify-between items-center">
                <span class="font-bold text-blue-200">Active Tournament</span>
                <button class="resume-tournament-btn text-white border-white border-2 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors text-base" data-tournament-id="${tournament.id}">
                  Resume
                </button>
              </div>
            </div>
          `
                : ''
          }
        </div>
        
        ${
          tournament.players && tournament.players.length > 0
            ? `
          <div class="mb-4">
            <h4 class="font-bold text-white/90 mb-2 text-lg">Participants:</h4>
            <div class="flex flex-wrap gap-2">
              ${tournament.players
                .map(
                  player => `
                <span class="bg-black/40 border border-white/30 px-3 py-1 rounded text-base">${player.alias}</span>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }
        
        ${
          tournament.matches && tournament.matches.length > 0
            ? `
          <div class="mt-4">
            <h4 class="font-bold text-white/90 mb-2 text-lg">Matches (${tournament.matches.length}):</h4>
            <div class="space-y-1 text-base text-white/80">
              ${tournament.matches
                .slice(0, 3)
                .map(
                  match => `
                <div class="border-b border-white/10 pb-1">
                  ${match.player1Alias} vs ${match.player2Alias}
                  ${match.status === 'completed' ? `<span class="font-bold text-white">(${match.player1Score}-${match.player2Score})</span>` : `<span class="text-yellow-300">(${match.status})</span>`}
                </div>
              `
                )
                .join('')}
              ${
                tournament.matches.length > 3
                  ? `
                <div class="text-white/60 text-sm">... ${tournament.matches.length - 3} more</div>
              `
                  : ''
              }
            </div>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  private getStatusIcon(status: string): string {
    return '';
  }

  private getStatusColorClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-300';
      case 'in_progress':
      case 'running':
        return 'text-blue-300';
      case 'ready':
        return 'text-yellow-300';
      case 'registration':
        return 'text-cyan-300';
      case 'cancelled':
        return 'text-red-300';
      default:
        return 'text-gray-300';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'running':
        return 'En cours';
      case 'ready':
        return 'Prêt';
      case 'registration':
        return 'Inscription';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }

  private attachEventListeners(): void {
    const mainContent = this.element.querySelector('#tournament-content');
    if (!mainContent) return;

    const backBtn = mainContent.querySelector('#back-btn') as HTMLButtonElement;
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    const clearBtn = mainContent.querySelector('#clear-history-btn') as HTMLButtonElement;
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        try {
          await this.clearHistory();
        } catch (error) {
          console.error('Error clearing history:', error);
        }
      });
    }

    const createBtn = mainContent.querySelector('#create-tournament-btn') as HTMLButtonElement;
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        // Clear any existing tournament ID to ensure fresh start
        sessionStorage.removeItem('activeTournamentId');
        sessionStorage.removeItem('tournamentMatchResult');
        router.navigate('/tournament');
      });
    }

    const resumeBtns = mainContent.querySelectorAll('.resume-tournament-btn');
    resumeBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tournamentId = btn.getAttribute('data-tournament-id');
        if (tournamentId) {
          router.navigate(`/tournament?id=${tournamentId}`);
        }
      });
    });

    const tournamentCards = mainContent.querySelectorAll('[data-tournament-id]');
    tournamentCards.forEach(card => {
      card.addEventListener('click', () => {
        const tournamentId = card.getAttribute('data-tournament-id');
        if (tournamentId) {
          const tournament = this.tournaments.find(t => t.id === tournamentId);
          if (tournament && tournament.status === 'completed') {
            router.navigate(`/tournament?id=${tournamentId}`);
          }
        }
      });
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    if (this.header) {
      this.header.destroy();
    }

    if (this.banner) {
      this.banner.destroy();
    }

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
