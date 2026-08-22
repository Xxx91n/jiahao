#!/usr/bin/env node
// check-drift.js — verify adapter files are in sync with src/SKILL.md
// Run: node scripts/check-drift.js
// Exit 0 = in sync, exit 1 = drift detected (run build-adapters.js)

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillPath = path.join(root, 'src', 'SKILL.md');
const skill = fs.readFileSync(skillPath, 'utf8');
const body = skill.replace(/^---[\s\S]*?---\n/, '');

// Check that instruction-tier adapters contain the SKILL.md body
const checks = [
  'adapters/cursor/jiahao.mdc',
  'adapters/windsurf/jiahao.md',
  'adapters/cline/jiahao.md',
  'adapters/instruction-tier/AGENTS.md',
];

let drift = false;
for (const rel of checks) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error('MISSING: ' + rel);
    drift = true;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  // Check for a distinctive fragment from SKILL.md
  const fragment = 'anti-false-completion iron laws';
  if (!content.includes(fragment)) {
    console.error('DRIFT: ' + rel + ' missing fragment: ' + fragment);
    drift = true;
  }
}

if (drift) {
  console.error('\nDrift detected. Run: node scripts/build-adapters.js');
  process.exit(1);
} else {
  console.log('All adapter files in sync with src/SKILL.md');
  process.exit(0);
}
