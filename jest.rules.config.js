/**
 * Firestore security-rules tests. Run against the emulator via
 * `npm run test:rules` (firebase emulators:exec sets FIRESTORE_EMULATOR_HOST).
 * Kept separate from jest.config.js so the normal `npx jest` run stays
 * emulator-free.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/rules-tests/**/*.test.ts'],
  testTimeout: 20000,
};
