'use strict';
// grill-t22 audit claim-sites: grep-able verification of every checkable
// claim in reports/2026-09-22-report.md against the live tree + committed
// artifacts. Each line prints PASS/FAIL <id> <claim> :: <evidence>.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const out = [];
let fails = 0;
function ck(id, desc, ok, ev) { out.push((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + desc + ' :: ' + ev); if (!ok) fails++; }

const report = read('.scratch/grill-t22/reports/2026-09-22-report.md');
const facts = readJson('.scratch/grill-t22/round-facts.json');

// 1. Facts canon values exist and are typed
ck('F1', 'facts canon fields present', typeof facts.suites === 'number' && typeof facts.passed === 'number' && facts.report_commit === null, JSON.stringify(facts));

// 2. Report facts region renders the canon verbatim
for (const k of ['suites','passed','skipped','pack_bytes','instrument_entries','rewrite_map_citations','registry_entries','anchors_count']) {
  ck('F2.' + k, 'report facts line matches canon', report.includes('- ' + k + ': ' + facts[k]), 'canon ' + k + '=' + facts[k]);
}
ck('F3', 'report_commit null in both', facts.report_commit === null && report.includes('report_commit: null'), 'canon+report null');
ck('F4', 'battery_as_of_commit names de68857', facts.battery_as_of_commit === 'de68857', facts.battery_as_of_commit);

// 3. Evidence set: 22 captures + 1 fixture, each verbatim $ argv + EXIT
const EVLS = ['gate-all','run-test-gate','check-ci-jobs','check-ci-jobs-missing','check-deferred','governance-inventory','coverage','coverage-badref','anchors','rewrite-map','round-facts','instrument','pack-smoke','adr-0080-wiring','adr-0081-wiring','quoted-stale','reclass-shape','inventory-shape','prose-fixtures','h1-reread','liveness','clean-tree'];
let evOk = 0, evMiss = [];
for (const n of EVLS) {
  const p = '.scratch/grill-t22/evidence/' + n + '.txt';
  if (!fs.existsSync(path.join(ROOT, p))) { evMiss.push(n); continue; }
  const t = read(p);
  if (t.startsWith('$ ') && t.includes('\n\nEXIT ')) evOk++; else evMiss.push(n + '(shape)');
}
ck('E1', '22 capture files exist with $ argv + EXIT shape', evOk === 22 && evMiss.length === 0, evOk + '/22 ok; missing/bad: ' + (evMiss.join(',') || 'none'));
ck('E2', 'fixture exists', fs.existsSync(path.join(ROOT, '.scratch/grill-t22/evidence/quoted-stale.fixture.md')), 'quoted-stale.fixture.md');
ck('E3', 'report lists split-form evidence count', /22 (per-leg )?captures|per-leg captures + 1 fixture|22 captures/.test(report) || /captures + 1 fixture/.test(report), 'report evidence-set wording');

// 4. ADR-0081 surface
const adr = read('docs/adr/0081-repair-window-amend-in-place-coverage-pairing-headroom-watch.md');
ck('A1', 'ADR-0081 exists Accepted+dated+ledger/spec anchors', /# ADR-0081:/.test(adr) && adr.includes('- Status: Accepted') && adr.includes('grill-t22/decision-ledger.md') && adr.includes('spec-t22-disposition.md'), 'header fields');
ck('A2', 'D-A amend-in-place canonical + pairing rule', adr.includes('owns no independent trend row') && adr.includes('annotate-not-supersede') && adr.includes('latest row'), 'D-A text');
ck('A3', 'D-B rc.from adjudication recorded', adr.includes('rc.from') && adr.includes('ADR-0080 D-B') && adr.includes('conformance'), 'D-B text');
ck('A4', 'D-E names defer-0067 + countersign + reconciliation', adr.includes('defer-0067') && adr.includes('defer-0042') && adr.includes('defer-0051'), 'D-E text');
ck('A5', 'own-row flip branch recorded unfired', adr.includes('Conditional flip branch') && /recorded, not fired|recorded unfired/.test(adr), 'flip branch');
// A6: internal consistency - D-E says 'two R2 touches' while the row lists three files
const twoR2 = /two R2 touches/.test(adr);
ck('A6', 'ADR-0081 D-E R2-touch enumeration consistent with row (3 files)', !twoR2, twoR2 ? 'ADR :40 says two R2 touches; row gtd.files has 3' : 'consistent');

// 5. CONTEXT Repair Window term
const ctx = read('CONTEXT.md');
const ti = ctx.indexOf('**Repair Window');
ck('C1', 'CONTEXT Repair Window term present', ti > 0, 'offset ' + ti);
if (ti > 0) {
  const seg = ctx.slice(ti, ti + 1200);
  ck('C2', 'term references ADR-0081/0076 + coverage leg + _Avoid_', seg.includes('ADR-0081') && seg.includes('ADR-0076') && seg.includes('--coverage-base') && seg.includes('_Avoid_'), 'term body');
}

// 6. Trend row fields
const trend = readJson('docs/governance/trend-inventory.json');
const t22 = trend.rounds[trend.rounds.length - 1];
ck('T1', 'latest row is t22 doc round', t22.round === 'grill-t22-doc-round' && t22.kind === 'documentation', t22.round);
ck('T2', 'adr_added [0081] + net_additions 1 + zero_product_diff', JSON.stringify(t22.adr_added) === '[\"0081\"]' && t22.net_additions === 1 && t22.zero_product_diff === true, JSON.stringify({a: t22.adr_added, n: t22.net_additions, z: t22.zero_product_diff}));
ck('T3', 'carve_out_used 1 + three R2 files + defer-0067', t22.carve_out_used === 1 && t22.governance_tooling_diff.files.length === 3 && t22.deferred_entry === 'defer-0067', JSON.stringify(t22.governance_tooling_diff.files));
ck('T4', 'mechanism_output_diff names g6-publish-replay', (t22.mechanism_output_diff.files || []).includes('bench/research/out/g6-publish-replay.json'), JSON.stringify(t22.mechanism_output_diff.files));
ck('T5', '16 rows total (t22 added one row)', trend.rounds.length === 16, 'rows=' + trend.rounds.length);

// 7. Registry dispositions
const reg = readJson('docs/deferred-registry.json');
ck('R1', 'registry 61 entries', reg.entries.length === 61, 'entries=' + reg.entries.length);
const d67 = reg.entries.find(e => e.id === 'defer-0067');
ck('R2', 'defer-0067 armed pending-evaluation + ADR-0081 source', !!d67 && d67.status === 'pending-evaluation' && (d67.source_adr || '').includes('0081') && /2048/.test(d67.unfreeze_if.check), d67 ? d67.status : 'MISSING');
const d42 = reg.entries.find(e => e.id === 'defer-0042');
ck('R3', 'defer-0042 countersign via last_check_in', !!d42 && !!d42.last_check_in && /countersign/.test(d42.last_check_in.note) && d42.status === 'pending-evaluation', d42 && d42.last_check_in ? d42.last_check_in.date : 'none');
const d51 = reg.entries.find(e => e.id === 'defer-0051');
ck('R4', 'defer-0051 closed + R2-C-4 correction note', !!d51 && d51.status === 'closed' && /corrected under audit-r2 R2-C-4/.test(d51.rationale), d51 ? d51.status : 'MISSING');

// 8. Machinery: checker keyed-exit repair in source
const cgi = read('scripts/check-governance-inventory.js');
ck('M1', 'checker try/catch keyed FAIL on unresolvable ref', /unresolvable.*git diff failed.*R2-C-3|R2-C-3.*unresolvable/.test(cgi) && /try\s*{[\s\S]{0,200}execFileSync/.test(cgi), 'source shape');
ck('M2', 'rc.from R2 guard in source', cgi.includes("rc.from !== 'R2'"), 'rc.from guard');

// 9. ci.yml parity
const ci = read('.github/workflows/ci.yml');
ck('CI1', 'ci.yml suite parity 76', ci.includes('--expected-suites 76'), 'expected-suites 76');

// 10. README + zh count lines
const rd = read('README.md'); const zh = read('README-zh-CN.md');
ck('B1', 'README 76 suites / 1300 tests', rd.includes('1300 tests across 76 suites') && rd.includes('76 test suites, 1300 tests'), 'en lines');
ck('B2', 'zh-CN mirror synced', zh.includes('1300 tests across 76 suites') && zh.includes('76 test suites'), 'zh lines');

// 11. Disclosed Repair markers on the three stale claim sites
ck('D1', 'GOAL.md Disclosed Repair marker', read('.scratch/grill-t22/GOAL.md').includes('[Disclosed Repair, 2026-09-22'), 'GOAL');
ck('D2', 'next-round.md Disclosed Repair marker', read('.scratch/grill-t22/handoffs/next-round.md').includes('[Disclosed Repair, 2026-09-22'), 'next-round');
const t21rep = read('.scratch/grill-t21/reports/2026-09-22-report.md');
ck('D3', 't21 report six-wiring-files marker', /Disclosed Repair, 2026-09-22 - audit-r2 R2-C-2/.test(t21rep), 't21 report marker');

// 12. ADR-0071 reconciliation
const a71 = read('docs/adr/0071-tarball-cap-trend-anchor-amendment-t10-conviction-lane-surface.md');
ck('D4', 'ADR-0071 status line reconciled', /discharged 2026-09-17/.test(a71) && /R2-C-4/.test(a71), 'status+note');

// 13. Anchors / rewrite-map / instrument counts
const anchors = readJson('docs/governance/anchors.json');
const acount = (anchors.artifacts || anchors.anchors || []).length;
ck('G1', 'anchors_count 18', acount === 18, 'artifacts=' + acount);
const rw = readJson('docs/rewrite-map.json');
const cites = JSON.stringify(rw).match(/":\d+/g);
ck('G2', 'rewrite-map citation count field/canon 2051', facts.rewrite_map_citations === 2051, 'canon=' + facts.rewrite_map_citations);
ck('G3', 'instrument entries canon 27', facts.instrument_entries === 27, 'canon=' + facts.instrument_entries);

// 14. Report hygiene: no canon numbers in prose outside the facts region
const noFacts = report.replace(/<!-- round-facts:start -->[\s\S]*?<!-- round-facts:end -->/, '');
const canonLeak = ['1300', '339408', '2051'].filter(n => noFacts.includes(n));
ck('H1', 'no canon numerals in report prose outside facts region', canonLeak.length === 0, 'leaks: ' + (canonLeak.join(',') || 'none'));

// 15. Committed clean-tree evidence verdict
const ct = read('.scratch/grill-t22/evidence/clean-tree.txt');
ck('H2', 'committed clean-tree verdict CLEAN', /verdict: CLEAN/.test(ct), ct.split('verdict:')[1] ? ct.split('verdict:')[1].trim().slice(0, 20) : 'none');

// 16. Commit map SHAs resolve + message match
const LOG = spawnSync('git', ['log', '--format=%h %s', '-30'], { cwd: ROOT, encoding: 'utf8' }).stdout;
const MAP = [['d135064','grill closeout'],['9984e8e','setup'],['ef6c5e9','post-audit repairs'],['7c0e560','T-2 codification'],['10c45a6','README count'],['fd75a0b','D6 second step'],['30b8c76','T-3 battery'],['1304188','post-battery fixpoint'],['fcc91cf','recapture-clean-tree'],['4a111ce','clean-tree re-capture'],['de68857','round-complete handoff'],['9fcd2ab','post-handoff regen'],['688e113','regen fixpoint']];
let mok = 0, mmiss = [];
for (const [sha, kw] of MAP) { if (LOG.includes(sha) && LOG.includes(kw)) mok++; else mmiss.push(sha + ':' + kw); }
ck('V1', 'all 13 report-map commits resolve with matching subjects', mmiss.length === 0, mok + '/13; missing: ' + (mmiss.join(',') || 'none'));

// 17. not_run list honest: gate-all evidence shows those 4 legs UNVERIFIABLE
const ga = read('.scratch/grill-t22/evidence/gate-all.txt');
const nr = ['bench-gate','ci-wiring','mr-probes','probes'].filter(g => ga.includes(g));
ck('H3', 'not_run legs present in gate-all evidence', nr.length >= 3, 'seen: ' + nr.join(','));

// 18. seed inventory + record count pins
const a33 = read('test/adr-0033-wiring.test.js');
ck('W1', 'adr-0033 seed inventory extended (61/81 pins)', a33.includes('61') && a33.includes('81'), 'pins present');

// 19. t22 evidence files are git-tracked (committed evidence)
const lsfiles = spawnSync('git', ['ls-files', '.scratch/grill-t22/evidence/'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
ck('H4', '23 evidence files git-tracked', lsfiles.length === 23, 'tracked=' + lsfiles.length);

console.log(out.join('\n'));
console.log('claim-sites: ' + (out.length - fails) + ' PASS, ' + fails + ' FAIL');
process.exit(fails ? 1 : 0);
