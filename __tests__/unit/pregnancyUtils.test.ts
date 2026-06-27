import { calculatePregnancyWeek, daysUntilDueDate } from '../../services/firebase/pregnancyService';

// Helper to create a date N days from now
const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

// Helper to create a date N weeks from now
const weeksFromNow = (weeks: number): Date => daysFromNow(weeks * 7);

describe('calculatePregnancyWeek', () => {
  it('returns week 40 when due date is today', () => {
    const dueDate = new Date();
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(40);
  });

  it('returns week 20 when halfway through pregnancy', () => {
    // Due date is 20 weeks away → currently at week 20
    const dueDate = weeksFromNow(20);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(20);
  });

  it('returns week 1 when near the start of pregnancy', () => {
    // Due date is 39 weeks away → currently around week 1
    const dueDate = weeksFromNow(39);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(1);
  });

  it('clamps to minimum of 1 when pregnancy just started', () => {
    // Due date is 41 weeks away → would be week 0 or negative, clamped to 1
    const dueDate = weeksFromNow(41);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(1);
  });

  it('clamps to maximum of 42 when overdue', () => {
    // Due date was 3 weeks ago → week 43, clamped to 42
    const dueDate = daysFromNow(-21);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(42);
  });

  it('returns week 13 at the end of the first trimester', () => {
    // Due date is ~26.5 weeks away → solidly at week 13
    // Avoid exact week boundary to prevent flaky Math.floor timing issues
    const dueDate = daysFromNow(26 * 7 + 3);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(13);
  });

  it('returns week 28 at the start of the third trimester', () => {
    // Due date is ~11.5 weeks away → solidly at week 28
    const dueDate = daysFromNow(12 * 7 - 3);
    const week = calculatePregnancyWeek(dueDate);
    expect(week).toBe(28);
  });

  it('always returns an integer', () => {
    const dueDate = daysFromNow(100);
    const week = calculatePregnancyWeek(dueDate);
    expect(Number.isInteger(week)).toBe(true);
  });
});

describe('daysUntilDueDate', () => {
  it('returns a positive number when due date is in the future', () => {
    const dueDate = daysFromNow(10);
    expect(daysUntilDueDate(dueDate)).toBeGreaterThan(0);
  });

  it('returns approximately correct days remaining', () => {
    const dueDate = daysFromNow(30);
    const days = daysUntilDueDate(dueDate);
    // Allow ±1 day for millisecond timing differences
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('returns a negative number when due date has passed', () => {
    const dueDate = daysFromNow(-5);
    expect(daysUntilDueDate(dueDate)).toBeLessThan(0);
  });

  it('returns approximately 0 when due date is today', () => {
    const dueDate = new Date();
    const days = daysUntilDueDate(dueDate);
    expect(days).toBeGreaterThanOrEqual(-1);
    expect(days).toBeLessThanOrEqual(1);
  });

  it('returns approximately 280 days for a new pregnancy', () => {
    // 40 weeks = 280 days from now
    const dueDate = daysFromNow(280);
    const days = daysUntilDueDate(dueDate);
    expect(days).toBeGreaterThanOrEqual(279);
    expect(days).toBeLessThanOrEqual(281);
  });
});
