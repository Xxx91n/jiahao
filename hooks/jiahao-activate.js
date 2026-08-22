#!/usr/bin/env node
// jiahao-activate.js — SessionStart hook
// 1. Write flag file for state persistence
// 2. Read SKILL.md (profile-split) and output as injection context
// 3. Append statusline hint
// ADR-0010: reads .jiahao-profile to select generator/verifier ruleset

const fs = require('fs');
const path = require('path');
const { writeHookOutput } = require('./jiahao-runtime');
const { flagPath, profilePath } = require('./jiahao-paths');
const { loadProfileSections } = require('./jiahao-profile');

// Write flag file (default intensity: full)
const mode = fs.existsSync(flagPath())
  ? fs.readFileSync(flagPath(), 'utf8').trim()
  : 'full';
if (!fs.existsSync(flagPath())) {
  fs.writeFileSync(flagPath(), 'full', 'utf8');
}

// Read profile flag (default: verifier for backward compat)
const profile = fs.existsSync(profilePath())
  ? fs.readFileSync(profilePath(), 'utf8').trim().toLowerCase()
  : 'verifier';

// Load skill content and split by profile
const sections = loadProfileSections(path.join(__dirname, '..'));
const body = sections[profile === 'generator' ? 'generator' : 'verifier'];

// Build injection text: profile-specific body + statusline
const injection = body + '\n---\nJIAHAO MODE ACTIVE — level: ' + mode + '\n';

writeHookOutput(injection, 'SessionStart');
