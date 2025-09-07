import { authManager } from '../../../core/auth/AuthManager';
import { router } from '../../../core/app/Router';
import { TournamentService, Tournament } from '../services/TournamentService';
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
                <h1 class="text-xl font-bold text-white">Tournament</h1>
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
            <div class="mb-6">
              <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold">Tournaments</h2>
                <button class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors">
                  Create Tournament
                </button>
              </div>
            </div>

            <!-- Tournament Tabs -->
            <div class="flex space-x-4 mb-6">
              <button class="bg-blue-600 px-4 py-2 rounded-lg font-medium">Active</button>
              <button class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">Upcoming</button>
              <button class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">Completed</button>
            </div>

            <!-- Active Tournaments -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Tournament Card -->
              <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-xl font-semibold mb-2">🏆 Weekly Championship</h3>
                    <p class="text-gray-400 text-sm">Single Elimination • 16 Players</p>
                  </div>
                  <span class="bg-green-600 text-green-100 px-2 py-1 rounded text-xs font-medium">
                    LIVE
                  </span>
                </div>
                
                <div class="space-y-2 mb-4">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Prize Pool:</span>
                    <span class="text-yellow-400 font-medium">1000 pts</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Round:</span>
                    <span>Quarter Finals</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Players:</span>
                    <span>4/16 remaining</span>
                  </div>
                </div>

                <div class="flex space-x-2">
                  <button class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors">
                    View Bracket
                  </button>
                  <button class="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors">
                    Watch
                  </button>
                </div>
              </div>

              <!-- Empty state / Create tournament card -->
              <div class="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                <div class="text-6xl mb-4">🏆</div>
                <h3 class="text-xl font-semibold mb-2">Join a Tournament</h3>
                <p class="text-gray-400 mb-6">Compete against other players and climb the leaderboard!</p>
                <div class="space-y-2 w-full">
                  <button class="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition-colors">
                    Create Tournament
                  </button>
                  <button class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors">
                    Quick Join
                  </button>
                </div>
              </div>
            </div>

            <!-- Tournament Leaderboard -->
            <div class="mt-8">
              <h3 class="text-xl font-semibold mb-4">🏅 Tournament Leaderboard</h3>
              <div class="bg-gray-800 rounded-lg p-6">
                <div class="space-y-3">
                  <div class="flex items-center justify-between py-2 border-b border-gray-700">
                    <div class="flex items-center space-x-4">
                      <span class="text-yellow-400 font-bold">1</span>
                      <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                        👤
                      </div>
                      <span class="font-medium">Champion Player</span>
                    </div>
                    <div class="text-right">
                      <div class="text-yellow-400 font-bold">2,450 pts</div>
                      <div class="text-gray-400 text-xs">5 wins</div>
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between py-2 border-b border-gray-700">
                    <div class="flex items-center space-x-4">
                      <span class="text-gray-300 font-bold">2</span>
                      <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                        👤
                      </div>
                      <span class="font-medium">Runner Up</span>
                    </div>
                    <div class="text-right">
                      <div class="text-gray-300 font-bold">1,890 pts</div>
                      <div class="text-gray-400 text-xs">4 wins</div>
                    </div>
                  </div>

                  <div class="text-center py-4">
                    <button class="text-blue-400 hover:text-blue-300 transition-colors">
                      View Full Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    // Bind events directly on container before returning it
    const backBtn = container.querySelector('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        router.navigate('/menu');
      });
    }

    const logoutBtn = container.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await authManager.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      });
    }

    return container;
  }

  private setupEventListeners(): void {
    // This method is now unused - events are bound in createElement()
    // Keeping for potential future use or additional event handling
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private async loadTournaments(): Promise<void> {
    try {
      this.tournaments = await this.tournamentService.listTournaments();
      this.renderTournaments();
    } catch (error) {
      console.error('Erreur lors du chargement des tournois:', error);
      this.showErrorMessage('Impossible de charger les tournois');
    }
  }

  private renderTournaments(): void {
    const container = this.element.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2.gap-6');
    if (!container) return;

    // Vider le conteneur existant
    container.innerHTML = '';

    if (this.tournaments.length === 0) {
      // État vide - aucun tournoi
      container.innerHTML = `
        <div class="col-span-2 bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div class="text-6xl mb-4">🏆</div>
          <h3 class="text-xl font-semibold mb-2">Aucun tournoi disponible</h3>
          <p class="text-gray-400 mb-6">Soyez le premier à créer un tournoi !</p>
          <button id="create-tournament-btn" class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition-colors">
            Créer un Tournoi
          </button>
        </div>
      `;
    } else {
      // Afficher les tournois
      this.tournaments.forEach(tournament => {
        const tournamentCard = this.createTournamentCard(tournament);
        container.appendChild(tournamentCard);
      });

      // Ajouter une carte pour créer un nouveau tournoi
      const createCard = document.createElement('div');
      createCard.className = 'bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[280px]';
      createCard.innerHTML = `
        <div class="text-6xl mb-4">➕</div>
        <h3 class="text-xl font-semibold mb-2">Nouveau Tournoi</h3>
        <p class="text-gray-400 mb-6">Créez votre propre tournoi !</p>
        <button id="create-tournament-btn" class="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition-colors">
          Créer un Tournoi
        </button>
      `;
      container.appendChild(createCard);
    }

    this.setupTournamentEventListeners();
  }

  private createTournamentCard(tournament: Tournament): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-6';
    
    const statusColor = this.getStatusColor(tournament.status);
    const statusText = this.getStatusText(tournament.status);
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-semibold mb-2">🏆 ${tournament.name}</h3>
          <p class="text-gray-400 text-sm">${tournament.description || 'Tournoi Pong'}</p>
        </div>
        <span class="${statusColor} px-2 py-1 rounded text-xs font-medium">
          ${statusText}
        </span>
      </div>
      
      <div class="space-y-2 mb-4">
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Joueurs:</span>
          <span>${tournament.current_players}/${tournament.max_players}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Statut:</span>
          <span>${statusText}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Créé le:</span>
          <span>${new Date(tournament.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="flex space-x-2">
        ${this.getTournamentActions(tournament)}
      </div>
    `;

    return card;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'bg-blue-600 text-blue-100';
      case 'running': return 'bg-green-600 text-green-100';
      case 'completed': return 'bg-gray-600 text-gray-100';
      case 'cancelled': return 'bg-red-600 text-red-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'open': return 'OUVERT';
      case 'running': return 'EN COURS';
      case 'completed': return 'TERMINÉ';
      case 'cancelled': return 'ANNULÉ';
      default: return 'INCONNU';
    }
  }

  private getTournamentActions(tournament: Tournament): string {
    const user = authManager.getCurrentUser();
    const isCreator = user && tournament.created_by === user.id;

    switch (tournament.status) {
      case 'open':
        if (tournament.current_players < tournament.max_players) {
          return `
            <button class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors"
                    data-action="join" data-tournament-id="${tournament.id}">
              Rejoindre
            </button>
            <button class="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors"
                    data-action="view" data-tournament-id="${tournament.id}">
              Détails
            </button>
            ${isCreator && tournament.current_players >= 2 ? `
              <button class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition-colors"
                      data-action="start" data-tournament-id="${tournament.id}">
                Démarrer
              </button>
            ` : ''}
          `;
        } else {
          return `
            <button class="flex-1 bg-gray-600 py-2 rounded-lg font-medium" disabled>
              Complet
            </button>
            <button class="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors"
                    data-action="view" data-tournament-id="${tournament.id}">
              Détails
            </button>
          `;
        }
      case 'running':
        return `
          <button class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors"
                  data-action="bracket" data-tournament-id="${tournament.id}">
            Voir Bracket
          </button>
          <button class="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-medium transition-colors"
                  data-action="watch" data-tournament-id="${tournament.id}">
            Suivre
          </button>
        `;
      case 'completed':
        return `
          <button class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors"
                  data-action="results" data-tournament-id="${tournament.id}">
            Voir Résultats
          </button>
        `;
      default:
        return `
          <button class="flex-1 bg-gray-600 py-2 rounded-lg font-medium" disabled>
            Indisponible
          </button>
        `;
    }
  }

  private setupTournamentEventListeners(): void {
    // Event listener pour créer un tournoi
    const createBtn = this.element.querySelector('#create-tournament-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateTournamentModal());
    }

    // Event listeners pour les actions des tournois
    const actionButtons = this.element.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const action = target.getAttribute('data-action');
        const tournamentId = parseInt(target.getAttribute('data-tournament-id') || '0');
        
        if (action && tournamentId) {
          this.handleTournamentAction(action, tournamentId);
        }
      });
    });
  }

  private async handleTournamentAction(action: string, tournamentId: number): Promise<void> {
    try {
      switch (action) {
        case 'join':
          await this.showJoinTournamentModal(tournamentId);
          break;
        case 'start':
          await this.startTournament(tournamentId);
          break;
        case 'bracket':
          await this.viewTournamentBracket(tournamentId);
          break;
        case 'view':
          await this.viewTournamentDetails(tournamentId);
          break;
        case 'results':
          await this.viewTournamentResults(tournamentId);
          break;
        default:
          console.log('Action non implémentée:', action);
      }
    } catch (error) {
      console.error('Erreur lors de l\'action du tournoi:', error);
      this.showErrorMessage('Erreur lors de l\'exécution de l\'action');
    }
  }

  private showCreateTournamentModal(): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 class="text-xl font-bold mb-4 text-white">Créer un Tournoi</h2>
        
        <form id="create-tournament-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nom du tournoi</label>
            <input type="text" id="tournament-name" required maxlength="100"
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Ex: Championship 2024">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Description (optionnel)</label>
            <textarea id="tournament-description" maxlength="500"
                      class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description du tournoi..." rows="3"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nombre maximum de joueurs</label>
            <select id="tournament-max-players" required
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="4">4 joueurs</option>
              <option value="8" selected>8 joueurs</option>
              <option value="16">16 joueurs</option>
              <option value="32">32 joueurs</option>
            </select>
          </div>
          
          <div class="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
            <p class="text-sm text-blue-300">
              ℹ️ Les alias des joueurs seront automatiquement réinitialisés pour ce nouveau tournoi.
            </p>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button type="button" id="cancel-create" 
                    class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" 
                    class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              Créer le Tournoi
            </button>
          </div>
        </form>
      </div>
    `;

    // Ajouter la modal au DOM
    document.body.appendChild(modal);

    // Event listeners
    const form = modal.querySelector('#create-tournament-form') as HTMLFormElement;
    const cancelBtn = modal.querySelector('#cancel-create');
    
    // Fermer la modal
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    cancelBtn?.addEventListener('click', closeModal);
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Soumettre le formulaire
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = (document.getElementById('tournament-name') as HTMLInputElement).value;
      const description = (document.getElementById('tournament-description') as HTMLTextAreaElement).value;
      const maxPlayers = parseInt((document.getElementById('tournament-max-players') as HTMLSelectElement).value);

      try {
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = true;
        submitButton.textContent = 'Création...';

        await this.tournamentService.createTournament(name, description, maxPlayers);
        
        closeModal();
        this.showSuccessMessage('Tournoi créé avec succès !');
        
        // Recharger la liste des tournois
        await this.loadTournaments();
        
      } catch (error) {
        console.error('Erreur création tournoi:', error);
        this.showErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la création');
        
        // Réactiver le bouton
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = false;
        submitButton.textContent = 'Créer le Tournoi';
      }
    });
  }

  private showJoinTournamentModal(tournamentId: number): void {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      this.showErrorMessage('Tournoi introuvable');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 class="text-xl font-bold mb-4 text-white">Rejoindre le Tournoi</h2>
        
        <div class="mb-4 p-3 bg-gray-700 rounded-lg">
          <h3 class="font-semibold text-white">${tournament.name}</h3>
          <p class="text-gray-300 text-sm">${tournament.description || 'Tournoi Pong'}</p>
          <p class="text-gray-400 text-xs mt-1">
            ${tournament.current_players}/${tournament.max_players} joueurs
          </p>
        </div>
        
        <form id="join-tournament-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Votre alias pour ce tournoi</label>
            <input type="text" id="player-alias" required maxlength="50" 
                   pattern="[a-zA-Z0-9_\\-]+" 
                   title="Lettres, chiffres, _ et - uniquement"
                   class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Ex: ProGamer123">
            <p class="text-xs text-gray-400 mt-1">
              Lettres, chiffres, _ et - uniquement (max 50 caractères)
            </p>
          </div>
          
          <div class="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
            <p class="text-sm text-blue-300">
              ℹ️ Votre alias sera unique à ce tournoi et différent de votre nom d'utilisateur habituel.
            </p>
          </div>
          
          <div class="bg-yellow-900 bg-opacity-50 p-3 rounded-lg">
            <p class="text-sm text-yellow-300">
              ⚠️ Vous ne pourrez pas modifier votre alias une fois inscrit.
            </p>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button type="button" id="cancel-join" 
                    class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" 
                    class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Rejoindre
            </button>
          </div>
        </form>
      </div>
    `;

    // Ajouter la modal au DOM
    document.body.appendChild(modal);

    // Event listeners
    const form = modal.querySelector('#join-tournament-form') as HTMLFormElement;
    const cancelBtn = modal.querySelector('#cancel-join');
    const aliasInput = document.getElementById('player-alias') as HTMLInputElement;
    
    // Focus automatique sur l'input
    setTimeout(() => aliasInput.focus(), 100);

    // Fermer la modal
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    cancelBtn?.addEventListener('click', closeModal);
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Validation en temps réel
    aliasInput.addEventListener('input', () => {
      const value = aliasInput.value;
      const isValid = /^[a-zA-Z0-9_\-]*$/.test(value);
      
      if (!isValid && value.length > 0) {
        aliasInput.classList.add('border-red-500');
        aliasInput.classList.remove('border-gray-600');
      } else {
        aliasInput.classList.remove('border-red-500');
        aliasInput.classList.add('border-gray-600');
      }
    });

    // Soumettre le formulaire
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const alias = aliasInput.value.trim();
      
      if (!alias) {
        this.showErrorMessage('Veuillez saisir un alias');
        return;
      }

      if (!/^[a-zA-Z0-9_\-]+$/.test(alias)) {
        this.showErrorMessage('Alias invalide : lettres, chiffres, _ et - uniquement');
        return;
      }

      try {
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = true;
        submitButton.textContent = 'Inscription...';

        await this.tournamentService.joinTournament(tournamentId, alias);
        
        closeModal();
        this.showSuccessMessage(`Vous avez rejoint le tournoi en tant que "${alias}" !`);
        
        // Recharger la liste des tournois
        await this.loadTournaments();
        
      } catch (error) {
        console.error('Erreur inscription tournoi:', error);
        this.showErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'inscription');
        
        // Réactiver le bouton
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = false;
        submitButton.textContent = 'Rejoindre';
      }
    });
  }

  private async startTournament(tournamentId: number): Promise<void> {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      this.showErrorMessage('Tournoi introuvable');
      return;
    }

    // Confirmation avant démarrage
    const confirmed = await this.showConfirmationModal(
      'Démarrer le tournoi',
      `Êtes-vous sûr de vouloir démarrer le tournoi "${tournament.name}" ?`,
      'Une fois démarré, aucun nouveau joueur ne pourra rejoindre le tournoi.',
      'Démarrer'
    );

    if (!confirmed) return;

    try {
      const bracket = await this.tournamentService.startTournament(tournamentId);
      
      this.showSuccessMessage('Tournoi démarré ! Les brackets ont été générés.');
      
      // Recharger la liste des tournois
      await this.loadTournaments();
      
      // Optionnel : ouvrir directement la vue bracket
      await this.viewTournamentBracket(tournamentId);
      
    } catch (error) {
      console.error('Erreur démarrage tournoi:', error);
      this.showErrorMessage(error instanceof Error ? error.message : 'Erreur lors du démarrage');
    }
  }

  private showConfirmationModal(
    title: string, 
    message: string, 
    warning?: string, 
    confirmText: string = 'Confirmer'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <h2 class="text-xl font-bold mb-4 text-white">${title}</h2>
          
          <p class="text-gray-300 mb-4">${message}</p>
          
          ${warning ? `
            <div class="bg-yellow-900 bg-opacity-50 p-3 rounded-lg mb-4">
              <p class="text-sm text-yellow-300">
                ⚠️ ${warning}
              </p>
            </div>
          ` : ''}
          
          <div class="flex space-x-3">
            <button id="cancel-confirm" 
                    class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Annuler
            </button>
            <button id="confirm-action" 
                    class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#cancel-confirm');
      const confirmBtn = modal.querySelector('#confirm-action');

      const closeModal = (result: boolean) => {
        document.body.removeChild(modal);
        resolve(result);
      };

      cancelBtn?.addEventListener('click', () => closeModal(false));
      confirmBtn?.addEventListener('click', () => closeModal(true));
      
      // Fermer en cliquant à l'extérieur = annuler
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(false);
      });
    });
  }

  private async viewTournamentBracket(tournamentId: number): Promise<void> {
    try {
      const bracketData = await this.tournamentService.getTournamentBracket(tournamentId);
      
      // Naviguer vers la page bracket ou afficher dans une modal
      // Pour l'instant, on va afficher les informations dans une modal
      this.showBracketModal(bracketData);
      
    } catch (error) {
      console.error('Erreur chargement bracket:', error);
      this.showErrorMessage('Impossible de charger le bracket du tournoi');
    }
  }

  private showBracketModal(bracketData: any): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div class="sticky top-0 bg-gray-800 p-6 border-b border-gray-700">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold text-white">🏆 ${bracketData.tournament.name}</h2>
            <button id="close-bracket" class="text-gray-400 hover:text-white text-2xl">
              ✕
            </button>
          </div>
          <p class="text-gray-300 text-sm mt-1">${bracketData.tournament.description || 'Brackets du tournoi'}</p>
        </div>
        
        <div class="p-6">
          <!-- Participants -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-white mb-3">👥 Participants (${bracketData.participants.length})</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              ${bracketData.participants.map((p: any) => `
                <div class="bg-gray-700 rounded px-3 py-2">
                  <div class="text-white font-medium">${p.alias}</div>
                  <div class="text-gray-400 text-xs">${p.username}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Matches -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-white mb-3">⚔️ Matches</h3>
            ${bracketData.matches.length === 0 ? `
              <div class="text-center py-8 text-gray-400">
                <div class="text-4xl mb-2">🎮</div>
                <p>Les matches seront générés une fois le tournoi démarré</p>
              </div>
            ` : `
              <div class="space-y-3">
                ${this.renderMatches(bracketData.matches)}
              </div>
            `}
          </div>

          <!-- Prochain Match (Exigence sujet 42) -->
          ${bracketData.tournament.status === 'running' ? `
            <div class="bg-green-900 bg-opacity-50 p-4 rounded-lg">
              <h3 class="text-lg font-semibold text-green-300 mb-2">🎯 Prochain Match</h3>
              <div id="next-match-container">
                <p class="text-green-200">Chargement du prochain match...</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('#close-bracket');
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Event listeners pour les boutons "Jouer ce Match"
    const playButtons = modal.querySelectorAll('.play-match-btn');
    playButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const matchId = target.getAttribute('data-match-id');
        const opponentId = target.getAttribute('data-opponent-id');
        const tournamentId = target.getAttribute('data-tournament-id');
        
        if (matchId && opponentId && tournamentId) {
          this.startTournamentMatch(
            parseInt(matchId), 
            parseInt(opponentId), 
            parseInt(tournamentId)
          );
        }
      });
    });

    // Si le tournoi est en cours, charger le prochain match
    if (bracketData.tournament.status === 'running') {
      this.loadNextMatch(bracketData.tournament.id);
    }
  }

  private renderMatches(matches: any[]): string {
    const rounds = new Map<number, any[]>();
    
    // Grouper les matches par round
    matches.forEach(match => {
      const round = match.round || 1;
      if (!rounds.has(round)) {
        rounds.set(round, []);
      }
      rounds.get(round)!.push(match);
    });

    let html = '';
    
    // Afficher chaque round
    for (const [roundNum, roundMatches] of Array.from(rounds.entries()).sort(([a], [b]) => a - b)) {
      html += `
        <div class="mb-4">
          <h4 class="text-md font-medium text-blue-300 mb-2">Round ${roundNum}</h4>
          <div class="grid gap-2 md:grid-cols-2">
            ${roundMatches.map(match => this.renderMatch(match)).join('')}
          </div>
        </div>
      `;
    }

    return html;
  }

  private renderMatch(match: any): string {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'border-green-500';
        case 'in_progress': return 'border-yellow-500';
        case 'scheduled': return 'border-blue-500';
        default: return 'border-gray-600';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'completed': return '✅ Terminé';
        case 'in_progress': return '🔴 En cours';
        case 'scheduled': return '⏳ Programmé';
        default: return '❓ Statut inconnu';
      }
    };

    // Vérifier si l'utilisateur actuel peut jouer ce match
    const user = authManager.getCurrentUser();
    const canPlay = user && match.status === 'scheduled' && 
                   (match.player1_id === user.id || match.player2_id === user.id) &&
                   match.player1_id && match.player2_id; // Les deux joueurs doivent être définis

    return `
      <div class="bg-gray-700 rounded-lg p-3 border-l-4 ${getStatusColor(match.status)}">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-gray-400">${getStatusText(match.status)}</span>
          <span class="text-xs text-gray-400">Match #${match.id}</span>
        </div>
        
        <div class="space-y-1 mb-3">
          <div class="flex justify-between items-center">
            <span class="text-white">${match.player1_alias || 'En attente'}</span>
            <span class="text-gray-400">${match.player1_score || 0}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-white">${match.player2_alias || 'En attente'}</span>
            <span class="text-gray-400">${match.player2_score || 0}</span>
          </div>
        </div>

        ${canPlay ? `
          <div class="mt-3 pt-2 border-t border-gray-600">
            <button class="w-full bg-green-600 hover:bg-green-700 py-2 px-3 rounded text-sm font-medium transition-colors play-match-btn"
                    data-match-id="${match.id}" 
                    data-opponent-id="${match.player1_id === user.id ? match.player2_id : match.player1_id}"
                    data-tournament-id="${match.tournament_id}">
              🎮 Jouer ce Match
            </button>
          </div>
        ` : ''}

        ${match.winner_id ? `
          <div class="mt-2 pt-2 border-t border-gray-600">
            <div class="text-xs text-green-400">
              🏆 Vainqueur: ${match.winner_id === match.player1_id ? match.player1_alias : match.player2_alias}
            </div>
          </div>
        ` : ''}

        ${match.status === 'in_progress' ? `
          <div class="mt-2 pt-2 border-t border-gray-600">
            <div class="text-xs text-yellow-400">
              🔴 Match en cours - Rejoindre depuis le jeu
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private async loadNextMatch(tournamentId: number): Promise<void> {
    try {
      const nextMatch = await this.tournamentService.getNextMatch(tournamentId);
      const container = document.getElementById('next-match-container');
      
      if (!container) return;

      if (nextMatch) {
        container.innerHTML = `
          <div class="bg-gray-700 rounded-lg p-3">
            <div class="text-center">
              <div class="text-lg font-semibold text-white mb-2">
                ${nextMatch.player1?.alias || 'En attente'} 
                <span class="text-green-400">VS</span> 
                ${nextMatch.player2?.alias || 'En attente'}
              </div>
              <div class="text-sm text-gray-400">Match #${nextMatch.id}</div>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="text-center text-gray-400">
            <div class="text-2xl mb-1">🏁</div>
            <p>Aucun match en attente - Tournoi probablement terminé</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Erreur chargement prochain match:', error);
      const container = document.getElementById('next-match-container');
      if (container) {
        container.innerHTML = `
          <div class="text-center text-red-400">
            <p>Erreur lors du chargement du prochain match</p>
          </div>
        `;
      }
    }
  }

  private async viewTournamentDetails(tournamentId: number): Promise<void> {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      this.showErrorMessage('Tournoi introuvable');
      return;
    }

    // Pour l'instant, on réutilise l'affichage du bracket qui contient les détails
    await this.viewTournamentBracket(tournamentId);
  }

  private async viewTournamentResults(tournamentId: number): Promise<void> {
    const tournament = this.tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      this.showErrorMessage('Tournoi introuvable');
      return;
    }

    try {
      const bracketData = await this.tournamentService.getTournamentBracket(tournamentId);
      this.showResultsModal(bracketData);
    } catch (error) {
      console.error('Erreur chargement résultats:', error);
      this.showErrorMessage('Impossible de charger les résultats du tournoi');
    }
  }

  private showResultsModal(bracketData: any): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    // Trouver le vainqueur du tournoi
    const winner = bracketData.matches.find((m: any) => m.status === 'completed' && !bracketData.matches.find((other: any) => 
      other.status === 'completed' && (other.player1_id === m.winner_id || other.player2_id === m.winner_id) && other.id !== m.id
    ));

    const winnerParticipant = winner ? bracketData.participants.find((p: any) => p.user_id === winner.winner_id) : null;
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div class="sticky top-0 bg-gray-800 p-6 border-b border-gray-700">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold text-white">🏆 Résultats - ${bracketData.tournament.name}</h2>
            <button id="close-results" class="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
        </div>
        
        <div class="p-6">
          <!-- Vainqueur -->
          ${winnerParticipant ? `
            <div class="mb-6 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-6 text-center">
              <div class="text-4xl mb-2">🏆</div>
              <h3 class="text-2xl font-bold text-white mb-1">Vainqueur</h3>
              <div class="text-xl text-yellow-100">${winnerParticipant.alias}</div>
              <div class="text-sm text-yellow-200">(${winnerParticipant.username})</div>
            </div>
          ` : `
            <div class="mb-6 bg-gray-700 rounded-lg p-6 text-center">
              <div class="text-4xl mb-2">🏁</div>
              <h3 class="text-xl font-semibold text-white">Tournoi en cours</h3>
              <p class="text-gray-300">Le vainqueur sera déterminé à la fin</p>
            </div>
          `}

          <!-- Podium -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-white mb-3">🏅 Classement</h3>
            <div class="space-y-2">
              ${this.renderPodium(bracketData)}
            </div>
          </div>

          <!-- Statistiques -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-400">${bracketData.participants.length}</div>
              <div class="text-sm text-gray-300">Participants</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-400">${bracketData.matches.filter((m: any) => m.status === 'completed').length}</div>
              <div class="text-sm text-gray-300">Matches joués</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-purple-400">
                ${Math.max(...bracketData.matches.map((m: any) => m.round || 1))}
              </div>
              <div class="text-sm text-gray-300">Rounds</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('#close-results');
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  private renderPodium(bracketData: any): string {
    // Logique simplifiée pour créer un podium basé sur la progression
    const participants = bracketData.participants.map((p: any) => {
      const matches = bracketData.matches.filter((m: any) => 
        m.player1_id === p.user_id || m.player2_id === p.user_id
      );
      
      const wins = matches.filter((m: any) => m.winner_id === p.user_id).length;
      const losses = matches.filter((m: any) => m.winner_id && m.winner_id !== p.user_id).length;
      
      return {
        ...p,
        wins,
        losses,
        winRate: wins + losses > 0 ? (wins / (wins + losses) * 100) : 0
      };
    }).sort((a: any, b: any) => {
      // Trier par victoires puis par taux de victoires
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    });

    return participants.slice(0, 8).map((p: any, index: number) => {
      const medals = ['🥇', '🥈', '🥉'];
      const medal = index < 3 ? medals[index] : `${index + 1}.`;
      
      return `
        <div class="flex items-center justify-between bg-gray-700 rounded px-4 py-3">
          <div class="flex items-center space-x-3">
            <span class="text-xl">${medal}</span>
            <div>
              <div class="text-white font-medium">${p.alias}</div>
              <div class="text-gray-400 text-xs">${p.username}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-white">${p.wins}V - ${p.losses}D</div>
            <div class="text-gray-400 text-xs">${p.winRate.toFixed(1)}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  private showErrorMessage(message: string): void {
    this.showMessage(message, 'error');
  }

  private showSuccessMessage(message: string): void {
    this.showMessage(message, 'success');
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 3000);
  }

  private async startTournamentMatch(matchId: number, opponentId: number, tournamentId: number): Promise<void> {
    try {
      // Stocker les informations du match dans localStorage pour le retour
      const matchInfo = {
        matchId,
        tournamentId,
        opponentId,
        returnUrl: `/tournament`,
        timestamp: Date.now()
      };
      
      localStorage.setItem('tournament_match_info', JSON.stringify(matchInfo));
      
      // Optionnel: Marquer le match comme "en cours" via API
      // await this.updateMatchStatus(matchId, 'in_progress');
      
      this.showSuccessMessage('Lancement du match...');
      
      // Naviguer vers le jeu avec l'ID de l'adversaire
      // Le routeur va créer : new Game(container, opponentId, 'online')
      router.navigate(`/game/${opponentId}`);
      
    } catch (error) {
      console.error('Erreur lors du lancement du match:', error);
      this.showErrorMessage('Impossible de lancer le match');
    }
  }

  private async updateMatchStatus(matchId: number, status: string): Promise<void> {
    try {
      // Cette méthode pourrait être utilisée pour marquer un match comme "en cours"
      // const response = await this.api.put(`/tournaments/matches/${matchId}/status`, { status });
      console.log(`Match ${matchId} status updated to ${status}`);
    } catch (error) {
      console.error('Erreur mise à jour statut match:', error);
    }
  }
}