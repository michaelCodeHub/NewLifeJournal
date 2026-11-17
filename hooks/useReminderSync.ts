import { useEffect, useMemo } from 'react';
import { usePregnancy } from '../context/PregnancyContext';
import { visitTitle } from '../lib/journal';
import { loadNotificationSettings, ReminderVisit, syncReminders } from '../services/notificationService';

/**
 * Keeps the device's local reminders in step with the journal: a visit's
 * "next appointment" gets its reminder as soon as it's saved (from Visits,
 * Timeline or anywhere else), deleted visits lose theirs, and everything stops
 * once the baby has arrived. Mounted once in the pregnancy layout. The
 * Reminders screen calls syncReminders itself when a switch changes.
 */
export function useReminderSync() {
  const { pregnancy, hospitalVisits } = usePregnancy();
  const active = pregnancy?.status === 'active';

  const visits = useMemo<ReminderVisit[]>(
    () => hospitalVisits.map((v) => ({ id: v.id, title: visitTitle(v), nextVisitDate: v.nextVisitDate?.toDate() ?? null })),
    [hospitalVisits]
  );
  // Only re-sync when something a reminder depends on changes, not on every snapshot.
  const key = useMemo(
    () => `${active}|` + visits.map((v) => `${v.id}:${v.title}:${v.nextVisitDate?.getTime() ?? ''}`).join(','),
    [active, visits]
  );

  useEffect(() => {
    if (!pregnancy) return;
    let cancelled = false;
    loadNotificationSettings()
      .then((settings) => (cancelled ? undefined : syncReminders(settings, { active, visits })))
      .catch((err) => console.warn('Reminder sync failed:', err));
    return () => {
      cancelled = true;
    };
    // `key` captures everything in `visits`/`active` that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pregnancy?.id]);
}
