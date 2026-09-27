# ADR-0073: Provenance-Tiered Corpus Registration, ADR-0070 G1 Tightening-Only Amendment (organic leg), grill-t11 Audit Carry-Over Dispositions (F-A1/O-1/W-1/O-2; W-2 closed-by-design), and Bake Stewardship Protocol

Status: Accepted (user-ratified 2026-09-17 via grill-t12 decision ledger D-001..D-004; second_reviewer countersign deferred to the next audit round - the ADR-0065/0066/0067/0069/0070/0072 ratification pattern; grill-t25 label: the deferred second_reviewer countersign is ID-level-only, awaiting entity-level - return condition: the 2026-12-15 audit-window review records the entity-level countersign verdict or a formal downgrade; return-by: 2026-12-15)
Date: 2026-09-17

References: ADR-0070 (amended here: D-B criterion G1 narrowed to organic events; D-E claim sentence-1 parenthetical superseded a second time at the measured-present flip; the D-C(c) `measured-present` word slot leaves reserve), ADR-0072 (D-F word slot now carries contracts; the D-D pre-set adjudication criteria are exercised by the D-D dry-run below), ADR-0062/0066/0071/0072 (frozen-artifact amendment discipline precedent), ADR-0040 (capability three-state vocabulary), ADR-0028 D4 (host-contract registry coupling), ADR-0033/0035 (deferred-registry row discipline), ADR-0061 D-E (governance anchors; the t12 ledger joins under this ADR), ADR-0064 D-F (trend inventory; defer-0056 is this round's net-addition row), decision-ledger-t12 (.scratch/grill-t12/decision-ledger.md - git-tracked, its own durability channel; the governance copy is docs/governance/decision-ledger-t12.md).

> Pointer note (ADR-0074, 2026-09-17): this record predates the sanitized-history publish; pre-rewrite SHA citations below name local-only objects - resolve them through docs/rewrite-map.json.

## Context

The grill-t11 audit closed the readiness round PASS-WITH-OBSERVATIONS and the owner host then opened the bake window: the claude-code registration is live and the lane writes real chain records. The audit's own measurement surfaced a structural finding ahead of any promotion arithmetic: the 31 existing lane records are not one population. Two are deliberately marked self-check writes (sessions t11-live-regcheck-s2/s3, the registered exclusion sessions); twenty-nine resolve through the session->project-directory map to scripted e2e driver sessions in the t11 test workspace (`D--Aworker-e2e-r66-claude`). None is organic traffic. Counting all 31 toward the frozen G1 ">= 200 real Stop events" would be a wrong-population validity failure - the synthetic-as-RUM conflation - so the corpus is provenance-tiered and G1 counts the organic leg only.

The audit carried five observations into this round under documented-decision closure (the ADR-0070 D-F precedent): F-A1 (a derived tarball committed at the repo root), O-1 (the measured-present flip is due - real lane-bearing claude-code Stop events exist on the chain), W-1 (the bake substrate is not the declared-channel artifact), W-2 (synthetic flagged records physically sit on the real chain and their exclusion was naming-convention only), and O-2 (a host settings backup entered git-tracked .scratch).

Two closure theorems govern the round's register and are already CONTEXT.md glossary terms: Record-Level Closure (verdicts are two-layer - closed as records, not ended as issues) and Tightening-Only Post-Hoc Amendment (a frozen gate may be amended after seeing data only in the direction that moves the criterion away from the target).

## Decision

### D-A - Provenance class registration (ledger D-002)

Every lane record (`detector.source === 'pairer-instrument'`) carries an analysis-side provenance class - one of `organic` / `automated_harness` / `synthetic_selfcheck` / `unclassified` - assigned by this mechanical rule, evaluated in this order:

1. **synthetic_selfcheck**: `session_id` is a member of the registered marked-self-test session set. The set is an explicit enumeration - currently `{t11-live-regcheck-s2, t11-live-regcheck-s3}` - and membership is set-membership against the registration, never a name pattern: a self-check session joins the set only by being registered at creation time.
2. Otherwise resolve `session_id` through the host's session->project-directory map (`~/.claude/projects/<slug>/<sid>.jsonl`). Unresolvable -> **unclassified** (conservative fallback: retained on the chain, excluded from every organic count).
3. Resolved -> **automated_harness** when either structural predicate holds: (a) the session's project directory is a registered harness/test workspace - currently `{D--Aworker-e2e-r66-claude}`, the t11 live-chain rig; or (b) the transcript carries the scripted-driver skeleton (headless bookkeeping record types - `queue-operation` / `atis-latch` / `last-prompt` - which interactive sessions never write). Otherwise -> **organic**.

Backfill of the existing 31 records under this rule: `organic` 0 / `automated_harness` 29 / `synthetic_selfcheck` 2 / `unclassified` 0. No record is deleted, moved, or rewritten: classification is a labeling layer over the chain, which stays untouched (the GA4 lesson - excluded data is never destroyed). Classification replaces the naming-convention exclusion the audit flagged; it is structural and re-runnable, and the conservative direction is fixed: any doubt lands outside `organic`, never inside it.

### D-B - ADR-0070 amendment: G1 narrowed to the organic leg (tightening-only, forward-effective)

- before: "G1 >= 200 real Stop events carrying lane records, spanning >= 1 full usage cycle"
- after: "G1 >= 200 organic Stop events carrying lane records (provenance class `organic` per D-A), spanning >= 1 full usage cycle"

The amendment is registered through the ADR-0070 amendment discipline (append-only note on the target ADR plus this registration) and is forward-effective from this commit. It is clean under Tightening-Only Post-Hoc Amendment: it moves the criterion away from the observed data - the measured count resets from 31 to 0 organic events, farther from the target, not closer. G2 (independent second-line review, per ADR-0072 D-D), G3, and G4 are untouched, and the flip remains a separate registered act.

Harness and self-check traffic retain their registered second-class use - pipeline health and regression comparison - and never enter the FP or calibration denominators.

### D-C - grill-t11 audit carry-over dispositions (ledger D-003)

- **F-A1** (derived tarball committed at root) -> executed in R2: `.gitignore` gains `/*.tgz` BEFORE the untrack (rule before removal, so the class cannot recur), `jiahao-0.0.1.tgz` is untracked, and the history blob is retained (no history rewrite). Registered wording: "untracked, history blob retained" - never "removed" or "cleared". Re-run list: `npm run gate:all`, `node scripts/instrument.js --check`, and a tracked-file scan for `*.tgz` returning empty.
- **O-1** (measured-present flip due) -> executed in R2: the three claude-code contracts' `transcript_file` flips `present` -> `measured-present`, and the ADR-0070 D-E claim sentence-1 parenthetical is superseded in all three claim homes by "currently `measured-present` (live-observed: independent-audit reproduction + automated-harness events; organic pending) only for claude-code". The evidence layer is mandatory, not decorative: it is what lets the same record base honestly exclude harness events when counting G1 while admitting them when upgrading a reachability label (the convenience-inconsistency charge is preempted by naming the evidence tier). The assertion is scoped to transcript-delivery capability measured on real host events; it does not imply organic use.
- **W-1** (bake substrate != declared artifact) -> substrate note registered, landing in the same commit as the flip: the bake package is an npm-pack of the unpushed grill-t11 HEAD; the declared channel served c861084. The diff c861084..HEAD across the hook run path (`hooks/` plus the `src/` runtime surface the lane executes - `src/pairer-lane.js`, `src/capa-pairer.js`, `src/transcript-adapter.js`, `src/evidence-log.js`, `src/shared/`) is limited to `src/instrument-state.json` (+105 append-only instrument data, not read by the lane) and `scripts/check-host-contracts.js` (the `measured-present` enum slot - a CI validator, not on the hook path): the lane's execution surface is byte-identical between the two builds, so lane observations on the bake substrate are behaviorally equivalent to observations on the declared artifact. The divergence is recorded, not excused: future bake rounds should prefer installing the declared channel when one exists.
- **O-2** (host backup in git-tracked .scratch; a hard requirement in a public-repo posture) -> executed in R2: `.scratch/grill-t11/host-config-backup/` is untracked; the forward rule is registered - host configuration backups never enter git-tracked directories (enforced as the `host-config-backup/` ignore rule); the exposure window is recorded: committed at 05fa697 (2026-09-17), never pushed to any remote, so the external exposure window is zero; the file carried host topology (local proxy endpoint, model aliases, a node install path) but no live secrets (the auth token is a PROXY_MANAGED placeholder) - and topology is treated as reconnaissance-grade information, so the disclosure obligation stands even without live keys. A pre-commit scanner (gitleaks class) is registered as the recurrence-prevention agenda at defer-0054.
- **W-2** (synthetic flagged records on the real chain) -> closed-by-D-002/D-A: the naming-convention exclusion is replaced by the structural provenance classification - marked self-test sessions are a registered set - which is exactly the stronger form the audit asked for. No separate work item exists.

### D-D - Bake stewardship protocol (ledger D-002 + D-004)

- **Flagged-adjudication dry-run** (R-a): the full adjudication protocol is exercised now, while nothing rides on it: provenance classification -> exclusion rules -> enumerate the flagged population -> apply the pre-set criteria (ADR-0072 D-D: FP iff an independent re-parse yields claim == evidence or the family assignment fails; TP iff both stay present-and-unequal with the family intact; disagreement resolves toward FP) -> emit an adjudication record. The recorded output is "post-exclusion population empty" (both flagged records classify `synthetic_selfcheck` and leave the review population). The adjudication machine is rehearsed when it does not matter; synthesizing a population to make the exercise productive is forbidden.
- **Checkpoint cadence** (R-b): every grill round close runs the segmented provenance telemetry summary (`scripts/pairer-lane-telemetry.js` extended in R2 to emit per-class counts), and the summary is mandatory input to any future promotion review. The cadence rides the existing round rhythm - no new process is created.
- **Diversity-qualifier framework**: corpus sufficiency is qualified as >= N independent sessions x >= M task-intent shapes. The N/M values are pre-registered before any promotion review (pre-review pre-registration); they are deliberately NOT deferred-registry rows - they are parameters of the review act, not deferrals.
- **Organic routing-rate watch**: registered as defer-0055 - a standing watch on whether organic traffic arrives at all (external-event; the segmented summary makes it observable each round).

### D-E - Round surface and registrations (ledger D-004 R-c)

R1 (this document round) lands: this ADR; the ADR-0070 appended amendment note and amended-by marker; deferred-registry rows defer-0053 (collection-side provenance field - the instrument agenda: lane records eventually carry `provenance` at write time; the analysis-side classification in D-A is this round's bridge), defer-0054 (pre-commit secret/topology scanner, gitleaks class), defer-0055 (organic routing-rate watch), and defer-0056 (this round's net-addition tally, the D-006(a)(i) convention); the t12 ledger into anchors.json under this ADR; the trend-inventory grill-t12-doc-round row; the README ADR index rebuild (73 records); the test/adr-0073-wiring.test.js seeds; and the instrument-state record_only_change event for the doc round (bounded delegation: the authorization field carries scope + expiry).

R2 (the action round) executes in the registered order: the gitignore-rules commit -> F-A1 untrack + re-run list -> O-2 untrack -> the O-1 flip plus W-1 substrate note in one commit -> provenance relabel plus telemetry segmentation -> the dry-run record -> the round report. Ordering inside R2 is contract, not convenience: rule before removal, docs before actions.

## Rejected

- Counting harness or self-check traffic toward G1 (wrong-population validity failure; synthetic-as-RUM conflation; Goodhart on a count gate).
- Deleting or rewriting chain records to clean the corpus (the GA4 lesson: excluded data is never processed; classification is labeling, not removal).
- Provenance by naming convention (session-id regexes): the audit's W-2 ask is a structural rule, absorbed into D-A rather than patched at the filter.
- Loosening a frozen criterion after seeing data: the G1 amendment is registered only because it moves away from the target (31 -> 0 organic).
- History rewrite for the committed tarball or backup (exposure-window honesty beats a clean tree; untracked is the honest word, never "removed").
- Claiming the measured-present flip as organic usage: the evidence layer names exactly what was observed - independent-audit reproduction plus automated-harness events; organic pending.
- A flat verdict in either direction (Record-Level Closure: closed as records, not ended as issues).
- N/M diversity numbers inside the deferred-registry (they are pre-review pre-registrations, not deferrals).
- Synthetic bake traffic to exercise the adjudication machine (the dry-run records an empty post-exclusion population).

## Consequences

- The promotion gate's G1 leg counts organic events only; the segmented telemetry surface makes the organic leg's current value a first-class honest zero instead of an inflated 31.
- The `measured-present` word slot leaves reserve and carries the three claude-code contracts; the claim homes' sentence 1 reads `measured-present` with the evidence layer attached; the bake substrate's divergence from the declared channel is on record with its behavioral-equivalence argument.
- Host configuration backups gain a forward rule (never git-tracked) and a registered recurrence-prevention agenda (defer-0054); the O-2 exposure window is on record as zero-external.
- docs/governance/decision-ledger-t12.md joins the anchors under this ADR; instrument-state gains the doc-round record event; defer-0053..0056 land; the README index rebuilds to 73 records; test/adr-0073-wiring.test.js seeds the frozen surfaces.

## Acceptance

- `node scripts/build-adr-index.js --check`, `node scripts/build-governance-anchors.js --check`, `node scripts/check-governance-inventory.js`, `node scripts/check-deferred.js`, `node scripts/check-host-contracts.js` all exit 0.
- `npx jest test/adr-0073-wiring.test.js` green; the segmented telemetry run emits per-class counts over the live chain (expected: organic 0 / automated_harness 29 / synthetic_selfcheck 2 / unclassified 0).
- `node scripts/instrument.js --check` verifies the hash chain with the t12 doc-round event appended.
- R2 exit evidence: `npm run gate:all` exit 0; the tracked-file scan for `*.tgz` and `host-config-backup` returns empty; the dry-run record exists and names the post-exclusion population.
