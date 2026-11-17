import React, { useState } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SPACE, ThemeMode, useTheme } from '../context/ThemeContext';
import { Card, ListRow, Screen, SectionHeader, SegmentedControl, Switch, Text } from '../components/ui';

/**
 * DEV ONLY — native controls showcase for the @expo/ui pilot (kit Switch and
 * SegmentedControl). Nothing links here; open it on a dev build with
 *   newlifejournal://dev-controls
 * (type it into Safari / Chrome on the phone, or `npx uri-scheme open … --ios|--android`).
 * Release builds redirect straight back to the app.
 */
export default function DevControlsRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevControlsShowcase />;
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function DevControlsShowcase() {
  const { themeMode, setThemeMode, resolvedTheme } = useTheme();
  const phoneScheme = useColorScheme() ?? 'light';

  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [two, setTwo] = useState<'timer' | 'manual'>('timer');
  const [three, setThree] = useState<'all' | 'visits' | 'symptoms'>('all');
  const [four, setFour] = useState<'a' | 'b' | 'c' | 'd'>('a');
  const [long, setLong] = useState<'weight' | 'bp'>('weight');
  const [unit, setUnit] = useState<'ml' | 'oz'>('ml');
  const [many, setMany] = useState<'1' | '2' | '3' | '4' | '5'>('3');

  return (
    <Screen header={{ variant: 'bar', title: 'Native controls (dev)' }} contentStyle={styles.body}>
      <Card>
        <Text variant="footnote" color="textSecondary">
          {`Platform: ${Platform.OS} · Phone: ${phoneScheme} · App: ${themeMode} → ${resolvedTheme}`}
        </Text>
        <Text variant="footnote" color="textSecondary">
          Test phone light + app Dark, and phone dark + app Light: the controls must match the app.
        </Text>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="App theme (ThemeMode)" />
        <SegmentedControl<ThemeMode> value={themeMode} onChange={setThemeMode} options={THEME_OPTIONS} />
      </View>

      <View>
        <SectionHeader title="Switch" />
        <Card padded={false}>
          <ListRow title="Interactive (starts on)" subtitle={on ? 'On' : 'Off'} chevron={false}
            right={<Switch value={on} onValueChange={setOn} accessibilityLabel="Interactive (starts on)" />} />
          <ListRow title="Interactive (starts off)" subtitle={off ? 'On' : 'Off'} chevron={false}
            right={<Switch value={off} onValueChange={setOff} accessibilityLabel="Interactive (starts off)" />} />
          <ListRow title="Disabled, on" chevron={false}
            right={<Switch value disabled accessibilityLabel="Disabled, on" />} />
          <ListRow title="Disabled, off" chevron={false}
            right={<Switch value={false} disabled accessibilityLabel="Disabled, off" />} />
          <ListRow
            title="Refuses changes (value stays off)"
            subtitle="Controlled: tapping must snap back"
            chevron={false}
            last
            right={<Switch value={false} onValueChange={() => {}} accessibilityLabel="Refuses changes" />}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="SegmentedControl" />
        <Label text={`Two segments — selected: ${two}`} />
        <SegmentedControl value={two} onChange={setTwo} options={[
          { value: 'timer', label: 'Start timer' },
          { value: 'manual', label: 'Log past feed' },
        ]} />

        <Label text={`Three segments — selected: ${three}`} />
        <SegmentedControl value={three} onChange={setThree} options={[
          { value: 'all', label: 'All' },
          { value: 'visits', label: 'Visits' },
          { value: 'symptoms', label: 'Symptoms' },
        ]} />

        <Label text={`Four segments — selected: ${four}`} />
        <SegmentedControl value={four} onChange={setFour} options={[
          { value: 'a', label: 'Day' },
          { value: 'b', label: 'Week' },
          { value: 'c', label: 'Month' },
          { value: 'd', label: 'Year' },
        ]} />

        <Label text={`Five segments — selected: ${many}`} />
        <SegmentedControl value={many} onChange={setMany} options={[
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5' },
        ]} />

        <Label text={`Long labels — selected: ${long}`} />
        <SegmentedControl value={long} onChange={setLong} options={[
          { value: 'weight', label: 'Weight and measurements' },
          { value: 'bp', label: 'Blood pressure readings over time' },
        ]} />

        <Label text={`Narrow (110 wide, as in the feed sheet) — selected: ${unit}`} />
        <View style={styles.narrow}>
          <SegmentedControl value={unit} onChange={setUnit} options={[
            { value: 'ml', label: 'ml' },
            { value: 'oz', label: 'oz' },
          ]} />
        </View>

        <Label text="Value not in options (first segment shows selected)" />
        <SegmentedControl value={'none' as 'x' | 'y'} onChange={() => {}} options={[
          { value: 'x', label: 'First' },
          { value: 'y', label: 'Second' },
        ]} />
      </View>
    </Screen>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text variant="footnote" color="textSecondary">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.xl, paddingTop: SPACE.lg },
  section: { gap: SPACE.sm },
  narrow: { width: 110 },
});
