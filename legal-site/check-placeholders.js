#!/usr/bin/env node
/**
 * Runs before `firebase deploy --only hosting` (firebase.json predeploy).
 * Refuses to publish the legal pages while any [BRACKETED] placeholder is left,
 * so a draft can't go live by accident.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const problems = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const found = [...new Set(text.match(/\[[A-Z][A-Z ]{2}[^\]]*\]/g) || [])];
  if (found.length) problems.push(`${file}: ${found.join(', ')}`);
}
if (problems.length) {
  console.error('Legal pages still contain placeholders — fill them in before deploying:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('Legal pages: no placeholders left.');
