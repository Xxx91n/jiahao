# Task book — next round after grill-t10 (pairer product-seam lane)

Repo: D:\Aworker\jiahao. Authority: .scratch/grill-t10/decision-ledger.md
(D-001..D-007, all current). Spec restatement: ../spec-judge-seam-lane.md.

## State at handoff

- v3 falsification-passed, burned, audited (post-round audit PASS-WITH-OBSERVATIONS).
- Pairer adjudicated object: bench/research/capa-pairer.js sha256=9ff2d0ad… / 10697B
  (content hash is identity; path is a reference — eval-plan pins both).
- bench/ is NOT in package.json files -> the pairer has no shipped entity today.
- No hook calls src/detector.js; rec.detector records in production are dormant
  (only sentinel-reconcile writes them, suspicious:false). The pairer lane is the
  FIRST live detection wiring — that is the point of the round.
- judge seam stays dormant/untouched (rescue-only contract, future scoring verifier).

## Order

T-1 docs (doc-before-impl contract) -> T-2 build (shadow wiring) -> T-3 claims
landing -> T-4 corrigendum. Commit documentation round before implementation
starts (AGENTS.md working agreement).

## T-1 — R1 documentation round (covers D-002, D-003, D-004, D-005, D-007)

- ADR-0070: hook-side conviction lane; shadow→enforce promotion contract with
  the four frozen criteria (>=200 real Stop events spanning >=1 full cycle;
  all flagged items owner-reviewed FP=0, review disagreement counts as FP;
  undetermined <=90% no abnormal uptrend; lane p99 <=1s inside 10s hook budget);
  product shape (single-source src/ move, adapter component, requires:
  transcript-file three-state, flag->high severity record shape); claim
  three-sentence skeleton; F-A dispositions; rejected alternatives (agent-side,
  seam occupation, day-one enforce, real-corpus prerequisite, efficacy claim,
  silence).
- CONTEXT.md terms already landed this round (Conviction Lane / Shadow-Enforce
  Promotion Gate / Documented-Decision Closure / Corrigendum Discipline /
  Descriptive Existence Claim) — verify wiring tests still pass.
- Add grill-t10 decision-ledger.md to governance anchors list bound to ADR-0070
  (same convention as grill-t8 -> ADR-0069).
- Freeze the promotion-gate numbers in the ADR text itself.

## T-2 — R2 build round, shadow form (covers D-002, D-003, D-004, D-007)

- Move bench/research/capa-pairer.js -> src/ (same commit: fix bench import path
  + eval-plan.instrument.pairer.path; content hash unchanged, pin intact).
- Transcript adapter: transcript JSONL -> {task, events, closing}; contract tests
  with constructed transcripts (assert extraction), component not adjudication
  object.
- Stop/SubagentStop wiring: read transcript_path from hook stdin -> adapter ->
  pairItem -> on flagged write detector record {suspicious:true, severity:high,
  source:'pairer-instrument', pairer:{family,state,claim,evidence,reason},
  shadow:true} — shadow records NEVER enter the severity matrix.
- Record schema evolution registration for the new fields.
- Capability declaration requires: transcript-file; hosts without transcript_path
  -> lane absent/UNVERIFIABLE, NEVER coverage:partial. Host Contract reachability
  check across the 11 adapters (claude-code first — transcript_path documented).
- Kill switch: channel-level flag file.
- v3 corpus replay -> pairer regression gate (shadow role continues).
- Telemetry surface for promotion inputs (event count, flag count, undetermined
  rate, latency) so the frozen gate is computable at review time.
- Verification: jest full suite, gate:all, pack:smoke, claim-binding wiring tests.

## T-3 — claims landing (covers D-005)

- Three sentences into claim homes (README + claim-template + report surfaces):
  existence+state (shadow modifier), coverage boundary, non-endorsement.
- Register the three sentences in the per-mention binding registry
  (adr-0067-wiring F-4 mechanism).
- v3 fact line untouched; measurement-reproduction invitation clause extended
  to the new channel.

## T-4 — F-A corrigendum (covers D-006)

- Dedicated commit: re-render v3 report md detail sections FROM
  bench/research/out/devin-oot-v3-report.json (never re-run; shot is burned).
  Message declares corrigendum nature.
- Same commit errata: worker stale self-reference comments; Sessions:20 main-set
  scope parenthetical.
- Forward rule registered: future frozen manifests pin durable ref (branch/tag
  or sha+tag dual), workspace sha note-only. v3 manifest NOT rewritten.
- Disposition record: F-A2 line "备案，无需行动" -> all four observations carry
  a documented decision.

## Hard rules

- Frozen artifacts never rewritten (report.json, v3 manifest, v2 anchor tag,
  port score.js/g6-manifest, pairer bytes once moved).
- Shadow records never enter severity matrix; undetermined never flags/blocks.
- Promotion flip is a separate registered act after the bake window — NOT this
  round.
- No new task-wording diversity, no unregistered check families on the lane.
- Use but for all VCS writes; no push unless asked.

## Suggested skills

- $to-spec / $to-tickets / $implement for T-1/T-2 sequencing; $tdd on adapter +
  lane wiring; $code-review before the wiring commits land; $but for all VCS
  writes; $handoff at session end; atomcode-research only if a NEW parameter
  needs external grounding (none expected — all frozen).
