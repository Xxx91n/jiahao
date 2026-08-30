#!/usr/bin/env node
// scripts/check-gate-params.js - ADR-0036 D4: gate-defaults consistency.
// gates.json entries carry a params block declaring the command's parameters
// (SLSA provenance externalParameters "SHOULD reflect reality" shape). This
// check parses each entry's command line and asserts the declared params match
// the effective CLI flags exactly (declaration <-> execution). Fail-closed:
// missing params block or drift both exit 1. Behavioral pass/fail stays with
// the probe gates (ADR-0029); this gate only stops silent default drift.

'use strict';

const { loadRegistry } = require('./run-gates');

// Parse the flag tail of a command string: --flag (bool true) / --key value.
function parseFlags(command) {
  const toks = command.trim().split(/\s+/);
  const flags = {};
  for (let i = 0; i < toks.length; i++) {
    if (!toks[i].startsWith('--')) continue;
    const key = toks[i].slice(2);
    const next = toks[i + 1];
    if (next !== undefined && !next.startsWith('--') && !next.includes('/') && !/\.(js|json)$/.test(next)) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

function checkParams(registry) {
  const errors = [];
  for (const e of registry.entries) {
    const tag = e.name;
    if (!e.params || typeof e.params !== 'object' || Array.isArray(e.params)) {
      errors.push(tag + ': params block missing (ADR-0036 D4 - declare {} when no flags)');
      continue;
    }
    const actual = parseFlags(e.command);
    for (const [k, v] of Object.entries(e.params)) {
      if (!(k in actual)) errors.push(tag + ': declared param --' + k + ' not present in command "' + e.command + '"');
      else if (actual[k] !== v) errors.push(tag + ': param --' + k + ' declared ' + JSON.stringify(v) + ' but command has ' + JSON.stringify(actual[k]));
    }
    for (const k of Object.keys(actual)) {
      if (!(k in e.params)) errors.push(tag + ': command flag --' + k + ' not declared in params (silent default risk)');
    }
  }
  return errors;
}

module.exports = { parseFlags, checkParams };

if (require.main === module) {
  const reg = loadRegistry();
  const errors = checkParams(reg);
  for (const e of errors) console.error('FAIL: ' + e);
  if (errors.length) process.exit(1);
  console.log('[gate-params] OK: ' + reg.entries.length + ' entries, declared params match effective commands (ADR-0036 D4)');
  process.exit(0);
}
