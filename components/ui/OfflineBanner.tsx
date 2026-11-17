import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Icon } from './Icon';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { subscribeToConnectionStatus, ConnectionStatus } from '../../services/offlineService';
import { Theme, useTheme, useThemedStyles, GUTTER, SPACE } from '../../context/ThemeContext';
import { Text } from './Text';

/**
 * Slim orange-tinted strip shown while the device is offline (PRD F36).
 * Rendered by Header, directly under every screen's title bar, so it sits
 * below the safe area and never covers a back button.
 */
export default function OfflineBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [status, setStatus] = useState<ConnectionStatus>('unknown');

  useEffect(() => subscribeToConnectionStatus(setStatus), []);

  if (status !== 'offline') return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name="cloud-offline-outline" size={15} color={colors.orange} />
      <Text variant="caption" color="orange" numberOfLines={1} style={{ flexShrink: 1 }}>
        You&apos;re offline. Showing saved data.
      </Text>
    </Animated.View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACE.sm,
      paddingVertical: SPACE.sm - 2,
      paddingHorizontal: GUTTER,
      backgroundColor: colors.orangeTint,
      borderBottomWidth: StyleSheet.hairlineWidth * 2,
      borderBottomColor: colors.border,
    },
  });
