import { useCallback, useState } from 'react';
import { FeedSheet } from './FeedSheet';
import { DiaperSheet } from './DiaperSheet';
import { SleepSheet } from './SleepSheet';
import { GrowthSheet } from './GrowthSheet';
import { HealthSheet } from './HealthSheet';
import type { BabyActivity, GrowthRecord, HealthEvent } from '../../types';

export type LogTarget =
  | { kind: 'feeding' | 'diaper' | 'sleep'; activity?: BabyActivity }
  | { kind: 'growth'; record?: GrowthRecord }
  | { kind: 'health'; event?: HealthEvent };

/**
 * One place that owns the five log sheets, so any screen can say
 * `open({ kind: 'feeding' })` to log or `open({ kind: 'sleep', activity })` to
 * edit. The target is kept while the sheet animates closed, so its form doesn't
 * flash empty on the way out.
 *
 * `restoreDrafts`: only one screen (Home) keeps and restores an unsaved feed,
 * so several mounted copies of the sheets don't fight over the same draft.
 */
export function useLogSheets({ restoreDrafts = false }: { restoreDrafts?: boolean } = {}) {
  const [target, setTarget] = useState<LogTarget | null>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback((t: LogTarget) => {
    setTarget(t);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const is = (k: LogTarget['kind']) => visible && target?.kind === k;
  const activity = target && 'activity' in target ? target.activity ?? null : null;

  const sheets = (
    <>
      <FeedSheet
        visible={is('feeding')}
        onClose={close}
        activity={target?.kind === 'feeding' ? activity : null}
        onRestoreDraft={restoreDrafts ? () => open({ kind: 'feeding' }) : undefined}
      />
      <DiaperSheet visible={is('diaper')} onClose={close} activity={target?.kind === 'diaper' ? activity : null} />
      <SleepSheet visible={is('sleep')} onClose={close} activity={target?.kind === 'sleep' ? activity : null} />
      <GrowthSheet visible={is('growth')} onClose={close} record={target?.kind === 'growth' ? target.record ?? null : null} />
      <HealthSheet visible={is('health')} onClose={close} event={target?.kind === 'health' ? target.event ?? null : null} />
    </>
  );

  return { open, sheets };
}
