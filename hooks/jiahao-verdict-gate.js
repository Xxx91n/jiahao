#!/usr/bin/env node
// jiahao-verdict-gate.js — Stop/SubagentStop hook
// Block stop if no evidence exists in .jiahao-evidence file.
// Respect stop_hook_active to prevent infinite loop (8-cap guard).

const fs = require('fs');
const { flagPath, evidencePath } = require('./jiahao-paths');

// If jiahao is off, pass through
if (!fs.existsSync(flagPath())) {
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }

  // stop_hook_active = host already forced pass once; let it through
  if (parsed.stop_hook_active === true) {
    process.exit(0);
  }

  // Check evidence file — parse JSON, reject empty arrays
  let hasEvidence = false;
  try {
    const raw = fs.readFileSync(evidencePath(), 'utf8').trim();
    if (raw.length > 0) {
      const parsed = JSON.parse(raw);
      // Must be a non-empty array of evidence records
      hasEvidence = Array.isArray(parsed) && parsed.length > 0;
    }
  } catch (e) { /* no file or invalid JSON = no evidence */ }

  if (!hasEvidence) {
    // Block: output decision:block JSON
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Verification has no evidence: no test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3 of the verification ladder first. Evidence file empty or unparseable.',
    }));
    process.exit(2);
  }

  // Evidence exists — clear it for next round and pass
  try { fs.unlinkSync(evidencePath()); } catch (e) { /* already gone */ }
  process.exit(0);
});

// Windows stdin hang guard
setTimeout(() => process.exit(0), 1000).unref();
