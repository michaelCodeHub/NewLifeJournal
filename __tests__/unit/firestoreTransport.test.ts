/**
 * Firestore transport per platform (config/firebase.ts).
 * iOS / Android force long-polling: React Native buffers the default streaming
 * responses, which left screens loading until another UI event (e.g. back) fired.
 * Web keeps the default transport and its persistent cache.
 */
jest.unmock('../../config/firebase');

const mockInitializeFirestore = jest.fn((_app: unknown, _settings: Record<string, unknown>) => ({}));
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})), getApps: jest.fn(() => []), getApp: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(() => ({})), initializeAuth: jest.fn(() => ({})), connectAuthEmulator: jest.fn() }));
jest.mock('@firebase/auth', () => ({ getReactNativePersistence: jest.fn(() => ({})) }));
jest.mock('firebase/firestore', () => ({
  initializeFirestore: (app: unknown, settings: Record<string, unknown>) => mockInitializeFirestore(app, settings),
  connectFirestoreEmulator: jest.fn(),
  memoryLocalCache: jest.fn(() => ({ kind: 'memory' })),
  persistentLocalCache: jest.fn(() => ({ kind: 'persistent' })),
  persistentMultipleTabManager: jest.fn(() => ({})),
}));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), connectFunctionsEmulator: jest.fn() }));

// Tests have no .env: silence the config's missing-env warning.
beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterAll(() => (console.warn as jest.Mock).mockRestore());

function settingsOn(os: 'ios' | 'android' | 'web') {
  mockInitializeFirestore.mockClear();
  jest.isolateModules(() => {
    const { Platform } = require('react-native');
    const r = jest.replaceProperty(Platform, 'OS', os);
    try {
      require('../../config/firebase');
    } finally {
      r.restore();
    }
  });
  expect(mockInitializeFirestore).toHaveBeenCalledTimes(1);
  return mockInitializeFirestore.mock.calls[0][1];
}

it.each(['ios', 'android'] as const)('%s forces long-polling with the in-memory cache', (os) => {
  expect(settingsOn(os)).toEqual({ localCache: { kind: 'memory' }, experimentalForceLongPolling: true });
});

it('web keeps the default transport and the persistent cache', () => {
  const settings = settingsOn('web');
  expect(settings).toEqual({ localCache: { kind: 'persistent' } });
  expect(settings.experimentalForceLongPolling).toBeUndefined();
});
