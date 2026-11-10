import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useThemedStyles, GUTTER, SPACE } from '../../context/ThemeContext';

/** Pinned action bar for <Screen footer>. Hairline top border, safe-area aware. */
export function FooterBar({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: insets.bottom + SPACE.md }]}>{children}</View>;
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    bar: {
      paddingHorizontal: GUTTER,
      paddingTop: SPACE.md,
      gap: SPACE.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: colors.border,
    },
  });
