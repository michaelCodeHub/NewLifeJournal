import { buildAllWeekDocs, buildWeekDoc, weekDocId } from '../../constants/pregnancyWeeks';

const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, col, id) => ({ path: `${col}/${id}` })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));
jest.mock('../../config/firebase', () => ({ db: {} }));

describe('constants/pregnancyWeeks', () => {
  it('has a complete document for each of weeks 1–40', () => {
    const docs = buildAllWeekDocs();
    expect(docs.map((d) => d.week)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    docs.forEach((d) => {
      expect(d.babySize).toBeTruthy();
      expect(d.babyDevelopment.length).toBeGreaterThan(0);
      expect(d.dailyTips?.length).toBeGreaterThan(0);
      expect(d.pregnancyInfo).toBeDefined();
    });
  });

  it('uses week{N} document ids', () => {
    expect(weekDocId(12)).toBe('week12');
  });

  it('has no content outside 1–40', () => {
    expect(buildWeekDoc(0)).toBeNull();
    expect(buildWeekDoc(41)).toBeNull();
  });
});

describe('getWeekInfo', () => {
  // Fresh module per test: the service caches weeks for the session.
  const load = () => {
    let mod!: typeof import('../../services/firebase/weekInfoService');
    jest.isolateModules(() => {
      mod = require('../../services/firebase/weekInfoService');
    });
    return mod;
  };

  beforeEach(() => mockGetDoc.mockReset());

  it('prefers the Firestore document', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ week: 12, babySize: 'From Firestore' }) });
    const info = await load().getWeekInfo(12);
    expect(mockGetDoc).toHaveBeenCalledWith({ path: 'pregnancyWeeks/week12' });
    expect(info?.babySize).toBe('From Firestore');
  });

  it('falls back to the bundled copy when the collection is not seeded', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const info = await load().getWeekInfo(12);
    expect(info).toEqual(buildWeekDoc(12));
  });

  it('falls back to the bundled copy when Firestore is unreachable', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockGetDoc.mockRejectedValue(new Error('offline'));
    const svc = load();
    expect((await svc.getWeekInfo(20))?.babySize).toBe(buildWeekDoc(20)?.babySize);
    expect(svc.peekWeekInfo(20)).not.toBeNull();
  });
});
