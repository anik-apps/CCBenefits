module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/test/**',
    '!src/types.ts',
    '!src/navigation/**',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 40,
      lines: 50,
    },
  },
};
