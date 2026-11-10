import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToBlockedUsers } from '../../services/firebase/communityService';

const EMPTY = new Set<string>();
const storageKey = (uid: string) => `community:hidden:${uid}`;

/** Key for a reported item in the hidden set. */
export const hiddenKey = {
  post: (postId: string) => `post:${postId}`,
  comment: (postId: string, commentId: string) => `comment:${postId}/${commentId}`,
};

/**
 * The signed-in user's Community safety state:
 *  - `blocked`: author ids they've blocked (live from users/{uid}/blocked)
 *  - `hidden`: posts/comments they've reported, hidden from their own view
 *    straight away (kept on this device so they stay hidden after a restart)
 */
export function useCommunitySafety(userId: string, enabled = true) {
  const [blocked, setBlocked] = useState<Set<string>>(EMPTY);
  const [hidden, setHidden] = useState<Set<string>>(EMPTY);

  useEffect(() => {
    if (!userId || !enabled) {
      setBlocked(EMPTY);
      return;
    }
    return subscribeToBlockedUsers(userId, setBlocked, () => {});
  }, [userId, enabled]);

  useEffect(() => {
    if (!userId) {
      setHidden(EMPTY);
      return;
    }
    let active = true;
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (!active || !raw) return;
        const ids = JSON.parse(raw);
        // Merge: something may have been hidden before the read resolved.
        if (Array.isArray(ids)) setHidden((prev) => new Set([...ids, ...prev]));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const hide = useCallback(
    (key: string) => {
      setHidden((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        if (userId) AsyncStorage.setItem(storageKey(userId), JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    [userId]
  );

  // No optimistic `blocked` update needed: Firestore's latency compensation
  // fires the blocked-list listener as soon as blockUser() writes locally.
  return { blocked, hidden, hide };
}
