import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, GUTTER, RADIUS, SPACE } from '../../context/ThemeContext';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { EmptyState } from './Surfaces';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from './Icon';
import { BrandMark, BrandWordmark } from './Brand';

/** Every tab root shares this exact top bar height, so switching tabs never moves the top of the screen. */
export const TAB_HEADER_HEIGHT = 64;

/**
 * Header icon button, Linear-style: a plain line icon with no fill or border.
 * A soft rounded square appears only while pressed. Used for back, add, bell,
 * calendar… on every header, so they all line up with the title.
 */
export function HeaderAction({
  name,
  onPress,
  accessibilityLabel,
  muted = true,
}: {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** Secondary colour (default). Back uses the primary text colour. */
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.action, pressed ? { backgroundColor: colors.surfaceSecondary } : null]}
    >
      <Icon name={name} size={20} color={muted ? colors.textSecondary : colors.textPrimary} />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- Header */

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Large = tab root (big title). Bar = pushed screen (back button + compact title). */
  variant?: 'large' | 'bar';
  right?: React.ReactNode;
  /** Large variant only: small line above the title. */
  eyebrow?: string;
  /** Large variant only: show the Bloom & Bump logo instead of the title text (Home). */
  brand?: boolean;
  onBack?: () => void;
  /** Bar variant: hide the back button (first screen of a flow, nothing to go back to). */
  hideBack?: boolean;
}

export function Header({ title, variant = 'large', right, eyebrow, brand, onBack, hideBack }: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (variant === 'bar') {
    const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(pregnancy)/(tabs)/home')));
    // Inner page: round back button, title left-aligned beside it, round actions
    // right. No divider: same calm, open look as the tab headers.
    return (
      <View style={{ paddingTop: Math.max(insets.top, Platform.OS === 'web' ? SPACE.md : 0), backgroundColor: colors.background }}>
        <View style={styles.bar}>
          {hideBack ? null : (
            <View style={styles.back}>
              <HeaderAction name="chevron-back" onPress={back} accessibilityLabel="Back" muted={false} />
            </View>
          )}
          <Text variant="title2" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
            {title}
          </Text>
          {right ? <View style={styles.largeRight}>{right}</View> : null}
        </View>
      </View>
    );
  }

  // Tab root: one fixed block, same height on every tab, titles on a shared baseline.
  // Bold title left, optional small eyebrow above it, round actions right.
  return (
    <View style={{ paddingTop: Math.max(insets.top, Platform.OS === 'web' ? SPACE.md : 0), backgroundColor: colors.background }}>
      <View style={styles.large}>
        {brand ? (
          <View style={styles.brand} accessibilityRole="header" accessibilityLabel={title}>
            <BrandMark height={30} />
            <BrandWordmark height={21} />
          </View>
        ) : (
        <View style={{ flex: 1 }}>
          {eyebrow ? (
            <Text variant="footnote" color="textMuted" numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="largeTitle" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
        )}
        {right ? <View style={styles.largeRight}>{right}</View> : null}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- Screen */

/**
 * Fades the body in once, when the screen first mounts (a soft rise, 220 ms).
 * Screens show <ScreenState loading /> until their data is ready, so this turns
 * "loading -> content" into a gentle reveal instead of a hard pop. It never
 * replays on data updates, and is off when the OS asks for reduced motion.
 */
function useFirstReveal(enabled: boolean) {
  const reduce = useReducedMotion();
  const animate = enabled && !reduce;
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 6 }] }));
}

export interface ScreenProps {
  header?: HeaderProps | null;
  /** Scrollable body (default). Pass false for screens that manage their own list. */
  scroll?: boolean;
  /** Padding and gap for the body. */
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Fixed element under the scroll area (e.g. a composer or save bar). */
  footer?: React.ReactNode;
  scrollProps?: ScrollViewProps;
  children?: React.ReactNode;
}

/**
 * Standard screen scaffold: themed canvas, safe areas, consistent gutters and
 * vertical rhythm. Tab screens use the large header; pushed screens use `bar`.
 */
export function Screen({ header, scroll = true, contentStyle, refreshing, onRefresh, footer, scrollProps, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isBar = header?.variant === 'bar';
  // Pushed screens already slide in; only tab roots and other un-barred screens fade.
  const reveal = useFirstReveal(!isBar);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {header ? <Header {...header} /> : null}
      {scroll ? (
        <Animated.ScrollView
          {...scrollProps}
          style={[{ flex: 1 }, reveal]}
          contentContainerStyle={[
            styles.body,
            { paddingTop: header && !isBar ? SPACE.sm : 0, paddingBottom: (isBar ? insets.bottom : 0) + SPACE.xxxl },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
            ) : undefined
          }
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <Animated.View style={[{ flex: 1 }, reveal]}>{children}</Animated.View>
      )}
      {footer}
    </View>
  );
}

/** Full-screen loading / no-pregnancy / error state, sharing the same canvas. */
export function ScreenState({
  loading,
  title,
  body,
  icon = 'alert-circle-outline',
  action,
}: {
  loading?: boolean;
  title?: string;
  body?: string;
  icon?: React.ComponentProps<typeof EmptyState>['icon'];
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator testID="screen-loading" color={colors.textMuted} />
      ) : (
        <EmptyState icon={icon} title={title ?? 'Something went wrong'} body={body} action={action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: GUTTER, gap: SPACE.xxl },
  large: {
    height: TAB_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACE.md,
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.sm,
  },
  // Icons sit on the title's centre line; the last one's glyph lines up with the gutter.
  largeRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs, marginRight: -6 },
  action: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: GUTTER,
  },
  // Pull the back icon's padding back so the chevron sits on the gutter line.
  back: { marginLeft: -8 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingBottom: 2 },
});
