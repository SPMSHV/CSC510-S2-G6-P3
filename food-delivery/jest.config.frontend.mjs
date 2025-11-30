// jest.config.frontend.mjs
export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/frontend/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.frontend.js'],
  testTimeout: 15000,

  // Coverage focused on your browser JS
  collectCoverage: false,
  //collectCoverageFrom: ['public/js/**/*.js'],
  //coveragePathIgnorePatterns: ['/node_modules/', 'public/js/vendor'],
  //coverageProvider: 'v8',                 // <- optional, explicit
  //overageReporters: ['text', 'lcov'],  
};
