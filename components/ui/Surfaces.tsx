import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme, RADIUS, SPACE, elevation, ThemeColors, kit } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/* ------------------------------------------------------------------ Card */

export interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  /** `plain` = border only (default). `raised` = soft shadow too. `tinted` = no border, tint fill. */
  tone?: 'plain' | 'raised' | 'tinted';
  tint?: keyof ThemeColors;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ onPress, padded = true, tone = 'plain', tint, style, children, accessibilityLabel, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  const k = kit().card;
  // Material 3 (Android) prefers tonal surfaces: `raised` becomes a 1dp outline, no shadow.
  const outlined = tone === 'raised' && k.raised === 'outline';
  const base: ViewStyle = {
    backgroundColor: tone === 'tinted' && tint ? colors[tint] : colors.card,
    borderRadius: k.radius,
    // Soft-filled cards on the white canvas: no border, no shadow, so content
    // blends into the page instead of sitting in boxes. Only `raised` lifts.
    borderWidth: outlined ? 1 : 0,
    borderColor: colors.border,
    padding: padded ? SPACE.lg : 0,
    ...(tone === 'raised' && !outlined ? elevation(isDark, 2) : null),
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, style]} accessibilityLabel={accessibilityLabel} {...(rest as any)}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

/* -------------------------------------------------------------- IconTile */

export type Tone = 'teal' | 'green' | 'orange' | 'red' | 'gold' | 'plum' | 'blue' | 'neutral';

export const TONES: Record<Tone, { fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  teal: { fg: 'primaryDark', bg: 'primaryLight' },
  green: { fg: 'green', bg: 'greenTint' },
  orange: { fg: 'orange', bg: 'orangeTint' },
  red: { fg: 'red', bg: 'redTint' },
  gold: { fg: 'gold', bg: 'goldTint' },
  plum: { fg: 'plum', bg: 'plumTint' },
  blue: { fg: 'blue', bg: 'blueTint' },
  neutral: { fg: 'textSecondary', bg: 'surfaceSecondary' },
};

/** Soft-tinted rounded square with a line icon (the Plum-style category marker). */
export function IconTile({
  name,
  tone = 'teal',
  size = 36,
}: {
  name: IconName;
  tone?: Tone;
  size?: number;
}) {
  const { colors } = useTheme();
  const t = TONES[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: colors[t.bg],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={colors[t.fg]} />
    </View>
  );
}

/* ------------------------------------------------------------------ Pill */

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const { colors } = useTheme();
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors[t.bg], borderRadius: kit().pill.radius }]}>
      {icon ? <Icon name={icon} size={12} color={colors[t.fg]} /> : null}
      <Text variant="caption" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

/* --------------------------------------------------------------- ListRow */

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  tone?: Tone;
  /** Text shown on the right (a value). */
  value?: string;
  /** Custom right element (switch, pill...). */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Show the chevron. Defaults to true when `onPress` is set. */
  chevron?: boolean;
  destructive?: boolean;
  /** Hide the divider under this row (last row in a group). */
  last?: boolean;
  /** Show the icon inside a tinted tile (use for semantic categories only). */
  tile?: boolean;
  accessibilityLabel?: string;
}

/** Settings-style row. Put several inside a <Card padded={false}> to make a grouped list. */
export function ListRow({
  title,
  subtitle,
  icon,
  tone = 'teal',
  value,
  right,
  onPress,
  chevron,
  destructive,
  last,
  tile,
  accessibilityLabel,
}: ListRowProps) {
  const { colors } = useTheme();
  const k = kit().row;
  const showChevron = chevron ?? !!onPress;
  const content = (
    <View style={styles.row}>
      {icon ? (
        tile ? (
          <IconTile name={icon} tone={destructive ? 'red' : tone} size={30} />
        ) : (
          // Instagram-style: a plain line icon, not a coloured square.
          <Icon name={icon} size={20} color={destructive ? colors.red : colors.textPrimary} />
        )
      ) : null}
      <View
        style={[
          styles.rowBody,
          { minHeight: subtitle ? k.twoLineMinHeight : k.minHeight, paddingVertical: k.paddingVertical },
          !last && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.rowText}>
          <Text variant="body" color={destructive ? 'red' : 'textPrimary'} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="footnote" color="textMuted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="callout" color="textMuted" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {right}
        {showChevron ? <Icon name="chevron-forward" size={14} color={colors.textMuted} /> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={accessibilityLabel ?? title}>
      {content}
    </PressableScale>
  );
}

/* -------------------------------------------------------- SectionHeader */

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="headline" color="textPrimary">
        {title}
      </Text>
      {action && onAction ? (
        <PressableScale onPress={onAction} hitSlop={10} scaleTo={0.94}>
          <Text variant="callout" color="primaryDark">
            {action}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = 'teal',
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
  tone?: Tone;
}) {
  const { colors } = useTheme();
  const k = kit().empty;
  const t = TONES[tone];
  return (
    <View style={styles.empty}>
      {k.iconRound ? (
        // Material 3 (Android): the icon in a round tonal container.
        <View
          style={{
            width: k.iconSize,
            height: k.iconSize,
            borderRadius: k.iconSize / 2,
            backgroundColor: colors[t.bg],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={Math.round(k.iconSize * 0.5)} color={colors[t.fg]} />
        </View>
      ) : (
        <IconTile name={icon} tone={tone} size={k.iconSize} />
      )}
      <Text variant="headline" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="callout" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: SPACE.sm }}>{action}</View> : null}
    </View>
  );
}

/* ----------------------------------------------------------- ProgressBar */

export function ProgressBar({ value, tone = 'teal', height = 6 }: { value: number; tone?: Tone; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  const fg = tone === 'teal' ? colors.primary : colors[TONES[tone].fg];
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.surfaceTertiary, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: fg }} />
    </View>
  );
}

/* ---------------------------------------------------------------- Avatar */

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const { colors } = useTheme();
  const initials =
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join('') || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={size > 44 ? 'title2' : 'calloutMedium'} color="primaryDark">
        {initials}
      </Text>
    </View>
  );
}

/* --------------------------------------------------------------- Divider */

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginLeft: inset }} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: SPACE.lg, gap: SPACE.md },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingRight: SPACE.lg,
  },
  rowText: { flex: 1, gap: 1 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md - 2,
    paddingHorizontal: 2,
  },
  empty: { alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xxxl, paddingHorizontal: SPACE.xxl },
});
