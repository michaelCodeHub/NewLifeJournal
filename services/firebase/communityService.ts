import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  increment,
  setDoc,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface CommunityPost {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  pregnancyWeek?: number;
  likesCount: number;
  commentsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Max lengths, mirrored by the validation in firestore.rules. */
export const POST_MAX_LENGTH = 2000;
export const COMMENT_MAX_LENGTH = 1000;

export interface PostComment {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  createdAt: Timestamp;
}

/**
 * Read a doc with pending server timestamps filled in by a local estimate, so a
 * just-written post/comment has a real `createdAt` (not null) until the server
 * acknowledges it.
 */
const withEstimates = (d: DocumentSnapshot) => d.data({ serverTimestamps: 'estimate' }) ?? {};

// ============ POSTS ============

export const createPost = async (
  userId: string,
  authorName: string,
  authorPhoto: string | null,
  content: string,
  pregnancyWeek?: number
): Promise<string> => {
  const postsRef = collection(db, 'communityPosts');
  // createdAt/updatedAt are server timestamps: the rules require both to equal
  // request.time, so a client can't backdate (or future-pin) a post.
  const newPost = {
    userId,
    authorName: (authorName || 'Anonymous').slice(0, 100), // rules cap names at 100 chars
    authorPhoto,
    content,
    ...(pregnancyWeek !== undefined && { pregnancyWeek }),
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // Create the doc with its id in one write: the rules don't let authors
  // update `id` afterwards, which made the old addDoc + updateDoc pattern throw.
  const docRef = doc(postsRef);
  await setDoc(docRef, { ...newPost, id: docRef.id });
  return docRef.id;
};

export const subscribeToPosts = (
  callback: (posts: CommunityPost[]) => void
): (() => void) => {
  const postsRef = collection(db, 'communityPosts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => ({ ...withEstimates(d), id: d.id }) as CommunityPost);
    callback(posts);
  });
};

export const deletePost = async (postId: string): Promise<void> => {
  await deleteDoc(doc(db, 'communityPosts', postId));
};

// ============ LIKES ============

export const hasUserLiked = async (postId: string, userId: string): Promise<boolean> => {
  const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);
  const likeDoc = await getDoc(likeRef);
  return likeDoc.exists();
};

export const toggleLike = async (postId: string, userId: string): Promise<boolean> => {
  const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);
  const postRef = doc(db, 'communityPosts', postId);
  const likeDoc = await getDoc(likeRef);

  if (likeDoc.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likesCount: increment(-1) });
    return false; // unliked
  } else {
    await setDoc(likeRef, { userId, createdAt: Timestamp.now() });
    await updateDoc(postRef, { likesCount: increment(1) });
    return true; // liked
  }
};

export const getUserLikedPosts = async (
  userId: string,
  postIds: string[]
): Promise<Set<string>> => {
  const likedSet = new Set<string>();
  await Promise.all(
    postIds.map(async (postId) => {
      const likeRef = doc(db, 'communityPosts', postId, 'likes', userId);
      const likeDoc = await getDoc(likeRef);
      if (likeDoc.exists()) likedSet.add(postId);
    })
  );
  return likedSet;
};

// ============ COMMENTS ============

export const addComment = async (
  postId: string,
  userId: string,
  authorName: string,
  authorPhoto: string | null,
  content: string
): Promise<string> => {
  const commentsRef = collection(db, 'communityPosts', postId, 'comments');
  const newComment = {
    userId,
    authorName: (authorName || 'Anonymous').slice(0, 100), // rules cap names at 100 chars
    authorPhoto,
    content,
    createdAt: serverTimestamp(), // rules: must equal request.time
  };
  const docRef = await addDoc(commentsRef, newComment);

  // increment commentsCount on post
  await updateDoc(doc(db, 'communityPosts', postId), { commentsCount: increment(1) });

  return docRef.id;
};

export const subscribeToComments = (
  postId: string,
  callback: (comments: PostComment[]) => void
): (() => void) => {
  const commentsRef = collection(db, 'communityPosts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((d) => ({ ...withEstimates(d), id: d.id }) as PostComment);
    callback(comments);
  });
};

export const deleteComment = async (postId: string, commentId: string): Promise<void> => {
  await deleteDoc(doc(db, 'communityPosts', postId, 'comments', commentId));
  const postRef = doc(db, 'communityPosts', postId);
  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    const current = postSnap.data().commentsCount ?? 0;
    // Rules only allow a ±1 change, so skip the write when the counter is already 0.
    if (current > 0) tx.update(postRef, { commentsCount: current - 1 });
  });
};

// ============ REPORTS ============

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'other';
export const REPORT_REASONS: ReportReason[] = ['spam', 'harassment', 'misinformation', 'other'];

export type ReportTarget =
  | { type: 'post'; postId: string }
  | { type: 'comment'; postId: string; commentId: string };

/**
 * File a report for moderators. Reporters can't read reports back; only
 * accounts with the `moderator` (or `admin`) custom claim can (firestore.rules).
 */
export const reportContent = async (
  reporterId: string,
  target: ReportTarget,
  reason: ReportReason
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'reports'), {
    reporterId,
    targetType: target.type,
    postId: target.postId,
    ...(target.type === 'comment' && { commentId: target.commentId }),
    reason,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export type ReportStatus = 'open' | 'dismissed' | 'removed';

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment';
  postId: string;
  commentId?: string;
  reason: ReportReason;
  createdAt: Timestamp;
  /** Missing until a moderator acts on it. */
  status: ReportStatus;
  resolvedAt?: Timestamp;
}

/** Newest reports first (moderators only). Open ones are sorted to the top by the screen. */
export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(200)),
    (snapshot) =>
      callback(
        snapshot.docs.map((d) => {
          const data = withEstimates(d) as Omit<Report, 'id' | 'status'> & { status?: ReportStatus };
          return { ...data, id: d.id, status: data.status ?? 'open' } as Report;
        })
      ),
    (error) => onError?.(error)
  );

/** The text a report points at, or null if it has already been deleted. */
export const getReportedContent = async (
  report: Pick<Report, 'targetType' | 'postId' | 'commentId'>
): Promise<{ authorName: string; content: string } | null> => {
  const ref =
    report.targetType === 'comment' && report.commentId
      ? doc(db, 'communityPosts', report.postId, 'comments', report.commentId)
      : doc(db, 'communityPosts', report.postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return { authorName: data.authorName ?? 'Community member', content: data.content ?? '' };
};

/**
 * Close a report. 'removed' deletes the reported post or comment first
 * (moderators may delete anyone's content), then marks the report.
 */
export const resolveReport = async (
  report: Pick<Report, 'id' | 'targetType' | 'postId' | 'commentId'>,
  moderatorId: string,
  action: 'dismissed' | 'removed'
): Promise<void> => {
  if (action === 'removed') {
    if (report.targetType === 'comment' && report.commentId) {
      await deleteComment(report.postId, report.commentId);
    } else {
      await deletePost(report.postId);
    }
  }
  await updateDoc(doc(db, 'reports', report.id), {
    status: action,
    resolvedBy: moderatorId,
    resolvedAt: serverTimestamp(),
  });
};

// ============ BLOCKING ============
// users/{uid}/blocked/{blockedUid} = { createdAt, name? }. Owner-only (rules).
// The feed and comments hide blocked authors client-side; `name` is only so
// the Blocked accounts screen can show who's on the list.

export interface BlockedAccount {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

export const blockUser = async (userId: string, blockedUserId: string, name?: string): Promise<void> => {
  if (!userId || !blockedUserId || userId === blockedUserId) {
    throw new Error('You cannot block yourself');
  }
  const cleanName = name?.trim().slice(0, 100);
  await setDoc(doc(db, 'users', userId, 'blocked', blockedUserId), {
    createdAt: serverTimestamp(),
    ...(cleanName ? { name: cleanName } : {}),
  });
};

export const unblockUser = async (userId: string, blockedUserId: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId, 'blocked', blockedUserId));
};

export const getBlockedUserIds = async (userId: string): Promise<Set<string>> => {
  const snap = await getDocs(collection(db, 'users', userId, 'blocked'));
  return new Set(snap.docs.map((d) => d.id));
};

export const subscribeToBlockedUsers = (
  userId: string,
  callback: (blocked: Set<string>) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    collection(db, 'users', userId, 'blocked'),
    (snapshot) => callback(new Set(snapshot.docs.map((d) => d.id))),
    (error) => onError?.(error)
  );

/** The blocked list with names, newest first, for the Blocked accounts screen. */
export const subscribeToBlockedAccounts = (
  userId: string,
  callback: (accounts: BlockedAccount[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    collection(db, 'users', userId, 'blocked'),
    (snapshot) =>
      callback(
        snapshot.docs
          .map((d) => {
            const data = withEstimates(d) as { name?: string; createdAt?: Timestamp };
            return { id: d.id, name: data.name || 'Community member', createdAt: data.createdAt };
          })
          .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      ),
    (error) => onError?.(error)
  );
