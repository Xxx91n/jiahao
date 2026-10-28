#!/usr/bin/env node
// check-drift.js — semantic drift checks for the retained generated outputs.
// Byte equality is already covered by `build-adapters.js --check`; this script
// keeps the profile-level assertions that byte equality cannot state, and
// guards the retired adapter exits from coming back.
// Run: node scripts/check-drift.js
// Exit 0 = in sync, exit 1 = drift detected (run build-adapters.js)

const fs = require('fs');
const path = require('path');

// impl (audit L1): no top-level side effects - the body runs inside
// main() so requiring this module never probes or exits.

const VERIFIER_FRAGMENTS = [
  'anti-false-completion iron laws',
  'verification ladder',
  'The judge cannot be the author',
  'NOT VERIFIED',
];

// Generator profile must NOT contain these.
const GENERATOR_FORBIDDEN = [
  'verification ladder',
  'second-party verifier',
  'The judge cannot be the author',
  'hash chain',
  'confidence calibration',
  'independent LLM critic',
];

// Generator profile must contain these.
const GENERATOR_REQUIRED = [
  'No evidence, no completion claim',
  'state changes',
  'calling a tool',
];

// kind: both = carries the full dual-profile source body;
// verifier / generator = carries that profile alone; exists = path only.
const CHECKS = [
  { rel: 'skills/jiahao/SKILL.md', kind: 'both' },
  { rel: 'adapters/codebuddy/src/SKILL.md', kind: 'both' },
  { rel: 'adapters/codebuddy/rules/jiahao-verifier.md', kind: 'verifier' },
  { rel: 'adapters/codebuddy/rules/jiahao-generator.md', kind: 'generator' },
  { rel: 'adapters/claude-code/README.md', kind: 'exists' },
];

// Tracked-set accounting in build-adapters.js catches these once they are
// committed; this catches a local directory left behind by a partial revert.
const RETIRED_DIRS = [
  'adapters/aider',
  'adapters/cline',
  'adapters/codex',
  'adapters/copilot',
  'adapters/cursor',
  'adapters/instruction-tier',
  'adapters/mcp',
  'adapters/opencode',
  'adapters/qoder',
  'adapters/windsurf',
];

function main() {
  const root = path.join(__dirname, '..');
  let drift = false;

  for (const dir of RETIRED_DIRS) {
    if (fs.existsSync(path.join(root, dir))) {
      console.error('RETIRED ADAPTER PRESENT: ' + dir);
      drift = true;
    }
  }

  for (const { rel, kind } of CHECKS) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error('MISSING: ' + rel);
      drift = true;
      continue;
    }
    if (kind === 'exists') continue;
    const content = fs.readFileSync(full, 'utf8');
    if (kind === 'both') {
      for (const marker of ['## Generator Profile', '## Verifier Profile', '## Boundaries']) {
        if (!content.includes(marker)) {
          console.error('DRIFT: ' + rel + ' missing section: ' + marker);
          drift = true;
        }
      }
    } else if (kind === 'verifier') {
      for (const frag of VERIFIER_FRAGMENTS) {
        if (!content.includes(frag)) {
          console.error('DRIFT: ' + rel + ' (verifier) missing fragment: ' + frag);
          drift = true;
        }
      }
    } else if (kind === 'generator') {
      for (const term of GENERATOR_FORBIDDEN) {
        if (content.includes(term)) {
          console.error('PROFILE DRIFT: ' + rel + ' (generator) must NOT contain: ' + term);
          drift = true;
        }
      }
      for (const term of GENERATOR_REQUIRED) {
        if (!content.includes(term)) {
          console.error('PROFILE DRIFT: ' + rel + ' (generator) must contain: ' + term);
          drift = true;
        }
      }
    }
  }

  if (drift) {
    console.error('\nDrift detected. Run: node scripts/build-adapters.js');
    process.exit(1);
  } else {
    console.log('Retained adapters in sync with src/SKILL.md');
    process.exit(0);
  }
}

if (require.main === module) main();
