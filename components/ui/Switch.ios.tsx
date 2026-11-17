import React, { useMemo } from 'react';
import { Host, Toggle } from '@expo/ui/swift-ui';
import { disabled as disabledModifier, labelsHidden, tint, toggleStyle } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '../../context/ThemeContext';
import type { SwitchProps } from './Switch.types';

export type { SwitchProps } from './Switch.types';

/**
 * Kit Switch — iOS: a native SwiftUI Toggle (switch style) via @expo/ui.
 *
 * - On track = `primaryDark` (`tint`). The off track and white thumb are drawn by iOS.
 * - `colorScheme` follows the app's ThemeMode (not only the phone setting).
 * - The label is hidden visually but still read by VoiceOver.
 * All APIs used here exist on iOS 16.4 (our deployment target).
 */
export function Switch({ value, onValueChange, disabled, accessibilityLabel, testID }: SwitchProps) {
  const { colors, resolvedTheme } = useTheme();
  const modifiers = useMemo(
    () => [
      toggleStyle('switch'),
      labelsHidden(),
      tint(colors.primaryDark),
      ...(disabled ? [disabledModifier(true)] : []),
    ],
    [colors.primaryDark, disabled]
  );

  return (
    <Host matchContents colorScheme={resolvedTheme}>
      <Toggle
        isOn={value}
        onIsOnChange={onValueChange}
        label={accessibilityLabel}
        modifiers={modifiers}
        testID={testID}
      />
    </Host>
  );
}
