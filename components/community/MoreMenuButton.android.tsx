import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DropdownMenu, DropdownMenuItem, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../context/ThemeContext';
import { IconButton } from '../ui';
import { moderationItems, type MoreMenuButtonProps } from './MoreMenuButton.types';

export type { MoreMenuButtonProps, ModerationAction } from './MoreMenuButton.types';

/**
 * The post / comment "…" button — Android: the same icon button, opening a Material 3
 * DropdownMenu anchored to it. Report / Block (in the error colour, destructive) for
 * other people's content, Delete for your own. The chosen item goes to onSelect.
 */
export function MoreMenuButton({ isOwner, noun, authorName, accessibilityLabel, size, iconSize, onSelect }: MoreMenuButtonProps) {
  const { colors, resolvedTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const items = moderationItems(isOwner, noun, authorName);
  const anchorModifiers = useMemo(() => [fillMaxSize()], []);

  return (
    <View>
      <IconButton
        name="ellipsis-horizontal-outline"
        variant="plain"
        size={size}
        iconSize={iconSize}
        color="textMuted"
        onPress={() => setExpanded(true)}
        accessibilityLabel={accessibilityLabel}
      />
      {/* Anchor over the button, never takes touches. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Host colorScheme={resolvedTheme} style={StyleSheet.absoluteFill}>
          <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)} color={colors.surface} modifiers={anchorModifiers}>
            <DropdownMenu.Items>
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.action}
                  elementColors={{ textColor: item.destructive ? colors.red : colors.textPrimary }}
                  onClick={() => {
                    setExpanded(false);
                    onSelect(item.action);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text>{item.label}</Text>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenu.Items>
          </DropdownMenu>
        </Host>
      </View>
    </View>
  );
}
