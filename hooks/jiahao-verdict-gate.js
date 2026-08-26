#!/usr/bin/env node
// jiahao-verdict-gate.js — Stop / SubagentStop hook
//
// ADR-0012 rewrite:
//   D2  profile × severity decision branch (generator always advisory;
//       verifier blocks only on no-evidence or high-severity suspicion).
//   D4  idempotent rounds: NEVER unlinkSync the evidence file. The chain is
//       append-only with sidecar idempotency (see src/evidence-log.js),
//       so the second Stop / SubagentStop fire sees the same chain and the
//       same verdict.
//   D5  registered for both Stop and SubagentStop in hooks.json — parity
//       between primary and subagent finish events.

const fs = require('fs');
const { flagPath, evidencePath } = require('../src/shared/paths');
const { readProfile } = require('./jiahao-profile');
const { createEvidenceLog } = require('../src/evidence-log');
const evidenceLog = createEvidenceLog();

// If jiahao is off, pass through
if (!fs.existsSync(flagPath())) {
  process.exit(0);
}

const profile = readProfile();
const isGenerator = profile === 'generator';

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

  // Read the evidence chain. We do NOT delete the file afterwards (D4);
  // the chain has to survive SubagentStop and any repeat fire of Stop.
  let evidenceChain = null;
  try {
    const raw = fs.readFileSync(evidencePath(), 'utf8').trim();
    if (raw.length > 0) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        evidenceChain = data;
      }
    }
  } catch (e) { /* no file or invalid JSON = no evidence */ }

  // ADR-0013 D4: chain-corruption detection runs BEFORE any severity case.
  // A broken chain is treated as missing evidence in verifier profile
  // (block, exit 2); advisory-only in generator profile.
  if (evidenceChain) {
    const chainCheck = evidenceLog.verify(evidenceChain);
    if (!chainCheck.valid) {
      const msg = 'JIAHAO CHAIN CORRUPTION: evidence chain invalid at ' +
        'index ' + chainCheck.broken_at + ' (' + chainCheck.reason + '). ' +
        'Possible tamper or truncation — do not trust this chain.';
      if (isGenerator) {
        console.log(JSON.stringify({ decision: 'allow', systemMessage: msg }));
        process.exit(0);
      }
      console.log(JSON.stringify({ decision: 'block', reason: msg }));
      process.exit(2);
    }
  }

  // ---- Case A: no evidence at all --------------------------------------
  // Behaviour unchanged from ADR-0010: block verifier, advisory generator.
  if (!evidenceChain) {
    if (isGenerator) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: 'JIAHAO ADVISORY: Verification has no evidence — ' +
          'run deterministic checks before claiming done.',
      }));
      process.exit(0);
    }
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Verification has no evidence: no test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3 of the verification ladder first. Evidence file empty or unparseable.',
    }));
    process.exit(2);
  }

  // ---- Case B: evidence exists — apply profile × severity matrix (D2) --
  // Find the highest severity on any record in the chain. Records without
  // a detector field (or with severity === null) are not suspicious.
  let highestSeverity = null;
  let matchedPhrases = [];
  for (const rec of evidenceChain) {
    if (rec && rec.detector && rec.detector.suspicious) {
      if (rec.detector.severity === 'high') {
        highestSeverity = 'high';
      } else if (rec.detector.severity === 'low' && highestSeverity !== 'high') {
        highestSeverity = 'low';
      }
      if (Array.isArray(rec.detector.matched_phrases)) {
        matchedPhrases = matchedPhrases.concat(rec.detector.matched_phrases);
      }
    }
  }

  // Generator profile: never blocks (D2). Advisory message carries the
  // suspicion but no decision.
  if (isGenerator) {
    if (highestSeverity) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage:
          'JIAHAO ADVISORY (' + highestSeverity + '): completion language ' +
          'matched [' + matchedPhrases.slice(0, 5).join(', ') + ']. ' +
          'Detector is a triage signal, not proof — check that state ' +
          'changes were actually observed.',
      }));
    }
    process.exit(0);
  }

  // Verifier profile: high-severity + suspicious and no independently-checked
  // evidence → block. Low severity → advisory only.
  if (highestSeverity === 'high') {
    // We do not try to be clever about "no independent evidence" here —
    // the deterministic/checklist records are by definition self-reported.
    // The block reason pins the location of the suspicion so escalations
    // stay triage-able.
    console.log(JSON.stringify({
      decision: 'block',
      reason:
        'JIAHAO VERIFIER BLOCK (high severity): completion-language detector ' +
        'matched [' + matchedPhrases.slice(0, 5).join(', ') + '] on the ' +
        'evidence chain. Re-verify the underlying state changes with rung ' +
        '1-3 of the ladder before allowing this stop.',
    }));
    process.exit(2);
  }

  if (highestSeverity === 'low') {
    console.log(JSON.stringify({
      decision: 'allow',
      systemMessage:
        'JIAHAO ADVISORY (low): soft completion language matched [' +
        matchedPhrases.slice(0, 5).join(', ') + ']. Advisory only.',
    }));
    process.exit(0);
  }

// No suspicion on any record
  // D4: do NOT consume the evidence file. Idempotent under repeat Stop /
  // SubagentStop fire.
  process.exit(0);
});

// Windows stdin hang guard
setTimeout(() => process.exit(0), 1000).unref();
