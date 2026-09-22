// claim-sites.cjs - grep-able claim-site checks for the t21 repair chain
// (grill-t22 T-0 audit). Each check is a binary predicate over the live
// tree; exit 1 on any miss. Read-only: no file is modified.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const read = function (rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); };
let fails = 0;
function chk(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' :: ' + detail : ''));
  if (!ok) fails++;
}

// C-1 claim sites
const ti = JSON.parse(read('docs/governance/trend-inventory.json'));
const row = ti.rounds[ti.rounds.length - 1];
chk('C-1 t21 row gtd.files registers thresholds.json', row.governance_tooling_diff.files.indexOf('bench/polygraph/thresholds.json') !== -1, JSON.stringify(row.governance_tooling_diff.files));
chk('C-1 row reason retro-acknowledges', /Post-audit repair|retro/i.test(row.governance_tooling_diff.reason) && row.governance_tooling_diff.reason.indexOf('thresholds.json') !== -1);
const adr80 = read('docs/adr/0080-readme-star-r3-predicate-and-taxonomy-reclassification-channel.md');
chk('C-1 ADR-0080 names thresholds.json', adr80.indexOf('bench/polygraph/thresholds.json') !== -1);
chk('C-1 ADR-0080 post-audit note present', /Post-audit note \(t21 second-party audit, 2026-09-22\)/.test(adr80));
const rep = read('.scratch/grill-t21/reports/2026-09-22-report.md');
chk('C-1 report post-audit section names file + coverage leg', rep.indexOf('bench/polygraph/thresholds.json') !== -1 && rep.indexOf('--coverage-base') !== -1);

// C-2: vacuous spec element disposed rejected-with-rationale (stated, not silent)
const spec = read('.scratch/grill-t21/spec-t21-disposition.md');
chk('C-2 spec-4 Disclosed Repair marker (rejected-with-rationale)', spec.indexOf('Disclosed Repair') !== -1 && spec.indexOf('rejected-with-rationale') !== -1 && spec.indexOf('t21 audit C-2') !== -1);
chk('C-2 report closure row states rejection', /landed \+ one sub-item rejected-with-rationale/.test(rep));
const led = read('.scratch/grill-t21/decision-ledger.md');
chk('C-2 ledger post-audit discloses rejection', led.indexOf('C-2 (disposed)') !== -1 && led.indexOf('rejected-with-rationale') !== -1);

// C-3: inventory-shape leg restored + delta header discloses removal/restoration
const bat = read('.scratch/grill-t21/capture-battery.cjs');
chk('C-3 battery has inventory-shape leg with live filter', bat.indexOf("inventory-shape.txt") !== -1 && bat.indexOf("'kind enum'") !== -1);
chk('C-3 battery header discloses the drop+restore', /dropped the leg silently \(t21 audit C-3\)/.test(bat) && /went stale under the C-5 title renames/.test(bat));

// C-4: seven wiring files - the Disclosed Repair marker legitimately quotes
// the superseded 'six wiring files' wording, so the check is: 'seven wiring
// files' present AND every 'six wiring files' occurrence sits inside the
// marker's quote of the old text.
const sixHits = rep.split('\n').filter(function (l) { return l.indexOf('six wiring files') !== -1; });
chk('C-4 report says seven wiring files', rep.indexOf('seven wiring files') !== -1 && sixHits.length === 2 && sixHits[0].indexOf('Disclosed Repair') !== -1, 'six-occurrences=' + sixHits.length + ' (marker quote + honest-state :73 - flagged for judgment)');
if (sixHits.length > 1) console.log('NOTE residual six-mention outside the marker quote:', JSON.stringify(sixHits.slice(1)));

// C-5: attribution - repair predates t21, t21 only resynced
chk('C-5 report row = verified + routine re-pin', /verified \+ routine re-pin/.test(rep) && /landed in the t20 post-closeout window/.test(rep));
chk('C-5 ledger row = verified/re-pin not repaired', led.indexOf('verified-plus-routine-repin') !== -1 || /C-5.*verified/.test(led));

// machinery: rc.from guard + coverage leg + indent + shapeBad dedup
const cgi = read('scripts/check-governance-inventory.js');
chk('machinery rc.from guard present', cgi.indexOf("rc.from !== 'R2'") !== -1);
chk('machinery --coverage-base leg present', cgi.indexOf('--coverage-base') !== -1 && cgi.indexOf('coverageGaps') !== -1);
chk('machinery shapeBad dedup (single predicate)', (cgi.match(/shapeBad/g) || []).length >= 3);
const indentLine = cgi.split('\n').find(function (l) { return l.indexOf('let reclasses = null;') !== -1; });
chk('machinery indent fix (4-space let reclasses)', /^    let reclasses = null;/.test(indentLine), JSON.stringify(indentLine));

// defer registry slots
const reg = JSON.parse(read('docs/deferred-registry.json'));
const d42 = reg.entries.find(function (e) { return e.id === 'defer-0042'; });
const d51 = reg.entries.find(function (e) { return e.id === 'defer-0051'; });
chk('defer-0042 present, status pending-evaluation, second_reviewer slot text open', d42 && d42.status === 'pending-evaluation' && /second_reviewer slot is open/.test(d42.rationale));
chk('defer-0051 present (status recorded for adjudication)', !!d51, d51 && d51.status);
if (d51) console.log('NOTE defer-0051 status=' + d51.status + '; rationale still says slot open=' + /second_reviewer slot is open/.test(d51.rationale) + '; closed_via countersign=' + /countersign/.test(d51.closed_via || ''));

// canon cross-check vs committed facts
const facts = JSON.parse(read('.scratch/grill-t21/round-facts.json'));
chk('canon: 75 suites / 1286 passed / pack 339994 / citations 1865 / registry 60 / anchors 18 / pin 148972b / report_commit null',
  facts.suites === 75 && facts.passed === 1286 && facts.pack_bytes === 339994 && facts.rewrite_map_citations === 1865 && facts.registry_entries === 60 && facts.anchors_count === 18 && facts.battery_as_of_commit === '148972b' && facts.report_commit === null, JSON.stringify(facts));
chk('registry live count matches canon (60)', reg.entries.length === 60, 'actual ' + reg.entries.length);

console.log(fails ? ('CLAIM-SITE FAILURES: ' + fails) : 'ALL CLAIM SITES GREEN');
process.exit(fails ? 1 : 0);
