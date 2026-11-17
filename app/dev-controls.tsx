import React, { useState } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SPACE, ThemeMode, useTheme } from '../context/ThemeContext';
import {
  Card,
  DateField,
  DateTimeField,
  ListRow,
  Screen,
  SectionHeader,
  SegmentedControl,
  SelectMenu,
  Switch,
  Text,
} from '../components/ui';
import { VISIT_TYPES } from '../lib/journal';
import { KitGallery } from '../components/dev/KitGallery';

/**
 * DEV ONLY — native controls showcase for the @expo/ui pilot (kit Switch and
 * SegmentedControl). Nothing links here; open it on a dev build with
 *   newlifejournal://dev-controls
 * (type it into Safari / Chrome on the phone, or `npx uri-scheme open … --ios|--android`).
 * Release builds redirect straight back to the app.
 *
 * Release safety: the route file exists in every build (so the deep link resolves
 * here), but with __DEV__ === false this component only renders <Redirect href="/" />
 * and the AuthGate sends "/" home. Metro inlines __DEV__ and the minifier drops the
 * showcase entirely, so none of it ships. Keep the guard as the first line.
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

  const today = new Date();
  const [day, setDay] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const [dueDay, setDueDay] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30, 12));
  const [when, setWhen] = useState(() => new Date(Date.now() - 20 * 60 * 1000));
  const [windowed, setWindowed] = useState(() => new Date(Date.now() - 2 * 3600 * 1000));
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 6, 0);

  const [reason, setReason] = useState<string | undefined>('harassment');
  const [side, setSide] = useState<string | undefined>(undefined);
  const [day7, setDay7] = useState<string | undefined>('wed');
  const [visitType, setVisitType] = useState<string | undefined>('Checkup');
  const [action, setAction] = useState<string | undefined>(undefined);
  const [lastSelect, setLastSelect] = useState('—');
  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setLastSelect(`${v} at ${new Date().toLocaleTimeString()}`);
  };

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

      <KitGallery />

      <View style={styles.section}>
        <SectionHeader title="SelectMenu" />
        <Label text={`Last onSelect: ${lastSelect} (every tap counts, including the selected option)`} />
        <Label text="4 options + icons → native menu (icons not shown natively)" />
        <SelectMenu
          label="Reason"
          title="Why are you reporting this post?"
          value={reason}
          onSelect={pick(setReason)}
          options={[
            { value: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
            { value: 'harassment', label: 'Harassment', icon: 'sad-outline' },
            { value: 'misinformation', label: 'Medical misinformation', icon: 'alert-circle-outline' },
            { value: 'other', label: 'Other', icon: 'help-circle-outline' },
          ]}
        />
        <Label text="3 options, nothing selected → native menu with placeholder" />
        <SelectMenu
          label="Side"
          optional
          title="Side"
          placeholder="Choose a side"
          value={side}
          onSelect={pick(setSide)}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'both', label: 'Both' },
          ]}
        />
        <Label text="7 options (the limit) → native menu" />
        <SelectMenu
          label="Day"
          title="Day"
          value={day7}
          onSelect={pick(setDay7)}
          options={['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ value: d, label: d.toUpperCase() }))}
        />
        <Label text="9 options (Visit type) → sheet" />
        <SelectMenu
          label="Type"
          title="Visit type"
          value={visitType}
          onSelect={pick(setVisitType)}
          options={VISIT_TYPES.map((t) => ({ value: t.label, label: t.label, icon: t.icon }))}
        />
        <Label text="Options with descriptions → sheet" />
        <SelectMenu
          label="Action"
          title="Post"
          placeholder="Choose an action"
          value={action}
          onSelect={pick(setAction)}
          options={[
            { value: 'report', label: 'Report post', icon: 'flag-outline' },
            { value: 'block', label: 'Block author', description: "You won't see their posts or comments", icon: 'ban-outline' },
          ]}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Date fields" />
        <Label text={`DateField, no future (as symptoms/visits) — stored: ${day.toString()}`} />
        <DateField label="Date" value={day} onChange={setDay} maximumDate={new Date()} />
        <Label text={`DateField, today … +300 days (as due date) — stored: ${dueDay.toString()}`} />
        <DateField
          label="Due date"
          value={dueDay}
          onChange={setDueDay}
          minimumDate={new Date()}
          maximumDate={new Date(today.getFullYear(), today.getMonth(), today.getDate() + 300)}
        />
        <Label text={`DateTimeField, up to now (as feeds/sleep) — stored: ${when.toString()}`} />
        <DateTimeField label="Started" value={when} onChange={setWhen} maximumDate={new Date()} />
        <Label text={`DateTimeField, last 7 days 06:00 … now — stored: ${windowed.toString()}`} />
        <DateTimeField label="Fell asleep" value={windowed} onChange={setWindowed} minimumDate={weekAgo} maximumDate={new Date()} />
        <Text variant="footnote" color="textSecondary">
          Check: the stored value shows the same local day you picked (date fields store local noon), the
          clock follows the phone's 12/24-hour setting, and min/max days are greyed out.
        </Text>
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
