import {
  parseBloodPressure,
  getWeightDataPoints,
  getBPDataPoints,
  formatWeekLabel,
} from '../../utils/chartUtils';
import { HospitalVisit } from '../../types/pregnancy';

// Helper to create a mock Firestore Timestamp
const makeTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

// Helper to build a minimal HospitalVisit for tests
const makeVisit = (overrides: Partial<HospitalVisit> & { dateObj?: Date }): HospitalVisit => {
  const date = overrides.dateObj ?? new Date('2024-06-01');
  return {
    id: 'test-id',
    pregnancyId: 'preg-id',
    date: makeTimestamp(date) as any,
    week: 20,
    type: 'checkup',
    createdAt: makeTimestamp(new Date()) as any,
    ...overrides,
  };
};

// ─── parseBloodPressure ────────────────────────────────────────────────────

describe('parseBloodPressure', () => {
  it('parses a valid "120/80" string', () => {
    expect(parseBloodPressure('120/80')).toEqual({ systolic: 120, diastolic: 80 });
  });

  it('parses with extra whitespace "130 / 85"', () => {
    expect(parseBloodPressure('130 / 85')).toEqual({ systolic: 130, diastolic: 85 });
  });

  it('returns null for undefined', () => {
    expect(parseBloodPressure(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseBloodPressure(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBloodPressure('')).toBeNull();
  });

  it('returns null when there is no slash — single value "120"', () => {
    expect(parseBloodPressure('120')).toBeNull();
  });

  it('returns null for non-numeric values "abc/def"', () => {
    expect(parseBloodPressure('abc/def')).toBeNull();
  });

  it('returns null when one part is non-numeric "120/abc"', () => {
    expect(parseBloodPressure('120/abc')).toBeNull();
  });
});

// ─── getWeightDataPoints ───────────────────────────────────────────────────

describe('getWeightDataPoints', () => {
  it('returns empty array for empty input', () => {
    expect(getWeightDataPoints([])).toEqual([]);
  });

  it('filters out visits without weight', () => {
    const visits = [makeVisit({ week: 10 })]; // no weight field
    expect(getWeightDataPoints(visits)).toHaveLength(0);
  });

  it('filters out visits with weight = 0', () => {
    const visits = [makeVisit({ week: 10, weight: 0 })];
    expect(getWeightDataPoints(visits)).toHaveLength(0);
  });

  it('includes visits that have a positive weight', () => {
    const visits = [makeVisit({ week: 12, weight: 62.5 })];
    const result = getWeightDataPoints(visits);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(62.5);
    expect(result[0].week).toBe(12);
  });

  it('sorts results by date ascending', () => {
    const visits = [
      makeVisit({ week: 20, weight: 70, dateObj: new Date('2024-08-01') }),
      makeVisit({ week: 10, weight: 62, dateObj: new Date('2024-06-01') }),
      makeVisit({ week: 30, weight: 78, dateObj: new Date('2024-10-01') }),
    ];
    const result = getWeightDataPoints(visits);
    expect(result.map(p => p.week)).toEqual([10, 20, 30]);
  });

  it('mixes visits with and without weight correctly', () => {
    const visits = [
      makeVisit({ week: 8 }),             // no weight — excluded
      makeVisit({ week: 12, weight: 60 }),
      makeVisit({ week: 16, weight: 63 }),
    ];
    const result = getWeightDataPoints(visits);
    expect(result).toHaveLength(2);
  });
});

// ─── getBPDataPoints ───────────────────────────────────────────────────────

describe('getBPDataPoints', () => {
  it('returns empty array for empty input', () => {
    expect(getBPDataPoints([])).toEqual([]);
  });

  it('filters out visits without bloodPressure', () => {
    const visits = [makeVisit({ week: 10 })];
    expect(getBPDataPoints(visits)).toHaveLength(0);
  });

  it('skips visits with malformed BP strings', () => {
    const visits = [makeVisit({ week: 10, bloodPressure: 'bad-data' })];
    expect(getBPDataPoints(visits)).toHaveLength(0);
  });

  it('parses a valid BP entry', () => {
    const visits = [makeVisit({ week: 16, bloodPressure: '118/76' })];
    const result = getBPDataPoints(visits);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ week: 16, systolic: 118, diastolic: 76 });
  });

  it('sorts results by date ascending', () => {
    const visits = [
      makeVisit({ week: 30, bloodPressure: '130/85', dateObj: new Date('2024-10-01') }),
      makeVisit({ week: 10, bloodPressure: '110/70', dateObj: new Date('2024-06-01') }),
      makeVisit({ week: 20, bloodPressure: '120/78', dateObj: new Date('2024-08-01') }),
    ];
    const result = getBPDataPoints(visits);
    expect(result.map(p => p.week)).toEqual([10, 20, 30]);
  });

  it('skips malformed entries but keeps valid ones in mixed list', () => {
    const visits = [
      makeVisit({ week: 10, bloodPressure: 'notvalid', dateObj: new Date('2024-06-01') }),
      makeVisit({ week: 20, bloodPressure: '120/80', dateObj: new Date('2024-08-01') }),
    ];
    const result = getBPDataPoints(visits);
    expect(result).toHaveLength(1);
    expect(result[0].systolic).toBe(120);
  });
});

// ─── formatWeekLabel ──────────────────────────────────────────────────────

describe('formatWeekLabel', () => {
  it('formats week 1 as "W1"', () => {
    expect(formatWeekLabel(1)).toBe('W1');
  });

  it('formats week 12 as "W12"', () => {
    expect(formatWeekLabel(12)).toBe('W12');
  });

  it('formats week 40 as "W40"', () => {
    expect(formatWeekLabel(40)).toBe('W40');
  });
});
