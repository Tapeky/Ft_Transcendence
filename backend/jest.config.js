module.exports = {
  // Environnement de test
  testEnvironment: 'node',

  // Extensions de fichiers à traiter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Pattern pour trouver les fichiers de test
  testMatch: ['**/__tests__/**/*.(ts|js)', '**/*.(test|spec).(ts|js)'],

  // Configuration pour ts-jest (nouvelle syntaxe)
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Couverture de code
  collectCoverageFrom: ['src/**/*.(ts|js)', '!src/**/*.d.ts', '!src/scripts/**/*', '!src/index.ts'],

  // Répertoires de couverture
  coverageDirectory: 'coverage',

  // Formats de rapport de couverture
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Chemins de modules
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Ignorer node_modules sauf certains packages
  transformIgnorePatterns: ['node_modules/(?!(some-es6-package)/)'],

  // Timeout pour les tests
  testTimeout: 10000,

  // Verbosité
  verbose: true,

  // Clear mocks automatiquement
  clearMocks: true,

  // Restore mocks automatiquement
  restoreMocks: true,
};
