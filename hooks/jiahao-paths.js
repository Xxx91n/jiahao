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

function profilePath() {
  return path.join(configDir(), '.jiahao-profile');
}

module.exports = { configDir, flagPath, evidencePath, profilePath };
