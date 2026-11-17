import {
  activityDetail,
  activityTitle,
  ageLabel,
  dayLabel,
  dayOfLife,
  formatAgo,
  formatDaySummary,
  formatMinutes,
  isRunning,
  mlToOz,
  ozToMl,
  parseAmount,
  summarizeDay,
  withDay,
} from '../../lib/baby';
import { sortBabies } from '../../context/BabyContext';
import type { Baby, BabyActivity } from '../../types';

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }) as any;
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const act = (o: Partial<Omit<BabyActivity, 'startedAt' | 'endedAt'>> & { type: BabyActivity['type']; startedAt: Date; endedAt?: Date }): BabyActivity =>
  ({
    id: Math.random().toString(36),
    createdAt: ts(o.startedAt),
    ...o,
    startedAt: ts(o.startedAt),
    endedAt: o.endedAt ? ts(o.endedAt) : undefined,
  }) as BabyActivity;

const NOW = at(2026, 11, 17, 14, 0);

describe('age', () => {
  it('counts the birth date as day 1', () => {
    expect(dayOfLife(at(2026, 11, 17, 3), NOW)).toBe(1);
    expect(dayOfLife(at(2026, 11, 10), NOW)).toBe(8);
  });

  it('describes age in days, weeks, months and years', () => {
    expect(ageLabel(at(2026, 11, 17), NOW)).toBe('Born today');
    expect(ageLabel(at(2026, 11, 16), NOW)).toBe('1 day old');
    expect(ageLabel(at(2026, 11, 5), NOW)).toBe('12 days old');
    expect(ageLabel(at(2026, 10, 1), NOW)).toBe('6 weeks old');
    expect(ageLabel(at(2026, 5, 17), NOW)).toBe('6 months old');
    expect(ageLabel(at(2024, 9, 17), NOW)).toBe('2 years 2 months old');
  });
});

describe('durations and units', () => {
  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(80)).toBe('1h 20m');
    expect(formatMinutes(480)).toBe('8h');
  });

  it('formats time ago', () => {
    expect(formatAgo(new Date(NOW.getTime() - 20_000), NOW)).toBe('just now');
    expect(formatAgo(new Date(NOW.getTime() - 125 * 60_000), NOW)).toBe('2h 5m ago');
  });

  it('converts ml and oz and parses typed amounts', () => {
    expect(ozToMl(4)).toBe(118);
    expect(mlToOz(120)).toBe(4.1);
    expect(parseAmount('4,5')).toBe(4.5);
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('abc')).toBeUndefined();
    expect(parseAmount('-3')).toBeUndefined();
  });

  it('keeps the time of day when changing the date', () => {
    const d = withDay(at(2026, 11, 17, 3, 25), at(2026, 11, 15, 12));
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([15, 3, 25]);
  });
});

describe('activities', () => {
  it('treats feeds and sleep without an end as running; diapers never run', () => {
    expect(isRunning(act({ type: 'sleep', startedAt: NOW }))).toBe(true);
    expect(isRunning(act({ type: 'sleep', startedAt: NOW, endedAt: NOW }))).toBe(false);
    expect(isRunning(act({ type: 'diaper', startedAt: NOW }))).toBe(false);
  });

  it('titles and details each kind of entry', () => {
    const breast = act({
      type: 'feeding',
      startedAt: at(2026, 11, 17, 9),
      endedAt: at(2026, 11, 17, 9, 14),
      feeding: { feedType: 'breast', side: 'left' },
    });
    expect(activityTitle(breast)).toBe('Breast feed');
    expect(activityDetail(breast, NOW)).toBe('Left · 14 min');

    const bottle = act({
      type: 'feeding',
      startedAt: at(2026, 11, 17, 10),
      endedAt: at(2026, 11, 17, 10),
      feeding: { feedType: 'bottle', amountMl: 120 },
    });
    expect(activityTitle(bottle)).toBe('Bottle feed');
    expect(activityDetail(bottle, NOW)).toBe('120 ml');

    expect(activityTitle(act({ type: 'feeding', startedAt: NOW, feeding: { feedType: 'solid' } }))).toBe('Solids');
    expect(activityTitle(act({ type: 'diaper', startedAt: NOW, diaper: { kind: 'both' } }))).toBe('Wet + dirty diaper');
    expect(activityDetail(act({ type: 'diaper', startedAt: NOW, diaper: { kind: 'dirty', color: 'green' } }), NOW)).toBe('Green');
    expect(activityDetail(act({ type: 'sleep', startedAt: at(2026, 11, 17, 13) }), NOW)).toBe('In progress');
  });
});

describe('day summary', () => {
  const list = [
    act({ type: 'feeding', startedAt: at(2026, 11, 17, 8), endedAt: at(2026, 11, 17, 8, 20), feeding: { feedType: 'breast' } }),
    act({ type: 'feeding', startedAt: at(2026, 11, 17, 11), endedAt: at(2026, 11, 17, 11, 5), feeding: { feedType: 'bottle', amountMl: 90 } }),
    act({ type: 'feeding', startedAt: at(2026, 11, 16, 23), endedAt: at(2026, 11, 16, 23, 15), feeding: { feedType: 'breast' } }),
    act({ type: 'diaper', startedAt: at(2026, 11, 17, 9), diaper: { kind: 'wet' } }),
    act({ type: 'diaper', startedAt: at(2026, 11, 17, 12), diaper: { kind: 'both' } }),
    // Overnight sleep 22:00 → 05:00 is split at midnight: 5h today, 2h yesterday.
    act({ type: 'sleep', startedAt: at(2026, 11, 16, 22), endedAt: at(2026, 11, 17, 5) }),
    // Running nap since 13:30 → 30 min at 14:00.
    act({ type: 'sleep', startedAt: at(2026, 11, 17, 13, 30) }),
  ];

  it('totals only the given calendar day and splits sleep at midnight', () => {
    expect(summarizeDay(list, NOW, NOW)).toEqual({ feeds: 2, diapers: 2, wet: 2, dirty: 1, sleepMinutes: 330 });
    expect(summarizeDay(list, at(2026, 11, 16), NOW)).toEqual({ feeds: 1, diapers: 0, wet: 0, dirty: 0, sleepMinutes: 120 });
  });

  it('formats a summary line', () => {
    expect(formatDaySummary(summarizeDay(list, NOW, NOW))).toBe('2 feeds · 2 diapers · 5h 30m sleep');
    expect(formatDaySummary({ feeds: 0, diapers: 0, wet: 0, dirty: 0, sleepMinutes: 0 })).toBe('Nothing logged');
  });

  it('labels days relative to today', () => {
    expect(dayLabel(at(2026, 11, 17, 1), NOW)).toBe('Today');
    expect(dayLabel(at(2026, 11, 16, 23), NOW)).toBe('Yesterday');
  });
});

describe('sortBabies', () => {
  it('puts active babies first, newest birth first', () => {
    const b = (id: string, status: Baby['status'], d: Date) => ({ id, status, birthDate: ts(d) }) as Baby;
    const sorted = sortBabies([b('old', 'active', at(2024, 1, 1)), b('arch', 'archived', at(2026, 10, 1)), b('new', 'active', at(2026, 11, 1))]);
    expect(sorted.map((x) => x.id)).toEqual(['new', 'old', 'arch']);
  });
});
