export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  // Campaign III P3: the integration lane needs a real database and has its own
  // config (jest.integration.config.js). Without this, test-backend picks those
  // files up and fails with connection errors that say nothing about the code.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/integration/'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    'utils/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 25,
      statements: 25,
      branches: 15,
      functions: 25,
    },
  },
  setupFiles: ['./__tests__/helpers/setup.js'],
};
