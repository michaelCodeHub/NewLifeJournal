import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../lib/haptics';
import { selectedIndex, type SegmentedControlProps } from './SegmentedControl.types';

/**
 * Kit SegmentedControl — iOS: a native SwiftUI Picker in `.segmented` style via @expo/ui.
 *
 * Uses the standard system look on purpose. iOS can tint the selected segment but
 * keeps its label in the system text colour, so a `primaryDark` fill would put
 * near-black text on dark teal (3.6:1). `colorScheme` follows the app's ThemeMode.
 * Every API used here exists on iOS 16.4 (our deployment target).
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { resolvedTheme } = useTheme();
  const index = selectedIndex(options, value);
  const modifiers = useMemo(() => [pickerStyle('segmented')], []);

  return (
    <Host matchContents={{ vertical: true }} colorScheme={resolvedTheme} style={styles.host}>
      <Picker<number>
        label=""
        selection={index}
        onSelectionChange={(i) => {
          const option = options[i];
          // Re-tapping the selected segment is a no-op on every platform
          // (SwiftUI already only reports real changes; this keeps it explicit).
          if (!option || option.value === value) return;
          haptics.selection();
          onChange(option.value);
        }}
        modifiers={modifiers}
      >
        {options.map((o, i) => (
          <Text key={o.value} modifiers={[tag(i)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

const styles = StyleSheet.create({
  // A segmented Picker is flexible in SwiftUI: it takes its width from the parent.
  host: { alignSelf: 'stretch' },
});
