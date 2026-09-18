// test/adr-0076-wiring.test.js — grill-t15 doc-round wiring (ADR-0076 D-A..D-E).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const ADR = path.join(ROOT, 'docs', 'adr', '0076-round-edit-surface-taxonomy-and-governance-carve-out.md');
const TAX = path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json');
const tax = require('../scripts/surface-taxonomy');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
const NL = String.fromCharCode(10);
function tracked() { return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(NL).filter(Boolean); }

describe('ADR-0076 doc surface (grill-t15 disposition + mechanism round)', () => {
  test('title, status, date, ledger anchor', () => {
    const a = read(ADR);
    expect(a).toContain('# ADR-0076:');
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('- Date: 2026-09-18');
    expect(a).toContain('decision-ledger-t15');
  });

  test('decision clauses D-A..D-E land', () => {
    const a = read(ADR);
    for (const s of ['D-A - The three-surface', 'D-B - The governance carve-out', 'D-C - The sunset counter durable home', 'D-D - Spec-code bidirectional pinning', 'D-E - Round surface']) {
      expect(a).toContain(s);
    }
  });

  test('CONTEXT.md carries the two new terms + the amended Sunset Trigger', () => {
    const c = read(path.join(ROOT, 'CONTEXT.md'));
    expect(c).toContain('Round Edit Surface');
    expect(c).toContain('Governance Carve-Out');
    expect(c).toContain('absence');
  });

  test('README index rebuilt: 76 records incl. ADR-0076', () => {
    const r = read(path.join(ROOT, 'README.md'));
    expect(r).toContain('76 architecture decision records');
    expect(r).toContain('0076-round-edit-surface-taxonomy-and-governance-carve-out.md');
  });

  test('AGENTS.md carries the single pointer line', () => {
    const ag = read(path.join(ROOT, 'AGENTS.md'));
    expect(ag).toContain('ADR-0076');
  });

  test('anchors.json lists decision-ledger-t15.md under ADR-0076, content-equal to the scratch authority', () => {
    const a = readJson(path.join(ROOT, 'docs', 'governance', 'anchors.json'));
    const e = a.artifacts.find(function (x) { return x.file === 'decision-ledger-t15.md'; });
    expect(e).toBeDefined();
    expect(e.adr).toBe('ADR-0076');
    expect(e.origin).toBe('.scratch/grill-t15/decision-ledger.md');
    const copy = read(path.join(ROOT, 'docs', 'governance', 'decision-ledger-t15.md'));
    expect(sha256(copy)).toBe(e.sha256);
    expect(copy).toBe(read(path.join(ROOT, '.scratch', 'grill-t15', 'decision-ledger.md')));
  });
});

describe('surface taxonomy artifact (ADR-0076 D-A)', () => {
  test('the R1 set is exactly the computed require-closure (authority is the scan, not the list)', () => {
    const t = readJson(TAX);
    expect(t.schema_version).toBe(1);
    const closure = tax.computeRuntimeClosure(ROOT);
    expect(t.surfaces.R1.files.slice().sort()).toEqual(closure.slice().sort());
    for (const must of ['scripts/install.js', 'scripts/resolve.js', 'src/shared/paths.js', 'src/evidence-log.js', 'package.json']) {
      expect(closure).toContain(must);
    }
  });

  test('every git-tracked file classifies into exactly one surface', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    const counts = { R1: 0, R2: 0, R3: 0 };
    for (const f of tracked()) counts[tax.classifyPath(f, closure)] += 1;
    expect(counts.R1).toBe(closure.size);
    expect(counts.R1 + counts.R2 + counts.R3).toBe(tracked().length);
  });

  test('the surface rules pin representative paths to their class', () => {
    const closure = new Set(tax.computeRuntimeClosure(ROOT));
    const cases = [
      ['docs/adr/0075-promotion-review-preregistration-nm-sufficiency-intent-taxonomy-sunset-trigger.md', 'R3'],
      ['CONTEXT.md', 'R3'],
      ['README.md', 'R3'],
      ['AGENTS.md', 'R3'],
      ['.scratch/grill-t15/decision-ledger.md', 'R3'],
      ['test/adr-0075-wiring.test.js', 'R3'],
      ['.github/workflows/ci.yml', 'R2'],
      ['scripts/check-ci-jobs.js', 'R2'],
      ['scripts/build-rewrite-map.js', 'R2'],
      ['hooks/jiahao-verdict-gate.js', 'R2'],
      ['scripts/install.js', 'R1'],
      ['src/shared/paths.js', 'R1'],
    ];
    for (const pair of cases) expect(tax.classifyPath(pair[0], closure)).toBe(pair[1]);
  });
});

describe('registry dispositions (ADR-0076 D-E)', () => {
  const reg = () => readJson(path.join(ROOT, 'docs', 'deferred-registry.json'));

  test('defer-0026 actioned with the limitation field', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0026'; });
    expect(d.status).toBe('actioned');
    expect(d.actioned_at).toBe('2026-09-18');
    expect(d.limitation).toContain('403');
    expect(d.limitation).toContain('environmental');
    expect(d.limitation).toContain('defer-0060');
  });

  test('defer-0060 is the sole live 403 tracker: external-event, pending-evaluation, no verified_by', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0060'; });
    expect(d).toBeDefined();
    expect(d.unfreeze_if.type).toBe('external-event');
    expect(d.status).toBe('pending-evaluation');
    expect(d.cadence_tier).toBe('quarterly');
    expect(d.review_at).toBe('2026-12-15');
    expect(d.verified_by).toBeUndefined();
    expect(d.rationale).toContain('R10/R13');
    expect(d.rationale).toContain('sole live tracker');
    expect(d.rationale).toContain('rejected D-002 sunset-row placeholder');
  });

  test('defer-0055 sunset pointer is pure (audit F-3): pointer only, no clause restatement', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0055'; });
    expect(d.sunset_trigger_pointer).toContain('ADR-0075 D-C');
    expect(d.sunset_trigger_pointer).toContain('only the pointer');
    expect(d.sunset_trigger_pointer).not.toContain('dual-or-path');
  });

  test('defer-0061 tally row registered for the +1 round', () => {
    const d = reg().entries.find(function (e) { return e.id === 'defer-0061'; });
    expect(d).toBeDefined();
    expect(d.source_adr).toContain('0076-round-edit-surface-taxonomy');
    expect(d.status).toBe('closed');
    expect(d.closed_via).toContain('same-commit ledger note');
  });
});

describe('owner asks frozen, never bundled (ADR-0076 D-E)', () => {
  test('both ask packets are frozen verbatim with their types', () => {
    const a = read(ADR);
    expect(a).toContain('Ask A packet (frozen)');
    expect(a).toContain('seq-24');
    expect(a).toContain('Ask B packet (frozen)');
    expect(a).toContain('defer-0051-evidence-packet.json');
    expect(a).toContain('rejection reopens');
  });
});
