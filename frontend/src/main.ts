import './index.css';
import { NotFoundPage } from './pages/NotFound';

// Global error handler to prevent crashes from malformed error objects
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes("Cannot read properties of undefined (reading 'logs')")) {
    console.error('Caught global error with logs property access:', event.error.message);
    event.preventDefault();
    return false;
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && event.reason.message && 
      event.reason.message.includes("Cannot read properties of undefined (reading 'logs')")) {
    console.error('Caught unhandled promise rejection with logs property access:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

class App {
  constructor() {
    this.init();
  }

  private init() {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    // Pour Phase 1, on affiche juste la page NotFound
    const notFoundPage = new NotFoundPage();
    root.appendChild(notFoundPage.getElement());
    
    console.log('✅ Vanilla TS App initialized - Phase 1');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});