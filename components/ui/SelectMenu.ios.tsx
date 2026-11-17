import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, HStack, Image, Menu, Spacer, Text, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme, CONTROL, RADIUS, SPACE, TYPE } from '../../context/ThemeContext';
import { FieldLabel } from './Fields';
import { SelectMenuSheet } from './SelectMenuSheet';
import { canUseNativeMenu, selectedLabel, type SelectMenuProps } from './SelectMenu.types';

export type { SelectMenuProps } from './SelectMenu.types';

/**
 * SelectMenu — iOS: short, simple lists open a native SwiftUI Menu anchored to the
 * field; the selected option has the system checkmark (a Toggle item). Long or rich
 * lists fall back to the field + OptionSheet (see canUseNativeMenu).
 *
 * The trigger keeps the kit field box (tokens, border, height); its text uses the
 * system font at the body size. Option icons are not shown — iOS menus take SF
 * Symbols, and the app's icons are Ionicons. All APIs used exist on iOS 14+.
 */
export function SelectMenu<T extends string>(props: SelectMenuProps<T>) {
  if (!canUseNativeMenu(props.options)) return <SelectMenuSheet {...props} />;
  return <NativeSelectMenu {...props} />;
}

function NativeSelectMenu<T extends string>({ label, optional, title, options, value, placeholder, onSelect }: SelectMenuProps<T>) {
  const { colors, resolvedTheme } = useTheme();
  const current = selectedLabel(options, value);
  const shown = current ?? placeholder ?? '';
  // Same announcement as SelectField: "<label>: <value>".
  const spoken = label ? `${label}: ${shown}` : shown || title;

  const menuModifiers = useMemo(() => [accessibilityLabel(spoken), tint(colors.primaryDark)], [spoken, colors.primaryDark]);
  const labelModifiers = useMemo(
    () => [frame({ minHeight: CONTROL.input - 2 }), contentShape(shapes.rectangle())],
    []
  );
  const textModifiers = useMemo(
    () => [foregroundStyle(current ? colors.textPrimary : colors.textMuted), font({ size: TYPE.body.fontSize }), lineLimit(1)],
    [current, colors.textPrimary, colors.textMuted]
  );

  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} optional={optional} /> : null}
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
        <Host matchContents={{ vertical: true }} colorScheme={resolvedTheme} style={styles.host}>
          <Menu
            modifiers={menuModifiers}
            label={
              <HStack spacing={SPACE.sm} modifiers={labelModifiers}>
                <Text modifiers={textModifiers}>{shown}</Text>
                <Spacer />
                <Image systemName="chevron.up.chevron.down" size={12} color={colors.textMuted} />
              </HStack>
            }
          >
            {options.map((o) => (
              <Toggle key={o.value} label={o.label} isOn={o.value === value} onIsOnChange={() => onSelect(o.value)} />
            ))}
          </Menu>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACE.xs + 1 },
  box: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md - 1, minHeight: CONTROL.input, justifyContent: 'center' },
  host: { alignSelf: 'stretch' },
});
