import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from './Icon';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACE, elevation, kit } from '../../context/ThemeContext';
import { Text } from './Text';
import { haptics } from '../../lib/haptics';

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<{ show: (message: string, kind?: ToastKind) => void } | null>(null);

const ICON: Record<ToastKind, IconName> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

/** Mount once near the root. Screens call `useToast().show('Visit saved')`. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    if (kind === 'success') haptics.success();
    else if (kind === 'error') haptics.error();
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const tint = toast?.kind === 'error' ? colors.red : toast?.kind === 'success' ? colors.green : colors.primaryDark;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.host, { paddingBottom: insets.bottom + 84 }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.springify().damping(18)}
            exiting={FadeOutDown.duration(160)}
            style={[
              styles.toast,
              {
                backgroundColor: isDark ? colors.surfaceTertiary : colors.textPrimary,
                // Material 3 snackbar shape on Android (4dp, 48dp tall); a pill elsewhere.
                borderRadius: kit().toast.radius,
              },
              kit().toast.minHeight ? { minHeight: kit().toast.minHeight } : null,
              elevation(isDark, 2),
            ]}
            accessibilityLiveRegion="polite"
          >
            <Icon name={ICON[toast.kind]} size={18} color={tint} />
            <Text variant="calloutMedium" style={{ color: isDark ? colors.textPrimary : colors.surface }}>
              {toast.message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Outside a provider (tests), fall back to a no-op so screens never crash.
  return ctx ?? { show: () => {} };
}

export const Toast = ToastProvider;

const styles = StyleSheet.create({
  host: { justifyContent: 'flex-end', alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    maxWidth: '90%',
  },
});
