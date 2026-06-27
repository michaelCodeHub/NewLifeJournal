import {
  addKickSession,
  subscribeToKickSessions,
  deleteKickSession,
} from '../../services/firebase/kickCounterService';
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

describe('addKickSession', () => {
  it('calls addDoc with the correct collection path and session data', async () => {
    const session = {
      pregnancyId: 'preg-1',
      date: { seconds: 1000, nanoseconds: 0 } as any,
      week: 24,
      kickCount: 12,
      durationMinutes: 15,
      targetReached: true,
    };

    await addKickSession('user-1', 'preg-1', session);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'kickSessions'
    );
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      pregnancyId: 'preg-1',
      week: 24,
      kickCount: 12,
      durationMinutes: 15,
      targetReached: true,
    });
    expect(callArgs).toHaveProperty('createdAt');
  });

  it('includes createdAt timestamp set via Timestamp.now()', async () => {
    const session = {
      pregnancyId: 'preg-2',
      date: { seconds: 2000, nanoseconds: 0 } as any,
      week: 30,
      kickCount: 5,
      durationMinutes: 20,
      targetReached: false,
    };

    await addKickSession('user-1', 'preg-2', session);

    expect(mockTimestamp.now).toHaveBeenCalled();
  });

  it('saves session with targetReached=true when kickCount >= 10', async () => {
    const session = {
      pregnancyId: 'preg-1',
      date: { seconds: 1000, nanoseconds: 0 } as any,
      week: 20,
      kickCount: 10,
      durationMinutes: 30,
      targetReached: true, // caller sets this
    };

    await addKickSession('user-1', 'preg-1', session);

    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs.targetReached).toBe(true);
    expect(callArgs.kickCount).toBe(10);
  });

  it('saves session with targetReached=false when kickCount < 10', async () => {
    const session = {
      pregnancyId: 'preg-1',
      date: { seconds: 1000, nanoseconds: 0 } as any,
      week: 20,
      kickCount: 7,
      durationMinutes: 10,
      targetReached: false,
    };

    await addKickSession('user-1', 'preg-1', session);

    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs.targetReached).toBe(false);
  });
});

describe('subscribeToKickSessions', () => {
  it('calls onSnapshot with a query ordered by date descending', () => {
    const callback = jest.fn();

    subscribeToKickSessions('user-1', 'preg-1', callback);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'kickSessions'
    );
    expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    expect(mockQuery).toHaveBeenCalledWith('mock-collection-ref', 'mock-order-by');
    expect(mockOnSnapshot).toHaveBeenCalledWith('mock-query-ref', expect.any(Function));
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToKickSessions('user-1', 'preg-1', callback);

    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('maps snapshot docs to KickSession objects with id from doc.id', () => {
    const callback = jest.fn();
    const mockSessionData = {
      pregnancyId: 'preg-1',
      week: 22,
      kickCount: 10,
      durationMinutes: 18,
      targetReached: true,
    };

    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb({
        docs: [
          { id: 'session-abc', data: () => mockSessionData },
        ],
      });
      return mockUnsubscribe;
    });

    subscribeToKickSessions('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith([
      { id: 'session-abc', ...mockSessionData },
    ]);
  });
});

describe('deleteKickSession', () => {
  it('calls deleteDoc with the correct document path', async () => {
    await deleteKickSession('user-1', 'preg-1', 'session-xyz');

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'kickSessions',
      'session-xyz'
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
  });

  it('resolves without error on successful deletion', async () => {
    await expect(deleteKickSession('user-1', 'preg-1', 'session-xyz')).resolves.toBeUndefined();
  });
});
