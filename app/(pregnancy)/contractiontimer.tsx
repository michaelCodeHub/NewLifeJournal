import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { SPACE, Theme, useTheme, useThemedStyles } from '../../context/ThemeContext';
import {
  saveContractionSession,
  subscribeToContractionSessions,
  deleteContractionSession,
  check511Rule,
  contractionSummary,
  TimedContraction,
} from '../../services/firebase/contractionService';
import type { Contraction, ContractionSession } from '../../types/pregnancy';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  IconButton,
  IconTile,
  ListRow,
  Screen,
  ScreenState,
  SectionHeader,
  Text,
  useToast,
} from '../../components/ui';
import {
  ElapsedText,
  HistorySkeleton,
  PulseButton,
  StatsCard,
  formatSessionDate,
  formatShort,
  formatTimeOfDay,
} from '../../components/timers';
import { haptics } from '../../lib/haptics';
import { useStoredSession } from '../../hooks/useStoredSession';
import { trackEvent } from '../../services/monitoring/analytics';

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

const intervalsOf = (list: Contraction[]) =>
  list.filter((c) => c.intervalSeconds !== undefined).map((c) => c.intervalSeconds as number);

const timed = (list: Contraction[]): TimedContraction[] =>
  list.map((c) => ({ start: c.startTime.toMillis(), durationSeconds: c.durationSeconds }));

/** What's kept on the device while a session runs (plain millis, no Timestamps). */
interface LiveContractions {
  sessionStart: number;
  activeStart: number | null;
  items: { s: number; e: number }[];
}

/** Rebuild contractions (with durations and rest intervals) from stored start/end times. */
const fromStored = (items: LiveContractions['items']): Contraction[] =>
  items.map((it, i) => {
    const c: Contraction = {
      startTime: Timestamp.fromMillis(it.s),
      endTime: Timestamp.fromMillis(it.e),
      durationSeconds: Math.max(1, Math.round((it.e - it.s) / 1000)),
    };
    if (i > 0) c.intervalSeconds = Math.round((it.s - items[i - 1].e) / 1000);
    return c;
  });

export default function ContractionTimerScreen() {
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { pregnancy, loading, getCurrentWeek } = usePregnancy();

  // Live session. All times are epoch millis; elapsed values are derived from them.
  // Each piece of state is mirrored in a ref so handlers always read the latest
  // values (ending the session mid-contraction must keep that last contraction).
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [show511, setShow511] = useState(false);
  const show511Ref = useRef(false);
  const sessionStartRef = useRef<number | null>(null);
  const activeStartRef = useRef<number | null>(null);
  const contractionsRef = useRef<Contraction[]>([]);
  const [saving, setSaving] = useState(false);

  // History
  const [sessions, setSessions] = useState<ContractionSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [toDelete, setToDelete] = useState<ContractionSession | null>(null);

  const uid = user?.uid;
  const pregnancyId = pregnancy?.id;

  // Mirror the live session to the device so it survives leaving the screen
  // or restarting the app mid-labour (PRD F14).
  const [stored, saveLive, clearLive, restored] = useStoredSession<LiveContractions>(
    uid && pregnancyId ? `contractions:live:${uid}:${pregnancyId}` : null
  );
  const persist = useCallback(() => {
    const start = sessionStartRef.current;
    if (start === null) return;
    saveLive({
      sessionStart: start,
      activeStart: activeStartRef.current,
      items: contractionsRef.current.map((c) => ({ s: c.startTime.toMillis(), e: c.endTime.toMillis() })),
    });
  }, [saveLive]);
  useEffect(() => {
    if (!restored || !stored || sessionStartRef.current !== null) return;
    const list = fromStored(stored.items);
    sessionStartRef.current = stored.sessionStart;
    activeStartRef.current = stored.activeStart;
    contractionsRef.current = list;
    setSessionStart(stored.sessionStart);
    setActiveStart(stored.activeStart);
    setContractions(list);
    if (check511Rule(timed(list))) {
      show511Ref.current = true;
      setShow511(true);
    }
  }, [restored, stored]);

  useEffect(() => {
    if (!uid || !pregnancyId) {
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    const unsubscribe = subscribeToContractionSessions(uid, pregnancyId, (data) => {
      setSessions(data);
      setLoadingSessions(false);
    });
    return unsubscribe;
  }, [uid, pregnancyId]);

  const resetSession = useCallback(() => {
    sessionStartRef.current = null;
    activeStartRef.current = null;
    contractionsRef.current = [];
    setSessionStart(null);
    setActiveStart(null);
    setContractions([]);
    show511Ref.current = false;
    setShow511(false);
    clearLive();
  }, [clearLive]);

  /** Close the running contraction at `end` and return the updated list (synchronously, from refs). */
  const commitContraction = useCallback((end: number): Contraction[] => {
    const start = activeStartRef.current;
    const list = contractionsRef.current;
    if (start === null) return list;

    const contraction: Contraction = {
      startTime: Timestamp.fromMillis(start),
      endTime: Timestamp.fromMillis(end),
      durationSeconds: Math.max(1, Math.round((end - start) / 1000)),
    };
    const prev = list[list.length - 1];
    // Seconds since the previous contraction ended. Only set when known:
    // Firestore rejects `undefined` field values.
    if (prev) contraction.intervalSeconds = Math.round((start - prev.endTime.toMillis()) / 1000);

    const next = [...list, contraction];
    trackEvent('contraction_timed');
    contractionsRef.current = next;
    activeStartRef.current = null;
    setContractions(next);
    setActiveStart(null);
    if (!show511Ref.current && check511Rule(timed(next))) {
      show511Ref.current = true;
      setShow511(true);
      haptics.warning();
    }
    return next;
  }, []);

  const handleTap = useCallback(() => {
    haptics.medium();
    const now = Date.now();
    if (sessionStartRef.current === null) {
      // First tap starts the session and the first contraction together.
      sessionStartRef.current = now;
      contractionsRef.current = [];
      setSessionStart(now);
      setContractions([]);
      show511Ref.current = false;
      setShow511(false);
    }
    if (activeStartRef.current === null) {
      activeStartRef.current = now;
      setActiveStart(now);
    } else {
      commitContraction(now);
    }
    persist();
  }, [commitContraction, persist]);

  const shareSummary = useCallback(async (list: Contraction[]) => {
    try {
      await Share.share({ message: contractionSummary(timed(list)) });
    } catch {
      toast.show("Couldn't open the share sheet", 'error');
    }
  }, [toast]);

  const handleEndSession = useCallback(async () => {
    const start = sessionStartRef.current;
    if (!uid || !pregnancyId || start === null) return;

    const end = Date.now();
    // Read through refs, so a contraction still running is included.
    const list = activeStartRef.current !== null ? commitContraction(end) : contractionsRef.current;
    persist(); // if saving fails, the session (now with that last contraction) is still on the device

    if (list.length === 0) {
      resetSession();
      toast.show('No contractions recorded, so nothing was saved', 'info');
      return;
    }

    const durationMinutes = Math.max(1, Math.round((end - start) / 60000));
    const avgDuration = average(list.map((c) => c.durationSeconds));
    const avgInterval = average(intervalsOf(list));

    setSaving(true);
    try {
      await saveContractionSession(uid, pregnancyId, {
        pregnancyId,
        date: Timestamp.fromMillis(start),
        week: getCurrentWeek(),
        contractions: list,
        durationMinutes,
        averageDurationSeconds: avgDuration,
        averageIntervalSeconds: avgInterval,
      });
      resetSession();
      const n = list.length;
      toast.show(
        `Saved ${n} contraction${n === 1 ? '' : 's'} · avg ${formatShort(avgDuration)}` +
          (avgInterval > 0 ? `, ${formatShort(avgInterval)} apart` : '')
      );
    } catch (e: any) {
      console.error('Error saving contraction session:', e);
      // Keep the session (and its contractions) on screen so it can be retried.
      toast.show('Could not save session. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  }, [uid, pregnancyId, getCurrentWeek, commitContraction, resetSession, toast, persist]);

  const handleDelete = useCallback(async () => {
    if (!uid || !pregnancyId || !toDelete) return;
    try {
      await deleteContractionSession(uid, pregnancyId, toDelete.id);
      toast.show('Session deleted');
    } catch (e: any) {
      console.error('Error deleting contraction session:', e);
      toast.show('Could not delete session', 'error');
    }
  }, [uid, pregnancyId, toDelete, toast]);

  const requestDelete = useCallback((s: ContractionSession) => setToDelete(s), []);

  const live = useMemo(
    () => ({
      avgDuration: average(contractions.map((c) => c.durationSeconds)),
      avgInterval: average(intervalsOf(contractions)),
      lastEndedAt: contractions.length ? contractions[contractions.length - 1].endTime.toMillis() : null,
      newestFirst: contractions.map((c, i) => ({ c, n: i + 1 })).reverse(),
    }),
    [contractions]
  );

  if (loading || !restored) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No active pregnancy" />;

  const inSession = sessionStart !== null;
  const timing = activeStart !== null;

  return (
    <Screen
      header={{ variant: 'bar', title: 'Contraction timer' }}
      contentStyle={{ paddingTop: SPACE.xl }}
    >
      {show511 ? (
        <Card tone="tinted" tint="redTint" style={styles.alert} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <IconTile name="alert-circle" tone="red" size={40} />
          <View style={styles.alertText}>
            <Text variant="headline" color="red">
              Time to call
            </Text>
            <Text variant="callout">
              Contractions have come every 5 minutes or less, lasting a minute or more, for an hour. Call your doctor or labor ward.
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.hero}>
        <PulseButton
          color={timing ? 'red' : 'primaryDark'}
          active={timing}
          onPress={handleTap}
          accessibilityLabel={timing ? 'Contraction ended' : 'Contraction started'}
          accessibilityHint={timing ? 'Stops timing this contraction' : 'Starts timing a contraction'}
        >
          {timing && activeStart !== null ? (
            <>
              <ElapsedText startedAt={activeStart} variant="display" color="onPrimary" />
              <Text variant="caption" color="onPrimary" align="center">
                Tap when it ends
              </Text>
            </>
          ) : (
            <>
              <Icon name="play" size={30} color={colors.onPrimary} />
              <Text variant="headline" color="onPrimary">
                Start
              </Text>
              <Text variant="caption" color="onPrimary" align="center">
                Tap when one begins
              </Text>
            </>
          )}
        </PulseButton>

        {inSession ? (
          <View style={styles.phase}>
            {timing ? (
              <Text variant="calloutMedium" color="red">
                Contraction in progress
              </Text>
            ) : live.lastEndedAt !== null ? (
              <>
                <Text variant="callout" color="textSecondary">
                  Resting
                </Text>
                <ElapsedText startedAt={live.lastEndedAt} variant="calloutMedium" color="textPrimary" />
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      {inSession && sessionStart !== null ? (
        <>
          <StatsCard
            items={[
              { label: 'Session', value: <ElapsedText startedAt={sessionStart} variant="headline" /> },
              { label: 'Avg length', value: live.avgDuration ? formatShort(live.avgDuration) : '—' },
              { label: 'Avg apart', value: live.avgInterval ? formatShort(live.avgInterval) : '—' },
            ]}
          />

          <Button
            title="End session"
            variant="secondary"
            size="lg"
            fullWidth
            icon="stop-circle-outline"
            loading={saving}
            onPress={handleEndSession}
          />
          {contractions.length > 0 ? (
            <Button title="Share summary" variant="ghost" size="sm" icon="share-outline" onPress={() => shareSummary(contractions)} />
          ) : null}

          {contractions.length > 0 ? (
            <View>
              <SectionHeader
                title={`${contractions.length} contraction${contractions.length === 1 ? '' : 's'} this session`}
              />
              <Card padded={false}>
                {live.newestFirst.map(({ c, n }, i) => (
                  <ListRow
                    key={c.startTime.toMillis()}
                    icon="pulse-outline"
                    tone="red"
                    title={`${formatShort(c.durationSeconds)} long`}
                    subtitle={
                      formatTimeOfDay(c.startTime.toDate()) +
                      (c.intervalSeconds !== undefined ? ` · ${formatShort(c.intervalSeconds)} after previous` : '')
                    }
                    value={`#${n}`}
                    last={i === live.newestFirst.length - 1}
                  />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Card style={styles.explainer}>
            <IconTile name="information-circle-outline" tone="teal" size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">How it works</Text>
              <Text variant="callout" color="textSecondary">
                Tap the circle when a contraction starts and again when it ends. We time each one and the gap between
                them. The 5-1-1 rule: contractions every 5 minutes, lasting 1 minute, for 1 hour.
              </Text>
            </View>
          </Card>

          <View>
            <SectionHeader title="History" />
            {loadingSessions ? (
              <HistorySkeleton />
            ) : sessions.length === 0 ? (
              <Card>
                <EmptyState
                  icon="timer-outline"
                  tone="red"
                  title="No sessions yet"
                  body="Saved contraction sessions appear here with their average length and spacing."
                />
              </Card>
            ) : (
              <Card padded={false}>
                {sessions.map((s, i) => (
                  <HistoryRow
                    key={s.id}
                    session={s}
                    last={i === sessions.length - 1}
                    onDelete={requestDelete}
                    onShare={(x) => shareSummary(x.contractions ?? [])}
                  />
                ))}
              </Card>
            )}
          </View>
        </>
      )}

      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this session?"
        body={toDelete ? `The session from ${formatSessionDate(toDelete.date.toDate())} will be removed.` : undefined}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const HistoryRow = memo(function HistoryRow({
  session,
  last,
  onDelete,
  onShare,
}: {
  session: ContractionSession;
  last: boolean;
  onDelete: (s: ContractionSession) => void;
  onShare: (s: ContractionSession) => void;
}) {
  const n = session.contractions?.length ?? 0;
  const detail =
    `avg ${formatShort(session.averageDurationSeconds)}` +
    (session.averageIntervalSeconds > 0 ? `, ${formatShort(session.averageIntervalSeconds)} apart` : '');
  return (
    <ListRow
      icon="timer-outline"
      tone="red"
      title={`${n} contraction${n === 1 ? '' : 's'} · ${session.durationMinutes} min`}
      subtitle={`${formatSessionDate(session.date.toDate())} · Week ${session.week}\n${detail}`}
      last={last}
      onPress={n ? () => onShare(session) : undefined}
      accessibilityLabel={`Share the session from ${formatSessionDate(session.date.toDate())}`}
      right={
        <IconButton
          name="trash-outline"
          variant="plain"
          size={30}
          color="textMuted"
          onPress={() => onDelete(session)}
          accessibilityLabel={`Delete session from ${formatSessionDate(session.date.toDate())}`}
        />
      }
    />
  );
});

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    alert: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
    alertText: { flex: 1, gap: SPACE.xs },
    hero: { alignItems: 'center', gap: SPACE.xs },
    phase: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 20 },
    explainer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  });
