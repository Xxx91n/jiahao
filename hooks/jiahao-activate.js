#!/usr/bin/env node
// jiahao-activate.js — SessionStart hook
// 1. Write flag file for state persistence
// 2. Read SKILL.md and output as injection context
// 3. Append statusline hint

const fs = require('fs');
const path = require('path');
const { writeHookOutput } = require('./jiahao-runtime');

const configDir = process.env.CLAUDE_CONFIG_DIR || process.env.HOME || '/tmp';
const flagPath = configDir + '/.jiahao-active';
const skillPath = path.join(__dirname, '..', 'src', 'SKILL.md');

// Write flag file (default intensity: full)
const mode = fs.existsSync(flagPath)
  ? fs.readFileSync(flagPath, 'utf8').trim()
  : 'full';
if (!fs.existsSync(flagPath)) {
  fs.writeFileSync(flagPath, 'full', 'utf8');
}

// Read SKILL.md content
const skill = fs.readFileSync(skillPath, 'utf8');

// Build injection text: SKILL.md body (strip frontmatter) + statusline
const body = skill.replace(/^---[\s\S]*?---\n/, '');
const injection = body + '\n---\nJIAHAO MODE ACTIVE — level: ' + mode + '\n';

writeHookOutput(injection, 'SessionStart');
