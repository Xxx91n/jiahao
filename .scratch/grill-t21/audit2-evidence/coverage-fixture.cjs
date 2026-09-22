// coverage-fixture.cjs - module-level must-fail fixture for the
// --coverage-base leg (grill-t22 T-0 audit of the t21 repair chain).
// The CLI always reads the committed trend-inventory, so a deficient row is
// injected through checkInventory's opts.trend seam: the committed t21 row
// minus 'bench/polygraph/thresholds.json' in gtd.files - the exact C-1
// defect shape - against the committed repair-window diff a8974cd..HEAD.
// Exit 0 iff the checker reports the undeclared-R2 gap (teeth proven);
// a positive control (the real committed row) must report no coverage error.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const cgi = require(path.join(ROOT, 'scripts', 'check-governance-inventory.js'));

const ti = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'), 'utf8'));
const realRow = ti.rounds[ti.rounds.length - 1];
console.log('latest row:', realRow.round, '| gtd.files:', JSON.stringify(realRow.governance_tooling_diff.files));

// Fixture: the C-1 defect shape - thresholds.json omitted from gtd.files.
const defRow = JSON.parse(JSON.stringify(realRow));
defRow.governance_tooling_diff.files = defRow.governance_tooling_diff.files.filter(function (f) { return f !== 'bench/polygraph/thresholds.json'; });
const defTi = Object.assign({}, ti, { rounds: ti.rounds.slice(0, -1).concat([defRow]) });

const bad = cgi.checkInventory(ROOT, { trend: defTi, coverageBase: 'a8974cd' });
const covErrs = bad.errors.filter(function (e) { return e.indexOf('coverage:') === 0; });
console.log('deficient-row coverage errors:', JSON.stringify(covErrs));
const fired = covErrs.some(function (e) { return e.indexOf('bench/polygraph/thresholds.json') !== -1 && e.indexOf('undeclared') !== -1; });

// Positive control: the real committed row must produce zero coverage errors.
const good = cgi.checkInventory(ROOT, { trend: ti, coverageBase: 'a8974cd' });
const goodCov = good.errors.filter(function (e) { return e.indexOf('coverage:') === 0; });
console.log('real-row coverage errors:', JSON.stringify(goodCov));

// Negative-direction control: coverageGaps pure fn, declared omits the file.
const closure = new Set(require(path.join(ROOT, 'scripts', 'surface-taxonomy.js')).computeRuntimeClosure(ROOT));
const gaps = cgi.coverageGaps(['bench/polygraph/thresholds.json'], defRow, closure);
console.log('pure-fn undeclaredR2:', JSON.stringify(gaps.undeclaredR2), 'r1:', JSON.stringify(gaps.r1));

if (fired && goodCov.length === 0 && gaps.undeclaredR2.length === 1) {
  console.log('MUST-FAIL VERIFIED: the coverage leg rejects the C-1 defect shape');
  process.exit(0);
}
console.log('TEETH NOT PROVEN');
process.exit(1);
