#!/usr/bin/env node
// scripts/resolve.js — the write side of human adjudication (#85).
//
// The read side already existed: gatingRecords() in
// hooks/jiahao-verdict-gate.js drops everything up to the last human verdict
// with verdict:'pass', which is the only release path for a record that carries
// no session_id, and src/calibration.js:176 counts a verdict as eligible only
// when it carries a non-empty reason. Before this file the two hook messages
// told the operator to run `jiahao resolve` and scripts/install.js dispatched
// it, but the module was gone: the only way out of a stale block was hand-
// editing the JSONL, which the chain checks reject.
//
// This file only APPENDS: the chain is append-only (src/evidence-log.js), so a
// verdict is never a rewrite of an existing record, and a chain it cannot read
// is left untouched.

const { createEvidenceLog, recordHash } = require('../src/evidence-log');
const { PREFIXES } = require('../src/shared/prefix-vocab');

// `pass` releases the records written before it. `fail` and `inconclusive` are
// recorded but release nothing, and the cost of `inconclusive` is stated rather
// than hidden: src/calibration.js pairs a verdict with the latest machine record
// and counts only 'pass' as human agreement, so an inconclusive verdict enters
// the κ numerator/denominator as a disagreement.
const VERDICTS = ['pass', 'fail', 'inconclusive'];

const USAGE = [
  'Usage: jiahao resolve --verdict ' + VERDICTS.join('|') + ' --reason <text> --reviewer <id>',
  '',
  'Appends ONE human_verdict record to the evidence chain (.jiahao-evidence).',
  'Records are never rewritten: a re-run adds a second verdict.',
  '`pass` releases every record written before it; `fail` and `inconclusive` do not.',
  'An adjudication without a stated reason is not a valid one (src/calibration.js).',
].join('\n');

function usageError(message) {
  const e = new Error(message);
  e.usage = true;
  return e;
}

// --flag value and --flag=value; anything else is a usage error rather than a
// silently ignored operand: a mistyped flag must not write a verdict.
function parseFlags(argv) {
  const known = { '--verdict': 'verdict', '--reason': 'reason', '--reviewer': 'reviewer' };
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw usageError("unexpected argument '" + arg + "'");
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const key = known[name];
    if (!key) throw usageError("unknown option '" + name + "'");
    let value = eq === -1 ? undefined : arg.slice(eq + 1);
    if (value === undefined) {
      value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw usageError("option '" + name + "' argument missing");
      i++;
    }
    if (Object.prototype.hasOwnProperty.call(out, key)) throw usageError("option '" + name + "' given twice");
    out[key] = value;
  }

  if (out.verdict === undefined) throw usageError("option '--verdict <value>' is required");
  if (VERDICTS.indexOf(out.verdict) < 0) {
    throw usageError("invalid --verdict '" + out.verdict + "' — must be one of " + VERDICTS.join(', '));
  }
  // Same eligibility rule as src/calibration.js:176 — whitespace is not a reason.
  if (out.reason === undefined || out.reason.trim().length === 0) {
    throw usageError('--reason must be non-empty text: an adjudication without a stated reason is not eligible');
  }
  // A verdict nobody can be held to is not an adjudication; the gate messages
  // all show --reviewer <id>, so requiring it asks nothing new of the operator.
  if (out.reviewer === undefined || out.reviewer.trim().length === 0) {
    throw usageError('--reviewer must be a non-empty id');
  }
  return out;
}

function run(argv) {
  let flags;
  try {
    flags = parseFlags(argv || []);
  } catch (e) {
    if (!e.usage) throw e;
    console.error(PREFIXES.usage + ' ' + e.message);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const log = createEvidenceLog();
  // commit() runs the builder under the narrow append lock and hands it the
  // real chain tail, so prev_hash cannot go stale between build and write.
  // This CLI has no input for corrected_output / second_reviewer / overturn;
  // null says "not stated" instead of inventing a value.
  const written = { rec: null };
  log.commit(function (chain, prevHash) {
    const rec = {
      kind: 'human_verdict',
      reviewer_id: flags.reviewer,
      verdict: flags.verdict,
      reason: flags.reason,
      corrected_output: null,
      second_reviewer: null,
      overturn: null,
      timestamp: new Date().toISOString(),
      prev_hash: prevHash,
    };
    rec.event_hash = recordHash(rec);
    written.rec = rec;
    return [rec];
  });

  // commit() drops an unwritable append instead of throwing (hooks must never
  // block), so the receipt is also the failure detector: a verdict that is not
  // on the chain is reported, never assumed. The search runs from the tail — a
  // byte-identical re-run in the same millisecond would otherwise report the
  // earlier record's seq.
  const chain = log.readAll() || [];
  let seq = -1;
  for (let i = chain.length - 1; written.rec && i >= 0; i--) {
    if (chain[i] && chain[i].event_hash === written.rec.event_hash) { seq = i; break; }
  }
  if (seq < 0) {
    console.error(PREFIXES.config + ' human_verdict was NOT appended — the evidence store refused the write, or ' +
      'could not be read back (the evidence-log note above says which). This run changed no existing record.');
    process.exitCode = 1;
    return;
  }

  // The chain has to stay verifiable, or the verdict is worse than no verdict:
  // verdict-gate treats a broken chain as missing evidence.
  const tail = log.verifyTail();
  if (!tail.valid) {
    console.error(PREFIXES.internal + ' human_verdict appended at seq ' + seq + ' (' + written.rec.event_hash +
      ') but the chain does not verify: ' + (tail.reason || 'unknown reason') +
      (typeof tail.broken_at === 'number' ? ' at index ' + tail.broken_at : '') + '.');
    process.exitCode = 1;
    return;
  }

  console.log('human_verdict ' + flags.verdict + ' by ' + flags.reviewer + ' at seq ' + seq +
    ' (chain length ' + chain.length + ')');
  console.log('event_hash ' + written.rec.event_hash);
}

module.exports = { run, parseFlags, USAGE, VERDICTS };

if (require.main === module) {
  try {
    run(process.argv.slice(2));
  } catch (e) {
    console.error(PREFIXES.internal + ' ' + e.message);
    process.exitCode = 1;
  }
}
