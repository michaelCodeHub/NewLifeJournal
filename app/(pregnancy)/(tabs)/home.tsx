import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { usePregnancy } from '../../../context/PregnancyContext';
import { useAuth } from '../../../context/AuthContext';
import { Theme, useThemedStyles, useTheme, SPACE, RADIUS, GUTTER, elevation } from '../../../context/ThemeContext';
import { getWeekInfo, peekWeekInfo, WeekInfo } from '../../../services/firebase/weekInfoService';
import WeekDetailModal from '../../../components/WeekDetailModal';
import GrowthGalleryModal from '../../../components/GrowthGalleryModal';
import { getPregnancyGrowthImage } from '../../../constants/pregnancyGrowthImages';
import { greeting, longDate, TOTAL_WEEKS, trimesterLabel } from '../../../lib/journal';
import {
  BrandGradient,
  Button,
  Card,
  Header,
  HeaderAction,
  PressableScale,
  ScreenState,
  SectionHeader,
  Skeleton,
  Text,
} from '../../../components/ui';
import { Icon, IconName } from '../../../components/ui/Icon';

/** Ink on the brand gradient (theme-independent: the gradient is the brand). */
const HERO = {
  ink: '#FFFFFF',
  soft: 'rgba(255,255,255,0.86)',
  faint: 'rgba(255,255,255,0.62)',
  line: 'rgba(255,255,255,0.22)',
  fill: 'rgba(255,255,255,0.16)',
};

/**
 * Home: one calm column, read top to bottom.
 *   1. who/what week   2. the week card   3. log something   4. this week, in plain words
 */
export default function PregnancyHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pregnancy, loading, error, getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const { user } = useAuth();

  const week = getCurrentWeek();
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(() => (week ? peekWeekInfo(week) : null));
  const [weekInfoLoading, setWeekInfoLoading] = useState(!weekInfo);
  const [showWeekDetail, setShowWeekDetail] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (!week) return;
    let cancelled = false;
    setWeekInfoLoading(!peekWeekInfo(week));
    getWeekInfo(week).then((info) => {
      if (cancelled) return;
      setWeekInfo(info);
      setWeekInfoLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [week]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState title="Couldn't load your journal" body={error} icon="cloud-offline-outline" />;
  if (!pregnancy) {
    return (
      <ScreenState
        icon="leaf-outline"
        title="No active pregnancy"
        body="Set up your pregnancy to see your week-by-week journey."
        action={<Button title="Set up pregnancy" onPress={() => router.push('/(onboarding)/create-pregnancy')} />}
      />
    );
  }

  const daysUntilDue = getDaysUntilDue();
  const firstName = (pregnancy.motherName || user?.displayName || '').split(' ')[0];
  const dueDate = pregnancy.dueDate.toDate();
  const progress = Math.min(1, week / TOTAL_WEEKS);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        brand
        title="Bloom & Bump"
        right={
          <HeaderAction
            name="notifications-outline"
            onPress={() => router.push('/(pregnancy)/notifications')}
            accessibilityLabel="Reminders"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="title2">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>

        {/* Week card */}
        <PressableScale
          scaleTo={0.985}
          onPress={() => setShowGallery(true)}
          accessibilityLabel={`Week ${week}. See how your baby is growing`}
          style={styles.heroShadow}
        >
          <BrandGradient style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1, gap: SPACE.sm }}>
                <View style={styles.heroChip}>
                  <Text variant="caption" style={{ color: HERO.ink }}>
                    {trimesterLabel(week)}
                  </Text>
                </View>
                <View style={styles.weekRow}>
                  <Text variant="display" tabular style={{ color: HERO.ink }}>
                    Week {week}
                  </Text>
                  <Text variant="callout" style={{ color: HERO.soft }}>
                    {' '}of {TOTAL_WEEKS}
                  </Text>
                </View>
                <Text variant="callout" style={{ color: HERO.soft }}>
                  {daysUntilDue > 0
                    ? `${daysUntilDue} days to go · Due ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                    : `Due date reached · ${longDate(dueDate)}`}
                </Text>
              </View>
              <View style={styles.babyFrame}>
                <Image
                  source={getPregnancyGrowthImage(week)}
                  style={styles.babyImage}
                  contentFit="contain"
                  transition={200}
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>

            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.heroStats}>
              <HeroStat label="Size" value={weekInfo?.babySize} loading={weekInfoLoading} />
              <View style={styles.heroStatDivider} />
              <HeroStat label="Length" value={weekInfo?.babyLength} loading={weekInfoLoading} />
              <View style={styles.heroStatDivider} />
              <HeroStat label="Weight" value={weekInfo?.babyWeight} loading={weekInfoLoading} />
            </View>
          </BrandGradient>
        </PressableScale>

        {/* Log something */}
        <View>
          <SectionHeader title="Log today" />
          <View style={styles.shortcuts}>
            <Shortcut icon="thermometer-outline" label="Symptom" onPress={() => router.push({ pathname: '/(pregnancy)/symptoms', params: { add: '1' } })} />
            <Shortcut icon="medkit-outline" label="Visit" onPress={() => router.push({ pathname: '/(pregnancy)/visits', params: { add: '1' } })} />
            <Shortcut icon="footsteps-outline" label="Kicks" onPress={() => router.push('/(pregnancy)/kickcounter')} />
            <Shortcut icon="timer-outline" label="Contractions" onPress={() => router.push('/(pregnancy)/contractiontimer')} />
          </View>
        </View>

        {/* This week, in plain words */}
        <View>
          <SectionHeader title="Your baby this week" action="More" onAction={() => setShowWeekDetail(true)} />
          <Card onPress={() => setShowWeekDetail(true)} accessibilityLabel="Read more about this week">
            {weekInfoLoading ? (
              <View style={{ gap: SPACE.sm }}>
                <Skeleton width="85%" />
                <Skeleton width="70%" />
                <Skeleton width="78%" />
              </View>
            ) : weekInfo && weekInfo.babyDevelopment.length > 0 ? (
              <View style={{ gap: SPACE.sm + 2 }}>
                {weekInfo.babyDevelopment.slice(0, 3).map((item, i) => (
                  <View key={i} style={styles.bullet}>
                    <View style={styles.dot} />
                    <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text variant="body" color="textMuted">
                Weekly notes will appear here.
              </Text>
            )}
          </Card>
        </View>
      </ScrollView>

      <WeekDetailModal visible={showWeekDetail} initialWeek={week} onClose={() => setShowWeekDetail(false)} />
      <GrowthGalleryModal visible={showGallery} currentWeek={week} onClose={() => setShowGallery(false)} />
    </View>
  );
}

function HeroStat({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" style={{ color: HERO.faint }}>
        {label}
      </Text>
      {loading ? (
        <View style={{ width: '70%', height: 16, borderRadius: 6, backgroundColor: HERO.line }} />
      ) : (
        <Text variant="calloutMedium" numberOfLines={1} style={{ color: HERO.ink }}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} accessibilityLabel={`Log ${label.toLowerCase()}`} style={shortcutStyles.item}>
      <View style={[shortcutStyles.circle, { backgroundColor: colors.primaryLight }]}>
        <Icon name={icon} size={22} color={colors.primaryDark} />
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const shortcutStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: SPACE.sm },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

const makeStyles = ({ colors, isDark }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    body: { paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.huge, gap: SPACE.xxl },
    heroShadow: { borderRadius: RADIUS.xl, ...elevation(isDark, 2) },
    hero: { gap: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    heroChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: SPACE.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: HERO.fill,
    },
    weekRow: { flexDirection: 'row', alignItems: 'baseline' },
    babyFrame: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(255,255,255,0.94)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    babyImage: { width: 68, height: 68 },
    heroTrack: { height: 5, borderRadius: 3, backgroundColor: HERO.line, overflow: 'hidden' },
    heroFill: { height: '100%', borderRadius: 3, backgroundColor: HERO.ink },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      paddingTop: SPACE.lg,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: HERO.line,
    },
    heroStatDivider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', backgroundColor: HERO.line },
    shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
    bullet: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  });
