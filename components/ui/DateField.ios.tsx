import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Host, DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './Button';
import { SelectField, formatDate } from './Fields';
import { Sheet } from './Sheet';
import { clampDay, endOfLocalDay, sameLocalDay, startOfLocalDay } from './dateValue';
import type { DateFieldProps } from './DateField.types';

export type { DateFieldProps } from './DateField.types';

/**
 * DateField — iOS: the same field row and sheet; the sheet shows the native iOS
 * calendar (SwiftUI DatePicker, graphical style → UIDatePicker .inline, iOS 14+).
 * "Done" commits; closing the sheet without changing the day changes nothing.
 *
 * The picker works in device-local time like the rest of the app. min/max become the
 * start of the min day and end of the max day so whole days are selectable, as on web.
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate, optional }: DateFieldProps) {
  const { colors, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const range = useMemo(
    () =>
      minimumDate || maximumDate
        ? {
            start: minimumDate ? startOfLocalDay(minimumDate) : undefined,
            end: maximumDate ? endOfLocalDay(maximumDate) : undefined,
          }
        : undefined,
    [minimumDate, maximumDate]
  );
  const modifiers = useMemo(() => [datePickerStyle('graphical'), tint(colors.primaryDark)], [colors.primaryDark]);

  const done = () => {
    setOpen(false);
    // Untouched: leave the stored value exactly as it was (like closing the old sheet).
    if (sameLocalDay(draft, value)) return;
    onChange(clampDay(draft, minimumDate, maximumDate));
  };

  return (
    <>
      <SelectField label={label} optional={optional} value={formatDate(value)} trailing="calendar-outline" onPress={() => setOpen(true)} />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'Pick a date'}
        scroll={false}
        footer={<Button title="Done" size="lg" fullWidth onPress={done} />}
      >
        <Host matchContents={{ vertical: true }} colorScheme={resolvedTheme} style={styles.host}>
          <DatePicker
            title={label ?? 'Date'}
            selection={draft}
            range={range}
            displayedComponents={['date']}
            onDateChange={setDraft}
            modifiers={modifiers}
          />
        </Host>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  // The graphical picker takes the width it is given.
  host: { alignSelf: 'stretch' },
});
