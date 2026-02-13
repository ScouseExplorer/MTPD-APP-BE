export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  testTimeout: 10000,
  globals: {
    'NODE_ENV': 'test'
  }
};
