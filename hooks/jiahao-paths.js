// jiahao-paths.js — shared config path resolution
// Single source of truth for flag/evidence file locations.

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

module.exports = { configDir, flagPath, evidencePath, evidenceKeysPath, profilePath };
