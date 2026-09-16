// src/shared/capability.js — ADR-0040 D2: gate runtime capability probing
// (zero-dependency; src/shared is inside the tarball whitelist).
//
// Discipline:
//   D1  CAPABILITIES is a CLOSED enum; adding a name requires an ADR naming
//       it verbatim. An unregistered name is a REGISTRY VIOLATION (throws),
//       never an exit 2 (closed-world; pytest strict-markers precedent).
//   D2  probes answer EXISTENCE only, never content correctness (thresholds,
//       fingerprints, counts stay with their own gates). Gates probe BEFORE
//       loading runtime dependencies (deferred-require pattern).
//   D3  exit 2 (UNVERIFIABLE) may only follow a probe that executed and
//       returned a deterministic negative. Probe exceptions, IO errors and
//       helper bugs are NOT translated — Node crashes as exit 1 and exposes
//       the bug honestly (no catch around probe bodies; no transient bucket).
//   D4  two-line degradation message (amended by ADR-0041 D5): line 1 is the
//       machine ::error annotation on STDOUT (GitHub workflow-command
//       format: comma-separated properties, %/%0D/%0A escaped); line 2 is
//       the human remediation hint on stderr. ADR-0040 D4's stderr+space
//       form was a spec-level protocol defect (annotation never renders).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const REGISTRY_REL = path.join('docs', 'gates.json');

const CAPABILITIES = ['repo-tree', 'bench-corpus', 'docs-adr', 'ci-mode', 'transcript-file'];

const HINTS = {
  'repo-tree': 'a git worktree is expected (.git missing at the tree root); gates run from the repo or a full checkout, not from the npm tarball',
  'bench-corpus': 'the bench corpus is a maintainer/CI asset and is not distributed in the npm package or a public git clone (ADR-0038 D2); set JIAHAO_CORPUS_DIR if you legitimately hold it (ADR-0038 D3)',
  'docs-adr': 'docs/adr/ lives in the git tree and is deliberately absent from the npm tarball (ADR-0039); run from a git checkout',
  'ci-mode': 'a CI environment is expected (GITHUB_ACTIONS or CI env var non-empty)',
  'transcript-file': 'the host delivers a transcript file (ADR-0070 D-C(c)); for script-level consumers declare it explicitly via JIAHAO_TRANSCRIPT_FILE=<path-to-existing-file> — per-event hook delivery (transcript_path on the stop-family stdin) and per-host reachability are recorded in the host-contract registry',
};

function configDir(env) {
  return env.CLAUDE_CONFIG_DIR || env.HOME || '/tmp';
}

function checkEnum(name) {
  if (CAPABILITIES.indexOf(name) === -1) {
    throw new Error('unregistered capability ' + JSON.stringify(name) + ' — registry violation, add it via an ADR that names it verbatim (ADR-0040 D1); closed enum: ' + CAPABILITIES.join(', '));
  }
}

// ADR-0061 D-F (amends ADR-0040 D1's 'directory exists' predicate): a corpus
// tier counts as present only when the directory exists AND holds at least one
// entry - an empty directory is not a corpus. This is still an EXISTENCE
// verdict: no file name, fingerprint or count is inspected (ADR-0040 D2).
function corpusTierPresent(dir) {
  if (!dir || !fs.existsSync(dir)) return false;
  if (!fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).length > 0;
}
// Boolean existence probe. opts: { root, env } injected by tests; production
// callers pass nothing. No try/catch on purpose (D3).
function probe(name, opts) {
  checkEnum(name);
  const o = opts || {};
  const root = o.root || ROOT;
  const env = o.env || process.env;
  switch (name) {
    case 'repo-tree':
      return fs.existsSync(path.join(root, '.git'));
    case 'bench-corpus':
      // Same resolution chain as src/shared/paths.js (ADR-0036 D2):
      // JIAHAO_CORPUS_DIR -> install-planted dir -> repo-private dir.
      // ADR-0061 D-F amends ADR-0040 D1: the capability is a corpus DIRECTORY
      // WITH CONTENT, not a bare directory. An existing-but-empty dir (a
      // stale/partial CI restore) is a deterministic negative, so dependent
      // gates degrade to exit 2 UNVERIFIABLE instead of running and failing
      // red on a capability that was never there. Still existence-only: which
      // files, fingerprints and counts stay their own gates' business.
      return corpusTierPresent(env.JIAHAO_CORPUS_DIR)
        || corpusTierPresent(path.join(configDir(env), 'private', 'bench-corpus'))
        || corpusTierPresent(path.join(root, 'private', 'bench-corpus'));
    case 'docs-adr':
      return fs.existsSync(path.join(root, 'docs', 'adr'));
    case 'ci-mode':
      return Boolean(env.GITHUB_ACTIONS || env.CI);
    case 'transcript-file':
      // ADR-0070 D-C(c): existence-only — an operator-declared transcript
      // file path. The hook lane's per-event delivery (transcript_path on the
      // stop-family stdin) is the runtime form; this env predicate is the
      // script-level form so a gate may declare the capability honestly.
      return Boolean(env.JIAHAO_TRANSCRIPT_FILE) && fs.existsSync(env.JIAHAO_TRANSCRIPT_FILE);
    default:
      return false; // unreachable: checkEnum guards the switch
  }
}

function loadEntry(gateName, root) {
  const reg = JSON.parse(fs.readFileSync(path.join(root || ROOT, REGISTRY_REL), 'utf8'));
  const entry = (reg.entries || []).find(function (e) { return e.name === gateName; });
  if (!entry) throw new Error('gate ' + JSON.stringify(gateName) + ' missing from docs/gates.json (ADR-0034 D1)');
  return entry;
}

// ADR-0041 D5: workflow-command escaping (order matters: % first).
// Complete by construction, not by input charset: every property separator
// (',' -> %2C, ':' -> %3A) is escaped alongside %/CR/LF, so no caller-supplied
// value can break out of its property. The message body after '::' is literal.
function escWf(s) {
  return String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/,/g, '%2C').replace(/:/g, '%3A');
}

// D4/D5: the exact two lines, pure for unit tests.
function unverifiableLines(gate, cap) {
  return [
    '::error title=UNVERIFIABLE,gate=' + escWf(gate) + ',requires=' + escWf(cap) + '::' + escWf('capability ' + cap + ' deterministically absent'),
    '[' + gate + '] UNVERIFIABLE: declared capability ' + cap + ' is absent — ' + HINTS[cap],
  ];
}

// Probe declared requires: a gate NAME resolves through the registry (single
// source of truth), an ARRAY declares inline (non-registry consumer, ADR-0058
// R8); each deterministic miss degrades honestly, then exit 2. Inline arrays
// are labelled 'a+b' (comma-free) - a raw ',' would be a property separator.
function requireCapabilities(gateName, opts) {
  const requires = (Array.isArray(gateName) ? gateName : loadEntry(gateName, opts && opts.root).requires) || [];
  const missing = requires.filter(function (c) { return !probe(c, opts); });
  for (const cap of missing) {
    const lines = unverifiableLines(Array.isArray(gateName) ? gateName.join('+') : gateName, cap);
    process.stdout.write(lines[0] + '\n');
    process.stderr.write(lines[1] + '\n');
  }
  if (missing.length) process.exit(2);
  return requires;
}

// Schema-level validation shared by run-gates (--check-alignment),
// check-ci-wiring and check-gate-params: the field must exist, be an array
// of strings, and stay inside the closed enum.
function validateRequires(entries) {
  const errors = [];
  for (const e of entries) {
    if (!Array.isArray(e.requires)) {
      errors.push(e.name + ': requires must be an array, empty allowed (ADR-0040 D1)');
      continue;
    }
    for (const c of e.requires) {
      if (typeof c !== 'string' || CAPABILITIES.indexOf(c) === -1) {
        errors.push(e.name + ': unknown capability ' + JSON.stringify(c) + ' — registry violation, closed enum is ' + CAPABILITIES.join(', ') + ' (ADR-0040 D1)');
      }
    }
  }
  return errors;
}

module.exports = { CAPABILITIES, probe, requireCapabilities, unverifiableLines, validateRequires, escWf };
