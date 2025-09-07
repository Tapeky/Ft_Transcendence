import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';
import { TournamentService, Tournament, NextMatch } from '../services/TournamentService';
import { TournamentBracketComponent } from '../components/TournamentBracket';

export class TournamentPage {
  private element: HTMLElement;
  private tournamentService: TournamentService;
  private bracketComponent: TournamentBracketComponent | null = null;
  private currentTournamentId: number | null = null;
  private tournaments: Tournament[] = [];

  constructor() {
    this.tournamentService = TournamentService.getInstance();
    this.element = this.createElement();
    this.loadTournaments();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen bg-gray-900 text-white';

    const user = authManager.getCurrentUser();
    
    container.innerHTML = `
      <div class="min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-gray-800 border-b border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center space-x-4">
                <button id="back-btn" class="text-gray-400 hover:text-white transition-colors">
                  ← Back to Menu
                </button>
                <h1 class="text-xl font-bold text-white">🏆 Tournaments</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-300">${user?.username || 'User'}</span>
                <button id="logout-btn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 p-8">
          <div class="max-w-6xl mx-auto">
            
            <!-- Tournament Management Section -->
            <div class="mb-8">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Gestion des Tournois</h2>
                <button id="create-tournament-btn" class="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors">
                  ➕ Créer un Tournoi
                </button>
              </div>

              <!-- Tournaments List -->
              <div id="tournaments-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div class="text-center py-12 text-gray-400">
                  Chargement des tournois...
                </div>
              </div>
            </div>

            <!-- Tournament Bracket Section -->
            <div id="bracket-section" class="hidden">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Bracket du Tournoi</h2>
                <div class="flex gap-2">
                  <button id="refresh-bracket-btn" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    🔄 Actualiser
                  </button>
                  <button id="get-next-match-btn" class="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    📢 Prochain Match
                  </button>
                  <button id="close-bracket-btn" class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    ✖ Fermer
                  </button>
                </div>
              </div>
              <div id="bracket-container" class="bg-gray-800 rounded-lg p-6">
                <!-- Le bracket sera rendu ici -->
              </div>
            </div>

          </div>
        </main>

        <!-- Create Tournament Modal -->
        <div id="create-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold mb-4">Créer un Nouveau Tournoi</h3>
            <form id="create-tournament-form">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Nom du tournoi</label>
                <input type="text" id="tournament-name" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" required>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea id="tournament-description" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows="3"></textarea>
              </div>
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-300 mb-2">Nombre maximum de participants</label>
                <select id="tournament-max-players" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="4">4 joueurs</option>
                  <option value="8" selected>8 joueurs</option>
                  <option value="16">16 joueurs</option>
                  <option value="32">32 joueurs</option>
                </select>
              </div>
              <div class="flex gap-3">
                <button type="button" id="cancel-create-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Join Tournament Modal -->
        <div id="join-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold mb-4">Rejoindre le Tournoi</h3>
            <form id="join-tournament-form">
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-300 mb-2">Votre alias dans ce tournoi</label>
                <input type="text" id="tournament-alias" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" 
                       placeholder="Ex: ProGamer, Lightning, etc..." maxlength="50" required>
                <p class="text-xs text-gray-400 mt-1">Les alias sont réinitialisés à chaque nouveau tournoi</p>
              </div>
              <div class="flex gap-3">
                <button type="button" id="cancel-join-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  Rejoindre
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    `;

    this.attachEventListeners();
    return container;
  }

  private async loadTournaments(): Promise<void> {
    try {
      this.tournaments = await this.tournamentService.listTournaments();
      this.renderTournamentsList();
    } catch (error) {
      console.error('Erreur chargement tournois:', error);
      this.showError('Erreur lors du chargement des tournois');
    }
  }

  private renderTournamentsList(): void {
    const listContainer = this.element.querySelector('#tournaments-list') as HTMLElement;
    
    if (!this.tournaments.length) {
      listContainer.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-400">
          <div class="text-4xl mb-4">🏆</div>
          <p>Aucun tournoi disponible.</p>
          <p class="text-sm mt-2">Créez le premier tournoi !</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.tournaments.map(tournament => `
      <div class="tournament-card bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-lg">${tournament.name}</h3>
          ${this.getTournamentStatusBadge(tournament.status)}
        </div>
        
        <p class="text-gray-400 text-sm mb-3 line-clamp-2">${tournament.description || 'Aucune description'}</p>
        
        <div class="flex justify-between items-center text-sm text-gray-300 mb-4">
          <span>👥 ${tournament.current_players}/${tournament.max_players}</span>
          <span>📅 ${new Date(tournament.created_at).toLocaleDateString()}</span>
        </div>

        <div class="flex gap-2">
          ${tournament.status === 'open' ? `
            <button class="join-tournament-btn flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition-colors"
                    data-tournament-id="${tournament.id}">
              Rejoindre
            </button>
          ` : ''}
          
          <button class="view-bracket-btn flex-1 bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm transition-colors"
                  data-tournament-id="${tournament.id}">
            Voir Bracket
          </button>

          ${tournament.status === 'open' ? `
            <button class="start-tournament-btn bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm transition-colors"
                    data-tournament-id="${tournament.id}">
              Démarrer
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Attach event listeners for tournament cards
    this.attachTournamentCardListeners();
  }

  private getTournamentStatusBadge(status: string): string {
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

  private attachEventListeners(): void {
    // Back button
    this.element.querySelector('#back-btn')?.addEventListener('click', () => {
      router.navigate('/menu');
    });

    // Logout
    this.element.querySelector('#logout-btn')?.addEventListener('click', () => {
      authManager.logout();
      router.navigate('/auth');
    });

    // Create tournament
    this.element.querySelector('#create-tournament-btn')?.addEventListener('click', () => {
      this.showCreateTournamentModal();
    });

    // Create tournament form
    this.element.querySelector('#create-tournament-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateTournament();
    });

    // Join tournament form  
    this.element.querySelector('#join-tournament-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleJoinTournament();
    });

    // Modal close buttons
    this.element.querySelector('#cancel-create-btn')?.addEventListener('click', () => {
      this.hideModal('create-modal');
    });

    this.element.querySelector('#cancel-join-btn')?.addEventListener('click', () => {
      this.hideModal('join-modal');
    });

    // Bracket controls
    this.element.querySelector('#refresh-bracket-btn')?.addEventListener('click', () => {
      if (this.currentTournamentId) {
        this.loadTournamentBracket(this.currentTournamentId);
      }
    });

    this.element.querySelector('#get-next-match-btn')?.addEventListener('click', () => {
      if (this.currentTournamentId) {
        this.requestNextMatch(this.currentTournamentId);
      }
    });

    this.element.querySelector('#close-bracket-btn')?.addEventListener('click', () => {
      this.closeBracket();
    });
  }

  private attachTournamentCardListeners(): void {
    // Join tournament buttons
    this.element.querySelectorAll('.join-tournament-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        this.showJoinTournamentModal(tournamentId);
      });
    });

    // View bracket buttons
    this.element.querySelectorAll('.view-bracket-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        this.loadTournamentBracket(tournamentId);
      });
    });

    // Start tournament buttons
    this.element.querySelectorAll('.start-tournament-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        this.startTournament(tournamentId);
      });
    });
  }

  // Modal management
  private showCreateTournamentModal(): void {
    this.showModal('create-modal');
  }

  private showJoinTournamentModal(tournamentId: number): void {
    this.currentTournamentId = tournamentId;
    this.showModal('join-modal');
  }

  private showModal(modalId: string): void {
    const modal = this.element.querySelector(`#${modalId}`) as HTMLElement;
    modal?.classList.remove('hidden');
  }

  private hideModal(modalId: string): void {
    const modal = this.element.querySelector(`#${modalId}`) as HTMLElement;
    modal?.classList.add('hidden');
  }

  // Tournament actions
  private async handleCreateTournament(): Promise<void> {
    try {
      const name = (this.element.querySelector('#tournament-name') as HTMLInputElement).value;
      const description = (this.element.querySelector('#tournament-description') as HTMLTextAreaElement).value;
      const maxPlayers = parseInt((this.element.querySelector('#tournament-max-players') as HTMLSelectElement).value);

      await this.tournamentService.createTournament(name, description, maxPlayers);
      
      this.hideModal('create-modal');
      this.showSuccess('Tournoi créé avec succès! Les alias ont été réinitialisés.');
      this.loadTournaments(); // Reload the list

    } catch (error: any) {
      this.showError(error.message || 'Erreur lors de la création du tournoi');
    }
  }

  private async handleJoinTournament(): Promise<void> {
    if (!this.currentTournamentId) return;

    try {
      const alias = (this.element.querySelector('#tournament-alias') as HTMLInputElement).value;
      
      await this.tournamentService.joinTournament(this.currentTournamentId, alias);
      
      this.hideModal('join-modal');
      this.showSuccess(`Vous avez rejoint le tournoi en tant que "${alias}"`);
      this.loadTournaments(); // Reload the list

    } catch (error: any) {
      this.showError(error.message || 'Erreur lors de l\'inscription au tournoi');
    }
  }

  private async startTournament(tournamentId: number): Promise<void> {
    try {
      const bracket = await this.tournamentService.startTournament(tournamentId);
      this.showSuccess('Tournoi démarré avec succès!');
      this.loadTournaments(); // Reload the list
      this.loadTournamentBracket(tournamentId); // Show the bracket

    } catch (error: any) {
      this.showError(error.message || 'Erreur lors du démarrage du tournoi');
    }
  }

  private async loadTournamentBracket(tournamentId: number): Promise<void> {
    try {
      this.currentTournamentId = tournamentId;
      const bracket = await this.tournamentService.getTournamentBracket(tournamentId);
      
      // Show bracket section
      const bracketSection = this.element.querySelector('#bracket-section') as HTMLElement;
      bracketSection.classList.remove('hidden');

      // Initialize bracket component
      const bracketContainer = this.element.querySelector('#bracket-container') as HTMLElement;
      this.bracketComponent = new TournamentBracketComponent(bracketContainer);
      this.bracketComponent.updateBracket(bracket);

      // Subscribe to tournament events
      this.subscribeToTournamentEvents(tournamentId);

      // Scroll to bracket
      bracketSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error: any) {
      this.showError(error.message || 'Erreur lors du chargement du bracket');
    }
  }

  /**
   * EXIGENCE SUJET: Demander le prochain match
   */
  private async requestNextMatch(tournamentId: number): Promise<void> {
    try {
      const nextMatch = await this.tournamentService.getNextMatch(tournamentId);
      
      if (nextMatch && this.bracketComponent) {
        this.bracketComponent.displayNextMatchAnnouncement(nextMatch);
        this.showSuccess(`Match annoncé: ${nextMatch.player1?.alias} vs ${nextMatch.player2?.alias || 'BYE'}`);
      } else {
        this.showInfo('Aucun match suivant disponible');
      }

    } catch (error: any) {
      this.showError(error.message || 'Erreur lors de la récupération du prochain match');
    }
  }

  private subscribeToTournamentEvents(tournamentId: number): void {
    this.tournamentService.subscribeToTournament(tournamentId, {
      onTournamentStarted: (data) => {
        this.showSuccess('Le tournoi a démarré!');
        this.loadTournamentBracket(tournamentId);
      },
      onNextMatchAnnounced: (data) => {
        if (this.bracketComponent && data.nextMatch) {
          this.bracketComponent.displayNextMatchAnnouncement(data.nextMatch);
        }
        this.showInfo(data.announcement || 'Prochain match annoncé');
      },
      onMatchCompleted: (data) => {
        this.showSuccess('Match terminé!');
        this.loadTournamentBracket(tournamentId); // Refresh bracket
      },
      onTournamentCompleted: (data) => {
        this.showSuccess('🏆 Tournoi terminé!');
        this.loadTournaments(); // Refresh tournament list
      },
      onError: (error) => {
        this.showError(error);
      }
    });
  }

  private closeBracket(): void {
    const bracketSection = this.element.querySelector('#bracket-section') as HTMLElement;
    bracketSection.classList.add('hidden');
    
    if (this.currentTournamentId) {
      this.tournamentService.unsubscribeFromTournament(this.currentTournamentId);
    }
    
    this.currentTournamentId = null;
    this.bracketComponent = null;
  }

  // Utility methods
  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showInfo(message: string): void {
    this.showNotification(message, 'info');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600', 
      info: 'bg-blue-600'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public cleanup(): void {
    this.tournamentService.disconnect();
  }
}