import { chatService } from '../../features/friends/services/ChatService';

interface TournamentMatchData {
  tournamentId: number;
  tournamentName: string;
  matchId: string;
  round: number;
  player1: string;
  player2: string;
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
      this.showNotification(data);
    });
  }

  private createNotificationContainer(): void {
    if (this.notificationContainer) return;

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'tournament-notifications';
    this.notificationContainer.className = 'fixed top-4 right-4 z-[9999] space-y-4';
    document.body.appendChild(this.notificationContainer);
  }

  private showNotification(data: TournamentMatchData): void {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className =
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-2xl border-2 border-white/30 backdrop-blur-sm animate-slide-in-right min-w-[350px] max-w-[400px]';

    notification.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <h3 class="font-bold text-lg font-iceland">NEXT MATCH</h3>
          </div>
          <p class="text-sm opacity-90 mb-2">${data.tournamentName}</p>
          <div class="text-xl font-bold font-iceland">
            ${data.player1} <span class="text-blue-300">vs</span> ${data.player2}
          </div>
          <p class="text-sm opacity-75 mt-1">Round ${data.round}</p>
        </div>
        <button class="text-white/70 hover:text-white ml-4 text-xl">×</button>
      </div>
    `;

    const closeBtn = notification.querySelector('button');
    closeBtn?.addEventListener('click', () => {
      notification.classList.add('animate-slide-out-right');
      setTimeout(() => notification.remove(), 300);
    });

    this.notificationContainer.appendChild(notification);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add('animate-slide-out-right');
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);
  }

}
