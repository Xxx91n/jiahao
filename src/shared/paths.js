// src/shared/paths.js — shared config path resolution
// Single source of truth for flag/evidence file locations.

const fs = require('fs');
const path = require('path');

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || process.env.HOME || '/tmp';
}

function flagPath() {
  return path.join(configDir(), '.jiahao-active');
}

function evidencePath() {
  return path.join(configDir(), '.jiahao-evidence');
}

// ADR-0013 D3: sidecar file storing one composite idempotency key per line.
// Crash-recovery persistence for the in-memory dedup set.
function evidenceKeysPath() {
  return path.join(configDir(), '.jiahao-evidence.keys');
}

function profilePath() {
  return path.join(configDir(), '.jiahao-profile');
}

// ADR-0018 D4: κ governance baseline (written manually via scripts/kappa.js
// --save-baseline; hooks only read it).
function kappaBaselinePath() {
  return path.join(configDir(), '.jiahao-kappa-baseline.json');
}

// ADR-0036 D2: private bench corpus resolution. JIAHAO_CORPUS_DIR env wins;
// fallback is the install-planted dir; then the repo-private dir (maintainer
// dev tree, gitignored). Missing everywhere fails closed with exit 2.
function corpusDir() {
  return process.env.JIAHAO_CORPUS_DIR || path.join(configDir(), 'private', 'bench-corpus');
}
function corpusPath(name) {
  return path.join(corpusDir(), name);
}
// Repo-private fallback used by gate scripts when the install dir lacks the file.
function repoCorpusPath(name) {
  return path.join(__dirname, '..', '..', 'private', 'bench-corpus', name);
}
// ADR-0038 D3: honest three-state missing-corpus message. env => the override
// is broken; maintainer tree (repo checkout, .git present) => install plants
// it; third party (npm tarball / public clone) => corpus is a maintainer/CI
// asset, do not pretend an init command can conjure it.
function corpusMissingMessage(name, envOverride, maintainerTree) {
  const head = '[corpus] missing ' + name;
  if (envOverride) return head + ' - JIAHAO_CORPUS_DIR=' + envOverride + ' has no such file; fix the path or unset the override (ADR-0038 D3)';
  if (maintainerTree) return head + ' - run: jiahao init --profile verifier (ADR-0036 D2; set JIAHAO_CORPUS_DIR to override)';
  return head + ' - the benchmark corpus is a maintainer/CI asset and is not distributed in the npm package or a public git clone (ADR-0038 D2); if you legitimately hold it, set JIAHAO_CORPUS_DIR (ADR-0038 D3)';
}
function requireCorpus(name) {
  const cands = [corpusPath(name), repoCorpusPath(name)];
  for (const p of cands) if (fs.existsSync(p)) return p;
  const maintainerTree = fs.existsSync(path.join(__dirname, '..', '..', '.git'));
  console.error(corpusMissingMessage(name, process.env.JIAHAO_CORPUS_DIR || null, maintainerTree));
  process.exit(2);
}

module.exports = { configDir, corpusDir, corpusPath, repoCorpusPath, requireCorpus, corpusMissingMessage, flagPath, evidencePath, evidenceKeysPath, profilePath, kappaBaselinePath };
