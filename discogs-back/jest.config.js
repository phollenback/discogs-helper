module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.model.ts',
    '!src/services/mysql.connector.ts', // Exclude database connector
    '!src/services/discogs.connector.ts', // Exclude external API connector
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000, // 10 seconds is plenty for unit tests
  forceExit: true, // Force Jest to exit after tests complete (prevents hanging on open handles)
  // Detect open handles to help identify what's keeping Jest alive
  detectOpenHandles: false, // Set to true for debugging, but slows down tests
};



