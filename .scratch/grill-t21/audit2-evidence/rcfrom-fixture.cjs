// rcfrom-fixture.cjs - exercises the rc.from guard against the live excusal
// code path (grill-t22 T-0 audit). The first audit's latent over-excuse
// scenario: a future R1->R3 reclassification log entry must NOT excuse an
// at-row-time-R1 listing. The tightened guard requires rc.from === 'R2'.
// Injection seam: check-governance-inventory.js holds the surface-taxonomy
// module object; stubbing loadTaxonomy on the shared module feeds a crafted
// reclassifications log into the REAL predicate. Must-fail semantics: exit 0
// iff the R1->R3 entry does NOT excuse (error fires) AND the R2->R3 control
// does excuse (no error).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const tax = require(path.join(ROOT, 'scripts', 'surface-taxonomy.js'));
const realLoad = tax.loadTaxonomy;
const cgi = require(path.join(ROOT, 'scripts', 'check-governance-inventory.js'));

const ti = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'trend-inventory.json'), 'utf8'));
const FILE = 'README-zh-CN.md'; // currently R3 via R3_README_ROOT
function rowListing() {
  return {
    round: 'grill-tNN-fixture', date: '2026-09-20', kind: 'documentation',
    adr_added: [], net_additions: 0, carve_out_used: 1,
    governance_tooling_diff: { files: [FILE], reason: 'fixture: listed while it classified R2' },
    zero_product_diff: true,
  };
}
function runWithLog(reclasses) {
  tax.loadTaxonomy = function () { return { reclassifications: reclasses }; };
  try {
    const out = cgi.checkInventory(ROOT, { trend: Object.assign({}, ti, { rounds: [rowListing()] }) });
    return out.errors.filter(function (e) { return e.indexOf('mislabeled') !== -1 || e.indexOf('grill-tNN-fixture') !== -1; });
  } finally { tax.loadTaxonomy = realLoad; }
}

// scenario A (over-excuse probe): an R1->R3 log entry post-dating the row.
const aErrs = runWithLog([{ pattern: '^README[^/]*$', from: 'R1', to: 'R3', effective: '2026-09-23' }]);
console.log('A R1->R3 entry errors:', JSON.stringify(aErrs));
const aBlocked = aErrs.some(function (e) { return e.indexOf('mislabeled disclosure') !== -1; });

// scenario B (positive control): the real-shape R2->R3 entry excuses.
const bErrs = runWithLog([{ pattern: '^README[^/]*$', from: 'R2', to: 'R3', effective: '2026-09-23' }]);
console.log('B R2->R3 entry errors:', JSON.stringify(bErrs));
const bExcused = !bErrs.some(function (e) { return e.indexOf('mislabeled disclosure') !== -1; });

// scenario C (real log, unstubbed path is covered by the wiring pin; here the
// missing-from field): an entry with no 'from' must not excuse.
const cErrs = runWithLog([{ pattern: '^README[^/]*$', to: 'R3', effective: '2026-09-23' }]);
console.log('C missing-from errors:', JSON.stringify(cErrs));
const cBlocked = cErrs.some(function (e) { return e.indexOf('mislabeled disclosure') !== -1; });

if (aBlocked && bExcused && cBlocked) {
  console.log('RC.FROM GUARD VERIFIED: R1->R3 and missing-from entries do not excuse; R2->R3 does');
  process.exit(0);
}
console.log('GUARD NOT PROVEN (aBlocked=' + aBlocked + ' bExcused=' + bExcused + ' cBlocked=' + cBlocked + ')');
process.exit(1);
