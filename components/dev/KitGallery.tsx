import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACE, kit } from '../../context/ThemeContext';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  HeaderAction,
  ListRow,
  Pill,
  SectionHeader,
  SelectField,
  Sheet,
  Text,
  TextField,
  useToast,
} from '../ui';
import TabBar from '../TabBar';

/**
 * DEV ONLY (rendered by app/dev-controls.tsx): every kit component restyled for
 * Material 3 on Android, so it can be checked in light and dark with the app theme
 * switcher at the top of the showcase. iOS and web show their unchanged look.
 */
export function KitGallery() {
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');
  const [bp, setBp] = useState('12');
  const [chip, setChip] = useState('week');
  const k = kit();

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Kit components" />
      <Text variant="footnote" color="textSecondary">
        {`Tokens: ${k.field.height === 56 ? 'Material 3 (Android)' : 'iOS / web'} · button ${k.button.height.md}dp · field ${k.field.height}dp · sheet ${k.sheet.radius}dp`}
      </Text>

      <Label text="Buttons — filled (primary) / tonal (tinted) / outlined (secondary) / text (ghost) / danger" />
      {(['lg', 'md', 'sm'] as const).map((size) => (
        <View key={size} style={styles.row}>
          <Button title="Filled" size={size} onPress={() => {}} />
          <Button title="Tonal" variant="tinted" size={size} onPress={() => {}} />
          <Button title="Outlined" variant="secondary" size={size} onPress={() => {}} />
          <Button title="Text" variant="ghost" size={size} onPress={() => {}} />
          <Button title="Delete" variant="danger" size={size} onPress={() => {}} />
        </View>
      ))}
      <View style={styles.row}>
        <Button title="With icon" icon="add" onPress={() => {}} />
        <Button title="Disabled" disabled onPress={() => {}} />
        <Button title="Loading" loading onPress={() => {}} />
      </View>
      <Button title="Full width" fullWidth iconRight="chevron-forward" onPress={() => {}} />

      <Label text="Text fields — tap to see the focused outline; hint and error" />
      <TextField label="Name" placeholder="Your name" value={name} onChangeText={setName} />
      <TextField label="Weight" optional hint="In kilograms" keyboardType="decimal-pad" value="68" onChangeText={() => {}} />
      <TextField label="Blood pressure" hint="Like 120/80" error="Use the format 120/80" value={bp} onChangeText={setBp} />
      <TextField label="Notes" multiline placeholder="What did the doctor say?" value="" onChangeText={() => {}} />
      <SelectField label="Select field" value="Ultrasound" onPress={() => {}} />

      <Label text="Cards — plain (tonal) / raised / tinted" />
      <Card>
        <Text variant="body">Plain card</Text>
      </Card>
      <Card tone="raised">
        <Text variant="body">Raised card (Android: outline, no shadow)</Text>
      </Card>
      <Card tone="tinted" tint="primaryLight">
        <Text variant="body">Tinted card</Text>
      </Card>

      <Label text="List rows — one-line / two-line / with value / tile / destructive" />
      <Card padded={false}>
        <ListRow title="One line" icon="home-outline" onPress={() => {}} />
        <ListRow title="Two lines" subtitle="Supporting text under the title" icon="calendar-outline" onPress={() => {}} />
        <ListRow title="With a value" value="Week 24" icon="pulse-outline" onPress={() => {}} />
        <ListRow title="In a tile" icon="medkit-outline" tile tone="green" chevron={false} />
        <ListRow title="Delete" icon="trash-outline" destructive last onPress={() => {}} />
      </Card>

      <Label text="Chips and status pills" />
      <View style={styles.row}>
        {['day', 'week', 'month'].map((c) => (
          <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
        ))}
        <Chip label="With icon" icon="add" onPress={() => {}} />
      </View>
      <View style={styles.row}>
        <Pill label="Neutral" />
        <Pill label="Done" tone="green" icon="checkmark" />
        <Pill label="Due" tone="orange" />
      </View>

      <Label text="Toast and sheet" />
      <View style={styles.row}>
        <Button title="Show toast" variant="secondary" onPress={() => toast.show('Visit saved')} />
        <Button title="Error toast" variant="secondary" onPress={() => toast.show('Could not save', 'error')} />
        <Button title="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
      </View>

      <Label text="Empty state" />
      <Card>
        <EmptyState icon="calendar-outline" title="Nothing logged yet" body="Your entries will show here." action={<Button title="Add entry" icon="add" onPress={() => {}} />} />
      </Card>

      <Label text="Top app bar (pushed screen) and tab bar" />
      <Card padded={false} style={styles.clip}>
        <Header title="Visits" variant="bar" onBack={() => {}} right={<HeaderAction name="add" onPress={() => {}} accessibilityLabel="Add visit" />} />
      </Card>
      <Card padded={false} style={styles.clip}>
        <TabBar {...(TAB_PROPS as unknown as React.ComponentProps<typeof TabBar>)} />
      </Card>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Sheet title"
        subtitle="Android: 28dp top corners"
        footer={<Button title="Done" size="lg" fullWidth onPress={() => setSheet(false)} />}
      >
        <TextField label="Inside a sheet" placeholder="Type here" value="" onChangeText={() => {}} />
      </Sheet>
    </View>
  );
}

const TAB_PROPS = {
  state: { index: 1, routes: ['home', 'timeline', 'tools', 'chat', 'profile'].map((name) => ({ key: `demo-${name}`, name })) },
  emitter: { emit: () => ({ defaultPrevented: true }) },
  navigateToTab: () => {},
};

function Label({ text }: { text: string }) {
  return (
    <Text variant="footnote" color="textSecondary">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, alignItems: 'center' },
  clip: { overflow: 'hidden' },
});
