import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, RADIUS, SPACE } from '../../context/ThemeContext';
import { Calendar } from './Calendar';
import { SelectField } from './Fields';
import { Chip } from './Choice';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { MIN, QUICK, formatDateTime } from './DateTimeField.shared';
import type { DateTimeFieldProps } from './DateTimeField.types';

export { formatDateTime } from './DateTimeField.shared';
export type { DateTimeFieldProps } from './DateTimeField.types';

/**
 * Date + time field (web) for things logged around the clock (feeds, diapers,
 * sleep). Tapping opens a sheet with quick "… ago" chips, the app calendar
 * and hour / minute steppers. Unlike DateField, the time of day is kept.
 * iOS and Android use native pickers: see DateTimeField.ios.tsx / .android.tsx.
 */
export function DateTimeField({ label, value, onChange, maximumDate, minimumDate }: DateTimeFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const clamp = (d: Date) => {
    if (maximumDate && d > maximumDate) return new Date(maximumDate);
    if (minimumDate && d < minimumDate) return new Date(minimumDate);
    return d;
  };
  const shift = (minutes: number) => setDraft((d) => clamp(new Date(d.getTime() + minutes * MIN)));
  const time = draft.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

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
              <Chip
                key={q.label}
                label={q.label}
                onPress={() => setDraft(clamp(new Date(Date.now() - q.minutes * MIN)))}
              />
            ))}
          </View>

          <View style={[styles.time, { backgroundColor: colors.surfaceSecondary }]}>
            <Stepper label="Hour" onMinus={() => shift(-60)} onPlus={() => shift(60)} />
            <Text variant="title1" tabular accessibilityLiveRegion="polite">
              {time}
            </Text>
            <Stepper label="Minutes" onMinus={() => shift(-5)} onPlus={() => shift(5)} />
          </View>

          <Calendar
            value={draft}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(d) =>
              setDraft(clamp(new Date(d.getFullYear(), d.getMonth(), d.getDate(), draft.getHours(), draft.getMinutes())))
            }
          />
        </View>
      </Sheet>
    </>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <IconButton name="remove" variant="outline" size={34} onPress={onMinus} accessibilityLabel={`Earlier ${label.toLowerCase()}`} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <IconButton name="add" variant="outline" size={34} onPress={onPlus} accessibilityLabel={`Later ${label.toLowerCase()}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
  },
  stepper: { alignItems: 'center', gap: SPACE.xs },
});
