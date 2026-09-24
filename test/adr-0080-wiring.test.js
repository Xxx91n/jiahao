'use strict';
// test/adr-0080-wiring.test.js - grill-t21 documentation round pins.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const tax = require('../scripts/surface-taxonomy');
const cgi = require('../scripts/check-governance-inventory');
const ADR = path.join(ROOT, 'docs', 'adr', '0080-readme-star-r3-predicate-and-taxonomy-reclassification-channel.md');
const TAX = path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json');
const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');
const ANCH = path.join(ROOT, 'docs', 'governance', 'anchors.json');

function trendWith(rounds) {
  return { schema_version: 1, anchor: { adr_count_base: 63, K: 2 }, rounds: rounds };
}
function docRow(over) {
  return Object.assign({
    round: 'grill-tNN-doc-round', date: '2026-09-19', kind: 'documentation',
    adr_added: [], adr_superseded_or_closed: [], net_additions: 0,
    zero_product_diff: true, carve_out_used: 0, advisory_fired: false
  }, over || {});
}
function errsFor(rounds) {
  return cgi.checkInventory(ROOT, { trend: trendWith(rounds) }).errors;
}

describe('ADR-0080 doc surface (grill-t21 disposition round)', () => {
  test('title, status, date, ledger + spec anchors', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0080:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-22');
    expect(a).toContain('grill-t21/decision-ledger.md');
    expect(a).toContain('spec-t21-disposition.md');
  });

  test('ADR-0080 registers the required policy content (audit C-1 contract)', () => {
    const a = read(ADR);
    expect(a).toContain('residual-rule gap');
    expect(a).toContain('README-*');
    expect(a).toContain('defer-0066');
    expect(a).toContain('no standing exemption');
    expect(a).toContain('ADR-0076');
    expect(a).toContain('reclassifications');
  });

  test('README-* root predicate: mirror + companions classify R3 (the residual gap is closed)', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    expect(tax.classifyPath('README-zh-CN.md', closure)).toBe('R3');
    expect(tax.classifyPath('README.md', closure)).toBe('R3');
    expect(tax.classifyPath('README-ja.md', closure)).toBe('R3');
    expect(tax.classifyPath('README', closure)).toBe('R3');
    expect(tax.classifyPath('src/README-notes.md', closure)).toBe('R2');
    expect(tax.classifyPath('docs/README-anything.md', closure)).toBe('R3');
  });

  test('taxonomy artifact carries the reclassifications log + the README-* rule text', () => {
    const t = readJson(TAX);
    expect(Array.isArray(t.reclassifications)).toBe(true);
    const rc = t.reclassifications.find((r) => r.adr === 'ADR-0080');
    expect(rc).toBeDefined();
    expect(rc.from).toBe('R2');
    expect(rc.to).toBe('R3');
    expect(rc.effective).toBe('2026-09-22');
    expect(new RegExp(rc.pattern).test('README-zh-CN.md')).toBe(true);
    expect(t.surfaces.R3.rule).toContain('README*');
  });

  test('gtd recompute grace: pre-effective rows listing a reclassified file pass; post-effective rows still fail', () => {
    const pre = docRow({
      round: 'grill-tNN-pre-reclass', date: '2026-09-20', carve_out_used: 1,
      governance_tooling_diff: { files: ['README-zh-CN.md'], reason: 'file was R2 at row time - the residual misclassification' }
    });
    expect(errsFor([pre])).toEqual([]);
    const post = docRow({
      round: 'grill-tNN-post-reclass', date: '2026-09-23', carve_out_used: 1,
      governance_tooling_diff: { files: ['README-zh-CN.md'], reason: 'post-effective listing must still hard-fail' }
    });
    expect(errsFor([post]).join(' ')).toContain('mislabeled disclosure');
    const ctl = docRow({
      round: 'grill-tNN-ctl', date: '2026-09-20', carve_out_used: 1,
      governance_tooling_diff: { files: ['AGENTS.md'], reason: 'AGENTS.md was always R3 - no grace exists for it' }
    });
    expect(errsFor([ctl]).join(' ')).toContain('mislabeled disclosure');
  });

  test('the t20 row keeps t20-time truth under the corrected carve_out_used:1 form (audit C-1)', () => {
    const ti = readJson(TREND);
    const r = ti.rounds.find((x) => x.round === 'grill-t20-doc-round');
    expect(r.carve_out_used).toBe(1);
    expect(r.governance_tooling_diff.files.slice().sort()).toEqual(['.github/workflows/ci.yml', 'README-zh-CN.md']);
    expect(r.governance_tooling_diff.reason.slice(0, 22)).toBe('Retroactive correction');
    expect(r.governance_tooling_diff.reason).toContain('mismatch');
    expect(r.governance_tooling_diff.reason).toContain('ADR-0080');
    expect(r.governance_tooling_diff.reason).toContain('t20-time truth');
    expect(errsFor([r])).toEqual([]);
  });

  test('the t21 row is the declared carve-out form (D-001)', () => {
    const ti = readJson(TREND);
    const r = ti.rounds.find((x) => x.round === 'grill-t21-doc-round');
    expect(r.kind).toBe('documentation');
    expect(r.adr_added).toEqual(['0080']);
    expect(r.net_additions).toBe(1);
    expect(r.zero_product_diff).toBe(true);
    expect(r.carve_out_used).toBe(1);
    expect(r.governance_tooling_diff.files.slice().sort()).toEqual([
      '.github/workflows/ci.yml',
      'bench/polygraph/thresholds.json',
      'scripts/build-governance-anchors.js',
      'scripts/check-governance-inventory.js',
      'scripts/surface-taxonomy.js',
    ]);
    expect(r.governance_tooling_diff.reason).toContain('Post-audit repair');
    expect(r.deferred_entry).toBe('defer-0066');
    expect(errsFor([r])).toEqual([]);
  });

  test('coverage leg: the declared channels must cover the committed R2 diff (t21 audit C-1)', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    const row = {
      governance_tooling_diff: { files: ['scripts/check-governance-inventory.js'], reason: 'x'.repeat(12) },
      mechanism_output_diff: { files: ['bench/research/out/g6-publish-replay.json'], reason: 'y'.repeat(12) },
    };
    const gaps = cgi.coverageGaps(
      ['scripts/check-governance-inventory.js', 'bench/polygraph/thresholds.json', 'bench/research/out/g6-publish-replay.json', 'README.md'],
      row, closure);
    expect(gaps.undeclaredR2).toEqual(['bench/polygraph/thresholds.json']);
    expect(gaps.r1).toEqual([]);
    const covered = Object.assign({}, row, {
      governance_tooling_diff: { files: row.governance_tooling_diff.files.concat('bench/polygraph/thresholds.json'), reason: row.governance_tooling_diff.reason },
    });
    expect(cgi.coverageGaps(['bench/polygraph/thresholds.json'], covered, closure).undeclaredR2).toEqual([]);
  });

  test('reclass grace requires from:R2 in the log entry (over-exemption tightened)', () => {
    // The excusal must only fire when the log records the file WAS R2 - a
    // looser entry must not excuse. checkInventory loads the taxonomy from
    // disk, so pin the predicate at source level and keep a positive
    // control: a pre-effective row listing README-zh-CN.md passes under the
    // real log entry (from:R2 -> to:R3).
    const src = read(path.join(ROOT, 'scripts', 'check-governance-inventory.js'));
    expect(src).toContain("rc.from !== 'R2'");
    const positive = docRow({
      round: 'grill-tNN-fromctl', date: '2026-09-20', carve_out_used: 1,
      governance_tooling_diff: { files: ['README-zh-CN.md'], reason: 'grace fires only because the log records from:R2' }
    });
    expect(errsFor([positive])).toEqual([]);
  });

  test('defer-0066 is the merged ratchet row: five instances + the four elements (D-004)', () => {
    const reg = readJson(REG);
    const d = reg.entries.find((e) => e.id === 'defer-0066');
    expect(d).toBeDefined();
    expect(d.status).toBe('pending-evaluation');
    expect(d.unfreeze_if.type).toBe('free-text');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.instances.length).toBe(5);
    expect(d.rationale).toContain('only shrinks, never grows');
    expect(d.rationale).toContain('Owner:');
    expect(d.rationale).toContain('acceptance:');
    expect(d.unfreeze_if.check).toContain('standalone');
  });

  test('anchors.json lists decision-ledger-t20.md under ADR-0080, content-equal to the scratch authority', () => {
    const anchors = readJson(ANCH);
    const a = anchors.artifacts.find((x) => x.file === 'decision-ledger-t20.md');
    expect(a).toBeDefined();
    expect(a.adr).toBe('ADR-0080');
    expect(a.origin).toBe('.scratch/grill-t20/decision-ledger.md');
    const gov = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t20.md'));
    const scr = read(path.join(ROOT, '.scratch', 'grill-t20', 'decision-ledger.md'));
    expect(gov).toBe(scr);
  });

  test('README index rebuilt: 85 records incl. ADR-0080', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('85 architecture decision records');
    expect(r).toContain('0080-readme-star-r3-predicate-and-taxonomy-reclassification-channel.md');
  });

  test('ci.yml suite parity declares the live expected suite count', () => {
    const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'));
    expect(ci).toContain('--expected-suites 81');
  });

  test('CONTEXT.md clauses verified: trend-anchor disclosed-repair + registry merged-ratchet', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('reused as the carrier');
    expect(c).toContain('only shrinks, never grows');
  });

  test('AGENTS.md carries the C-7 split-form evidence-count convention', () => {
    const a = read(path.join(ROOT, 'AGENTS.md'));
    expect(a).toContain('split form');
    expect(a).toContain('17 captures + 1');
    expect(a).toContain('C-7');
  });
});
