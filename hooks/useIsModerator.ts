import { useEffect, useState } from 'react';
import { auth } from '../config/firebase';

/**
 * null while checking, then true when the signed-in account has the `moderator` (or `admin`) custom
 * claim. Granted with `node functions/scripts/setModerator.js <email>`; the
 * person must sign out and back in once for a new claim to reach their token.
 */
export function useIsModerator(uid: string | undefined): boolean | null {
  // null while the token is being checked.
  const [isModerator, setIsModerator] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const current = auth.currentUser;
    if (!uid || !current || current.uid !== uid) {
      setIsModerator(false);
      return;
    }
    setIsModerator(null);
    current
      .getIdTokenResult()
      .then((token) => {
        if (active) setIsModerator(token.claims.moderator === true || token.claims.admin === true);
      })
      .catch(() => {
        if (active) setIsModerator(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  return isModerator;
}
