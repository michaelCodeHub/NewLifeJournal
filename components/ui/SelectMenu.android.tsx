import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, DropdownMenu, SelectableDropdownMenuItem, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme, kit } from '../../context/ThemeContext';
import { SelectField } from './Fields';
import { SelectMenuSheet } from './SelectMenuSheet';
import { canUseNativeMenu, selectedLabel, type SelectMenuProps } from './SelectMenu.types';

export type { SelectMenuProps } from './SelectMenu.types';

/**
 * SelectMenu — Android: simple lists of up to 10 options open a Material 3 DropdownMenu anchored
 * under the field; the selected option uses Material's selected item state. Long or
 * rich lists fall back to the field + OptionSheet (see canUseNativeMenu).
 *
 * The trigger is the kit SelectField (same look, label and accessibility). A Compose
 * Host laid over it, with no touch handling, gives the menu its anchor. Option icons
 * are not shown — Compose menus need drawable icons, and the app's icons are Ionicons.
 */
export function SelectMenu<T extends string>(props: SelectMenuProps<T>) {
  if (!canUseNativeMenu(props.options)) return <SelectMenuSheet {...props} />;
  return <NativeSelectMenu {...props} />;
}

function NativeSelectMenu<T extends string>({ label, optional, options, value, placeholder, onSelect }: SelectMenuProps<T>) {
  const { colors, resolvedTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const itemColors = useMemo(
    () => ({
      textColor: colors.textPrimary,
      containerColor: colors.surface,
      selectedTextColor: colors.onPrimary,
      selectedContainerColor: colors.primaryDark,
    }),
    [colors]
  );
  const anchorModifiers = useMemo(() => [fillMaxSize()], []);

  return (
    <View>
      <SelectField
        label={label}
        optional={optional}
        value={selectedLabel(options, value)}
        placeholder={placeholder}
        onPress={() => setExpanded(true)}
      />
      {/* Anchor: covers the field box (below the label), never takes touches. */}
      <View style={[styles.anchor, { height: kit().field.height }]} pointerEvents="none">
        <Host colorScheme={resolvedTheme} style={StyleSheet.absoluteFill}>
          <DropdownMenu
            expanded={expanded}
            onDismissRequest={() => setExpanded(false)}
            color={colors.surface}
            modifiers={anchorModifiers}
          >
            <DropdownMenu.Items>
              {options.map((o, index) => (
                <SelectableDropdownMenuItem
                  key={o.value}
                  selected={o.value === value}
                  shapes={{ index, count: options.length }}
                  colors={itemColors}
                  onClick={() => {
                    setExpanded(false);
                    onSelect(o.value);
                  }}
                >
                  <SelectableDropdownMenuItem.Text>
                    <Text>{o.label}</Text>
                  </SelectableDropdownMenuItem.Text>
                </SelectableDropdownMenuItem>
              ))}
            </DropdownMenu.Items>
          </DropdownMenu>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Exactly the field box (one line, kit().field.height tall, at the bottom under any
  // label), so the menu opens just below the box.
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
