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

const MIN = 60 * 1000;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today, 3:42 PM" · "Yesterday, 11:05 PM" · "Mon, Nov 10, 6:30 AM". */
export const formatDateTime = (d: Date, now = new Date()) => {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = sameDay(d, now)
    ? 'Today'
    : sameDay(d, yesterday)
    ? 'Yesterday'
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

const QUICK = [
  { label: 'Now', minutes: 0 },
  { label: '15 min ago', minutes: 15 },
  { label: '30 min ago', minutes: 30 },
  { label: '1 hr ago', minutes: 60 },
];

/**
 * Date + time field for things logged around the clock (feeds, diapers,
 * sleep). Tapping opens a sheet with quick "… ago" chips, the app calendar
 * and hour / minute steppers — the same on iOS, Android and web, no native
 * pickers. Unlike DateField, the time of day is kept.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: {
  label?: string;
  value: Date;
  onChange: (d: Date) => void;
  /** Usually `new Date()`: you can't log something in the future. */
  maximumDate?: Date;
  minimumDate?: Date;
}) {
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
