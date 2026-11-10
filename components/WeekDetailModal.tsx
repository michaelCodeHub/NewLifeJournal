import { memo, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Theme, useTheme, useThemedStyles, RADIUS, SPACE } from '../context/ThemeContext';
import { getWeekInfo, peekWeekInfo, WeekInfo } from '../services/firebase/weekInfoService';
import { getPregnancyGrowthImage } from '../constants/pregnancyGrowthImages';
import { TOTAL_WEEKS, trimesterLabel } from '../lib/journal';
import {
  Card,
  EmptyState,
  IconButton,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
  TONES,
  Tone,
} from './ui';

type TabKey = 'baby' | 'you' | 'tips' | 'care';

const TABS: { value: TabKey; label: string }[] = [
  { value: 'baby', label: 'Baby' },
  { value: 'you', label: 'You' },
  { value: 'tips', label: 'Tips' },
  { value: 'care', label: 'Care' },
];

interface WeekDetailModalProps {
  visible: boolean;
  initialWeek: number;
  onClose: () => void;
}

const clampWeek = (w: number) => Math.min(TOTAL_WEEKS, Math.max(1, Math.round(w) || 1));

export default function WeekDetailModal({ visible, initialWeek, onClose }: WeekDetailModalProps) {
  const styles = useThemedStyles(makeStyles);
  const { height: screenH } = useWindowDimensions();

  const [week, setWeek] = useState(() => clampWeek(initialWeek));
  const [tab, setTab] = useState<TabKey>('baby');
  // The last fetched result, tagged with the week it belongs to. Content is only
  // shown when the tag matches the selected week, so a slow response for an
  // earlier week can never paint over the week the user has paged to.
  const [fetched, setFetched] = useState<{ week: number; info: WeekInfo | null } | null>(null);

  // Reset to the requested week each time the sheet opens. Done during render
  // (not in an effect) so the first opening frame already shows the right week.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setWeek(clampWeek(initialWeek));
      setTab('baby');
    }
  }

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const warmNeighbours = () => {
      if (week > 1) getWeekInfo(week - 1);
      if (week < TOTAL_WEEKS) getWeekInfo(week + 1);
    };
    if (peekWeekInfo(week)) {
      warmNeighbours();
      return;
    }
    getWeekInfo(week).then((info) => {
      if (cancelled) return;
      setFetched({ week, info });
      warmNeighbours();
    });
    return () => {
      cancelled = true;
    };
  }, [week, visible]);

  const cached = peekWeekInfo(week);
  const info = cached ?? (fetched?.week === week ? fetched.info : null);
  const loading = !cached && fetched?.week !== week;

  const step = (delta: number) => setWeek((w) => clampWeek(w + delta));

  return (
    <Sheet visible={visible} onClose={onClose} title={`Week ${week}`} subtitle={`${trimesterLabel(week)} · ${week} of ${TOTAL_WEEKS}`}>
      <View style={[styles.body, { minHeight: Math.round(screenH * 0.62) }]}>
        {/* Hero: stepper around the growth illustration */}
        <View style={styles.hero}>
          <IconButton
            name="chevron-back"
            variant="outline"
            onPress={() => step(-1)}
            disabled={week <= 1}
            accessibilityLabel="Previous week"
          />
          <View style={styles.heroCenter}>
            <View style={styles.frame}>
              <Image
                source={getPregnancyGrowthImage(week)}
                style={styles.image}
                contentFit="contain"
                transition={200}
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={styles.size}>
              <Text variant="caption" color="textMuted">
                Size
              </Text>
              {loading ? (
                <Skeleton width={110} height={18} />
              ) : (
                <Text variant="headline" align="center" numberOfLines={1}>
                  {info?.babySize || '—'}
                </Text>
              )}
            </View>
          </View>
          <IconButton
            name="chevron-forward"
            variant="outline"
            onPress={() => step(1)}
            disabled={week >= TOTAL_WEEKS}
            accessibilityLabel="Next week"
          />
        </View>

        <SegmentedControl options={TABS} value={tab} onChange={setTab} />

        {loading ? (
          <LoadingBody />
        ) : !info ? (
          <Card>
            <EmptyState
              icon="cloud-offline-outline"
              tone="neutral"
              title={`No details for week ${week}`}
              body="Week content hasn't been loaded yet. Check your connection and try again."
            />
          </Card>
        ) : (
          <TabBody tab={tab} info={info} />
        )}
      </View>
    </Sheet>
  );
}

/* --------------------------------------------------------------- content */

const TabBody = memo(function TabBody({ tab, info }: { tab: TabKey; info: WeekInfo }) {
  if (tab === 'baby') {
    return (
      <>
        <StatsRow info={info} />
        <BulletSection title="Development" items={info.babyDevelopment} tone="teal" empty="No development notes for this week." />
      </>
    );
  }
  if (tab === 'you') {
    return <BulletSection title="Your body" items={info.motherChanges} tone="plum" empty="No body changes noted for this week." />;
  }
  if (tab === 'tips') {
    const reminders = (info.dailyTips ?? []).map((t) => (t.subtitle ? `${t.title}: ${t.subtitle}` : t.title));
    return (
      <>
        <BulletSection title="Tips for this week" items={info.tips} tone="gold" empty="No tips for this week." />
        {reminders.length > 0 ? <BulletSection title="Daily reminders" items={reminders} tone="blue" /> : null}
      </>
    );
  }
  const care = info.pregnancyInfo;
  const hasCare = !!care && (care.milestones.length > 0 || care.appointments.length > 0 || care.tests.length > 0);
  if (!care || !hasCare) {
    return (
      <Card>
        <EmptyState
          icon="medkit-outline"
          tone="green"
          title="No care notes yet"
          body="Appointments, tests and milestones for this week will show here."
        />
      </Card>
    );
  }
  return (
    <>
      {care.milestones.length > 0 ? <BulletSection title="Milestones" items={care.milestones} tone="gold" /> : null}
      {care.appointments.length > 0 ? <BulletSection title="Appointments to expect" items={care.appointments} tone="green" /> : null}
      {care.tests.length > 0 ? <BulletSection title="Tests and screenings" items={care.tests} tone="blue" /> : null}
    </>
  );
});

function StatsRow({ info }: { info: WeekInfo }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.stats}>
      <Stat label="Length" value={info.babyLength} />
      <View style={styles.statDivider} />
      <Stat label="Weight" value={info.babyWeight} />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="headline" numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

function BulletSection({ title, items, tone, empty }: { title: string; items?: string[]; tone: Tone; empty?: string }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const list = items ?? [];
  if (list.length === 0 && !empty) return null;
  const dotColor = tone === 'teal' ? colors.primary : colors[TONES[tone].fg];
  return (
    <View>
      <SectionHeader title={title} />
      <Card style={{ gap: SPACE.md }}>
        {list.length === 0 ? (
          <Text variant="callout" color="textMuted">
            {empty}
          </Text>
        ) : (
          list.map((item, i) => (
            <View key={i} style={styles.bullet}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                {item}
              </Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function LoadingBody() {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Card style={styles.stats}>
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <Skeleton width={48} height={12} />
          <Skeleton width="70%" height={18} />
        </View>
        <View style={styles.statDivider} />
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <Skeleton width={48} height={12} />
          <Skeleton width="70%" height={18} />
        </View>
      </Card>
      <Card style={{ gap: SPACE.md }}>
        <Skeleton width="88%" />
        <Skeleton width="72%" />
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </Card>
    </>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    body: { gap: SPACE.lg },
    hero: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    heroCenter: { flex: 1, alignItems: 'center', gap: SPACE.sm },
    frame: {
      width: 132,
      height: 132,
      borderRadius: RADIUS.xl,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: { width: 108, height: 108 },
    size: { alignItems: 'center', gap: 2, minHeight: 38 },
    stats: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    statDivider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', backgroundColor: colors.border },
    bullet: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  });
