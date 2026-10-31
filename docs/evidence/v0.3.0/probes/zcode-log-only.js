#!/usr/bin/env node
// probe-log.js — #108 stage-1 log-only probe for non-Stop events (NOT part of
// any bundle). Logs one JSON line per fire, always exits 0.
const fs = require('fs');
const path = require('path');
const SB = 'C:/Users/Administrator/.zcode/tmp/zcode-probe-108';
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(input); } catch (e) { payload = { _parseError: String(e) }; }
  const envKeys = {};
  for (const k of Object.keys(process.env)) {
    if (/^(ZCODE|CLAUDE|PLUGIN|COPILOT|CODEBUDDY|QODER|CODEX)_/i.test(k)) envKeys[k] = process.env[k];
  }
  fs.appendFileSync(path.join(SB, 'probe-stop-log.jsonl'), JSON.stringify({
    ts: new Date().toISOString(),
    mode: 'log-only',
    event: process.argv[2] || 'unknown',
    payloadKeys: Object.keys(payload).sort(),
    payload: payload,
    envKeys: envKeys,
  }) + '\n');
  process.exitCode = 0;
});
