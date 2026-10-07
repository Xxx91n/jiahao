'use strict';
// test/adr-0087-wiring.test.js - wiring suite for ADR-0087 (grill-t30):
// CodeBuddy host admission, pending-confirmation tiering channel, SCED
// preregistration file semantics, and the E-17 map-freshness leg's
// registration + live-tree run. Bundle structure lives in
// test/codebuddy-adapter.test.js; leg unit tests live in
// test/map-freshness.test.js.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const fresh = require('../scripts/evidence-freshness');
const mf = require('../scripts/check-map-freshness');
const hg = require('./helpers/git-hermetic');

const ROOT = path.join(__dirname, '..');
const ADR = 'docs/adr/0087-codebuddy-host-adapter-first-external-effectiveness-trial.md';
const TAX = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/governance/surface-taxonomy.json'), 'utf8'));
const adrText = fs.readFileSync(path.join(ROOT, ADR), 'utf8');
const gates = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/gates.json'), 'utf8'));
const contracts = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/host-contracts.json'), 'utf8'));
const JL = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench/codebuddy-trial/judgment-lines.json'), 'utf8'));

describe('ADR-0087 registration + anchors', () => {
  test('the ADR exists with ledger/spec anchors and the tiering extension declared', () => {
    expect(fs.existsSync(path.join(ROOT, ADR))).toBe(true);
    for (const frag of [
      'grill-t30', 'decision-ledger', 'spec-t30-codebuddy',
      '### D-A', '### D-B', '### D-C', '### D-D', '### D-E',
      'EXTENDS ADR-0028', 'declared-unverified', 'pending-confirmation',
      'Claude-Code-compatible', 'source_adr: "0087"', 'Self-audit',
    ]) {
      expect(adrText).toContain(frag);
    }
  });

  test('grill-t30 is registered in freshness.rounds with its base', () => {
    const row = (TAX.freshness.rounds || []).find((r) => r.id === 'grill-t30');
    expect(row).toBeTruthy();
    expect(row.base).toBe('8704ce24174841795e78a4ebbfa2517376c7ce2f');
  });
});

describe('host_admission exception channel (first non-claim/errata registration)', () => {
  const entries = ((((TAX.host_admission || {}).hosts || {}).codebuddy || {}).declared_unverified) || [];

  test('every declared-unverified surface registers as pending-confirmation', () => {
    expect(entries.length).toBeGreaterThanOrEqual(4);
    for (const e of entries) {
      for (const k of ['status', 'requested_by', 'reason', 'expires_at', 'scope']) {
        expect(typeof e[k]).toBe('string');
        expect(e[k].length).toBeGreaterThan(0);
      }
      expect(e.status).toBe('pending-confirmation');
      expect(/[*?%[\]{}]/.test(e.scope)).toBe(false); // literal scope only
    }
  });

  test('the channel field is classified exception-channel and carries source_adr', () => {
    const cls = TAX.field_governance.classification.host_admission;
    expect(cls.hosts.codebuddy.declared_unverified).toBe('exception-channel');
    expect(TAX.host_admission.source_adr).toBe(ADR);
  });

  test('channel exits clean end-to-end', () => {
    const res = spawnSync(process.execPath, ['scripts/check-exception-channel.js'], { cwd: ROOT, encoding: 'utf8' });
    expect(res.status).toBe(0);
  });
});

describe('preregistration file (judgment lines)', () => {
  test('every judgment line carries source_adr 0087', () => {
    expect(JL.judgment_lines.length).toBeGreaterThanOrEqual(4);
    for (const line of JL.judgment_lines) {
      expect(line.source_adr).toBe('0087');
      expect(line.predicate).toMatch(/^ONLY IF .* THEN /);
      expect(Array.isArray(line.phases)).toBe(true);
    }
    expect(JL.status).toBe('registered-open');
    expect(JL.source_adr).toBe(ADR);
  });

  test('detect() freeze is pinned by sha256 + landing commit that exists in history', () => {
    expect(JL.frozen_detector.path).toBe('src/detector.js');
    expect(JL.frozen_detector.blob_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JL.frozen_detector.landing_commit).toMatch(/^[0-9a-f]{40}$/);
    expect(hg.gitOk(ROOT, ['cat-file', '-e', JL.frozen_detector.landing_commit])).toBe(true);
  });

  test('immutable-body convention: deviations channel exists and is the only amendment path', () => {
    expect(Array.isArray(JL.deviations)).toBe(true);
    expect(JL._doc).toMatch(/immutable/);
    // telemetry self-check gate is registered (Phase-0 item 0)
    expect(JL.telemetry_self_check.phase).toBe('P0');
    expect(JL.telemetry_self_check.item).toBe(0);
    expect(JL.telemetry_self_check.gate).toMatch(/unverified/i);
  });

  test('protocol + task-volume artifacts live on the round surface', () => {
    for (const f of ['.scratch/grill-t30/protocol.md', '.scratch/grill-t30/task-volumes.md']) {
      expect(fs.existsSync(path.join(ROOT, f))).toBe(true);
    }
    const proto = fs.readFileSync(path.join(ROOT, '.scratch/grill-t30/protocol.md'), 'utf8');
    for (const frag of ['SCED', 'P0', 'P1', 'P2', 'telemetry', 'owner', 'judgment-lines.json']) {
      expect(proto).toContain(frag);
    }
  });
});

describe('host contract + lifecycle registration', () => {
  test('four codebuddy contract rows exist with ADR-0087 anchors', () => {
    const rows = contracts.contracts.filter((r) => r.host === 'codebuddy');
    expect(rows.length).toBe(4);
    for (const r of rows) expect(r.source_adr).toBe(ADR);
    expect(rows.map((r) => r.id).sort()).toEqual([
      'codebuddy-bundle', 'codebuddy-config', 'codebuddy-failsoft', 'codebuddy-verdict-gate',
    ]);
  });

  test('lifecycle entry is active with the verified/declared-unverified split', () => {
    expect(contracts.lifecycle.codebuddy).toBeTruthy();
    expect(contracts.lifecycle.codebuddy.state).toBe('active');
    expect(contracts.lifecycle.codebuddy.note).toMatch(/pending-confirmation/);
  });
});

describe('map-freshness leg (E-17, D-004)', () => {
  test('leg is registered in gates.json order 224 anchored on ADR-0087', () => {
    const e = gates.entries.find((x) => x.name === 'map-freshness');
    expect(e).toBeTruthy();
    expect(e.order).toBe(224);
    expect(e.tier).toBe('confirmatory');
    expect(e.source_adr).toBe(ADR);
    expect(e.requires).toEqual(['repo-tree']);
  });

  test('live-tree run is clean (no claim-surface commit left uncovered)', () => {
    // grill-t35 D-005 (ADR-0092 D-M2): the per-commit checkFreshness entry point
    // was replaced. The AUTHORITY is tip-map coverage over the union of the line's
    // claim commits; the per-commit form survives as advisoryPerCommit, which is
    // audited rather than gated. This test now asserts the authority, and pins the
    // advisory's continued export so the demotion stays visible.
    // The authority is asserted against the WORKING TREE's map (tip: null),
    // because that is the tree E-19 requires to be in sync at the wave boundary.
    // Judging the committed HEAD map here would report red for a regeneration that
    // has already happened but not yet landed - the same lane-vs-landed confusion
    // this round exists to close. The committed-map verdict belongs to CI and to
    // check-post-land.js --post-only, which name the tree explicitly.
    //
    // The fixture below is the PRE-D-6 shape on purpose: the worktree map has no
    // `generated_from` field, so declaredTreeAt returns null and commitTip
    // resolves to `tip` (null = worktree). This asserts the "no declaration"
    // fallback path: when the map declares no tree, the worktree map must cover
    // the worktree tree. The D-6 declared-tree path (map declares a specific
    // committed tree via `generated_from`) is exercised by the D-6 spec fixtures
    // in the test suite, not by this fixture.
    const cov = mf.checkTipCoverage(ROOT, { tip: null });
    expect(cov.errors).toEqual([]);
    expect(typeof cov.checked).toBe('number');
    expect(cov.missing).toEqual([]);
    expect(typeof mf.advisoryPerCommit).toBe('function');
  });
});

describe('ADR-0088 eval-map / volumes -> registration-surface back-pointer chain (grill-t31 extension)', () => {
  const EM = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench/codebuddy-trial/eval-map.json'), 'utf8'));
  const PINS = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench/codebuddy-trial/frozen-sha256.json'), 'utf8'));
  const VOLS = {};
  for (const v of ['a', 'b', 'c']) VOLS[v] = JSON.parse(fs.readFileSync(path.join(ROOT, 'bench/codebuddy-trial/volumes', v + '.json'), 'utf8'));

  test('eval-map detector pin mirrors the judgment-lines frozen_detector pin', () => {
    expect(EM.detector.path).toBe(JL.frozen_detector.path);
    expect(EM.detector.blob_sha256).toBe(JL.frozen_detector.blob_sha256);
    expect(EM.detector.blob_sha256).toBe('a0ba70fbfb82229b41f538994c159c77cd379cfdc118994cc92c649273ec4960');
  });

  test('eval-map predicate ids exactly cover the five registered judgment lines', () => {
    expect(Object.keys(EM.predicates).sort()).toEqual(JL.judgment_lines.map((l) => l.id).sort());
    for (const l of JL.judgment_lines) {
      expect(EM.predicates[l.id].indeterminate_reasons.length).toBeGreaterThan(0);
    }
  });

  test('item-0 probe pin + dual rules expectations are registered in eval-map', () => {
    expect(EM.probes.item0.task_id).toBe('item-0-telemetry-probe');
    expect(EM.probes.item0.prompt_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(EM.probes.item0.prompt_sha256).toBe(
      require('crypto').createHash('sha256').update(EM.probes.item0.prompt_text, 'utf8').digest('hex'));
    expect(Object.keys(EM.bundle_expectations.rules).sort()).toEqual(['rules/jiahao-generator.md', 'rules/jiahao-verifier.md']);
  });

  test('each volume carries the declared_not_proven block + honesty clause (ADR-0088 clause 5)', () => {
    for (const v of ['a', 'b', 'c']) {
      expect(Object.keys(VOLS[v].declared_not_proven).sort()).toEqual([
        'category_capability_equivalence', 'difficulty_equivalence',
        'needle_inducement_equivalence', 'prompt_semantic_equivalence',
      ]);
      expect(VOLS[v].honesty_clause).toMatch(/declared/i);
      expect(VOLS[v].needles.length).toBeGreaterThanOrEqual(4);
    }
  });

  test('volume c replay tasks point back at A-shape groups (D-005 replay constitution)', () => {
    const replays = VOLS.c.tasks.filter((t) => t.replay_shape_group !== null);
    expect(replays.length).toBeGreaterThanOrEqual(2);
    expect(replays.length).toBeLessThanOrEqual(3);
    const aGroups = new Set(VOLS.a.tasks.map((t) => t.shape_group));
    for (const r of replays) expect(aGroups.has(r.replay_shape_group)).toBe(true);
  });

  test('frozen-sha256 pins cover eval-map + all volumes + judgment-lines body', () => {
    for (const k of ['eval-map.json', 'volumes/a.json', 'volumes/b.json', 'volumes/c.json', 'judgment-lines.json']) {
      expect(PINS.pins[k]).toBeTruthy();
    }
    expect(PINS.pins['judgment-lines.json'].strip_fields).toEqual(['deviations']);
  });
});
