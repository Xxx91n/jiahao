'use strict';
// src/shared/status-inventory.js - grill-t37 D-002/D-003/D-005: the derived
// status inventory. The CI-leg red set is DERIVED by the executor battery and
// emitted per-run as normalized JSON (the junit.xml family: gitignored,
// per-run, replayable). The committed report's status column carries the
// machine-readable sentinel block '<!-- status-inventory v1 -->' whose member
// set must equal the emitted inventory's member set - member-level reconcile,
// never count-level.
//
// WHAT THIS MODULE IS: pure derivation + (de)serialization + the registry
// read for expected-red. No fs writes here - emission lives with the runners
// (the write point is theirs, D-005.1); assertion lives in
// scripts/check-status-inventory.js.
//
// Row shape (D-002.3 + D-003.6 + D-001.2, append-only field growth):
//   { unit_kind, name, command, exit, status, judged_surface, evidence_ref,
//     suite?, filepath?, reason_code?, declared_reason?, expected_red?,
//     duration_ms? }
//
// unit_kind closed set: 'gate-leg' | 'jest-suite' | 'jest-test' |
// 'instrument-failure'. jest rows are expanded members of the test-job leg
// (command/judged_surface point back at it); instrument-failure rows mark the
// collection/reporting channel itself having failed (empty red set must be
// distinguishable from 'did not run').
//
// reason_code closed set (C-1, runner-adjudicated, authoritative):
//   'registered-absence' | 'timeout' | 'instrument-failure'
// declared_reason is the leg's MAY-be self-report, closed-set-validated,
// never overrides reason_code (D-003.2 dual-field separation).
//
// MEMBER IDENTITY (the comparison domain, R-B normalized): join key =
// unit_kind :: (filepath :: suite :: name for jest rows | name otherwise),
// plus {status, reason_code, declared_reason}. Volatile fields (exit,
// duration_ms, evidence_ref, expected_red, timestamps, absolute paths) are
// stripped before comparison/digest - they are evidence detail, not member
// identity.
//
// SENTINEL SELF-DESCRIPTION (D-005.3/.4): the block carries run_id,
// emitted_at, normalized_join_key_version, the full member snapshot and
// rows_digest. The snapshot carries the weight; the digest is a
// self-consistency check, never a substitute (member-level reconcile needs
// the members present).

const crypto = require('crypto');

const SENTINEL = '<!-- status-inventory v1 -->';
const JOIN_KEY_VERSION = 'v1';

// grill-t38 D-004 (T-3): the emission-side anchor. The block appends
// anchor={tree_sha, ref_context, mode} (additive v1.1, schema grows only by
// adding). run_id keeps its addressing role untouched - tree_sha merely
// MIRRORS the run_id's tree segment, the syntax is not re-parsed (D-004.1/.2).
//   ref_context - the OBSERVATION-CONTEXT record: the entity name HEAD
//     resolved to at emit time (D-004.4). It is NEVER an evaluation input -
//     the assert leg evaluates the D-003 live-branch SET, not this field.
//   mode - the read discipline (D-004.3 / ADR-0093 D-6: which tree != which
//     read). A dirty-worktree read is 'working-tree read'; dirty DEGREE lives
//     in runner_ctx, never in this closed enum.
const REF_CONTEXT = Object.freeze(['lane-tip', 'merge-base', 'origin/main', 'workspace-merge', 'live-set']);
const MODES = Object.freeze(['tree-internal read', 'working-tree read']);
const WORKSPACE_REF = 'refs/heads/gitbutler/workspace';

const UNIT_KINDS = Object.freeze(['gate-leg', 'jest-suite', 'jest-test', 'instrument-failure']);
const REASON_CODES = Object.freeze(['registered-absence', 'timeout', 'instrument-failure']);

// The declared_reason channel: a leg MAY self-report a refinement inside the
// runner's closed set. The marker is a workflow-command-shaped log line the
// runner parses and strips (same lane as ::warning). Out-of-set is a
// REGISTRY VIOLATION and fails the leg - capability naming discipline, no new
// trust model (D-003.1).
const DECLARED_REASON_RE = /^::jiahao declared_reason=([a-z][a-z0-9-]*)\s*$/;

// ---- attribution (D-003.3 mutually-exclusive chain) ----------------------
// Deterministic chain, head of chain wins. Returns a REASON_CODES member or
// null (an ordinary red's reason is its own output - fail rows carry no
// reason_code).
//   missing[] non-empty            -> registered-absence
//   timeout marker                 -> timeout
//   unverifiable without other     -> instrument-failure (residual bucket)
//     attribution
function attributeReason(result) {
  if (!result || typeof result !== 'object') return null;
  if (Array.isArray(result.missing) && result.missing.length) return 'registered-absence';
  if (result.timedOut === true) return 'timeout';
  if (result.status === 'unverifiable') return 'instrument-failure';
  return null;
}

// ---- join key ------------------------------------------------------------
function joinKey(row) {
  if (!row || typeof row !== 'object') return '';
  if (row.unit_kind === 'jest-test' || row.unit_kind === 'jest-suite') {
    return [row.unit_kind, row.filepath || '', row.suite || '', row.name || ''].join('::');
  }
  return [row.unit_kind || '', '', '', row.name || ''].join('::');
}

// ---- normalization (D-005.5 R-B) ------------------------------------------
// Canonical member view: identity fields only, canonical key order. The
// snapshot must be human-auditable, so the join-key components ride as
// first-class fields next to the packed key - they ARE the identity.
// Volatile evidence detail (exit, duration_ms, evidence_ref, expected_red,
// timestamps, absolute paths) stays in the per-run artifact and never enters
// the comparison domain.
function normalizeRow(row) {
  const member = {
    declared_reason: row.declared_reason || null,
    filepath: row.filepath || null,
    join_key: joinKey(row),
    judged_surface: row.judged_surface || null,
    name: row.name || null,
    reason_code: row.reason_code || null,
    status: row.status || null,
    suite: row.suite || null,
    unit_kind: row.unit_kind || null,
  };
  return member;
}

function normalizeRows(rows) {
  return (rows || []).map(normalizeRow).sort(function (a, b) {
    return a.join_key < b.join_key ? -1 : a.join_key > b.join_key ? 1 : 0;
  });
}

function canonical(obj) {
  if (Array.isArray(obj)) return '[' + obj.map(canonical).join(',') + ']';
  if (obj && typeof obj === 'object') {
    return '{' + Object.keys(obj).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canonical(obj[k]);
    }).join(',') + '}';
  }
  return JSON.stringify(obj);
}

function rowsDigest(rows) {
  return 'sha256:' + crypto.createHash('sha256').update(canonical(normalizeRows(rows)), 'utf8').digest('hex');
}

// Member-set equality, the assert leg's comparison primitive. Returns the
// symmetric difference detail (never just a bool - a bare count mismatch
// hides which side drifted).
function diffMemberSets(aRows, bRows) {
  const map = function (rows) {
    const m = new Map();
    for (const r of normalizeRows(rows)) m.set(canonical(r), r);
    return m;
  };
  const a = map(aRows), b = map(bRows);
  const onlyA = [], onlyB = [];
  for (const k of a.keys()) if (!b.has(k)) onlyA.push(a.get(k));
  for (const k of b.keys()) if (!a.has(k)) onlyB.push(b.get(k));
  return { equal: onlyA.length === 0 && onlyB.length === 0, only_a: onlyA, only_b: onlyB };
}

// classifyRefContext(facts) -> a REF_CONTEXT member. PURE: the runners own the
// git seam and pass the probed facts; this is the ONE classification
// implementation both runners share (D-M1: two call sites that each roll their
// own classifier drift apart). Most specific member wins:
//   HEAD sha == origin/main            -> 'origin/main'
//   HEAD symbolic ref == workspace ref -> 'workspace-merge' (a GitButler
//                                         workspace HEAD IS the workspace
//                                         merge commit)
//   HEAD symbolic ref is a live branch -> 'lane-tip' (refs/heads/* or
//                                         refs/gitbutler/*, workspace excluded
//                                         by the T-6 enumerator)
//   HEAD sha == merge-base(ws, main)   -> 'merge-base' (detached on the shared
//                                         base)
//   detached / unknown / no HEAD       -> 'live-set' (the D-003 evaluation
//                                         anchor is the branch SET, not a name)
function classifyRefContext(facts) {
  const f = facts || {};
  if (!f.head_sha) return 'live-set';
  if (f.origin_main_sha && f.head_sha === f.origin_main_sha) return 'origin/main';
  if (f.head_ref && f.head_ref === (f.workspace_ref || WORKSPACE_REF)) return 'workspace-merge';
  if (f.head_ref && Array.isArray(f.live_refs) && f.live_refs.indexOf(f.head_ref) !== -1) return 'lane-tip';
  if (f.merge_base_sha && f.head_sha === f.merge_base_sha) return 'merge-base';
  return 'live-set';
}

// ---- sentinel block ------------------------------------------------------
// opts: { run_id, emitted_at, rows, anchor? }  -> the literal block text.
// anchor (grill-t38 D-004.1) rides RIGHT AFTER run_id. When absent the block is
// byte-identical to the pre-anchor form, so old blocks keep parsing and the
// pre-registration legacy path (D-004.2 rule 3) stays intact.
function renderSentinel(opts) {
  const block = { run_id: opts.run_id };
  if (opts.anchor && typeof opts.anchor === 'object') block.anchor = opts.anchor;
  block.emitted_at = opts.emitted_at;
  block.normalized_join_key_version = JOIN_KEY_VERSION;
  block.rows = normalizeRows(opts.rows);
  block.rows_digest = rowsDigest(opts.rows);
  return SENTINEL + '\n```json\n' + JSON.stringify(block, null, 2) + '\n```\n';
}

// extractSentinels(text) -> { blocks: [parsed], errors: [string] }
// Fail-closed per block: a malformed block is an error row, never skipped.
// grill-t37 rework F-7: the marker binds only to an ADJACENT ```json fence
// (whitespace between, same adjacency the carrier candidacy regex uses). A
// backticked or prose mention of the marker never mints a block - so a report
// may name the convention without being judged on phantom content.
const BLOCK_RE = /<!--\s*status-inventory\s+v1\s*-->\s*```json[ \t]*\r?\n/g;
function extractSentinels(text) {
  const blocks = [];
  const errors = [];
  if (!text) return { blocks: blocks, errors: errors };
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    const at = m.index;
    const contentStart = at + m[0].length;
    const end = text.indexOf('```', contentStart);
    if (end < 0) { errors.push('status-inventory v1 block at offset ' + at + ' json fence unterminated'); continue; }
    let obj;
    try { obj = JSON.parse(text.slice(contentStart, end)); }
    catch (e) { errors.push('status-inventory v1 block at offset ' + at + ' is not valid JSON: ' + e.message); continue; }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.rows)) {
      errors.push('status-inventory v1 block at offset ' + at + ' must be an object carrying a rows array');
      continue;
    }
    if (typeof obj.run_id !== 'string' || !obj.run_id) {
      errors.push('status-inventory v1 block at offset ' + at + ' lacks run_id');
      continue;
    }
    blocks.push({ offset: at, block: obj });
  }
  return { blocks: blocks, errors: errors };
}

// Block self-consistency: the declared digest recomputes over the declared
// rows. Catches hand-edited snapshots without needing the runner.
function sentinelSelfConsistent(block) {
  if (!block || !Array.isArray(block.rows)) return false;
  return rowsDigest(block.rows) === block.rows_digest;
}

// ---- closeout row extension (D-003.6; t27-D-007(ii) append-only) ---------
// The seven-field closeout schema gains reason_code_breakdown as an APPENDED
// field: {code: count} over the non-green rows that carry one.
function reasonCodeBreakdown(rows) {
  const out = {};
  for (const r of rows || []) {
    if (!r || typeof r.reason_code !== 'string' || !r.reason_code) continue;
    out[r.reason_code] = (out[r.reason_code] || 0) + 1;
  }
  return out;
}

// ---- expected-red registry (D-001.2; T-7) ---------------------------------
// A red row is a LEGAL expected red iff a registry row exists for its join
// key AND is unexpired AND its code sits inside the registry's closed
// codes_enum. All three conjuncts are mechanical.
const EXPECTED_RED_RELS = 'docs/governance/expected-red.json';

function isExpectedRed(row, registry, nowISO) {
  if (!registry || !Array.isArray(registry.entries)) return null;
  const key = joinKey(row);
  const now = nowISO || new Date().toISOString().slice(0, 10);
  const codes = Array.isArray(registry.codes_enum) ? registry.codes_enum : [];
  for (const e of registry.entries) {
    if (!e || e.key !== key) continue;
    if (typeof e.reason_code !== 'string' || codes.indexOf(e.reason_code) === -1) continue; // out-of-set never certifies
    if (typeof e.expires_at !== 'string' || e.expires_at < now) continue; // expired never certifies
    return e;
  }
  return null;
}

module.exports = {
  SENTINEL,
  JOIN_KEY_VERSION,
  UNIT_KINDS,
  REASON_CODES,
  DECLARED_REASON_RE,
  EXPECTED_RED_RELS,
  REF_CONTEXT,
  MODES,
  WORKSPACE_REF,
  attributeReason,
  joinKey,
  normalizeRow,
  normalizeRows,
  rowsDigest,
  diffMemberSets,
  classifyRefContext,
  renderSentinel,
  extractSentinels,
  sentinelSelfConsistent,
  reasonCodeBreakdown,
  isExpectedRed,
};
