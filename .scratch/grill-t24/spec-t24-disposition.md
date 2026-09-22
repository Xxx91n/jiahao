# spec-t24-disposition — grill-t24 execution spec (documentation-round artifact)

Round: **grill-t24**. Sole decision source: `.scratch/grill-t24/decision-ledger.md` (D-001..D-004, all current). Three atomcode research runs informed the records; their refinements are folded into the cited D-IDs — nothing outside the ledger.

Invariant motivation (verbatim): 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

Authoritative inputs to absorb at setup (D-001.3, D-004.7): `.scratch/grill-t23/reports/2026-09-22-repair-verification.md`, `.scratch/grill-t23/handoffs/2026-09-22-next-round-handoff.md`; `.scratch/grill-t23/audit-evidence/` stays never-commit.

## 1. Round topology (D-001)

- One governance-codification round for the unified gap class: **declared intent vs actual produced state**. Three clauses: G1 evidence freshness, G2 never-commit single-sourcing, G3 tool-interop allowlist discipline.
- kind: documentation; runtime require-chain untouched (`zero_product_diff:true`).
- Rejected alternatives (researched, dismissed per D-001): single-gap round; defer-0066 burn-down round; product-surface round.
- Over-codification bound: the three gaps land as **one** ADR — never five.
- Round-end second-party audit window + consent sweep + full-field trend row per precedent.

## 2. ADR-0083 spec (D-002.1, D-003, D-004.2)

One ADR: `docs/adr/0083-<slug>.md`, four clauses.

### D-A Evidence freshness — frozen-tree final re-capture (D-003)

- The round-final acceptance evidence set MUST be (re)captured after the **last content-mutating commit**; between capture and evidence landing no non-evidence commit may land; if a fixpoint is needed, re-capture first.
- Evidence commits are **idempotent endpoints** — a commit landing only evidence artifacts does not itself trigger re-capture.
- Round end pins to the last content-mutating commit; merge/squash timing may not bypass it.
- Every committed capture artifact carries a provenance header line `captured-at-head: <sha>` (in-toto gitCommit binding semantics; the wiring suite pins the shape).
- **Qualification/archival split**: a stale artifact loses the right to support the current round green conclusion; its bytes may remain as a historical point-in-time record; stale bytes never sit beside a green claim for the same conclusion (SOC 2 Type I/II + transparent-log prefix consistency).
- Rejected shapes named in D-003: per-artifact attested-surface bookkeeping (beta — its bookkeeping failure is isomorphic to the incident); dual-reading co-citation (gamma — canonizes the defect form).

### D-B Never-commit single-sourcing (D-002.2, D-004.1/2)

- `docs/governance/never-commit.json` is the single source of truth: `{rules:[{id:"nc-NNN", pattern(regex), reason, since, status}]}`.
- Task-book never-commit labels **reference rule ids** — freehand path labels forbidden; introducing a new label requires the registry extension to land **in the same commit** (ADR-0027 coupling precedent).
- Per-round scratch `NEVER_COMMIT` regexes retire or are generated from the registry.
- **Retirement rule written into the ADR**: rules are deprecated, never deleted (ESLint precedent); `since`/`status` semantics fixed at authoring.
- Seed = known historical never-commit set: `audit*-evidence/` trees, `*.patch`, `round-commits.txt`, ref-assets-class paths, external generated-source paths.

### D-C Tool-interop allowlist discipline (D-002.3)

- AGENTS.md working agreement gains: `but commit` runs with an explicit path allowlist; post-commit `git show --name-only` inspection is mandatory; any tool sweep past the filter is disclosed.
- No external precedent — self-drafted (D-001 residual, acknowledged).

### D-D Suite-count sync obligation (D-002.1, D-004.3)

- The `ci.yml --expected-suites` literal pin is codified as a sync obligation in the ADR.
- Mechanical form: the new wiring suite asserts the ci.yml count equals the live `glob(test/*.test.js)` count AND clamps a lower bound / known-file hit — the equal-wrong-values trap (a broken glob must not pass).
- Legacy literal pins in adr-0080/0081/0082 wiring bump 77 -> 78 (R3, free).

## 3. Mechanical pins & carve-out (D-002.4/5, D-004.3)

- `test/adr-0083-wiring.test.js` (R3) pins: registry schema validity, AGENTS clause presence, provenance-header shape on committed captures, the ci.yml-count-equals-glob invariant.
- `.github/workflows/ci.yml` 77 -> 78 is the round single R2 touch — declared carve-out: `governance_tooling_diff.files` names it, the reason carries necessity, the round report discloses burn-rate round 6.
- Forbidden: scripts/ machinery legs (R2 expansion, classifier outside audit-window protection); folding 0083 assertions into existing suites (dead-control mechanism).

## 4. Audit-window inheritance (D-002.6, D-003.4)

- ADR-0083 declares that every subsequent audit window scope MUST include:
  (i) evidence-freshness ordering check + sampled leg re-runs;
  (ii) never-commit labels covered by the registry + tracked-tree clean;
  (iii) each commit file-list vs declared intent/allowlist.
- **defer-0069** registers the first live firing of these lines at the next audit window (structured follow-up; D-004.5).

## 5. CONTEXT term (D-002.7, D-004.4)

- One umbrella term: **Declared-vs-Actual Drift (声明-实际漂移)**; the body MUST name the three mechanisms as narrow terms (discriminative-power guard against a vacuous umbrella).
- Pre-landed in this docs commit; T-2 verifies the wording.

## 6. Setup & closeout (D-001.3/4, D-004.6/7/8)

- T-0: absorb commit (the two t23 docs) -> regen fixpoint loop to `--check` green -> clean-tree verify (untracked = never-commit class only).
- Closeout: battery re-run under the new provenance-header convention -> per-finding disposition table -> consent sweep naming every standing row per precedent plus defer-0069 -> trend row (`kind:documentation`, `adr_added:["0083"]`, `net_additions:1`, `deferred_entry:defer-0069`, `carve_out_used:1` [ci.yml only], `zero_product_diff:true`) -> facts-canon report (`report_commit:null`) -> audit handoff carrying the three check lines.
- No retroactivity: t23 artifacts stay as repaired; the registry and clauses apply forward only.

## 7. Negative union

No source/runtime edits; no scripts/ machinery legs; no folding assertions into existing suites; no flat pattern list for the registry; no skipping defer-0069; no mechanizing semantic checks; no dual-reading co-citation; no per-artifact semantic bookkeeping; no push; no second or third ADR; no retro repair of t23 artifacts; no freehand never-commit labels in task books.
