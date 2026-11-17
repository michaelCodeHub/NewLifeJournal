import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../../context/ThemeContext';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  HeaderAction,
  IconButton,
  IconTile,
  ListRow,
  Pill,
  SelectField,
  Sheet,
  TextField,
  ToastProvider,
  useToast,
} from '../../components/ui';
import TabBar from '../../components/TabBar';

/**
 * The iOS / web look of the kit, locked as rendered output (styles included).
 * Part C restyles Android only: this snapshot must keep passing WITHOUT being
 * updated. If it fails, an Android change leaked into iOS or web.
 * Jest renders the shared (non-.android) code path, which is what iOS and web use.
 */

/**
 * Compare what is drawn, not how the code builds it: every element's style is
 * flattened (so moving a value between style objects is not a change).
 */
type JSONNode = { type: string; props: Record<string, unknown>; children: (JSONNode | string)[] | null };
function flattenStyles(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(flattenStyles);
  if (!node || typeof node !== 'object') return node;
  const n = node as JSONNode;
  const props = { ...n.props };
  if (props.style !== undefined) props.style = StyleSheet.flatten(props.style as never);
  return { ...n, props, children: n.children ? n.children.map(flattenStyles) : n.children };
}
const look = (r: { toJSON: () => unknown }) => flattenStyles(r.toJSON());

type Scheme = 'light' | 'dark';
let mockPhoneScheme: Scheme = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockPhoneScheme }));

const noop = () => {};

function Gallery() {
  return (
    <>
      {(['primary', 'secondary', 'ghost', 'danger', 'tinted'] as const).map((variant) =>
        (['lg', 'md', 'sm'] as const).map((size) => (
          <Button key={variant + size} title={`${variant} ${size}`} variant={variant} size={size} icon="add" onPress={noop} />
        ))
      )}
      <Button title="disabled" disabled onPress={noop} />
      <Button title="loading" loading onPress={noop} />
      <Button title="full" fullWidth iconRight="chevron-forward" onPress={noop} />

      <TextField label="Name" placeholder="Your name" value="" onChangeText={noop} />
      <TextField label="Weight" optional hint="kg" value="68" onChangeText={noop} />
      <TextField label="Blood pressure" error="Use 120/80" value="12" onChangeText={noop} />
      <TextField label="Notes" multiline value="" onChangeText={noop} />
      <TextField placeholder="No label" icon="search" value="" onChangeText={noop} />
      <SelectField label="Type" value="Checkup" onPress={noop} />
      <SelectField label="Type" placeholder="Choose" onPress={noop} />

      <Card>
        <RNText>plain</RNText>
      </Card>
      <Card tone="raised">
        <RNText>raised</RNText>
      </Card>
      <Card tone="tinted" tint="primaryLight">
        <RNText>tinted</RNText>
      </Card>
      <Card onPress={noop} padded={false}>
        <ListRow title="One line" icon="home-outline" onPress={noop} />
        <ListRow title="Two lines" subtitle="Subtitle text" icon="calendar-outline" value="Value" onPress={noop} />
        <ListRow title="Tile" icon="medkit-outline" tile tone="green" chevron={false} />
        <ListRow title="Delete" icon="trash-outline" destructive last onPress={noop} />
      </Card>

      <Pill label="Status" />
      <Pill label="With icon" icon="checkmark" tone="green" />
      <Chip label="Chip" onPress={noop} />
      <Chip label="Selected" selected icon="checkmark" onPress={noop} />
      <IconTile name="pulse-outline" tone="plum" />
      <IconButton name="close" onPress={noop} accessibilityLabel="Close" />
      <IconButton name="add" variant="outline" onPress={noop} accessibilityLabel="Add" />
      <HeaderAction name="search" onPress={noop} accessibilityLabel="Search" />

      <EmptyState icon="calendar-outline" title="Nothing yet" body="Add your first entry." action={<Button title="Add" onPress={noop} />} />

      <Header title="Bar header" variant="bar" right={<HeaderAction name="add" onPress={noop} accessibilityLabel="Add" />} />
      <Header title="Large header" eyebrow="Week 24" />
    </>
  );
}

const tabProps = {
  state: {
    index: 1,
    routes: ['home', 'timeline', 'tools', 'chat', 'profile'].map((name) => ({ key: `${name}-key`, name })),
  },
  emitter: { emit: () => ({ defaultPrevented: false }) },
  navigateToTab: noop,
} as unknown as React.ComponentProps<typeof TabBar>;

let showToast: (m: string, k?: 'success' | 'error') => void = () => {};
function ToastGrabber() {
  showToast = useToast().show;
  return null;
}

async function renderIn(app: Scheme, ui: React.ReactElement) {
  mockPhoneScheme = 'light';
  await AsyncStorage.setItem('app_theme_mode', app);
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => AsyncStorage.clear());

describe.each(['light', 'dark'] as const)('kit look (iOS / web) — %s', (scheme) => {
  it('components', async () => {
    const r = await renderIn(scheme, <Gallery />);
    expect(look(r)).toMatchSnapshot();
  });

  it('tab bar', async () => {
    const r = await renderIn(scheme, <TabBar {...tabProps} />);
    expect(look(r)).toMatchSnapshot();
  });

  it('sheet', async () => {
    const r = await renderIn(
      scheme,
      <Sheet visible onClose={noop} title="Sheet title" subtitle="Subtitle" footer={<Button title="Done" fullWidth onPress={noop} />}>
        <RNText>Body</RNText>
      </Sheet>
    );
    expect(look(r)).toMatchSnapshot();
  });

  it('toast', async () => {
    const r = await renderIn(
      scheme,
      <ToastProvider>
        <ToastGrabber />
      </ToastProvider>
    );
    const now = jest.spyOn(Date, 'now').mockReturnValue(1);
    jest.useFakeTimers();
    try {
      await act(async () => showToast('Visit saved'));
      expect(look(r)).toMatchSnapshot();
      await act(async () => jest.runOnlyPendingTimers()); // the toast's auto-hide timer
    } finally {
      jest.useRealTimers();
      now.mockRestore();
    }
  });
});
