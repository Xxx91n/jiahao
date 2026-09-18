# grill-t15 audit PASSED WITH FINDINGS — handoff to grill-t16 (2026-09-18)

Second-party audit verdict: **PASS WITH FINDINGS** (same class as t14).
Full audit: `.scratch/grill-t15/audit-evidence/audit-report-2026-09-18.md`.
Round report under audit: `.scratch/grill-t15/reports/2026-09-18-report.md`.
Ledger/spec/taskbook: `.scratch/grill-t15/decision-ledger.md`,
`.scratch/grill-t15/spec-disposition-mechanisms.md`,
`.scratch/grill-t15/handoffs/next-round.md`.

## Verified state (auditor re-ran, do not re-litigate)

- `node scripts/run-test-gate.js --expected-suites 73` -> 73/1194, 0 skipped
- `npm run gate:all` -> exit 0 (35 entries, 4 unverifiable ci-mode, 2 advisory)
- `node scripts/check-deferred.js` -> 55 entries (47 live, 8 closed/actioned)
- `node scripts/build-governance-anchors.js --check` -> 15 artifacts in sync
- `node scripts/check-governance-inventory.js` -> 35 entries + trend advisory
- `node scripts/build-rewrite-map.js --check` -> 1403 citations in sync
- `node scripts/check-ci-jobs.js` -> exit 1 (defer0004=unmet, defer0026=SATISFIED)
- `node scripts/instrument.js --check` -> authoritative, conditional cert to 2026-12-11
- `npm pack` -> 112 files, **329844 B** (post-T-3; <340000)
- branch `grill-t15-docs` = 9 content commits over base 21b1442 (kkx, vwm,
  kuk, kym, wuk, opl, pvz, ovs, pyt); T-3 owner dispositions landed
  (seq=27 record_signoff; defer-0051 owner_ratification=ratified;
  ADR-0075 countersign 2026-09-18).

## Findings to disposition next round (F-1..F-5 of THIS audit)

1. **F-A (medium) — check-ci-jobs exit-code conflation.** `evaluate()`
   returns satisfied = unmet.length===0 across BOTH rows; check-deferred
   treats exit 0 as THE row's trigger. Only defer-0004 consumes it now:
   a workflow split (the likeliest defer0004 trigger) moves the summary
   job out of ci.yml, defer0026 legs regress, exit=1 -> the narrowed
   tripwire fires silently. Fix: exit keyed to the live row (defer0004)
   or a per-row selector; pin exit semantics in test/adr-0058-wiring.test.js.
2. **F-B (low)** — check-ci-jobs.js header still describes the dead
   "multi-job" predicate (lines 4-5). Fix with F-A, same commit.
3. **F-C (low)** — defer-0004 disposition lacks the explicit "ADR-0058 D-C"
   citation (spec S3 / ledger D-003). Registry rationale or ledger note.
4. **F-D (low)** — governance_tooling_diff completeness: two R2
   mechanism-output artifacts touched (src/instrument-state.json via T-3,
   bench/research/out/g6-publish-replay.json via gate refresh) undeclared.
   Recompute validates declared files only. Disclose, or amend
   surface-taxonomy/diff_semantics to name the output-artifact convention.
5. **F-E (nits)** — test/adr-0069-wiring.test.js stale comment;
   surface-taxonomy.js dead `m[1]||m[2]`; CONTEXT carve-out gloss drops
   the inventory-row channel; any_matrix regex misses inline `matrix:{}`;
   ledger "1346 citations" vs final 1403; round-report stale numbers
   (skips 3->0, pack 329559->329844, instrument entries 26->27).

## Suggested next grill direction

grill-t16 = small fix + disposition round: land F-A/F-B/F-C as one
implementation bundle (R2 surface — this is implementation-round
territory, NOT a doc-round carve-out case), decide F-D (disclose vs
taxonomy amendment), sweep F-E nits, then re-run the identical acceptance
battery above. Standing items: defer-0060 quarterly (review_at
2026-12-15, owner actions = unfreeze_if); sunset counter next observation
2026-12-15 (stays 1/6); pending-evaluation SLA rows stay on cadence.

## Rules still in force

- `but` for all VCS writes, explicit change IDs; separate branch per session.
- NEVER commit the three audit-evidence patches:
  `.scratch/grill-t13/audit-evidence/r2-round-diff.patch` (tq),
  `.scratch/grill-t14/audit-evidence/round-diff.patch` (nl),
  `.scratch/grill-t15/audit-evidence/round-diff.patch` (xu).
- Consent-sweep / standing-review-surface framing for cadence items —
  never "audit response".

## Suggested skills

- $implement — F-A/F-B/F-C fix bundle
- $tdd — exit-semantics pin + predicate tests at the agreed seam
- $code-review — before each commit
- $handoff — next checkpoint
- gitbutler (`but`) — all VCS writes
