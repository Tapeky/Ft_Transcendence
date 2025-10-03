import { chatService } from '../../features/friends/services/ChatService';

interface TournamentMatchData {
  tournamentId: number;
  tournamentName: string;
  matchId: string;
  round: number;
  player1: string;
  player2: string;
}

interface TournamentCompletedData {
  tournamentId: number;
  tournamentName: string;
  winnerAlias: string;
}

export class TournamentNotificationManager {
  private static instance: TournamentNotificationManager;
  private notificationContainer: HTMLElement | null = null;

  static getInstance(): TournamentNotificationManager {
    if (!TournamentNotificationManager.instance) {
      TournamentNotificationManager.instance = new TournamentNotificationManager();
    }
    return TournamentNotificationManager.instance;
  }

  initialize(): void {
    this.createNotificationContainer();
    chatService.on('tournament_match_ready', (data: TournamentMatchData) => {
      this.showMatchNotification(data);
    });
    chatService.on('tournament_completed', (data: TournamentCompletedData) => {
      this.showCompletedNotification(data);
    });
  }

  private createNotificationContainer(): void {
    if (this.notificationContainer) return;

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'tournament-notifications';
    this.notificationContainer.className = 'fixed top-4 right-4 z-[9999] space-y-4';
    document.body.appendChild(this.notificationContainer);
  }

  private showMatchNotification(data: TournamentMatchData): void {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className =
      'bg-black/50 backdrop-blur-sm border-white border-2 text-white p-6 rounded-lg shadow-2xl transition-all duration-300 transform translate-x-full opacity-0 w-80';

    notification.innerHTML = `
      <div class="text-center">
        <h3 class="text-xl font-bold font-iceland text-yellow-300 tracking-wider mb-3">NEXT MATCH</h3>
        <p class="text-sm text-blue-300 font-semibold font-iceland mb-3">${data.tournamentName}</p>
        <div class="text-2xl font-bold font-iceland text-white mb-3">
          ${data.player1} <span class="text-blue-300 mx-2">vs</span> ${data.player2}
        </div>
        <div class="flex items-center justify-center gap-2">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <p class="text-xs text-gray-400 font-iceland">Round ${data.round}</p>
        </div>
      </div>
    `;

    this.notificationContainer.appendChild(notification);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
      notification.classList.add('translate-x-0', 'opacity-100');
    });

    // Auto-remove after 6 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        this.removeNotification(notification);
      }
    }, 6000);
  }

  private removeNotification(notification: HTMLElement): void {
    notification.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => notification.remove(), 300);
  }

  private showCompletedNotification(data: TournamentCompletedData): void {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className =
      'bg-black/50 backdrop-blur-sm border-yellow-400 border-2 text-white p-6 rounded-lg shadow-2xl transition-all duration-300 transform translate-x-full opacity-0 w-80';

    notification.innerHTML = `
      <div class="text-center">
        <h3 class="text-xl font-bold font-iceland text-yellow-300 tracking-wider mb-3">TOURNAMENT COMPLETE!</h3>
        <p class="text-sm text-blue-300 font-semibold font-iceland mb-3">${data.tournamentName}</p>
        <div class="text-2xl font-bold font-iceland text-yellow-300 mb-3">
          WINNER
        </div>
        <div class="text-xl font-bold font-iceland text-white mb-3">
          ${data.winnerAlias}
        </div>
        <div class="flex items-center justify-center gap-2">
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <p class="text-xs text-gray-400 font-iceland">Congratulations!</p>
        </div>
      </div>
    `;

    this.notificationContainer.appendChild(notification);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
      notification.classList.add('translate-x-0', 'opacity-100');
    });

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        this.removeNotification(notification);
      }
    }, 8000);
  }

}
