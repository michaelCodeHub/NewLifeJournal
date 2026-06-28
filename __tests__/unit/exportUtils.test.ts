import {
  formatDate,
  formatTimestamp,
  getSeverityLabel,
  generateReportHTML,
} from '../../utils/exportUtils';
import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../../types/pregnancy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTimestamp = (date: Date = new Date('2024-06-01')) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

const makePregnancy = (overrides: Partial<Pregnancy> = {}): Pregnancy => ({
  id: 'preg-1',
  motherName: 'Jane Doe',
  dueDate: makeTimestamp(new Date('2024-12-01')) as any,
  currentWeek: 20,
  status: 'active',
  createdAt: makeTimestamp() as any,
  updatedAt: makeTimestamp() as any,
  ...overrides,
});

const makeVisit = (overrides: Partial<HospitalVisit> = {}): HospitalVisit => ({
  id: 'visit-1',
  pregnancyId: 'preg-1',
  date: makeTimestamp(new Date('2024-05-01')) as any,
  week: 18,
  type: 'checkup',
  createdAt: makeTimestamp() as any,
  ...overrides,
});

const makeSymptom = (overrides: Partial<Symptom> = {}): Symptom => ({
  id: 'symptom-1',
  pregnancyId: 'preg-1',
  date: makeTimestamp(new Date('2024-05-10')) as any,
  week: 19,
  type: 'nausea',
  severity: 2,
  createdAt: makeTimestamp() as any,
  ...overrides,
});

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'milestone-1',
  pregnancyId: 'preg-1',
  date: makeTimestamp(new Date('2024-05-15')) as any,
  week: 20,
  title: 'First kick felt!',
  createdAt: makeTimestamp() as any,
  ...overrides,
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns a non-empty string for a valid Date', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the year in the output', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(result).toContain('2024');
  });

  it('formats different dates distinctly', () => {
    const jan = formatDate(new Date('2024-01-15'));
    const dec = formatDate(new Date('2024-12-15'));
    expect(jan).not.toBe(dec);
  });
});

// ─── formatTimestamp ──────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
  it('returns "—" for null', () => {
    expect(formatTimestamp(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('—');
  });

  it('returns a formatted string for a valid Timestamp-like object', () => {
    const ts = makeTimestamp(new Date('2024-06-01'));
    const result = formatTimestamp(ts);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
    expect(result).toContain('2024');
  });

  it('returns "—" when toDate() throws', () => {
    const badTs = {
      toDate: () => {
        throw new Error('bad timestamp');
      },
    };
    expect(formatTimestamp(badTs)).toBe('—');
  });
});

// ─── getSeverityLabel ─────────────────────────────────────────────────────────

describe('getSeverityLabel', () => {
  it('maps 1 to "Mild"', () => {
    expect(getSeverityLabel(1)).toBe('Mild');
  });

  it('maps 2 to "Moderate"', () => {
    expect(getSeverityLabel(2)).toBe('Moderate');
  });

  it('maps 3 to "Noticeable"', () => {
    expect(getSeverityLabel(3)).toBe('Noticeable');
  });

  it('maps 4 to "Severe"', () => {
    expect(getSeverityLabel(4)).toBe('Severe');
  });

  it('maps 5 to "Very Severe"', () => {
    expect(getSeverityLabel(5)).toBe('Very Severe');
  });

  it('maps 0 to "Unknown"', () => {
    expect(getSeverityLabel(0)).toBe('Unknown');
  });

  it('maps 6 (out of range) to "Unknown"', () => {
    expect(getSeverityLabel(6)).toBe('Unknown');
  });
});

// ─── generateReportHTML ───────────────────────────────────────────────────────

describe('generateReportHTML', () => {
  it('returns a string starting with <!DOCTYPE html>', () => {
    const html = generateReportHTML(makePregnancy(), [], [], [], 20);
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/);
  });

  it('includes the motherName from the pregnancy', () => {
    const pregnancy = makePregnancy({ motherName: 'Alice Smith' });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Alice Smith');
  });

  it('includes the current week number', () => {
    const html = generateReportHTML(makePregnancy(), [], [], [], 24);
    expect(html).toContain('Week 24 of 40');
  });

  it('shows "No hospital visits recorded." when visits array is empty', () => {
    const html = generateReportHTML(makePregnancy(), [], [], [], 20);
    expect(html).toContain('No hospital visits recorded.');
  });

  it('shows "No symptoms recorded." when symptoms array is empty', () => {
    const html = generateReportHTML(makePregnancy(), [], [], [], 20);
    expect(html).toContain('No symptoms recorded.');
  });

  it('shows "No milestones recorded." when milestones array is empty', () => {
    const html = generateReportHTML(makePregnancy(), [], [], [], 20);
    expect(html).toContain('No milestones recorded.');
  });

  it('includes visit count in the output when visits are present', () => {
    const visits = [makeVisit(), makeVisit({ id: 'visit-2' })];
    const html = generateReportHTML(makePregnancy(), visits, [], [], 20);
    expect(html).toContain('Hospital Visits (2)');
  });

  it('includes symptom count in the output when symptoms are present', () => {
    const symptoms = [makeSymptom(), makeSymptom({ id: 'symptom-2' })];
    const html = generateReportHTML(makePregnancy(), [], symptoms, [], 20);
    expect(html).toContain('Symptoms (2)');
  });

  it('includes milestone count in the output when milestones are present', () => {
    const milestones = [makeMilestone()];
    const html = generateReportHTML(makePregnancy(), [], [], milestones, 20);
    expect(html).toContain('Milestones (1)');
  });

  it('shows visit table rows when data is present', () => {
    const visits = [makeVisit({ type: 'ultrasound', week: 18 })];
    const html = generateReportHTML(makePregnancy(), visits, [], [], 20);
    expect(html).toContain('Week 18');
    expect(html).toContain('Ultrasound');
  });

  it('shows symptom table rows when data is present', () => {
    const symptoms = [makeSymptom({ type: 'fatigue', severity: 3 })];
    const html = generateReportHTML(makePregnancy(), [], symptoms, [], 20);
    expect(html).toContain('fatigue');
    expect(html).toContain('Noticeable');
  });

  it('shows milestone title when data is present', () => {
    const milestones = [makeMilestone({ title: 'First ultrasound' })];
    const html = generateReportHTML(makePregnancy(), [], [], milestones, 20);
    expect(html).toContain('First ultrasound');
  });

  it('includes optional doctorName when provided', () => {
    const pregnancy = makePregnancy({ doctorName: 'Dr. Chen' });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Dr. Chen');
  });

  it('includes optional hospital when provided', () => {
    const pregnancy = makePregnancy({ hospital: 'City Medical Center' });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('City Medical Center');
  });

  it('omits doctor section when doctorName is not set', () => {
    const pregnancy = makePregnancy({ doctorName: undefined });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).not.toContain('<div class="label">Doctor</div>');
  });

  it('shows "Not set" when babyName is not provided', () => {
    const pregnancy = makePregnancy({ babyName: undefined });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Not set');
  });

  it('shows babyName when provided', () => {
    const pregnancy = makePregnancy({ babyName: 'Emma' });
    const html = generateReportHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Emma');
  });
});
