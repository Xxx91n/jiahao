// src/shared/paths.js — shared config path resolution
// Single source of truth for flag/evidence file locations.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PREFIXES } = require('./prefix-vocab'); // prefix vocabulary fact source

// Where jiahao keeps its own state. Resolution order, and why it is this one:
//
//   1. CLAUDE_CONFIG_DIR - the operator's explicit pin. Every host's docs tell
//      an operator to use it, so it must keep winning everywhere.
//   2. HOME - the location every host that already resolves today keeps
//      resolving to. #116 requires that no host setting this variable moves,
//      so a host's own root cannot outrank it. WorkBuddy's hook subprocess is
//      the measured case: its PreToolUse guard had no CLAUDE_CONFIG_DIR and did
//      have HOME, while the shell that ran the installer carried
//      CLAUDE_CONFIG_DIR (owner's run, 2026-11-01, recorded in the ticket's
//      comment rather than under docs/evidence/).
//   3. The host's own config root, reported by the host to its hook
//      subprocess. This is the #116 fix: Qoder Desktop hands a hook
//      QODER_CONFIG_DIR and no CLAUDE_CONFIG_DIR / HOME, so before this step
//      existed the resolution fell through to os.homedir() and the whole
//      state - profile, evidence, sentinels - landed outside the directory
//      the host itself names. Only these three names are listed because they
//      are the ones a probe record shows a hook subprocess being handed; a
//      host with no such variable falls to step 4 exactly as it did before.
//   4. os.homedir() - the OS answer (USERPROFILE on Windows) when no host
//      marker exists at all. Never '/tmp': on Windows that resolves against
//      the current drive and is what #116 was filed about.
//
// A host that sets neither Claude variable and names no config root still
// resolves to the OS home, which is where the previous order already sent a
// hook that had HOME unset - so the only hosts whose location changes are the
// ones that hand over a config root and neither Claude variable.
const HOST_CONFIG_DIR_ENV = [
  'QODER_CONFIG_DIR',
  'CODEBUDDY_CONFIG_DIR',
  'WORKBUDDY_CONFIG_DIR',
];

function hostConfigDir(env) {
  for (const name of HOST_CONFIG_DIR_ENV) {
    if (env[name]) return env[name];
  }
  return null;
}

// Same order, injectable environment: capability.js and detector.js resolve
// the config dir from an env they may be handed rather than process.env, and
// they must not grow a second copy of this order.
function configDirFrom(env) {
  const e = env || process.env;
  return e.CLAUDE_CONFIG_DIR || e.HOME || hostConfigDir(e) || os.homedir();
}

function configDir() {
  return configDirFrom(process.env);
}

function flagPath() {
  return path.join(configDir(), '.jiahao-active');
}

function evidencePath() {
  return path.join(configDir(), '.jiahao-evidence');
}

// sidecar file storing one composite idempotency key per line.
// Crash-recovery persistence for the in-memory dedup set.
function evidenceKeysPath() {
  return path.join(configDir(), '.jiahao-evidence.keys');
}

function profilePath() {
  return path.join(configDir(), '.jiahao-profile');
}

// channel-level flags for the Stop/SubagentStop conviction
// lane. Presence of the off file makes the lane inert (kill switch,
// survives post-enforce); presence of the enforce file is the registered
// promotion marker that drops the shadow bit so records enter the
// severity matrix.
function convictionLaneOffPath() {
  return path.join(configDir(), '.jiahao-conviction-off');
}
function convictionLaneEnforcePath() {
  return path.join(configDir(), '.jiahao-conviction-enforce');
}

// κ governance baseline (written manually via scripts/kappa.js
// --save-baseline; hooks only read it).
function kappaBaselinePath() {
  return path.join(configDir(), '.jiahao-kappa-baseline.json');
}

// private bench corpus resolution. JIAHAO_CORPUS_DIR env wins;
// fallback is the install-planted dir; then the repo-private dir (maintainer
// dev tree, gitignored). Missing everywhere fails closed with exit 1 and a
// [config]: prefix (exit 2 is capability-absence-only; the
// directory-level probe in capability.js fires before this).
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
// honest three-state missing-corpus message. env => the override
// is broken; maintainer tree (repo checkout, .git present) => install plants
// it; third party (npm tarball / public clone) => corpus is a maintainer/CI
// asset, do not pretend an init command can conjure it.
function corpusMissingMessage(name, envOverride, maintainerTree) {
  const head = PREFIXES.config + ' [corpus] missing ' + name; // closed-enum fail-path prefix
  if (envOverride) return head + ' - JIAHAO_CORPUS_DIR=' + envOverride + ' has no such file; fix the path or unset the override';
  if (maintainerTree) return head + ' - run: jiahao init --profile verifier (set JIAHAO_CORPUS_DIR to override)';
  return head + ' - the benchmark corpus is a maintainer/CI asset and is not distributed in the npm package or a public git clone; if you legitimately hold it, set JIAHAO_CORPUS_DIR';
}
function requireCorpus(name) {
  const cands = [corpusPath(name), repoCorpusPath(name)];
  for (const p of cands) if (fs.existsSync(p)) return p;
  // .git also exists in a public clone, so it cannot identify the
  // maintainer tier; private/bench-corpus is gitignored and present only in a
  // maintainer tree. Everything else (public clone, npm artifact) gets the
  // honest third-party message.
  const maintainerTree = fs.existsSync(path.join(__dirname, '..', '..', 'private', 'bench-corpus'));
  console.error(corpusMissingMessage(name, process.env.JIAHAO_CORPUS_DIR || null, maintainerTree));
  process.exit(1);
}

module.exports = { configDir, configDirFrom, HOST_CONFIG_DIR_ENV, flagPath, evidencePath, evidenceKeysPath, profilePath, kappaBaselinePath, convictionLaneOffPath, convictionLaneEnforcePath, corpusDir, corpusPath, repoCorpusPath, requireCorpus, corpusMissingMessage };
