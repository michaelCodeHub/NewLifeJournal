import React from 'react';
import { IconButton } from '../ui';
import type { MoreMenuButtonProps } from './MoreMenuButton.types';

export type { MoreMenuButtonProps, ModerationAction } from './MoreMenuButton.types';

/**
 * The post / comment "…" button — web: unchanged. Tapping it reports no action and the
 * caller opens today's options sheet (ModerationSheets' menu step).
 * iOS / Android: MoreMenuButton.ios.tsx / .android.tsx (native anchored menus).
 */
export function MoreMenuButton({ accessibilityLabel, size, iconSize, onSelect }: MoreMenuButtonProps) {
  return (
    <IconButton
      name="ellipsis-horizontal-outline"
      variant="plain"
      size={size}
      iconSize={iconSize}
      color="textMuted"
      onPress={() => onSelect()}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
