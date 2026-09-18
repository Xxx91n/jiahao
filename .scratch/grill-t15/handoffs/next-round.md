# grill-t15 → next-round task book (2026-09-18)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-007 all current). Spec: ../spec-disposition-mechanisms.md.

## Rerunnable state (verified at t14 close — historical baseline; re-run before relying)

- `node scripts/run-test-gate.js --expected-suites 72` → 72 suites / 1167 tests
- `npm run gate:all` → exit 0
- `node scripts/check-deferred.js` → 53 entries
- `node scripts/build-governance-anchors.js --check` → 13 artifacts in sync
- `node scripts/check-governance-inventory.js` → 35 entries
- `node scripts/build-rewrite-map.js --check` → in sync
- `node scripts/check-ci-jobs.js` → defer-0004/0026 SATISFIED (awaiting dispositions)
- `node scripts/instrument.js --check` → authoritative; conditional cert to 2026-12-11
- remote main = 21b1442; workspace clean except two intentionally untracked
  audit patches (tq=t13, nl=t14 — NEVER commit; but commit needs explicit IDs)

## T-1 — R1 documentation round (D-002, D-003 partial, D-004, D-005, D-006)

Produce ADR-0076 "round edit-surface taxonomy + registry dispositions" plus:

1. docs/governance/sunset-counter.json — consecutive_zeros=1;
   observations[0]={date 2026-09-17, organic_events 0, evidence_ref→t14
   telemetry checkpoint, ledger_ref→t15 D-002}; schema per spec §2;
   admitted to the anchors chain; wiring coherence assertions; ADR-0075 D-C
   pointer line; defer-0055 stays pointer-only (D-002).
2. docs/governance/surface-taxonomy.json + wiring require-closure test —
   every file classified; runtime closure complete (D-005).
3. Inventory schema + t14 row annotation: governance_tooling_diff +
   carve_out_used fields; check-governance-inventory recomputed-not-trusted;
   adr-0064-t1-wiring +2 tests (schema accepts field; runtime file in
   doc-round diff errors) (D-005).
4. CONTEXT.md — +Round Edit Surface, +Governance Carve-Out; Sunset Trigger
   entry amended with absence≠zero freeze semantics (D-002/D-005).
5. Registry — defer-0026 → actioned (+limitation field); defer-0060 new
   row + ADR-0058 R10/R13 pointer — SAME COMMIT (D-003/D-006).
6. docs/rewrite-map-generator-spec.md Inputs fix (union enumeration) +
   adr-0074 wiring bidirectional assertions — SAME COMMIT; settles F-2
   (D-004).
7. defer-0055 sunset_trigger_pointer → pure pointer (F-3).
8. README ADR index 0076; anchors regen; defer-0061 tally row (net
   addition); AGENTS.md single pointer line.
9. R1 exit: taxonomy closure test green + anchors new-count sync + D-004
   assertions pass + R2-needed content frozen (predicate wording, row JSON,
   ask texts); boundary commit green.

Hard rules: R1 runtime surface absolutely untouched; no gates.json entry
for spec-sync; the ledger's 1/6 trail must reconcile at R1 exit; pins are
mechanism vocabulary only.

## T-2 — R2 implementation round (D-003, D-007)

Ordered:

1. defer-0004 bundle — ONE COMMIT: registry re-defer edit +
   scripts/check-ci-jobs.js predicate rewrite (multi-workflow OR matrix OR
   >3 jobs) + predicate wiring tests with negative fixture. Carve-out
   gates: justification names this disposition; inventory row
   governance_tooling_diff:{files:[check-ci-jobs.js],reason} +
   carve_out_used:1 with baseline recorded (D-003/D-007).
2. Audit nits: stale FAIL message; corrupt-prior-map catch{} → loud fail;
   ROOT hardcode in gen-docs.cjs; wiring describe placement.
3. Telemetry checkpoint (pairer-lane-telemetry) — evidence for the next
   quarterly sunset observation; counter stays 1/6 until the 2026-12
   check-in.
4. WORKFLOW.md disposition: restore or register permanent absence.
5. Round report + consent-sweep ledger lines — defer-0053/0055/0057/0058/
   O-E each get one disposition line at disposition time; consent-sweep +
   standing-review-surface framing, NEVER "audit response" (D-007).
6. Owner-ask bookkeeping (Ask A/B packet texts frozen in T-1).

## T-3 — owner asks (unbundled) (D-001, D-007)

- Ask A — instrument seq-24 sign-off (record-type; open since t13).
- Ask B — defer-0051 evidence-packet ratification (judgmental; rejection
  reopens the row — settles F-1).
- Bookkeeping annotations (NOT asks): ADR-0075 second_reviewer countersign
  lands when the owner ratifies the t14 audit outcome; defer-0060 is a
  tracked row — owner action is its unfreeze_if, not a decision ask.

## Suggested skills

- $implement — R1/R2 execution
- $tdd — wiring/predicate test additions at agreed seams
- $code-review — before each commit
- $domain-modeling — CONTEXT/ADR authoring
- $handoff — next checkpoint
- atomcode-research — contested dispositions
- gitbutler (but) — ALL VCS writes; explicit change IDs always
