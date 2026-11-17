import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getCalendars } from 'expo-localization';
import { Host, DatePickerDialog, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { useTheme, SPACE } from '../../context/ThemeContext';
import { Button } from './Button';
import { Chip } from './Choice';
import { SelectField, formatDate } from './Fields';
import { Sheet } from './Sheet';
import { clampInstant, fromComposeDay, toComposeDay, withLocalTime } from './dateValue';
import { datePickerColors, timePickerColors } from './nativeDateColors';
import { MIN, QUICK, formatDateTime } from './DateTimeField.shared';
import type { DateTimeFieldProps } from './DateTimeField.types';

export { formatDateTime } from './DateTimeField.shared';
export type { DateTimeFieldProps } from './DateTimeField.types';

/** The device's 12/24-hour setting (Android: DateFormat.is24HourFormat), read when the clock opens. */
export function deviceUses24HourClock(): boolean {
  const fromDevice = getCalendars()[0]?.uses24hourClock;
  if (typeof fromDevice === 'boolean') return fromDevice;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === false;
}

const timeLabel = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * DateTimeField — Android: the same field row and sheet with the quick "… ago" chips;
 * the calendar and steppers become two rows that open the Material 3 date and time
 * picker dialogs (Jetpack Compose via @expo/ui). The clock follows the device's
 * 12/24-hour setting. "Done" commits the value clamped to the exact min/max instants,
 * exactly as before.
 */
export function DateTimeField({ label, value, onChange, maximumDate, minimumDate }: DateTimeFieldProps) {
  const { colors, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [dialog, setDialog] = useState<null | 'date' | 'time'>(null);
  const [is24Hour, setIs24Hour] = useState(true);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const clamp = (d: Date) => clampInstant(d, minimumDate, maximumDate);
  const dateColors = useMemo(() => datePickerColors(colors), [colors]);
  const timeColors = useMemo(() => timePickerColors(colors), [colors]);
  const selectableDates = minimumDate || maximumDate ? { start: minimumDate, end: maximumDate } : undefined;

  const openTime = () => {
    setIs24Hour(deviceUses24HourClock());
    setDialog('time');
  };

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
          <SelectField label="Date" value={formatDate(draft)} trailing="calendar-outline" onPress={() => setDialog('date')} />
          <SelectField label="Time" value={timeLabel(draft)} trailing="time-outline" onPress={openTime} />
        </View>

        {dialog === 'date' ? (
          <Host colorScheme={resolvedTheme}>
            <DatePickerDialog
              initialDate={toComposeDay(draft)}
              selectableDates={selectableDates}
              color={colors.primaryDark}
              elementColors={dateColors}
              onDateSelected={(picked) => {
                setDialog(null);
                if (Number.isNaN(picked.getTime())) return;
                // Keep the draft's time of day on the picked local day.
                setDraft((d) => clamp(withLocalTime(fromComposeDay(picked), d)));
              }}
              onDismissRequest={() => setDialog(null)}
            />
          </Host>
        ) : null}

        {dialog === 'time' ? (
          <Host colorScheme={resolvedTheme}>
            <TimePickerDialog
              initialDate={draft.toISOString()}
              is24Hour={is24Hour}
              color={colors.primaryDark}
              elementColors={timeColors}
              onDateSelected={(picked) => {
                setDialog(null);
                if (Number.isNaN(picked.getTime())) return;
                // Native returns the draft's day with the new local hour/minute.
                setDraft((d) => clamp(withLocalTime(d, picked)));
              }}
              onDismissRequest={() => setDialog(null)}
            />
          </Host>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
