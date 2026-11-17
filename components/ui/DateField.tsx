import React, { useState } from 'react';
import { Sheet } from './Sheet';
import { Calendar } from './Calendar';
import { SelectField, formatDate } from './Fields';
import type { DateFieldProps } from './DateField.types';

export type { DateFieldProps } from './DateField.types';

// Web version (the original field, unchanged). iOS and Android use native pickers
// from @expo/ui: see DateField.ios.tsx / DateField.android.tsx.

/**
 * Date field (web): shows the date with one calendar icon; tapping opens the app's
 * own themed calendar in a sheet. Picking a day closes it.
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate, optional }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectField label={label} optional={optional} value={formatDate(value)} trailing="calendar-outline" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? 'Pick a date'} scroll={false}>
        <Calendar
          value={value}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
