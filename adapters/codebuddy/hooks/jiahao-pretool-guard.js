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
const { readProfile } = require('./jiahao-profile');
const { detectHost } = require('./jiahao-runtime');

const LOG_NAME = '.jiahao-pretool.jsonl';

// Distinctive fragments - fragments only cover paths whose names are
// jiahao-owned, so a same-named user file elsewhere does not trip the deny.
// Token-anchored: each fragment is evaluated against a shell token's END
// ($), so trailing args / flags cannot defeat it (grill-t30 audit B-4).
// ^ alternation covers bare relative paths ("rm rules/jiahao-verifier.md").
const PROTECTED_FRAGMENTS = [
  /(^|[\\/=])hooks[\\/]hooks\.json$/,
  /(^|[\\/=])hooks[\\/]jiahao-[a-z0-9-]+\.js$/,
  /(^|[\\/=])rules[\\/]jiahao-(verifier|generator)\.md$/,
  /(^|[\\/=])\.claude-plugin[\\/]plugin\.json$/,
  /(^|[\\/=])\.mcp\.json$/,
  /(^|[\\/=])\.jiahao-(active|profile|evidence|evidence\.keys|instructions\.jsonl|pretool\.jsonl)([\\/]|$)/,
];
// Apparatus dirs under the resolved plugin root (absolute containment).
const PROTECTED_DIRS = ['hooks', 'rules', '.claude-plugin'];

if (!fs.existsSync(flagPath())) process.exit(0);

function norm(p) { return String(p || '').split('/').join('\\'); }

function candidateText(parsed) {
  const ti = parsed && parsed.tool_input;
  if (!ti || typeof ti !== 'object') return '';
  return [ti.file_path, ti.command, ti.path, ti.notebook_path]
    .filter(Boolean).map(String).join('\n');
}

// Command payloads are split into shell tokens so a protected name is
// matched at token end regardless of position in the argv (grill-t30 B-4:
// `rm rules/jiahao-verifier.md` and `rm <abs> extra` both resolve).
function tokens(text) {
  return norm(text).split(/[\s;&|<>()"']+/).filter(Boolean);
}

function isProtected(text, pluginRoot) {
  if (!text) return false;
  const absRoot = pluginRoot ? norm(path.resolve(pluginRoot)) : null;
  for (const tok of tokens(text)) {
    for (const re of PROTECTED_FRAGMENTS) if (re.test(tok)) return true;
    if (absRoot) {
      const absTok = norm(path.resolve(tok));
      if (absTok.indexOf(absRoot + '\\') === 0) {
        const rel = absTok.slice(absRoot.length + 1);
        const top = rel.split('\\')[0];
        if (PROTECTED_DIRS.indexOf(top) !== -1 || rel === '.mcp.json') return true;
      }
    }
  }
  return false;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
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
  process.exit(0);
});

// Windows stdin hang guard (same convention as the other hooks)
setTimeout(() => process.exit(0), 1000).unref();
