#!/usr/bin/env node
// probe-stop.js — #108 stage-1/2 probe wrapper for ZCode Stop (NOT part of any
// bundle). Logs every fire as one JSON line, then acts per probe-mode.txt.
// The hook command is registered once at session start, so behavior switches
// via the mode file, which is read at fire time:
//   json-once : block this session's first Stop ({decision:"block"} on stdout,
//               exit 0); allow every later Stop.
//   cap       : block EVERY Stop via the same JSON channel (loop-cap
//               observation; the host's own continuation cap ends it).
//   exit2     : exit 2 with no output (exit-code channel observation).
//   realgate  : spawn the REAL generated gate (node <bundle>/hooks/
//               jiahao-verdict-gate.js zcode) with the same stdin under an
//               isolated CLAUDE_CONFIG_DIR, log its stdout/stderr/exit, then
//               replay both and exit with its code.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const SB = 'C:/Users/Administrator/.zcode/tmp/zcode-probe-108';
const LOG = path.join(SB, 'probe-stop-log.jsonl');
const GATE = 'D:/Aworker/wt-zcode-108/adapters/zcode/hooks/jiahao-verdict-gate.js';

function readMode() {
  try { return fs.readFileSync(path.join(SB, 'probe-mode.txt'), 'utf8').trim() || 'json-once'; }
  catch (e) { return 'json-once'; }
}

function logLine(entry) {
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
}

function countFires(sessionId) {
  let fires = 0;
  try {
    for (const line of fs.readFileSync(LOG, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (rec && rec.event === 'Stop' && rec.payload && rec.payload.session_id === sessionId) fires++;
      } catch (e) { /* torn line */ }
    }
  } catch (e) { /* first fire */ }
  return fires;
}

const envKeys = {};
for (const k of Object.keys(process.env)) {
  if (/^(ZCODE|CLAUDE|PLUGIN|COPILOT|CODEBUDDY|QODER|CODEX)_/i.test(k)) envKeys[k] = process.env[k];
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(input); } catch (e) { payload = { _parseError: String(e) }; }
  const mode = readMode();
  const fires = countFires(payload.session_id || 'nosid');
  logLine({
    ts: new Date().toISOString(),
    event: 'Stop',
    mode: mode,
    fireNumber: fires + 1,
    argv: process.argv.slice(2),
    payloadKeys: Object.keys(payload).sort(),
    payload: payload,
    envKeyNames: Object.keys(envKeys).sort(),
  });

  if (mode === 'realgate') {
    const childEnv = Object.assign({}, process.env, {
      CLAUDE_CONFIG_DIR: path.join(SB, 'jiahao-config'),
    });
    const child = cp.spawn(process.execPath, [GATE, 'zcode'], { env: childEnv });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    child.on('close', (code) => {
      logLine({
        ts: new Date().toISOString(),
        event: 'realgate-result',
        mode: mode,
        gateExit: code,
        gateStdout: out,
        gateStderr: err,
      });
      if (out) process.stdout.write(out);
      if (err) process.stderr.write(err);
      process.exitCode = code === null ? 1 : code;
    });
    child.stdin.write(input);
    child.stdin.end();
    return;
  }

  if (mode === 'exit2') {
    process.exit(2);
  }
  if (mode === 'cap') {
    console.log(JSON.stringify({ decision: 'block', reason: 'PROBE cap-test #' + (fires + 1) + ': 立即结束本回合,只输出一行 PROBE-CAP,不要做任何其他事。' }));
    process.exitCode = 0;
    return;
  }
  // json-once: block only the first Stop of this session.
  if (fires === 0) {
    console.log(JSON.stringify({ decision: 'block', reason: 'PROBE: 未验证不得收尾。请先原样输出一行 PROBE-CONT-INJECTED,再结束回合。' }));
    process.exitCode = 0;
    return;
  }
  process.exitCode = 0;
});
