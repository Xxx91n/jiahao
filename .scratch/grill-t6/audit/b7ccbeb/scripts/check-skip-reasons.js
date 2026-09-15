#!/usr/bin/env node
// scripts/check-skip-reasons.js - ADR-0057 D-A: skip honesty, static scan.
// A skipped test is a verdict and must carry a reason; the only legal call
// site of a raw skip is test/helpers/skip.js, the reason-forcing choke point.
// Any other .skip / x-prefixed skip, and any .only residue (silently narrows
// the collected suite set, feeding the johal.in silent-green failure mode),
// fails this gate. Registered in docs/gates.json as 'skip-reasons'
// (ADR-0027 same-commit coupling satisfied by ADR-0057).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'test');
const ALLOWED = path.normalize(path.join('test', 'helpers', 'skip.js')); // the reason-forcing choke point

const RULES = [
  { id: 'skip', re: /\b(?:describe|test|it)\.skip\s*\(/, msg: "reason-less skip - route through test/helpers/skip.js so the skip carries a reason (ADR-0057 D-A)" },
  { id: 'x-prefix', re: /\bx(?:describe|it|test)\s*\(/, msg: "x-prefixed skip has no reason carrier (ADR-0057 D-A)" },
  { id: 'only', re: /\b(?:describe|test|it)\.only\s*\(/, msg: ".only residue narrows the collected run silently (ADR-0057 D-C)" },
];

function listTestFiles(dir, acc) {
  const out = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { listTestFiles(p, out); continue; }
    if (/\.js$/.test(e.name)) out.push(p);
  }
  return out;
}

// Line-based scanner. Comment-only lines are ignored; in this repo every
// match outside comments is real code (no skip idioms appear in strings).
function scan() {
  const violations = [];
  for (const file of listTestFiles(TEST_DIR)) {
    const rel = path.normalize(path.relative(ROOT, file));
    const lines = fs.readFileSync(file, 'utf8').split(/\n/);
    lines.forEach(function (line, i) {
      const trimmed = line.trim();
      if (trimmed.indexOf('//') === 0 || trimmed.indexOf('*') === 0) return;
      for (const rule of RULES) {
        const isHelperCall = rule.id === 'skip' && rel === ALLOWED; // exemption keyed on rule identity, not message text
        if (!isHelperCall && rule.re.test(line)) {
          violations.push(rel + ':' + (i + 1) + ': ' + rule.msg + ' -> ' + trimmed.slice(0, 80));
        }
      }
    });
  }
  return violations;
}

module.exports = { scan };

if (require.main === module) {
  require('../src/shared/capability').requireCapabilities('skip-reasons'); // ADR-0040 D1
  const violations = scan();
  for (const v of violations) console.error(v);
  if (violations.length) {
    console.error('FAIL: ' + violations.length + ' skip-honesty violation(s) (ADR-0057 D-A)');
    process.exit(1);
  }
  console.log('[skip-reasons] OK: no reason-less skips, no .only residue under test/');
  process.exit(0);
}
