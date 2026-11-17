// Reanimated's JS build checks reduced-motion via matchMedia at import time.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}

// Mock NetInfo (the offline banner in every Header subscribes to it)
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase modules globally
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn((n) => n),
  runTransaction: jest.fn(),
  writeBatch: jest.fn(),
  deleteField: jest.fn(() => '__deleteField__'),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((d) => ({ toDate: () => d, seconds: d.getTime() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('./config/firebase', () => ({
  db: {},
  auth: {},
}));

// Pretend the RNFB native module is linked in the test environment.
// nativeModules.ts's isNativeMonitoringAvailable() checks
// NativeModules.RNFBAppModule directly (see that file for why it doesn't
// just try/catch a require()), so without this, every monitoring call
// would silently no-op in tests and the mocks below would never run.
// Mutating the already-loaded NativeModules object (rather than
// jest.mock('react-native', ...)) avoids re-triggering react-native's own
// module init, which pulls in other TurboModules (e.g. DevMenu) that
// aren't relevant here and aren't otherwise mocked.
require('react-native').NativeModules.RNFBAppModule = {};

// Mock @react-native-firebase native modules — these throw at import/require
// time in a plain jest/node environment since there's no native bridge to
// bind to.
jest.mock('@react-native-firebase/app', () => ({
  app: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(() => Promise.resolve()),
  setUserProperties: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
  setAttribute: jest.fn(),
  recordError: jest.fn(),
}));

jest.mock('@react-native-firebase/perf', () => () => ({
  setPerformanceCollectionEnabled: jest.fn(() => Promise.resolve()),
  startTrace: jest.fn(() =>
    Promise.resolve({
      putAttribute: jest.fn(),
      putMetric: jest.fn(),
      stop: jest.fn(() => Promise.resolve()),
    })
  ),
  newTrace: jest.fn(() => ({
    putAttribute: jest.fn(),
    putMetric: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  Link: ({ children }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
}));

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mock @expo/ui (SwiftUI / Jetpack Compose views have no JS renderer in Jest).
// Each component renders a plain host element named after it (e.g. `ExpoUI.Toggle`)
// that keeps every prop, so tests can assert on props and fire native events:
//   fireEvent(toggle, 'isOnChange', true)       -> props.onIsOnChange(true)
//   fireEvent(picker, 'selectionChange', 'a')   -> props.onSelectionChange('a')
// `Text` renders react-native's Text so getByText still finds labels.
// Modifiers return `{ $type, args }` so tests can check which were applied.
const mockExpoUIHost = (name) => {
  const React = require('react');
  const Component = ({ children, ...props }) => React.createElement(`ExpoUI.${name}`, props, children);
  Component.displayName = `ExpoUI.${name}`;
  return Component;
};
const mockExpoUIModifiers = () =>
  new Proxy(
    { __esModule: true },
    { get: (target, key) => (key in target ? target[key] : (...args) => ({ $type: key, args })) }
  );
jest.mock('@expo/ui/swift-ui', () => {
  const { Text } = require('react-native');
  return {
    Host: mockExpoUIHost('Host'),
    Toggle: mockExpoUIHost('Toggle'),
    Picker: mockExpoUIHost('Picker'),
    Text,
  };
});
jest.mock('@expo/ui/swift-ui/modifiers', () => mockExpoUIModifiers());
jest.mock('@expo/ui/jetpack-compose', () => {
  const { Text } = require('react-native');
  const SegmentedButton = mockExpoUIHost('SegmentedButton');
  SegmentedButton.Label = ({ children }) => children;
  return {
    Host: mockExpoUIHost('Host'),
    Switch: mockExpoUIHost('Switch'),
    SingleChoiceSegmentedButtonRow: mockExpoUIHost('SingleChoiceSegmentedButtonRow'),
    SegmentedButton,
    Text,
  };
});
jest.mock('@expo/ui/jetpack-compose/modifiers', () => mockExpoUIModifiers());


// Silence console.error for known React Native test warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// --- UI kit dependencies (reanimated, gesture handler, safe areas, haptics) ---
require('react-native-gesture-handler/jestSetup');
// SDK 58: reanimated 4.7's own mock boots the worklets runtime and crashes in Jest;
// use a small local mock instead (__mocks__/reanimatedMock.js).
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-reanimated', () => require('./__mocks__/reanimatedMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
