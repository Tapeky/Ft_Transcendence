import './index.css';
import { application } from './app/Application';

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
      // Initialize the application with all systems
      await application.initialize();
      
      // Initialize dev tools (only in development)
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        const { initUserSwitcher } = await import('./components/dev/UserSwitcher');
        initUserSwitcher();
        console.log('🔧 Dev tools initialized');
      }
      
      // Initialize KISS Game Invite System
      console.log('🎮 Initializing KISS Game Invite System...');
      
      try {
        const { gameInviteService } = await import('./services/GameInviteService');
        const { SimpleInvitePopup } = await import('./components/SimpleInvitePopup');
        const { kissInviteButtons } = await import('./utils/kissInvites');
        
        // Vérification que les services sont correctement chargés
        if (!gameInviteService) {
          throw new Error('GameInviteService not loaded');
        }
        
        // Setup auto-popup pour les invitations reçues
        gameInviteService.onInviteReceived((invite) => {
          console.log('🎮 KISS: Auto-creating popup for invite from', invite.fromUsername);
          new SimpleInvitePopup(invite);
        });
        
        // Initialize auto-detection des boutons d'invitation
        kissInviteButtons.init();
        
        console.log('🎮 KISS Game Invite System initialized');
        
      } catch (error) {
        console.error('❌ Failed to initialize KISS Game Invite System:', error);
        // Ne pas faire planter toute l'application si KISS ne se charge pas
      }
      
      // Success;
      console.log('🛡️ Route guard active');
      console.log(`📍 Current route: ${window.location.pathname}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      
      // Show error page
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});