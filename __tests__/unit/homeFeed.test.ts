import { daysBetween, nextAppointment, recentEntries, relativeDay, tipOfTheDay } from '../../lib/homeFeed';

const ts = (d: Date) => ({ toDate: () => d }) as never;
const NOW = new Date(2026, 10, 18, 10, 0); // Wed Nov 18, 10:00

const visit = (id: string, date: Date, extra: Record<string, unknown> = {}) =>
  ({ id, pregnancyId: 'p', date: ts(date), week: 24, type: 'checkup', createdAt: ts(date), ...extra }) as never;
const symptom = (id: string, date: Date, label = 'Heartburn') =>
  ({ id, pregnancyId: 'p', date: ts(date), week: 24, type: 'other', label, severity: 2, createdAt: ts(date) }) as never;
const milestone = (id: string, date: Date, title = 'First kick') =>
  ({ id, pregnancyId: 'p', date: ts(date), week: 24, title, createdAt: ts(date) }) as never;

describe('relativeDay', () => {
  it('names nearby days and falls back to a short date', () => {
    expect(relativeDay(new Date(2026, 10, 18, 22), NOW)).toBe('Today');
    expect(relativeDay(new Date(2026, 10, 19, 1), NOW)).toBe('Tomorrow');
    expect(relativeDay(new Date(2026, 10, 17, 23), NOW)).toBe('Yesterday');
    expect(relativeDay(new Date(2026, 10, 24), NOW)).toBe('In 6 days');
    expect(relativeDay(new Date(2026, 10, 15), NOW)).toBe('3 days ago');
    expect(relativeDay(new Date(2026, 11, 2), NOW)).not.toMatch(/days/);
    expect(daysBetween(NOW, new Date(2026, 10, 25, 0, 1))).toBe(7);
  });
});

describe('nextAppointment', () => {
  it('picks the earliest upcoming date from future visits and saved next-appointment dates', () => {
    const visits = [
      visit('a', new Date(2026, 10, 1), { nextVisitDate: ts(new Date(2026, 10, 30)) }),
      visit('b', new Date(2026, 10, 25), { label: 'Anatomy scan', type: 'ultrasound' }),
      visit('c', new Date(2026, 9, 1), { nextVisitDate: ts(new Date(2026, 10, 10)) }), // in the past: ignored
    ];
    const next = nextAppointment(visits, NOW)!;
    expect(next.date).toEqual(new Date(2026, 10, 25));
    expect(next.title).toBe('Anatomy scan');
  });

  it('counts an appointment later today, and returns null when nothing is coming up', () => {
    const today = nextAppointment([visit('a', new Date(2026, 9, 1), { nextVisitDate: ts(new Date(2026, 10, 18, 9)) })], NOW);
    expect(today?.title).toBe('Next appointment');
    expect(nextAppointment([visit('a', new Date(2026, 9, 1))], NOW)).toBeNull();
    expect(nextAppointment([], NOW)).toBeNull();
  });
});

describe('recentEntries', () => {
  it('merges visits, symptoms and milestones, newest first, skipping future-dated ones', () => {
    const recent = recentEntries(
      {
        visits: [visit('v1', new Date(2026, 10, 10)), visit('v2', new Date(2026, 10, 30))],
        symptoms: [symptom('s1', new Date(2026, 10, 17))],
        milestones: [milestone('m1', new Date(2026, 10, 15)), milestone('m2', new Date(2026, 10, 1))],
      },
      3,
      NOW
    );
    expect(recent.map((e) => e.key)).toEqual(['s-s1', 'm-m1', 'v-v1']);
    expect(recent[0]).toMatchObject({ kind: 'symptom', title: 'Heartburn' });
    expect(recent[1]).toMatchObject({ kind: 'milestone', title: 'First kick', icon: 'star-outline' });
  });
});

describe('tipOfTheDay', () => {
  it('is stable within a day, changes day to day, and handles no tips', () => {
    const tips = ['a', 'b', 'c'];
    expect(tipOfTheDay(tips, new Date(2026, 10, 18, 1))).toBe(tipOfTheDay(tips, new Date(2026, 10, 18, 23)));
    expect(tipOfTheDay(tips, new Date(2026, 10, 18))).not.toBe(tipOfTheDay(tips, new Date(2026, 10, 19)));
    expect(tipOfTheDay([], NOW)).toBeNull();
  });
});
