import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { SPACE, Theme, useTheme, useThemedStyles } from '../../context/ThemeContext';
import { addKickSession, subscribeToKickSessions, deleteKickSession } from '../../services/firebase/kickCounterService';
import type { KickSession } from '../../types/pregnancy';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  IconButton,
  IconTile,
  ListRow,
  Pill,
  ProgressBar,
  Screen,
  ScreenState,
  SectionHeader,
  Text,
  useToast,
} from '../../components/ui';
import {
  ElapsedText,
  DayBars,
  HistorySkeleton,
  PulseButton,
  StatsCard,
  formatAgo,
  formatSessionDate,
  formatShort,
  formatTimeOfDay,
} from '../../components/timers';
import { haptics } from '../../lib/haptics';
import { perDay } from '../../lib/journal';
import { useStoredSession } from '../../hooks/useStoredSession';
import { trackEvent } from '../../services/monitoring/analytics';

interface LiveKicks {
  startedAt: number;
  kicks: number[];
}

/** Most clinicians use "10 movements within 2 hours" as the reassurance threshold. */
const GOAL = 10;

export default function KickCounterScreen() {
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { user } = useAuth();
  const { pregnancy, loading, getCurrentWeek } = usePregnancy();

  // Live session. Times are epoch millis; the UI derives elapsed time from them.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [kicks, setKicks] = useState<number[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const kicksRef = useRef<number[]>([]);
  const [saving, setSaving] = useState(false);

  // History
  const [sessions, setSessions] = useState<KickSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [toDelete, setToDelete] = useState<KickSession | null>(null);

  const uid = user?.uid;
  const pregnancyId = pregnancy?.id;

  // The live session is mirrored to the device, so leaving the screen or
  // restarting the app picks it up where it was (PRD F13).
  const [stored, saveLive, clearLive, restored] = useStoredSession<LiveKicks>(
    uid && pregnancyId ? `kicks:live:${uid}:${pregnancyId}` : null
  );
  useEffect(() => {
    if (!restored || !stored || startedAtRef.current !== null) return;
    startedAtRef.current = stored.startedAt;
    kicksRef.current = stored.kicks;
    setStartedAt(stored.startedAt);
    setKicks(stored.kicks);
  }, [restored, stored]);

  useEffect(() => {
    if (!uid || !pregnancyId) {
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    const unsubscribe = subscribeToKickSessions(uid, pregnancyId, (data) => {
      setSessions(data);
      setLoadingSessions(false);
    });
    return unsubscribe;
  }, [uid, pregnancyId]);

  const active = startedAt !== null;
  const count = kicks.length;
  const lastKickAt = count > 0 ? kicks[count - 1] : null;
  const goalReachedInSec = startedAt !== null && count >= GOAL ? (kicks[GOAL - 1] - startedAt) / 1000 : null;

  const resetSession = useCallback(() => {
    startedAtRef.current = null;
    kicksRef.current = [];
    setStartedAt(null);
    setKicks([]);
    clearLive();
  }, [clearLive]);

  const handleTap = useCallback(() => {
    haptics.medium();
    const now = Date.now();
    if (startedAtRef.current === null) {
      startedAtRef.current = now;
      kicksRef.current = [];
      setStartedAt(now);
      setKicks([]);
      saveLive({ startedAt: now, kicks: [] });
      return;
    }
    const next = [...kicksRef.current, now];
    kicksRef.current = next;
    setKicks(next);
    saveLive({ startedAt: startedAtRef.current, kicks: next });
    trackEvent('kick_counted');
    if (next.length === GOAL) toast.show(`${GOAL} movements — goal reached`);
  }, [toast, saveLive]);

  const handleUndo = useCallback(() => {
    if (kicksRef.current.length === 0) return;
    const next = kicksRef.current.slice(0, -1);
    kicksRef.current = next;
    setKicks(next);
    if (startedAtRef.current !== null) saveLive({ startedAt: startedAtRef.current, kicks: next });
  }, [saveLive]);

  const handleFinish = useCallback(async () => {
    const start = startedAtRef.current;
    if (!uid || !pregnancyId || start === null) return;
    const kickCount = kicksRef.current.length;

    if (kickCount === 0) {
      resetSession();
      toast.show('No movements recorded, so nothing was saved', 'info');
      return;
    }

    const durationMinutes = Math.max(1, Math.round((Date.now() - start) / 60000));
    const targetReached = kickCount >= GOAL;
    setSaving(true);
    try {
      await addKickSession(uid, pregnancyId, {
        pregnancyId,
        date: Timestamp.fromMillis(start),
        week: getCurrentWeek(),
        kickCount,
        durationMinutes,
        targetReached,
      });
      resetSession();
      toast.show(
        targetReached
          ? `Goal reached — ${kickCount} movements in ${durationMinutes} min`
          : `Saved ${kickCount} movements in ${durationMinutes} min`
      );
    } catch (e: any) {
      console.error('Error saving kick session:', e);
      // Keep the session on screen so it can be retried.
      toast.show('Could not save session. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  }, [uid, pregnancyId, getCurrentWeek, resetSession, toast]);

  const handleDelete = useCallback(async () => {
    if (!uid || !pregnancyId || !toDelete) return;
    try {
      await deleteKickSession(uid, pregnancyId, toDelete.id);
      toast.show('Session deleted');
    } catch (e: any) {
      console.error('Error deleting kick session:', e);
      toast.show('Could not delete session', 'error');
    }
  }, [uid, pregnancyId, toDelete, toast]);

  const requestDelete = useCallback((s: KickSession) => setToDelete(s), []);

  const summary = useMemo(() => {
    if (sessions.length === 0) return null;
    const n = sessions.length;
    const avgKicks = Math.round(sessions.reduce((sum, s) => sum + s.kickCount, 0) / n);
    const avgMinutes = Math.round(sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / n);
    return { n, avgKicks, avgMinutes };
  }, [sessions]);

  // Kicks per day over the last 7 days (PRD F13 summary view).
  const week = useMemo(() => perDay(sessions.map((s) => ({ date: s.date.toDate(), value: s.kickCount }))), [sessions]);
  const lastSession = sessions[0] ?? null;

  if (loading || !restored) return <ScreenState loading />;
  if (!pregnancy) return <ScreenState icon="leaf-outline" title="No active pregnancy" />;

  return (
    <Screen
      header={{ variant: 'bar', title: 'Kick counter' }}
      contentStyle={{ paddingTop: SPACE.xl }}
    >
      <View style={styles.hero}>
        <PulseButton
          color="plum"
          active={active}
          onPress={handleTap}
          accessibilityLabel={active ? `Count a movement. ${count} counted so far` : 'Start counting movements'}
        >
          {active ? (
            <>
              <Text variant="display" color="onPrimary" tabular>
                {count}
              </Text>
              <Text variant="caption" color="onPrimary" align="center">
                Tap for each movement
              </Text>
            </>
          ) : (
            <>
              <Icon name="footsteps-outline" size={32} color={colors.onPrimary} />
              <Text variant="headline" color="onPrimary">
                Start
              </Text>
              <Text variant="caption" color="onPrimary" align="center">
                Tap to begin counting
              </Text>
            </>
          )}
        </PulseButton>
      </View>

      <Card style={styles.guide}>
        <View style={styles.guideTop}>
          <IconTile name="footsteps-outline" tone="plum" size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">{active ? `${Math.min(count, GOAL)} of ${GOAL} movements` : 'How it works'}</Text>
            <Text variant="footnote" color="textSecondary">
              Most doctors suggest 10 movements within 2 hours
            </Text>
          </View>
        </View>
        {active ? (
          <View style={{ gap: SPACE.sm }}>
            <ProgressBar value={count / GOAL} tone="plum" />
            {goalReachedInSec !== null ? (
              <Pill tone="green" icon="checkmark-circle" label={`Goal reached in ${formatShort(goalReachedInSec)}`} />
            ) : null}
          </View>
        ) : (
          <Text variant="callout" color="textSecondary">
            Pick a time your baby is usually active, lie on your side, and tap for every kick, flutter, swish or roll.
            If you notice fewer movements than usual, call your doctor or labor ward.
          </Text>
        )}
      </Card>

      {active && startedAt !== null ? (
        <>
          <StatsCard
            items={[
              { label: 'Movements', value: String(count) },
              { label: 'Elapsed', value: <ElapsedText startedAt={startedAt} variant="headline" /> },
              {
                label: 'Last movement',
                value:
                  lastKickAt !== null ? <ElapsedText startedAt={lastKickAt} variant="headline" format={formatAgo} /> : '—',
              },
            ]}
          />
          <Text variant="footnote" color="textMuted" align="center">
            Started {formatTimeOfDay(new Date(startedAt))}
            {count > 0 ? ` · first movement ${formatTimeOfDay(new Date(kicks[0]))}` : ''}
          </Text>
          <View style={styles.actions}>
            <Button title="Finish session" size="lg" fullWidth loading={saving} onPress={handleFinish} />
            {count > 0 ? (
              <Button title="Undo last movement" icon="arrow-undo-outline" variant="ghost" size="sm" onPress={handleUndo} />
            ) : null}
          </View>
        </>
      ) : (
        <>
          {lastSession && lastSession.kickCount < GOAL ? (
            <Card tone="tinted" tint="orangeTint" style={styles.guideTop}>
              <IconTile name="alert-circle-outline" tone="orange" size={36} />
              <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
                Your last session had {lastSession.kickCount} {lastSession.kickCount === 1 ? 'movement' : 'movements'}. If your baby
                is moving less than usual, call your doctor or labor ward now — don't wait until tomorrow.
              </Text>
            </Card>
          ) : null}

          {sessions.length ? (
            <View>
              <SectionHeader title="Kicks per day" />
              <Card>
                <DayBars
                  bars={week}
                  color="plum"
                  accessibilityLabel={`Kicks per day, last 7 days: ${week.map((d) => d.value).join(', ')}`}
                />
              </Card>
            </View>
          ) : null}

          {summary ? (
            <StatsCard
              items={[
                { label: 'Sessions', value: String(summary.n) },
                { label: 'Avg movements', value: String(summary.avgKicks) },
                { label: 'Avg time', value: `${summary.avgMinutes} min` },
              ]}
            />
          ) : null}

          <View>
            <SectionHeader title="History" />
            {loadingSessions ? (
              <HistorySkeleton />
            ) : sessions.length === 0 ? (
              <Card>
                <EmptyState
                  icon="footsteps-outline"
                  tone="plum"
                  title="No sessions yet"
                  body="Your saved kick counts will appear here, so you can spot changes in your baby's pattern."
                />
              </Card>
            ) : (
              <Card padded={false}>
                {sessions.map((s, i) => (
                  <HistoryRow key={s.id} session={s} last={i === sessions.length - 1} onDelete={requestDelete} />
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
        body={
          toDelete
            ? `${toDelete.kickCount} movements on ${formatSessionDate(toDelete.date.toDate())} will be removed.`
            : undefined
        }
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const HistoryRow = memo(function HistoryRow({
  session,
  last,
  onDelete,
}: {
  session: KickSession;
  last: boolean;
  onDelete: (s: KickSession) => void;
}) {
  return (
    <ListRow
      icon={session.targetReached ? 'checkmark-circle-outline' : 'footsteps-outline'}
      tone={session.targetReached ? 'green' : 'plum'}
      title={`${session.kickCount} movements in ${session.durationMinutes} min`}
      subtitle={`${formatSessionDate(session.date.toDate())} · Week ${session.week}`}
      last={last}
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
    hero: { alignItems: 'center' },
    guide: { gap: SPACE.md },
    guideTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    actions: { gap: SPACE.sm, alignItems: 'center' },
  });
