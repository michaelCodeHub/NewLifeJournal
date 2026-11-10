import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme, RADIUS, SPACE } from '../../context/ThemeContext';
import { Text } from './Text';
import { IconButton } from './IconButton';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 40;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The app's own month calendar — same look on iOS, Android and web, in the app
 * theme. Used by DateField instead of each platform's native picker.
 */
export function Calendar({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = startOfDay(new Date());
  const min = minimumDate ? startOfDay(minimumDate) : null;
  const max = maximumDate ? startOfDay(maximumDate) : null;

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= count; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const canPrev = !min || new Date(month.getFullYear(), month.getMonth(), 0) >= min;
  const canNext = !max || new Date(month.getFullYear(), month.getMonth() + 1, 1) <= max;

  return (
    <View style={{ gap: SPACE.md }}>
      <View style={styles.head}>
        <Text variant="headline">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
          <IconButton name="chevron-back" variant="plain" size={32} iconSize={20} disabled={!canPrev} onPress={() => shift(-1)} accessibilityLabel="Previous month" />
          <IconButton name="chevron-forward" variant="plain" size={32} iconSize={20} disabled={!canNext} onPress={() => shift(1)} accessibilityLabel="Next month" />
        </View>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <Text variant="caption" color="textMuted">
              {w}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const disabled = (min && d < min) || (max && d > max);
          const selected = sameDay(d, value);
          const isToday = sameDay(d, today);
          return (
            <Pressable
              key={i}
              disabled={!!disabled}
              onPress={() => onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12))}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={d.toDateString()}
              style={styles.cell}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.day,
                    selected
                      ? { backgroundColor: colors.primaryDark }
                      : pressed
                        ? { backgroundColor: colors.surfaceSecondary }
                        : isToday
                          ? { borderWidth: 1, borderColor: colors.primary }
                          : null,
                  ]}
                >
                  <Text
                    variant={selected || isToday ? 'bodyMedium' : 'body'}
                    tabular
                    style={{
                      color: selected ? '#FFFFFF' : disabled ? colors.textMuted : isToday ? colors.primaryDark : colors.textPrimary,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: SPACE.xs },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: CELL + 4, alignItems: 'center', justifyContent: 'center' },
  day: { width: CELL, height: CELL, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
});
