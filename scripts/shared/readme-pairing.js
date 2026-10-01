'use strict';
// scripts/shared/readme-pairing.js - ADR-0092 D-P1 (grill-t35 D-006): the
// README/zh-CN same-commit pairing scan, extracted as a shared core so the
// wiring test, scripts/check-post-land.js and the baseline generator all
// evaluate ONE function. Zero sha names appear in the assertion logic - the
// scan is a property of the published line, so a restack that renames every
// sha cannot invalidate it (restack-immune by construction).
//
// The rule (D-006 normalized requirement): enumerate every commit on the
// published line whose changed-file set contains README.md; assert the same
// changed-file set also contains README-zh-CN.md. Zero sha names, no wash
// window, and it closes the three-step legal-laundering hole D-006 names:
// 'move README alone -> patch zh -> re-pin' leaves the first commit
// permanently unpaired no matter what the later commits do.
//
// Historical backlog (the industry-standard baseline/ratchet shape, confirmed
// by the grill-t35 research pass): a forward-only registration anchor bounds
// the range, and the pre-anchor violations INSIDE the range are enumerated
// into a COMMITTED, monotonically-shrinking baseline file. The baseline is
// validated, not trusted:
//   - every entry must still be a real unpaired commit (no stale rows);
//   - every real violation must be in the baseline (no unsuppressed drift);
//   - entries may only be REMOVED (ratchet), never added - a new violation
//     fails until it is registered, which is the moment a human looks at it.
// There is no prose waiver channel: the baseline is tool-computable and
// diffable, and every entry names a sha that a machine re-verifies.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASELINE_REL = 'docs/governance/readme-pairing-baseline.json';
const ANCHOR_REL = 'docs/adr/0079-bilingual-readme-mirror-convention.md';
const EN = 'README.md';
const ZH = 'README-zh-CN.md';

const gitAt = (root) => (args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

// The commit that introduced the convention - the forward-only registration
// anchor. Commits before it are exempt; history is never rewritten.
function registrationAnchor(root) {
  const adds = gitAt(root)(['log', '--diff-filter=A', '--format=%H', '--', ANCHOR_REL])
    .split('\n').filter(Boolean);
  return adds.length ? adds[adds.length - 1] : null;
}

// Oldest-first commit list on the published line from the anchor forward.
// Full ancestry, NOT --first-parent: D-006 says "every commit on the published
// line that touches README.md". A README-only change that arrived through a
// merge is still a README-only change in the public history, so restricting to
// the first-parent chain would exempt exactly the commits a restack can hide.
function rangeCommits(root, anchor, tip) {
  const parented = (function () {
    try { return gitAt(root)(['rev-parse', '-q', '--verify', anchor + '^']) !== ''; }
    catch (e) { return false; }
  })();
  const range = parented ? anchor + '^..' + tip : tip;
  return gitAt(root)(['log', '--reverse', '--no-merges', '--format=%H', range])
    .split('\n').filter(Boolean);
}

// One pass over the range instead of two spawns per commit: 'git log
// --name-only' emits a commit header then its changed-file list. A merge commit
// contributes no changed files of its own (its content arrived from a parent),
// which is why --no-merges above is a correctness choice, not just speed.
function rangeChangedFiles(root, shas) {
  if (!shas.length) return new Map();
  const out = gitAt(root)(['log', '--reverse', '--no-merges', '--name-only',
    '--format=%x00%H%x00%s', shas[0] + '^..' + shas[shas.length - 1]]);
  const map = new Map();
  let sha = null, subject = null, inHeader = false;
  for (const line of out.split('\n')) {
    if (line.charAt(0) === '\u0000') {
      const parts = line.split('\u0000');
      sha = parts[1] || null;
      subject = parts.slice(2).join('\u0000') || '';
      inHeader = true;
      if (sha && !map.has(sha)) map.set(sha, { subject: subject, files: [] });
      continue;
    }
    inHeader = false;
    const f = line.trim();
    if (!f || !sha || !map.has(sha)) continue;
    map.get(sha).files.push(f);
  }
  return map;
}

function changedFiles(root, sha) {
  return gitAt(root)(['show', '--name-only', '--format=', sha])
    .split('\n').map((s) => s.trim()).filter(Boolean);
}

// Every commit in range whose changed set touches README.md but NOT the
// mirror. Sorted oldest-first for a stable baseline diff.
function scanViolations(root, opts) {
  const o = opts || {};
  const anchor = o.anchor || registrationAnchor(root);
  if (!anchor) return { anchor: null, violations: [], scanned: 0 };
  const tip = o.tip || 'HEAD';
  const shas = rangeCommits(root, anchor, tip);
  const batch = rangeChangedFiles(root, shas);
  const violations = [];
  for (const sha of shas) {
    const row = batch.get(sha);
    const files = row ? row.files : [];
    if (files.indexOf(EN) === -1) continue;
    if (files.indexOf(ZH) !== -1) continue;
    violations.push({ sha: sha, subject: row ? row.subject : '' });
  }
  return { anchor: anchor, violations: violations, scanned: shas.length };
}

// Baseline -> Set of shas. Fail-closed on a malformed file.
function loadBaseline(root) {
  const p = path.join(root, BASELINE_REL.split('/').join(path.sep));
  if (!fs.existsSync(p)) return null;
  const b = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(b.entries)) throw new Error(BASELINE_REL + ' entries must be an array');
  return b;
}

// Reconcile the live scan against the committed baseline. Returns errors;
// empty means reconciled. Three failure classes, all fail-closed:
//   unsuppressed  - a real violation with no baseline row (the ratchet bites)
//   stale         - a baseline row that is no longer a violation (rows must
//                   be REMOVED as history is remediated; a stale row is the
//                   classic baseline rot that hides a reintroduced bug)
//   anchor        - the baseline's recorded anchor disagrees with the
//                   derived one (the baseline was written against a
//                   different registration point)
function reconcile(root, opts) {
  const o = opts || {};
  const errors = [];
  const live = scanViolations(root, o);
  if (!live.anchor) { errors.push('readme-pairing: registration anchor not found (' + ANCHOR_REL + ' never landed?)'); return { errors, live }; }
  const baseline = (o.baseline !== undefined) ? o.baseline : loadBaseline(root);
  if (!baseline) {
    errors.push('readme-pairing: ' + BASELINE_REL + ' absent - generate it (node scripts/build-readme-pairing-baseline.js); without the committed backlog the assertion cannot distinguish history from drift');
    return { errors, live };
  }
  if (baseline.anchor && baseline.anchor !== live.anchor) {
    errors.push('readme-pairing: baseline anchor ' + String(baseline.anchor).slice(0, 9) + ' != derived anchor ' + live.anchor.slice(0, 9) + ' - the baseline was written against a different registration point');
  }
  const baselined = new Set((baseline.entries || []).map((e) => e.sha));
  for (const v of live.violations) {
    if (!baselined.has(v.sha)) {
      errors.push('readme-pairing: ' + v.sha.slice(0, 9) + ' touches ' + EN + ' without ' + ZH + ' in the same commit and is not in the baseline - a README edit owes the mirror the same-commit sync (ADR-0079 D6). Register it deliberately or land the mirror update.');
    }
  }
  const liveSet = new Set(live.violations.map((v) => v.sha));
  for (const e of (baseline.entries || [])) {
    if (!liveSet.has(e.sha)) {
      errors.push('readme-pairing: baseline row ' + String(e.sha).slice(0, 9) + ' is no longer a violation (stale) - remove the row; a stale row masks a reintroduced drift of the same commit');
    }
  }
  return { errors, live };
}

module.exports = {
  BASELINE_REL, ANCHOR_REL, EN, ZH,
  registrationAnchor, rangeCommits, changedFiles,
  scanViolations, loadBaseline, reconcile,
};
