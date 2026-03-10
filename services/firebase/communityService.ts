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
  Timestamp,
  increment,
  setDoc,
  runTransaction,
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

export interface PostComment {
  id: string;
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  createdAt: Timestamp;
}

// ============ POSTS ============

export const createPost = async (
  userId: string,
  authorName: string,
  authorPhoto: string | null,
  content: string,
  pregnancyWeek?: number
): Promise<string> => {
  const postsRef = collection(db, 'communityPosts');
  const now = Timestamp.now();
  const newPost: Omit<CommunityPost, 'id'> = {
    userId,
    authorName,
    authorPhoto,
    content,
    ...(pregnancyWeek !== undefined && { pregnancyWeek }),
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(postsRef, newPost);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

export const subscribeToPosts = (
  callback: (posts: CommunityPost[]) => void
): (() => void) => {
  const postsRef = collection(db, 'communityPosts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as CommunityPost);
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
  const newComment: Omit<PostComment, 'id'> = {
    userId,
    authorName,
    authorPhoto,
    content,
    createdAt: Timestamp.now(),
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
    const comments = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as PostComment);
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
    tx.update(postRef, { commentsCount: Math.max(0, current - 1) });
  });
};
