import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Host, Image, Menu } from '@expo/ui/swift-ui';
import { accessibilityLabel as a11yLabel, frame } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '../../context/ThemeContext';
import { moderationItems, type MoreMenuButtonProps } from './MoreMenuButton.types';

export type { MoreMenuButtonProps, ModerationAction } from './MoreMenuButton.types';

/**
 * The post / comment "…" button — iOS: a native SwiftUI Menu anchored to the button.
 * Report / Block (destructive role) for other people's content, Delete for your own.
 * The chosen item goes to onSelect; the caller runs the same next step as before
 * (reason sheet, block confirmation, delete confirmation). iOS 14+.
 */
export function MoreMenuButton({ isOwner, noun, authorName, accessibilityLabel, size, iconSize, onSelect }: MoreMenuButtonProps) {
  const { colors, resolvedTheme } = useTheme();
  const items = moderationItems(isOwner, noun, authorName);
  const modifiers = useMemo(() => [a11yLabel(accessibilityLabel)], [accessibilityLabel]);
  const labelModifiers = useMemo(() => [frame({ width: size, height: size })], [size]);

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Host matchContents colorScheme={resolvedTheme}>
        <Menu
          modifiers={modifiers}
          label={<Image systemName="ellipsis" size={iconSize} color={colors.textMuted} modifiers={labelModifiers} />}
        >
          {items.map((item) => (
            <Button
              key={item.action}
              label={item.label}
              role={item.destructive ? 'destructive' : 'default'}
              onPress={() => onSelect(item.action)}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
