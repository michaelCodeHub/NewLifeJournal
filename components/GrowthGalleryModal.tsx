import { ComponentRef, memo, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Theme, useThemedStyles, GUTTER, RADIUS, SPACE } from '../context/ThemeContext';
import { getWeekInfo, peekWeekInfo, WeekInfo } from '../services/firebase/weekInfoService';
import { PREGNANCY_WEEK_COUNT, getPregnancyGrowthImage } from '../constants/pregnancyGrowthImages';
import { trimesterLabel } from '../lib/journal';
import { Card, IconButton, Pill, PressableScale, ProgressBar, SectionHeader, Skeleton, Text } from './ui';

interface GrowthGalleryModalProps {
  visible: boolean;
  /** The pregnancy's current week — used to pick the initial week. */
  currentWeek: number;
  /** Open on this week instead of the current one (e.g. a tapped week story). */
  initialWeek?: number;
  onClose: () => void;
}

const PILL = 44;
const PILL_GAP = SPACE.sm;
const WEEKS = Array.from({ length: PREGNANCY_WEEK_COUNT }, (_, i) => i + 1);

const clampWeek = (w: number) => Math.min(PREGNANCY_WEEK_COUNT, Math.max(1, Math.round(w) || 1));

export default function GrowthGalleryModal({ visible, currentWeek, initialWeek, onClose }: GrowthGalleryModalProps) {
  const styles = useThemedStyles(makeStyles);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const today = clampWeek(currentWeek);

  const [week, setWeek] = useState(today);
  const [fetched, setFetched] = useState<{ week: number; info: WeekInfo | null } | null>(null);
  const stripRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const stripWidth = useRef(0);
  const weekRef = useRef(week);
  weekRef.current = week;

  // Jump to the current week each time the gallery opens, during render so
  // the very first frame already shows it.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setWeek(initialWeek ? clampWeek(initialWeek) : today);
  }

  // Week info: instant from cache, otherwise fetched and tagged with its week
  // so a late response for a week the user has already left is ignored.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const warmNeighbours = () => {
      if (week > 1) getWeekInfo(week - 1);
      if (week < PREGNANCY_WEEK_COUNT) getWeekInfo(week + 1);
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

  /* ------------------------------------------------------------ pill strip */

  const scrollStripTo = useCallback((w: number, animated: boolean) => {
    if (!stripWidth.current) return;
    const x = GUTTER + (w - 1) * (PILL + PILL_GAP) + PILL / 2 - stripWidth.current / 2;
    stripRef.current?.scrollTo({ x: Math.max(0, x), animated });
  }, []);

  // Set on every open; the strip centres the selected week (without animating)
  // as soon as it has a width, which covers both first mount and re-opens.
  const pendingCentre = useRef(true);

  const onStripLayout = useCallback(
    (e: LayoutChangeEvent) => {
      stripWidth.current = e.nativeEvent.layout.width;
      if (pendingCentre.current) {
        pendingCentre.current = false;
        requestAnimationFrame(() => scrollStripTo(weekRef.current, false));
      }
    },
    [scrollStripTo]
  );

  const wasOpen = useRef(false);
  useEffect(() => {
    if (!visible) {
      wasOpen.current = false;
      return;
    }
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    if (justOpened) pendingCentre.current = true;
    // Already laid out (still mounted): scroll now. Otherwise onStripLayout does it.
    requestAnimationFrame(() => scrollStripTo(week, !justOpened));
  }, [week, visible, scrollStripTo]);

  const selectWeek = useCallback((w: number) => setWeek(clampWeek(w)), []);

  const frameSize = Math.min(screenW - GUTTER * 2, Math.round(screenH * 0.4), 420);
  const isToday = week === today;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="overline" color="textMuted">
              Baby growth
            </Text>
            <Text variant="title1" tabular>
              Week {week}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {trimesterLabel(week)}
            </Text>
          </View>
          <IconButton name="close" onPress={onClose} accessibilityLabel="Close growth gallery" />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Illustration */}
          <View style={[styles.frame, { width: frameSize, height: frameSize }]}>
            <Image
              source={getPregnancyGrowthImage(week)}
              style={styles.image}
              contentFit="contain"
              transition={200}
              accessibilityLabel={`Baby growth illustration, week ${week}`}
              accessibilityIgnoresInvertColors
            />
            {isToday ? (
              <View style={styles.badge}>
                <Pill label="You are here" tone="teal" icon="location-outline" />
              </View>
            ) : null}
          </View>

          {/* Stepper */}
          <View style={styles.stepper}>
            <IconButton
              name="chevron-back"
              variant="outline"
              onPress={() => selectWeek(week - 1)}
              disabled={week <= 1}
              accessibilityLabel="Previous week"
            />
            <View style={styles.stepperCenter}>
              <Text variant="caption" color="textMuted" tabular>
                Week {week} of {PREGNANCY_WEEK_COUNT}
              </Text>
              <ProgressBar value={week / PREGNANCY_WEEK_COUNT} height={4} />
            </View>
            <IconButton
              name="chevron-forward"
              variant="outline"
              onPress={() => selectWeek(week + 1)}
              disabled={week >= PREGNANCY_WEEK_COUNT}
              accessibilityLabel="Next week"
            />
          </View>

          {/* Stats */}
          <Card style={styles.stats}>
            <Stat label="Size" value={info?.babySize} loading={loading} />
            <View style={styles.statDivider} />
            <Stat label="Length" value={info?.babyLength} loading={loading} />
            <View style={styles.statDivider} />
            <Stat label="Weight" value={info?.babyWeight} loading={loading} />
          </Card>

          {/* Development */}
          <View>
            <SectionHeader title="What's happening this week" />
            <Card style={{ gap: SPACE.md }}>
              {loading ? (
                <>
                  <Skeleton width="86%" />
                  <Skeleton width="70%" />
                  <Skeleton width="78%" />
                </>
              ) : info && info.babyDevelopment?.length > 0 ? (
                info.babyDevelopment.map((item, i) => (
                  <View key={i} style={styles.bullet}>
                    <View style={styles.dot} />
                    <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                      {item}
                    </Text>
                  </View>
                ))
              ) : (
                <Text variant="callout" color="textMuted">
                  Development details aren&apos;t available for this week yet.
                </Text>
              )}
            </Card>
          </View>
        </ScrollView>

        {/* Week strip */}
        <View style={styles.stripWrap}>
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={onStripLayout}
            contentContainerStyle={styles.strip}
          >
            {WEEKS.map((w) => (
              <WeekPill key={w} week={w} active={w === week} current={w === today} onSelect={selectWeek} />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const WeekPill = memo(function WeekPill({
  week,
  active,
  current,
  onSelect,
}: {
  week: number;
  active: boolean;
  current: boolean;
  onSelect: (w: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      haptic="selection"
      scaleTo={0.92}
      onPress={() => onSelect(week)}
      accessibilityLabel={`Week ${week}${current ? ', current week' : ''}`}
      accessibilityState={{ selected: active }}
      style={[styles.pill, active ? styles.pillActive : current ? styles.pillCurrent : null]}
    >
      <Text variant="calloutMedium" tabular color={active ? 'onPrimary' : current ? 'primaryDark' : 'textSecondary'}>
        {week}
      </Text>
    </PressableScale>
  );
});

function Stat({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      {loading ? (
        <Skeleton width="70%" height={16} />
      ) : (
        <Text variant="calloutMedium" numberOfLines={1}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACE.md,
      paddingHorizontal: GUTTER,
      paddingTop: SPACE.md,
      paddingBottom: SPACE.lg,
    },
    body: { paddingHorizontal: GUTTER, paddingBottom: SPACE.xxl, gap: SPACE.xl },
    frame: {
      alignSelf: 'center',
      borderRadius: RADIUS.xl,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: { width: '82%', height: '82%' },
    badge: { position: 'absolute', top: SPACE.md, left: SPACE.md },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
    stepperCenter: { flex: 1, gap: SPACE.sm, alignItems: 'stretch' },
    stats: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    statDivider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', backgroundColor: colors.border },
    bullet: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
    stripWrap: {
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    strip: { paddingHorizontal: GUTTER, paddingVertical: SPACE.md, gap: PILL_GAP },
    pill: {
      width: PILL,
      height: PILL,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
    },
    pillActive: { backgroundColor: colors.primaryDark },
    pillCurrent: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primaryDark },
  });
