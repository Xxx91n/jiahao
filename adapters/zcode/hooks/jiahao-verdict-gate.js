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
// #124: the claim gate reuses the detector's completion-claim vocabulary —
// the same claim side the claim check parses — on this turn's own words. It comes
// from src/success-claim.js: the vendored hook closure must stay free of
// third-party runtime dependencies, and detector.js drags request-anchors
// (http-link-header) in. The gate arbitrates with claimsCompletion (negation
// scoped to its clause; the ambiguous words 通过/可用/works/passing only
// count with a completion context), not the triage-grade hasSuccessClaim.
const { claimsCompletion } = require('../src/success-claim');
// #71 item 12: a factory throw used to kill the hook at module load, before any
// judgment — every host then read a silent Stop hook, which is a fail-open
// gate. Hold the error and turn it into the normal block decision below, after
// stdin is in and stop_hook_active has been honoured.
let evidenceLog = null;
let initError = null;
try { evidenceLog = createEvidenceLog(); } catch (e) { initError = e; }
const sentinel = require('../src/sentinel').begin('jiahao-verdict-gate');

// Output discipline (#84): every decision below is written with console.log and
// then RETURNS. On POSIX stdout to a pipe is an asynchronous write, so
// console.log(...) followed by process.exit() can truncate the envelope - the
// host then reads a silent hook, which for the Stop gate means a lost block.
// Letting the event loop drain flushes it; the stdin guard is unref'd and
// cleared once stdin ends, so nothing but stdout holds the process. Exits that
// print nothing stay exits.

// The stdout JSON decision is shared; the exit code and the Codex stderr copy
// are host config differences. Both live in hooks/jiahao-runtime.js (writeBlockOutput),
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
// transcript-check high severity - gate every later turn forever, and human
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

// dead-man switch (hosts whose hooks can block): the judge checkpoint re-verification
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

  // #71 item 12. Verifier fails closed: a gate that cannot read the chain
  // cannot judge this Stop, and a silent allow is the failure the gate exists
  // to prevent. Generator stays advisory (D2: it never blocks) and says so
  // instead of passing silently. Every host keeps its own envelope/exit code.
  if (initError) {
    const detail = initError && initError.message ? initError.message : String(initError);
    if (isGenerator) {
      console.log(JSON.stringify({
        systemMessage: 'JIAHAO ADVISORY: evidence log could not initialize (' +
          detail + '); this stop was not judged.',
      }));
      return;
    }
    emitBlock('JIAHAO VERDICT GATE: evidence log could not initialize (' +
      detail + '). Failing closed — this Stop cannot be judged.');
    return;
  }

  // the transcript check rides this invocation — transcript_path
  // -> transcript adapter -> checkClaim -> source:pairer-instrument shadow
  // record. Shadow records are telemetry: they never enter the severity
  // matrix below and never satisfy the no-evidence check. The check is
  // fail-open: an internal error is a record reason, never a hook failure.
  let checkResult = null;
  try { checkResult = require('../src/transcript-check').run(parsed, { evidenceLog: evidenceLog }); } catch (e) { checkResult = null; }
  let checkText = '';
  if (checkResult && checkResult.outcome === 'hard-stop') {
    // The dead-man switch refused to record this Stop (transcript-check surfaces
    // the typed refusal as an outcome). A turn may not be allowed on a chain
    // that just refused its witness: verifier blocks with the refusal reason;
    // generator stays advisory-fail-open (D2).
    if (!isGenerator) {
      emitBlock(checkResult.reason || 'evidence log refused the stop record');
      return;
    }
    checkText = ' ' + (checkResult.reason || 'evidence log refused the stop record');
  } else if (checkResult && checkResult.outcome === 'recorded' && checkResult.state === 'flagged') {
    checkText = ' Transcript check (' + checkResult.mode + '): claim check flagged ' +
      (checkResult.family || 'unsupported') + ' — claim ' + JSON.stringify(checkResult.claim) +
      ' vs evidence ' + JSON.stringify(checkResult.evidence) +
      ' (telemetry; resolve via jiahao resolve if wrong).';
  }

  // Read the evidence chain through the EvidenceLog factory:
  // storage is a segmented log directory; legacy single-file arrays remain
  // readable in read-only legacy mode until the first write migrates them.
  // We never delete the log (D4); the chain has to survive SubagentStop
  // and any repeat fire of Stop.
  const rawChain = evidenceLog.readAll();
  // shadow transcript-check records are instrument telemetry, not agent
  // verification evidence — a chain holding only shadow records still means
  // "no evidence" for the Case A check below. Enforce-mode records
  // (shadow:false) DO enter the matrix and stay visible here — except the
  // undetermined ones: an adapter failure or a checkClaim exception classifies
  // nothing (transcript-check: they never flag and never block), so they must not
  // satisfy the no-evidence check any more than shadow records do
  // (CodeRabbit #115 round 2).
  // ADJUDICATED (#71 item 15): enforce-mode transcript-check records COUNT as Case A
  // evidence. Promotion out of shadow is a deliberate human act (the
  // .jiahao-transcript-check-enforce marker is not written by the check), and the
  // record carries the claim check's own claim/evidence pair, so it is a checked
  // observation rather than transport telemetry. Shadow records stay
  // telemetry because nobody has accepted the check's verdict yet. Keeping
  // enforce records out of Case A would make the only evidence they carry
  // invisible to the check that decides "was anything verified" — the
  // opposite of what promotion means.
  const effective = rawChain ? rawChain.filter(function (r) {
    if (!(r && r.detector && r.detector.source === 'pairer-instrument')) return true;
    if (r.detector.shadow === true) return false;
    return !(r.detector.pairer && r.detector.pairer.state === 'undetermined');
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
        console.log(JSON.stringify({ systemMessage: msg }));
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
  pendingText += checkText;

  // κ governance RE-ALIGN advisory (never changes exit codes).
  if (evidenceChain) {
    try {
      pendingText += kappaAdvisory(evidenceChain, loadKappaBaseline());
    } catch (e) { /* advisory must never break the gate */ }
  }

  // soft-deadline banner rides pendingText (advisory only,
  // never changes exit codes -- same discipline as the kappa advisory).

  // ---- #124: the claim gate — Case A only tightens a turn that CLAIMS done
  // -----------------------------------------------------------------------
  // Case A used to block every verifier Stop with no evidence record, which
  // equated "no claim" with "false claim": a pure Q&A or read-only status
  // report could not end without a human `jiahao resolve` (issue #124, live on
  // WorkBuddy 5.9.4, 2026-11-01). The documented contract — "block the turn
  // that CLAIMS done without verification" — needs a claim check first.
  // Sources for this turn's own words, in payload order:
  //   last_assistant_message — WorkBuddy / Qoder / ZCode carry it on their
  //     Stop payloads (WorkBuddy/Qoder probed in
  //     docs/evidence/v0.3.0/workbuddy-hook-probe-2026-10-31.md and
  //     qoder-runtime-hook-schema.txt — Qoder attaches it when a message
  //     exists; ZCode per zcode-probe-notes.md); camelCase spellings are
  //     folded in by normalizePayload.
  //   checkResult.closing     — hosts that ride transcript_path instead
  //     (Claude Code, declared-unverified in-repo that it lacks the field);
  //     the transcript check already adapted the transcript, so the closing
  //     rides for free.
  // Neither source present → claim state UNKNOWN: fall through to the
  // fail-closed behavior below (a host that hands the gate no words to read
  // gets no new free pass). Known unknown-state cases, disclosed: hosts with
  // neither field (Antigravity / Copilot hand a transcriptPath the adapter
  // cannot parse), and hosts where the transcript check is switched off
  // (.jiahao-transcript-check-off) — the check is also the transcript reader, so
  // with it off the gate loses the closing route. Both keep the pre-#124
  // blocking behavior; widening them is not this ticket's scope.
  // A present source that carries no completion claim → this turn declares
  // nothing, so there is no declaration to verify: advisory allow, and ONLY
  // out of Case A — when session evidence exists, Case B (high-severity /
  // partial-coverage) still runs, so a claim-free message can never waive a
  // pending severity or coverage block (#124 review round 1; CodeRabbit
  // round 1). The allow stays an ABSENT decision (#71 item 5) — the advisory
  // rides systemMessage.
  let claimState = null; // null = unknown: this host handed the gate no words
  {
    const claimSources = [];
    if (typeof parsed.last_assistant_message === 'string' && parsed.last_assistant_message.trim()) {
      claimSources.push(parsed.last_assistant_message);
    }
    if (checkResult && checkResult.outcome === 'recorded' && typeof checkResult.closing === 'string' && checkResult.closing.trim()) {
      claimSources.push(checkResult.closing);
    }
    if (claimSources.length > 0) {
      claimState = false;
      for (const s of claimSources) {
        try {
          if (claimsCompletion(s)) { claimState = true; break; }
        } catch (e) {
          // an internal detector error is an inability to judge, not an
          // observation of "no claim" — degrade to unknown (#71 item 12
          // fail-closed doctrine), never to the allow path.
          claimState = null;
        }
      }
    }
    // The claim check's own parsed claim is direct declaration evidence: a closing
    // it could parse a claimed value out of claimed something, whatever the
    // sentence-level regex above decided.
    if (claimState !== true && checkResult && checkResult.outcome === 'recorded' && checkResult.claim != null) {
      claimState = true;
    }
  }
  if (claimState === false && sessionEvidence.length === 0) {
    console.log(JSON.stringify({
      systemMessage: 'JIAHAO ADVISORY: no completion claim in this turn — ' +
        'the stop is allowed without a verification check.' + pendingText,
    }));
    return;
  }

  // ---- Case A: no evidence for this turn -------------------------------
  // Block verifier, advisory generator. #75 narrowed the chain this case reads to
  // this session plus the unattributed records: an earlier conversation's marked
  // records are neither this turn's blocker nor this turn's proof.
  if (sessionEvidence.length === 0) {
    if (isGenerator) {
      console.log(JSON.stringify({
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
        systemMessage: 'JIAHAO ADVISORY (partial coverage): detector saw only a part of this turn (' + coverageKind + '); triage is based on the visible portion.' + pendingText,
      }));
      return;
    }
    if (highestSeverity) {
      console.log(JSON.stringify({
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
  // #71 item 5: an allow is an ABSENT decision. The host's decision field only
  // defines "block"; echoing "allow" invented a value the contract does not
  // have (and WorkBuddy, which blocks on {decision:"block"} alone, has no
  // reason to parse it). The advisory rides systemMessage.
  if (pendingText) {
    console.log(JSON.stringify({ systemMessage: 'JIAHAO:' + pendingText }));
  }
  // fall through: the loop drains when stdin has ended, flushing stdout
});
