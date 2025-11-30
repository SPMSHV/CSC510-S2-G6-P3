// jest.config.mjs
export default {
  testEnvironment: 'node',
  // Keep Jest away from Playwright specs
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/e2e/',   // <-- critical
    
  ],
  testTimeout: 30000,
};
