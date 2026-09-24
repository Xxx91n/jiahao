'use strict';
// scripts/evidence-freshness.js — ADR-0085 two-layer anchor semantics.
//
// Single source for the evidence-freshness invariant (D-005): anchoring
// classification, claim-point detection, seal resolution, evaluate-at-commit.
// Lives on the R2 machinery surface (scripts/) — NOT src/shared/ (the R1
// require chain is the shipped product). Round-scoped wiring suites carry
// {round, base} config + assertions only; the walk is never re-rolled per
// suite.
//
// Metz fallback clause (D-005 hedge 3): a round needing genuinely different
// walk semantics DECLARES the deviation in its decision ledger and inlines a
// local implementation in its own suite — never pile conditionals into this
// shared file.
//
// Two anchor notions, deliberate (grill-t26 D-002/D-003):
//   floor-anchor (claim-point, upper layer): the last commit strictly before
//     the claim commit touching a non-exempt, non-claim file. A claim asserts
//     state — it does not change what the evidence must be fresh against, so
//     pure-claim commits never raise the floor (the treadmill fix).
//   seal-anchor (terminal, lower layer): the last commit touching any
//     non-exempt file, claims included — the seal pins the round's last
//     substantive act, not the tip.
// File classes are registered in docs/governance/surface-taxonomy.json
// ("freshness" block) — this module reads that registry; it does not carry a
// private copy. Classification order: evidence > seal > bookkeeping > regen >
// claim > anchoring. Anything unclassified is anchoring (fail-closed).

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const HEAD_RE = /^captured-at-head: ([0-9a-f]{7,40})$/;
const CAPTURE_RE = /\.(txt|md)$/;
const FIXTURE_RE = /\.fixture\./;
const WORKSPACE_SUBJECT = 'GitButler Workspace Commit';
// Claim-like heuristic for the unregistered-claim warning (D-003 hedge 4):
// verdict-shaped filenames under a round dir that escaped the closed enum.
const CLAIM_LIKE_RE = /(?:^|\/)[^/]*(?:report|handoff|audit|verdict|closeout|signoff|attest)[^/]*\.(?:md|txt)$/i;

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
function gitOk(root, args) {
  return spawnSync('git', args, { cwd: root }).status === 0;
}

function loadFreshness(root) {
  const tax = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'governance', 'surface-taxonomy.json'), 'utf8'));
  if (!tax.freshness) throw new Error('surface-taxonomy.json lacks the freshness block (ADR-0085 registration missing)');
  return tax.freshness;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Build the compiled class table from the registered taxonomy block.
function classifiers(fresh) {
  const rr = '\\.scratch/grill-[^/]+/';
  const na = fresh.non_anchoring_classes;
  const bookTerms = na.round_bookkeeping.map(escRe)
    .concat((na.round_bookkeeping_glob || []).map((g) => escRe(g).replace(/\\\*/g, '[^/]*')));
  return {
    evidence: new RegExp('^' + rr + '(?:' + na.evidence_dirs.map(escRe).join('|') + ')'),
    seal: new RegExp('^' + rr + escRe(na.seal_file) + '$'),
    bookkeeping: new RegExp('^' + rr + '(?:' + bookTerms.join('|') + ')$'),
    regen: new Set(na.mechanism_regen_outputs),
    claim: new RegExp('^' + rr + '(?:' + fresh.claim_surfaces.closed_enum.map(escRe).join('|') + ')'),
    claimDirs: fresh.claim_surfaces.closed_enum,
  };
}

// evidence > seal > bookkeeping > regen > claim > anchoring
function classifyFile(f, cx) {
  if (cx.evidence.test(f)) return 'evidence';
  if (cx.seal.test(f)) return 'seal';
  if (cx.bookkeeping.test(f)) return 'bookkeeping';
  if (cx.regen.has(f)) return 'regen';
  if (cx.claim.test(f)) return 'claim';
  return 'anchoring';
}

function commitFiles(root, sha) {
  try {
    return git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', sha]).split('\n').filter(Boolean);
  } catch (e) {
    return []; // merge commits produce no first-parent diff listing
  }
}

// classes: Set of per-file classes; anchoring = has a hard-anchoring file;
// substantive = anchoring OR claim (the seal counts the round's last act).
function commitInfo(root, sha, cx) {
  const files = commitFiles(root, sha);
  const classes = new Set(files.map((f) => classifyFile(f, cx)));
  return {
    sha,
    files,
    anchoring: classes.has('anchoring'),
    substantive: classes.has('anchoring') || classes.has('claim'),
  };
}

// rev-list <range>, newest first, ephemeral GitButler workspace commits dropped.
function walk(root, range) {
  return git(root, ['rev-list', range]).split('\n').filter(Boolean)
    .filter((sha) => !git(root, ['log', '--format=%s', '-1', sha]).startsWith(WORKSPACE_SUBJECT));
}

// Last commit in base..ref with a hard-anchoring file (pure claims excluded).
function lastFloorAnchor(root, cx, base, ref) {
  for (const sha of walk(root, base + '..' + ref)) {
    if (commitInfo(root, sha, cx).anchoring) return sha;
  }
  return null;
}

// Last commit in base..ref with any non-exempt file (claims count) — the
// seal-anchor derivation. ref is inclusive (BASE..D names the declaration).
function lastSealAnchor(root, cx, base, ref) {
  for (const sha of walk(root, base + '..' + ref)) {
    if (commitInfo(root, sha, cx).substantive) return sha;
  }
  return null;
}

// A claim commit OF round `dir`: a file under <dir>/<claim-surface> that is
// not excepted (the next-round taskbook is bookkeeping, not a claim).
function isClaimFor(dir, cx) {
  return (f) => cx.claimDirs.some((d) => f.startsWith(dir + '/' + d)) && classifyFile(f, cx) === 'claim';
}

function showAt(root, ref, file) {
  try {
    return git(root, ['show', ref + ':' + file]);
  } catch (e) {
    return null;
  }
}

// Committed captures under <evd> in the tree AT ref, with header sha per file.
function capturesAt(root, ref, evd) {
  const files = git(root, ['ls-tree', '-r', ref, '--name-only', '--', evd])
    .split('\n').filter(Boolean)
    .filter((f) => CAPTURE_RE.test(f) && !FIXTURE_RE.test(f));
  return files.map((f) => {
    const content = showAt(root, ref, f);
    const first = content === null ? '' : content.split(/\r?\n/)[0];
    const m = first.match(HEAD_RE);
    return { file: f, sha: m ? m[1] : null };
  });
}

function resolvesToCommit(root, sha) {
  try {
    return git(root, ['cat-file', '-t', sha]) === 'commit';
  } catch (e) {
    return false;
  }
}

function parseSeal(text) {
  if (text === null) return null;
  const seal = (text.match(/^seal:\s*([0-9a-f]{7,40})$/m) || [])[1] || null;
  const rec = (text.match(/^recorded_at:\s*(\S+)$/m) || [])[1] || null;
  return { seal, recorded_at: rec };
}

function tagState(root, roundId, declared) {
  const tag = 'adjudicated/' + roundId;
  const ref = 'refs/tags/' + tag;
  let target = null;
  try {
    target = git(root, ['rev-parse', '-q', '--verify', ref + '^{commit}']);
  } catch (e) {
    target = null;
  }
  if (!target) return { tag, state: 'absent', target: null, messageHasSha: null };
  let messageHasSha = null;
  try {
    messageHasSha = git(root, ['tag', '-l', '--format=%(contents)', tag]).indexOf(declared) !== -1;
  } catch (e) { /* stays null */ }
  return { tag, state: target === declared ? 'co-named' : 'drift', target, messageHasSha };
}

// Unregistered claim-like committed files under the round dir (warning signal,
// not a failure — the fail-closed SIGNAL is the requirement, D-003 hedge 4).
function unregisteredClaims(root, cx, dir) {
  const tracked = git(root, ['ls-tree', '-r', 'HEAD', '--name-only', '--', dir])
    .split('\n').filter(Boolean);
  return tracked.filter((f) => {
    const k = classifyFile(f, cx);
    return (k === 'anchoring') && CLAIM_LIKE_RE.test(f);
  });
}

// Evaluate one round-scoped suite at HEAD.
// cfg: { id: 'grill-tNN', base: '<round base sha>' }
// Returns a structured verdict; suites assert on the parts they pin.
function evaluateRound(root, fresh, cfg) {
  const cx = classifiers(fresh);
  const dir = '.scratch/' + cfg.id;
  const evd = dir + '/evidence';
  const sealPath = dir + '/' + fresh.non_anchoring_classes.seal_file;
  const claimOfRound = isClaimFor(dir, cx);

  const commits = walk(root, cfg.base + '..HEAD');

  // Upper layer — claim-point evaluation (D-003): at each claim commit C,
  // every capture committed in <evd> at C names a sha >= the floor anchor
  // strictly before C (floor := last hard-anchoring commit; BASE if none).
  const claims = commits
    .filter((sha) => commitFiles(root, sha).some(claimOfRound))
    .reverse()
    .map((sha) => {
      const floor = lastFloorAnchor(root, cx, cfg.base, sha + '^') || cfg.base;
      const caps = capturesAt(root, sha, evd);
      const bad = [];
      for (const cap of caps) {
        if (!cap.sha) { bad.push({ file: cap.file, reason: 'no captured-at-head header' }); continue; }
        if (!resolvesToCommit(root, cap.sha)) { bad.push({ file: cap.file, reason: 'header sha not a commit: ' + cap.sha }); continue; }
        if (!gitOk(root, ['merge-base', '--is-ancestor', floor, cap.sha])) {
          bad.push({ file: cap.file, reason: 'header ' + cap.sha.slice(0, 9) + ' < floor ' + floor.slice(0, 9) });
        }
      }
      return { commit: sha, floor, total: caps.length, bad };
    });

  // Lower layer — seal resolution + declaration validity (D-002/D-004).
  const sealText = showAt(root, 'HEAD', sealPath);
  const parsed = parseSeal(sealText);
  let seal = { present: false };
  if (parsed) {
    const touches = git(root, ['log', '--format=%H', '--', sealPath]).split('\n').filter(Boolean);
    const added = git(root, ['log', '--diff-filter=A', '--format=%H', '--', sealPath]).split('\n').filter(Boolean);
    const declarationCommit = added.length ? added[0] : null;
    const expected = declarationCommit ? lastSealAnchor(root, cx, cfg.base, declarationCommit) : null;
    // Terminal wave: captures in the tree AT the declaration commit must
    // satisfy the declared anchor.
    const sealBad = [];
    if (declarationCommit) {
      for (const cap of capturesAt(root, declarationCommit, evd)) {
        if (!cap.sha || !gitOk(root, ['merge-base', '--is-ancestor', parsed.seal, cap.sha])) {
          sealBad.push({ file: cap.file, sha: cap.sha });
        }
      }
    }
    // Freeze: no commit after the declaration may touch the sealed evidence
    // dir or re-amend the SEAL file (regression-sentinel role, D-004).
    const postSeal = declarationCommit ? walk(root, declarationCommit + '..HEAD') : [];
    const freezeViolations = postSeal.filter((sha) =>
      commitFiles(root, sha).some((f) => f.startsWith(evd + '/') || f === sealPath));
    seal = {
      present: true,
      declared: parsed.seal,
      recorded_at: parsed.recorded_at,
      declarationCommit,
      amended: touches.length > 1,
      expectedAnchor: expected,
      inFlightClean: expected !== null && expected === parsed.seal,
      capturesAtSealOk: sealBad.length === 0,
      sealBad,
      freezeViolations,
      tag: parsed.seal ? tagState(root, cfg.id, parsed.seal) : null,
    };
  }

  return {
    round: cfg.id,
    base: cfg.base,
    claims,
    seal,
    unregisteredClaims: unregisteredClaims(root, cx, dir),
  };
}

function roundConfig(fresh, id) {
  const row = (fresh.rounds || []).find((r) => r.id === id);
  if (!row) throw new Error('round not registered in taxonomy freshness.rounds: ' + id);
  return row;
}

module.exports = {
  HEAD_RE,
  loadFreshness,
  classifiers,
  classifyFile,
  commitInfo,
  walk,
  lastFloorAnchor,
  lastSealAnchor,
  capturesAt,
  parseSeal,
  tagState,
  evaluateRound,
  roundConfig,
};
