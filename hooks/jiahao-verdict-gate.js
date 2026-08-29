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
const path = require('path');
const { flagPath } = require('../src/shared/paths');
const { readProfile } = require('./jiahao-profile');
const { createEvidenceLog } = require('../src/evidence-log');
const { kappaAdvisory, loadKappaBaseline } = require('../src/calibration');
const evidenceLog = createEvidenceLog();
const sentinel = require('../src/sentinel').begin('jiahao-verdict-gate');

// If jiahao is off, pass through
if (!fs.existsSync(flagPath())) {
  process.exit(0);
}

const profile = readProfile();
const isGenerator = profile === 'generator';

// ADR-0030 D4 dead-man switch (hook-tier hosts): the judge seam re-verification
// deadline is machine-readable. The state is DERIVED from the content-anchored
// deadline constants + the append-only reverify ledger tail, never stored --
// deleting a state file cannot silence it (missing ledger = degraded). When the
// bench assets are absent entirely, load() returns null and behavior is unchanged.
let reverifyDeg = null;
try { reverifyDeg = require('../src/reverify-schedule').load(path.join(__dirname, '..')); } catch (e) { reverifyDeg = null; }

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  sentinel.set('verify', parsed.session_id || null);

  // stop_hook_active = host already forced pass once; let it through
  if (parsed.stop_hook_active === true) {
    process.exit(0);
  }

  // Read the evidence chain through the EvidenceLog factory (ADR-0026 D1/D5):
  // storage is a segmented log directory; legacy single-file arrays remain
  // readable in read-only legacy mode until the first write migrates them.
  // We never delete the log (D4); the chain has to survive SubagentStop
  // and any repeat fire of Stop.
  const evidenceChain = evidenceLog.readAll();

  // ADR-0013 D4: chain-corruption detection runs BEFORE any severity case.
  // A broken chain is treated as missing evidence in verifier profile
  // (block, exit 2); advisory-only in generator profile.
  if (evidenceChain) {
    // ADR-0013 D4 + ADR-0026 D4: verifyTail hot path — active segment plus
    // previous-segment anchor prechecks. Legacy files are whole-chain
    // verified inside verifyTail. Cold full verification lives in
    // scripts/verify-evidence.js and is deliberately NOT in the per-turn path.
    const chainCheck = evidenceLog.verifyTail();
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


  // ADR-0017 D4: count inconclusive llm_critic records not yet covered
  // by a later human_verdict record. Advisory only — never changes exit codes.
  let pendingText = '';
  if (evidenceChain) {
    let pending = 0;
    for (const rec of evidenceChain) {
      if (rec && rec.kind === 'human_verdict') { pending = 0; continue; }
      if (rec && rec.gate_type === 'llm-critic' && rec.status === 'inconclusive') pending++;
    }
    if (pending > 0) {
      pendingText = ' Pending escalations: ' + pending +
        ' (advisory — resolve via: jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>).';
    }
  }

  // ADR-0018 D4: κ governance RE-ALIGN advisory (never changes exit codes).
  if (evidenceChain) {
    try {
      pendingText += kappaAdvisory(evidenceChain, loadKappaBaseline());
    } catch (e) { /* advisory must never break the gate */ }
  }

  // ADR-0030 D4: soft-deadline banner rides pendingText (advisory only,
  // never changes exit codes -- same discipline as the kappa advisory).
  if (reverifyDeg && reverifyDeg.state.state === 'warn' && reverifyDeg.banner) pendingText += ' ' + reverifyDeg.banner;

  // ---- Case A: no evidence at all --------------------------------------
  // Behaviour unchanged from ADR-0010: block verifier, advisory generator.
  if (!evidenceChain) {
    if (isGenerator) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: 'JIAHAO ADVISORY: Verification has no evidence — ' +
          'run deterministic checks before claiming done.' + pendingText,
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
  // ADR-0022 D4: coverage is orthogonal to severity — scan it even on
  // non-suspicious records (a benign claim on a truncated view still gates).
  let coveragePartial = null;
  for (const rec of evidenceChain) {
    if (rec && rec.detector) {
      if (rec.detector.coverage === 'partial' && !coveragePartial) coveragePartial = rec.detector;
    }
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
  const coverageKind = coveragePartial ? (coveragePartial.degradation && coveragePartial.degradation.kind || 'unknown') : null;

  // Generator profile: never blocks (D2). Advisory message carries the
  // suspicion but no decision.
  if (isGenerator) {
    // ADR-0022 D4: generator profile only annotates partial coverage;
    // severity is judged on the visible part, never inflated or deflated.
    if (coveragePartial && !highestSeverity) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: 'JIAHAO ADVISORY (partial coverage): detector saw only a part of this turn (' + coverageKind + '); triage is based on the visible portion.' + pendingText,
      }));
      process.exit(0);
    }
    if (highestSeverity) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage:
          'JIAHAO ADVISORY (' + highestSeverity + '): completion language ' +
          'matched [' + matchedPhrases.slice(0, 5).join(', ') + ']. ' +
          'Detector is a triage signal, not proof — check that state ' +
          'changes were actually observed.' + pendingText,
      }));
    }
    process.exit(0);
  }

  // Verifier profile: high-severity + suspicious and no independently-checked
  // evidence → block. Low severity → advisory only.
  if (highestSeverity === 'high') {
    // ADR-0030 D4: past the hard deadline the judge seam is advisory-only.
    // Suspicion blocking degrades to advisory; chain-corruption, no-evidence
    // and coverage fail-closed paths stay blocking (different invariants).
    if (reverifyDeg && reverifyDeg.state.state === 'degraded') {
      // Audit F1: partial coverage is a different invariant than suspicion; it
      // must not ride the advisory bypass. Fall through to the coverage
      // ESCALATE branch below instead of allowing.
      if (!coveragePartial) {
        console.log(JSON.stringify({
          decision: 'allow',
          systemMessage: reverifyDeg.banner + ' Original finding (high severity, unblocked): completion-language detector matched [' + matchedPhrases.slice(0, 5).join(', ') + '].' + pendingText,
        }));
        process.exit(0);
      }
    } else {
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
        '1-3 of the ladder before allowing this stop.' + pendingText,
    }));
    process.exit(2);
    }
  }

  // ADR-0022 D4: fail-closed on coverage. A verdict on partial evidence is
  // indeterminate (XACML semantics) — route to human adjudication, exit 2.
  if (coveragePartial) {
    const deg = coveragePartial.degradation || {};
    const detail = deg.detail || {};
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'JIAHAO VERIFIER ESCALATE (partial coverage): detector observed a partial view' +
        (deg.kind === 'truncation'
          ? ' (saw ' + detail.bytes_seen + ' of ' + detail.bytes_total + ' bytes, threshold ' + detail.threshold + ')'
          : ' (kind: ' + (deg.kind || 'unknown') + ')') +
        '. Severity was judged on the visible part only; the unfinished cross-section requires human adjudication: jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>.' + pendingText,
    }));
    process.exit(2);
  }

  if (highestSeverity === 'low') {
    console.log(JSON.stringify({
      decision: 'allow',
      systemMessage:
        'JIAHAO ADVISORY (low): soft completion language matched [' +
        matchedPhrases.slice(0, 5).join(', ') + '].' + pendingText,
    }));
    process.exit(0);
  }

// No suspicion on any record
  // D4: do NOT consume the evidence file. Idempotent under repeat Stop /
  // SubagentStop fire.
  // ADR-0017 D4: pending escalations surface even on the quiet path.
  if (pendingText) {
    console.log(JSON.stringify({ decision: 'allow', systemMessage: 'JIAHAO:' + pendingText }));
  }
  process.exit(0);
});

// Windows stdin hang guard
setTimeout(() => process.exit(0), 1000).unref();
