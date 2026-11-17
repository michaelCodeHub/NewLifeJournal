import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme, SPACE } from '../../context/ThemeContext';
import { Button } from './Button';
import { Chip } from './Choice';
import { SelectField } from './Fields';
import { Sheet } from './Sheet';
import { clampInstant } from './dateValue';
import { MIN, QUICK, formatDateTime } from './DateTimeField.shared';
import type { DateTimeFieldProps } from './DateTimeField.types';

export { formatDateTime } from './DateTimeField.shared';
export type { DateTimeFieldProps } from './DateTimeField.types';

/**
 * DateTimeField — iOS: the same field row and sheet with the quick "… ago" chips;
 * the calendar and hour/minute steppers are replaced by the native iOS date + time
 * picker (SwiftUI DatePicker, graphical style → UIDatePicker .inline, iOS 14+).
 * The picker follows the device's 12/24-hour setting. "Done" commits the value
 * clamped to the exact min/max instants, exactly as before.
 */
export function DateTimeField({ label, value, onChange, maximumDate, minimumDate }: DateTimeFieldProps) {
  const { colors, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const clamp = (d: Date) => clampInstant(d, minimumDate, maximumDate);
  const range = minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined;
  const modifiers = useMemo(() => [datePickerStyle('graphical'), tint(colors.primaryDark)], [colors.primaryDark]);

  return (
    <>
      <SelectField label={label} value={formatDateTime(value)} trailing="time-outline" onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'When'}
        footer={
          <Button
            title="Done"
            size="lg"
            fullWidth
            onPress={() => {
              onChange(clamp(draft));
              setOpen(false);
            }}
          />
        }
      >
        <View style={{ gap: SPACE.lg }}>
          <View style={styles.chips}>
            {QUICK.map((q) => (
              <Chip key={q.label} label={q.label} onPress={() => setDraft(clamp(new Date(Date.now() - q.minutes * MIN)))} />
            ))}
          </View>
          <Host matchContents={{ vertical: true }} colorScheme={resolvedTheme} style={styles.host}>
            <DatePicker
              title={label ?? 'When'}
              selection={draft}
              range={range}
              displayedComponents={['date', 'hourAndMinute']}
              onDateChange={(d) => setDraft(clamp(d))}
              modifiers={modifiers}
            />
          </Host>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  host: { alignSelf: 'stretch' },
});
