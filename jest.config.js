module.exports = {
  preset: 'jest-expo',
  // Jest matchers (toBeOnTheScreen, toHaveTextContent, …) are built into
  // @testing-library/react-native 14 and register when a test imports it.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // Rules tests need the Firestore emulator: run them with `npm run test:rules`.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/rules-tests/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
