#!/usr/bin/env node
// jiahao-activate.js — SessionStart hook
// 1. Write flag file for state persistence
// 2. Read SKILL.md (profile-split) and output as injection context
// 3. Append statusline hint
// ADR-0010: reads .jiahao-profile to select generator/verifier ruleset

const fs = require('fs');
const path = require('path');
const { writeHookOutput } = require('./jiahao-runtime');
const { flagPath } = require('../src/shared/paths');
const sentinel = require('../src/sentinel').begin('jiahao-activate');
const { loadProfileSections, readProfile } = require('./jiahao-profile');

// Write flag file (default intensity: full)
const mode = fs.existsSync(flagPath())
  ? fs.readFileSync(flagPath(), 'utf8').trim()
  : 'full';
if (!fs.existsSync(flagPath())) {
  fs.writeFileSync(flagPath(), 'full', 'utf8');
}

const profile = readProfile();

// Load skill content and split by profile
sentinel.set('scan');
const sections = loadProfileSections(path.join(__dirname, '..'));
const body = sections[profile === 'generator' ? 'generator' : 'verifier'];

// Build injection text: profile-specific body + statusline
const injection = body + '\n---\nJIAHAO MODE ACTIVE — level: ' + mode + '\n';

sentinel.set('write');
writeHookOutput(injection, 'SessionStart');
sentinel.end();
