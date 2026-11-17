import React, { useMemo, useState } from 'react';
import { Host, DatePickerDialog } from '@expo/ui/jetpack-compose';
import { useTheme } from '../../context/ThemeContext';
import { SelectField, formatDate } from './Fields';
import { clampDay, fromComposeDay, toComposeDay } from './dateValue';
import { datePickerColors } from './nativeDateColors';
import type { DateFieldProps } from './DateField.types';

export type { DateFieldProps } from './DateField.types';

/**
 * DateField — Android: the same field row; tapping opens the Material 3 date picker
 * dialog (Jetpack Compose via @expo/ui). OK commits, Cancel / back / outside tap
 * changes nothing.
 *
 * Material 3 works in UTC days, so the value goes in via toComposeDay and comes back
 * via fromComposeDay (see dateValue.ts). min/max are passed as local dates: the
 * native side greys out days by their LOCAL calendar day, matching the web rule.
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate, optional }: DateFieldProps) {
  const { colors, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const elementColors = useMemo(() => datePickerColors(colors), [colors]);
  const selectableDates =
    minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined;

  return (
    <>
      <SelectField label={label} optional={optional} value={formatDate(value)} trailing="calendar-outline" onPress={() => setOpen(true)} />
      {open ? (
        <Host colorScheme={resolvedTheme}>
          <DatePickerDialog
            initialDate={toComposeDay(value)}
            selectableDates={selectableDates}
            color={colors.primaryDark}
            elementColors={elementColors}
            onDateSelected={(picked) => {
              setOpen(false);
              if (Number.isNaN(picked.getTime())) return;
              onChange(clampDay(fromComposeDay(picked), minimumDate, maximumDate));
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      ) : null}
    </>
  );
}
