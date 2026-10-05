#!/usr/bin/env node
'use strict';
// scripts/run-test-gate.js - ADR-0057 D-C as carried forward by ADR-0091
// (grill-t34 D-002(iii)(v)): the CI test job as a manifest-asserting wrapper
// over jest. The --expected-suites argv is RETIRED - the registered
// expectation now lives in the committed derived manifest
// (docs/test-manifest.json, lockfile pattern), and the README declaration
// check has moved to the static check-test-manifest leg: this gate no longer
// reads README. Fail-closed on every silent-green channel: jest exits
// non-zero on failure AND on zero collected tests (no --passWithNoTests
// anywhere), the JUnit artifact must exist after a green run (collection
// reporting intact), and post-jest the collected counts must equal the
// manifest on BOTH channels - suites against the enumeration channel
// (--listTests), tests against the blessed junit channel. A battery that
// grew without a manifest regen, or a silent collection failure (.only
// residue, async-define swallowing, bad config), cannot read green
// (johal.in postmortem pattern).

const { requireCapabilities } = require('../src/shared/capability');
// ADR-0058 R8: no gates.json entry, so the test job declares inline; public tier (D-H) -> no bench-corpus.
requireCapabilities(['repo-tree']);

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-artifacts', 'junit.xml');
const CASES = path.join(ROOT, 'test-artifacts', 'jest-cases.json');
const MANIFEST = path.join(ROOT, 'docs', 'test-manifest.json');

// ---- grill-t37 D-002/D-005: test-surface inventory emission --------------
// The test job is a CI leg (not a gates.json entry - ADR-0058 D-C), so its
// failure rows carry unit_kind 'gate-leg' with name 'test', plus expanded
// jest members (D-002.1 {jest suite}/{jest test}). Emitted per-run under
// test-artifacts/status-inventory/ - the junit.xml family's home.
const invLib = require('../src/shared/status-inventory');
const { emitArtifact } = require('../src/shared/per-run-artifacts');
const { buildRunId } = require('../src/shared/run-id');

const TEST_CMD = 'node scripts/run-test-gate.js';
const RUN_ID = buildRunId({ surface: 'test', root: ROOT });

let _expectedRed;
function expectedRedRegistry() {
  if (_expectedRed === undefined) {
    try {
      _expectedRed = JSON.parse(fs.readFileSync(path.join(ROOT, invLib.EXPECTED_RED_RELS.split('/').join(path.sep)), 'utf8'));
    } catch (e) { _expectedRed = null; }
  }
  return _expectedRed;
}

function emitTestInventory(rows, note) {
  // D-001.2: annotate rows the registry certifies as expected red
  // (adjudication metadata - member-identity-excluded like the gates side).
  const reg = expectedRedRegistry();
  const annotated = rows.map(function (r) {
    const m = invLib.isExpectedRed(r, reg);
    return m ? Object.assign({}, r, { expected_red: { key: m.key, reason_code: m.reason_code, expires_at: m.expires_at } }) : r;
  });
  const payload = {
    schema: 'status-inventory v1',
    run_id: RUN_ID.run_id,
    judged_surface: 'test',
    tree_sha: RUN_ID.tree_sha,
    runner_ctx: RUN_ID.runner_ctx,
    emitted_at: new Date().toISOString(),
    complete: true,
    normalized_join_key_version: invLib.JOIN_KEY_VERSION,
    rows: annotated,
    closeout: {
      reason_code_breakdown: invLib.reasonCodeBreakdown(annotated),
      counts: {
        fail: annotated.filter(function (r) { return r.status === 'fail'; }).length,
        unverifiable: annotated.filter(function (r) { return r.status === 'unverifiable'; }).length,
      },
      note: note || null,
    },
  };
  try {
    return emitArtifact({
      subdir: 'status-inventory', prefix: 'status-inventory',
      runId: RUN_ID, payload: payload,
    });
  } catch (e) {
    console.error('[status-inventory] EMISSION DEFECT: ' + e.message);
    return null;
  }
}

// jest rows expand the test leg (D-002.3): command/judged_surface point back
// at the leg; the join key is name+suite+filepath (CTRF).
function jestRows(casesPath, jestExit) {
  let parsed = null;
  try { parsed = JSON.parse(fs.readFileSync(casesPath, 'utf8')); } catch (e) { parsed = null; }
  const rows = [];
  if (!parsed || !Array.isArray(parsed.cases)) return { rows: rows, hadCases: false };
  for (const c of parsed.cases) {
    if (c.status === 'failed') {
      rows.push({
        unit_kind: 'jest-test', name: c.name, suite: c.suite, filepath: c.filepath,
        command: TEST_CMD, exit: jestExit, status: 'fail', judged_surface: 'test',
        evidence_ref: 'rerun: ' + TEST_CMD + ' | artifact: test-artifacts/jest-cases.json',
        duration_ms: typeof c.duration_ms === 'number' ? c.duration_ms : null,
      });
    } else if (c.status === 'suite-failed') {
      rows.push({
        unit_kind: 'jest-suite', name: c.name, suite: c.suite, filepath: c.filepath,
        command: TEST_CMD, exit: jestExit, status: 'fail', judged_surface: 'test',
        evidence_ref: 'rerun: ' + TEST_CMD + ' | artifact: test-artifacts/jest-cases.json',
      });
    }
    // pending/skip rows are out of v1 scope (D-002.7 boundary registration)
  }
  // T-11 / D-002 negative (partial-junit incompleteness, legislated here):
  // when the runner's failure total exceeds the member rows the cases file
  // yielded, the member set is INCOMPLETE - a marked instrument-failure row
  // carries the gap so the inventory never reads as a complete red set.
  const declaredFailures = parsed.totals && typeof parsed.totals.failures === 'number' ? parsed.totals.failures : null;
  const memberFails = rows.filter(function (r) { return r.unit_kind === 'jest-test'; }).length;
  const suiteFails = rows.filter(function (r) { return r.unit_kind === 'jest-suite'; }).length;
  // a suite-failed row already carries the gap for unenumerable suites; the
  // marker fires only when no row family accounts for the declared failures
  if (declaredFailures !== null && declaredFailures > memberFails && suiteFails === 0) {
    rows.push({
      unit_kind: 'instrument-failure',
      name: 'jest-cases-incomplete (' + memberFails + '/' + declaredFailures + ' failed members enumerated)',
      command: TEST_CMD, exit: jestExit, status: 'unverifiable', judged_surface: 'test',
      evidence_ref: 'rerun: ' + TEST_CMD + ' | artifact: test-artifacts/jest-cases.json',
      reason_code: 'instrument-failure',
    });
  }
  return { rows: rows, hadCases: true };
}

function instrumentFailureRow(what, jestExit) {
  return {
    unit_kind: 'instrument-failure', name: what,
    command: TEST_CMD, exit: jestExit, status: 'unverifiable', judged_surface: 'test',
    evidence_ref: 'rerun: ' + TEST_CMD,
    reason_code: 'instrument-failure',
  };
}

// Fail-closed: a missing/unreadable manifest is a red gate, never a skipped
// assertion (the manifest is the registered expectation).
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
} catch (e) {
  emitTestInventory([{
    unit_kind: 'gate-leg', name: 'test', command: TEST_CMD, exit: 1,
    status: 'fail', judged_surface: 'test',
    evidence_ref: 'rerun: ' + TEST_CMD + ' | manifest: docs/test-manifest.json',
  }], 'manifest unreadable');
  console.error('run-test-gate: FAIL: docs/test-manifest.json unreadable - run: node scripts/build-test-manifest.js');
  process.exit(1);
}
if (!Number.isInteger(manifest.enumeration && manifest.enumeration.suites) || manifest.enumeration.suites <= 0
  || !Number.isInteger(manifest.junit && manifest.junit.tests) || manifest.junit.tests <= 0) {
  emitTestInventory([{
    unit_kind: 'gate-leg', name: 'test', command: TEST_CMD, exit: 1,
    status: 'fail', judged_surface: 'test',
    evidence_ref: 'rerun: ' + TEST_CMD + ' | manifest: docs/test-manifest.json',
  }], 'manifest shape violation');
  console.error('run-test-gate: FAIL: manifest is missing positive enumeration.suites / junit.tests integers');
  process.exit(1);
}

try { fs.unlinkSync(OUT); } catch (e) { /* first run: nothing to clear */ }

const jestBin = require.resolve('jest-cli/bin/jest');
const r = spawnSync(
  process.execPath,
  [jestBin, '--verbose', '--reporters=default', '--reporters=' + path.join(ROOT, 'scripts', 'jest-junit-lite.js')],
  { cwd: ROOT, stdio: 'inherit', env: process.env }
);
if (r.error) {
  emitTestInventory([instrumentFailureRow('jest-spawn', 1)], 'jest spawn failed');
  console.error('run-test-gate: jest spawn failed: ' + r.error.message);
  process.exit(1);
}
if (r.status !== 0) {
  // D-002.6: member-level jest reds land in the inventory; a jest red with NO
  // parseable cases file is instrument-failure (empty red set must never read
  // as 'did not run').
  const jr = jestRows(CASES, r.status);
  // D-002.6 honesty: a red jest that produced no member rows (pre-collection
  // crash, empty cases file) is instrument-failure - an empty inventory on a
  // red run would read as 'the run was green', which is the one claim this
  // channel exists to prevent.
  const rows = !jr.hadCases ? [instrumentFailureRow('jest-cases-unreadable', r.status)]
    : jr.rows.length ? jr.rows
      : [instrumentFailureRow('jest-red-no-member-rows', r.status)];
  emitTestInventory(rows, 'jest exited ' + r.status);
  process.exit(r.status);
}

if (!fs.existsSync(OUT)) {
  emitTestInventory([instrumentFailureRow('junit-artifact-missing', 0)], 'junit.xml absent after green jest');
  console.error('FAIL: jest exited green but the JUnit artifact is missing - collection reporting broken (ADR-0057 D-C)');
  process.exit(1);
}

const xml = fs.readFileSync(OUT, 'utf8');
const suites = (xml.match(/<testsuite /g) || []).length;
const head = xml.match(/<testsuites tests="(\d+)" failures="\d+" skipped="(\d+)"/);
function driftRow(what) {
  return {
    unit_kind: 'gate-leg', name: 'test', command: TEST_CMD, exit: 1,
    status: 'fail', judged_surface: 'test',
    evidence_ref: 'rerun: ' + TEST_CMD + ' | manifest: docs/test-manifest.json | ' + what,
  };
}
if (suites !== manifest.enumeration.suites) {
  emitTestInventory([driftRow('suite-count-drift')], 'suite-count drift');
  console.error('FAIL: suite-count drift - collected ' + suites + ' suites, manifest enumeration declares ' + manifest.enumeration.suites
    + ' (ADR-0091 D-002). A silent collection failure or an intentional suite add/remove must regenerate the manifest in the same change: node scripts/build-test-manifest.js');
  process.exit(1);
}
if (!head) {
  emitTestInventory([instrumentFailureRow('junit-header-missing', 0)], 'junit header unreadable');
  console.error('FAIL: JUnit header is missing the tests attribute - cannot reconcile the manifest (ADR-0057 D-C)');
  process.exit(1);
}
const tests = Number(head[1]);
// Post-jest dual-channel reconciliation (ADR-0091 D-002(v)). junit.tests
// counts pending tests, so the assertion is tier-invariant; junit.skipped is
// tier-variant and display-only (never asserted across tiers).
if (tests !== manifest.junit.tests) {
  emitTestInventory([driftRow('test-count-drift')], 'test-count drift');
  console.error('FAIL: test-count drift - collected ' + tests + ' tests, manifest junit declares ' + manifest.junit.tests
    + ' (ADR-0091 D-002). Regenerate the manifest in the same change: node scripts/build-test-manifest.js');
  process.exit(1);
}

// D-002.2: a green surface emits an EMPTY member set (rows: []) - the artifact
// exists either way so 'the run happened' and 'the run was green' stay
// distinguishable.
emitTestInventory([], 'green');
console.log('[test] OK: ' + suites + ' suites, ' + tests + ' tests, ' + head[2] + ' skipped == docs/test-manifest.json (ADR-0057 D-C + ADR-0091 D-002)');
console.log('[test] status-inventory emitted: ' + RUN_ID.run_id);
process.exit(0);
