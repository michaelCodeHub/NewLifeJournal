/**
 * Resolves the caller's tier from their Firestore profile. `subscription` and
 * `devTierOverride` are only ever written by trusted server code (Admin SDK);
 * firestore.rules blocks clients from writing either field.
 *
 * A mirrored `premium` tier whose `expiresAt` has passed counts as free, so a
 * missed RevenueCat webhook can't leave someone on Plus forever.
 */
export function resolveTier(profile: FirebaseFirestore.DocumentData | undefined, now = Date.now()): 'free' | 'premium' {
  if (profile?.devTierOverride === 'premium') return 'premium';
  if (profile?.devTierOverride === 'free') return 'free';
  const sub = profile?.subscription;
  if (sub?.tier !== 'premium') return 'free';
  const expires = sub.expiresAt && typeof sub.expiresAt.toMillis === 'function' ? sub.expiresAt.toMillis() : null;
  // Lifetime purchases have no expiry.
  return expires === null || expires > now ? 'premium' : 'free';
}
