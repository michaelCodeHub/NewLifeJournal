#!/usr/bin/env node
/**
 * Grant or revoke the Community moderator role (a Firebase Auth custom claim).
 * Moderators see Profile → Moderation, can read the reports queue and remove
 * anyone's post or comment (see firestore.rules → isModerator()).
 *
 * Run from a trusted machine with Admin credentials:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/setModerator.js someone@example.com
 *   node scripts/setModerator.js someone@example.com --revoke
 *
 * Against the local emulator instead:
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=newlifejournal-e6826 node scripts/setModerator.js someone@example.com
 *
 * The person must sign out and back in once for the change to reach the app.
 */
const admin = require('firebase-admin');

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || (flag && flag !== '--revoke')) {
    console.error('Usage: node scripts/setModerator.js <email> [--revoke]');
    process.exit(1);
  }
  admin.initializeApp(process.env.GCLOUD_PROJECT ? { projectId: process.env.GCLOUD_PROJECT } : undefined);

  const user = await admin.auth().getUserByEmail(email);
  const claims = { ...(user.customClaims || {}) };
  if (flag === '--revoke') delete claims.moderator;
  else claims.moderator = true;
  await admin.auth().setCustomUserClaims(user.uid, claims);

  console.log(`${flag === '--revoke' ? 'Removed' : 'Granted'} moderator for ${email} (${user.uid}). Ask them to sign out and back in.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
