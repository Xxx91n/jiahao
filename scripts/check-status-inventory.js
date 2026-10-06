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
const { requireCapabilities, exitUnverifiable } = require('../src/shared/capability');
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
  LEGACY: 'legacy_run_id_path',
});
const FRESHNESS_REASONS = Object.freeze({
  ANCHOR_NOT_ANCESTOR: 'anchor_not_ancestor_of_carrier',
  CLAIM_MUTATION: 'claim_mutation_in_interval',
  ANCHOR_UNRESOLVABLE: 'anchor_unresolvable',
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

// LEGACY HELPER (kept exported for backward compatibility - the pre-anchor
// selection: HEAD-tree derivation first, then the claimed tree). It is NO
// LONGER on the assertion path (D-002.5 prefer-HEAD abolition); the assertion
// domain selects by run_id via pickByRunId below. Retained so the historical
// selection contract stays importable and testable.
// grill-t37 rework F-4: only complete===true artifacts are derivation truth.
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
//   { kind:'malformed', reason }        - post-registration block with no anchor
//   { kind:'legacy', treeSha, reason }  - pre-registration (or bootstrap) block
// ctx: { anchorRegMs, blockMs }.
function classifyBlockAnchor(block, ctx) {
  const c = ctx || {};
  const runIdTree = String(block.run_id).split('.')[1];
  const anchor = block.anchor;
  if (anchor && typeof anchor === 'object') {
    if (anchor.tree_sha !== runIdTree) {
      return { kind: 'mismatch', reason: ANCHOR_REASONS.MISMATCH, runIdTree: runIdTree, anchorTree: anchor.tree_sha, treeSha: null };
    }
    return { kind: 'anchored', treeSha: anchor.tree_sha };
  }
  const anchorRegMs = c.anchorRegMs || 0;
  const blockMs = c.blockMs || 0;
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
  // ADR-0058 R8 inline declaration until the registry entry lands with its
  // ADR (the leg's gates.json row is a Declaration-surface change): probe the
  // capabilities this leg actually needs, don't fake a registry identity.
  requireCapabilities('status-inventory');
  const errors = [];
  const freshnessErrors = [];
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
    if (block.normalized_join_key_version !== inv.JOIN_KEY_VERSION) {
      errors.push(tag + ': normalized_join_key_version ' + JSON.stringify(block.normalized_join_key_version) +
        ' != ' + inv.JOIN_KEY_VERSION + ' - the join-key grammar moved; re-render the block');
      continue;
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
      if (anchorTreeSha !== head && !gitBool(['merge-base', '--is-ancestor', anchorTreeSha, 'HEAD']) && !gitBool(['cat-file', '-e', anchorTreeSha + '^{commit}'])) {
        errors.push(tag + ': run_id tree_sha ' + String(anchorTreeSha).slice(0, 9) + ' is not HEAD, an ancestor, or a resolvable commit - a foreign-tree block cannot speak for this tree');
        continue;
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
      const fmt = function (r) { return r.join_key + ' [' + r.status + (r.reason_code ? '/' + r.reason_code : '') + ']'; };
      errors.push(tag + ': member-level drift on surface ' + surface +
        ' - report-only: [' + diff.only_a.map(fmt).join('; ') + '] vs own-run-artifact-only: [' + diff.only_b.map(fmt).join('; ') + ']' +
        ' (regenerate the block from its own run: node scripts/build-status-sentinel.js)');
    }

    // DRIFT OBSERVATION (D-002.5): prefer-HEAD abolished -> a same-tree
    // OTHER-run artifact that disagrees is a yellow disclosure, never a red.
    const drift = driftDisclosure(surface, anchorTreeSha, block.run_id, claimRows, { artifacts: artifactsFor(surface) });
    if (drift) {
      const fmt = function (r) { return r.join_key + ' [' + r.status + (r.reason_code ? '/' + r.reason_code : '') + ']'; };
      warnings.push(tag + ': drift disclosure - same-tree other-run artifact ' + drift.artifact.run_id +
        ' differs: [' + drift.diff.only_a.map(fmt).join('; ') + '] vs [' + drift.diff.only_b.map(fmt).join('; ') + '] (flaky/env, not a transcription error)');
    }
  }

  for (const w of warnings) console.log('::warning title=' + SELF_LEG + '::' + w);

  if (errors.length || freshnessErrors.length) {
    for (const e of errors) console.error('FAIL: ' + e);
    for (const e of freshnessErrors) console.error('FAIL: ' + e);
    process.exit(1);
  }
  if (unverifiable.length) {
    // Exit-2 honesty: the leg ran, one or more surfaces had no own-run
    // re-derivation to judge against. Non-blocking, ::error-annotated.
    console.log('[' + SELF_LEG + '] UNVERIFIABLE: judged ' + subject.rel + ' on derivable surfaces; underivable: ' + unverifiable.join(', '));
    exitUnverifiable(SELF_LEG, 'repo-tree');
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
  anchorConventionMs,
  rowsForSurface,
  isObserverRow,
  assertLegIsLast,
  OBSERVER_NAMES,
  ANCHOR_REASONS,
  FRESHNESS_REASONS,
};
