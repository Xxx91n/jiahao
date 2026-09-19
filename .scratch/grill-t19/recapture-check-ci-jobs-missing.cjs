// Disclosed Re-Capture harness (grill-t19, ledger D-006): re-runs the
// check-ci-jobs missing-file leg through a Non-Interpolating Channel - a
// spawnSync arg array, never an escape-interpreting string layer - and
// writes the fresh verbatim output to the same evidence slot via fs.
// The first capture is declared void (invocation-layer corruption, audit
// A-3); its corrupted bytes are absorbed as the .txt signature leg's
// negative fixture in test/adr-0076-wiring.test.js.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, '.scratch', 'grill-t18', 'evidence', 'check-ci-jobs-missing.txt');
const ARG = '.scratch/grill-t18/evidence/no-such-ci.yml';
const CMD = 'node scripts/check-ci-jobs.js ' + ARG;
const r = spawnSync(process.execPath, ['scripts/check-ci-jobs.js', ARG], { cwd: ROOT, encoding: 'utf8' });
const text = '$ ' + CMD + '\n\nEXIT ' + r.status + '\n\n' + (r.stdout || '') + (r.stderr || '');
fs.writeFileSync(OUT, text, 'utf8');
console.log('[re-capture] ' + CMD + ' -> exit ' + r.status + ' written verbatim to ' + path.relative(ROOT, OUT));
