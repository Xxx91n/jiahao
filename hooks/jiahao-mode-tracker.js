#!/usr/bin/env node
// jiahao-mode-tracker.js — UserPromptSubmit hook
// Track /jiahao [lite|full|ultra|off] commands + anti-drift reminder.

const fs = require('fs');
const { writeHookOutput } = require('./jiahao-runtime');
const { flagPath } = require('../src/shared/paths');
const sentinel = require('../src/sentinel').begin('jiahao-mode-tracker');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinGuard); // stdin arrived; the hang guard has done its job
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  sentinel.set('scan', parsed.session_id || null);

  const prompt = parsed.prompt || '';

  // Detect /jiahao command
  const match = prompt.match(/\/jiahao\s+(lite|full|ultra|off)/i);
  if (match) {
    const newMode = match[1].toLowerCase();
    if (newMode === 'off') {
      try { fs.unlinkSync(flagPath()); } catch (e) { /* already gone */ }
      sentinel.set('write');
    writeHookOutput('JIAHAO MODE OFF — verification discipline disabled.', 'UserPromptSubmit');
    } else {
      fs.writeFileSync(flagPath(), newMode, 'utf8');
      sentinel.set('write');
      writeHookOutput('JIAHAO MODE CHANGED — level: ' + newMode, 'UserPromptSubmit');
    }
    return;
  }

  // Anti-drift reminder (lightweight, every turn)
  if (fs.existsSync(flagPath())) {
    const mode = fs.readFileSync(flagPath(), 'utf8').trim();
    const reminder = 'JIAHAO ACTIVE (' + mode + ') — default verdict: NOT VERIFIED. Check the 6-rung ladder before reporting.';
    sentinel.set('write');
    writeHookOutput(reminder, 'UserPromptSubmit');
  }
});

// Windows stdin hang guard (same convention as the other hooks). Cleared once
// stdin ends: after that the only thing that can still be pending is the stdout
// write, and a forced exit into it would truncate the envelope - the loss the
// no-exit-after-log rule above exists to prevent (#84).
const stdinGuard = setTimeout(() => process.exit(0), 1000);
stdinGuard.unref();
