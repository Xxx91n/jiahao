// Committed capture for the A-8 missing-input leg (grill-t19, ledger D-004):
// runs build-round-facts --check --report on a slug whose facts artifact is
// absent by construction (grill-t19-nofacts), records the boundary-route
// verdict (FAIL pair + EXIT 1, report phase skipped - the fixture file is
// never spliced). Non-interpolating channel: spawnSync arg array + fs write.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const FIX = path.join('.scratch', 'grill-t19', 'evidence', 'missing-facts.fixture.md');
const OUT = path.join(ROOT, '.scratch', 'grill-t19', 'evidence', 'round-facts-missing.txt');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(path.join(ROOT, FIX), '# fixture report\n', 'utf8');
const CMD = 'node scripts/build-round-facts.js --round grill-t19-nofacts --check --report .scratch/grill-t19/evidence/missing-facts.fixture.md';
const r = spawnSync(process.execPath, ['scripts/build-round-facts.js', '--round', 'grill-t19-nofacts', '--check', '--report', '.scratch/grill-t19/evidence/missing-facts.fixture.md'], { cwd: ROOT, encoding: 'utf8' });
const text = '$ ' + CMD + '\n\nEXIT ' + r.status + '\n\n' + (r.stdout || '') + (r.stderr || '');
fs.writeFileSync(OUT, text, 'utf8');
console.log('[capture] exit ' + r.status + ' -> ' + path.relative(ROOT, OUT));
