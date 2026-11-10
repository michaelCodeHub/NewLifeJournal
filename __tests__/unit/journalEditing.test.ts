import { pickPregnancy, weekForDate } from '../../context/PregnancyContext';
import { symptomIcon } from '../../lib/journal';

const ts = (iso: string) => ({ toMillis: () => new Date(iso).getTime(), toDate: () => new Date(iso) }) as any;
const preg = (id: string, status: 'active' | 'completed', completedAt?: string) =>
  ({ id, status, dueDate: ts('2027-03-20T12:00:00Z'), completedAt: completedAt ? ts(completedAt) : undefined }) as any;

describe('pickPregnancy', () => {
  it('prefers the active pregnancy', () => {
    expect(pickPregnancy([preg('a', 'completed', '2026-01-01'), preg('b', 'active')])?.id).toBe('b');
  });

  it('falls back to the most recently completed one so the journal stays readable', () => {
    const all = [preg('old', 'completed', '2024-05-01'), preg('new', 'completed', '2026-05-01')];
    expect(pickPregnancy(all)?.id).toBe('new');
  });

  it('returns null when there is nothing to show', () => {
    expect(pickPregnancy([])).toBeNull();
  });
});

describe('weekForDate', () => {
  const due = new Date('2027-03-20T12:00:00Z').getTime();

  it('moves an entry to a new week when the due date changes', () => {
    const entry = new Date('2026-11-09T12:00:00Z');
    const laterDue = due + 14 * 86400000;
    expect(weekForDate(due, entry) - weekForDate(laterDue, entry)).toBe(2);
  });

  it('stays within 1..42', () => {
    expect(weekForDate(due, new Date('2020-01-01'))).toBe(1);
    expect(weekForDate(due, new Date('2030-01-01'))).toBe(42);
  });
});

describe('symptomIcon', () => {
  it('uses the specific icon for a known label', () => {
    expect(symptomIcon({ type: 'other', label: 'Heartburn' })).toBe('flame-outline');
  });

  it('falls back to the stored category', () => {
    expect(symptomIcon({ type: 'headache' })).toBe('flash-outline');
  });

  it('uses the general icon for custom symptoms', () => {
    expect(symptomIcon({ type: 'other', label: 'Round ligament pain' })).toBe('thermometer-outline');
  });
});
