/**
 * Minimal react-native-reanimated mock for Jest (SDK 58).
 * reanimated 4.7's own `react-native-reanimated/mock` boots the worklets
 * runtime and crashes under Jest, so the app's tests use this instead.
 * Animations resolve instantly to their target value; components are plain views.
 */
const React = require('react');
const { View, Text, Image, ScrollView, FlatList } = require('react-native');

const passthrough = (Component) =>
  React.forwardRef((props, ref) => {
    const { entering, exiting, layout, ...rest } = props;
    return React.createElement(Component, { ...rest, ref });
  });

const Animated = {
  View: passthrough(View),
  Text: passthrough(Text),
  Image: passthrough(Image),
  ScrollView: passthrough(ScrollView),
  FlatList: passthrough(FlatList),
  createAnimatedComponent: passthrough,
};

// Layout animation builders: chainable no-ops (FadeIn.duration(200).delay(50)…).
const builder = () => {
  const b = {};
  for (const m of ['duration', 'delay', 'springify', 'damping', 'stiffness', 'mass', 'easing', 'withCallback', 'reduceMotion']) {
    b[m] = () => b;
  }
  return b;
};

const identity = (v) => v;
const Easing = new Proxy({}, { get: () => (...args) => (args.length ? args[0] : identity) });

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: (v) => React.useRef({ value: v }).current,
  useAnimatedStyle: (fn) => fn(),
  useDerivedValue: (fn) => ({ value: fn() }),
  withTiming: (v, _cfg, cb) => (cb && cb(true), v),
  withSpring: (v, _cfg, cb) => (cb && cb(true), v),
  withDelay: (_d, v) => v,
  withSequence: (...vals) => vals[vals.length - 1],
  withRepeat: (v) => v,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  interpolate: (v) => v,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  useReducedMotion: () => false,
  Easing,
  FadeIn: builder(),
  FadeOut: builder(),
  FadeInDown: builder(),
  FadeOutDown: builder(),
  FadeInUp: builder(),
  FadeOutUp: builder(),
};
