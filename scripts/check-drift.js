#!/usr/bin/env node
// check-drift.js — verify adapter files are in sync with src/SKILL.md
// Run: node scripts/check-drift.js
// Exit 0 = in sync, exit 1 = drift detected (run build-adapters.js)

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillPath = path.join(root, 'src', 'SKILL.md');
const skill = fs.readFileSync(skillPath, 'utf8');
const body = skill.replace(/^[\s\S]*?---\n/, '');

// Distinctive fragments from different sections of SKILL.md
const fragments = [
  'anti-false-completion iron laws',
  'verification ladder',
  'The judge cannot be the author',
  'NOT VERIFIED',
];

// All 7 adapter files to check
const checks = [
  'adapters/cursor/jiahao.mdc',
  'adapters/windsurf/jiahao.md',
  'adapters/cline/jiahao.md',
  'adapters/instruction-tier/AGENTS.md',
  'adapters/claude-code/README.md',
  'adapters/codex/hooks.json',
  'adapters/mcp/README.md',
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
  // Instruction-tier adapters must contain all fragments
  // Hook-tier and MCP adapters only need to exist (they reference SKILL.md, not embed it)
  const isInstructionTier = rel.startsWith('adapters/cursor/') ||
    rel.startsWith('adapters/windsurf/') ||
    rel.startsWith('adapters/cline/') ||
    rel.startsWith('adapters/instruction-tier/');
  if (isInstructionTier) {
    for (const frag of fragments) {
      if (!content.includes(frag)) {
        console.error('DRIFT: ' + rel + ' missing fragment: ' + frag);
        drift = true;
      }
    }
  }
}

if (drift) {
  console.error('\nDrift detected. Run: node scripts/build-adapters.js');
  process.exit(1);
} else {
  console.log('All adapter files in sync with src/SKILL.md');
  process.exit(0);
}
