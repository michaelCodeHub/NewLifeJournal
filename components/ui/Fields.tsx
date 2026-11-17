import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme, RADIUS, SPACE, TYPE, FONT, CONTROL } from '../../context/ThemeContext';
import { Text } from './Text';
import { PressableScale } from './PressableScale';

/* ------------------------------------------------------------ FieldLabel */

export interface FieldAction {
  label: string;
  onPress: () => void;
}

export function FieldLabel({
  label,
  optional,
  hint,
  action,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  /** A small link on the right of the label, e.g. "Forgot password?". */
  action?: FieldAction;
}) {
  return (
    <View style={styles.labelRow}>
      <Text variant="calloutMedium" color="textSecondary">
        {label}
        {optional ? <Text variant="footnote" color="textMuted">{'  '}Optional</Text> : null}
      </Text>
      {action ? (
        <PressableScale onPress={action.onPress} scaleTo={0.96} hitSlop={8} accessibilityLabel={action.label}>
          <Text variant="calloutMedium" color="primaryDark">
            {action.label}
          </Text>
        </PressableScale>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// Browsers add their own reveal/clear buttons to inputs (Edge's password eye),
// which would sit next to ours and ignore the theme. Hide them once, on web only.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('bb-input-reset')) {
  const el = document.createElement('style');
  el.id = 'bb-input-reset';
  el.textContent = 'input::-ms-reveal,input::-ms-clear{display:none}';
  document.head.appendChild(el);
}

/* ------------------------------------------------------------- TextField */

export interface TextFieldProps extends TextInputProps {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  icon?: IconName;
  /** Link shown on the right of the label. */
  action?: FieldAction;
  /** Element at the end of the input, e.g. a show-password button. */
  trailing?: React.ReactNode;
}

export function TextField({ label, optional, hint, error, icon, action, trailing, style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} optional={optional} hint={hint} action={action} /> : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.red : focused ? colors.primaryDark : colors.borderStrong,
            minHeight: multiline ? 76 : CONTROL.input,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {icon ? <Icon name={icon} size={15} color={colors.textMuted} style={{ marginTop: multiline ? 10 : 0 }} /> : null}
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primaryDark}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.textPrimary, paddingVertical: multiline ? 9 : 0, textAlignVertical: multiline ? 'top' : 'center' },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            style,
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="caption" color="red">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------- SelectField */

/** Looks like an input; tapping it opens whatever you pass to `onPress` (usually a Sheet). */
export function SelectField({
  label,
  optional,
  value,
  placeholder,
  icon,
  trailing = 'chevron-down',
  onPress,
}: {
  label?: string;
  optional?: boolean;
  value?: string;
  placeholder?: string;
  /** @deprecated Ignored: fields show one icon only (the trailing one). */
  icon?: IconName;
  /** Right-hand icon. Chevron for pickers; DateField uses a calendar. */
  trailing?: IconName;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} optional={optional} /> : null}
      <PressableScale
        onPress={onPress}
        scaleTo={0.985}
        accessibilityLabel={label ? `${label}: ${value ?? placeholder ?? ''}` : value}
        style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.borderStrong, minHeight: CONTROL.input, alignItems: 'center' }]}
      >
        <Text variant="body" color={value ? 'textPrimary' : 'textMuted'} style={{ flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name={trailing} size={16} color={colors.textMuted} />
      </PressableScale>
    </View>
  );
}

/* -------------------------------------------------------------- DateField */

export const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const styles = StyleSheet.create({
  field: { gap: SPACE.xs + 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  inputWrap: {
    flexDirection: 'row',
    gap: SPACE.sm,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.md - 1,
  },
  input: { flex: 1, ...TYPE.body, minHeight: CONTROL.input - 2 },
});
