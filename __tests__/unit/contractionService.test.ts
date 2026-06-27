import {
  saveContractionSession,
  subscribeToContractionSessions,
  deleteContractionSession,
  check511Rule,
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
  it('returns false for fewer than 3 contractions', () => {
    expect(check511Rule([])).toBe(false);
    expect(check511Rule([{ durationSeconds: 65, intervalSeconds: 290 }])).toBe(false);
    expect(check511Rule([
      { durationSeconds: 65, intervalSeconds: 290 },
      { durationSeconds: 62, intervalSeconds: 280 },
    ])).toBe(false);
  });

  it('returns false when contractions are too short (< 60s)', () => {
    const contractions = [
      { durationSeconds: 45, intervalSeconds: 290 },
      { durationSeconds: 50, intervalSeconds: 285 },
      { durationSeconds: 55, intervalSeconds: 295 },
    ];
    expect(check511Rule(contractions)).toBe(false);
  });

  it('returns false when intervals are too long (> 300s)', () => {
    const contractions = [
      { durationSeconds: 65, intervalSeconds: 360 },
      { durationSeconds: 70, intervalSeconds: 400 },
      { durationSeconds: 62, intervalSeconds: 310 },
    ];
    expect(check511Rule(contractions)).toBe(false);
  });

  it('returns true when >= 6 contractions all >= 60s and all intervals <= 300s', () => {
    const contractions = [
      { durationSeconds: 60, intervalSeconds: 300 },
      { durationSeconds: 65, intervalSeconds: 290 },
      { durationSeconds: 62, intervalSeconds: 285 },
      { durationSeconds: 70, intervalSeconds: 270 },
      { durationSeconds: 68, intervalSeconds: 295 },
      { durationSeconds: 63, intervalSeconds: 280 },
    ];
    expect(check511Rule(contractions)).toBe(true);
  });

  it('returns true with exactly 3 qualifying contractions in the last 6', () => {
    // 7 total; last 6 all qualify
    const contractions = [
      { durationSeconds: 30, intervalSeconds: 600 }, // early non-qualifying (outside last 6)
      { durationSeconds: 60, intervalSeconds: 300 },
      { durationSeconds: 65, intervalSeconds: 290 },
      { durationSeconds: 62, intervalSeconds: 285 },
      { durationSeconds: 70, intervalSeconds: 270 },
      { durationSeconds: 68, intervalSeconds: 295 },
      { durationSeconds: 63, intervalSeconds: 280 },
    ];
    expect(check511Rule(contractions)).toBe(true);
  });

  it('returns false when last 6 include a non-qualifying contraction', () => {
    const contractions = [
      { durationSeconds: 65, intervalSeconds: 290 },
      { durationSeconds: 62, intervalSeconds: 285 },
      { durationSeconds: 70, intervalSeconds: 270 },
      { durationSeconds: 68, intervalSeconds: 295 },
      { durationSeconds: 30, intervalSeconds: 280 }, // too short
      { durationSeconds: 63, intervalSeconds: 280 },
    ];
    expect(check511Rule(contractions)).toBe(false);
  });
});
