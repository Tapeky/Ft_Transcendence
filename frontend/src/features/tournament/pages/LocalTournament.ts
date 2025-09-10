import { TournamentStateManager, TournamentSystemState } from '../managers/TournamentStateManager';
import { Tournament, TournamentSize } from '../types/tournament';
import { router } from '../../../core/app/Router';
import { Header } from '../../../shared/components/Header';
import { Banner } from '../../../shared/components/Banner';
import { authManager } from '../../../core/auth/AuthManager';

export class LocalTournament {
  private element: HTMLElement;
  private stateManager: TournamentStateManager;
  private unsubscribe?: () => void;
  private currentState: TournamentSystemState | null = null;
  private header?: Header;
  private banner?: Banner;
  private authUnsubscribe?: () => void;

  constructor() {
    this.element = this.createElement();
    this.stateManager = new TournamentStateManager();
    
    // Set up subscription after element is created
    this.setupStateSubscription();
    this.subscribeToAuth();
    
    // Initialize after everything is set up - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.initialize();
    }, 0);
  }

  private async initialize(): Promise<void> {
    try {
      await this.stateManager.initialize();
      
      // Check for tournament match result from game
      this.checkForTournamentResult();
    } catch (error) {
      console.error('Failed to initialize tournament system:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to initialize tournament system');
    }
  }

  private async checkForTournamentResult(): Promise<void> {
    const tournamentResultJson = sessionStorage.getItem('tournamentMatchResult');
    if (tournamentResultJson) {
      try {
        const result = JSON.parse(tournamentResultJson);
        console.log('🔧 Tournament result from sessionStorage:', result);
        sessionStorage.removeItem('tournamentMatchResult'); // Clear after reading
        
        // Load tournament if not already loaded
        if (!this.currentState?.tournament) {
          await this.stateManager.loadTournament(result.tournamentId);
        }

        // Submit the match result directly to the service
        const matchResult = {
          matchId: result.matchId,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
          winnerAlias: result.winnerAlias
        };

        console.log('🔧 Sending match result to API:', { tournamentId: result.tournamentId, matchResult });

        // Import TournamentService dynamically to avoid circular imports
        const { TournamentService } = await import('../services/TournamentService');
        await TournamentService.submitMatchResult(result.tournamentId, matchResult);
        
        // Refresh tournament state to get updated bracket
        await this.stateManager.refreshTournamentState();
      } catch (error) {
        console.error('Failed to process tournament result:', error);
        this.showError('Failed to process match result');
      }
    }
  }

  private setupStateSubscription(): void {
    this.unsubscribe = this.stateManager.subscribe((state) => {
      this.currentState = state;
      this.updateView(state);
    });
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

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none';

    this.header = new Header(true); // userVisible = true
    this.banner = new Banner();

    // Main content area
    const mainContent = document.createElement('div');
    mainContent.className = 'tournament-main flex-grow bg-gradient-to-r from-blue-800 to-red-700';
    mainContent.id = 'tournament-content-wrapper';

    mainContent.innerHTML = `
      <div class="p-8 max-w-6xl mx-auto">
        <!-- Page Header -->
        <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 class="text-5xl font-bold text-white text-shadow-lg">🏆 Local Tournament</h1>
            <p class="text-white/80 mt-2 text-xl">Compete in single-elimination tournaments</p>
          </div>
          <div class="flex gap-3">
            <button 
              id="history-button" 
              class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-white transition duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              📊 Historique
            </button>
            <button 
              id="back-button" 
              class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg border-2 border-white transition duration-300 transform hover:scale-105"
            >
              ← Retour au menu
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="hidden">
          <div class="flex items-center justify-center min-h-[400px] text-white">
            <div class="text-center bg-white/10 rounded-2xl p-12 backdrop-blur-sm border border-white/20">
              <div class="loading-spinner border-4 border-white/30 border-t-white rounded-full w-12 h-12 animate-spin mx-auto"></div>
              <p class="mt-5 text-xl text-white/80">Chargement...</p>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div id="error-state" class="hidden">
          <div class="bg-red-600/20 border border-red-400 rounded-2xl p-6 mb-6 backdrop-blur-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-red-300 text-lg font-semibold">❌ Erreur</h3>
                <p id="error-message" class="text-red-200 mt-2"></p>
              </div>
              <button id="clear-error" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition duration-300 transform hover:scale-105">
                Effacer
              </button>
            </div>
          </div>
        </div>

        <!-- Tournament Content -->
        <div id="tournament-content">
          <!-- Content will be dynamically updated based on state -->
        </div>
      </div>
    `;

    // Assemble the page (matching Menu.ts structure)
    container.appendChild(this.header.getElement());
    container.appendChild(this.banner.getElement());
    container.appendChild(mainContent);

    // Defer event binding to ensure DOM is ready
    setTimeout(() => {
      this.bindEvents();
    }, 0);
    
    return container;
  }

  private bindEvents(): void {
    if (!this.element) {
      console.warn('LocalTournament: Element not ready for event binding, retrying...');
      // Retry after a short delay
      setTimeout(() => {
        this.bindEvents();
      }, 100);
      return;
    }

    // Use event delegation for buttons to ensure it works even if DOM changes
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'back-button' || target.closest('#back-button')) {
        e.preventDefault();
        console.log('Back button clicked - navigating to /menu');
        router.navigate('/menu');
      } else if (target.id === 'history-button' || target.closest('#history-button')) {
        e.preventDefault();
        console.log('History button clicked - navigating to /tournament-history');
        router.navigate('/tournament-history');
      }
    });

    // Also try direct binding for immediate availability
    const backButton = this.element.querySelector('#back-button');
    if (backButton) {
      console.log('Back button found and ready for clicks');
    } else {
      console.warn('Back button not found in DOM during initial binding');
    }

    // Clear error button
    const clearErrorButton = this.element.querySelector('#clear-error');
    if (clearErrorButton) {
      clearErrorButton.addEventListener('click', () => {
        this.stateManager.clearErrors();
      });
    }
  }

  private updateView(state: TournamentSystemState): void {
    // Guard against early calls before element is ready
    if (!this.element) return;
    
    this.updateLoadingState(state.ui.isLoading);
    this.updateErrorState(state.ui.error || state.system.lastError);
    this.updateContent(state);
  }

  private updateLoadingState(isLoading: boolean): void {
    if (!this.element) return;
    
    const loadingElement = this.element.querySelector('#loading-state');
    if (loadingElement) {
      loadingElement.classList.toggle('hidden', !isLoading);
    }
  }

  private updateErrorState(error: string | null): void {
    if (!this.element) return;
    
    const errorElement = this.element.querySelector('#error-state');
    const errorMessageElement = this.element.querySelector('#error-message');
    
    if (errorElement && errorMessageElement) {
      if (error) {
        errorMessageElement.textContent = error;
        errorElement.classList.remove('hidden');
      } else {
        errorElement.classList.add('hidden');
      }
    }
  }

  private updateContent(state: TournamentSystemState): void {
    if (!this.element) return;
    
    const contentElement = this.element.querySelector('#tournament-content');
    if (!contentElement) return;

    // Don't update content while loading
    if (state.ui.isLoading) {
      return;
    }

    switch (state.ui.currentView) {
      case 'lobby':
        this.renderLobbyView(contentElement);
        break;
      case 'registration':
        this.renderRegistrationView(contentElement, state);
        break;
      case 'bracket':
        this.renderBracketView(contentElement, state);
        break;
      case 'game':
        this.renderGameView(contentElement, state);
        break;
      case 'results':
        this.renderResultsView(contentElement, state);
        break;
      default:
        this.renderLobbyView(contentElement);
    }
  }

  private renderLobbyView(container: Element): void {
    container.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <!-- Local Tournament Setup -->
        <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h2 class="text-3xl font-bold mb-6 text-center text-blue-400">Local Tournament Setup</h2>
          <form id="local-tournament-form">
            <div class="space-y-6">
              <!-- Tournament Info -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Tournament Name</label>
                  <input 
                    type="text" 
                    id="tournament-name" 
                    class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Tournament name"
                    required
                    maxlength="50"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Players</label>
                  <select 
                    id="max-players" 
                    class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="4">4 Players</option>
                    <option value="8" selected>8 Players</option>
                    <option value="16">16 Players</option>
                  </select>
                </div>
              </div>

              <!-- Players Section -->
              <div>
                <label class="block text-sm font-medium mb-4">Player Names</label>
                <div id="players-container" class="grid grid-cols-2 gap-3">
                  <!-- Player inputs will be generated dynamically -->
                </div>
              </div>

              <button 
                type="submit" 
                class="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-lg transition-colors"
              >
                �️ Create Tournament
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.generatePlayerInputs(8); // Default 8 players
    this.bindLobbyEvents();
  }

  private generatePlayerInputs(playerCount: number): void {
    if (!this.element) return;
    
    const container = this.element.querySelector('#players-container');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
      const playerInput = document.createElement('div');
      playerInput.innerHTML = `
        <input 
          type="text" 
          id="player-${i}" 
          placeholder="Player ${i}"
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          required
          maxlength="20"
        />
      `;
      container.appendChild(playerInput);
    }
  }

  private bindLobbyEvents(): void {
    if (!this.element) {
      console.warn('LocalTournament: Attempting to bind lobby events before element is ready');
      return;
    }

    // Player count change handler
    const playersSelect = this.element.querySelector('#max-players') as HTMLSelectElement;
    if (playersSelect) {
      playersSelect.addEventListener('change', () => {
        const playerCount = parseInt(playersSelect.value);
        this.generatePlayerInputs(playerCount);
      });
    }

    // Local tournament form submission
    const localForm = this.element.querySelector('#local-tournament-form');
    if (localForm) {
      localForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = this.element.querySelector('#tournament-name') as HTMLInputElement;
        const playersSelect = this.element.querySelector('#max-players') as HTMLSelectElement;
        
        if (!nameInput || !playersSelect) {
          console.error('Form elements not found');
          return;
        }

        const name = nameInput.value.trim();
        const maxPlayers = parseInt(playersSelect.value);

        // Collect all player names
        const players: string[] = [];
        for (let i = 1; i <= maxPlayers; i++) {
          const playerInput = this.element.querySelector(`#player-${i}`) as HTMLInputElement;
          if (!playerInput) {
            console.error(`Player ${i} input not found`);
            return;
          }
          const playerName = playerInput.value.trim();
          if (!playerName) {
            alert(`Please enter a name for Player ${i}`);
            return;
          }
          players.push(playerName);
        }

        // Check for duplicate names
        const uniqueNames = new Set(players);
        if (uniqueNames.size !== players.length) {
          alert('Player names must be unique');
          return;
        }

        if (name && [4, 8, 16].includes(maxPlayers)) {
          try {
            await this.createLocalTournament(name, maxPlayers as TournamentSize, players);
          } catch (error) {
            console.error('Failed to create tournament:', error);
          }
        }
      });
    }
  }

  /**
   * Create a local tournament with the specified players.
   * Note: This only creates and registers players, it does not start the tournament.
   * User must manually start the tournament using the "Start Tournament" button in the registration view.
   */
  private async createLocalTournament(name: string, maxPlayers: TournamentSize, players: string[]): Promise<void> {
    try {
      // Create the tournament
      await this.stateManager.createTournament(name, maxPlayers);
      
      // Add all players to the tournament
      for (const playerName of players) {
        await this.stateManager.joinTournament(this.currentState?.tournament?.id || '', playerName);
      }
      
      // Wait a bit for state synchronization, then verify tournament is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify tournament is ready before starting
      const tournamentId = this.currentState?.tournament?.id;
      if (!tournamentId) {
        throw new Error('Tournament ID not available');
      }
      
      // Refresh tournament state to ensure we have the latest status
      await this.stateManager.refreshTournamentState();
      
      const currentTournament = this.stateManager.getCurrentTournament();
      console.log('Tournament status before start:', currentTournament?.status);
      
      if (!currentTournament || (
        currentTournament.status !== 'ready' && 
        currentTournament.status !== 'in_progress' && 
        currentTournament.status !== 'running'
      )) {
        throw new Error(`Tournament cannot be started. Current status: ${currentTournament?.status || 'unknown'}`);
      }
      
      // Tournament created successfully - let user manually start it via the registration view
      // await this.stateManager.startTournament(); // Removed: prevents double start attempts
      
      console.log('Tournament created successfully. Navigate to registration view to start.');
      
    } catch (error) {
      console.error('Failed to start local tournament:', error);
      this.showError('Failed to create tournament. Please try again.');
    }
  }

  private renderRegistrationView(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    if (!tournament) return;

    const progress = state.registration.tournament ? 
      Math.round((state.registration.tournament.currentPlayers / state.registration.tournament.maxPlayers) * 100) : 0;

    container.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold mb-2">${tournament.name}</h2>
            <p class="text-gray-400">Tournament Registration</p>
            <div class="mt-4">
              <div class="text-sm text-gray-400 mb-2">Tournament ID: 
                <span class="text-blue-400 font-mono">${tournament.id}</span>
                <button id="copy-id" class="ml-2 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">Copy</button>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mb-8">
            <div class="flex justify-between text-sm mb-2">
              <span>Players Registered</span>
              <span>${tournament.currentPlayers}/${tournament.maxPlayers}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-3">
              <div class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500" 
                   style="width: ${progress}%"></div>
            </div>
          </div>

          <!-- Players List -->
          <div class="mb-8">
            <h3 class="text-xl font-semibold mb-4">Registered Players</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              ${tournament.players.map((player, index) => `
                <div class="bg-gray-700 rounded-lg p-3 text-center">
                  <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold">
                    ${index + 1}
                  </div>
                  <div class="text-sm font-medium">${player.alias}</div>
                </div>
              `).join('')}
              ${Array.from({ length: tournament.maxPlayers - tournament.currentPlayers }, (_, index) => `
                <div class="bg-gray-700/50 rounded-lg p-3 text-center border-2 border-dashed border-gray-600">
                  <div class="w-8 h-8 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-400">
                    ${tournament.currentPlayers + index + 1}
                  </div>
                  <div class="text-sm text-gray-400">Waiting...</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4">
            ${tournament.status === 'ready' ? `
              <div class="flex-1">
                <div class="mb-3 text-center text-green-400 text-sm">
                  ✅ Tournament ready! Click to start the bracket and begin matches.
                </div>
                <button id="start-tournament" class="w-full px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors">
                  🏆 Start Tournament
                </button>
              </div>
            ` : `
              <div class="flex-1 px-6 py-3 bg-gray-600 rounded-lg font-medium text-center text-gray-300">
                Waiting for ${tournament.maxPlayers - tournament.currentPlayers} more players
              </div>
            `}
            <button id="refresh-tournament" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindRegistrationEvents();
  }

  private bindRegistrationEvents(): void {
    if (!this.element) {
      console.warn('LocalTournament: Attempting to bind registration events before element is ready');
      return;
    }

    // Copy tournament ID
    const copyButton = this.element.querySelector('#copy-id');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        const tournamentId = this.currentState?.tournament?.id;
        if (tournamentId) {
          navigator.clipboard.writeText(tournamentId).then(() => {
            // Show copied feedback
            const button = copyButton as HTMLButtonElement;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('bg-green-600');
            setTimeout(() => {
              button.textContent = originalText;
              button.classList.remove('bg-green-600');
            }, 2000);
          });
        }
      });
    }

    // Start tournament
    const startButton = this.element.querySelector('#start-tournament');
    if (startButton) {
      startButton.addEventListener('click', async () => {
        try {
          // Refresh tournament state to ensure we have the latest status
          await this.stateManager.refreshTournamentState();
          
          const currentTournament = this.stateManager.getCurrentTournament();
          console.log('Tournament status before start (registration view):', currentTournament?.status);
          
          if (!currentTournament || (
            currentTournament.status !== 'ready' && 
            currentTournament.status !== 'in_progress' && 
            currentTournament.status !== 'running'
          )) {
            throw new Error(`Tournament cannot be started. Current status: ${currentTournament?.status || 'unknown'}`);
          }
          
          await this.stateManager.startTournament();
        } catch (error) {
          console.error('Failed to start tournament:', error);
          this.showError('Failed to start tournament. Please ensure all players have joined.');
        }
      });
    }

    // Refresh tournament
    const refreshButton = this.element.querySelector('#refresh-tournament');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        try {
          await this.stateManager.refreshTournament();
        } catch (error) {
          console.error('Failed to refresh tournament:', error);
        }
      });
    }
  }

  private renderBracketView(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    console.log('renderBracketView called:', {
      tournament: !!tournament,
      bracket: !!tournament?.bracket,
      status: tournament?.status,
      currentView: state.ui.currentView
    });
    
    if (!tournament) {
      container.innerHTML = '<div class="text-center text-gray-400">No tournament loaded</div>';
      return;
    }
    
    if (!tournament.bracket) {
      container.innerHTML = `
        <div class="text-center">
          <h2 class="text-3xl font-bold mb-2">${tournament.name}</h2>
          <p class="text-gray-400 mb-4">Tournament Status: ${tournament.status}</p>
          <div class="bg-yellow-600/20 border border-yellow-600 rounded-lg p-4">
            <p class="text-yellow-400">Bracket not yet generated. Tournament may still be initializing...</p>
            <button id="refresh-bracket" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
              Refresh Bracket
            </button>
          </div>
        </div>
      `;
      this.bindBracketEvents();
      return;
    }

    container.innerHTML = `
      <div>
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold mb-2">${tournament.name}</h2>
          <p class="text-gray-400">Tournament Bracket</p>
        </div>

        <!-- Tournament Progress -->
        <div class="bg-gray-800 rounded-xl p-6 mb-8">
          <div class="text-center mb-4">
            <div class="text-2xl font-bold text-blue-400">Round ${tournament.bracket.currentRound}</div>
          </div>
          <div class="text-center">
            ${tournament.status === 'in_progress' || tournament.status === 'running' ? `
              <button id="start-next-match" class="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-xl transition-colors">
                Start Next Match
              </button>
            ` : tournament.status === 'completed' ? `
              <div class="text-2xl font-bold text-gold-400">🏆 Tournament Complete! 🏆</div>
            ` : ''}
          </div>
        </div>

        <!-- Bracket Display -->
        <div class="bg-gray-800 rounded-xl p-6">
          <div id="bracket-display" class="overflow-x-auto">
            <!-- Bracket will be rendered here -->
          </div>
        </div>
      </div>
    `;

    this.renderBracket(tournament.bracket);
    this.bindBracketEvents();
  }

  private renderBracket(bracket: any): void {
    const bracketContainer = this.element.querySelector('#bracket-display');
    if (!bracketContainer) return;

    // 🔧 DEBUG: Log bracket data to see undefined aliases
    console.log('🔧 Rendering bracket:', JSON.stringify(bracket, null, 2));

    // Simple bracket rendering - could be enhanced with better visuals
    const bracketHTML = bracket.rounds.map((round: any, roundIndex: number) => `
      <div class="bracket-round mb-8">
        <h3 class="text-xl font-bold mb-4 text-center">Round ${roundIndex + 1}</h3>
        <div class="grid gap-4 ${round.length <= 2 ? 'max-w-md mx-auto' : ''}">
          ${round.map((match: any) => `
            <div class="match bg-gray-700 rounded-lg p-4 ${match.status === 'in_progress' ? 'border-2 border-blue-500' : ''}">
              <div class="flex justify-between items-center">
                <div class="flex-1">
                  <div class="player ${match.winnerAlias === match.player1Alias ? 'text-green-400 font-bold' : ''}">
                    ${match.player1Alias || 'Player 1'} <span class="float-right">${match.player1Score || 0}</span>
                  </div>
                  <div class="player ${match.winnerAlias === match.player2Alias ? 'text-green-400 font-bold' : ''}">
                    ${match.player2Alias || 'Player 2'} <span class="float-right">${match.player2Score || 0}</span>
                  </div>
                </div>
                <div class="ml-4 text-sm">
                  ${match.status === 'completed' ? '✓' : 
                    match.status === 'in_progress' ? '▶' : 
                    match.player1Alias !== 'TBD' && match.player2Alias !== 'TBD' ? '⏳' : '⏸'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    bracketContainer.innerHTML = bracketHTML;
  }

  private bindBracketEvents(): void {
    if (!this.element) {
      console.warn('LocalTournament: Attempting to bind bracket events before element is ready');
      return;
    }

    const startMatchButton = this.element.querySelector('#start-next-match');
    if (startMatchButton) {
      startMatchButton.addEventListener('click', async () => {
        try {
          await this.stateManager.startNextMatch();
        } catch (error) {
          console.error('Failed to start next match:', error);
        }
      });
    }

    // Refresh bracket button
    const refreshButton = this.element.querySelector('#refresh-bracket');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        try {
          await this.stateManager.refreshTournamentState();
        } catch (error) {
          console.error('Failed to refresh bracket:', error);
          this.showError('Failed to refresh bracket');
        }
      });
    }
  }

  private renderGameView(container: Element, state: TournamentSystemState): void {
    const matchOrchestrator = this.stateManager.getMatchOrchestrator();
    const matchInfo = matchOrchestrator?.getCurrentMatchInfo();
    
    if (!matchInfo) return;

    container.innerHTML = `
      <div class="text-center">
        <h2 class="text-4xl font-bold mb-8">${matchInfo.roundName}</h2>
        <div class="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
          <div class="text-2xl font-bold mb-8">
            ${matchInfo.player1Alias} <span class="text-gray-400">vs</span> ${matchInfo.player2Alias}
          </div>
          
          <div class="mb-8">
            <p class="text-gray-400 mb-4">Match will start automatically...</p>
            <div class="animate-pulse text-6xl">⚡</div>
          </div>

          <div class="text-sm text-gray-400">
            Match ${matchInfo.matchNumber} • Round ${matchInfo.round}
          </div>
        </div>
      </div>
    `;

    // Auto-redirect to game after a short delay
    setTimeout(() => {
      this.redirectToGame(state);
    }, 3000);
  }

  private renderResultsView(container: Element, state: TournamentSystemState): void {
    const tournament = state.tournament;
    if (!tournament) return;

    const winner = tournament.winnerAlias;
    const stats = this.stateManager.getTournamentStatistics();

    container.innerHTML = `
      <div class="text-center max-w-2xl mx-auto">
        <div class="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl p-8 mb-8">
          <div class="text-6xl mb-4">🏆</div>
          <h2 class="text-4xl font-bold text-black mb-2">Tournament Complete!</h2>
          <div class="text-2xl text-black font-semibold">Winner: ${winner}</div>
        </div>

        <div class="bg-gray-800 rounded-xl p-8">
          <h3 class="text-2xl font-bold mb-6">Tournament Statistics</h3>
          <div class="grid grid-cols-2 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-400">${stats?.totalPlayers || 0}</div>
              <div class="text-sm text-gray-400">Total Players</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400">${stats?.completedMatches || 0}</div>
              <div class="text-sm text-gray-400">Matches Played</div>
            </div>
          </div>
        </div>

        <div class="mt-8">
          <button id="new-tournament" class="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors mr-4">
            New Tournament
          </button>
          <button id="view-bracket" class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">
            View Bracket
          </button>
        </div>
      </div>
    `;

    this.bindResultsEvents();
  }

  private bindResultsEvents(): void {
    if (!this.element) {
      console.warn('LocalTournament: Attempting to bind results events before element is ready');
      return;
    }

    const newTournamentButton = this.element.querySelector('#new-tournament');
    if (newTournamentButton) {
      newTournamentButton.addEventListener('click', () => {
        this.stateManager.reset();
        this.stateManager.navigateToView('lobby');
      });
    }

    const viewBracketButton = this.element.querySelector('#view-bracket');
    if (viewBracketButton) {
      viewBracketButton.addEventListener('click', () => {
        this.stateManager.navigateToView('bracket');
      });
    }
  }

  private redirectToGame(state: TournamentSystemState): void {
    const matchOrchestrator = this.stateManager.getMatchOrchestrator();
    const gameContext = matchOrchestrator?.getCurrentGameContext();
    
    if (gameContext) {
      // Navigate to game with tournament context
      const contextParam = encodeURIComponent(JSON.stringify(gameContext));
      console.log('🚀 Redirecting to game with context:', gameContext);
      // Force page reload instead of SPA navigation to fix HTTPS routing issue
      window.location.href = `/game/tournament?tournamentContext=${contextParam}`;
    }
  }

  private showError(message: string): void {
    this.updateErrorState(message);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.element.remove();
  }
}