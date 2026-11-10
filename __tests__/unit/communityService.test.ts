import {
  createPost,
  toggleLike,
  getUserLikedPosts,
  addComment,
  deleteComment,
  reportContent,
  blockUser,
  unblockUser,
  getBlockedUserIds,
  subscribeToBlockedUsers,
  subscribeToBlockedAccounts,
  subscribeToReports,
  getReportedContent,
  resolveReport,
} from '../../services/firebase/communityService';
import {
  addDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  setDoc,
  runTransaction,
  collection,
  doc,
  increment,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

// jest.setup.js's firestore mock predates serverTimestamp(); add a sentinel.
const SERVER_TS = { __serverTimestamp: true };
jest.requireMock('firebase/firestore').serverTimestamp = jest.fn(() => SERVER_TS);

// All Firebase methods are auto-mocked via jest.setup.js
const mockAddDoc = addDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockRunTransaction = runTransaction as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockIncrement = increment as jest.Mock;

const mockDocRef = { id: 'mock-doc-id' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCollection.mockReturnValue('mock-collection-ref');
  mockDoc.mockReturnValue('mock-doc-ref');
  mockAddDoc.mockResolvedValue(mockDocRef);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockSetDoc.mockResolvedValue(undefined);
});

describe('createPost', () => {
  // createPost allocates the ref first with doc(collection), then setDoc()s it.
  beforeEach(() => mockDoc.mockReturnValue(mockDocRef));

  it('creates a post and returns the document id', async () => {
    const id = await createPost('user-1', 'Alice', null, 'Hello world!', 12);
    expect(id).toBe('mock-doc-id');
    // One write that already contains the id: authors may not update `id` later (rules).
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ id: 'mock-doc-id' });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('includes pregnancyWeek when provided', async () => {
    await createPost('user-1', 'Alice', null, 'Hello!', 20);
    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs).toMatchObject({
      userId: 'user-1',
      authorName: 'Alice',
      content: 'Hello!',
      pregnancyWeek: 20,
      likesCount: 0,
      commentsCount: 0,
    });
  });

  it('omits pregnancyWeek when not provided', async () => {
    await createPost('user-1', 'Alice', null, 'Hello!');
    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('pregnancyWeek');
  });

  it('uses server timestamps for createdAt/updatedAt (rules require request.time)', async () => {
    await createPost('user-1', 'Alice', null, 'Hi');
    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs.createdAt).toBe(SERVER_TS);
    expect(callArgs.updatedAt).toBe(SERVER_TS);
    expect(Object.keys(callArgs).sort()).toEqual(
      ['authorName', 'authorPhoto', 'commentsCount', 'content', 'createdAt', 'id', 'likesCount', 'updatedAt', 'userId'].sort()
    );
  });

  it('initializes likesCount and commentsCount to 0', async () => {
    await createPost('user-1', 'Alice', null, 'Test post');
    const callArgs = mockSetDoc.mock.calls[0][1];
    expect(callArgs.likesCount).toBe(0);
    expect(callArgs.commentsCount).toBe(0);
  });
});

describe('toggleLike', () => {
  it('likes a post when user has not liked it yet', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await toggleLike('post-1', 'user-1');

    expect(result).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { likesCount: expect.anything() });
  });

  it('unlikes a post when user has already liked it', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });

    const result = await toggleLike('post-1', 'user-1');

    expect(result).toBe(false);
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { likesCount: expect.anything() });
  });
});

describe('getUserLikedPosts', () => {
  it('returns an empty set when user has liked no posts', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const likedSet = await getUserLikedPosts('user-1', ['post-1', 'post-2', 'post-3']);

    expect(likedSet).toBeInstanceOf(Set);
    expect(likedSet.size).toBe(0);
  });

  it('returns a set containing only the liked post ids', async () => {
    mockGetDoc.mockImplementation((ref: string) => {
      // Return liked for 'post-2' only (based on call order)
      const callCount = mockGetDoc.mock.calls.length;
      if (callCount === 2) {
        return Promise.resolve({ exists: () => true });
      }
      return Promise.resolve({ exists: () => false });
    });

    const likedSet = await getUserLikedPosts('user-1', ['post-1', 'post-2', 'post-3']);

    expect(likedSet).toBeInstanceOf(Set);
    expect(likedSet.size).toBeLessThanOrEqual(3);
  });

  it('returns a set with all posts when user liked all of them', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });

    const postIds = ['post-1', 'post-2', 'post-3'];
    const likedSet = await getUserLikedPosts('user-1', postIds);

    expect(likedSet.size).toBe(3);
    postIds.forEach((id) => expect(likedSet.has(id)).toBe(true));
  });

  it('returns an empty set when given an empty post ids array', async () => {
    const likedSet = await getUserLikedPosts('user-1', []);
    expect(likedSet.size).toBe(0);
    expect(mockGetDoc).not.toHaveBeenCalled();
  });
});

describe('addComment', () => {
  it('adds a comment and increments the post commentsCount', async () => {
    const commentId = await addComment('post-1', 'user-1', 'Alice', null, 'Nice post!');

    expect(commentId).toBe('mock-doc-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const commentData = mockAddDoc.mock.calls[0][1];
    expect(commentData).toMatchObject({
      userId: 'user-1',
      authorName: 'Alice',
      content: 'Nice post!',
      createdAt: SERVER_TS,
    });
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      commentsCount: expect.anything(),
    });
  });
});

describe('deleteComment', () => {
  it('deletes the comment document and decrements commentsCount via transaction', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updateFn: Function) => {
      const mockTx = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ commentsCount: 3 }),
        }),
        update: jest.fn(),
      };
      await updateFn(mockTx);
    });

    await deleteComment('post-1', 'comment-1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('reportContent', () => {
  it('files a post report with only the allowed fields', async () => {
    const id = await reportContent('user-1', { type: 'post', postId: 'post-1' }, 'spam');
    expect(id).toBe('mock-doc-id');
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'reports');
    expect(mockAddDoc.mock.calls[0][1]).toEqual({
      reporterId: 'user-1',
      targetType: 'post',
      postId: 'post-1',
      reason: 'spam',
      createdAt: SERVER_TS,
    });
  });

  it('includes commentId for a comment report', async () => {
    await reportContent('user-1', { type: 'comment', postId: 'post-1', commentId: 'c-1' }, 'harassment');
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({ targetType: 'comment', postId: 'post-1', commentId: 'c-1' });
  });
});

describe('blocking', () => {
  it('blockUser writes users/{uid}/blocked/{blockedUid} = { createdAt }', async () => {
    await blockUser('user-1', 'user-2');
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-1', 'blocked', 'user-2');
    expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', { createdAt: SERVER_TS });
  });

  it('refuses to block yourself', async () => {
    await expect(blockUser('user-1', 'user-1')).rejects.toThrow();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('unblockUser deletes the blocked doc', async () => {
    await unblockUser('user-1', 'user-2');
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-1', 'blocked', 'user-2');
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
  });

  it('getBlockedUserIds returns the doc ids as a set', async () => {
    (getDocs as jest.Mock).mockResolvedValue({ docs: [{ id: 'a' }, { id: 'b' }] });
    const ids = await getBlockedUserIds('user-1');
    expect([...ids]).toEqual(['a', 'b']);
  });

  it('subscribeToBlockedUsers emits a set of ids', () => {
    const unsub = jest.fn();
    (onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
      next({ docs: [{ id: 'x' }] });
      return unsub;
    });
    const cb = jest.fn();
    expect(subscribeToBlockedUsers('user-1', cb)).toBe(unsub);
    expect(cb).toHaveBeenCalledWith(new Set(['x']));
  });
});

describe('named blocks', () => {
  it('blockUser stores a trimmed display name when given', async () => {
    await blockUser('user-1', 'user-2', '  Bob  ');
    expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', { createdAt: SERVER_TS, name: 'Bob' });
  });

  it('subscribeToBlockedAccounts lists names newest first, with a fallback name', () => {
    const ts = (ms: number) => ({ toMillis: () => ms });
    (onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
      next({
        docs: [
          { id: 'old', data: () => ({ name: 'Old', createdAt: ts(1) }) },
          { id: 'new', data: () => ({ createdAt: ts(2) }) },
        ],
      });
      return jest.fn();
    });
    const cb = jest.fn();
    subscribeToBlockedAccounts('user-1', cb);
    expect(cb.mock.calls[0][0].map((a: any) => [a.id, a.name])).toEqual([
      ['new', 'Community member'],
      ['old', 'Old'],
    ]);
  });
});

describe('moderation', () => {
  it('subscribeToReports marks reports without a status as open', () => {
    (onSnapshot as jest.Mock).mockImplementation((_ref, next) => {
      next({
        docs: [
          { id: 'r1', data: () => ({ reason: 'spam' }) },
          { id: 'r2', data: () => ({ reason: 'other', status: 'dismissed' }) },
        ],
      });
      return jest.fn();
    });
    const cb = jest.fn();
    subscribeToReports(cb);
    expect(cb.mock.calls[0][0].map((r: any) => [r.id, r.status])).toEqual([
      ['r1', 'open'],
      ['r2', 'dismissed'],
    ]);
  });

  it('getReportedContent returns null when the content is gone', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await expect(getReportedContent({ targetType: 'post', postId: 'p1' })).resolves.toBeNull();
  });

  it('getReportedContent reads a comment by its path', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ authorName: 'Ann', content: 'Hi' }) });
    await expect(getReportedContent({ targetType: 'comment', postId: 'p1', commentId: 'c1' })).resolves.toEqual({
      authorName: 'Ann',
      content: 'Hi',
    });
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'communityPosts', 'p1', 'comments', 'c1');
  });

  it('dismissing only marks the report', async () => {
    await resolveReport({ id: 'r1', targetType: 'post', postId: 'p1' }, 'mod-1', 'dismissed');
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'reports', 'r1');
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      status: 'dismissed',
      resolvedBy: 'mod-1',
      resolvedAt: SERVER_TS,
    });
  });

  it('removing deletes the post before marking the report', async () => {
    await resolveReport({ id: 'r1', targetType: 'post', postId: 'p1' }, 'mod-1', 'removed');
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'communityPosts', 'p1');
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockDeleteDoc.mock.invocationCallOrder[0]).toBeLessThan(mockUpdateDoc.mock.invocationCallOrder[0]);
    expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({ status: 'removed' });
  });
});
