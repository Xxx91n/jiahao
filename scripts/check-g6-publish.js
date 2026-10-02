#!/usr/bin/env node
'use strict';

// scripts/check-g6-publish.js - ADR-0064 D-E + ADR-0065 D-B.3: the G6
// PUBLISH gate. JS-only, wired into prepublishOnly; it replays the 20 frozen
// gold-item expectations against the EXTRACTED TARBALL's port + manifest
// (runs from tarball inputs - the thing being published is the thing being
// verified). Local `npm pack` is never blocked: prepublishOnly does not
// fire on pack, and this script's own pack goes to a scratch dir.
//
// Expectations are sha256-anchored in bench/research/g6-publish-fixture.json
// (ADR-0050 append-only fixture): gold20 file digest + per-item token-multiset
// digest + expected logit. The bench-side file stays out of the npm surface
// (ADR-0038 D2: corpus doors never ship); the fixture carries no item text.
//
// Tiers (thresholds.json g6_gates, single home):
//   (a) token multiset sha256 bit-equal   - blocking
//   (b) feature vector rel-L2 < 1e-9      - advisory warning, never blocks
//   (c) logit abs diff < 1e-12            - blocking
// Positive control: the same replay against a deliberately corrupted
// extracted manifest MUST be rejected; if it is not, the gate is invalid and
// fails closed.
//
// Usage: node scripts/check-g6-publish.js [--freeze] [--write-log]
//   --freeze  regenerate the fixture from gold20.jsonl (append-only content:
//             regenerating over unchanged goldens yields identical bytes)
//   --write-log  regenerate the committed replay log (the ONLY path that
//             writes bench/research/out/g6-publish-replay.json)
// Exit 0 pass / exit 1 fail-closed.
//
// ADR-0093 D-3 (grill-t36 D-006): this gate STOPPED overwriting its own
// evidence. The default path computes and does not write; it diffs the fresh
// replay against the committed log and exits 1 on a mismatch. Verification and
// mutation are two commands, not one command with two outcomes - the
// `prettier --check` / `--write` family, and the same two-mode shape the other
// generator legs in this registry already use (build-rewrite-map.js --check,
// build-audit-checklist.js --check, build-governance-anchors.js --check).
//
// Artifact semantics, adjudicated not assumed: g6-publish-replay.json is a
// DERIVED EVIDENCE LOG, not a locked baseline. The locked baseline is
// g6-publish-fixture.json (ADR-0050 append-only). A compare failure is
// therefore an EVIDENCE-STALENESS alarm - the committed log no longer describes
// the current replay, so it is explicitly regenerated and committed - and NOT
// replay drift. Replay correctness is asserted at tiers a/c against the
// fixture, which is the thing that must not move. scripts/build-round-facts.js
// reads this file as a fact source; that is exactly why redirecting the write
// to an ignored path was rejected - it would move the evidence out of the tree
// under judgement.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { requireCapabilities } = require('../src/shared/capability');
const { relL2 } = require('./check-g6-equivalence.js');

const ROOT = path.join(__dirname, '..');
const GOLD_REL = path.join('bench', 'research', 'gold20.jsonl');
const FIXTURE_REL = path.join('bench', 'research', 'g6-publish-fixture.json');
const THRESHOLDS_REL = path.join('bench', 'polygraph', 'thresholds.json');
const WORK = path.join(ROOT, '.scratch', 'g6-publish');

function sha(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function shaFile(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function readJsonl(p) {
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(function (l) { return l.trim(); }).map(JSON.parse);
}

function gateValue(cfg, id) {
  const g = (cfg.g6_gates || []).filter(function (x) { return x.id === id; })[0];
  return g ? g.value : null;
}

// Build the fixture from gold20.jsonl (deterministic: sorted keys, fixed
// order; the same input produces byte-identical output).
function buildFixture(root) {
  const goldPath = path.join(root, GOLD_REL);
  const golds = readJsonl(goldPath);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, THRESHOLDS_REL), 'utf8'));
  return {
    schema_version: 1,
    _doc: 'ADR-0065 D-B.3: sha256-anchored expectations for the G6 publish gate. Carries no item text (corpus doors stay out of the npm surface); the replay text comes from gold20.jsonl whose whole-file digest is anchored here. Regenerate: node scripts/check-g6-publish.js --freeze.',
    source_adr: '0064/0065',
    gold20_file: GOLD_REL.split(path.sep).join('/'),
    gold20_sha256: shaFile(goldPath),
    item_count: golds.length,
    tolerances: { token_multiset: gateValue(cfg, 'g6-token-multiset'), rel_l2: gateValue(cfg, 'g6-feature-vector'), logit: gateValue(cfg, 'g6-logit') },
    expectations: golds.map(function (g) {
      return { id: g.id, tokens_sha256: sha(g.tokens.join('\n')), logit: g.logit };
    }),
  };
}

// Replay gold items through a loaded port module + manifest; returns
// {errors, warnings, detail}. Shared by the real run and the positive control.
function replay(port, manifest, golds, expectations, tol) {
  const errors = [];
  const warnings = [];
  const detail = { items: golds.length, tier_a_equal: 0, rel_l2_max: 0, logit_diff_max: 0 };
  const expById = {};
  for (const e of expectations) expById[e.id] = e;
  for (const g of golds) {
    const exp = expById[g.id];
    if (!exp) { errors.push(g.id + ': no expectation registered (fixture incomplete)'); continue; }
    const tokens = port.tokenize(g.text, manifest.analyzer).sort();
    if (sha(tokens.join('\n')) !== exp.tokens_sha256) {
      errors.push(g.id + ': token multiset digest mismatch (tier a, bit-equal)');
      continue;
    }
    detail.tier_a_equal += 1;
    const vec = port.vectorize(tokens, manifest);
    const rl = relL2(vec, g.vector);
    detail.rel_l2_max = Math.max(detail.rel_l2_max, rl);
    if (!(rl < tol.relL2)) warnings.push(g.id + ': rel-L2 ' + rl.toExponential(3) + ' !< ' + tol.relL2 + ' (tier b, advisory)');
    const lg = port.logit(vec, manifest);
    const dl = Math.abs(lg - exp.logit);
    detail.logit_diff_max = Math.max(detail.logit_diff_max, dl);
    if (!(dl < tol.logit)) errors.push(g.id + ': logit abs diff ' + dl.toExponential(3) + ' !< ' + tol.logit + ' (tier c)');
  }
  return { errors: errors, warnings: warnings, detail: detail };
}

// Pack + extract; return the extracted package dir.
function extractTarball(root) {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK, 'extract'), { recursive: true });
  const raw = execFileSync('npm', ['pack', '--pack-destination', WORK, '--json'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  const info = JSON.parse(raw.trim())[0];
  execFileSync('tar', ['-xzf', info.filename, '-C', 'extract'], { cwd: WORK, stdio: 'pipe' });
  return { pkgDir: path.join(WORK, 'extract', 'package'), file: info.filename, size: info.size };
}

function check(root) {
  const errors = [];
  const warnings = [];
  const base = root || ROOT;
  const fixture = JSON.parse(fs.readFileSync(path.join(base, FIXTURE_REL), 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(path.join(base, THRESHOLDS_REL), 'utf8'));
  const golds = readJsonl(path.join(base, GOLD_REL));

  // Anchor: the gold20 file under replay must be the frozen one.
  const actual = shaFile(path.join(base, GOLD_REL));
  if (actual !== fixture.gold20_sha256) errors.push('gold20.jsonl sha256 ' + actual.slice(0, 16) + '... != anchored ' + fixture.gold20_sha256.slice(0, 16) + '... (fixture drift, ADR-0050)');
  if (golds.length !== fixture.item_count) errors.push('gold20 holds ' + golds.length + ' items, fixture anchors ' + fixture.item_count);
  const tol = { relL2: gateValue(cfg, 'g6-feature-vector'), logit: gateValue(cfg, 'g6-logit') };
  if (tol.relL2 === null || tol.logit === null) errors.push('thresholds.json g6_gates missing tolerances');
  if (fixture.tolerances && (fixture.tolerances.rel_l2 !== tol.relL2 || fixture.tolerances.logit !== tol.logit)) {
    errors.push('fixture tolerances drifted from thresholds.json g6_gates');
  }
  if (errors.length) return { errors: errors, warnings: warnings };

  const packed = extractTarball(base);
  const pkgDir = packed.pkgDir;
  const scorePath = path.join(pkgDir, 'src', 'port', 'score.js');
  const manifestPath = path.join(pkgDir, 'src', 'port', 'g6-manifest.json');
  if (!fs.existsSync(scorePath)) errors.push('tarball is missing src/port/score.js - the product surface did not ship');
  if (!fs.existsSync(manifestPath)) errors.push('tarball is missing src/port/g6-manifest.json - the trained manifest did not ship');
  if (errors.length) { fs.rmSync(WORK, { recursive: true, force: true }); return { errors: errors, warnings: warnings, packed: packed }; }

  const port = require(scorePath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const res = replay(port, manifest, golds, fixture.expectations, tol);
  errors.push.apply(errors, res.errors);
  warnings.push.apply(warnings, res.warnings);
  // Deterministic identity of the extracted product surface (tgz bytes carry
  // a gzip clock; the extracted files do not).
  const surfaceSha = sha(fs.readFileSync(scorePath, 'utf8') + '|' + fs.readFileSync(manifestPath, 'utf8'));

  // Positive control: a corrupted manifest from the SAME tarball must be
  // rejected; if it passes, the gate cannot detect port drift (fail-closed).
  const corrupt = JSON.parse(JSON.stringify(manifest));
  const vk = Object.keys(corrupt.vocabulary);
  corrupt.vocabulary[vk[0]] = (corrupt.vocabulary[vk[0]] + 1) % corrupt.coef.length;
  corrupt.coef[0] += 0.5;
  const cres = replay(port, corrupt, golds, fixture.expectations, tol);
  const controlRejected = cres.errors.length !== 0;
  if (!controlRejected) errors.push('POSITIVE CONTROL FAILED: corrupted manifest produced no blocking failure - the publish gate cannot detect port drift');

  fs.rmSync(WORK, { recursive: true, force: true });
  return {
    errors: errors, warnings: warnings, packed: packed, count: fixture.item_count, tolLogit: tol.logit,
    replay: { detail: res.detail, surface_sha256: surfaceSha, control_rejected: controlRejected }
  };
}

// Build the replay-log artifact object (pure: no write). ADR-0093 D-3 keeps
// construction and persistence separable so the default path can compare
// without touching the tree.
function buildReplayArtifact(out) {
  return {
    schema_version: 1,
    _doc: 'ADR-0065 D-B.3 / D-005(b): persisted replay log of the G6 publish gate - extracted-surface digest, per-tier results, positive-control verdict. Deterministic content (no clock fields); a green re-run reproduces identical bytes. ADR-0093 D-3: DERIVED EVIDENCE LOG, not a locked baseline - the default gate path compares against this file and never rewrites it; regenerate with: node scripts/check-g6-publish.js --write-log. A compare failure is an evidence-staleness alarm, not replay drift (replay correctness is asserted at tiers a/c against the ADR-0050 append-only fixture).',
    gate: 'g6-publish',
    tarball: { file: out.packed ? path.basename(out.packed.file) : null, size: out.packed ? out.packed.size : null },
    extracted_surface_sha256: out.replay.surface_sha256,
    expectations: out.count,
    tiers: {
      a_token_digest_bit_equal: out.replay.detail.tier_a_equal + '/' + out.replay.detail.items,
      b_rel_l2_max: out.replay.detail.rel_l2_max,
      c_logit_diff_max: out.replay.detail.logit_diff_max,
      c_tolerance: out.tolLogit,
    },
    positive_control: { corrupted_manifest_rejected: out.replay.control_rejected },
    warnings: out.warnings,
    errors: out.errors,
    verdict: out.errors.length ? 'FAIL' : 'PASS',
  };
}

function main() {
  requireCapabilities('g6-publish');
  const argv = process.argv.slice(2);
  if (argv.indexOf('--freeze') !== -1) {
    const fx = buildFixture(ROOT);
    const p = path.join(ROOT, FIXTURE_REL);
    const next = JSON.stringify(fx, null, 2) + '\n';
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === next) {
      console.log('[g6-publish] fixture already in sync (append-only: identical bytes)');
    } else {
      fs.writeFileSync(p, next, { encoding: 'utf8' });
      console.log('[g6-publish] fixture frozen -> ' + FIXTURE_REL);
    }
    return;
  }
  let out;
  try { out = check(ROOT); }
  catch (e) { console.error('[g6-publish] fail-closed: ' + e.message); process.exit(1); }
  for (const w of out.warnings) console.warn('WARN(diagnostic): ' + w);
  for (const e of out.errors) console.error('FAIL: ' + e);
  // ADR-0093 D-3: the replay log is a derived evidence log, and this gate no
  // longer rewrites it as a side effect of observing it. Two commands, two
  // outcomes - not one command with two.
  if (out.replay) {
    const logPath = path.join(ROOT, 'bench', 'research', 'out', 'g6-publish-replay.json');
    const next = JSON.stringify(buildReplayArtifact(out), null, 2) + '\n';
    if (argv.indexOf('--write-log') !== -1) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      const identical = fs.existsSync(logPath) && fs.readFileSync(logPath, 'utf8') === next;
      fs.writeFileSync(logPath, next, { encoding: 'utf8' });
      console.log('[g6-publish] replay log regenerated -> ' + path.relative(ROOT, logPath).split(path.sep).join('/') +
        (identical ? ' (identical bytes)' : '') + ' - COMMIT it (ADR-0093 D-3: the log is the fact source build-round-facts.js reads)');
    } else {
      // compare form: read-only. A missing log is the same alarm as a stale
      // one (the evidence does not describe this replay) and is reported as
      // such rather than silently created.
      const committed = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : null;
      if (committed === null) {
        console.error('EVIDENCE-STALE: ' + path.relative(ROOT, logPath).split(path.sep).join('/') +
          ' is missing - the committed replay log does not describe this replay (ADR-0093 D-3). Run: node scripts/check-g6-publish.js --write-log');
        process.exit(1);
      }
      if (committed !== next) {
        // Name the drift at the granularity that helps: which top-level fields
        // moved. The full diff is not expanded - the remedy is one command.
        let fields = 'unreadable';
        try {
          const a = JSON.parse(committed); const b = JSON.parse(next);
          fields = Object.keys(b).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(', ') || '(none - byte-level only)';
        } catch (e) { /* fall through to the raw marker */ }
        console.error('EVIDENCE-STALE: the committed replay log no longer describes this replay (ADR-0093 D-3) - differing fields: ' + fields +
          '. This is a staleness alarm, not replay drift: replay correctness is asserted at tiers a/c above. Run: node scripts/check-g6-publish.js --write-log');
        process.exit(1);
      }
    }
  }
  if (out.errors.length) process.exit(1);
  console.log('[g6-publish] OK: ' + (out.packed ? out.packed.file : 'tarball') + ' replayed ' + out.count + ' gold items from the extracted tarball - token digests bit-equal (a), rel-L2 advisory (b), logits < ' + out.tolLogit + ' (c); corrupted-port positive control rejected' +
    (argv.indexOf('--write-log') !== -1 ? '; replay log written' : '; committed replay log matches this replay (compare form, no write)'));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { check, replay, buildFixture, extractTarball, buildReplayArtifact };
