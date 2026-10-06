'use strict';
// test/status-inventory.test.js - grill-t37 (ADR-0095, pending docs lane):
// wiring + unit coverage for the derived status-inventory mechanism:
//   src/shared/status-inventory.js  (attribution chain, join key, member
//     normalization, digest, sentinel (de)serialization, expected-red
//     predicate, reason_code_breakdown)
//   src/shared/run-id.js            (run_id triple, CI/local forms)
//   src/shared/per-run-artifacts.js (the one write point)
//   scripts/run-gates.js            (emit integration: inventory + timing
//     artifacts, timeout bucket, declared_reason channel)
//   scripts/check-expected-red.js   (registry shape/freshness, escalation
//     hook shape + evaluation)
//   scripts/check-comment-refs.js   (M-D tokenizer/classifier/resolver seams)
//   scripts/check-status-inventory  (observer-row exclusion, surface filter)

const fs = require('fs');
const os = require('os');
const path = require('path');

const inv = require('../src/shared/status-inventory');
const runid = require('../src/shared/run-id');
const emitLib = require('../src/shared/per-run-artifacts');
const gates = require('../scripts/run-gates');
const er = require('../scripts/check-expected-red');
const cr = require('../scripts/check-comment-refs');
const csi = require('../scripts/check-status-inventory');
const repoExports = require('../src/shared/repo-exports');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 't37-'));
}
const FAKE_RUN = { run_id: 'gates.abc1234.local', judged_surface: 'gates', tree_sha: 'abc1234', runner_ctx: 'local', file_safe: 'gates.abc1234.local' };

// ---- status-inventory: attribution (D-003.3 mutex chain) ------------------
describe('attributeReason mutex chain', () => {
  test('missing[] beats timeout marker (registered-absence is head of chain)', () => {
    expect(inv.attributeReason({ missing: ['bench-corpus'], timedOut: true, status: 'unverifiable' })).toBe('registered-absence');
  });
  test('timeout marker beats the unverifiable residual', () => {
    expect(inv.attributeReason({ timedOut: true, status: 'unverifiable' })).toBe('timeout');
  });
  test('unverifiable without other attribution is the residual instrument-failure', () => {
    expect(inv.attributeReason({ status: 'unverifiable', code: 2, missing: null })).toBe('instrument-failure');
  });
  test('an ordinary fail carries no reason_code', () => {
    expect(inv.attributeReason({ status: 'fail', code: 1 })).toBeNull();
    expect(inv.attributeReason({ status: 'pass', code: 0 })).toBeNull();
  });
});

// ---- join key + member identity (D-002.3, R-B) -----------------------------
describe('join key + member normalization', () => {
  test('gate-leg join key is name-keyed; jest rows carry name+suite+filepath', () => {
    expect(inv.joinKey({ unit_kind: 'gate-leg', name: 'deferred' })).toBe('gate-leg::::::deferred');
    expect(inv.joinKey({ unit_kind: 'jest-test', name: 'n', suite: 's', filepath: 'f.js' }))
      .toBe('jest-test::f.js::s::n');
  });
  test('volatile evidence detail never enters the member view', () => {
    const row = {
      unit_kind: 'gate-leg', name: 'x', command: 'c', exit: 2, status: 'unverifiable',
      judged_surface: 'gates', evidence_ref: '/abs/path', duration_ms: 99,
      reason_code: 'instrument-failure', declared_reason: null, expected_red: { key: 'k' },
    };
    const m = inv.normalizeRow(row);
    expect(m).not.toHaveProperty('exit');
    expect(m).not.toHaveProperty('duration_ms');
    expect(m).not.toHaveProperty('evidence_ref');
    expect(m).not.toHaveProperty('expected_red');
    expect(m).not.toHaveProperty('command');
    expect(m.judged_surface).toBe('gates');
    expect(m.status).toBe('unverifiable');
    expect(m.reason_code).toBe('instrument-failure');
  });
  test('rows_digest is order-insensitive (canonical ordering)', () => {
    const a = [{ unit_kind: 'gate-leg', name: 'b', status: 'fail' }, { unit_kind: 'gate-leg', name: 'a', status: 'fail' }];
    const b = [a[1], a[0]];
    expect(inv.rowsDigest(a)).toBe(inv.rowsDigest(b));
    expect(inv.rowsDigest(a)).toMatch(/^sha256:/);
  });
  test('diffMemberSets reports the symmetric difference, never just a bool', () => {
    const A = [{ unit_kind: 'gate-leg', name: 'x', status: 'fail' }];
    const B = [{ unit_kind: 'gate-leg', name: 'x', status: 'fail' }, { unit_kind: 'gate-leg', name: 'y', status: 'fail' }];
    const d = inv.diffMemberSets(A, B);
    expect(d.equal).toBe(false);
    expect(d.only_b.map(function (r) { return r.join_key; })).toEqual(['gate-leg::::::y']);
    expect(inv.diffMemberSets(A, A).equal).toBe(true);
  });
});

// ---- sentinel block (D-005.3/.4) ------------------------------------------
describe('sentinel block', () => {
  const rows = [{ unit_kind: 'gate-leg', name: 'post-land-sentinel', status: 'fail', judged_surface: 'gates' }];
  test('render + extract roundtrip; digest self-consistent', () => {
    const text = inv.renderSentinel({ run_id: 'gates.aaa.ctx', emitted_at: '2026-10-05T00:00:00Z', rows: rows });
    expect(text).toContain(inv.SENTINEL);
    const parsed = inv.extractSentinels('prose\n' + text + 'prose');
    expect(parsed.errors).toEqual([]);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].block.run_id).toBe('gates.aaa.ctx');
    expect(inv.sentinelSelfConsistent(parsed.blocks[0].block)).toBe(true);
  });
  test('malformed blocks are errors, never skipped silently', () => {
    const bad = inv.SENTINEL + '\n```json\n{not json\n```\n';
    const parsed = inv.extractSentinels(bad);
    expect(parsed.blocks).toHaveLength(0);
    expect(parsed.errors.length).toBe(1);
    expect(parsed.errors[0]).toContain('not valid JSON');
  });
  test('a hand-edited snapshot fails self-consistency', () => {
    const text = inv.renderSentinel({ run_id: 'r', emitted_at: 't', rows: rows });
    const parsed = inv.extractSentinels(text);
    const block = parsed.blocks[0].block;
    block.rows.push({ join_key: 'forged::::row', unit_kind: 'gate-leg', status: 'fail' });
    expect(inv.sentinelSelfConsistent(block)).toBe(false);
  });

  // grill-t38 D-004.1 (T-3): the anchor field is additive v1.1 - it rides
  // RIGHT AFTER run_id, and its absence leaves the block byte-identical to the
  // legacy (pre-anchor) form.
  test('anchor rides right after run_id; absence is byte-identical to legacy', () => {
    const anchor = { tree_sha: 'abc1234', ref_context: 'lane-tip', mode: 'tree-internal read' };
    const text = inv.renderSentinel({ run_id: 'gates.aaa.ctx', emitted_at: 't', rows: rows, anchor: anchor });
    const parsed = inv.extractSentinels(text);
    expect(parsed.errors).toEqual([]);
    const block = parsed.blocks[0].block;
    expect(Object.keys(block)).toEqual(['run_id', 'anchor', 'emitted_at', 'normalized_join_key_version', 'rows', 'rows_digest']);
    expect(block.anchor).toEqual(anchor);
    // legacy form (no anchor) is exactly the pre-anchor renderer's bytes
    const legacy = inv.renderSentinel({ run_id: 'gates.aaa.ctx', emitted_at: 't', rows: rows });
    const expected = inv.SENTINEL + '\n```json\n' + JSON.stringify({
      run_id: 'gates.aaa.ctx', emitted_at: 't', normalized_join_key_version: 'v1',
      rows: inv.normalizeRows(rows), rows_digest: inv.rowsDigest(rows),
    }, null, 2) + '\n```\n';
    expect(legacy).toBe(expected);
  });

  // grill-t38 D-004.4 (T-3): ref_context is the observation-context record,
  // classified into the closed enum. Most specific member wins.
  test('classifyRefContext maps probed facts to the closed enum', () => {
    const ws = inv.WORKSPACE_REF;
    expect(inv.classifyRefContext({})).toBe('live-set'); // no HEAD -> honest fallback
    expect(inv.classifyRefContext({ head_sha: 'a', origin_main_sha: 'a' })).toBe('origin/main');
    expect(inv.classifyRefContext({ head_sha: 'a', head_ref: ws, workspace_ref: ws })).toBe('workspace-merge');
    expect(inv.classifyRefContext({ head_sha: 'a', head_ref: 'refs/heads/lane', live_refs: ['refs/heads/lane'] })).toBe('lane-tip');
    expect(inv.classifyRefContext({ head_sha: 'a', merge_base_sha: 'a' })).toBe('merge-base');
    expect(inv.classifyRefContext({ head_sha: 'a' })).toBe('live-set');
    // origin/main outranks workspace-merge (most specific first)
    expect(inv.classifyRefContext({ head_sha: 'a', origin_main_sha: 'a', head_ref: ws, workspace_ref: ws })).toBe('origin/main');
  });
});

// ---- expected-red predicate (D-001.2: registered /\ unexpired /\ in-set) ---
describe('isExpectedRed three conjuncts', () => {
  const row = { unit_kind: 'gate-leg', name: 'l', status: 'fail' };
  const reg = {
    codes_enum: ['repair-in-flight'], entries: [
      { key: 'gate-leg::::::l', reason_code: 'repair-in-flight', expires_at: '2099-01-01', approved_by: 'ledger D-x', registered_at: '2026-10-05' },
    ]
  };
  test('registered + unexpired + in-set certifies', () => {
    expect(inv.isExpectedRed(row, reg, '2026-10-05')).toBeTruthy();
  });
  test('expired never certifies', () => {
    const r2 = Object.assign({}, reg, { entries: [Object.assign({}, reg.entries[0], { expires_at: '2020-01-01' })] });
    expect(inv.isExpectedRed(row, r2, '2026-10-05')).toBeNull();
  });
  test('out-of-set code never certifies', () => {
    const r2 = Object.assign({}, reg, { entries: [Object.assign({}, reg.entries[0], { reason_code: 'invented' })] });
    expect(inv.isExpectedRed(row, r2, '2026-10-05')).toBeNull();
  });
  test('unregistered key never certifies', () => {
    expect(inv.isExpectedRed({ unit_kind: 'gate-leg', name: 'other', status: 'fail' }, reg, '2026-10-05')).toBeNull();
  });
});

test('reasonCodeBreakdown counts only rows carrying a code', () => {
  const b = inv.reasonCodeBreakdown([
    { reason_code: 'timeout' }, { reason_code: 'timeout' }, { reason_code: 'registered-absence' }, { reason_code: null }, {},
  ]);
  expect(b).toEqual({ timeout: 2, 'registered-absence': 1 });
});

// ---- run_id (D-005.2) ------------------------------------------------------
describe('run_id triple', () => {
  test('CI form: RUN_ID.ATTEMPT.JOB', () => {
    const r = runid.buildRunId({
      surface: 'gates', root: '/x',
      env: { GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: 'R1', GITHUB_RUN_ATTEMPT: '2', GITHUB_JOB: 'gate-all' },
      gitFn: function () { return 'deadbeef'; },
    });
    expect(r.run_id).toBe('gates.deadbeef.R1.2.gate-all');
  });
  test('local form: HEAD.{dirty|clean}.{start-iso}', () => {
    const r = runid.buildRunId({
      surface: 'test', root: '/x', env: {},
      startedAt: new Date('2026-10-05T01:02:03.004Z'),
      gitFn: function (root, args) { return args[0] === 'status' ? ' M f\n' : 'cafef00d'; },
    });
    expect(r.run_id).toContain('test.cafef00d.HEAD.dirty.2026-10-05T01-02-03');
  });
  test('no HEAD -> no-head (caller owns honesty)', () => {
    const r = runid.buildRunId({
      surface: 'gates', root: '/x', env: {},
      gitFn: function () { throw new Error('no repo'); },
    });
    expect(r.tree_sha).toBe('no-head');
    expect(r.runner_ctx).toContain('dirty');
  });
});

// ---- per-run artifacts ------------------------------------------------------
test('emitArtifact writes <prefix>.<file_safe run_id>.json under subdir', () => {
  const dir = tmpdir();
  const f = emitLib.emitArtifact({
    dir: dir, subdir: 'status-inventory', prefix: 'status-inventory',
    runId: FAKE_RUN, payload: { schema: 'status-inventory v1', rows: [] },
  });
  expect(path.basename(f)).toBe('status-inventory.gates.abc1234.local.json');
  expect(JSON.parse(fs.readFileSync(f, 'utf8')).schema).toBe('status-inventory v1');
  const newest = emitLib.newestArtifact(dir, 'status-inventory', 'status-inventory', 'gates');
  expect(newest.artifact.schema).toBe('status-inventory v1');
});

// ---- run-gates emit integration ---------------------------------------------
describe('run-gates emission', () => {
  const reg = {
    entries: [
      { name: 'a-ok', command: 'cA', tier: 'confirmatory', source_adr: 'x', order: 1 },
      { name: 'b-red', command: 'cB', tier: 'confirmatory', source_adr: 'x', order: 2 },
      { name: 'c-unver', command: 'cC', tier: 'confirmatory', source_adr: 'x', order: 3 },
    ]
  };
  test('non-green rows land in the emitted inventory; greens do not', () => {
    const dir = tmpdir();
    const res = gates.runGates(reg, {
      exec: function (c) { return { code: c === 'cB' ? 1 : c === 'cC' ? 2 : 0, output: '' }; },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    expect(res.exitCode).toBe(1);
    const file = path.join(dir, 'status-inventory', 'status-inventory.' + FAKE_RUN.file_safe + '.json');
    const art = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(art.complete).toBe(true);
    expect(art.run_id).toBe('gates.abc1234.local');
    const kinds = art.rows.map(function (r) { return r.name; }).sort();
    expect(kinds).toEqual(['b-red', 'c-unver']);
    expect(art.rows.find(function (r) { return r.name === 'c-unver'; }).reason_code).toBe('instrument-failure');
    expect(art.closeout.reason_code_breakdown).toEqual({ 'instrument-failure': 1 });
    expect(art.closeout.counts).toEqual({ fail: 1, unverifiable: 1 });
  });
  // grill-t38 D-004.9 (T-3): the anchor rides the emitted artifact payload.
  test('anchor rides the emitted artifact payload', () => {
    const dir = tmpdir();
    const anchor = { tree_sha: 'abc1234', ref_context: 'lane-tip', mode: 'working-tree read' };
    gates.runGates(reg, {
      exec: function () { return { code: 0, output: '' }; },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false, anchor: anchor,
    });
    const art = JSON.parse(fs.readFileSync(path.join(dir, 'status-inventory', 'status-inventory.' + FAKE_RUN.file_safe + '.json'), 'utf8'));
    expect(art.anchor).toEqual(anchor);
  });
  // grill-t38 D-004.9 (T-3): the derivation mirrors the run_id tree segment and
  // lands in the closed enums (exercises the real git probe).
  test('deriveAnchor mirrors the run_id tree segment; mode/ref_context are closed-enum', () => {
    const a = gates.deriveAnchor(process.cwd(), FAKE_RUN);
    expect(a.tree_sha).toBe(FAKE_RUN.tree_sha);
    expect(inv.REF_CONTEXT).toContain(a.ref_context);
    expect(inv.MODES).toContain(a.mode);
  });
  test('timeout bucket: timedOut leg -> unverifiable row with reason_code timeout', () => {
    const dir = tmpdir();
    const regT = { entries: [{ name: 'slow', command: 'cS', tier: 'confirmatory', source_adr: 'x', order: 1, timeout_s: 5 }] };
    const res = gates.runGates(regT, {
      exec: function (c, eo) {
        expect(eo.timeout_ms).toBe(5000);
        return { code: 1, output: '', timedOut: true };
      },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    const r = res.results[0];
    expect(r.status).toBe('unverifiable');
    expect(r.timedOut).toBe(true);
    const art = JSON.parse(fs.readFileSync(path.join(dir, 'status-inventory', 'status-inventory.' + FAKE_RUN.file_safe + '.json'), 'utf8'));
    expect(art.rows[0].reason_code).toBe('timeout');
    // a timeout is unverifiable, never a leg verdict -> non-blocking
    expect(res.exitCode).toBe(0);
  });
  test('declared_reason channel: in-set rides the row; out-of-set is a registry violation', () => {
    const dir = tmpdir();
    const res = gates.runGates(reg, {
      exec: function (c) {
        if (c === 'cB') return { code: 2, output: '::jiahao declared_reason=instrument-failure\n::error x' };
        if (c === 'cC') return { code: 0, output: '::jiahao declared_reason=bogus-code\n' };
        return { code: 0, output: '' };
      },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    const b = res.results.find(function (r) { return r.name === 'b-red'; });
    expect(b.declared_reason).toBe('instrument-failure');
    expect(b.status).toBe('unverifiable');
    const c = res.results.find(function (r) { return r.name === 'c-unver'; });
    expect(c.status).toBe('fail'); // out-of-set declared_reason = registry violation even on a green child
    expect(c.output).toContain('DECLARED-REASON violation');
    expect(c.declared_reason).toBeNull();
  });
  test('missing capability -> registered-absence wins over everything', () => {
    const dir = tmpdir();
    const res = gates.runGates(reg, {
      exec: function () { return { code: 0, output: '' }; },
      probe: function (c) { return c !== 'bench-corpus'; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    const reg2 = { entries: [{ name: 'needs-corpus', command: 'x', tier: 'confirmatory', source_adr: 'x', order: 1, requires: ['bench-corpus'] }] };
    const res2 = gates.runGates(reg2, {
      exec: function () { return { code: 0, output: '' }; },
      probe: function () { return false; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    const art = JSON.parse(fs.readFileSync(path.join(dir, 'status-inventory', 'status-inventory.' + FAKE_RUN.file_safe + '.json'), 'utf8'));
    expect(art.rows[0].reason_code).toBe('registered-absence');
    expect(res2.results[0].status).toBe('unverifiable');
  });
  test('leg-timing artifact: p50/p95 emitted, never gated', () => {
    const dir = tmpdir();
    gates.runGates(reg, {
      exec: function () { return { code: 0, output: '' }; },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    const art = JSON.parse(fs.readFileSync(path.join(dir, 'leg-timing', 'leg-timing.' + FAKE_RUN.file_safe + '.json'), 'utf8'));
    expect(art.schema).toBe('leg-timing v1');
    expect(art.summary.leg_count).toBe(3);
    expect(typeof art.summary.p50_ms).toBe('number');
    expect(art.note).toContain('EMIT ONLY');
  });
});

// ---- check-expected-red ------------------------------------------------------
describe('expected-red registry guard', () => {
  const good = { schema_version: 1, _doc: 'x'.repeat(60), codes_enum: ['repair-in-flight'], entries: [] };
  test('shape: out-of-set code is a registry violation', () => {
    const r = Object.assign({}, good, { entries: [{ key: 'gate-leg::::::x', reason_code: 'bogus', expires_at: '2099-01-01', approved_by: 'owner row ptr here', registered_at: '2026-01-01' }] });
    expect(er.validateShape(r).join('\n')).toContain('outside codes_enum');
  });
  test('shape: undeadline expected-red fails', () => {
    const r = Object.assign({}, good, { entries: [{ key: 'gate-leg::::::x', reason_code: 'repair-in-flight', approved_by: 'owner row ptr here', registered_at: '2026-01-01' }] });
    expect(er.validateShape(r).join('\n')).toContain('expires_at');
  });
  test('freshness: expired entries are STALE fail-closed', () => {
    const r = Object.assign({}, good, { entries: [{ key: 'gate-leg::::::x', reason_code: 'repair-in-flight', expires_at: '2020-01-01', approved_by: 'owner row ptr here', registered_at: '2019-01-01' }] });
    expect(er.validateShape(r)).toEqual([]);
    expect(er.validateFreshness(r, '2026-10-05').errors.join('\n')).toContain('STALE');
  });
  test('hook shape: per-row N on deferred rows (D-003.5)', () => {
    const bad = { entries: [{ id: 'defer-9999', escalation_hook: { reason_code: 'not-a-code', key_prefix: 'gate-leg', consecutive_runs: 1 } }] };
    const errs = er.validateHooks(bad);
    expect(errs.join('\n')).toContain('outside the C-1 closed set');
    expect(errs.join('\n')).toContain('>= 2');
  });
  test('evaluateHooks: N consecutive matching runs fire the trigger', () => {
    const dir = tmpdir();
    const mk = function (name, rows) {
      fs.writeFileSync(path.join(dir, name), JSON.stringify({ run_id: 'r', tree_sha: 't', judged_surface: 'gates', rows: rows }));
    };
    mk('status-inventory.gates.aaa.json', [{ unit_kind: 'gate-leg', name: 'x', judged_surface: 'gates', status: 'unverifiable', reason_code: 'timeout' }]);
    // mtimes: make aaa newest-first ordering deterministic
    const now = Date.now();
    fs.utimesSync(path.join(dir, 'status-inventory.gates.aaa.json'), new Date(now), new Date(now));
    mk('status-inventory.gates.bbb.json', [{ unit_kind: 'gate-leg', name: 'x', judged_surface: 'gates', status: 'unverifiable', reason_code: 'timeout' }]);
    fs.utimesSync(path.join(dir, 'status-inventory.gates.bbb.json'), new Date(now - 1000), new Date(now - 1000));
    mk('status-inventory.gates.ccc.json', [{ unit_kind: 'gate-leg', name: 'x', judged_surface: 'gates', status: 'fail' }]);
    fs.utimesSync(path.join(dir, 'status-inventory.gates.ccc.json'), new Date(now - 2000), new Date(now - 2000));
    const reg = { entries: [{ id: 'defer-0001', escalation_hook: { reason_code: 'timeout', key_prefix: 'gate-leg::::::x', consecutive_runs: 2 } }] };
    const fired = er.evaluateHooks(reg, dir);
    expect(fired.length).toBe(1);
    expect(fired[0]).toContain('FIRED');
    // a broken streak does not fire
    const reg2 = { entries: [{ id: 'defer-0001', escalation_hook: { reason_code: 'timeout', key_prefix: 'gate-leg::::::x', consecutive_runs: 3 } }] };
    expect(er.evaluateHooks(reg2, dir).length).toBe(0);
  });
});

// ---- check-comment-refs (M-D) -------------------------------------------------
describe('M-D comment-reference gate seams', () => {
  test('tokenizer: strings/regex/templates skipped; JSDoc excluded; // inside :// kept out', () => {
    const text = [
      "const u = 'http://x/`span`'; // real `decl` comment",
      '/* block `okSpan` */',
      '/** jsdoc `deadChannel` not collected */',
      'const re = /\\/\\/not-a-comment/;',
      'const t = `tpl ${x} not-a-span`;',
    ].join('\n');
    const regions = cr.commentRegions(text);
    const spans = regions.reduce(function (acc, r) { return acc.concat(cr.spansIn(r.text, r.line)); }, []);
    const names = spans.map(function (s) { return s.span; });
    expect(names).toContain('decl');
    expect(names).toContain('okSpan');
    expect(names).not.toContain('deadChannel');
    expect(names).not.toContain('span'); // the one inside a string literal
  });
  test('classify: shape rules', () => {
    expect(cr.classify('ADR-0043').cls).toBe('adr');
    expect(cr.classify('docs/adr/0092-x.md').cls).toBe('path');
    expect(cr.classify('scripts/**').cls).toBe('pattern');
    expect(cr.classify('https://x/y').cls).toBe('external');
    expect(cr.classify('D:\\tmp\\f').cls).toBe('external');
    expect(cr.classify('validateShape').cls).toBe('symbol');
    expect(cr.classify('a multi word span').cls).toBe('prose');
    expect(cr.classify("'quoted-name'").cls === 'symbol' || cr.classify("'quoted-name'").cls === 'prose').toBe(true);
  });
  test('symbolResolves: same-file + import + unique-export; ambiguity never guessed', () => {
    const decl = new Set(['localFn']);
    const imp = new Set(['importedFn']);
    const table = { uniqueFn: ['src/a.js'], dupFn: ['src/a.js', 'src/b.js'] };
    expect(cr.symbolResolves('localFn', decl, imp, table).ok).toBe(true);
    expect(cr.symbolResolves('importedFn', decl, imp, table).ok).toBe(true);
    expect(cr.symbolResolves('uniqueFn', decl, imp, table).ok).toBe(true);
    const dup = cr.symbolResolves('dupFn', decl, imp, table);
    expect(dup.ok).toBe(false);
    expect(dup.why).toContain('ambiguous');
    expect(cr.symbolResolves('ghostFn', decl, imp, table).ok).toBe(false);
    // dotted: the head binding carries resolution
    expect(cr.symbolResolves('localFn.method', decl, imp, table).ok).toBe(true);
  });
  test('export table: module.exports object keys + member assigns + ident export', () => {
    const names = repoExports.fileExportNames([
      'module.exports = { a, b: c, \'d-e\': f };',
      'exports.g = 1; module.exports.h = 2;',
      'const other = {}; module.exports = Ident;',
    ].join('\n'));
    // note: the last assignment OVERWRITES semantically but the table is a
    // name-presence set - both shapes' names count as exported.
    for (const n of ['a', 'b', 'd-e', 'g', 'h', 'Ident']) expect(names.has(n)).toBe(true);
  });
});

// ---- check-status-inventory seams ---------------------------------------------
describe('assert-leg seams', () => {
  test('observer rows excluded: the assert leg cannot observe itself mid-run', () => {
    expect(csi.isObserverRow({ unit_kind: 'gate-leg', name: 'status-inventory' })).toBe(true);
    expect(csi.isObserverRow({ unit_kind: 'gate-leg', name: '- tracked-surface' })).toBe(true);
    expect(csi.isObserverRow({ unit_kind: 'gate-leg', name: 'deferred' })).toBe(false);
    expect(csi.isObserverRow({ unit_kind: 'jest-test', name: 'status-inventory' })).toBe(false);
  });
  test('rowsForSurface filters by judged_surface and drops observers', () => {
    const rows = [
      { unit_kind: 'gate-leg', name: 'a', judged_surface: 'gates' },
      { unit_kind: 'gate-leg', name: 'status-inventory', judged_surface: 'gates' },
      { unit_kind: 'jest-test', name: 't', suite: 's', filepath: 'f', judged_surface: 'test' },
    ];
    expect(csi.rowsForSurface(rows, 'gates').length).toBe(1);
    expect(csi.rowsForSurface(rows, 'test').length).toBe(1);
  });
});

// ---- grill-t38 T-4: assertion leg under anchor semantics --------------------
// D-002.1 double-assertion separation, D-004.2 disambiguation three rules,
// D-002.5 prefer-HEAD abolition + drift surface, D-002.6 carrier degradation,
// D-002.7 restack, D-002.8 freshness red is verdict-level (not C-1).
describe('assert-leg anchor semantics (T-4)', () => {
  const TREE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const HEAD = 'cccccccccccccccccccccccccccccccccccccccc';
  const PARENT = 'dddddddddddddddddddddddddddddddddddddddd';
  const MUT = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const RUN = 'gates.' + TREE.slice(0, 7) + '.local';

  // (a) D-004.2 rule 2: anchor.tree_sha !== run_id tree segment -> independent red.
  test('(a) anchor/run_id tree disagreement is an independent red', () => {
    const cls = csi.classifyBlockAnchor(
      { run_id: RUN, anchor: { tree_sha: OTHER, ref_context: 'lane-tip', mode: 'tree-internal read' } },
      { anchorRegMs: 1000, blockMs: 2000 });
    expect(cls.kind).toBe('mismatch');
    expect(cls.reason).toBe('anchor_run_id_tree_mismatch');
    expect(cls.reason).toBe(csi.ANCHOR_REASONS.MISMATCH);
  });

  // (b) D-002.5: the assertion domain selects by the block's OWN run_id; a
  // HEAD-tree artifact with a DIFFERENT member set must not be picked.
  test('(b) own-run artifact selected even when a HEAD-tree artifact differs', () => {
    const headArt = { file: 'head.json', artifact: { run_id: 'gates.head.local', tree_sha: TREE, complete: true, rows: [{ unit_kind: 'gate-leg', name: 'wrong', judged_surface: 'gates' }] } };
    const ownArt = { file: 'own.json', artifact: { run_id: 'gates.own.local', tree_sha: OTHER, complete: true, rows: [{ unit_kind: 'gate-leg', name: 'right', judged_surface: 'gates' }] } };
    expect(csi.pickByRunId('gates', 'gates.own.local', { artifacts: [headArt, ownArt] }).file).toBe('own.json');
    // the legacy helper still prefers HEAD (retained for back-compat, off the assertion path)
    expect(csi.pickDerivation('gates', OTHER, TREE, { artifacts: [headArt, ownArt] }).file).toBe('head.json');
    // a partial (complete:false) own-run artifact is never truth
    const partial = { file: 'p.json', artifact: { run_id: 'gates.own.local', tree_sha: OTHER, complete: false, rows: [] } };
    expect(csi.pickByRunId('gates', 'gates.own.local', { artifacts: [partial] })).toBeNull();
  });

  // (c) D-002.5: same-tree OTHER-run member difference is a yellow drift
  // disclosure, never red.
  test('(c) same-tree other-run drift is a yellow disclosure, not a red', () => {
    const claimRows = [{ unit_kind: 'gate-leg', name: 'x', status: 'fail', judged_surface: 'gates' }];
    const other = { file: 'o.json', artifact: { run_id: 'gates.other.local', tree_sha: TREE, complete: true, rows: [{ unit_kind: 'gate-leg', name: 'y', status: 'fail', judged_surface: 'gates' }] } };
    const d = csi.driftDisclosure('gates', TREE, 'gates.own.local', claimRows, { artifacts: [other] });
    expect(d).not.toBeNull();
    expect(d.severity).toBe('warning');
    expect(d.diff.equal).toBe(false);
    // the block's OWN artifact is never drift against itself
    const own = { file: 'own.json', artifact: { run_id: 'gates.own.local', tree_sha: TREE, complete: true, rows: [] } };
    expect(csi.driftDisclosure('gates', TREE, 'gates.own.local', claimRows, { artifacts: [own] })).toBeNull();
    // agreeing member sets are not drift
    const agree = { file: 'a.json', artifact: { run_id: 'gates.other.local', tree_sha: TREE, complete: true, rows: claimRows } };
    expect(csi.driftDisclosure('gates', TREE, 'gates.own.local', claimRows, { artifacts: [agree] })).toBeNull();
  });

  // (d) D-004.2 rule 3: post-registration block lacking anchor -> malformed red.
  test('(d) post-registration block missing anchor is malformed', () => {
    const cls = csi.classifyBlockAnchor({ run_id: RUN }, { anchorRegMs: 1000, blockMs: 2000 });
    expect(cls.kind).toBe('malformed');
    expect(cls.reason).toBe('anchor_missing_post_registration');
  });

  // (e) D-004.2 rule 3: pre-registration block (or bootstrap, no ADR-0096) ->
  // legacy run_id path + warning.
  test('(e) pre-registration / bootstrap block is legacy', () => {
    const pre = csi.classifyBlockAnchor({ run_id: RUN }, { anchorRegMs: 1000, blockMs: 500 });
    expect(pre.kind).toBe('legacy');
    expect(pre.treeSha).toBe(TREE.slice(0, 7));
    const bootstrap = csi.classifyBlockAnchor({ run_id: RUN }, { anchorRegMs: 0, blockMs: 99999 });
    expect(bootstrap.kind).toBe('legacy');
  });

  // (f) D-002.1/.5: freshness red when a claim mutation sits inside
  // (anchor, carrier.parent]. Injected git seam, no real repo.
  test('(f) a claim mutation inside the interval is a freshness red', () => {
    const g = (args) => {
      if (args[0] === 'log' && args.indexOf('--') !== -1) return PARENT; // carrier lookup
      if (args[0] === 'log' && args.indexOf('--format=%H') !== -1) return MUT; // interval enumeration
      if (args[0] === 'log' && args.indexOf('--format=%ct') !== -1) return '1000'; // lastClaimMutation date
      if (args[0] === 'rev-parse' && args[1] === '--verify') return PARENT;
      if (args[0] === 'show') return '.scratch/grill-t38/reports/x.md\n';
      throw new Error('unexpected git ' + args.join(' '));
    };
    const gb = (args) => {
      if (args[0] === 'cat-file') return true; // anchor resolvable
      if (args[0] === 'merge-base') return true; // anchor is an ancestor
      throw new Error('unexpected gitBool ' + args.join(' '));
    };
    const r = csi.freshnessAssertion(TREE, 'reports/x.md', { git: g, gitBool: gb, head: HEAD });
    expect(r.red).toBe(true);
    expect(r.reason).toBe('claim_mutation_in_interval');
    expect(r.reason).toBe(csi.FRESHNESS_REASONS.CLAIM_MUTATION);
  });

  test('freshness: unresolvable anchor is yellow; undetermined carrier degrades', () => {
    const g = (args) => {
      if (args[0] === 'log' && args.indexOf('--') !== -1) return ''; // carrier undetermined
      if (args[0] === 'log' && args.indexOf('--format=%H') !== -1) return ''; // empty interval
      throw new Error('unexpected git ' + args.join(' '));
    };
    const unresolvable = csi.freshnessAssertion(TREE, 'reports/x.md', { git: g, gitBool: () => false, head: HEAD });
    expect(unresolvable.red).toBe(false);
    expect(unresolvable.yellow).toBe('anchor_unresolvable');
    const degraded = csi.freshnessAssertion(TREE, 'reports/x.md', { git: g, gitBool: () => true, head: HEAD });
    expect(degraded.red).toBe(false);
    expect(degraded.degraded).toBe(true);
  });

  test('freshness: a non-ancestral anchor is a red', () => {
    const g = (args) => {
      if (args[0] === 'log' && args.indexOf('--') !== -1) return PARENT;
      if (args[0] === 'rev-parse' && args[1] === '--verify') return PARENT;
      throw new Error('unexpected git ' + args.join(' '));
    };
    const gb = (args) => {
      if (args[0] === 'cat-file') return true;
      if (args[0] === 'merge-base') return false; // not an ancestor
      throw new Error('unexpected gitBool ' + args.join(' '));
    };
    const r = csi.freshnessAssertion(TREE, 'reports/x.md', { git: g, gitBool: gb, head: HEAD });
    expect(r.red).toBe(true);
    expect(r.reason).toBe('anchor_not_ancestor_of_carrier');
  });

  // D-002.8: the freshness red is VERDICT-level, never a C-1 row-level code.
  test('freshness reasons never enter the C-1 closed set', () => {
    for (const code of Object.keys(csi.FRESHNESS_REASONS).map((k) => csi.FRESHNESS_REASONS[k])) {
      expect(inv.REASON_CODES).not.toContain(code);
    }
  });
});

// ---- jest-junit-lite reporter contract (T-11 M1) -----------------------------
// The pre-t37 reporter read s.assertionResults - absent on jest 29 TestResult
// (the AssertionResult array lives at s.testResults) - so the shipped
// junit.xml carried zero <testcase> rows for every run and member-level
// extraction silently degraded to suite attrs. This locks the real shape.
describe('jest-junit-lite reporter contract', () => {
  const Reporter = require('../scripts/jest-junit-lite');
  const os = require('os');

  function fakeResults(testFilePath, assertions, failureMessage) {
    return {
      numTotalTests: assertions.length,
      numFailedTests: assertions.filter(a => a.status === 'failed').length,
      numPendingTests: assertions.filter(a => a.status === 'pending').length,
      testResults: [{
        testFilePath,
        numFailingTests: assertions.filter(a => a.status === 'failed').length,
        failureMessage: failureMessage || '',
        testResults: assertions,
      }],
    };
  }

  test('AssertionResult array is read from TestResult.testResults, not assertionResults', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jl-'));
    const junitPath = path.join(dir, 'junit.xml');
    const casesPath = path.join(dir, 'cases.json');
    process.env.JIAHAO_JUNIT_OUTPUT = junitPath;
    process.env.JIAHAO_JEST_CASES_OUTPUT = casesPath;
    try {
      new Reporter().onRunComplete(null, fakeResults(path.join(process.cwd(), 'test', 'x.test.js'), [
        { title: 'passes', status: 'passed', ancestorTitles: ['s1'], duration: 3 },
        { title: 'fails', status: 'failed', ancestorTitles: ['s1'], duration: 5, failureMessages: ['boom'] },
        { title: 'skips', status: 'pending', ancestorTitles: ['s1', 'nested'], duration: 0 },
      ]));
      const xml = fs.readFileSync(junitPath, 'utf8');
      expect((xml.match(/<testcase /g) || []).length).toBe(3);
      expect(xml).toContain('<failure message="boom">');
      expect(xml).toContain('<skipped/>');
      expect(xml).toContain('tests="3" failures="1" skipped="1"');
      const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
      const failed = cases.cases.filter(c => c.status === 'failed');
      expect(failed.length).toBe(1);
      // join key: name = leaf title, suite = describe chain, filepath = rel
      expect(failed[0].name).toBe('fails');
      expect(failed[0].suite).toBe('s1');
      expect(failed[0].filepath).toBe('test/x.test.js');
      expect(cases.totals).toEqual({ tests: 3, failures: 1, pending: 1 });
    } finally {
      delete process.env.JIAHAO_JUNIT_OUTPUT;
      delete process.env.JIAHAO_JEST_CASES_OUTPUT;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('suite collection failure (no assertions + failureMessage) emits a suite-failed row', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jl-'));
    process.env.JIAHAO_JUNIT_OUTPUT = path.join(dir, 'junit.xml');
    process.env.JIAHAO_JEST_CASES_OUTPUT = path.join(dir, 'cases.json');
    try {
      new Reporter().onRunComplete(null, fakeResults(path.join(process.cwd(), 'test', 'broken.test.js'), [], 'Cannot find module x'));
      const cases = JSON.parse(fs.readFileSync(path.join(dir, 'cases.json'), 'utf8'));
      expect(cases.cases.length).toBe(1);
      expect(cases.cases[0].status).toBe('suite-failed');
      expect(cases.cases[0].filepath).toBe('test/broken.test.js');
      const xml = fs.readFileSync(path.join(dir, 'junit.xml'), 'utf8');
      expect(xml).toContain('failures="0"'); // collection failure lives in failureMessage, not numFailingTests
      expect((xml.match(/<testcase /g) || []).length).toBe(0);
    } finally {
      delete process.env.JIAHAO_JUNIT_OUTPUT;
      delete process.env.JIAHAO_JEST_CASES_OUTPUT;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---- dirty-tree re-derivation semantics (T-11 M5) ------------------------------
// The dirty/clean flag lives in runner_ctx; tree_sha is the HEAD commit, so a
// dirty worktree and a clean tree derive the same anchor. Reconciliation is
// member-level over content, never run_id-equal.
describe('dirty-tree re-derivation', () => {
  const HEX = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const OLD = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  test('dirty worktree keeps HEAD tree_sha; only runner_ctx flags the state', () => {
    const gitFn = (root, args) => {
      if (args[0] === 'rev-parse') return HEX;
      if (args[0] === 'status') return ' M dirty-file\n';
      throw new Error('unexpected git call ' + args.join(' '));
    };
    const a = runid.buildRunId({ surface: 'gates', root: 'x', env: {}, startedAt: new Date('2026-10-05T00:00:00Z'), gitFn });
    expect(a.tree_sha).toBe(HEX);
    expect(a.runner_ctx).toBe('HEAD.dirty.2026-10-05T00-00-00.000Z');
    const clean = runid.buildRunId({ surface: 'gates', root: 'x', env: {}, startedAt: new Date('2026-10-05T00:00:00Z'), gitFn: (r, g) => g[0] === 'rev-parse' ? HEX : '' });
    expect(clean.runner_ctx).toContain('HEAD.clean.');
    expect(clean.tree_sha).toBe(a.tree_sha); // same anchor across dirty boundary
  });

  test('pickDerivation prefers the HEAD-tree derivation, falls back to the claimed ancestor', () => {
    const headArt = { file: 'h.json', artifact: { tree_sha: HEX, complete: true, rows: [{ unit_kind: 'gate-leg', name: 'x', judged_surface: 'gates' }] } };
    const ancArt = { file: 'a.json', artifact: { tree_sha: OLD, complete: true, rows: [] } };
    const arts = [headArt, ancArt]; // newest-first list order
    expect(csi.pickDerivation('gates', OLD, HEX, { artifacts: arts }).file).toBe('h.json');
    // HEAD-tree derivation gone (rolled back / different branch): the claimed
    // ancestor's own derivation is the fallback truth source
    expect(csi.pickDerivation('gates', OLD, HEX, { artifacts: [ancArt] }).file).toBe('a.json');
    // neither exists -> underivable, surfaces as UNVERIFIABLE never as PASS
    expect(csi.pickDerivation('gates', OLD, HEX, { artifacts: [] })).toBe(null);
  });

  test('member-level compare ignores run_id identity: same members reconcile across dirty boundary', () => {
    const member = { unit_kind: 'gate-leg', name: 'deferred', status: 'fail', judged_surface: 'gates' };
    const claim = inv.normalizeRow(member);
    const truth = inv.normalizeRow(Object.assign({}, member, { duration_ms: 99, evidence_ref: 'different-run' }));
    const diff = inv.diffMemberSets([claim], [truth]);
    expect(diff.equal).toBe(true); // volatile fields never enter the member view
  });
});

// ---- grill-t37 rework pins (audit F-2/F-3/F-4/F-7) ---------------------------
describe('audit rework pins', () => {
  // F-2: an out-of-set declared_reason is OBSERVED output - the timedOut and
  // exit-2 unverifiable early-returns must never swallow the registry
  // violation (D-003.1: out-of-set fails the leg, unconditionally).
  test('F-2: out-of-set declared_reason fails even when the leg exits 2', () => {
    const dir = tmpdir();
    const regX = { entries: [{ name: 'cap-absent', command: 'cX', tier: 'confirmatory', source_adr: 'x', order: 1 }] };
    const res = gates.runGates(regX, {
      exec: function () { return { code: 2, output: '::jiahao declared_reason=bogus-code\n' }; },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    expect(res.results[0].status).toBe('fail');
    expect(res.results[0].output).toContain('DECLARED-REASON violation');
    expect(res.results[0].declared_reason).toBeNull();
    const art = JSON.parse(fs.readFileSync(path.join(dir, 'status-inventory', 'status-inventory.' + FAKE_RUN.file_safe + '.json'), 'utf8'));
    expect(art.rows[0].status).toBe('fail');
    expect(art.rows[0].reason_code).toBeUndefined(); // ordinary fail carries no reason_code
  });

  test('F-2: out-of-set declared_reason fails even when the leg times out', () => {
    const dir = tmpdir();
    const regX = { entries: [{ name: 'slow', command: 'cX', tier: 'confirmatory', source_adr: 'x', order: 1, timeout_s: 5 }] };
    const res = gates.runGates(regX, {
      exec: function () { return { code: 1, output: '::jiahao declared_reason=bogus-code\n', timedOut: true }; },
      probe: function () { return true; },
      emit: { dir: dir }, runId: FAKE_RUN, trackedSurface: false,
    });
    expect(res.results[0].status).toBe('fail');
    expect(res.results[0].timedOut).toBe(true); // the timeout fact stays on the row
    expect(res.results[0].output).toContain('DECLARED-REASON violation');
    expect(res.exitCode).toBe(1);
  });

  // F-3: artifact history interleaves surfaces on mtime; a hook's consecutive
  // streak must be evaluated inside each surface's own sequence.
  test('F-3: escalation streak is per-surface - interleaved artifacts do not break it', () => {
    const dir = tmpdir();
    const now = Date.now();
    const mk = function (name, surface, rows, ms) {
      fs.writeFileSync(path.join(dir, name), JSON.stringify({ run_id: 'r', tree_sha: 't', judged_surface: surface, rows: rows }));
      fs.utimesSync(path.join(dir, name), new Date(ms), new Date(ms));
    };
    const hit = [{ unit_kind: 'gate-leg', name: 'x', judged_surface: 'gates', status: 'unverifiable', reason_code: 'timeout' }];
    mk('status-inventory.gates.a.json', 'gates', hit, now);
    mk('status-inventory.test.m.json', 'test', [], now - 500); // interleaved other-surface run
    mk('status-inventory.gates.b.json', 'gates', hit, now - 1000);
    const reg = { entries: [{ id: 'defer-0001', escalation_hook: { reason_code: 'timeout', key_prefix: 'gate-leg::::::x', consecutive_runs: 2 } }] };
    const fired = er.evaluateHooks(reg, dir);
    expect(fired.length).toBe(1);
    expect(fired[0]).toContain('FIRED');
    // the OTHER surface's streak is evaluated independently: a test-surface
    // hook over jest rows counts test artifacts only
    const hitT = [{ unit_kind: 'jest-test', name: 'y', suite: 's', filepath: 'f', judged_surface: 'test', status: 'fail', reason_code: 'timeout' }];
    mk('status-inventory.test.c.json', 'test', hitT, now - 300);
    mk('status-inventory.test.d.json', 'test', hitT, now - 400);
    mk('status-inventory.gates.e.json', 'gates', [], now - 200); // newest gates run, no rows
    const regT = { entries: [{ id: 'defer-0002', escalation_hook: { reason_code: 'timeout', key_prefix: 'jest-test', consecutive_runs: 2 } }] };
    expect(er.evaluateHooks(regT, dir).length).toBe(1);
  });

  // F-4: a mid-run artifact (complete:false) is a partial inventory, never a
  // derivation truth - selection skips it; a tree whose only artifact is
  // in-flight is underivable.
  const HEXF = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const OLDF = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  test('F-4: pickDerivation never selects a complete:false mid-run artifact', () => {
    const midRun = { file: 'mid.json', artifact: { tree_sha: HEXF, complete: false, rows: [{ unit_kind: 'gate-leg', name: 'partial', judged_surface: 'gates' }] } };
    const done = { file: 'done.json', artifact: { tree_sha: OLDF, complete: true, rows: [] } };
    expect(csi.pickDerivation('gates', OLDF, HEXF, { artifacts: [midRun, done] }).file).toBe('done.json');
    expect(csi.pickDerivation('gates', OLDF, HEXF, { artifacts: [midRun] })).toBe(null);
  });

  // F-7: the marker binds an ADJACENT json fence only; a backticked or prose
  // mention followed by some later ```json block mints no phantom block.
  test('F-7: a backticked prose mention of the marker extracts no block', () => {
    const rows = [{ unit_kind: 'gate-leg', name: 'x', status: 'fail', judged_surface: 'gates' }];
    const real = inv.renderSentinel({ run_id: 'r', emitted_at: 't', rows: rows });
    const prose = 'the marker `<!-- status-inventory v1 -->` in a table cell\n\n```json\n{"unrelated": true}\n```\n\n' + real;
    const parsed = inv.extractSentinels(prose);
    expect(parsed.errors).toEqual([]);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].block.run_id).toBe('r');
    // marker at EOF, prose mention, no fence: also just prose - no error
    const onlyMention = 'docs mention <!-- status-inventory v1 --> inline\n';
    const parsed2 = inv.extractSentinels(onlyMention);
    expect(parsed2.blocks).toEqual([]);
    expect(parsed2.errors).toEqual([]);
  });
});
