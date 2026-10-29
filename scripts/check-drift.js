#!/usr/bin/env node
// check-drift.js — semantic drift checks for the retained generated outputs.
// Byte equality is already covered by `build-adapters.js --check`; this script
// keeps the profile-level assertions that byte equality cannot state, and
// guards the retired adapter exits from coming back.
// Run: node scripts/check-drift.js
// Exit 0 = in sync; exit 1 = profile drift or a retired adapter directory present

const fs = require('fs');
const path = require('path');

const { HOSTS, RETIRED_HOSTS, SKILL_DIR } = require('./build-adapters');

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
// verifier / generator = carries that profile alone.
// The per-host entries come from the generator's host table, so a new host adds
// no line here and a removed one cannot leave a stale path behind.
const CHECKS = [
  { rel: SKILL_DIR + '/SKILL.md', kind: 'both' },
  ...HOSTS.map(host => ({ rel: host.dir + '/src/SKILL.md', kind: 'both' })),
  ...HOSTS.flatMap(host => host.rules.map(rule => ({ rel: host.dir + '/rules/' + rule.file, kind: rule.profile }))),
];

// Tracked-set accounting in build-adapters.js catches these once they are
// committed; this catches a local directory left behind by a partial revert.
const RETIRED_DIRS = RETIRED_HOSTS.map(name => 'adapters/' + name);

function main() {
  const root = path.join(__dirname, '..');
  let profileDrift = false;
  let retiredPresent = false;

  for (const dir of RETIRED_DIRS) {
    if (fs.existsSync(path.join(root, dir))) {
      console.error('RETIRED ADAPTER PRESENT: ' + dir);
      retiredPresent = true;
    }
  }

  for (const { rel, kind } of CHECKS) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error('MISSING: ' + rel);
      profileDrift = true;
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    if (kind === 'both') {
      for (const marker of ['## Generator Profile', '## Verifier Profile', '## Boundaries']) {
        if (!content.includes(marker)) {
          console.error('DRIFT: ' + rel + ' missing section: ' + marker);
          profileDrift = true;
        }
      }
    } else if (kind === 'verifier') {
      for (const frag of VERIFIER_FRAGMENTS) {
        if (!content.includes(frag)) {
          console.error('DRIFT: ' + rel + ' (verifier) missing fragment: ' + frag);
          profileDrift = true;
        }
      }
    } else if (kind === 'generator') {
      for (const term of GENERATOR_FORBIDDEN) {
        if (content.includes(term)) {
          console.error('PROFILE DRIFT: ' + rel + ' (generator) must NOT contain: ' + term);
          profileDrift = true;
        }
      }
      for (const term of GENERATOR_REQUIRED) {
        if (!content.includes(term)) {
          console.error('PROFILE DRIFT: ' + rel + ' (generator) must contain: ' + term);
          profileDrift = true;
        }
      }
    }
  }

  if (profileDrift || retiredPresent) {
    if (profileDrift) {
      console.error('\nProfile drift detected. Run: node scripts/build-adapters.js');
    }
    if (retiredPresent) {
      console.error('\nRetired adapter directory present; delete it. The generator does not recreate retired exits.');
    }
    process.exit(1);
  } else {
    console.log('Retained adapters in sync with src/SKILL.md');
    process.exit(0);
  }
}

if (require.main === module) main();
