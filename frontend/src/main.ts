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