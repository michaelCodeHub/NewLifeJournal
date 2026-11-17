# Bloom & Bump UI kit

Direction: **Linear × Plum**. Calm, precise, quiet, compact (14px body, 40px inputs, 38px buttons — see `CONTROL` tokens). Cool near-white canvas, white
surfaces separated by hairline borders (not heavy shadows), Inter on a strict
type scale, soft tinted icon tiles for categories, brand teal used sparingly for
what you can act on. Every screen must work in light **and** dark.

Reference screens (copy their structure):
`app/(pregnancy)/(tabs)/home.tsx`, `timeline.tsx`, `tools.tsx`, `profile.tsx`,
`app/(pregnancy)/visits.tsx`, `symptoms.tsx`, `app/(auth)/login.tsx`.

## Hard rules

1. **No hex colors in screens.** Use `useTheme().colors.*` or a component's `color`/`tone` prop.
2. **No raw `<Text>` from react-native.** Use `Text` from `components/ui` with a `variant`
   (`display, title1, title2, headline, body, bodyMedium, callout, calloutMedium, footnote, caption, overline, number`)
   and a `color` token. No ad-hoc `fontSize`/`fontWeight`.
3. **No `TouchableOpacity`.** Use `PressableScale`, `Button`, `IconButton`, `Card onPress`, `ListRow onPress`.
4. **No hand-rolled modals/pickers.** Use `Sheet`, `OptionSheet`, `ConfirmSheet`. Never `Alert.alert`
   (it is a no-op on web) — use `ConfirmSheet` for confirmation and `useToast().show(msg, 'success'|'error')` for feedback.
5. **Styles are built once per theme:** `const styles = useThemedStyles(makeStyles)` with
   `const makeStyles = ({ colors }: Theme) => StyleSheet.create({...})` outside the component.
6. **Spacing/radius from tokens:** `SPACE.{xs,sm,md,lg,xl,xxl,xxxl}`, `RADIUS.{sm,md,lg,xl,pill}`, `GUTTER` (20).
7. **Every hook above every early return.** Loading/empty states via `<ScreenState loading />` or `<ScreenState title body icon action />`.
8. **Lists:** use `FlatList`/`SectionList` for anything that can grow; never a `FlatList` inside a
   `ScrollView`. Memoize row components (`memo`) and handlers (`useCallback`), derive data with `useMemo`.
9. **Images:** `Image` from `expo-image` with `contentFit` and `transition={200}`.
10. **Icon-only buttons need `accessibilityLabel`.** `IconButton` requires it.
11. **Haptics:** `PressableScale` already does a light tap. Use `haptics.medium()` from `lib/haptics` for meaningful
    events (kick counted, contraction start/stop, item checked).
12. **Timers:** compute elapsed time from a stored start timestamp (`Date.now() - startedAt`), never `setInterval(prev + 1)`.

## Building blocks

| Need | Use |
|---|---|
| Screen scaffold | `<Screen header={{ title, right }}>` for tabs (a fixed 64px block, identical on every tab so nothing jumps: bold 26px title, optional `eyebrow` line above it, and plain `<HeaderAction>` icons on the right), `header={{ variant: 'bar', title }}` for pushed screens (adds back button). `scroll={false}` when you render your own list; `footer` for a pinned bar. |
| Group of settings/rows | `<Card padded={false}>` + `<ListRow icon tone title subtitle value right onPress last />` |
| Section label | `<SectionHeader title="..." action="See all" onAction={...} />` |
| Category marker | `<IconTile name="..." tone="teal|green|orange|red|gold|plum|blue|neutral" />` |
| Status | `<Pill label tone icon />` |
| Actions | `<Button title variant="primary|secondary|ghost|danger|tinted" size="lg|md|sm" icon loading fullWidth />` |
| Inputs | `TextField`, `SelectMenu` (or `SelectField` + `OptionSheet`), `DateField`, `Chip`, `SegmentedControl`, `Switch` |
| Pick one of a few | `<SelectMenu label title options value onSelect />` — native menu for ≤ 10 simple options, sheet otherwise. Use `OptionSheet` directly only when the list opens from code (no field), e.g. a step in a flow. |
| On/off setting | `<ListRow title right={<Switch value onValueChange accessibilityLabel={title} />} chevron={false} />` — never react-native's `Switch` directly |
| Empty | `<EmptyState icon title body action />` (inside a `Card`) |
| Loading content | `<Skeleton width height />` |
| Progress | `<ProgressBar value={0..1} tone />` |

## Platform look: Material 3 on Android

The custom kit looks the same on iOS and web, and like Material 3 on Android, in our colours and Inter.
The difference lives in **kit tokens**, not in per-component styles:

- `kit()` (context/ThemeContext.tsx) returns `KIT_DEFAULT` on iOS / web and `KIT_ANDROID` on Android. It reads
  `Platform.OS` at render time (so tests can switch it). Components take shape, size and behaviour from it:
  button height / radius / padding / text, field height / radius / focus outline / supporting text, card radius and
  how `raised` lifts, chip and pill shape, sheet corners, row heights, toast shape, header and tab bar, empty state.
- Android: 40dp pill buttons (`labelLarge`), 56dp outlined fields with 4dp corners and a 2dp focus outline, hint and
  error under the field, 12dp tonal cards (`raised` = 1dp outline), 32dp / 8dp chips, 28dp sheet corners, 56 / 72dp
  rows, 4dp snackbar toast, 64dp top app bar with an arrow back, 80dp navigation bar with an active indicator,
  ripples (`colors.ripple`, `colors.rippleOnPrimary`) instead of scale/dim, and tonal surfaces instead of shadows.
- Never add `Platform.OS === 'android'` styling inside a component: add or use a kit token.
- `KIT_DEFAULT` must not change by accident: `__tests__/ui/kitLook.test.tsx` locks the iOS / web look (flattened
  styles, light and dark). `__tests__/ui/kitAndroid.test.tsx` checks the Material 3 values.
- Brand and contrast rules don't change: filled states are `primaryDark` with `onPrimary` text.
- Keyboard in sheets (Android): the app is edge-to-edge, so `Sheet` pads for the keyboard itself and lets the
  sheet and its body shrink; the body scrolls to the focused field. Keep `scroll` on (the default) for any sheet
  with text fields.
- Showcase: `newlifejournal://dev-controls` → "Kit components".

## Native vs custom controls

Some kit controls render real platform controls through `@expo/ui` (SwiftUI on iOS, Jetpack Compose
Material 3 on Android). Screens never import `@expo/ui` — they use the kit component, whose public props
are the same on every platform.

| Control | iOS | Android | Web |
|---|---|---|---|
| `Switch` | SwiftUI `Toggle` (switch style) | Material 3 `Switch` | react-native `Switch` |
| `SegmentedControl` | SwiftUI segmented `Picker` (system look) | Material 3 segmented buttons | custom (original) control |
| `DateField` | SwiftUI graphical `DatePicker` in the sheet, Done commits | Material 3 `DatePickerDialog` | custom calendar sheet |
| `DateTimeField` | SwiftUI graphical date + time picker in the sheet (quick chips kept) | sheet with quick chips + Date / Time rows opening Material 3 date and time dialogs | custom sheet (calendar + steppers) |
| `SelectMenu` (≤ 10 options, no descriptions) | SwiftUI `Menu` anchored to the field, checkmark on the selected option | Material 3 `DropdownMenu` under the field, selected item highlighted | field + `OptionSheet` |
| `SelectMenu` (longer or rich lists) | field + `OptionSheet` | field + `OptionSheet` | field + `OptionSheet` |
| Everything else (`Sheet`, `OptionSheet`, `SelectField`, `Button`, `Chip`, …) | custom | custom | custom |

Rules for native controls:

- **One file per platform:** `Name.ios.tsx`, `Name.android.tsx`, and `Name.tsx` for web. Metro picks the
  file per platform; `Name.tsx` is the web fallback and must stay a plain React Native implementation,
  because `@expo/ui`'s SwiftUI and Compose views don't render on web. Shared props live in
  `Name.types.ts` so the three can't drift.
- **Theme:** colours come from tokens, never hex. Filled/selected states use `primaryDark` with `onPrimary`
  (white on the brand `primary` teal is only 3:1). iOS's segmented control stays system-coloured because
  iOS can't recolour the selected label.
- **Light/dark:** wrap in `<Host colorScheme={resolvedTheme}>` (from `useTheme()`) so the control follows
  the app's ThemeMode, not just the phone setting.
- **Fonts:** native controls use the system font, not Inter. That's intended.
- **Menus:** native menus open only from their own trigger (iOS `Menu` can't be opened from code), so
  `OptionSheet` lists that open programmatically stay sheets. `SelectMenu` decides native vs sheet with
  `canUseNativeMenu` (≤ 10 options, no descriptions). Native menus show text only: option icons are not
  drawn (SF Symbols / drawables vs our Ionicons); the fallback sheet still shows them.
- **Dates:** go through `components/ui/dateValue.ts`. `DateField` stores the local day at local noon and
  compares min/max by local day; `DateTimeField` keeps the exact instant and clamps to the exact min/max.
  Android's Material 3 date picker works in UTC days: always convert with `toComposeDay` /
  `fromComposeDay`, never pass or read a raw `Date`. The clock follows the device 12/24-hour setting
  (`expo-localization` on Android). `__tests__/unit/dateValue.test.ts` runs each timezone in its own
  Node process (TZ can't change inside Jest).
- **iOS minimum is 16.4.** Check a SwiftUI API's availability in `node_modules/@expo/ui/ios` before using
  it; fall back to the custom control (runtime check) for anything newer.
- **Tests:** `@expo/ui` is mocked in `jest.setup.js` (native views become `ExpoUI.<Name>` host
  elements). Jest resolves the `.ios.tsx` file; require the `.android.tsx` / `.tsx` files explicitly to
  test them (see `__tests__/ui/Switch.test.tsx`).
- **Device check:** open `newlifejournal://dev-controls` on a dev build (`app/dev-controls.tsx`, dev only).

Semantic tones: visits = green, symptoms = orange, milestones = gold, kicks = plum, contractions = red, AI = teal.

Routes: tab screens live under `/(pregnancy)/(tabs)/{home,timeline,chat,tools,profile}`; everything else is
`/(pregnancy)/<name>` and is pushed on a native stack.

## Brand

Official artwork lives in `/BloomAndBump` (source) and `assets/brand/` (what the app bundles).
Never redraw the logo — use the components:

| Component | Use |
|---|---|
| `<BrandLogo height />` | Mark + serif wordmark (login, footers). Teal on light, white on dark. |
| `<BrandMark height />` | Silhouette only. |
| `<BrandTile size />` | App-icon look: white mark on the brand gradient (Home header, splash route, onboarding). |
| `<BrandGradient />` | The logo's gradient for hero surfaces (Home week card). Text on it is white. |

Brand teal is `#3AA3A9` (exact logo colour, token `primary`). Buttons and links use `primaryDark`
(`#227B81`), the same hue deepened so white text passes WCAG AA.

## Icons

One set only: **Ionicons** (`@expo/vector-icons`, Expo's built-in). Always render icons through
`<Icon name="..." />` from `components/ui/Icon` — never import Ionicons directly.

- Line style everywhere (`name="medkit-outline"`), Linear-style: never filled, not even the selected tab (selection = colour).
- Header buttons: `<HeaderAction>` — plain 20px icon, muted colour, soft square only while pressed. No circles or fills.
- Three sizes only: **16** (inline), **20** (rows, buttons), **22** (tab bar, top bar). Other values snap to these.
- One icon per feature, defined in the registry in `Icon.tsx` (e.g. visits = medkit, symptoms = thermometer,
  kicks = footsteps, contractions = timer). Add new ones there, don't pick ad hoc in screens.
