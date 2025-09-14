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
      this.renderError('Impossible de charger l\'historique des tournois');
    } finally {
      this.isLoading = false;
    }
  }

  private async clearHistory(): Promise<void> {
    // Confirmation dialog
    const confirmationHTML = `
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-8 text-center text-gray-800 max-w-md w-[90%] shadow-2xl border-2 border-gray-200">
          <h2 class="text-2xl font-bold mb-4 text-red-600">⚠️ Confirmer la suppression</h2>
          <p class="mb-4 text-gray-700">Êtes-vous sûr de vouloir supprimer tout l'historique des tournois terminés ?</p>
          <p class="text-red-600 font-bold mb-6">Cette action est irréversible !</p>
          <div class="flex justify-center gap-4 flex-wrap">
            <button id="confirm-clear" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">
              🗑️ Supprimer
            </button>
            <button id="cancel-clear" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">
              Annuler
            </button>
          </div>
        </div>
      </div>
    `;

    // Add confirmation modal to DOM
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
          // Show loading state
          this.isLoading = true;
          this.updateLoadingState();

          const result = await TournamentService.clearHistory();
          console.log(`✅ ${result.message} - ${result.deletedCount} tournois supprimés`);
          
          // Reload the tournaments list
          await this.loadTournaments();
          
          // Show success message briefly
          this.showMessage('✅ Historique supprimé avec succès !', 'success');
          
          resolve();
        } catch (error) {
          console.error('Failed to clear tournament history:', error);
          this.showMessage('❌ Erreur lors de la suppression de l\'historique', 'error');
          reject(error);
        }
      });

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve();
      });

      // Close on overlay click
      const overlay = confirmationEl.firstElementChild as HTMLElement;
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve();
        }
      });
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const messageEl = document.createElement('div');
    const bgColorClass = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    messageEl.className = `fixed top-5 right-5 px-6 py-4 rounded-lg text-white font-bold z-50 shadow-2xl border border-white/20 animate-fade-in ${bgColorClass}`;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'fadeOut 0.3s ease';
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
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true); // userVisible = true
    this.banner = new Banner();

    // Main content area
    const mainContent = document.createElement('div');
    mainContent.className = 'tournament-history-main flex-grow bg-gradient-to-r from-blue-800 to-red-700';
    mainContent.id = 'tournament-content';

    // Assemble the page (matching Menu.ts structure)
    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(mainContent);

    return container;
  }

  private subscribeToAuth(): void {
    // Subscribe to auth changes like Menu page
    this.authUnsubscribe = authManager.subscribeToAuth((authState) => {
      if (!authState.loading && !(authState.isAuthenticated && authState.user)) {
        router.navigate('/');
      }
    });

    // Initial verification
    if (!authManager.isAuthenticated() || !authManager.getCurrentUser()) {
      router.navigate('/');
    }
  }

  private updateLoadingState(): void {
    if (this.isLoading) {
      const mainContent = this.element.querySelector('#tournament-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="flex items-center justify-center min-h-[400px] text-white">
            <div class="text-center">
              <div class="loading-spinner border-4 border-white/30 border-t-white rounded-full w-12 h-12 animate-spin mx-auto"></div>
              <p class="mt-5 text-xl text-white/80">Chargement de l'historique...</p>
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
        <div class="flex items-center justify-center min-h-[400px] text-white">
          <div class="text-center">
            <h2 class="text-4xl mb-4">❌ Erreur</h2>
            <p class="text-red-300 mb-6 text-xl">${message}</p>
            <button id="retry-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">
              Réessayer
            </button>
          </div>
        </div>
      `;

      const retryBtn = mainContent.querySelector('#retry-btn') as HTMLButtonElement;
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadTournaments());
      }
    }
  }

  private render(): void {
    const mainContent = this.element.querySelector('#tournament-content');
    if (!mainContent) return;

    if (this.tournaments.length === 0) {
      mainContent.innerHTML = `
        <div class="p-8 max-w-6xl mx-auto">
          <!-- Header Section -->
          <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
            <h1 class="text-5xl font-bold text-white text-shadow-lg">📊 Historique des Tournois</h1>
            <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-white transition duration-300 transform hover:scale-105">
              ← Retour au menu
            </button>
          </div>
          
          <!-- Empty State -->
          <div class="flex items-center justify-center min-h-[400px] text-white">
            <div class="text-center bg-white/10 rounded-2xl p-12 backdrop-blur-sm border border-white/20">
              <h2 class="text-6xl mb-6">🏆</h2>
              <h3 class="text-3xl font-bold mb-4">Aucun tournoi terminé</h3>
              <p class="text-white/80 mb-8 text-xl">Les tournois complétés apparaîtront ici.</p>
              <button id="create-tournament-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-300 transform hover:scale-105 border-2 border-white">
                Créer un nouveau tournoi
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      mainContent.innerHTML = `
        <div class="p-8 max-w-6xl mx-auto">
          <!-- Header Section -->
          <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
            <h1 class="text-5xl font-bold text-white">📊 Historique des Tournois</h1>
            
            <!-- Stats -->
            <div class="flex gap-4">
              <span class="bg-white/20 px-4 py-2 rounded-full text-white font-bold backdrop-blur-sm">
                Total: ${this.tournaments.length}
              </span>
              <span class="bg-white/20 px-4 py-2 rounded-full text-white font-bold backdrop-blur-sm">
                Terminés: ${this.tournaments.filter(t => t.status === 'completed').length}
              </span>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-3">
              <button id="clear-history-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-white transition duration-300 transform hover:scale-105">
                🗑️ Supprimer l'historique
              </button>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-white transition duration-300 transform hover:scale-105">
                ← Retour au menu
              </button>
            </div>
          </div>
          
          <!-- Tournaments Grid -->
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
    const completedDate = tournament.completedAt ? new Date(tournament.completedAt).toLocaleString('fr-FR') : 'Non terminé';
    const winner = tournament.winnerAlias;

    return `
      <div class="bg-gradient-to-br from-purple-900 to-blue-800 rounded-2xl p-6 border-2 border-white/20 backdrop-blur-sm cursor-pointer transition duration-300 transform hover:scale-105 hover:shadow-2xl text-white" data-tournament-id="${tournament.id}">
        
        <!-- Card Header -->
        <div class="flex justify-between items-start mb-4 gap-3">
          <h3 class="text-xl font-bold text-white flex-1">${tournament.name}</h3>
          <span class="px-3 py-1 rounded-full text-sm font-bold bg-black/20 whitespace-nowrap ${statusColorClass}">
            ${statusIcon} ${this.getStatusText(tournament.status)}
          </span>
        </div>
        
        <!-- Tournament Info -->
        <div class="space-y-3 mb-4">
          <div class="flex justify-between items-center">
            <span class="font-bold text-white/90">👥 Joueurs:</span>
            <span class="font-medium text-white">${tournament.currentPlayers}/${tournament.maxPlayers}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-bold text-white/90">📅 Créé:</span>
            <span class="font-medium text-white">${new Date(tournament.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
          ${tournament.status === 'completed' ? `
            <div class="bg-green-600/30 p-3 rounded-lg border-l-4 border-green-400">
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-green-200">🏆 Gagnant:</span>
                <span class="font-bold text-green-100 text-lg">${winner || 'N/A'}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-bold text-white/90">✅ Terminé:</span>
                <span class="font-medium text-white/80 text-sm">${completedDate}</span>
              </div>
            </div>
          ` : tournament.status !== 'cancelled' ? `
            <div class="bg-blue-600/30 p-3 rounded-lg border-l-4 border-blue-400">
              <div class="flex justify-between items-center">
                <span class="font-bold text-blue-200">⚡ Tournoi actif</span>
                <button class="resume-tournament-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105" data-tournament-id="${tournament.id}">
                  🎮 Reprendre
                </button>
              </div>
            </div>
          ` : ''}
        </div>
        
        ${tournament.players && tournament.players.length > 0 ? `
          <div class="mb-4">
            <h4 class="font-bold text-white/90 mb-2">Participants:</h4>
            <div class="flex flex-wrap gap-2">
              ${tournament.players.map(player => `
                <span class="bg-blue-600/40 px-2 py-1 rounded-lg text-sm font-medium border border-blue-400/30">${player.alias}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${tournament.matches && tournament.matches.length > 0 ? `
          <div class="mt-4">
            <h4 class="font-bold text-white/90 mb-2">Matchs (${tournament.matches.length}):</h4>
            <div class="space-y-1 text-sm text-white/80">
              ${tournament.matches.slice(0, 3).map((match) => `
                <div class="border-b border-white/10 pb-1">
                  ${match.player1Alias} vs ${match.player2Alias}
                  ${match.status === 'completed' ? `<span class="font-bold text-white">(${match.player1Score}-${match.player2Score})</span>` : `<span class="text-yellow-300">(${match.status})</span>`}
                </div>
              `).join('')}
              ${tournament.matches.length > 3 ? `
                <div class="text-white/60 text-xs">... et ${tournament.matches.length - 3} autres matchs</div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': case 'running': return '🎮';
      case 'ready': return '⏳';
      case 'registration': return '📝';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': case 'running': return '#007bff';
      case 'ready': return '#ffc107';
      case 'registration': return '#17a2b8';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  }

  private getStatusColorClass(status: string): string {
    switch (status) {
      case 'completed': return 'text-green-300';
      case 'in_progress': case 'running': return 'text-blue-300';
      case 'ready': return 'text-yellow-300';
      case 'registration': return 'text-cyan-300';
      case 'cancelled': return 'text-red-300';
      default: return 'text-gray-300';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'running': return 'En cours';
      case 'ready': return 'Prêt';
      case 'registration': return 'Inscription';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  }

  private attachEventListeners(): void {
    const mainContent = this.element.querySelector('#tournament-content');
    if (!mainContent) return;

    // Back button
    const backBtn = mainContent.querySelector('#back-btn') as HTMLButtonElement;
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    // Clear history button
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

    // Create tournament button
    const createBtn = mainContent.querySelector('#create-tournament-btn') as HTMLButtonElement;
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        router.navigate('/tournament');
      });
    }

    // Resume tournament buttons
    const resumeBtns = mainContent.querySelectorAll('.resume-tournament-btn');
    resumeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const tournamentId = btn.getAttribute('data-tournament-id');
        if (tournamentId) {
          // Navigate to tournament page with ID to resume
          router.navigate(`/tournament?id=${tournamentId}`);
        }
      });
    });

    // Tournament cards click to view details (only for completed tournaments)
    const tournamentCards = mainContent.querySelectorAll('[data-tournament-id]');
    tournamentCards.forEach(card => {
      card.addEventListener('click', () => {
        const tournamentId = card.getAttribute('data-tournament-id');
        if (tournamentId) {
          // Only allow viewing details for completed tournaments
          const tournament = this.tournaments.find(t => t.id === tournamentId);
          if (tournament && tournament.status === 'completed') {
            router.navigate(`/tournament?id=${tournamentId}`);
          }
        }
      });
    });
  }

  // Removed old CSS styles - now using Tailwind classes

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    // Clean up Header component
    if (this.header) {
      this.header.destroy();
    }
    
    // Clean up Banner component
    if (this.banner) {
      this.banner.destroy();
    }

    // Unsubscribe from auth
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    
    // Remove element
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}