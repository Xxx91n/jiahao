// test/adr-0093-m2-wiring.test.js -- ADR-0093 D-3 + D-4 (grill-t36 D-006),
// the instrument-non-intrusion contract.
//
// D3 (the point fix): check-g6-publish.js stopped overwriting the evidence it
// observes. Default = compare (compute, diff against the committed log, no
// write); --write-log = the single mutating path. The in-repo precedent for
// the two-mode shape is every other generator leg in the registry
// (build-rewrite-map.js --check, build-audit-checklist.js --check,
// build-governance-anchors.js --check).
//
// D4 (the class assertion): run-gates.js takes a tracked-content hash baseline
// at gate:all entry and recomputes after each leg. A leg that mutates a tracked
// file is red at confirmatory tier, attributed two-layer (leg number + file).
// This is the declaration's claim, and a claim asserted only in prose is a
// comment - so it is asserted here, including the negative direction.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
jest.setTimeout(180000);

const gates = require('../scripts/run-gates');
const surface = require('../src/shared/tracked-surface');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'gates.json'), 'utf8'));

// A registry of two inert legs: the point of these cases is the WRAPPER, not
// the children, so the children must not touch the tree.
function stubRegistry() {
  return { entries: [
    { name: 'a', command: 'cA', tier: 'confirmatory', source_adr: 'x', order: 100, requires: [] },
    { name: 'b', command: 'cB', tier: 'confirmatory', source_adr: 'x', order: 200, requires: [] },
  ] };
}

describe('ADR-0093 D-4 the tracked-surface wrapper', () => {
  test('a run that mutates nothing passes and says so', () => {
    const res = gates.runGates(stubRegistry(), { exec: () => ({ code: 0, output: '' }) });
    const row = res.results.find((r) => r.name === '- tracked-surface');
    expect(row.status).toBe('pass');
    expect(row.tier).toBe('confirmatory');
    expect(res.exitCode).toBe(0);
    expect(res.trackedSurface).toEqual([]);
  });

  test('a pre-existing dirty surface is the zero point, not a failure', () => {
    // The declaration is "this run mutated no tracked file", NOT "the tree is
    // clean". A dirty entry state must neither be penalised nor swallowed -
    // that is what keeps this compatible with never discarding blindly. Proven
    // with an injected snapshot over a fixed path list, so the case does not
    // depend on this working tree's own state.
    const res = gates.runGates(stubRegistry(), { exec: () => ({ code: 0, output: '' }), trackedSurface: false });
    expect(res.results.some((r) => r.name === '- tracked-surface')).toBe(false);

    const fake = surface.trackedSurface({
      root: 'unused',
      list: () => ['a.txt'],
      hash: () => new Map([['a.txt', 'DIRTY-ON-ENTRY']]),
    });
    fake.begin();
    expect(fake.checkpoint()).toEqual([]); // still dirty, unchanged -> silent
  });

  test('a leg that writes a tracked file is red, with leg+file attribution', () => {
    // Two-phase: the first checkpoint sees the write, the second does not, so
    // the attribution lands on leg `a` and not on leg `b`.
    const phases = [
      new Map([['a.txt', 'v0']]),
      new Map([['a.txt', 'v1-WRITTEN']]),
      new Map([['a.txt', 'v1-WRITTEN']]),
    ];
    let phase = 0;
    const fake = surface.trackedSurface({ root: 'unused', list: () => ['a.txt'], hash: () => phases[phase++] });
    fake.begin();
    expect(fake.checkpoint()).toEqual(['a.txt']); // leg a mutated it
    expect(fake.checkpoint()).toEqual([]);        // leg b did not
  });

  test('changedPaths names deletions, not just content drift', () => {
    const before = new Map([['a.txt', 'x'], ['b.txt', 'y']]);
    const after = new Map([['a.txt', 'z']]);
    expect(surface.changedPaths(before, after)).toEqual(['a.txt', 'b.txt (left the tracked set)']);
  });

  test('a tracked file deleted from the worktree is a mutation, not a skip', () => {
    // Dropping the absent path would hide exactly the case that matters: a leg
    // that DELETES a tracked file.
    const h = surface.hashTrackedPaths(ROOT, ['definitely-not-a-real-path-xyz']);
    expect(h.get('definitely-not-a-real-path-xyz')).toBe(surface.MISSING);
  });

  test('there is no per-leg exemption channel', () => {
    // The declaration refuses an exemption list outright; the only opt-out is
    // the whole wrapper, and it is explicit. A test that pins "some legs are
    // exempt" would be the hole the ADR closes.
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'run-gates.js'), 'utf8');
    expect(src).toContain('o.trackedSurface === false');
    expect(src).not.toMatch(/surfaceExempt|exemptLegs|allowlist/);
  });
});

describe('ADR-0093 D-3 the g6 replay-log compare form', () => {
  const LOG_REL = path.join('bench', 'research', 'out', 'g6-publish-replay.json');

  test('the default gate path does not write the replay log', () => {
    const before = fs.readFileSync(path.join(ROOT, LOG_REL));
    const r = spawnSync(process.execPath, ['scripts/check-g6-publish.js'], { cwd: ROOT, encoding: 'utf8' });
    const after = fs.readFileSync(path.join(ROOT, LOG_REL));
    expect(Buffer.compare(before, after)).toBe(0); // byte-identical: no write
    // Either it matched (exit 0) or it reported staleness (exit 1) - both are
    // non-mutating. What must never happen is a silent rewrite.
    expect([0, 1]).toContain(r.status);
    if (r.status === 1) expect(r.stderr).toContain('EVIDENCE-STALE');
  }, 180000);

  test('--write-log is the declared mutating path and the usage line names it', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'check-g6-publish.js'), 'utf8');
    expect(src).toContain('--write-log');
    expect(src).toMatch(/Usage: node scripts\/check-g6-publish\.js \[--freeze\] \[--write-log\]/);
  });

  test('the replay log is still registered as a mechanism output', () => {
    // The log is a fact source (build-round-facts.js:62 reads it), so it stays
    // in the tree under judgement - which is why redirecting the write to an
    // ignored path was rejected.
    const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'governance', 'surface-taxonomy.json'), 'utf8'));
    const files = tax.mechanism_outputs.entries.map((e) => e.file);
    expect(files).toContain('bench/research/out/g6-publish-replay.json');
    expect(fs.readFileSync(path.join(ROOT, 'scripts', 'build-round-facts.js'), 'utf8'))
      .toContain('bench/research/out/g6-publish-replay.json');
  });

  test('buildReplayArtifact is pure - construction does not touch disk', () => {
    const pub = require('../scripts/check-g6-publish.js');
    const out = {
      packed: { file: 'x.tgz', size: 1 },
      count: 20, tolLogit: 1e-12, warnings: [], errors: [],
      replay: { surface_sha256: 'deadbeef', control_rejected: true, detail: { tier_a_equal: 20, items: 20, rel_l2_max: 0, logit_diff_max: 0 } },
    };
    const art = pub.buildReplayArtifact(out);
    expect(art.verdict).toBe('PASS');
    expect(art.tarball).toEqual({ file: 'x.tgz', size: 1 });
    expect(art._doc).toContain('ADR-0093 D-3');
  });
});

describe('ADR-0093 D-3/D-4 registry wiring', () => {
  test('gates.json g6 _doc states the compare form (same-commit ADR guard)', () => {
    // ADR-0093 D-3 requires the registry text to move WITH the script, or the
    // coupling/alignment legs redden on a mismatch - fixing the lesion would
    // redden an unrelated leg.
    const e = registry.entries.find((x) => x.name === 'g6-publish');
    expect(e._doc).toContain('ADR-0093 D-3');
  });

  test('the wrapper is not a gates.json leg', () => {
    // The observation-point argument: a leg is structurally unable to observe
    // the other legs. If a future entry named tracked-surface, the two would be
    // reading the same surface across a window - dual reading (ADR-0083 D-003).
    expect(registry.entries.some((e) => /tracked-surface/.test(e.name))).toBe(false);
  });
});

