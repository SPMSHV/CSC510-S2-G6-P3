module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: { '^.+\\.(js|jsx)$': 'babel-jest' },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@monaco-editor/react$': '<rootDir>/__mocks__/@monaco-editor/react.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!(axios)/)'],
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/index.js'],
};
