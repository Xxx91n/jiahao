# ADR-0083: The Declared-vs-Actual Drift Clauses — Frozen-Tree Evidence Re-Capture, Never-Commit Single-Sourcing, Commit Allowlist Discipline, and the Suite-Count Sync Obligation (grill-t24 documentation round)

- Status: Accepted
- Date: 2026-09-23
- Ledger: `.scratch/grill-t24/decision-ledger.md` — grill-t24 D-001..D-004 (all current)
- Spec: `.scratch/grill-t24/spec-t24-disposition.md`

## Context

The grill-t23 audit cycle surfaced three same-shaped governance gaps — one class: a declared intent silently diverging from the produced state. (G1) Committed evidence artifacts froze at battery-run-1 red bytes while the report claimed green (T4-C-1) — evidence freshness ran on honor, not invariant. (G2) `.scratch/grill-t23/ref-assets/` sat tracked despite a task-book never-commit label (T4-C-2) — labeled paths and per-script `NEVER_COMMIT` regexes were two sources that could disagree. (G3) GitButler's staged `A`-pool twice swept never-commit candidates into commits past id filters (`a2e5571`, `51a66d3`) — the commit tool's surface was wider than the committer's intent, and nothing inspected the landed file list. A fourth, structural tax rode along: the `ci.yml --expected-suites` literal pin silently demands a manual bump each round — an obligation that existed only as oral convention until it was missed. This round also produced a live self-demonstration: the t23 closeout pruned the `gb-local/*` old-side refs, leaving `build-rewrite-map --check` red against a declared-green reproduction list — repaired at T-0 by restoring the retained-line pointer (`gb-local/pre-purge-line` -> `2c93a30`), disclosed in the round report. One ADR carries all four clauses (ledger D-001: the over-codification bound forbids splitting into five).

## Decision

### D-A — Evidence freshness: the frozen-tree final re-capture invariant (G1; ledger D-003)

1. The round-final acceptance evidence set MUST be (re)captured after the **last content-mutating commit**; between capture and the evidence landing, no non-evidence commit may land. If a regen fixpoint is needed, re-capture first — never splice green claims onto stale bytes.
2. **Non-anchoring commits do not move the freshness anchor.** A commit is non-anchoring iff its entire diff touches only (a) the round's evidence directory (`.scratch/<round>/evidence/` — the idempotent endpoint: an evidence commit never triggers re-capture), or (b) mechanism-output regenerations byte-reproduced by their registered generators (`docs/rewrite-map.json`, `docs/governance/anchors.json`, `.scratch/<round>/round-facts.json` — faithfulness is what their `--check` legs prove). This is what makes the invariant converge: evidence headers are themselves doc citations, so the map regen MUST be allowed to trail the evidence commit without invalidating it. Everything else — authored prose, machinery, tests — is anchoring.
3. "Round end" pins to the last **anchoring** commit; merge/squash timing may not bypass it — the anchor is commit order, not wall-clock.
4. Every committed capture artifact carries the provenance header line `captured-at-head: <sha>` (in-toto `gitCommit` binding semantics ported to the capture channel); the wiring suite pins the shape and that the named sha resolves to a real commit.
5. **Qualification/archival split**: a stale artifact loses the right to support the current round's green conclusion; its bytes may remain as a historical point-in-time record; stale bytes never sit beside a green claim for the same conclusion (SOC 2 Type I/II distinction + transparent-log prefix consistency).

Rejected shapes (ledger D-003): per-artifact attested-surface bookkeeping (β — a bookkeeping table whose own drift is isomorphic to the incident it guards); dual-reading co-citation (γ — canonizes the defect form by letting stale bytes stand next to green).

### D-B — Never-commit single-sourcing (G2; ledger D-002.2, D-004.1/2)

1. `docs/governance/never-commit.json` is the single source of truth: `{rules:[{id:"nc-NNN", pattern, reason, since, status}]}` where `pattern` is a regex over repo-relative paths.
2. Task-book never-commit labels reference **rule ids**, never freehand paths; introducing a new label requires the registry extension to land in the **same commit** as the label's first use (ADR-0027 coupling precedent).
3. Per-round scratch `NEVER_COMMIT` regexes retire or are generated from the registry — this round's capture harness compiles its classifier from the registry (dogfooding the clause it codifies).
4. **Deprecate-not-delete**: rules are never removed; a retired rule flips `status` to `deprecated` (ESLint precedent) — deletion erases the audit trail of what was once exempt. `since` records the rule's registration date; `status` is `active|deprecated`, both fixed at authoring.
5. Seed: the known historical never-commit set — `audit*-evidence/` trees, `*.patch`, `round-commits.txt`, the ref-assets class, and external generated-source paths.

### D-C — Commit allowlist + post-commit inspection (G3; ledger D-002.3)

1. `but commit` runs with an explicit path/hunk-id allowlist — every id named in the command; a bare `but commit` (staged-pool sweep) is forbidden for round work.
2. Post-commit `git show --name-only <sha>` inspection is mandatory: the landed file list must equal the declared intent; any sweep past the filter is disclosed in the round report, not silently cleaned up.
3. No external precedent exists for agent-tool commit interop — this clause is self-drafted (ledger D-001 residual, acknowledged) and carries the two t23 incidents as its receipts.

### D-D — Suite-count sync obligation (ledger D-002.1, D-004.3)

1. The `ci.yml --expected-suites` literal is a declared sync obligation: a change that adds or removes a `test/*.test.js` suite MUST bump the literal inside the same change; the bump is the round's legitimate R2 touch, declared via the ADR-0076 D-B carve-out.
2. Mechanical form: this round's wiring suite asserts the ci.yml count equals the live `glob(test/*.test.js)` count AND clamps a lower bound plus a known-file hit — the equal-wrong-values trap (a broken glob returning zero must not satisfy a stale zero).
3. The legacy literal pins in the adr-0080/0081/0082 wiring suites bump 77 -> 78 with this round (R3 surface, free).

### D-E — Audit-window inheritance (ledger D-002.6, D-003.4)

Every subsequent audit window's scope MUST include — declared mandatory here per the ADR-0081 inheritance precedent:

- (i) **evidence-freshness ordering check** — each committed capture's `captured-at-head` against the last content-mutating commit — plus sampled leg re-runs;
- (ii) **never-commit label coverage** — every label resolves to a registry rule id, and `git ls-files` carries zero matches against active rules;
- (iii) **commit file-list conformance** — each round commit's `git show --name-only` set versus the declared intent/allowlist.

`defer-0069` registers the first live firing of these lines at the next audit window (structured follow-up — an unregistered first firing is how preventive clauses silently die). Semantic verification stays human: mechanizing "does this evidence support this claim" was explicitly rejected (a false-consistency machine is worse than a checklist).

### D-F — Registrations and round bookkeeping (ledger D-004)

- `defer-0069` — new row: the three audit-window check lines' first live firing; `pending-evaluation`, `review_at` rides the 2026-12-15 tide.
- `CONTEXT.md` — the Declared-vs-Actual Drift umbrella term was pre-landed at the charter commit (`e23579c`); its body names the three narrow mechanisms (frozen-tree final re-capture, never-commit single-sourcing, commit allowlist + post-commit inspection), verified this round.
- The `grill-t24-doc-round` trend row records `kind:documentation`, `adr_added:["0083"]`, `net_additions:1`, `deferred_entry:defer-0069`, `carve_out_used:1` with `governance_tooling_diff.files` naming `.github/workflows/ci.yml` alone (the ADR-0057 D-C parity bump 77 -> 78 — the round's single R2 touch), `zero_product_diff:true`; burn-rate round six disclosed.
- The `gb-local/pre-purge-line` ref restore is recorded as the round's first live declared-vs-actual repair: the mechanism's declared reproduction list broke when its input surface was pruned; restoring the retained-line pointer (objects retained by design) re-greened `--check` without touching the generator.

## Consequences

- Evidence freshness stops being honor-system: an ordering invariant + a provenance header + a mandatory audit line place the check on the detection layer where it belongs.
- Never-commit labels have exactly one home; task books reference rule ids, and the dual-source drift that let ref-assets slip is structurally closed.
- Commit-tool interop has a written contract — the allowlist + `git show --name-only` loop is cheap, mechanical, and already dogfooded this round.
- Suite-count drift becomes self-announcing: the glob-equality pin with its floor and known-file hit cannot pass on a broken enumeration.
- Wiring pins: `test/adr-0083-wiring.test.js` pins the registry schema and seed coverage, the AGENTS.md clause presence, the provenance-header shape on committed captures, the ci.yml-count-equals-glob invariant, the defer-0069 registration, the trend-row shape, and the CONTEXT term's three narrow mechanisms.
