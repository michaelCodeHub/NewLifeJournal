import { perDay } from '../../lib/journal';

describe('perDay (kick counter 7-day chart)', () => {
  const now = new Date(2026, 10, 17, 15); // Tue 17 Nov 2026
  const at = (d: number, h = 10) => new Date(2026, 10, d, h);

  it('sums values per calendar day for the last 7 days, oldest first', () => {
    const bars = perDay(
      [
        { date: at(17, 9), value: 10 },
        { date: at(17, 20), value: 12 },
        { date: at(15), value: 8 },
        { date: at(11), value: 5 }, // first day of the window
        { date: at(10), value: 99 }, // outside the window
      ],
      7,
      now
    );
    expect(bars).toHaveLength(7);
    expect(bars.map((b) => b.value)).toEqual([5, 0, 0, 0, 8, 0, 22]);
    expect(bars[6].date.getDate()).toBe(17);
  });
});
