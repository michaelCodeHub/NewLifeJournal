#!/usr/bin/env node
/**
 * Give an account Plus (or force Free) without a store purchase — for the
 * team's own test accounts, reviewers and comped users. Writes
 * `users/{uid}.devTierOverride`, which both the app (SubscriptionContext) and
 * the server (functions/src/tier.ts → aiChat limits) check before anything
 * else. Clients can't write that field (firestore.rules), so this runs with
 * the Admin SDK from a trusted machine.
 *
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json GCLOUD_PROJECT=newlifejournal-e6826 \
 *     node scripts/setPlan.js someone@example.com plus     # full Plus experience
 *   node scripts/setPlan.js someone@example.com free        # force Free (test the paywall/limits)
 *   node scripts/setPlan.js someone@example.com clear       # back to whatever they actually bought
 *   node scripts/setPlan.js someone@example.com             # show the current plan
 *
 * Against the local emulator instead:
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     GCLOUD_PROJECT=newlifejournal-e6826 node scripts/setPlan.js someone@example.com plus
 *
 * The account must have signed in once (so it exists). The person then closes
 * and reopens the app to see the change.
 */
const admin = require('firebase-admin');

const VALUES = { plus: 'premium', free: 'free', clear: null };

async function main() {
  const [email, plan] = process.argv.slice(2);
  if (!email || (plan !== undefined && !(plan in VALUES))) {
    console.error('Usage: node scripts/setPlan.js <email> [plus|free|clear]');
    process.exit(1);
  }
  admin.initializeApp(process.env.GCLOUD_PROJECT ? { projectId: process.env.GCLOUD_PROJECT } : undefined);

  const user = await admin.auth().getUserByEmail(email);
  const ref = admin.firestore().collection('users').doc(user.uid);

  if (plan !== undefined) {
    await ref.set({ devTierOverride: VALUES[plan] }, { merge: true });
  }

  const data = (await ref.get()).data() || {};
  const override = data.devTierOverride ?? null;
  const bought = data.subscription?.tier === 'premium' ? `Plus (${data.subscription.status || 'active'})` : 'nothing';
  console.log(`${email} (${user.uid})`);
  console.log(`  override : ${override === 'premium' ? 'Plus' : override === 'free' ? 'Free' : 'none'}`);
  console.log(`  purchased: ${bought}`);
  if (plan !== undefined) console.log('Ask them to close and reopen the app.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
