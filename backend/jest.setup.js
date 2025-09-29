// Configuration globale pour Jest
// Ce fichier est exécuté avant chaque fichier de test

// Polyfills pour l'environnement de test
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Configuration des timeouts pour les tests asynchrones
jest.setTimeout(10000);

// Mock global pour WebSocket si nécessaire
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
  }

  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Configuration pour les timers dans les tests
beforeEach(() => {
  jest.clearAllTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// Suppression des logs de console pendant les tests (optionnel)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
