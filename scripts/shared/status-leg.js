'use strict';
// scripts/shared/status-leg.js - shared plumbing for the status-inventory leg
// family (grill-t38 rework P2-16). Two responsibilities, both of which are
// SHARED and cannot live in the files they were extracted from:
//
//   deriveAnchor        - the emission-side anchor derivation. It used to live
//                         in scripts/run-gates.js:197, but run-test-gate.js
//                         required it from there at REQUIRE time (loading the
//                         whole gate-runner module and its deps to get 8 git
//                         calls). Lifting it here lets both runners share ONE
//                         implementation (D-M1) without the require-time drag.
//
//   exitUnverifiableReason - the exit-2 channel for a NON-capability
//                         underivable cause (D-002.2: a surface whose own-run
//                         artifact is absent is UNVERIFIABLE, never red, never
//                         green). src/shared/capability.js's exitUnverifiable()
//                         hardcodes "capability <cap> deterministically absent",
//                         so borrowing a capability name (the old
//                         exitUnverifiable(SELF_LEG,'repo-tree'), whose
//                         capability IS present) stated a FALSE cause. This
//                         emitter keeps the registered two-line form (ADR-0041
//                         D4/D5) and the zero-raw-exit-2 pin (the adr-0041
//                         wiring test scans every REGISTRY gate script for
//                         exit-2 sites) while naming the real cause.
//
// Zero-dependency by construction (required from scripts/**, ships in the
// tarball) apart from the two src/shared modules it already needed.

const { execFileSync } = require('child_process');
const { escWf } = require('../../src/shared/capability');

// grill-t38 D-004 (T-3): the emission-side anchor for a status-inventory
// artifact. tree_sha MIRRORS the run_id's tree segment (run_id keeps its
// addressing role; its syntax is not touched, D-004.1); mode is the read
// discipline (a dirty worktree read is 'working-tree read', D-004.3);
// ref_context is the observation-context record classified by the ONE shared
// classifier (status-inventory.classifyRefContext). The live-branch
// enumeration is REUSED from evidence-freshness (the T-6 shard's
// liveAnchorRefs) - never re-rolled.
function deriveAnchor(root, runId) {
  const inv = require('../../src/shared/status-inventory');
  const { worktreeDirty } = require('../../src/shared/run-id');
  const git = function (args) {
    try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch (e) { return ''; }
  };
  let liveRefs = [];
  try { liveRefs = require('../evidence-freshness').liveAnchorRefs(root); } catch (e) { liveRefs = []; }
  const facts = {
    head_sha: git(['rev-parse', 'HEAD']),
    head_ref: git(['symbolic-ref', '-q', 'HEAD']),
    origin_main_sha: git(['rev-parse', '--verify', '-q', 'origin/main']),
    workspace_ref: inv.WORKSPACE_REF,
    merge_base_sha: git(['merge-base', inv.WORKSPACE_REF, 'origin/main']),
    live_refs: liveRefs,
  };
  return {
    tree_sha: (runId && runId.tree_sha) || null,
    ref_context: inv.classifyRefContext(facts),
    mode: worktreeDirty(root) ? 'working-tree read' : 'tree-internal read',
  };
}

// Honest exit-2 for a non-capability underivable cause. `reason` is a machine
// token; `detail` is the human line. Escaping is complete by construction
// (escWf escapes %/CR/LF/','/':' - ADR-0041 D5).
function exitUnverifiableReason(gate, reason, detail) {
  const body = detail || reason;
  const line1 = '::error title=UNVERIFIABLE,gate=' + escWf(gate) + ',reason=' + escWf(reason) + '::' + escWf(body);
  const line2 = '[' + gate + '] UNVERIFIABLE: ' + body;
  process.stdout.write(line1 + '\n');
  process.stderr.write(line2 + '\n');
  process.exit(2);
}

module.exports = { deriveAnchor, exitUnverifiableReason };
