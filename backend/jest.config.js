/** @type {import('jest').Config} */
module.exports = {
  // Look for test files in the __tests__ folder
  testMatch: ['**/__tests__/**/*.test.js'],

  // Use Node environment (not browser)
  testEnvironment: 'node',

  // Run tests serially — required because tests share a DB
  // (--runInBand is also passed via CLI but this makes it explicit)
  maxWorkers: 1,

  // Show individual test names in output
  verbose: true,

  // How long a single test can run before timing out (30 seconds)
  testTimeout: 30000,

  // Coverage settings (used when running npm run test:coverage)
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/generated/**',   // exclude Prisma generated files
    '!src/server.js',      // exclude entry point
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};
