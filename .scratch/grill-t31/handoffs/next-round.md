# grill-t31 next-round task book — SCED trial harness build

Sole decision source: `D:\Aworker\jiahao\.scratch\grill-t31\decision-ledger.md`
(D-001..D-009, all current). Execution spec:
`D:\Aworker\jiahao\.scratch\grill-t31\spec-t31-harness.md`. Context
restore: `D:\Aworker\jiahao\.scratch\grill-t30\handoffs\2026-09-27-audit-handoff.md`
(t30 PASS: adapter bundle + frozen protocol + JL-1..5 registered;
judgment-lines.json detector sha256
`a0ba70fbfb82229b41f538994c159c77cd379cfdc118994cc92c649273ec4960`).
Nine atomcode research reports for this round live in the ctx index —
`ctx_search` for manifest attribution, three-valued evaluation, claim
capture, isomorphism gating, residence tiers, fixture coverage, ADR
carrier, and workbench lifecycle before touching the matching spec
section.

Authority boundary (unchanged): pushes, merges, tag pushes,
countersigns, pending-confirmation ratify/revoke, ADR-0088 countersign,
and the CodeBuddy trial execution itself are USER/owner actions. The
agent drafts, commits locally on its own lane, and runs local
verification only. The agent NEVER runs the trial, never emits an
effect verdict, and never reduces an indeterminate.

## T-0 — Pre-flight [D-001]

- `but status` + `git log --oneline -3` — confirm the working tree,
  pick the base for a dedicated t31 lane (parallel with other lanes).
- Re-read `decision-ledger.md` — the ledger is the only source; if any
  spec line lacks a D-record, stop and report, do not write.
- Re-read spec `§9 Out-of-scope` — settle-window leg, bypass
  hardening, polygraph appendix, and the trial itself are NOT this
  round.
- Research recall via ctx_search; do not re-derive from memory.

Suggested skills: gitbutler.

## T-1 — Run-manifest spine + begin/end [D-002]

- `bench/codebuddy-trial/runs/<run-id>.json` schema + writer:
  open fields (run_id/phase/volume/planned_task_ids/opened_at
  UTC-ISO-8601/host_version/bundle_sha/manifest_schema_version); close
  fields (closed_at/status:sealed/observed_session_ids/
  task_completion_tally); sealed ⇒ immutable, corrections = new
  manifest.
- `tools/begin.js` / `tools/end.js`: single-open-window hard error;
  end flushes all three jsonl sinks then reconciles planned vs
  observed task sets, recording the delta.
- spans_boundary marking; ingest ISO-8601-UTC validation hooks.

Suggested skills: tdd.

## T-2 — JL evaluator + eval-map.json [D-003]

- `evaluate(events, taskContext) -> hit|miss|indeterminate` pure
  functions for JL-1..JL-5; strict-inequality semantics for JL-3/JL-4
  exactly per spec §3 (degenerate-baseline-zero,
  identical-classification, floor-trap rule, stratum-consistency).
- `eval-map.json` frozen map: predicate-id → function → semantic
  note, `source_adr: "0087"`; every classification row carries
  detect() content hash.
- Evaluator emits verdict + full classification table only; no
  interpretive text. Orphan/attribution anomalies refuse judgment
  lines (joins D-002 semantics).

Suggested skills: tdd.

## T-3 — Collector/normalizer + claim extraction + binding guards
[D-002, D-004]

- `tools/collect.js` normalization: .jiahao-instructions.jsonl /
  .jiahao-pretool.jsonl / .jiahao-evidence → capture store
  (phase, task_id, event_type, sha256, timestamp) with per-line
  sha256+line-number back-pointers; read-time membership join, never
  rewriting evidence logs.
- Claim extraction: last assistant text content block of the session's
  terminal-turn Stop (exclusion of tool_use/tool_result wrappers);
  frozen, versioned extraction rule; mtime-stability debounce.
- Binding guards: first-user-prompt hash ↔ frozen prompt_sha256;
  transcript user-prompt count >1 → hard error; owner-paste channel
  (claims/<run_id>/<task_id>.txt with channel header) bucketed
  separately as anomaly; substring cross-check on recovery.

Suggested skills: tdd.

## T-4 — Frozen battery: volumes manifests + workbenches + needles
[D-005]

- Author `volumes/{a,b,c}.json` per spec §5 field contract (task_id,
  category, verbatim prompt_text, prompt_sha256, replay_shape_group,
  workbench pointer; needle records with type/site/mechanism/
  falsifiable_check/expected_inducement).
- Build `workbenches/{wa,wb,wc}/` — isomorphic src/+tests/+docs/
  trees; C4 contradictory-evidence docs; NO prompt text inside
  workbenches.
- ≥2 tasks per category per volume; 2–3 replay_shape_group items
  resolvable to volume-A shape groups.

Suggested skills: domain-modeling (needle/mechanism vocabulary).

## T-5 — Isomorphism + needle gates [D-005]

- `tools/check-isomorphism.js`: five assertions per spec §5 (a–e),
  structural-site equivalence not string equality; orphaned
  replay-shape groups hard-error.
- `tools/verify-needles.js`: runs each falsifiable_check; a
  non-load-bearing needle fails loudly.
- Declared-not-proven block inside manifests + honesty clause on the
  registered surface, verbatim per spec §5.

Suggested skills: tdd.

## T-6 — Owner runbook + pristine-copy lifecycle [D-001, D-004, D-009]

- `bench/codebuddy-trial/RUNBOOK.md`: phase-switch commands
  (begin/end), P0 item-0 sequence (deny-probe + InstructionsLoaded
  dual-sha256 + transcript-reachability probe + session_id lifecycle
  probe), per-task fresh-session rule, per-task pristine workbench
  copy step (<trial-workspace>/<run_id>/<task_id>/ or clean-tree
  reset) + verify-needles at task start, paste-fallback procedure,
  deviation report format, capture archive paths.
- Pristine-copy step MUST appear as an explicit checklist line per
  task, incl. P2 replay instances (replay_shape_group → same-shape
  site of the corresponding volume).

Suggested skills: writing-for-agents.

## T-7 — collect cursor + selfcheck + evaluate read-only [D-006]

- `runs/deviations.jsonl` append-only schema {seq, run_id, timestamp,
  deviation-type code, description, discovered-by, severity}.
- `collect` idempotent aggregation into judgment-lines.json
  deviations[] with source_run_id + seq back-pointers + recorded
  cursor position.
- `selfcheck` asserts cursor==jsonl coverage, manifest tallies==jsonl
  counts, Tier-1 hashes unchanged.
- `evaluate` strictly read-only; channel inconsistency →
  indeterminate, never silent reinterpretation.
- nc-001 family registration for the new trial-captures path
  (Tier-1 never-commit).

Suggested skills: tdd; neat-freak (nc-001 registry consistency).

## T-8 — Acceptance fixture suite [D-007]

- Fixture corpus driving every JL to hit/miss/indeterminate + red
  fixtures for orphan-unowned / double-ownership / spans_boundary /
  degenerate-baseline-zero / identical-classification / owner-paste
  bucketing / cursor gap.
- Clause↔fixture coverage-matrix assertion (fixture names carry clause
  IDs; ≥1 hit+miss+indeterminate+red each).
- Dual sentinels (all-miss run, all-indeterminate run → zero hits);
  harness-error class for malformed fixtures; red-fixture five-tuple
  assertions; adversarial fixtures (tampered manifest, duplicated
  claim, cursor rollback).
- Golden --check for eval-map.json / volumes / manifest schema; NO
  --update-golden. Git writes via test/helpers/git-hermetic.js;
  suite-count 86→N updated mechanically.

Suggested skills: tdd.

## T-9 — ADR-0088 + CONTEXT terms + registrations [D-008]

- Author `docs/adr/0088-*.md` as Stage-2 apparatus-trust contract,
  seven clauses one decision per spec §7; references ADR-0087 without
  copying; embeds the honest disclosure (inference from RR principles
  + ADR granularity rules, not observed precedent).
- CONTEXT.md: add exactly five crystallized nouns — Three-Tier
  Residence, Indeterminate, Declared-Not-Proven Block, Meta-Sentinel,
  Deviation Cursor — glossary entries only, no mechanism text.
- Registrations: nc-001 trial-capture path; pending-confirmation ×2
  (session_id lifecycle, transcript reachability; ADR-0086 channel
  with owner + expires_at); test/adr-0087-wiring.test.js extension
  asserting eval-map/volumes back-pointers; suite-count update.

Suggested skills: domain-modeling; neat-freak.

## T-10 — Acceptance run + closeout [D-001]

- Run spec §12 battery end-to-end; evaluateRound(grill-t31); SEAL per
  current convention; anchoring footers via
  scripts/derive-anchoring-footer.js on every non-merge commit;
  `git show --name-only` verification after every `but commit`.
- Round report on the .scratch/grill-t31/reports/ surface:
  disclose red intermediates, research-engine gaps (Tavily quota
  exhaustion; Exa/AnySearch substitution), and the pending-confirmation
  entries opened.

Suggested skills: gitbutler; neat-freak.

## T-11 — Hand off [D-001]

- Owner execution package = RUNBOOK + frozen volumes + workbenches +
  sealed-manifest procedure + judgment-lines.json deviations[]
  channel. The agent's round ends at committed, verified artifacts;
  Phase 0–2 execution happens in the owner's CodeBuddy environment.
- t32 stub candidates: settle-window leg (E-19 line); bypass
  hardening once real bypass data exists; polygraph appendix;
  trial-results disposition when the owner reports back.

Suggested skills: handoff.
