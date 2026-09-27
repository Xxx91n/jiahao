# ADR-0061 Implementation Round - RE-AUDIT Report (2026-09-13)

Auditor: second-party audit agent (same window that issued the first verdict; independent of the repair window).
Scope: repair delta `01c1138...fefce52` on `adr0061-impl` + stacked `adr0061-repair-docs`.
Fixed point: `adr0061-doc` (`031a3a7`). Audited HEAD before repair: `01c1138`. Repaired HEAD: `fefce52` (wraps `9bed002` R-1, `2e633f9` R-2..R-5).
Authority: `.scratch/grill-adr0061/reports/2026-09-13-repair-order.md` (R-1..R-5, P-2/P-3) + `2026-09-13-audit-report.md` (S3/S6).
Self-report under audit: `.scratch/grill-adr0061/reports/2026-09-13-repair-report.md`.

**Method.** Same discipline as the first pass: the repair report was treated as a claim, never as evidence. The Section-1 suite was re-run from scratch; every R-n closure was re-derived from artifacts; seq 1-10 hashes were compared byte-for-byte against the pre-repair baseline; two-axis review ran as two independent sub-agents over the repair delta, and every High/Medium finding below was re-verified by the auditor.

---

## 1. Hard acceptance re-run (auditor-executed)

| # | command | repair report claim | auditor measurement | verdict |
| --- | --- | --- | --- | --- |
| A1 | `npx jest --runInBand` | 54 suites / 727 tests | 54 suites / **727** tests, exit 0 (71.9s) | PASS |
| A2 | `node scripts/run-test-gate.js --expected-suites 54` | `OK: 54 suites, 727 tests, 0 skipped` | identical | PASS |
| A3 | `node scripts/run-gates.js` | exit 0, 23 entries, 4 unverifiable | exit 0, **23** entries, 4 unverifiable; `[197 governance-anchors] PASS` | PASS |
| A4 | `npm pack --dry-run --json` | 212,699 B / 93 files < 230,000 | **212,699 B / 93 files** (measured twice) < 230,000 | PASS |
| A5 | `node scripts/instrument.js --check` | OK; chain valid through seq 12 | OK; `rules f6c6c843c4ad4151`; chain valid seq 1..12; conditional / 2026-12-11 / CAPA-0060-judge-flip-rate | PASS |
| A6 | `node scripts/check-deferred.js` | OK, 32 entries | OK, 32 entries | PASS |
| A7 | `node scripts/build-adr-index.js --check` | in sync | `README ADR index in sync with docs/adr` | PASS |
| A8 | `node scripts/build-governance-anchors.js --check` | exit 0, 4 artifacts | exit 0, `OK - 4 artifacts, digests in sync` | PASS |
| A9 | `git status --short` | only the untracked reverify artifact | `?? bench/polygraph/results/reverify-20260913.json` only | PASS |

Sub-check: `npx jest test/adr-0060-wiring.test.js --runInBand` -> 27/27 pass (the file carrying the +7 R-1 regressions).

---

## 2. Repair closure ledger (declaration -> evidence -> conclusion)

| ID | Finding (from first audit) | Repair evidence (auditor-derived) | Conclusion |
| --- | --- | --- | --- |
| STD-1 | seq 10 asserted an expiry/CAPA its hashed field set did not carry | `src/instrument-identity.js:177-178` now has `expires_at` + `capa_ref` allowlist branches; **live seq 12 carries both** (`exp===true, capa===true`); regression tests `STD-1: the live conditional_signoff tail carries expires_at and capa_ref` + `every conditional_signoff at/after the repair carries the fields` both pass | **CLOSED** |
| P-1 | `criteria_change` / `record_only_change` validated `--authorization` then dropped it | `src/instrument-identity.js:402-404, 429-431, 459-461` persist `authorization`; `scripts/instrument.js:404-406, 451` propagate it; tests `P-1: a criteria_change event carries the authorisation it exercises` / `a record_signoff event carries the authorisation it exercises` pass | **CLOSED** |
| P-2 | `record()` logged the FIRST `record_only_change`, not the one just appended | `scripts/instrument.js:460-463` now reads `next.history[next.history.length-1]` (tail-first) | **CLOSED** |
| STD-2 | `CONTEXT.md:1170` carried a stale live cap 200,000 | `CONTEXT.md:1170` now reads `230,000 bytes per ADR-0039 as amended [by ADR-0062]`; no other live-cap literal remains | **CLOSED** |
| SPEC-2 | `build-governance-anchors.js --check` was jest-scoped only | `docs/gates.json` gains `governance-anchors` (order 197, tier confirmatory, `requires:[repo-tree,docs-adr]`, `params:{check:true}`); it is gate #197 in `gate:all` -> live PASS; `scripts/build-governance-anchors.js:43` declares its capability per ADR-0040 D1 | **CLOSED** |
| SPEC-1 | trend rows 4-5 sourced only to commit messages | ADR-0039 `:42-54` back-fills rows 4-5 under its own re-measure rule; ADR-0062 `:68-72` states the width (ledger 3-point vs ADR 5-row) explicitly | **CLOSED** (but a new defect was introduced here: see D-1) |
| SPEC-3 | defer-0024 git witness did not meet the no-git-as-ledger bar | `docs/deferred-registry.json` defer-0024 `last_check_in.note` states the git-commit witness does NOT satisfy the bar, keeps the external witness open, deadline 2027-09-01 | **CLOSED** |

### Append-only verification (the load-bearing integrity claim)

Compared all 10 baseline hashes in `.scratch/grill-adr0061/reports/baseline-hashes.json` against the live chain:

**seq 1..10: 10/10 byte-identical (IDENTICAL). History length 10 -> 12 (APPENDED).** seq 11 `quarantine`, seq 12 `conditional_signoff` carry the same real anchors as seq 10. The chain was re-emitted through the sanctioned `transition()` path; **no hand-edit**, no rewrite of frozen history. Frozen seq 6/seq 10 retain their defective field sets by design (append-only), documented as ERRATA E-4/E-5 with an in-place erratum pointer in ADR-0063 D-D.

---

## 3. Findings on the repair delta (two-axis, auditor-verified)

### Standards axis

| ID | Severity | Finding | Auditor verification |
| --- | --- | --- | --- |
| RSD-1 | **Low** | P-2 fix carries a dead/redundant fallback: `scripts/instrument.js:461-463` uses a tail-check ternary, else `history.slice().reverse().find(...)` | **VERIFIED.** `identity-change` DOES push a `quarantine` event (`instrument-identity.js:258`), so in the `escalate=true` path the tail is not the record and the fallback branch IS reachable. It happens to return the just-appended record (the last in history), so behaviour is correct - but the branch is redundant and its correctness is incidental. Speculative Generality; non-blocking |
| RSD-2 | **Low (judgement)** | The `stateEvent()` `if`-cascade (now 26 branches) is Repeated Switches / Data Clumps | **VERIFIED as precedent-inherited, not delta-introduced.** Each branch literal-mirrors the `transition()` call-site payload; the four added branches *narrow* the drop surface rather than widen it. Repo precedent — not a delta finding |
| RSD-3 | None | Append-only, same-commit ADR coupling (ADR-0027 D2), gate schema completeness, capability probe (ADR-0040 D1/D7d), no assertion weakening | **All VERIFIED clean.** Registry entry key-set identical to confirmatory siblings; `run-gates --check-coupling`/`--check-alignment` exit 0; `test/adr-0060-wiring.test.js` is `94/0` (pure insertion) |

### Spec axis

| ID | Severity | Finding | Auditor verification |
| --- | --- | --- | --- |
| **D-1** | **Medium** | **ADR-0039:53 states a re-measure figure that does not correspond to any actual measurement** | **VERIFIED.** ADR-0039:53-54 reads `Current re-measure at this repair round: **212,387 bytes / 93 files**`. Ground truth, measured twice by the auditor: **212,699 B / 93 files** — which is also exactly what the `pack-smoke` gate itself prints. The correct figure 212,699 appears **nowhere** in the tree. Grep confirms the wrong figure exists in exactly one place (`docs/adr/0039-...md:53`). **Critical context: this is the same defect class (an unverified number in a canonical ADR) that SPEC-1/R-4 was created to close.** It does not break any gate (the gate parses only `out.size < N bytes`, i.e. the cap 230,000) and ADR-0039 is not in `anchors.json`, so it is prose-only - but it is a factually wrong canonical claim |
| RSP-1 | **Low** | `record_only_change` + `record_signoff` authorization persistence exceeds the literal R-1 mandate (order named only `criteria_change`/`record_only_change`), and `--record` now *hard-requires* `--authorization` (`instrument.js:423-426`) | **VERIFIED as disclosed scope, not a violation.** The order offered "persist **or** amend the ADRs"; persisting is the stronger branch and E-4 names `record_signoff`. The new `--record` requirement is a hardening consistent with the finding's intent and is documented. Acceptable |

### Delta scope
15 files, +261/-12. Every touched file maps to a required fix or to its disclosed consequence (README 720->727 follows the +7 tests under the same-change rule ADR-0056/0057; `anchors.json` regen follows the ERRATA edit; ERRATA E-4/E-5 + ADR-0063 erratum reconcile the frozen-history limit; the capability declaration follows R-3's gate registration). **No unauthorized scope.**

---

## 4. Process observations

- **Self-report accuracy: high.** Every A1-A9 claim in the repair report reproduces exactly. The append-only claim - the one that would be easiest to fake - is independently corroborated by 10/10 baseline hashes.
- **Honest handling of the frozen-history limit (positive).** Rather than rewriting seq 6/seq 10 (which would have been the tempting shortcut to make the ADRs true), the repair left them frozen and *corrected the ADRs' claims* via ERRATA E-4/E-5 + an ADR-0063 D-D erratum. That is the discipline the round's own constitution demands.
- **P-1.** The `212,387` figure was written into ADR-0039 during this very repair round, into the very paragraph R-4 added to close the "unverified number" class. This is a *process* failure of the same shape as the original SPEC-1: a number asserted without a re-measure at the moment of writing.
- **Separation of duties: respected.** The repair window did not self-certify; it explicitly deferred to re-audit. No file was touched by this audit window.

---

## 5. Verdict

**One Medium finding (D-1) remains open. The round is NOT yet clean-pass, but it is close.**

What is now solid:
- All six original blocking findings are **genuinely closed** at the artifact level (Section 2), including the two that were only nominal before (STD-1, P-1).
- Append-only is **independently proven** 10/10 against the pre-repair baseline.
- Every hard-acceptance check reproduces (Section 1), including the newly gate-wired anchoring check.
- The two-axis review of the delta found **no functional regression, no weakened assertion, no unauthorized scope**. The Standards-only findings are Low and precedent-inherited.

What blocks closure:
- **D-1 (Medium):** `docs/adr/0039-...md:53` carries `212,387 bytes`, which no measurement supports; the true value is `212,699` (and the gate prints it). Because ADR-0039 is a canonical governing document and because the defect is of the exact class the repair was chartered to eliminate, it must be corrected before the round closes. It is a **one-line fix** and it does not reopen any other finding.

**Disposition: RETURN FOR A SINGLE-LINE REPAIR (D-1), then close.** Do not push, merge, or open a PR until D-1 is corrected and re-verified. Because the residual is a single prose number with no gate coupling, the re-verification after the fix may be scoped to: (i) grep shows `212,387` absent and `212,699` present at ADR-0039:53; (ii) the Section-1 suite still green (it must be unchanged by a docs-only edit). A full re-audit is not required for this one item; a targeted confirmation is proportionate.

### Repair requirement for D-1

- Replace `212,387 bytes` with `212,699 bytes` at `docs/adr/0039-...md:53`, or delete the stale "Current re-measure at this repair round" sentence entirely (the trend rows above it are the substantive content; a live figure in an ADR is a standing invitation to the same rot).
- If the figure is kept, re-measure it at the moment of writing and state the measurement command alongside it, per the ADR's own "re-measure after ANY packed-file edit" rule.
- No other file should change. `anchors.json` needs no regen (ADR-0039 is not a witnessed artifact).

### Optional (non-blocking)
- RSD-1: simplify the P-2 tail lookup to a single expression that cannot fall back to a stale record.

---

## 6. Auditor evidence appendix (commands actually run)

- Section 1: all 9 commands, auditor-executed on `fefce52`.
- `npx jest test/adr-0060-wiring.test.js --runInBand` -> 27/27.
- Baseline comparison: 10/10 seq hashes identical to `.scratch/grill-adr0061/reports/baseline-hashes.json`; length 10 -> 12.
- `npm pack --dry-run --json` run twice -> 212,699 both times (the D-1 ground truth).
- Source reads: `src/instrument-identity.js` (allowlist :167-186, transitions :399-461), `scripts/instrument.js` (:416-465 record, :396-413 criteria_change), `scripts/check-pack-smoke.js` (:41-44 cap parse, :93 assertion), `docs/gates.json` (23 entries), `CONTEXT.md:1170`, `docs/adr/0039|0061|0062|0063`, `docs/governance/ERRATA.md`, `docs/deferred-registry.json` (defer-0024), `test/adr-0060-wiring.test.js`.
- `git diff --numstat 01c1138...HEAD` for `src/instrument-state.json` -> `31/0` (pure append); `test/adr-0060-wiring.test.js` -> `94/0` (pure insertion).
- Grep across the tree for `212,387|212699`: exactly one hit, ADR-0039:53.
- Two-axis review: Standards + Spec sub-agents over `git diff 01c1138...HEAD`; every High/Medium finding re-verified against artifacts by the auditor.
