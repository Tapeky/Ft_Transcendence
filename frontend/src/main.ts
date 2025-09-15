import './index.css';
import { application } from './core/app/Application';

class App {
  constructor() {
    this.init();
  }

  private async init() {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    try {
      await application.initialize();
      
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        const { initUserSwitcher } = await import('./dev/components/UserSwitcher');
        initUserSwitcher();
      }
      
      try {
        const { gameInviteService, SimpleInvitePopup, ConnectionStatus } = await import('./features/invitations');
        
        if (!gameInviteService) {
          throw new Error('GameInviteService not loaded');
        }
        
        gameInviteService.onInviteReceived((invite) => {
          new SimpleInvitePopup(invite);
        });
        
        const connectionStatus = new ConnectionStatus();
        connectionStatus.show();
        
      } catch (error) {
        console.error('Failed to initialize KISS Game Invite System:', error);
      }
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      
      root.innerHTML = `
        <div style="min-height: 100vh; background: linear-gradient(135deg, #ef4444, #dc2626); 
                    display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
          <div style="text-align: center; padding: 40px; background: rgba(0,0,0,0.2); border-radius: 10px;">
            <h1 style="font-size: 3rem; margin-bottom: 20px;">⚠️ Initialization Error</h1>
            <p style="font-size: 1.2rem; margin-bottom: 20px;">Failed to start the application</p>
            <button onclick="window.location.reload()" 
                    style="padding: 10px 20px; font-size: 1rem; background: white; color: #dc2626; 
                           border: none; border-radius: 5px; cursor: pointer;">
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});