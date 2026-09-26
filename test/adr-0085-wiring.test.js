'use strict';
// test/adr-0085-wiring.test.js - pins ADR-0085 (grill-t26 anchor-semantics
// round): the two-layer freshness semantics, the taxonomy registration, the
// single-source checker wiring, the pointer lines, the defer-0070 quarantine
// detail, and the t26 trend row.
const fs = require('fs');
const path = require('path');
const fresh = require('../scripts/evidence-freshness');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const ADR = path.join(ROOT, 'docs', 'adr', '0085-anchor-semantics-claim-point-seal-boundary.md');
const TREND = path.join(ROOT, 'docs', 'governance', 'trend-inventory.json');
const REG = path.join(ROOT, 'docs', 'deferred-registry.json');
const CONTEXT = path.join(ROOT, 'CONTEXT.md');
const BASE = 'bde0570be2caaf982d3d8c531c565bea2b069638';

describe('ADR-0085 anchor semantics (grill-t26: claim-point pinning + terminal seal boundary)', () => {
  test('normative carrier exists with the clause skeleton', () => {
    const a = read(ADR);
    for (const frag of ['Floor-anchor', 'Seal-anchor', 'recorded_at', 'drift', 'declaration-only', 'Metz fallback', 'live-HEAD-walk', 'retired', 'adjudicated/<round>', 'TUF']) {
      expect(a).toContain(frag);
    }
    expect(a).toContain('- Status: Accepted');
    expect(a).toContain('grill-t26 D-001..D-005');
  });

  test('taxonomy registers the closed claim-surface enum + non-anchoring classes + rounds', () => {
    const f = fresh.loadFreshness(ROOT);
    expect(f.claim_surfaces.closed_enum).toEqual(['reports/', 'handoffs/']);
    expect(f.claim_surfaces.exceptions).toContain('handoffs/next-round.md');
    expect(f.non_anchoring_classes.seal_file).toBe('SEAL');
    expect(f.non_anchoring_classes.evidence_dirs).toEqual(['evidence/']);
    expect(f.non_anchoring_classes.round_bookkeeping).toContain('decision-ledger.md');
    const ids = f.rounds.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['grill-t24', 'grill-t25', 'grill-t26']));
    expect(f.rounds.find((r) => r.id === 'grill-t26').base).toBe(BASE);
    expect(f.source_adr).toBe('docs/adr/0085-anchor-semantics-claim-point-seal-boundary.md');
  });

  test('single source: round-scoped suites carry no re-rolled walk (D-005 hedge)', () => {
    for (const f of ['test/adr-0083-wiring.test.js', 'test/adr-0084-wiring.test.js']) {
      const c = read(path.join(ROOT, f));
      expect(c).not.toContain('rev-list');
      expect(c).not.toContain('merge-base');
      expect(c).not.toContain('diff-tree');
      expect(c).toContain('evidence-freshness');
    }
    expect(fs.existsSync(path.join(ROOT, 'test', 'freshness-checker.test.js'))).toBe(true);
    expect(read(path.join(ROOT, 'scripts', 'evidence-freshness.js'))).toContain('Metz fallback');
  });

  test('pointer lines: ADR-0083 D-A + ADR-0084 D-C name the amendment; CONTEXT carries the terms', () => {
    const a83 = read(path.join(ROOT, 'docs', 'adr', '0083-declared-vs-actual-drift-clauses.md'));
    const a84name = fs.readdirSync(path.join(ROOT, 'docs', 'adr')).find((f) => f.startsWith('0084-'));
    const a84 = read(path.join(ROOT, 'docs', 'adr', a84name));
    expect(a83).toContain('grill-t26 amendment');
    expect(a83).toContain('ADR-0085');
    expect(a84).toContain('grill-t26 amendment');
    expect(a84).toContain('ADR-0085');
    const ctx = read(CONTEXT);
    expect(ctx).toContain('Claim Point');
    expect(ctx).toContain('Seal Boundary');
  });

  test('t26 round evaluation: claims conform; nothing claim-like is unregistered', () => {
    const f = fresh.loadFreshness(ROOT);
    const cfg = fresh.roundConfig(f, 'grill-t26'); // the rounds registry is the consumed source (D-005)
    expect(cfg.base).toBe(BASE); // the suite literal pins the registry row — drift fails here
    const r = fresh.evaluateRound(ROOT, f, cfg);
    for (const c of r.claims) {
      expect(c.bad).toEqual([]); // at each claim commit, captures name a sha >= the floor strictly before it
    }
    expect(r.unregisteredClaims).toEqual([]);
    // t26 is sealed — the seal invariants are unconditional (audit F-5: a
    // conditional block would let a deleted SEAL silently deactivate them).
    expect(r.seal.present).toBe(true);
    expect(r.seal.declared).toBe(r.seal.expectedAnchor);
    expect(r.seal.inFlightClean).toBe(true);
    expect(r.seal.amended).toBe(false);
    expect(r.seal.capturesAtSealOk).toBe(true);
    expect(r.seal.freezeViolations).toEqual([]);
    expect(['absent', 'co-named']).toContain(r.seal.tag.state); // drift is never lawful for the in-round seal
  });

  test('defer-0070 stays quarantined: owner + review date + the three named suite legs', () => {
    const reg = readJson(REG);
    const d = reg.entries.find((e) => e.id === 'defer-0070');
    expect(d.status).toBe('pending-evaluation');
    expect(d.review_at).toBe('2026-10-15');
    expect(d.rationale).toContain('Xxx91n');
    for (const s of ['adr-0069-wiring', 'sentinel-ownership', 'adr-0079-wiring']) {
      expect(d.last_check_in.note).toContain(s);
    }
  });

  test('t26 trend row: kind fix + adr_added 0085 + R2 machinery diff named', () => {
    const t = readJson(TREND);
    const row = t.rounds.find((r) => r.round === 'grill-t26');
    expect(row).toBeDefined();
    expect(row.kind).toBe('fix');
    expect(row.adr_added).toEqual(['0085']);
    for (const f of ['scripts/evidence-freshness.js', 'test/freshness-checker.test.js', '.github/workflows/ci.yml']) {
      expect(row.governance_tooling_diff.files).toContain(f);
    }
    expect(row.deferred_entry).toBe('defer-0070');
  });
});

describe('grill-t28 D-003 audit-artifact residence restoration', () => {
  test('migrated audit reports sit in the registered claim surface, byte-verbatim residences', () => {
    for (const rd of ['grill-t26', 'grill-t27']) {
      expect(fs.existsSync(path.join(ROOT, '.scratch', rd, 'reports', 'audit-report.md'))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, '.scratch', rd, 'audit-evidence', 'audit-report.md'))).toBe(false);
    }
  });

  test('the relocated files are registered claim-surface exceptions - residence, not a new claim act', () => {
    const f = fresh.loadFreshness(ROOT);
    expect(f.claim_surfaces.exceptions).toContain('reports/audit-report.md');
    expect(f.claim_surfaces.exceptions).toContain('handoffs/next-round.md');
    // sealed rounds stay clean: the restoration commit is not a claim commit
    const r26 = fresh.evaluateRound(ROOT, f, fresh.roundConfig(f, 'grill-t26'));
    for (const c of r26.claims) expect(c.bad).toEqual([]);
    expect(r26.seal.freezeViolations).toEqual([]);
  });

  test('report-writing convention registered in AGENTS.md; nc-001 untouched', () => {
    const ag = read(path.join(ROOT, 'AGENTS.md'));
    expect(ag).toContain('committed-surface-reachable evidence');
    expect(ag).toContain('path/count pointers');
    expect(ag).toContain('verdict issuance stays owner-side');
    const nc = readJson(path.join(ROOT, 'docs', 'governance', 'never-commit.json'));
    const nc1 = (nc.rules || []).find(function (r) { return r.id === 'nc-001'; });
    expect(nc1).toBeDefined();
    expect(nc1.pattern).toContain('audit');
    expect(nc1.status).not.toBe('deprecated');
  });
});

describe('grill-t28 D-005/D-006 orphan-ancestry leg', () => {
  test('gates.json registers the standing leg (confirmatory, repo-tree only, source ADR-0085)', () => {
    const g = readJson(path.join(ROOT, 'docs', 'gates.json'));
    const e = g.entries.find(function (x) { return x.name === 'orphan-ancestry'; });
    expect(e).toBeDefined();
    expect(e.command).toBe('node scripts/check-orphan-ancestry.js');
    expect(e.tier).toBe('confirmatory');
    expect(e.source_adr).toContain('0085-anchor-semantics');
    expect(e.requires).toEqual(['repo-tree']);
    expect(e.params).toEqual({});
    expect(Number.isInteger(e.order)).toBe(true);
  });

  test('taxonomy registers freshness.orphan_ancestry + the t28 round; script is the shared checker', () => {
    const f = fresh.loadFreshness(ROOT);
    expect(f.orphan_ancestry).toBeDefined();
    expect(f.orphan_ancestry.artifact_scope).toContain('grill-');
    expect(f.orphan_ancestry.workspace_ref).toBe('refs/heads/gitbutler/workspace');
    expect(Array.isArray(f.orphan_ancestry.errata_exemptions)).toBe(true);
    const r28 = f.rounds.find(function (x) { return x.id === 'grill-t28'; });
    expect(r28).toBeDefined();
    expect(r28.base).toBe('c8613f55c8ac3d83486437703e5bb36964e80ab8');
    // single-source: the thin CLI carries no re-rolled walk (D-005 hedge)
    const cli = read(path.join(ROOT, 'scripts', 'check-orphan-ancestry.js'));
    expect(cli).not.toContain('rev-list');
    expect(cli).not.toContain('merge-base');
    expect(cli).toContain('evidence-freshness');
    expect(read(path.join(ROOT, 'scripts', 'evidence-freshness.js'))).toContain('orphanAncestry');
  });

  test('ADR-0085 carries the verbatim derivation + promotion hook; AGENTS.md carries the ritual', () => {
    const a = read(path.join(ROOT, 'docs', 'adr', '0085-anchor-semantics-claim-point-seal-boundary.md'));
    expect(a).toContain('Mechanization note (2026-09-26, grill-t28 D-005/D-006)');
    expect(a).toContain('pinned-sha ancestry assertion mechanized - violation-instance of the existing claim-point contract; the non-ff trigger maps to the existing post-seal-edit red state, no new normative state introduced');
    expect(a).toContain('if a second independent violation form of the ancestry contract appears, or the assertion\'s semantics diverge from the claim-point walk, mint a first-class ADR at that point');
    expect(a).toContain('lane-ownership precheck is rejected');
    expect(a).toContain('pending owner countersign');
    const ag = read(path.join(ROOT, 'AGENTS.md'));
    expect(ag).toContain('Post-restack ritual');
    expect(ag).toContain('evaluateRound');
    expect(ag).toContain('claims and no seal');
  });

  test('live leg state: every committed pin is ancestral; trigger evaluated or reported', () => {
    const f = fresh.loadFreshness(ROOT);
    const r = fresh.orphanAncestry(ROOT, f, {});
    expect(r.pinCount).toBeGreaterThan(0);
    expect(r.violations).toEqual([]);
    expect(['ok', 'not-evaluated']).toContain(r.trigger.state);
    expect(r.red).toBe(false);
  });

  test('t28 trend row: kind fix + gtd names the new machinery + defer-0074', () => {
    const t = readJson(TREND);
    const row = t.rounds.find(function (r) { return r.round === 'grill-t28'; });
    expect(row).toBeDefined();
    expect(row.kind).toBe('fix');
    expect(row.net_additions).toBe(0);
    expect(row.zero_product_diff).toBe(true);
    expect(row.deferred_entry).toBe('defer-0074');
    for (const f of ['scripts/check-orphan-ancestry.js', 'scripts/evidence-freshness.js', 'test/freshness-checker.test.js']) {
      expect(row.governance_tooling_diff.files).toContain(f);
    }
  });
});
