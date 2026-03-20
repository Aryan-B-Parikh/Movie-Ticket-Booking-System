// Jest configuration for Movie Ticket Booking System backend tests

module.exports = {
  // Test environment - Node.js
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/tests'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude server entry point
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/config/database.js' // Exclude during unit tests (mocked)
  ],

  // Enhanced coverage thresholds for critical components
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Critical booking components must have 100% coverage
    'src/models/Booking.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/controllers/bookingController.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Test timeout - higher for stress tests
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (disabled for stress tests)
  detectOpenHandles: false,

  // Max workers - reduce for stress tests to avoid conflicts
  maxWorkers: '25%',

  // Projects configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
      testTimeout: 5000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 15000
    },
    {
      displayName: 'stress',
      testMatch: ['<rootDir>/tests/stress/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000,
      maxWorkers: 1 // Run stress tests sequentially
    }
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',

  // Test result processor for performance metrics
  testResultsProcessor: '<rootDir>/tests/performance-processor.js'
};
