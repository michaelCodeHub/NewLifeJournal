import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { resetConsent } from '../monitoring/consent';

const deleteAccountCallable = httpsCallable<void, { ok: boolean }>(functions, 'deleteAccount');

/** Thrown when Firebase needs a fresh sign-in before deleting (security rule, not a bug). */
export class RecentLoginRequiredError extends Error {
  constructor() {
    super('For your security, please sign out and sign back in, then delete your account.');
    this.name = 'RecentLoginRequiredError';
  }
}

/**
 * Permanently deletes the signed-in user's account and all their data, on the
 * server (functions/src/deleteAccount.ts). The caller should sign out afterwards.
 */
export async function deleteMyAccount(): Promise<void> {
  try {
    await deleteAccountCallable();
  } catch (err) {
    if (err instanceof FunctionsError && err.message === 'requires-recent-login') {
      throw new RecentLoginRequiredError();
    }
    throw err;
  }
  await resetConsent();
}
