/**
 * RevenueCat setup (services/subscriptionService.ts):
 *  - placeholder / empty keys never configure RevenueCat;
 *  - our log handler is installed as soon as the library loads, so a native log
 *    event can't hit react-native-purchases' undefined handler (the
 *    "undefined is not a function" uncaught exception after a dev reload).
 */
import { NativeModules } from 'react-native';

const mockConfigure = jest.fn();
const mockSetLogHandler = jest.fn();
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: mockConfigure, setLogHandler: mockSetLogHandler, logIn: jest.fn() },
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

const ORIGINAL_ENV = { ...process.env };

function load() {
  let mod: typeof import('../../services/subscriptionService') = null as never;
  jest.isolateModules(() => {
    mod = require('../../services/subscriptionService');
  });
  return mod;
}

beforeEach(() => {
  mockConfigure.mockClear();
  mockSetLogHandler.mockClear();
  (NativeModules as Record<string, unknown>).RNPurchases = {};
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete (NativeModules as Record<string, unknown>).RNPurchases;
  (console.warn as jest.Mock).mockRestore();
});

describe('isRevenueCatKey', () => {
  const { isRevenueCatKey } = load();
  it('accepts real public SDK keys for the platform', () => {
    expect(isRevenueCatKey('goog_AbC123xyz', 'android')).toBe(true);
    expect(isRevenueCatKey('appl_AbC123xyz', 'ios')).toBe(true);
  });
  it('rejects empty values, the .env.example placeholder and wrong-platform keys', () => {
    expect(isRevenueCatKey(undefined, 'android')).toBe(false);
    expect(isRevenueCatKey('', 'android')).toBe(false);
    expect(isRevenueCatKey('your_revenuecat_android_public_sdk_key', 'android')).toBe(false);
    expect(isRevenueCatKey('your_revenuecat_ios_public_sdk_key', 'ios')).toBe(false);
    expect(isRevenueCatKey('appl_AbC123', 'android')).toBe(false);
    expect(isRevenueCatKey('sk_secret123', 'ios')).toBe(false); // a secret key never belongs in the app
  });
});

describe('initPurchases', () => {
  it('skips RevenueCat with the placeholder key, but still installs the log handler first', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'your_revenuecat_ios_public_sdk_key';
    const { initPurchases } = load();
    await initPurchases('user-1');
    expect(mockSetLogHandler).toHaveBeenCalledTimes(1);
    expect(mockConfigure).not.toHaveBeenCalled();
  });

  it('configures RevenueCat with a real key, after the log handler is in place', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_RealKey123';
    const { initPurchases } = load();
    await initPurchases('user-1');
    expect(mockConfigure).toHaveBeenCalledWith({ apiKey: 'appl_RealKey123', appUserID: 'user-1' });
    expect(mockSetLogHandler.mock.invocationCallOrder[0]).toBeLessThan(mockConfigure.mock.invocationCallOrder[0]);
  });

  it('the installed handler is a real function (native log events have somewhere to go)', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
    const { initPurchases } = load();
    await initPurchases('user-1');
    const handler = mockSetLogHandler.mock.calls[0][0];
    expect(typeof handler).toBe('function');
    expect(() => handler('INFO', 'hello')).not.toThrow();
    expect(() => handler('ERROR', 'Invalid API key')).not.toThrow();
  });
});
