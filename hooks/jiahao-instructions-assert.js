#!/usr/bin/env node
// jiahao-instructions-assert.js - InstructionsLoaded integrity assertion
// (CodeBuddy/Claude-Code-compatible plugin event; grill-t30 D-002).
//
// At rule-load time, verify the dual-profile rules files are present and
// intact, then append a telemetry line the trial reads back (Phase 0 item 0
// of the SCED protocol validates this channel before any data is trusted).
// The expected sha256 oracle lives in the preregistration file
// (bench/codebuddy-trial/judgment-lines.json), not in this script - the
// assertion captures, the registry judges.
//
// Fail-soft by contract: every failure path exits 0. The assertion is an
// audit anchor, never a blocking gate - a broken load is recorded, not
// hidden. Flag off (.jiahao-active absent) -> silent passthrough.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeHookOutput, detectHost } = require('./jiahao-runtime');
const { flagPath, configDir } = require('../src/shared/paths');

const LOG_NAME = '.jiahao-instructions.jsonl';
const RULES = ['rules/jiahao-verifier.md', 'rules/jiahao-generator.md'];

if (!fs.existsSync(flagPath())) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }

  const pluginRoot = process.env.CODEBUDDY_PLUGIN_ROOT
    || process.env.CLAUDE_PLUGIN_ROOT
    || path.join(__dirname, '..');

  const results = RULES.map((rel) => {
    const abs = path.join(pluginRoot, rel.split('/').join(path.sep));
    let rec = { file: rel, present: false };
    try {
      const buf = fs.readFileSync(abs);
      rec = {
        file: rel,
        present: true,
        bytes: buf.length,
        sha256: crypto.createHash('sha256').update(buf).digest('hex'),
        alwaysApply: /alwaysApply:\s*true/.test(buf.toString('utf8')),
      };
    } catch (e) { /* present:false stands */ }
    return rec;
  });

  const rec = {
    event: 'InstructionsLoaded',
    host: detectHost(),
    session_id: parsed.session_id || null,
    ts: new Date().toISOString(),
    results: results,
  };
  try {
    fs.appendFileSync(path.join(configDir(), LOG_NAME), JSON.stringify(rec) + '\n');
  } catch (e) { /* telemetry append is best-effort, never fatal */ }

  const present = results.filter((r) => r.present).length;
  writeHookOutput(
    'JIAHAO rules integrity: ' + present + '/' + RULES.length +
    ' dual-profile files present under plugin root' +
    (present === RULES.length ? '' : ' — MISSING (see .jiahao-instructions.jsonl)'),
    'InstructionsLoaded'
  );
  process.exit(0);
});

// Windows stdin hang guard (same convention as the other hooks)
setTimeout(() => process.exit(0), 1000).unref();
