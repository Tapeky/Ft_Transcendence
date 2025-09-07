// Ultra Simple Matchmaking Page - UI basique
import { MatchmakingService, MatchmakingStatus, MatchFound } from '../services/MatchmakingService';
import { router } from '../../../core/app/Router';

export class MatchmakingPage {
  private element: HTMLElement;
  private matchmakingService: MatchmakingService;
  private searchButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private statusDiv: HTMLElement;
  private queueInfo: HTMLElement;

  constructor() {
    this.matchmakingService = MatchmakingService.getInstance();
    this.element = this.createElement();
    this.setupEventListeners();
    this.setupMatchmakingCallbacks();
    this.updateUI();
  }

  private createElement(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4';
    
    page.innerHTML = `
      <div class="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">🎯 Matchmaking</h1>
          <p class="text-gray-400">Trouve un adversaire automatiquement</p>
        </div>

        <!-- Status Display -->
        <div id="status" class="mb-6 p-4 rounded-lg bg-gray-700">
          <div class="text-lg font-semibold text-white mb-2">Prêt à jouer</div>
          <div id="queue-info" class="text-sm text-gray-300"></div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-4">
          <button 
            id="search-btn" 
            class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 ease-in-out transform hover:scale-105"
          >
            🚀 Rechercher une partie
          </button>
          
          <button 
            id="cancel-btn" 
            class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 ease-in-out transform hover:scale-105 hidden"
          >
            ❌ Annuler la recherche
          </button>
          
          <button 
            id="back-btn" 
            class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ← Retour au menu
          </button>
        </div>

        <!-- Info -->
        <div class="mt-8 text-xs text-gray-500">
          <p>Système de matchmaking ultra-simple</p>
          <p>Premier arrivé, premier servi ⚡</p>
        </div>
      </div>
    `;

    // Récupérer les références
    this.searchButton = page.querySelector('#search-btn') as HTMLButtonElement;
    this.cancelButton = page.querySelector('#cancel-btn') as HTMLButtonElement;
    this.statusDiv = page.querySelector('#status') as HTMLElement;
    this.queueInfo = page.querySelector('#queue-info') as HTMLElement;

    return page;
  }

  private setupEventListeners(): void {
    // Bouton rechercher
    this.searchButton.addEventListener('click', () => {
      this.matchmakingService.startSearching();
    });

    // Bouton annuler
    this.cancelButton.addEventListener('click', () => {
      this.matchmakingService.stopSearching();
    });

    // Bouton retour
    const backButton = this.element.querySelector('#back-btn') as HTMLButtonElement;
    backButton.addEventListener('click', () => {
      // Arrêter la recherche si en cours
      if (this.matchmakingService.isSearching()) {
        this.matchmakingService.stopSearching();
      }
      router.navigate('/menu');
    });
  }

  private setupMatchmakingCallbacks(): void {
    // Changements de status
    this.matchmakingService.setOnStatusChange((status: MatchmakingStatus) => {
      this.updateStatusDisplay(status);
      this.updateButtons(status);
    });

    // Match trouvé
    this.matchmakingService.setOnMatchFound((match: MatchFound) => {
      this.showMatchFound(match);
      
      // Rediriger vers le jeu après 2 secondes
      setTimeout(() => {
        // Utiliser l'ID de match comme opponent ID pour la compatibilité
        // En réalité, le GameManager devrait être étendu pour gérer les matchs via ID
        router.navigate(`/game/${match.opponent.id}`);
      }, 2000);
    });

    // Erreurs
    this.matchmakingService.setOnError((error: string) => {
      this.showError(error);
    });
  }

  private updateStatusDisplay(status: MatchmakingStatus): void {
    const statusContent = this.statusDiv.querySelector('div:first-child') as HTMLElement;
    
    if (status.isSearching) {
      statusContent.textContent = '🔍 Recherche en cours...';
      statusContent.className = 'text-lg font-semibold text-yellow-400 mb-2 animate-pulse';
      
      if (status.position && status.totalInQueue) {
        this.queueInfo.textContent = `Position ${status.position}/${status.totalInQueue} dans la queue`;
        this.queueInfo.className = 'text-sm text-yellow-300';
      } else {
        this.queueInfo.textContent = 'En attente d\'un adversaire...';
        this.queueInfo.className = 'text-sm text-yellow-300';
      }
    } else {
      statusContent.textContent = 'Prêt à jouer';
      statusContent.className = 'text-lg font-semibold text-white mb-2';
      this.queueInfo.textContent = '';
    }
  }

  private updateButtons(status: MatchmakingStatus): void {
    if (status.isSearching) {
      this.searchButton.classList.add('hidden');
      this.cancelButton.classList.remove('hidden');
    } else {
      this.searchButton.classList.remove('hidden');
      this.cancelButton.classList.add('hidden');
    }
  }

  private showMatchFound(match: MatchFound): void {
    const statusContent = this.statusDiv.querySelector('div:first-child') as HTMLElement;
    statusContent.textContent = '🎮 Match trouvé!';
    statusContent.className = 'text-lg font-semibold text-green-400 mb-2';
    
    this.queueInfo.textContent = `Adversaire: ${match.opponent.username}`;
    this.queueInfo.className = 'text-sm text-green-300';
    
    // Cacher tous les boutons pendant la transition
    this.searchButton.classList.add('hidden');
    this.cancelButton.classList.add('hidden');
  }

  private showError(error: string): void {
    const statusContent = this.statusDiv.querySelector('div:first-child') as HTMLElement;
    statusContent.textContent = '❌ Erreur';
    statusContent.className = 'text-lg font-semibold text-red-400 mb-2';
    
    this.queueInfo.textContent = error;
    this.queueInfo.className = 'text-sm text-red-300';
  }

  private updateUI(): void {
    const currentStatus = this.matchmakingService.getStatus();
    this.updateStatusDisplay(currentStatus);
    this.updateButtons(currentStatus);
  }

  getElement(): HTMLElement {
    return this.element;
  }
}