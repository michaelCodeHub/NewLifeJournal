import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACE, GUTTER, kit } from '../../context/ThemeContext';
import { Text } from './Text';
import { IconButton } from './IconButton';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Pinned under the content (e.g. a Save button). */
  footer?: React.ReactNode;
  /** Wrap children in a ScrollView. Default true. */
  scroll?: boolean;
  children?: React.ReactNode;
}

const OPEN_SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

/**
 * The one bottom sheet for the whole app.
 *  - Slides up on a spring, fades the backdrop, runs on the UI thread.
 *  - Drag down (or tap the backdrop / Android back) to dismiss.
 *  - Stays mounted until the close animation finishes, so it never just vanishes.
 */
export function Sheet({ visible, onClose, title, subtitle, footer, scroll = true, children }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(screenH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      offset.value = screenH;
      offset.value = withSpring(0, OPEN_SPRING);
      backdrop.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 200 });
      offset.value = withTiming(
        screenH,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    // Test hook only (react-native-gesture-handler/jest-utils): lets tests drive a real drag.
    .withTestId('sheet-drag')
    .activeOffsetY(8)
    .onUpdate((e) => {
      offset.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        offset.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const Body = scroll ? ScrollView : View;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView
          // Android runs edge-to-edge (Expo SDK 58), so the Modal window no longer resizes for the
          // keyboard: pad on Android too, like iOS. Web: no keyboard avoidance (unchanged).
          behavior={Platform.OS === 'ios' || Platform.OS === 'android' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              // Android: with the keyboard up, the sheet shrinks to the space left (header and
              // footer stay visible) and its body scrolls; fields keep their size.
              Platform.OS === 'android' ? ANDROID_SHRINK : null,
              {
                backgroundColor: colors.surface,
                // Material 3 (Android): 28dp top corners. Visual only.
                borderTopLeftRadius: kit().sheet.radius,
                borderTopRightRadius: kit().sheet.radius,
                maxHeight: screenH * 0.9,
                paddingBottom: Math.max(insets.bottom, SPACE.lg),
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.grabArea}>
                <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                {title ? (
                  <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                      <Text variant="title2">{title}</Text>
                      {subtitle ? (
                        <Text variant="footnote" color="textSecondary" style={{ marginTop: 2 }}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <IconButton name="close" onPress={onClose} accessibilityLabel="Close" />
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            <Body
              style={scroll ? [styles.scroll, Platform.OS === 'android' ? ANDROID_SHRINK : null] : undefined}
              contentContainerStyle={scroll ? styles.content : undefined}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {scroll ? children : <View style={styles.content}>{children}</View>}
            </Body>

            {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : 640, // web: match the app column in app/_layout.tsx
    alignSelf: 'center',
  },
  grabArea: { paddingTop: SPACE.sm },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACE.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: GUTTER, paddingBottom: SPACE.lg, gap: SPACE.lg },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});

const ANDROID_SHRINK = { flexShrink: 1 } as const;
