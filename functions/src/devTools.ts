import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from './admin';

/**
 * Dev-only tier override, kept for testing the paywall UX before real store
 * products exist (see MONETIZATION_PLAN.md). Gated behind a Firebase custom
 * claim (`admin: true`) so it can't be invoked by a regular signed-in user
 * even if a debug build of the app ships the Admin screen by mistake.
 *
 * Grant yourself the claim once, from a trusted machine, with the Admin SDK:
 *   admin.auth().setCustomUserClaims(uid, { admin: true })
 * (the user must sign out/in once afterwards for the claim to appear on their ID token)
 */
export const devSetTier = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'This tool is restricted to admin accounts.');
  }

  const override = request.data?.override;
  if (override !== 'free' && override !== 'premium' && override !== null) {
    throw new HttpsError('invalid-argument', 'override must be "free", "premium", or null.');
  }

  await db.collection('users').doc(request.auth.uid).set({ devTierOverride: override }, { merge: true });
  return { ok: true };
});
