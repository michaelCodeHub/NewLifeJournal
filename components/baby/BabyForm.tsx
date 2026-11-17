import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACE } from '../../context/ThemeContext';
import { Chip, DateField, Text, TextField } from '../ui';
import { parseAmount } from '../../lib/baby';
import type { Baby } from '../../types';
import type { BabyFormData } from '../../context/BabyContext';

const GENDERS: { value: NonNullable<Baby['gender']>; label: string }[] = [
  { value: 'girl', label: 'Girl' },
  { value: 'boy', label: 'Boy' },
  { value: 'other', label: 'Prefer not to say' },
];

export interface BabyFormState {
  name: string;
  birthDate: Date;
  weight: string;
  height: string;
  gender?: Baby['gender'];
}

export const babyFormState = (b?: Partial<Baby> | null, defaults?: { name?: string; birthDate?: Date }): BabyFormState => ({
  name: b?.name ?? defaults?.name ?? '',
  birthDate: b?.birthDate?.toDate() ?? defaults?.birthDate ?? new Date(),
  weight: b?.birthWeight ? String(b.birthWeight) : '',
  height: b?.birthHeight ? String(b.birthHeight) : '',
  gender: b?.gender,
});

/** Validation shared by every place a baby is created or edited. */
export function validateBabyForm(s: BabyFormState): { data?: BabyFormData; errors: Partial<Record<'name' | 'weight' | 'height', string>> } {
  const errors: Partial<Record<'name' | 'weight' | 'height', string>> = {};
  const w = parseAmount(s.weight);
  const h = parseAmount(s.height);
  if (!s.name.trim()) errors.name = "Add your baby's name (a nickname is fine)";
  if (s.weight.trim() && (w === undefined || w < 0.3 || w > 7)) errors.weight = 'Birth weight in kg, e.g. 3.4';
  if (s.height.trim() && (h === undefined || h < 20 || h > 70)) errors.height = 'Birth length in cm, e.g. 50';
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    data: { name: s.name.trim(), birthDate: s.birthDate, birthWeight: w, birthHeight: h, gender: s.gender },
  };
}

/** Name, birth date, birth weight / length and (optional) gender. */
export function BabyForm({
  value,
  onChange,
  errors = {},
}: {
  value: BabyFormState;
  onChange: (next: BabyFormState) => void;
  errors?: Partial<Record<'name' | 'weight' | 'height', string>>;
}) {
  const set = <K extends keyof BabyFormState>(k: K, v: BabyFormState[K]) => onChange({ ...value, [k]: v });
  // Birth up to ~3 years ago; never in the future.
  const [min] = useState(() => new Date(Date.now() - 3 * 365 * 86400000));
  return (
    <View style={{ gap: SPACE.lg }}>
      <TextField label="Baby's name" autoCapitalize="words" placeholder="e.g. Aria" value={value.name} onChangeText={(t) => set('name', t)} error={errors.name} />
      <DateField label="Birth date" value={value.birthDate} onChange={(d) => set('birthDate', d)} maximumDate={new Date()} minimumDate={min} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Birth weight (kg)"
            optional
            keyboardType="decimal-pad"
            placeholder="3.4"
            value={value.weight}
            onChangeText={(t) => set('weight', t)}
            error={errors.weight}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Length (cm)"
            optional
            keyboardType="decimal-pad"
            placeholder="50"
            value={value.height}
            onChangeText={(t) => set('height', t)}
            error={errors.height}
          />
        </View>
      </View>
      <View style={{ gap: SPACE.sm }}>
        <Text variant="footnote" color="textSecondary">
          Gender (optional)
        </Text>
        <View style={styles.chips}>
          {GENDERS.map((g) => (
            <Chip key={g.value} label={g.label} selected={value.gender === g.value} onPress={() => set('gender', value.gender === g.value ? undefined : g.value)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACE.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
