#!/usr/bin/env node
// jiahao-mode-tracker.js — UserPromptSubmit hook
// Track /jiahao [lite|full|ultra|off] commands + anti-drift reminder.

const fs = require('fs');
const { writeHookOutput, normalizePayload } = require('./jiahao-runtime');
const { flagPath } = require('../src/shared/paths');
const sentinel = require('../src/sentinel').begin('jiahao-mode-tracker');

// Windows stdin hang guard: fires only while stdin is still silent. Cleared the
// moment stdin ends - after that the only pending work is the stdout write, and
// a forced exit would truncate it (#84).
const stdinGuard = setTimeout(() => process.exit(typeof process.exitCode === 'number' ? process.exitCode : 0), 1000);
stdinGuard.unref();
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinGuard); // stdin arrived; the hang guard has done its job
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  parsed = normalizePayload(parsed);
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
