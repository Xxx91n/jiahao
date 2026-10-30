#!/usr/bin/env node
// jiahao-verdict-gate.js — Stop / SubagentStop hook
//
// rewrite:
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
// One shape from every host: sessionId/agentName spellings are normalized here.
const { normalizePayload, writeBlockOutput } = require('./jiahao-runtime');
const { createEvidenceLog } = require('../src/evidence-log');
const { kappaAdvisory, loadKappaBaseline } = require('../src/calibration');
const evidenceLog = createEvidenceLog();
const sentinel = require('../src/sentinel').begin('jiahao-verdict-gate');

// Output discipline (#84): every decision below is written with console.log and
// then RETURNS. On POSIX stdout to a pipe is an asynchronous write, so
// console.log(...) followed by process.exit() can truncate the envelope - the
// host then reads a silent hook, which for the Stop gate means a lost block.
// Letting the event loop drain flushes it; the stdin guard is unref'd and
// cleared once stdin ends, so nothing but stdout holds the process. Exits that
// print nothing stay exits.

// The stdout JSON decision is shared; the exit code and the Codex stderr copy
// are host dialect. Both live in hooks/jiahao-runtime.js (writeBlockOutput),
// next to the per-host output shapes, so this judgment script stays host-neutral.
function emitBlock(reason) {
  writeBlockOutput(reason);
}

// If jiahao is off, pass through
if (!fs.existsSync(flagPath())) {
  process.exit(0);
}

const profile = readProfile();
const isGenerator = profile === 'generator';

// #75: which records a Stop decision may be made about. The chain is append-only
// and shared by every session on the machine, so reading all of it let one stale
// record - a killed hook's sentinel-reconcile coverage:partial, or an enforce
// pairer-lane high severity - gate every later turn forever, and human
// adjudication could not release it.
//   scopedToSession: with a session_id on the payload, a record MARKED as another
//     conversation's can neither block this Stop nor vouch for it. Case A applies
//     this rule to the whole chain and gatingRecords applies it after the release
//     point, so the two sets diverge once anything has been adjudicated.
//     Unmarked records stay in scope for every session - gate.js and the sentinel
//     write that shape, and dropping them would hand a host that sends no
//     session_id a free pass. The costs are stated rather than hidden: a payload
//     without a session_id filters nothing at all, and because the chain is
//     append-only, an unmarked record already on it vouches for every later
//     session for good - Case A has no release point to advance past, and
//     stamping future writers would not retire what is already written.
//   gatingRecords: additionally drops everything up to the last passed human
//     adjudication, read wherever it sits - including under a different
//     session_id, or a reviewer who cleared a stale escalation from their own
//     conversation could never release it, and #75 would have traded one
//     permanent block for another. A `fail` verdict does not release: the human
//     agreed the claim was unsupported, so the turn still has to be re-verified.
// The chain-integrity check and the κ / pending-escalation advisories keep
// reading the whole chain: corruption has no session, and both are advisory only.
function scopedToSession(chain, sessionId) {
  if (!chain) return [];
  if (!sessionId) return chain;
  return chain.filter(function (rec) {
    return !rec || !rec.session_id || rec.session_id === sessionId;
  });
}

function gatingRecords(chain, sessionId) {
  let releasedAt = -1;
  for (let i = 0; i < chain.length; i++) {
    const rec = chain[i];
    if (rec && rec.kind === 'human_verdict' && rec.verdict === 'pass') releasedAt = i;
  }
  return scopedToSession(chain.slice(releasedAt + 1), sessionId);
}

// dead-man switch (hook-tier hosts): the judge seam re-verification
// deadline is machine-readable. The state is DERIVED from the content-anchored
// deadline constants + the append-only reverify ledger tail, never stored --
// deleting a state file cannot silence it (missing ledger = degraded). When the
// bench assets are absent entirely, load() returns null and behavior is unchanged.

// Windows stdin hang guard: fires only while stdin is still silent. Cleared the
// moment stdin ends - after that the only pending work is the stdout write, and
// a forced exit would truncate it (#84).
const stdinGuard = setTimeout(() => process.exit(typeof process.exitCode === 'number' ? process.exitCode : 0), 1000);
stdinGuard.unref();
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinGuard); // stdin arrived; the hang guard has done its job
  let parsed = {};
  try { parsed = JSON.parse(input); } catch (e) { /* fail-open */ }
  parsed = normalizePayload(parsed);
  sentinel.set('verify', parsed.session_id || null);

  // stop_hook_active = host already forced pass once; let it through
  if (parsed.stop_hook_active === true) {
    process.exit(0);
  }

  // the conviction lane rides this invocation — transcript_path
  // -> transcript adapter -> pairItem -> source:pairer-instrument shadow
  // record. Shadow records are telemetry: they never enter the severity
  // matrix below and never satisfy the no-evidence check. The lane is
  // fail-open: a lane-internal error is a record reason, never a hook failure.
  let laneResult = null;
  try { laneResult = require('../src/pairer-lane').run(parsed, { evidenceLog: evidenceLog }); } catch (e) { laneResult = null; }
  let laneText = '';
  if (laneResult && laneResult.lane === 'recorded' && laneResult.state === 'flagged') {
    laneText = ' Conviction lane (' + laneResult.mode + '): pairer flagged ' +
      (laneResult.family || 'unsupported') + ' — claim ' + JSON.stringify(laneResult.claim) +
      ' vs evidence ' + JSON.stringify(laneResult.evidence) +
      ' (telemetry; resolve via jiahao resolve if wrong).';
  }

  // Read the evidence chain through the EvidenceLog factory:
  // storage is a segmented log directory; legacy single-file arrays remain
  // readable in read-only legacy mode until the first write migrates them.
  // We never delete the log (D4); the chain has to survive SubagentStop
  // and any repeat fire of Stop.
  const rawChain = evidenceLog.readAll();
  // shadow pairer-lane records are instrument telemetry, not agent
  // verification evidence — a chain holding only shadow records still means
  // "no evidence" for the Case A check below. Enforce-mode records
  // (shadow:false) DO enter the matrix and stay visible here.
  const effective = rawChain ? rawChain.filter(function (r) {
    return !(r && r.detector && r.detector.source === 'pairer-instrument' && r.detector.shadow === true);
  }) : rawChain;
  const evidenceChain = (effective && effective.length === 0) ? null : effective;
  // #75: evidence speaks for the session that wrote it - as long as the payload
  // says which session that was. Case A is judged on this session's records plus
  // everything unattributed, so an earlier conversation's marked records can
  // neither block this turn nor vouch for it; with no session_id on the payload
  // nothing is filtered and the whole chain counts. The integrity check below and
  // the advisories stay on the whole chain: corruption has no session, and both
  // are advisory.
  const sessionEvidence = scopedToSession(evidenceChain, parsed.session_id || null);

  // chain-corruption detection runs BEFORE any severity case.
  // A broken chain is treated as missing evidence in verifier profile
  // (block); advisory-only in generator profile.
  if (evidenceChain) {
    // + : verifyTail hot path — active segment plus
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
        return;
      }
      emitBlock(msg);
      return;
    }
  }


  // count inconclusive llm_critic records not yet covered
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
  pendingText += laneText;

  // κ governance RE-ALIGN advisory (never changes exit codes).
  if (evidenceChain) {
    try {
      pendingText += kappaAdvisory(evidenceChain, loadKappaBaseline());
    } catch (e) { /* advisory must never break the gate */ }
  }

  // soft-deadline banner rides pendingText (advisory only,
  // never changes exit codes -- same discipline as the kappa advisory).

  // ---- Case A: no evidence for this turn -------------------------------
  // Block verifier, advisory generator. #75 narrowed the chain this case reads to
  // this session plus the unattributed records: an earlier conversation's marked
  // records are neither this turn's blocker nor this turn's proof.
  if (sessionEvidence.length === 0) {
    if (isGenerator) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: 'JIAHAO ADVISORY: Verification has no evidence — ' +
          'run deterministic checks before claiming done.' + pendingText,
      }));
      return;
    }
    emitBlock('Verification has no evidence: no test run, no state diff, no re-execution quoted. NOT VERIFIED — run rung 1-3 of the verification ladder first. Evidence chain empty, unparseable, or attributable only to other sessions.');
    return;
  }

  // ---- Case B: evidence exists — apply profile × severity matrix (D2) --
  // Find the highest severity among the records this Stop is about. Records
  // without a detector field (or with severity === null) are not suspicious.
  const gating = gatingRecords(evidenceChain, parsed.session_id || null);
  let highestSeverity = null;
  let matchedPhrases = [];
  // coverage is orthogonal to severity — scan it even on
  // non-suspicious records (a benign claim on a truncated view still gates).
  let coveragePartial = null;
  for (const rec of gating) {
    // shadow records never enter the severity matrix.
    if (rec && rec.detector && rec.detector.shadow === true) continue;
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
    // generator profile only annotates partial coverage;
    // severity is judged on the visible part, never inflated or deflated.
    if (coveragePartial && !highestSeverity) {
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: 'JIAHAO ADVISORY (partial coverage): detector saw only a part of this turn (' + coverageKind + '); triage is based on the visible portion.' + pendingText,
      }));
      return;
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
    return;
  }

  // Verifier profile: high-severity + suspicious and no independently-checked
  // evidence → block. Low severity → advisory only.
  if (highestSeverity === 'high') {
      // We do not try to be clever about "no independent evidence" here —
      // the deterministic/checklist records are by definition self-reported.
      // The block reason pins the location of the suspicion so escalations
      // stay triage-able.
      emitBlock(
          'JIAHAO VERIFIER BLOCK (high severity): completion-language detector ' +
          'matched [' + matchedPhrases.slice(0, 5).join(', ') + '] on the ' +
          'evidence chain. Re-verify the underlying state changes with rung ' +
          '1-3 of the ladder before allowing this stop.' + pendingText);
      return;
    }

  // fail-closed on coverage. A verdict on partial evidence is
  // indeterminate (XACML semantics) — route to human adjudication.
  if (coveragePartial) {
    const deg = coveragePartial.degradation || {};
    const detail = deg.detail || {};
    emitBlock(
      'JIAHAO VERIFIER ESCALATE (partial coverage): detector observed a partial view' +
        (deg.kind === 'truncation'
          ? ' (saw ' + detail.bytes_seen + ' of ' + detail.bytes_total + ' bytes, threshold ' + detail.threshold + ')'
          : ' (kind: ' + (deg.kind || 'unknown') + ')') +
        '. Severity was judged on the visible part only; the unfinished cross-section requires human adjudication: jiahao resolve --verdict pass|fail --reason <text> --reviewer <id>.' + pendingText);
    return;
  }

  if (highestSeverity === 'low') {
    console.log(JSON.stringify({
      decision: 'allow',
      systemMessage:
        'JIAHAO ADVISORY (low): soft completion language matched [' +
        matchedPhrases.slice(0, 5).join(', ') + '].' + pendingText,
    }));
    return;
  }

  // No suspicion on any record
  // D4: do NOT consume the evidence file. Idempotent under repeat Stop /
  // SubagentStop fire.
  // pending escalations surface even on the quiet path.
  if (pendingText) {
    console.log(JSON.stringify({ decision: 'allow', systemMessage: 'JIAHAO:' + pendingText }));
  }
  // fall through: the loop drains when stdin has ended, flushing stdout
});
