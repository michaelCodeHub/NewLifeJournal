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
8. **Lists:** use `FlatList`/`SectionList` (or `@shopify/flash-list`) for anything that can grow; never a `FlatList` inside a
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
| Inputs | `TextField`, `SelectField` (+ `OptionSheet`), `DateField`, `Chip`, `SegmentedControl` |
| Empty | `<EmptyState icon title body action />` (inside a `Card`) |
| Loading content | `<Skeleton width height />` |
| Progress | `<ProgressBar value={0..1} tone />` |

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
