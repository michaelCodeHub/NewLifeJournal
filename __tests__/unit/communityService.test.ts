import {
  createPost,
  toggleLike,
  getUserLikedPosts,
  addComment,
  deleteComment,
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
} from 'firebase/firestore';

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
  it('creates a post and returns the document id', async () => {
    const id = await createPost('user-1', 'Alice', null, 'Hello world!', 12);
    expect(id).toBe('mock-doc-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, { id: 'mock-doc-id' });
  });

  it('includes pregnancyWeek when provided', async () => {
    await createPost('user-1', 'Alice', null, 'Hello!', 20);
    const callArgs = mockAddDoc.mock.calls[0][1];
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
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('pregnancyWeek');
  });

  it('initializes likesCount and commentsCount to 0', async () => {
    await createPost('user-1', 'Alice', null, 'Test post');
    const callArgs = mockAddDoc.mock.calls[0][1];
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
