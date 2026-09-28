# ADR-0088: CodeBuddy Trial Harness — Seven-Clause Apparatus-Trust Contract (grill-t31)

- Status: Accepted — ID-level-only, awaiting entity-level countersign; return condition: the 2026-12-15 tide; return-by: 2026-12-15
- Date: 2026-09-28
- Ledger: `.scratch/grill-t31/decision-ledger.md` — grill-t31 D-001..D-009 (all current)
- Spec: `.scratch/grill-t31/spec-t31-harness.md` (SCED harness build)
- Upstream: ADR-0087 (trial existence + frozen judgment lines = Stage-1 proposition content; this ADR pins how the measurement apparatus itself is trusted = Stage-2 adherence contract). No 0087 promise is copied here.

## Context

ADR-0087 registered the first external-effectiveness trial and froze five
judgment lines plus the detector blob pin. What it could not pin was the
apparatus that produces the readings: how telemetry becomes attributed
evidence, what a verdict is allowed to look like, and where captured bytes
are allowed to live. This ADR is that apparatus-trust contract — seven
clauses as ONE decision (not seven ADRs; spec-t31 §7).

## Decision

### Clause 1 — Membership attribution + orphan hard error (D-002)

Every capture row is owned by exactly one run manifest through the
single-open-window lifecycle (`begin` opens, `end` seals; a second open
while one is unsealed hard-fails). Session ownership follows the session's
FIRST observed event; a session whose first event predates the current
window is marked `spans_boundary_sessions` on the later manifest and owned
by the earlier one. Any capture row whose session is in no manifest's
observed set is an ORPHAN and evaluation refuses the whole run (exit 1) —
unattributed telemetry never gets a verdict.

### Clause 2 — hit | miss | indeterminate three-value verdicts (D-003)

Every judgment line emits `{verdict, reason_code, table, anomalies}` where
verdict ∈ {hit, miss, indeterminate}. An indeterminate is "insufficient
evidence", never a miss and never an effectiveness signal. Reduction of
indeterminate into any owner-side claim is an owner act the harness
structurally cannot perform — no reduction codepath exists.

### Clause 3 — Load-bearing needle falsifiable_check (D-005)

Every planted needle in volumes/*/needles[] carries a falsifiable_check
script that MUST exit 0 on the pristine committed workbench. The multiset
of needle types is part of the formal isomorphism claim across volumes;
verify-needles.js failing = the inducement machinery itself is broken.

### Clause 4 — Three-Tier Residence (D-006)

- Tier 1 never-commit: session transcripts, raw .jiahao-*.jsonl sinks,
  captures/ store, claims/ bodies (nc-010/nc-011).
- Tier 2 committed: runs/<run-id>.json manifests + runs/deviations.jsonl
  append-only ledger.
- Tier 3 registration surface: judgment-lines.json deviations[] is the
  sole append slot on the frozen surface; nothing else mutates it.

No raw captures on the commit surface; no never-commit backbone; no raw
text inside verdict reports; no evaluate writes.

### Clause 5 — Declared-Not-Proven Block (D-005 v)

Each volume manifest carries declared_not_proven: difficulty equivalence,
needle-inducement equivalence, category capability, prompt semantic
equivalence are DECLARED, never asserted as evidence. The honesty clause
bounds formal equivalence to structural-site level only; anything
falsifying it lands in deviations[], not a silent adjustment.

### Clause 6 — Meta-sentinel (D-007 iii)

The acceptance battery includes sentinel fixtures that prove the harness
detects its own fabrications: a doctored claim body breaks claim-integrity
in selfcheck; an injected unowned event refuses all lines. A harness that
passes fabricated input is the failure mode these sentinels exclude.

### Clause 7 — Deviation cursor (D-006 iii)

runs/deviations.jsonl is append-only; runs/deviations-cursor.json records
the last aggregated seq. collect folds new rows into judgment-lines.json
deviations[] under the cursor — idempotent, never rewrites the frozen
surface on a no-op. selfcheck asserts cursor coverage, manifest-tally vs
store counts, Tier-1 hash stability, claim-file hashes.

## Consequences

- Owner-side trial execution remains outside this ADR's scope entirely.
- evaluate.js is read-only by construction (write verbs live in begin/
  collect/end; evaluate holds no write call).
- Any apparatus change after this countersign rides a new ADR; in-place
  edits to the frozen surface are drift and refuse evaluation.
