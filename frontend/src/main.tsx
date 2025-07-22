import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
