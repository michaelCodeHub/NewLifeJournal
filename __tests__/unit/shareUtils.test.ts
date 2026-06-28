import {
  buildTimelineSummary,
  generateTimelineText,
  generateTimelineHTML,
} from '../../utils/shareUtils';
import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../../types/pregnancy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTimestamp = (date: Date = new Date('2024-06-15')) => ({
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

// ─── buildTimelineSummary ────────────────────────────────────────────────────

describe('buildTimelineSummary', () => {
  it('counts visits correctly', () => {
    const visits = [makeVisit(), makeVisit({ id: 'visit-2' }), makeVisit({ id: 'visit-3' })];
    const summary = buildTimelineSummary(makePregnancy(), visits, [], [], 20);
    expect(summary.totalVisits).toBe(3);
  });

  it('counts symptoms correctly', () => {
    const symptoms = [makeSymptom(), makeSymptom({ id: 'symptom-2' })];
    const summary = buildTimelineSummary(makePregnancy(), [], symptoms, [], 20);
    expect(summary.totalSymptoms).toBe(2);
  });

  it('counts milestones correctly', () => {
    const milestones = [makeMilestone(), makeMilestone({ id: 'milestone-2' })];
    const summary = buildTimelineSummary(makePregnancy(), [], [], milestones, 20);
    expect(summary.totalMilestones).toBe(2);
  });

  it('returns null for latestWeight when no visits have weight', () => {
    const visits = [makeVisit({ weight: undefined })];
    const summary = buildTimelineSummary(makePregnancy(), visits, [], [], 20);
    expect(summary.latestWeight).toBeNull();
  });

  it('returns null for latestBP when no visits have blood pressure', () => {
    const visits = [makeVisit({ bloodPressure: undefined })];
    const summary = buildTimelineSummary(makePregnancy(), visits, [], [], 20);
    expect(summary.latestBP).toBeNull();
  });

  it('returns null for latestWeight and latestBP when no visits at all', () => {
    const summary = buildTimelineSummary(makePregnancy(), [], [], [], 20);
    expect(summary.latestWeight).toBeNull();
    expect(summary.latestBP).toBeNull();
  });

  it('returns latestWeight from most recent visit with weight', () => {
    const olderVisit = makeVisit({
      id: 'visit-old',
      date: makeTimestamp(new Date('2024-03-01')) as any,
      weight: 60,
    });
    const newerVisit = makeVisit({
      id: 'visit-new',
      date: makeTimestamp(new Date('2024-06-01')) as any,
      weight: 65,
    });
    const summary = buildTimelineSummary(makePregnancy(), [olderVisit, newerVisit], [], [], 25);
    expect(summary.latestWeight).toBe(65);
  });

  it('returns latestBP from most recent visit with BP', () => {
    const olderVisit = makeVisit({
      id: 'visit-old',
      date: makeTimestamp(new Date('2024-03-01')) as any,
      bloodPressure: '110/70',
    });
    const newerVisit = makeVisit({
      id: 'visit-new',
      date: makeTimestamp(new Date('2024-06-01')) as any,
      bloodPressure: '120/80',
    });
    const summary = buildTimelineSummary(makePregnancy(), [olderVisit, newerVisit], [], [], 25);
    expect(summary.latestBP).toBe('120/80');
  });

  it('returns null firstVisitDate when no visits', () => {
    const summary = buildTimelineSummary(makePregnancy(), [], [], [], 20);
    expect(summary.firstVisitDate).toBeNull();
  });

  it('returns firstVisitDate from the earliest visit', () => {
    const earlyVisit = makeVisit({
      id: 'visit-early',
      date: makeTimestamp(new Date('2024-01-15')) as any,
    });
    const lateVisit = makeVisit({
      id: 'visit-late',
      date: makeTimestamp(new Date('2024-06-15')) as any,
    });
    // Supply in reverse order to confirm sorting
    const summary = buildTimelineSummary(makePregnancy(), [lateVisit, earlyVisit], [], [], 20);
    expect(summary.firstVisitDate).toContain('January');
    expect(summary.firstVisitDate).toContain('2024');
  });

  it('returns the correct currentWeek', () => {
    const summary = buildTimelineSummary(makePregnancy(), [], [], [], 32);
    expect(summary.currentWeek).toBe(32);
  });
});

// ─── generateTimelineText ────────────────────────────────────────────────────

describe('generateTimelineText', () => {
  it("contains the mother's name", () => {
    const pregnancy = makePregnancy({ motherName: 'Alice Smith' });
    const text = generateTimelineText(pregnancy, [], [], [], 20);
    expect(text).toContain('Alice Smith');
  });

  it('contains the current week number', () => {
    const text = generateTimelineText(makePregnancy(), [], [], [], 24);
    expect(text).toContain('Week 24');
  });

  it('contains the visit count', () => {
    const visits = [makeVisit(), makeVisit({ id: 'visit-2' })];
    const text = generateTimelineText(makePregnancy(), visits, [], [], 20);
    expect(text).toContain('Hospital visits: 2');
  });

  it('contains "Shared from NewLifeJournal"', () => {
    const text = generateTimelineText(makePregnancy(), [], [], [], 20);
    expect(text).toContain('Shared from NewLifeJournal');
  });

  it('shows milestones section when milestones exist', () => {
    const milestones = [makeMilestone({ title: 'First heartbeat heard' })];
    const text = generateTimelineText(makePregnancy(), [], [], milestones, 20);
    expect(text).toContain('Milestones');
    expect(text).toContain('First heartbeat heard');
  });

  it('limits milestones to 5 and shows "and X more" when > 5', () => {
    const milestones = Array.from({ length: 8 }, (_, i) =>
      makeMilestone({ id: `ms-${i}`, title: `Milestone ${i}`, week: i + 1 })
    );
    const text = generateTimelineText(makePregnancy(), [], [], milestones, 20);
    expect(text).toContain('and 3 more');
    // Only 5 milestone lines (bullet points) should appear before the "and X more" line
    const bulletCount = (text.match(/^  • /gm) || []).length;
    expect(bulletCount).toBe(5);
  });

  it('omits milestones section when milestones array is empty', () => {
    const text = generateTimelineText(makePregnancy(), [], [], [], 20);
    // The summary line "🌟 Milestones: 0" is always present.
    // The section block (only added when milestones exist) starts with a blank
    // line then "🌟 Milestones" with NO colon. Check for the colon-less form.
    expect(text).not.toContain('\n🌟 Milestones\n');
    // Also confirm no bullet points were emitted
    expect(text).not.toContain('  • Week');
  });

  it('includes symptom count in the text', () => {
    const symptoms = [makeSymptom(), makeSymptom({ id: 'sym-2' }), makeSymptom({ id: 'sym-3' })];
    const text = generateTimelineText(makePregnancy(), [], symptoms, [], 20);
    expect(text).toContain('Symptoms logged: 3');
  });
});

// ─── generateTimelineHTML ────────────────────────────────────────────────────

describe('generateTimelineHTML', () => {
  it('returns a string starting with <!DOCTYPE html>', () => {
    const html = generateTimelineHTML(makePregnancy(), [], [], [], 20);
    expect(html.trim()).toMatch(/^<!DOCTYPE html>/);
  });

  it("contains the mother's name", () => {
    const pregnancy = makePregnancy({ motherName: 'Maria Garcia' });
    const html = generateTimelineHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Maria Garcia');
  });

  it('contains the total visits stat number', () => {
    const visits = [makeVisit(), makeVisit({ id: 'v2' }), makeVisit({ id: 'v3' })];
    const html = generateTimelineHTML(makePregnancy(), visits, [], [], 20);
    expect(html).toContain('>3<');
  });

  it('contains the total symptoms stat number', () => {
    const symptoms = [makeSymptom(), makeSymptom({ id: 's2' })];
    const html = generateTimelineHTML(makePregnancy(), [], symptoms, [], 20);
    expect(html).toContain('>2<');
  });

  it('contains the total milestones stat number', () => {
    const milestones = [makeMilestone()];
    const html = generateTimelineHTML(makePregnancy(), [], [], milestones, 20);
    expect(html).toContain('>1<');
  });

  it('shows milestone HTML section when milestones are present', () => {
    const milestones = [makeMilestone({ title: 'Baby shower' })];
    const html = generateTimelineHTML(makePregnancy(), [], [], milestones, 20);
    expect(html).toContain('Milestones (1)');
    expect(html).toContain('Baby shower');
    expect(html).toContain('class="milestone"');
  });

  it('omits milestone section when milestones array is empty', () => {
    const html = generateTimelineHTML(makePregnancy(), [], [], [], 20);
    expect(html).not.toContain('class="milestone"');
    expect(html).not.toContain('Milestones (');
  });

  it('includes baby name when provided', () => {
    const pregnancy = makePregnancy({ babyName: 'Emma' });
    const html = generateTimelineHTML(pregnancy, [], [], [], 20);
    expect(html).toContain('Baby Emma');
  });

  it('omits baby name section when not provided', () => {
    const pregnancy = makePregnancy({ babyName: undefined });
    const html = generateTimelineHTML(pregnancy, [], [], [], 20);
    expect(html).not.toContain('Baby undefined');
  });

  it('shows latest weight when available', () => {
    const visits = [makeVisit({ weight: 72.5 })];
    const html = generateTimelineHTML(makePregnancy(), visits, [], [], 20);
    expect(html).toContain('72.5 kg');
  });

  it('shows latest BP when available', () => {
    const visits = [makeVisit({ bloodPressure: '118/76' })];
    const html = generateTimelineHTML(makePregnancy(), visits, [], [], 20);
    expect(html).toContain('118/76');
  });

  it('includes the current week in the output', () => {
    const html = generateTimelineHTML(makePregnancy(), [], [], [], 28);
    expect(html).toContain('28');
  });

  it('includes milestone description when present', () => {
    const milestones = [
      makeMilestone({ title: 'First ultrasound', description: 'Heard the heartbeat!' }),
    ];
    const html = generateTimelineHTML(makePregnancy(), [], [], milestones, 20);
    expect(html).toContain('Heard the heartbeat!');
  });

  it('contains "Shared from NewLifeJournal" in the footer', () => {
    const html = generateTimelineHTML(makePregnancy(), [], [], [], 20);
    expect(html).toContain('Shared from NewLifeJournal');
  });
});
