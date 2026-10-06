#!/usr/bin/env node
'use strict';
// scripts/check-status-inventory.js - grill-t38 T-4 (D-002.1-.9, D-004.2/.6/.7):
// the status-inventory ASSERTION leg under ANCHOR semantics.
//
// TWO INDEPENDENT ASSERTIONS (D-002.1 - double-assertion separation). Each has
// its own error line and its own reason vocabulary; a red in one never mints a
// red in the other:
//
//   ① member reconcile (TRUTH domain, D-002.2 a1=①): the block's rows for the
//      judged surface equal the rows of the artifact its OWN run_id addresses.
//      run_id is the ADDRESSING authority - select by
//      artifact.run_id === block.run_id && complete === true. The block cannot
//      pick its judge, and prefer-HEAD is ABOLISHED from this domain (D-002.5).
//      A surface whose own-run artifact is absent / not complete is UNVERIFIABLE
//      (exit 2 honest channel), never red, never green.
//
//   ② freshness (DATE domain, D-002.1/.5): the block's anchor tree must be an
//      ancestor of the carrier commit's PARENT (or equal to it), and the
//      interval (anchor_tree, carrier.parent] must contain NO claim-surface
//      mutation - the interval's shas are handed to the shared
//      lastClaimMutation classifier. A freshness failure is a VERDICT-level
//      reason, NOT a C-1 row-level closed-set code (D-002.8).
//
//   ②' freshness RATCHET (DATE domain, D-001.7, rework P0-5): the interval
//      assertion above is BOUNDED, so a claim mutation outside the window is a
//      hiding place. The INDEPENDENT unbounded assertion: the anchor tree's LAST
//      claim-surface mutation, over the anchor's whole history (the SAME shared
//      lastClaimMutation classifier), must be <= emitted_at. Own reason
//      vocabulary entry, own error line.
//
// DISAMBIGUATION (D-004.2 three rules):
//   ① anchor.tree_sha = the ANCHOR authority; run_id = the ADDRESSING
//      authority. This leg NEVER reverse-derives tree_sha from run_id for the
//      anchor judgment: when a block carries an anchor, freshness/ancestry read
//      anchor.tree_sha, not run_id's second segment.
//   ② anchor.tree_sha !== run_id's tree segment -> FAIL with the INDEPENDENT
//      reason 'anchor_run_id_tree_mismatch'; never silently pick one.
//   ③ legacy transition: a block whose carrier predates the anchor-convention
//      registration (the commit that ADDED docs/adr/0096-*.md) and lacks
//      'anchor' -> legacy run_id path + ::warning (yellow); a post-registration
//      block lacking 'anchor' -> malformed FAIL. BOOTSTRAP: until ADR-0096 is
//      committed (add-time 0/absent), every absent-anchor block is legacy +
//      warning.
//
// DRIFT OBSERVATION (D-002.5): prefer-HEAD abolished -> a same-tree OTHER-run
// artifact (artifact.tree_sha === anchor.tree_sha, different run_id) whose
// member set differs from the block's is a ::warning (yellow) drift
// disclosure - flaky / environment difference, never a transcription red.
//
// RESTACK (D-002.7): an anchor sha that is not a resolvable commit -> yellow
// disclosure, never red. CARRIER UNDETERMINED (D-002.6): if the carrier commit
// cannot be determined, degrade the interval upper bound to runtime HEAD and
// DISCLOSE the degradation; never red on that alone.
//
// OBSERVER-ROW EXCLUSION: the assert leg runs inside the very run it judges
// and sees the inventory mid-write (complete:false). Rows for the assert leg
// itself and the wrapper-internal tracked-surface pseudo-leg are excluded from
// BOTH member sets - the observer cannot be inside the observed set. The
// assert leg must be the LAST registry leg (mechanically enforced below).
//
// BOOTSTRAP (prospective, audit-surface/post-land-sentinel family): the
// convention binds claim artifacts first committed on/after this leg's own
// registration commit. Until an in-scope artifact carries the block there is
// no subject and the leg reports OK.
//
// Usage: node scripts/check-status-inventory.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { exitUnverifiableReason } = require('./shared/status-leg');
const roles = require('./shared/claim-surface-roles');
const { lastClaimMutation } = require('./shared/last-claim-mutation');
const inv = require('../src/shared/status-inventory');

const ROOT = path.join(__dirname, '..');
const SELF_REL = 'scripts/check-status-inventory.js';
const SELF_LEG = 'status-inventory';
const ARTIFACT_DIR = path.join(ROOT, 'test-artifacts', 'status-inventory');
const REGISTRY_REL = path.join('docs', 'gates.json');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');

// The two reason vocabularies are INDEPENDENT (D-002.1): a freshness red never
// borrows a member-reconcile code, and neither enters the C-1 closed set.
const ANCHOR_REASONS = Object.freeze({
  MISMATCH: 'anchor_run_id_tree_mismatch',
  MALFORMED: 'anchor_missing_post_registration',
  BACKFILLED: 'anchor_backfilled_pre_registration',
  LEGACY: 'legacy_run_id_path',
});
const FRESHNESS_REASONS = Object.freeze({
  ANCHOR_NOT_ANCESTOR: 'anchor_not_ancestor_of_carrier',
  CLAIM_MUTATION: 'claim_mutation_in_interval',
  ANCHOR_UNRESOLVABLE: 'anchor_unresolvable',
  // RATCHET (D-001.7, P0-5): the unbounded freshness assertion's own reason.
  CLAIM_MUTATION_AFTER_EMIT: 'anchor_claim_mutation_after_emitted_at',
});

// Rows for these units can never be in the mid-run artifact when this leg
// runs: the assert leg itself is still executing, and the tracked-surface
// pseudo-leg is written post-loop. Both are runner-authored (never
// hand-written), so no drift surface is lost by the exclusion.
const OBSERVER_NAMES = ['- tracked-surface', SELF_LEG];
function isObserverRow(r) {
  return r && r.unit_kind === 'gate-leg' && OBSERVER_NAMES.indexOf(r.name) !== -1;
}

const git = function (args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
};
const gitBool = function (args) {
  try { execFileSync('git', args, { cwd: ROOT, stdio: 'ignore' }); return true; } catch (e) { return false; }
};

// ONE row formatter (rework P2-16: the identical closure was duplicated at the
// member-drift and drift-disclosure sites).
function fmtRow(r) {
  return r.join_key + ' [' + r.status + (r.reason_code ? '/' + r.reason_code : '') + ']';
}

function registrationCommit() {
  const adds = git(['log', '--diff-filter=A', '--format=%H', '--', SELF_REL]).split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

function firstCommitMs(rel) {
  try {
    const out = git(['log', '--diff-filter=A', '--format=%ct', '--', rel]);
    const last = out.split('\n').filter(Boolean).pop();
    return last ? Number(last) * 1000 : 0;
  } catch (e) { return 0; }
}

// The anchor-convention registration commit = the commit that ADDED
// docs/adr/0096-*.md (D-004.2 rule 3). Found by the 0096- prefix; its add-time
// is read with the existing firstCommitMs pattern.
function anchorConventionRel() {
  let names;
  try { names = fs.readdirSync(ADR_DIR); } catch (e) { return null; }
  const hit = names.filter(function (n) { return n.indexOf('0096-') === 0 && /\.md$/.test(n); }).sort()[0];
  return hit ? 'docs/adr/' + hit : null;
}

// 0 means "not yet committed" -> BOOTSTRAP: every absent-anchor block is
// legacy + warning (mirrors the leg's own registration bootstrap).
function anchorConventionMs(opts) {
  if (opts && opts.anchorRegMs !== undefined) return opts.anchorRegMs;
  const rel = anchorConventionRel();
  if (!rel) return 0;
  return firstCommitMs(rel);
}

// The assert leg must close the run: a registry leg ordered after it would
// emit rows this leg can never see mid-run. Mechanical self-check. The
// ordering property binds only once the leg is registered - before the
// ADR-0095 wiring commit lands the entry, a standalone run is a development
// verification, so unregistered is a warning, not a failure.
function assertLegIsLast(reg) {
  const reg2 = typeof reg === 'string' ? JSON.parse(fs.readFileSync(path.join(ROOT, reg), 'utf8')) : reg;
  const mine = (reg2.entries || []).filter(function (e) { return e.name === SELF_LEG; });
  if (!mine.length) return { warn: 'assert leg ' + SELF_LEG + ' not registered in ' + REGISTRY_REL.split(path.sep).join('/') + ' (lands with ADR-0095); standalone reconcile continues' };
  const order = mine[0].order;
  const later = (reg2.entries || []).filter(function (e) { return e.order > order; });
  if (later.length) {
    return { error: 'assert leg must be the LAST registry leg - ordered after it: ' + later.map(function (e) { return e.name; }).join(', ') };
  }
  return null;
}

// Artifacts for a surface, newest first.
function artifactsFor(surface) {
  let names;
  try { names = fs.readdirSync(ARTIFACT_DIR); } catch (e) { return []; }
  const head = 'status-inventory.' + surface + '.';
  return names
    .filter(function (n) { return n.indexOf(head) === 0 && n.slice(-5) === '.json'; })
    .map(function (n) { return { name: n, ms: fs.statSync(path.join(ARTIFACT_DIR, n)).mtimeMs }; })
    .sort(function (a, b) { return b.ms - a.ms; })
    .map(function (x) {
      try { return { file: x.name, artifact: JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, x.name), 'utf8')) }; }
      catch (e) { return null; }
    })
    .filter(Boolean);
}

// MANUAL STRONG-VERIFICATION TOOL - NOT on the assertion path (grill-t38
// rework P1-11). The pre-anchor selection (HEAD-tree derivation first, then the
// claimed tree) is RETIRED from the assertion domain (D-002.5 prefer-HEAD
// abolition): the assertion selects by run_id via pickByRunId below. This helper
// survives only as a manual strong-verification probe a human runs when
// re-deriving a surface by hand; its prefer-HEAD semantics are deliberately NOT
// pinned by the test suite as expected behaviour (the retired contract must not
// read as current). grill-t37 rework F-4: only complete===true artifacts are
// derivation truth.
function pickDerivation(surface, claimedSha, headSha, opts) {
  const list = (opts && opts.artifacts) || artifactsFor(surface);
  const byTree = function (sha) {
    return list.find(function (a) { return a.artifact && a.artifact.complete === true && a.artifact.tree_sha === sha; }) || null;
  };
  return byTree(headSha) || byTree(claimedSha) || null;
}

// ASSERTION ① selection (D-002.2 a1=①): the artifact the block's OWN run_id
// addresses. run_id is the ADDRESSING authority - exact run_id equality, and
// only complete===true artifacts are truth. A partial (mid-run) artifact is
// never selected; a missing/partial own-run artifact surfaces as UNVERIFIABLE
// in the caller.
function pickByRunId(surface, runId, opts) {
  const list = (opts && opts.artifacts) || artifactsFor(surface);
  return list.find(function (a) {
    return a.artifact && a.artifact.complete === true && a.artifact.run_id === runId;
  }) || null;
}

// DISAMBIGUATION (D-004.2). Returns:
//   { kind:'anchored', treeSha }        - anchor present and consistent with run_id
//   { kind:'mismatch', reason, ... }    - anchor.tree_sha !== run_id tree segment
//   { kind:'backfilled', reason, ... }  - anchor present on a PRE-registration block
//   { kind:'malformed', reason }        - post-registration block with no anchor
//   { kind:'legacy', treeSha, reason }  - pre-registration (or bootstrap) block
// ctx: { anchorRegMs, blockMs }.
function classifyBlockAnchor(block, ctx) {
  const c = ctx || {};
  const runIdTree = String(block.run_id).split('.')[1];
  const anchor = block.anchor;
  const anchorRegMs = c.anchorRegMs || 0;
  const blockMs = c.blockMs || 0;
  if (anchor && typeof anchor === 'object') {
    if (anchor.tree_sha !== runIdTree) {
      return { kind: 'mismatch', reason: ANCHOR_REASONS.MISMATCH, runIdTree: runIdTree, anchorTree: anchor.tree_sha, treeSha: null };
    }
    // D-001.8② (rework P0-6): forward-only. The anchor convention binds from
    // its registration commit; a block whose CARRIER predates that commit
    // cannot have carried a legitimate anchor, so the field could only have
    // been back-filled afterwards - the escape hatch D-001.8 forbids. Route
    // anchor-bearing blocks through the SAME blockMs/anchorRegMs judgment the
    // absent-anchor path uses (the anchor is no longer a free pass).
    if (anchorRegMs > 0 && blockMs > 0 && blockMs < anchorRegMs) {
      return { kind: 'backfilled', reason: ANCHOR_REASONS.BACKFILLED, treeSha: anchor.tree_sha, blockMs: blockMs, anchorRegMs: anchorRegMs };
    }
    return { kind: 'anchored', treeSha: anchor.tree_sha };
  }
  if (anchorRegMs > 0 && blockMs >= anchorRegMs) {
    return { kind: 'malformed', reason: ANCHOR_REASONS.MALFORMED, treeSha: null };
  }
  return { kind: 'legacy', reason: ANCHOR_REASONS.LEGACY, treeSha: runIdTree };
}

function rowsForSurface(rows, surface) {
  return (rows || []).filter(function (r) { return r && r.judged_surface === surface && !isObserverRow(r); });
}

// ASSERTION ② (D-002.1/.5/.6/.7): freshness, the DATE domain. Pure with
// respect to git via opts.git / opts.gitBool (tests inject stubs).
//   opts: { git, gitBool, head, carrierSha, anchorResolvable }
// Returns { red, reason, detail, yellow, degraded }. A non-resolvable anchor is
// yellow (restack, D-002.7); an undetermined carrier degrades the upper bound
// to HEAD and discloses (D-002.6); a claim mutation inside the interval is red.
function freshnessAssertion(anchorTreeSha, carrierRel, opts) {
  const o = opts || {};
  const g = o.git || git;
  const gb = o.gitBool || gitBool;
  let head = o.head;
  if (!head) { try { head = g(['rev-parse', 'HEAD']); } catch (e) { head = ''; } }

  let resolvable;
  if (o.anchorResolvable !== undefined) resolvable = o.anchorResolvable;
  else { try { resolvable = gb(['cat-file', '-e', anchorTreeSha + '^{commit}']); } catch (e) { resolvable = false; } }
  if (!resolvable) {
    return { red: false, yellow: FRESHNESS_REASONS.ANCHOR_UNRESOLVABLE, degraded: false,
      detail: 'anchor tree ' + String(anchorTreeSha).slice(0, 9) + ' is not a resolvable commit (restack?)' };
  }

  let carrier = o.carrierSha;
  if (carrier === undefined) {
    try { carrier = g(['log', '-1', '--format=%H', '--', carrierRel]); } catch (e) { carrier = ''; }
  }
  let degraded = false;
  let upper;
  if (carrier) {
    try { upper = g(['rev-parse', '--verify', carrier + '^']); } catch (e) { upper = ''; }
    if (!upper) { degraded = true; upper = head; }
  } else {
    degraded = true; upper = head;
  }

  // (a) ancestry: anchor must be an ancestor of carrier.parent (or equal).
  if (!degraded && anchorTreeSha !== upper) {
    let anc = false;
    try { anc = gb(['merge-base', '--is-ancestor', anchorTreeSha, upper]); } catch (e) { anc = false; }
    if (!anc) {
      return { red: true, reason: FRESHNESS_REASONS.ANCHOR_NOT_ANCESTOR, degraded: false, yellow: null,
        detail: 'anchor tree ' + String(anchorTreeSha).slice(0, 9) + ' is not an ancestor of carrier parent ' + String(upper).slice(0, 9) };
    }
  }

  // (b) no claim-surface mutation inside (anchor, carrier.parent].
  let shas = [];
  try { shas = g(['log', '--format=%H', anchorTreeSha + '..' + upper]).split('\n').map(function (s) { return s.trim(); }).filter(Boolean); } catch (e) { shas = []; }
  const mut = lastClaimMutation(g, shas);
  if (mut) {
    const hi = degraded ? ('HEAD ' + String(head).slice(0, 9)) : String(upper).slice(0, 9);
    return { red: true, reason: FRESHNESS_REASONS.CLAIM_MUTATION, degraded: degraded, yellow: null,
      detail: 'claim-surface mutation ' + String(mut).slice(0, 9) + ' inside (' + String(anchorTreeSha).slice(0, 9) + ', ' + hi + ']' };
  }

  return { red: false, reason: null, detail: '', yellow: null, degraded: degraded };
}

// RATCHET (D-001.7, rework P0-5): the freshness interval assertion above is
// BOUNDED by (anchor, carrier.parent] - a claim-surface mutation OUTSIDE that
// window is a hiding place (the ledger's own warning: "a subset that happens to
// cut the real defect out of the window"). This is the INDEPENDENT, UNBOUNDED
// form: the anchor tree's LAST claim-surface mutation, over the anchor's whole
// reachable history, must be at or before the block's emitted_at. It reuses the
// ONE shared lastClaimMutation classifier - no second scanner (D-M1).
//   opts: { git }
// Returns { red, reason, detail }. A non-parsable emitted_at is not judged here
// (the caller already fails a missing emitted_at); a mutation at or before
// emitted_at, or no claim mutation at all, is green.
function freshnessRatchet(anchorTreeSha, emittedAt, opts) {
  const g = (opts && opts.git) || git;
  const emitted = Date.parse(String(emittedAt));
  if (!Number.isFinite(emitted)) return { red: false, reason: null, detail: '' };
  let shas = [];
  try {
    shas = g(['log', '--format=%H', anchorTreeSha]).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  } catch (e) { shas = []; }
  const last = lastClaimMutation(g, shas);
  if (!last) return { red: false, reason: null, detail: '' };
  let ms = NaN;
  try { ms = Number(g(['log', '-1', '--format=%ct', last])) * 1000; } catch (e) { /* stays NaN */ }
  if (Number.isFinite(ms) && ms > emitted) {
    return { red: true, reason: FRESHNESS_REASONS.CLAIM_MUTATION_AFTER_EMIT,
      detail: 'anchor tree ' + String(anchorTreeSha).slice(0, 9) + ' last claim mutation ' + String(last).slice(0, 9) +
        ' (' + new Date(ms).toISOString() + ') post-dates emitted_at ' + String(emittedAt) };
  }
  return { red: false, reason: null, detail: '' };
}

// D-001.3 / P1-8: the join-key grammar version disposition. v1.1 is current;
// the committed t37 sentinel carriers hold the legacy 'v1' grammar and are still
// VERIFIED (legacy path + ::warning), never hard-failed. Anything else is a
// re-render red.
function joinKeyVersionDisposition(version) {
  if (version === inv.JOIN_KEY_VERSION) return { ok: true, legacy: false };
  if (inv.LEGACY_JOIN_KEY_VERSIONS.indexOf(version) !== -1) return { ok: true, legacy: true };
  return { ok: false, legacy: false };
}

// P1-9 / D-004.3/.4: consumer-side closed-enum validation. The emitter only ever
// writes MODES / REF_CONTEXT members, but a HAND-WRITTEN block could carry an
// out-of-enum value and pass un-judged - the consumer validates against the same
// EXPORTED closed sets (never re-declared here). Returns error strings.
function anchorEnumViolations(anchor) {
  const out = [];
  if (!anchor || typeof anchor !== 'object') return out;
  if (inv.MODES.indexOf(anchor.mode) === -1) {
    out.push('anchor.mode ' + JSON.stringify(anchor.mode) + ' outside the closed set [' + inv.MODES.join(', ') + '] (D-004.3)');
  }
  if (inv.REF_CONTEXT.indexOf(anchor.ref_context) === -1) {
    out.push('anchor.ref_context ' + JSON.stringify(anchor.ref_context) + ' outside the closed set [' + inv.REF_CONTEXT.join(', ') + '] (D-004.4)');
  }
  return out;
}

// DRIFT OBSERVATION (D-002.5): a same-tree OTHER-run artifact whose member set
// differs from the block's. Yellow disclosure only - never red. Returns null
// when there is no such artifact or the member sets agree.
function driftDisclosure(surface, anchorTreeSha, ownRunId, claimRows, opts) {
  const list = (opts && opts.artifacts) || artifactsFor(surface);
  const other = list.find(function (a) {
    return a.artifact && a.artifact.complete === true &&
      a.artifact.tree_sha === anchorTreeSha && a.artifact.run_id !== ownRunId;
  });
  if (!other) return null;
  const diff = inv.diffMemberSets(claimRows, rowsForSurface(other.artifact.rows, surface));
  if (diff.equal) return null;
  return { severity: 'warning', file: other.file, artifact: other.artifact, diff: diff };
}

function main() {
  // ADR-0058 R8 / grill-t38 R3: the registry entry HAS landed (docs/gates.json
  // name 'status-inventory', order 235), so the capability probe resolves through
  // the registry (single source of truth) rather than an inline array. The probe
  // runs BEFORE the leg's own reads (ADR-0040 D2).
  requireCapabilities('status-inventory');
  const errors = [];
  const freshnessErrors = [];
  const ratchetErrors = [];
  const warnings = [];
  const unverifiable = [];

  const regErr = assertLegIsLast(REGISTRY_REL);
  if (regErr && regErr.error) { console.error('FAIL: ' + regErr.error); process.exit(1); }
  if (regErr && regErr.warn) console.log('::warning title=' + SELF_LEG + '::' + regErr.warn);

  const reg = registrationCommit();
  // No landing commit yet (pre-registration standalone run): the prospective
  // scope anchor does not exist, so every sentinel carrier is in scope -
  // warn and continue rather than fail on a bootstrap artefact.
  const regMs = reg ? Number(git(['log', '-1', '--format=%ct', reg])) * 1000 : null;
  if (!reg) console.log('::warning title=' + SELF_LEG + '::no registration commit for ' + SELF_REL + ' yet (lands this round); all sentinel carriers judged in scope');

  // The anchor-convention registration (ADR-0096 add commit). 0 = BOOTSTRAP:
  // no post-registration malformed judgment; every absent-anchor block is
  // legacy + warning.
  const anchorRegMs = anchorConventionMs();
  if (anchorRegMs === 0) console.log('::warning title=' + SELF_LEG + '::anchor convention not registered (docs/adr/0096-* pending); blocks lacking anchor are judged via the legacy run_id path');

  const loaded = roles.loadRegistry(ROOT);
  if (loaded.parseError || !loaded.registry) {
    console.error('FAIL: status-inventory: ' + (loaded.parseError || 'claim-surface role registry not found at ' + roles.REGISTRY_REL) +
      ' - the report selector reads the registry, so an unreadable declared surface is a FAIL, not an empty candidate set');
    process.exit(1);
  }

  // Candidates: registered claim artifacts (registry consumption, never
  // filename matching) in prospective scope that CARRY a sentinel block -
  // marker followed by the json fence. A bare marker mention in prose (a
  // taskbook documenting the convention) is not a carrier; fail-closed on
  // marker-without-fence applies only once a file IS the selected subject.
  const CARRIER_RE = /<!--\s*status-inventory\s+v1\s*-->\s*```json/;
  const candidates = [];
  for (const rel of roles.registeredPaths(loaded.registry)) {
    const abs = path.join(ROOT, rel.split('/').join(path.sep));
    if (!/\.md$/.test(rel) || !fs.existsSync(abs)) continue;
    const ms = firstCommitMs(rel);
    if (regMs !== null && ms && ms < regMs) continue; // predates the convention - never retro-convicted
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { continue; }
    if (!CARRIER_RE.test(text)) continue;
    candidates.push({ rel: rel, ms: ms || fs.statSync(abs).mtimeMs });
  }
  if (!candidates.length) {
    console.log('[status-inventory] OK: no in-scope claim artifact carries a ' + inv.SENTINEL +
      ' block yet (the convention applies forward from ' + (reg ? reg.slice(0, 9) : 'the pending registration commit') + ')');
    process.exit(0);
  }
  candidates.sort(function (a, b) { return b.ms - a.ms; });
  const subject = candidates[0];
  const text = fs.readFileSync(path.join(ROOT, subject.rel.split('/').join(path.sep)), 'utf8');
  const parsed = inv.extractSentinels(text);
  for (const e of parsed.errors) errors.push(subject.rel + ': ' + e);
  if (!parsed.blocks.length) {
    console.error('FAIL: ' + subject.rel + ': sentinel marker found but no parseable block');
    process.exit(1);
  }

  const head = git(['rev-parse', 'HEAD']);
  const blockMs = firstCommitMs(subject.rel);

  for (const h of parsed.blocks) {
    const block = h.block;
    const tag = subject.rel + ' block@' + h.offset;
    if (typeof block.emitted_at !== 'string' || !block.emitted_at) {
      errors.push(tag + ': emitted_at missing (freshness is self-described, D-005.4)');
    }
    const jkv = joinKeyVersionDisposition(block.normalized_join_key_version);
    if (!jkv.ok) {
      errors.push(tag + ': normalized_join_key_version ' + JSON.stringify(block.normalized_join_key_version) +
        ' is neither the current ' + inv.JOIN_KEY_VERSION + ' nor a registered legacy grammar [' +
        inv.LEGACY_JOIN_KEY_VERSIONS.join(', ') + '] - the join-key grammar moved; re-render the block');
      continue;
    }
    if (jkv.legacy) {
      // D-001.3 / P1-8: a legacy-grammar block is still VERIFIED (legacy path),
      // disclosed as a yellow ::warning, never hard-failed.
      warnings.push(tag + ': normalized_join_key_version ' + JSON.stringify(block.normalized_join_key_version) +
        ' is the pre-' + inv.JOIN_KEY_VERSION + ' legacy grammar; still verified via the legacy path (re-render to ' + inv.JOIN_KEY_VERSION + ')');
    }
    if (!inv.sentinelSelfConsistent(block)) {
      errors.push(tag + ': rows_digest does not recompute over the declared rows (hand-edited snapshot)');
      continue;
    }
    const parts = String(block.run_id).split('.');
    const surface = parts[0];
    const runIdTree = parts[1];
    if (!/^[0-9a-f]{7,40}$/.test(runIdTree || '')) {
      errors.push(tag + ': run_id tree_sha absent or malformed (' + JSON.stringify(block.run_id) + ')');
      continue;
    }

    // P1-9 (D-004.3/.4): consumer-side closed-enum validation of the anchor
    // fields - a hand-written out-of-enum mode/ref_context must not pass.
    const enumErrs = anchorEnumViolations(block.anchor);
    if (enumErrs.length) {
      for (const e of enumErrs) errors.push(tag + ': ' + e);
      continue;
    }

    // DISAMBIGUATION (D-004.2). The anchor judgment never reverse-derives
    // tree_sha from run_id: when an anchor is present the anchor's tree is the
    // authority; a disagreement is an independent red; an absent anchor is
    // legacy (pre-registration/bootstrap) or malformed (post-registration).
    const cls = classifyBlockAnchor(block, { anchorRegMs: anchorRegMs, blockMs: blockMs });
    if (cls.kind === 'mismatch') {
      errors.push(tag + ': ' + cls.reason + ' - anchor.tree_sha ' + JSON.stringify(cls.anchorTree) +
        ' != run_id tree segment ' + JSON.stringify(cls.runIdTree) + ' (emission self-contradiction, D-004.2 rule 2)');
      continue;
    }
    if (cls.kind === 'backfilled') {
      errors.push(tag + ': ' + cls.reason + ' - block carrier predates the anchor-convention registration but carries an anchor; the anchor could only have been back-filled (D-001.8\u2461, forward-only)');
      continue;
    }
    if (cls.kind === 'malformed') {
      errors.push(tag + ': ' + cls.reason + ' - post-registration block carries no anchor (D-004.2 rule 3)');
      continue;
    }
    const anchorTreeSha = cls.treeSha;

    if (cls.kind === 'legacy') {
      // LEGACY run_id path (D-004.2 rule 3): the block predates the anchor
      // convention, so the STRICT anchor assertion does not apply - a legacy
      // run_id tree is the ephemeral GitButler workspace HEAD, rewritten by
      // every lane mutation, and strict ancestry would mint a false red
      // (D-002.7 "restack = false red"). Keep the pre-anchor freshness check
      // (HEAD-or-ancestor-or-resolvable) and disclose the legacy judgment.
      warnings.push(tag + ': ' + cls.reason + ' - block predates the anchor convention; freshness judged via the legacy run_id path (D-004.2 rule 3)');
      if (anchorTreeSha !== head && !gitBool(['merge-base', '--is-ancestor', anchorTreeSha, 'HEAD'])) {
        if (!gitBool(['cat-file', '-e', anchorTreeSha + '^{commit}'])) {
          // D-002.7 restack/clone seam: the anchor sha no longer resolves in
          // this repo (a rewrite, or a clone without the local object). A
          // missing object is an INSTRUMENT condition, not a lie by the block
          // - yellow disclosure, and the surface degrades to UNVERIFIABLE
          // (exit 2) rather than a fabricated red.
          warnings.push(tag + ': run_id tree_sha ' + String(anchorTreeSha).slice(0, 9) + ' does not resolve in this repo (restack, or a clone without the local object) - yellow disclosure (D-002.7)');
          unverifiable.push(surface + ' (anchor tree_sha ' + String(anchorTreeSha).slice(0, 9) + ' unresolvable in this repo)');
          continue;
        }
        // A RESOLVABLE foreign tree is tolerated on the legacy path: the
        // GitButler workspace HEAD is ephemeral and rewritten by every lane
        // mutation, so strict ancestry would mint a false red (D-002.7). The
        // legacy ::warning above already discloses that this block was judged
        // by the pre-anchor rule.
      }
    } else {
      // ASSERTION ② (DATE domain, D-002.1/.5/.6/.7): the strict freshness
      // assertion, evaluated on anchor.tree_sha. Independent reason
      // vocabulary; yellow for restack-unresolvable and for a degraded
      // carrier, red for an ancestor violation or a claim mutation inside the
      // interval.
      const fresh = freshnessAssertion(anchorTreeSha, subject.rel, { git: git, gitBool: gitBool, head: head });
      if (fresh.yellow) warnings.push(tag + ': ' + fresh.yellow + ' - ' + fresh.detail);
      if (fresh.degraded) warnings.push(tag + ': carrier undetermined; freshness interval upper bound degraded to HEAD@run (D-002.6)');
      if (fresh.red) freshnessErrors.push(tag + ': ' + fresh.reason + ' - ' + fresh.detail);
      // RATCHET (D-001.7, P0-5): the INDEPENDENT, UNBOUNDED freshness assertion
      // - the anchor tree's last claim-surface mutation must be <= emitted_at.
      // Its own reason vocabulary entry and its own error line, separate from
      // the bounded interval assertion above.
      const ratchet = freshnessRatchet(anchorTreeSha, block.emitted_at, { git: git });
      if (ratchet.red) ratchetErrors.push(tag + ': ' + ratchet.reason + ' - ' + ratchet.detail);
    }

    // ASSERTION ① (TRUTH domain): member reconcile against the artifact the
    // block's OWN run_id addresses (addressing authority, prefer-HEAD gone).
    const own = pickByRunId(surface, block.run_id, { artifacts: artifactsFor(surface) });
    if (!own) {
      unverifiable.push(surface + ' (no complete artifact for its own run_id ' + block.run_id + ')');
      continue;
    }
    const claimRows = rowsForSurface(block.rows, surface);
    const truthRows = rowsForSurface(own.artifact.rows, surface);
    const diff = inv.diffMemberSets(claimRows, truthRows);
    if (!diff.equal) {
      errors.push(tag + ': member-level drift on surface ' + surface +
        ' - report-only: [' + diff.only_a.map(fmtRow).join('; ') + '] vs own-run-artifact-only: [' + diff.only_b.map(fmtRow).join('; ') + ']' +
        ' (regenerate the block from its own run: node scripts/build-status-sentinel.js)');
    }

    // DRIFT OBSERVATION (D-002.5): prefer-HEAD abolished -> a same-tree
    // OTHER-run artifact that disagrees is a yellow disclosure, never a red.
    const drift = driftDisclosure(surface, anchorTreeSha, block.run_id, claimRows, { artifacts: artifactsFor(surface) });
    if (drift) {
      warnings.push(tag + ': drift disclosure - same-tree other-run artifact ' + drift.artifact.run_id +
        ' differs: [' + drift.diff.only_a.map(fmtRow).join('; ') + '] vs [' + drift.diff.only_b.map(fmtRow).join('; ') + '] (flaky/env, not a transcription error)');
    }
  }

  for (const w of warnings) console.log('::warning title=' + SELF_LEG + '::' + w);

  if (errors.length || freshnessErrors.length || ratchetErrors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    for (const e of freshnessErrors) console.error('FAIL: ' + e);
    for (const e of ratchetErrors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  if (unverifiable.length) {
    // Exit-2 honesty (P2-16): the cause is an underivable own-run artifact, NOT
    // a missing capability - the leg's declared capability (repo-tree) IS
    // present. Restore the honest ::error line while still routing exit 2
    // through a shared helper (this gate carries zero raw exit-2 sites, the
    // adr-0041 wiring pin).
    exitUnverifiableReason(SELF_LEG, 'own-run-artifact-absent',
      'judged ' + subject.rel + ' on derivable surfaces; underivable: ' + unverifiable.join(', '));
  }
  console.log('[' + SELF_LEG + '] OK: ' + subject.rel + ' status-inventory block(s) reconcile member-level against the artifact their own run_id addresses');
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  extractSentinels: inv.extractSentinels,
  pickDerivation,
  pickByRunId,
  classifyBlockAnchor,
  driftDisclosure,
  freshnessAssertion,
  freshnessRatchet,
  joinKeyVersionDisposition,
  anchorEnumViolations,
  anchorConventionMs,
  rowsForSurface,
  isObserverRow,
  assertLegIsLast,
  OBSERVER_NAMES,
  ANCHOR_REASONS,
  FRESHNESS_REASONS,
};
