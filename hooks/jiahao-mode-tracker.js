#!/usr/bin/env node
// jiahao-mode-tracker.js — UserPromptSubmit hook
// Track /jiahao [lite|full|ultra|off] commands + anti-drift reminder.

const fs = require('fs');
const { writeHookOutput } = require('./jiahao-runtime');
const { flagPath } = require('../src/shared/paths');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }

  const prompt = parsed.prompt || '';

  // Detect /jiahao command
  const match = prompt.match(/\/jiahao\s+(lite|full|ultra|off)/i);
  if (match) {
    const newMode = match[1].toLowerCase();
    if (newMode === 'off') {
      try { fs.unlinkSync(flagPath()); } catch (e) { /* already gone */ }
      writeHookOutput('JIAHAO MODE OFF — verification discipline disabled.', 'UserPromptSubmit');
    } else {
      fs.writeFileSync(flagPath(), newMode, 'utf8');
      writeHookOutput('JIAHAO MODE CHANGED — level: ' + newMode, 'UserPromptSubmit');
    }
    return;
  }

  // Anti-drift reminder (lightweight, every turn)
  if (fs.existsSync(flagPath())) {
    const mode = fs.readFileSync(flagPath(), 'utf8').trim();
    const reminder = 'JIAHAO ACTIVE (' + mode + ') — default verdict: NOT VERIFIED. Check the 6-rung ladder before reporting.';
    writeHookOutput(reminder, 'UserPromptSubmit');
  }
});

// Windows stdin hang guard
setTimeout(() => process.exit(0), 1000).unref();
