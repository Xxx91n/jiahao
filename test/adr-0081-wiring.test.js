'use strict';
// test/adr-0081-wiring.test.js - grill-t22 documentation round pins.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const cgi = require('../scripts/check-governance-inventory');
const ADR = path.join(ROOT, 'docs', 'adr', '0081-repair-window-amend-in-place-coverage-pairing-headroom-watch.md');
const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');
const CTX = path.join(ROOT, 'CONTEXT.md');

describe('ADR-0081 doc surface (grill-t22 disposition round)', () => {
  test('title, status, date, ledger + spec anchors', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0081:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-22');
    expect(a).toContain('grill-t22/decision-ledger.md');
    expect(a).toContain('spec-t22-disposition.md');
  });

  test('D-A records the amend-in-place canonical form + the coverage-base pairing rule (audit-r2 adjudication b)', () => {
    const a = read(ADR);
    expect(a).toContain('owns no independent trend row');
    expect(a).toContain('annotate-not-supersede');
    expect(a).toContain('--coverage-base');
    expect(a).toContain('latest row');
    expect(a).toContain('dated post-audit note');
    expect(a).toContain('Conditional flip branch');
  });

  test('D-B records the rc.from adjudication: conformance to ADR-0080 D-B, no separate ADR', () => {
    const a = read(ADR);
    expect(a).toContain('rc.from');
    expect(a).toContain('ADR-0080 D-B');
    expect(a).toContain('conformance');
  });

  test('D-E names defer-0067 and records the defer-0042 countersign + defer-0051 reconciliation', () => {
    const a = read(ADR);
    expect(a).toContain('defer-0067');
    expect(a).toContain('defer-0042');
    expect(a).toContain('defer-0051');
    expect(a).toContain('headroom');
  });

  test('defer-0067 discharged-by-trigger via the ADR-0082 amendment (grill-t23; registration facts retained)', () => {
    const d = readJson(REG).entries.find((e) => e.id === 'defer-0067');
    expect(d).toBeDefined();
    expect(d.status).toBe('closed');
    expect(d.closed_at).toBe('2026-09-22');
    expect(d.closed_via).toContain('discharged-by-trigger');
    expect(d.closed_via).toContain('ADR-0082');
    expect(d.source_adr).toContain('0081');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.unfreeze_if.check).toContain('2048');
    expect(d.rationale).toContain('340258');
  });

  test('defer-0042 check-in records the audit-r2 countersign; row stays pending-evaluation', () => {
    const d = readJson(REG).entries.find((e) => e.id === 'defer-0042');
    expect(d.status).toBe('pending-evaluation');
    expect(d.last_check_in.date).toBe('2026-09-22');
    expect(d.last_check_in.note).toContain('countersign');
    expect(d.last_check_in.note).toContain('weak-independent');
  });

  test('defer-0051 rationale no longer claims an open second_reviewer slot (R2-C-4)', () => {
    const d = readJson(REG).entries.find((e) => e.id === 'defer-0051');
    expect(d.status).toBe('closed');
    expect(d.rationale).not.toContain('slot is open');
    expect(d.rationale).toContain('discharged 2026-09-17');
    expect(d.closed_via).toContain('discharged-by-trigger');
    expect(d.closed_via).toContain('324711');
  });

  test('the t22 row is the declared carve-out form naming the round R2 touches', () => {
    const ti = readJson(TREND);
    // grill-t23 landed its own row on top (adr-0082 + .github templates);
    // grill-t24 landed its row on top of that (adr-0083 + ci.yml sync);
    // both keep their pinned shape, addressed by name not by position.
    // grill-t25/t26/t27 rows landed on top (fix rounds, kind:fix); the t22/t23
    // pinned shapes below are still addressed by name, never by position.
    const row = ti.rounds.find((r) => r.round === 'grill-t22-doc-round');
    expect(ti.rounds).toHaveLength(21);
    const latest = ti.rounds.find((r) => r.round === 'grill-t23-front-face');
    expect(latest).toBeDefined();
    expect(latest.adr_added).toEqual(['0082']);
    expect(latest.deferred_entry).toBe('defer-0068');
    expect(latest.carve_out_used).toBe(1);
    expect(latest.governance_tooling_diff.files).toContain('.github/PULL_REQUEST_TEMPLATE.md');
    expect(latest.governance_tooling_diff.files).toContain('.github/ISSUE_TEMPLATE/measurement-discrepancy.md');
    expect(row.kind).toBe('documentation');
    expect(row.adr_added).toEqual(['0081']);
    expect(row.net_additions).toBe(1);
    expect(row.deferred_entry).toBe('defer-0067');
    expect(row.zero_product_diff).toBe(true);
    expect(row.carve_out_used).toBe(1);
    expect(row.governance_tooling_diff.files).toContain('.github/workflows/ci.yml');
    expect(row.governance_tooling_diff.files).toContain('scripts/check-governance-inventory.js');
    expect(row.governance_tooling_diff.files).toContain('bench/polygraph/thresholds.json');
    expect(row.mechanism_output_diff.files).toContain('bench/research/out/g6-publish-replay.json');
  });

  test('coverage leg: unresolvable base ref is a keyed FAIL, not an uncaught crash (audit-r2 R2-C-3)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-governance-inventory.js'), '--coverage-base', 'not-a-real-ref'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect((r.stderr || '') + (r.stdout || '')).toContain('coverage: --coverage-base "not-a-real-ref" unresolvable');
    expect((r.stderr || '') + (r.stdout || '')).not.toContain('execFileSync');
  });

  test('coverage leg: the committed diff anchored at the t24 round base validates the latest row (re-anchored grill-t24)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-governance-inventory.js'), '--coverage-base', 'fc390d5e778db567d12b072f7a25cbf1e73b03f8'], { cwd: ROOT, encoding: 'utf8' }); // re-anchored grill-t25: the latest row is now grill-t25's, so the window pairs with the t25 base
    expect(r.status).toBe(0);
  });

  test('CONTEXT Repair Window term stands alone referencing ADR-0081 + ADR-0076 with _Avoid_', () => {
    const c = read(CTX);
    expect(c).toContain('**Repair Window (修复窗口)**');
    const term = c.split('**Repair Window (修复窗口)**')[1].split('**')[0];
    expect(term).toContain('ADR-0081');
    expect(term).toContain('ADR-0076');
    expect(term).toContain('--coverage-base');
    expect(term).toContain('_Avoid_');
  });

  test('README index rebuilt: 85 records incl. ADR-0081', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('85 architecture decision records');
    expect(r).toContain('0081-repair-window-amend-in-place-coverage-pairing-headroom-watch.md');
  });

  test('ci.yml suite parity declares the live expected suite count', () => {
    const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'));
    expect(ci).toContain('--expected-suites 82');
  });

  test('coverageGaps pure export: the R2-undeclared defect shape still fails (regression pin)', () => {
    const closure = new Set(require('../scripts/surface-taxonomy').computeRuntimeClosure(ROOT));
    const gaps = cgi.coverageGaps(['.github/workflows/ci.yml', 'scripts/check-governance-inventory.js'], { governance_tooling_diff: { files: ['.github/workflows/ci.yml'] } }, closure);
    expect(gaps.undeclaredR2).toContain('scripts/check-governance-inventory.js');
    expect(gaps.r1).toEqual([]);
  });
});
