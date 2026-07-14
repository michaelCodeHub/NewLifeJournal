import {
  addHospitalVisitService,
  getHospitalVisits,
  subscribeToHospitalVisits,
  deleteHospitalVisit,
} from '../../services/firebase/hospitalVisitService';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  collection,
  doc,
  Timestamp,
} from 'firebase/firestore';

// All Firebase methods are auto-mocked via jest.setup.js
const mockAddDoc = addDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockQuery = query as jest.Mock;
const mockOrderBy = orderBy as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockTimestamp = Timestamp as unknown as { now: jest.Mock; fromDate: jest.Mock };

const mockDocRef = { id: 'mock-visit-id' };
const mockUnsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockReturnValue('mock-collection-ref');
  mockDoc.mockReturnValue('mock-doc-ref');
  mockQuery.mockReturnValue('mock-query-ref');
  mockOrderBy.mockReturnValue('mock-order-by');
  mockAddDoc.mockResolvedValue(mockDocRef);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockGetDocs.mockResolvedValue({ docs: [] });
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
});

describe('addHospitalVisitService', () => {
  const visitData = {
    date: { seconds: 1000, nanoseconds: 0 } as any,
    week: 20,
    type: 'ultrasound' as const,
    weight: 140,
    bloodPressure: '110/70',
    notes: 'Anatomy scan',
  };

  it('calls addDoc with the correct collection path and visit data', async () => {
    await addHospitalVisitService('user-1', 'preg-1', visitData);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'hospitalVisits'
    );
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      pregnancyId: 'preg-1',
      week: 20,
      type: 'ultrasound',
      weight: 140,
      bloodPressure: '110/70',
    });
    expect(callArgs).toHaveProperty('createdAt');
  });

  it('writes the generated id back onto the document via updateDoc', async () => {
    const id = await addHospitalVisitService('user-1', 'preg-1', visitData);

    expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, { id: mockDocRef.id });
    expect(id).toBe(mockDocRef.id);
  });

  it('includes createdAt set via Timestamp.now()', async () => {
    await addHospitalVisitService('user-1', 'preg-1', visitData);

    expect(mockTimestamp.now).toHaveBeenCalled();
  });
});

describe('getHospitalVisits', () => {
  it('queries the correct collection ordered by date descending', async () => {
    await getHospitalVisits('user-1', 'preg-1');

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'hospitalVisits'
    );
    expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    expect(mockQuery).toHaveBeenCalledWith('mock-collection-ref', 'mock-order-by');
    expect(mockGetDocs).toHaveBeenCalledWith('mock-query-ref');
  });

  it('maps snapshot docs to HospitalVisit objects', async () => {
    const mockVisit = { id: 'visit-1', pregnancyId: 'preg-1', week: 20, type: 'checkup' };
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => mockVisit }],
    });

    const visits = await getHospitalVisits('user-1', 'preg-1');

    expect(visits).toEqual([mockVisit]);
  });

  it('propagates errors from getDocs', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('firestore down'));

    await expect(getHospitalVisits('user-1', 'preg-1')).rejects.toThrow('firestore down');
  });
});

describe('subscribeToHospitalVisits', () => {
  it('calls onSnapshot with a query ordered by date descending', () => {
    const callback = jest.fn();

    subscribeToHospitalVisits('user-1', 'preg-1', callback);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'hospitalVisits'
    );
    expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    expect(mockQuery).toHaveBeenCalledWith('mock-collection-ref', 'mock-order-by');
    expect(mockOnSnapshot).toHaveBeenCalledWith('mock-query-ref', expect.any(Function));
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToHospitalVisits('user-1', 'preg-1', callback);

    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('maps snapshot docs to HospitalVisit objects with id from doc.id', () => {
    const callback = jest.fn();
    const mockVisitData = { pregnancyId: 'preg-1', week: 20, type: 'checkup' };

    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb({
        docs: [{ id: 'visit-abc', data: () => mockVisitData }],
      });
      return mockUnsubscribe;
    });

    subscribeToHospitalVisits('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith([{ id: 'visit-abc', ...mockVisitData }]);
  });
});

describe('deleteHospitalVisit', () => {
  it('calls deleteDoc with the correct document path', async () => {
    await deleteHospitalVisit('user-1', 'preg-1', 'visit-xyz');

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'hospitalVisits',
      'visit-xyz'
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
  });

  it('resolves without error on successful deletion', async () => {
    await expect(
      deleteHospitalVisit('user-1', 'preg-1', 'visit-xyz')
    ).resolves.toBeUndefined();
  });

  it('propagates errors from deleteDoc', async () => {
    mockDeleteDoc.mockRejectedValueOnce(new Error('permission denied'));

    await expect(
      deleteHospitalVisit('user-1', 'preg-1', 'visit-xyz')
    ).rejects.toThrow('permission denied');
  });
});
