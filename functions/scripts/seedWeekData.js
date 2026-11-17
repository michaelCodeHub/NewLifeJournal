#!/usr/bin/env node
/**
 * Seed (or refresh) the shared week-by-week content in Firestore
 * `pregnancyWeeks/week1` … `week40` from constants/pregnancyWeeks.ts.
 *
 * firestore.rules deny every client write to pregnancyWeeks, so this runs with
 * the Admin SDK (which bypasses rules) from a trusted machine. The app falls
 * back to its bundled copy when a document is missing, but the aiChat Cloud
 * Function reads these documents for the "this week" part of the AI's context.
 *
 *   cd functions && npm install
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json GCLOUD_PROJECT=newlifejournal-e6826 node scripts/seedWeekData.js
 *
 * Against the local emulator instead:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=newlifejournal-e6826 node scripts/seedWeekData.js
 *
 * Add --dry-run to print what would be written without writing.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const admin = require('firebase-admin');

/** Load the app's TypeScript data module (it has no imports) by transpiling it in memory. */
function loadWeekData() {
  const file = path.resolve(__dirname, '../../constants/pregnancyWeeks.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  });
  const m = new Module(file);
  m._compile(outputText, file);
  return m.exports;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { buildAllWeekDocs, weekDocId } = loadWeekData();
  const docs = buildAllWeekDocs();
  if (docs.length !== 40) throw new Error(`Expected 40 weeks, got ${docs.length}`);

  if (dryRun) {
    docs.forEach((d) => console.log(`${weekDocId(d.week)}: ${d.babySize} · ${d.babyDevelopment.length} development notes`));
    console.log(`Dry run: ${docs.length} documents not written.`);
    return;
  }

  admin.initializeApp(process.env.GCLOUD_PROJECT ? { projectId: process.env.GCLOUD_PROJECT } : undefined);
  const db = admin.firestore();
  const batch = db.batch();
  docs.forEach((d) => batch.set(db.collection('pregnancyWeeks').doc(weekDocId(d.week)), d));
  await batch.commit();

  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : admin.app().options.projectId || 'default project';
  console.log(`Wrote ${docs.length} pregnancyWeeks documents to ${target}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
