#!/usr/bin/env node
// jiahao-pretool-guard.js - PreToolUse enforcement-surface deny wiring
// (CodeBuddy/Claude-Code-compatible plugin event; grill-t30 D-002).
//
// Semantic: the verifier protects its own apparatus. A tool call that would
// modify the injected rules, the hook map, the plugin manifest, the bundled
// MCP registration, or the jiahao state/evidence files is a bypass attempt:
//   - verifier profile -> hookSpecificOutput.permissionDecision:"deny"
//     (the Claude-Code-compatible block channel, live-verified on CodeBuddy
//     CLI), and a bypass-attempt telemetry line is appended;
//   - generator profile or flag-off -> silent passthrough.
// This is NOT a content-policy gate: ordinary tool calls exit 0 with no
// output. Deny records feed the trial's Phase-2 "deny count + bypass
// attempts" capture point.
//
// Fail-soft by contract: unparseable stdin, absent flag, or any internal
// error exits 0 - the guard never wedges the host.

'use strict';

const fs = require('fs');
const path = require('path');
const { flagPath, configDir } = require('../src/shared/paths');
const { isProtected } = require('../src/shared/protected-path');
const { readProfile } = require('./jiahao-profile');
const { detectHost, normalizePayload } = require('./jiahao-runtime');

const LOG_NAME = '.jiahao-pretool.jsonl';

if (!fs.existsSync(flagPath())) process.exit(0);

function candidateText(parsed) {
  const ti = parsed && parsed.tool_input;
  if (!ti || typeof ti !== 'object') return '';
  return [ti.file_path, ti.command, ti.path, ti.notebook_path]
    .filter(Boolean).map(String).join('\n');
}

// Windows stdin hang guard: fires only while stdin is still silent. Cleared the
// moment stdin ends - after that the only pending work is the stdout write, and
// a forced exit would truncate it (#84).
const stdinGuard = setTimeout(() => process.exit(typeof process.exitCode === 'number' ? process.exitCode : 0), 1000);
stdinGuard.unref();
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  clearTimeout(stdinGuard); // stdin arrived; the hang guard has done its job
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  parsed = normalizePayload(parsed);
  const tool = (parsed && parsed.tool_name) || 'unknown';
  const text = candidateText(parsed);
  const pluginRoot = process.env.CODEBUDDY_PLUGIN_ROOT
    || process.env.CLAUDE_PLUGIN_ROOT
    || path.join(__dirname, '..');

  if (!isProtected(text, pluginRoot)) process.exit(0);

  const profile = readProfile();
  const verdict = profile === 'verifier' ? 'deny' : 'observe';
  try {
    fs.appendFileSync(path.join(configDir(), LOG_NAME), JSON.stringify({
      event: 'PreToolUse', host: detectHost(),
      session_id: parsed.session_id || null, ts: new Date().toISOString(),
      tool_name: tool, decision: verdict,
      target: text.split('\n')[0].slice(0, 300),
    }) + '\n');
  } catch (e) { /* telemetry best-effort */ }

  if (verdict === 'deny') {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'JIAHAO VERIFIER: tool call targets the verifier enforcement surface ' +
          '(injected rules / hook map / plugin manifest / evidence chain). ' +
          'Recorded as a bypass attempt in .jiahao-pretool.jsonl.',
      },
    }));
  }
  // No process.exit() here: the deny envelope is an async write to a pipe on
  // POSIX, and exiting before it flushes loses the output - which this hook's
  // contract turns into a silent allow (status 0, empty stdout). Letting the loop
  // drain flushes it; the hang guard is unref'd and cleared when stdin ends. The
  // early exits that print nothing keep exit(0).
});
