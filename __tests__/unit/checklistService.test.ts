import {
  initializeChecklist,
  subscribeToChecklist,
  toggleChecklistItem,
  addCustomChecklistItem,
  deleteChecklistItem,
  DEFAULT_ITEMS,
  CHECKLIST_CATEGORIES,
} from '../../services/firebase/checklistService';
import {
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  collection,
  doc,
  Timestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';

// All Firebase methods are auto-mocked via jest.setup.js
const mockAddDoc = addDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockQuery = query as jest.Mock;
const mockOrderBy = orderBy as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockTimestamp = Timestamp as unknown as { now: jest.Mock };
const mockWriteBatch = writeBatch as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;

const mockDocRef = { id: 'mock-item-id' };
const mockUnsubscribe = jest.fn();

const mockBatch = {
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockReturnValue('mock-collection-ref');
  mockDoc.mockReturnValue('mock-doc-ref');
  mockQuery.mockReturnValue('mock-query-ref');
  mockOrderBy.mockReturnValue('mock-order-by');
  mockAddDoc.mockResolvedValue(mockDocRef);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
  mockWriteBatch.mockReturnValue(mockBatch);
  mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
});

// ─── DEFAULT_ITEMS pure logic ──────────────────────────────────────────────

describe('DEFAULT_ITEMS', () => {
  it('has exactly 30 items', () => {
    expect(DEFAULT_ITEMS.length).toBe(30);
  });

  it('every item has required fields: category, name, checked, isCustom', () => {
    DEFAULT_ITEMS.forEach((item, idx) => {
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('checked');
      expect(item).toHaveProperty('isCustom');
      expect(typeof item.category).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(item.checked).toBe(false);
      expect(item.isCustom).toBe(false);
    });
  });

  it('all six categories are represented in DEFAULT_ITEMS', () => {
    const categoriesInItems = new Set(DEFAULT_ITEMS.map(i => i.category));
    CHECKLIST_CATEGORIES.forEach(cat => {
      expect(categoriesInItems.has(cat)).toBe(true);
    });
  });

  it('CHECKLIST_CATEGORIES has exactly 6 entries', () => {
    expect(CHECKLIST_CATEGORIES.length).toBe(6);
  });
});

// ─── initializeChecklist ──────────────────────────────────────────────────

describe('initializeChecklist', () => {
  it('calls getDocs to check if already initialized', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false, docs: [{}] });

    await initializeChecklist('user-1', 'preg-1');

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('skips batch write if collection is not empty', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false, docs: [{}] });

    await initializeChecklist('user-1', 'preg-1');

    expect(mockBatch.set).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('calls writeBatch and batch.set for each DEFAULT_ITEM when collection is empty', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    await initializeChecklist('user-1', 'preg-1');

    expect(mockWriteBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch.set).toHaveBeenCalledTimes(DEFAULT_ITEMS.length);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('sets pregnancyId and createdAt on each batch item', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    await initializeChecklist('user-1', 'preg-1');

    const firstCallArgs = mockBatch.set.mock.calls[0][1];
    expect(firstCallArgs).toHaveProperty('pregnancyId', 'preg-1');
    expect(firstCallArgs).toHaveProperty('createdAt');
  });

  it('uses the correct Firestore collection path', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    await initializeChecklist('user-1', 'preg-1');

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'checklistItems'
    );
  });
});

// ─── subscribeToChecklist ─────────────────────────────────────────────────

describe('subscribeToChecklist', () => {
  it('calls onSnapshot with a query ordered by category', () => {
    const callback = jest.fn();

    subscribeToChecklist('user-1', 'preg-1', callback);

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'checklistItems'
    );
    expect(mockOrderBy).toHaveBeenCalledWith('category');
    expect(mockQuery).toHaveBeenCalledWith('mock-collection-ref', 'mock-order-by');
    expect(mockOnSnapshot).toHaveBeenCalledWith('mock-query-ref', expect.any(Function));
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToChecklist('user-1', 'preg-1', callback);

    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('maps snapshot docs to ChecklistItem objects with id from doc.id', () => {
    const callback = jest.fn();
    const mockItemData = {
      pregnancyId: 'preg-1',
      category: 'Nursery',
      name: 'Crib or bassinet',
      checked: false,
      isCustom: false,
    };

    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb({
        docs: [{ id: 'item-abc', data: () => mockItemData }],
      });
      return mockUnsubscribe;
    });

    subscribeToChecklist('user-1', 'preg-1', callback);

    expect(callback).toHaveBeenCalledWith([{ id: 'item-abc', ...mockItemData }]);
  });
});

// ─── toggleChecklistItem ──────────────────────────────────────────────────

describe('toggleChecklistItem', () => {
  it('calls updateDoc with checked: true', async () => {
    await toggleChecklistItem('user-1', 'preg-1', 'item-xyz', true);

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'checklistItems',
      'item-xyz'
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { checked: true });
  });

  it('calls updateDoc with checked: false', async () => {
    await toggleChecklistItem('user-1', 'preg-1', 'item-xyz', false);

    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { checked: false });
  });

  it('resolves without error on success', async () => {
    await expect(
      toggleChecklistItem('user-1', 'preg-1', 'item-xyz', true)
    ).resolves.toBeUndefined();
  });
});

// ─── addCustomChecklistItem ───────────────────────────────────────────────

describe('addCustomChecklistItem', () => {
  it('calls addDoc with isCustom: true', async () => {
    await addCustomChecklistItem('user-1', 'preg-1', 'Baby swing', 'Nursery');

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      pregnancyId: 'preg-1',
      category: 'Nursery',
      name: 'Baby swing',
      checked: false,
      isCustom: true,
    });
  });

  it('includes createdAt timestamp', async () => {
    await addCustomChecklistItem('user-1', 'preg-1', 'Baby swing', 'Nursery');

    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).toHaveProperty('createdAt');
    expect(mockTimestamp.now).toHaveBeenCalled();
  });

  it('uses correct collection path', async () => {
    await addCustomChecklistItem('user-1', 'preg-1', 'Baby swing', 'Nursery');

    expect(mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'checklistItems'
    );
  });

  it('resolves without error on success', async () => {
    await expect(
      addCustomChecklistItem('user-1', 'preg-1', 'Baby swing', 'Nursery')
    ).resolves.toBeUndefined();
  });
});

// ─── deleteChecklistItem ──────────────────────────────────────────────────

describe('deleteChecklistItem', () => {
  it('calls deleteDoc with the correct document path', async () => {
    await deleteChecklistItem('user-1', 'preg-1', 'item-xyz');

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'users',
      'user-1',
      'pregnancies',
      'preg-1',
      'checklistItems',
      'item-xyz'
    );
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
  });

  it('resolves without error on successful deletion', async () => {
    await expect(
      deleteChecklistItem('user-1', 'preg-1', 'item-xyz')
    ).resolves.toBeUndefined();
  });
});
