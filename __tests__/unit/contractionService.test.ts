import {
  saveContractionSession,
  subscribeToContractionSessions,
  deleteContractionSession,
  check511Rule,
  contractionSummary,
} from '../../services/firebase/contractionService';
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  collection,
  doc,
  Timestamp,
} from 'firebase/firestore';

// All Firebase methods are auto-mocked via jest.setup.js
const mockAddDoc = addDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockQuery = query as jest.Mock;
const mockOrderBy = orderBy as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockTimestamp = Timestamp as unknown as { now: jest.Mock; fromDate: jest.Mock };

const mockDocRef = { id: 'mock-session-id' };
const mockUnsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockReturnValue('mock-collection-ref');
  mockDoc.mockReturnValue('mock-doc-ref');
  mockQuery.mockReturnValue('mock-query-ref');
  mockOrderBy.mockReturnValue('mock-order-by');
  mockAddDoc.mockResolvedValue(mockDocRef);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
});

describe('saveContractionSession', () => {
  it('calls addDoc with the correct collection path and session data', async () => {
    const session = {
      pregnancyId: 'preg-1',
      date: { seconds: 1000, nanoseconds: 0 } as any,
      week: 38,
      contractions: [],
      durationMinutes: 60,
      averageDurationSeconds: 65,
      averageIntervalSeconds: 290,
    };

    await saveContractionSession('user-1', 'preg-1', session);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'contractionSessions'
    );
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      pregnancyId: 'preg-1',
      week: 38,
      durationMinutes: 60,
      averageDurationSeconds: 65,
      averageIntervalSeconds: 290,
    });
    expect(callArgs).toHaveProperty('createdAt');
  });

  it('includes createdAt set via Timestamp.now()', async () => {
    const session = {
      pregnancyId: 'preg-2',
      date: { seconds: 2000, nanoseconds: 0 } as any,
      week: 39,
      contractions: [],
      durationMinutes: 90,
      averageDurationSeconds: 70,
      averageIntervalSeconds: 270,
    };

    await saveContractionSession('user-1', 'preg-2', session);

    expect(mockTimestamp.now).toHaveBeenCalled();
  });
});

describe('subscribeToContractionSessions', () => {
  it('calls onSnapshot with a query ordered by date descending', () => {
    const callback = jest.fn();

    subscribeToContractionSessions('user-1', 'preg-1', callback);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'contractionSessions'
    );
    expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    expect(mockQuery).toHaveBeenCalledWith('mock-collection-ref', 'mock-order-by');
    expect(mockOnSnapshot).toHaveBeenCalledWith('mock-query-ref', expect.any(Function));
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToContractionSessions('user-1', 'preg-1', callback);

    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('maps snapshot docs to ContractionSession objects with id from doc.id', () => {
    const callback = jest.fn();
    const mockSessionData = {
      pregnancyId: 'preg-1',
      week: 38,
      contractions: [],
      durationMinutes: 60,
      averageDurationSeconds: 62,
      averageIntervalSeconds: 285,
    };

    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb({
        docs: [
          { id: 'session-abc', data: () => mockSessionData },
        ],
      });
      return mockUnsubscribe;
    });

    subscribeToContractionSessions('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith([
      { id: 'session-abc', ...mockSessionData },
    ]);
  });
});

describe('deleteContractionSession', () => {
  it('calls deleteDoc with the correct document path', async () => {
    await deleteContractionSession('user-1', 'preg-1', 'session-xyz');

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'contractionSessions',
      'session-xyz'
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
  });

  it('resolves without error on successful deletion', async () => {
    await expect(
      deleteContractionSession('user-1', 'preg-1', 'session-xyz')
    ).resolves.toBeUndefined();
  });
});

describe('check511Rule', () => {
  const MIN = 60_000;
  /** n contractions, `every` minutes apart (start to start), each `len` seconds long. */
  const series = (n: number, every: number, len: number, from = 0) =>
    Array.from({ length: n }, (_, i) => ({ start: from + i * every * MIN, durationSeconds: len }));

  it('is false with fewer than 2 contractions', () => {
    expect(check511Rule([])).toBe(false);
    expect(check511Rule([{ start: 0, durationSeconds: 70 }])).toBe(false);
  });

  it('is true once contractions every 5 min, 1 min long, have lasted an hour', () => {
    // 13 contractions 5 min apart: first start 0 → last end 60m + 65s.
    expect(check511Rule(series(13, 5, 65))).toBe(true);
  });

  it('is false when the pattern has not lasted an hour yet', () => {
    expect(check511Rule(series(6, 5, 65))).toBe(false);
  });

  it('is false when contractions are too short', () => {
    expect(check511Rule(series(15, 5, 45))).toBe(false);
  });

  it('is false when contractions are more than 5 minutes apart', () => {
    expect(check511Rule(series(15, 6, 70))).toBe(false);
  });

  it('only counts the unbroken run up to the latest contraction', () => {
    // An hour of qualifying contractions, then a long gap, then a short new run.
    const early = series(14, 5, 65);
    const late = series(4, 5, 65, 3 * 60 * MIN);
    expect(check511Rule([...early, ...late])).toBe(false);
    // ...and a single short contraction at the end breaks it.
    expect(check511Rule([...series(14, 5, 65), { start: 70 * MIN, durationSeconds: 30 }])).toBe(false);
  });
});

describe('contractionSummary', () => {
  it('summarises the last contractions for sharing', () => {
    const list = Array.from({ length: 12 }, (_, i) => ({ start: i * 4 * 60_000, durationSeconds: 58 }));
    const text = contractionSummary(list);
    expect(text).toContain('Last 10 contractions: avg 58s long, avg 4m apart (start to start).');
    expect(text).toContain('12 timed since');
  });

  it('handles an empty or single-contraction session', () => {
    expect(contractionSummary([])).toBe('No contractions timed yet.');
    expect(contractionSummary([{ start: 0, durationSeconds: 61 }])).toContain('Last 1 contraction: avg 1m 1s long.');
  });
});
