import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { RADIUS, SPACE, Theme, useTheme, useThemedStyles } from '../context/ThemeContext';
import { Avatar, Card, Chip, IconTile, Pill, Text } from './ui';
import { Icon } from './ui/Icon';

/**
 * Static sample content shown faded behind a Plus upsell, so a free user sees
 * what the feature looks like instead of an empty page. Purely decorative:
 * the gate renders it with pointer events and accessibility turned off.
 */
export type PremiumPreviewKind = 'charts' | 'birthplan' | 'export' | 'community' | 'sharetimeline';

export function PremiumPreview({ kind }: { kind: PremiumPreviewKind }) {
  switch (kind) {
    case 'charts':
      return <ChartsPreview />;
    case 'birthplan':
      return <BirthPlanPreview />;
    case 'export':
      return <ExportPreview />;
    case 'community':
      return <CommunityPreview />;
    case 'sharetimeline':
      return <SharePreview />;
  }
}

/* ----------------------------------------------------------------- charts */

function TrendLine({ points, color }: { points: number[]; color: string }) {
  const { colors } = useTheme();
  const w = 300;
  const h = 110;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 16) + 8, h - 12 - ((p - min) / (max - min || 1)) * (h - 28)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((f) => (
        <Line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke={colors.border} strokeWidth={1} />
      ))}
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 4 : 2.5} fill={color} />
      ))}
    </Svg>
  );
}

function ChartsPreview() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <Text variant="calloutMedium">Weight</Text>
          <Text variant="number" color="textPrimary">64.2 kg</Text>
        </View>
        <TrendLine points={[58.1, 58.6, 59.4, 60.4, 61.2, 61.9, 62.8, 63.5, 64.2]} color={colors.primary} />
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text variant="calloutMedium">Blood pressure</Text>
          <Text variant="number" color="textPrimary">112/72</Text>
        </View>
        <TrendLine points={[110, 108, 112, 109, 115, 110, 112, 111, 112]} color={colors.blue} />
      </Card>
    </View>
  );
}

/* -------------------------------------------------------------- birth plan */

function BirthPlanPreview() {
  const styles = useThemedStyles(makeStyles);
  const sections: { title: string; chips: string[]; picked: number[] }[] = [
    { title: 'Environment', chips: ['Dim lights', 'Music', 'Quiet room', 'Own pillow'], picked: [0, 1] },
    { title: 'Pain relief', chips: ['Breathing', 'Water', 'Gas and air', 'Epidural'], picked: [0, 1] },
    { title: 'After birth', chips: ['Skin to skin', 'Delayed cord clamping', 'Partner cuts cord'], picked: [0, 1] },
  ];
  return (
    <View style={styles.stack}>
      {sections.map((s) => (
        <Card key={s.title}>
          <Text variant="calloutMedium" style={styles.cardTitle}>{s.title}</Text>
          <View style={styles.chips}>
            {s.chips.map((c, i) => (
              <Chip key={c} label={c} selected={s.picked.includes(i)} />
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------------- export */

function ExportPreview() {
  const styles = useThemedStyles(makeStyles);
  const rows = [
    { icon: 'medkit-outline' as const, tone: 'green' as const, title: 'Checkup', meta: 'Week 21 · 64.2 kg · BP 112/72' },
    { icon: 'pulse-outline' as const, tone: 'green' as const, title: 'Anatomy scan', meta: 'Week 19 · All looks good' },
    { icon: 'flame-outline' as const, tone: 'orange' as const, title: 'Heartburn', meta: 'Week 20 · Noticeable' },
    { icon: 'star-outline' as const, tone: 'gold' as const, title: 'First kick felt', meta: 'Week 19' },
  ];
  return (
    <Card style={styles.paper}>
      <Text variant="overline" color="textMuted">Pregnancy report</Text>
      <Text variant="title2" style={styles.paperTitle}>Maya · Week 21</Text>
      <View style={styles.paperStats}>
        {[['5', 'Visits'], ['6', 'Symptoms'], ['1', 'Milestone']].map(([n, l]) => (
          <View key={l} style={styles.paperStat}>
            <Text variant="number">{n}</Text>
            <Text variant="caption" color="textMuted">{l}</Text>
          </View>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.title} style={styles.paperRow}>
          <IconTile name={r.icon} tone={r.tone} size={28} />
          <View style={{ flex: 1 }}>
            <Text variant="calloutMedium">{r.title}</Text>
            <Text variant="caption" color="textMuted">{r.meta}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

/* -------------------------------------------------------------- community */

function CommunityPreview() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const posts = [
    { name: 'Aisha K', meta: 'Week 24', body: 'Finally felt proper kicks last night while lying on my left side. Anyone else find evenings are busiest?', likes: 12, comments: 5 },
    { name: 'Sara M', meta: 'Week 31', body: 'Hospital bag tip: pack a long phone charger. The sockets are never near the bed.', likes: 28, comments: 9 },
  ];
  return (
    <View style={styles.stack}>
      {posts.map((p) => (
        <Card key={p.name}>
          <View style={styles.postHead}>
            <Avatar name={p.name} size={32} />
            <View style={{ flex: 1 }}>
              <Text variant="calloutMedium">{p.name}</Text>
              <Text variant="caption" color="textMuted">{p.meta}</Text>
            </View>
          </View>
          <Text variant="callout" color="textSecondary" style={styles.postBody}>{p.body}</Text>
          <View style={styles.postActions}>
            <View style={styles.postAction}>
              <Icon name="heart-outline" size={16} color={colors.textMuted} />
              <Text variant="caption" color="textMuted">{p.likes}</Text>
            </View>
            <View style={styles.postAction}>
              <Icon name="chatbubble-outline" size={16} color={colors.textMuted} />
              <Text variant="caption" color="textMuted">{p.comments}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------- share timeline */

function SharePreview() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card>
      <Text variant="overline" color="textMuted">Our journey so far</Text>
      <Text variant="title2" style={styles.paperTitle}>Baby Olive · Week 21</Text>
      {[
        { week: 'Week 20', items: [['star-outline', 'gold', 'First kick felt']] },
        { week: 'Week 19', items: [['pulse-outline', 'green', 'Anatomy scan'], ['heart-outline', 'plum', 'Heard the heartbeat']] },
      ].map((g) => (
        <View key={g.week} style={styles.shareGroup}>
          <Pill label={g.week} tone="neutral" />
          {g.items.map(([icon, tone, title]) => (
            <View key={title} style={styles.paperRow}>
              <IconTile name={icon as any} tone={tone as any} size={28} />
              <Text variant="calloutMedium">{title}</Text>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    stack: { gap: SPACE.md },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACE.sm },
    cardTitle: { marginBottom: SPACE.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
    paper: { borderRadius: RADIUS.xl },
    paperTitle: { marginTop: SPACE.xs, marginBottom: SPACE.md },
    paperStats: {
      flexDirection: 'row',
      gap: SPACE.sm,
      paddingVertical: SPACE.md,
      marginBottom: SPACE.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    paperStat: { flex: 1 },
    paperRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm },
    postHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    postBody: { marginTop: SPACE.md },
    postActions: { flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.md },
    postAction: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
    shareGroup: { gap: SPACE.xs, marginTop: SPACE.sm },
  });
