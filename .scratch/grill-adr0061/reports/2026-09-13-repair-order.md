# ADR-0061 Implementation Round - Repair Order (audit finding, 2026-09-13)

From: audit window. To: repair window (or human, on approval).
Authority: `.scratch/grill-adr0061/reports/2026-09-13-audit-report.md` (Section 5 verdict, Section 6 requirements).
Branch: `adr0061-impl` (HEAD `01c1138`). Fixed point: `adr0061-doc` (`031a3a7`).

## Verdict: RETURN FOR REPAIR

The hard acceptance reproduces cleanly (all 9 checks pass, 54 suites / 720 tests, pack 211,617 B < 230,000 B,
instrument chain valid through seq 10). No assertion was deleted or weakened - the 5567bd8-class violation did NOT recur.
But four document/record-level findings must be closed before this round can be called sound. Do NOT merge, push, or open a PR.

## Blocking fixes

| ID | Sev | Fix | File(s) |
| --- | --- | --- | --- |
| STD-1 | High | `stateEvent()` allowlist has no `expires_at`/`capa_ref` branch, so seq 10 silently drops them even though `:322-323` passes them and ADR-0063 D-D asserts they are recorded. Add the branches; re-emit the chain through the sanctioned quarantine path, never hand-edit. | `src/instrument-identity.js:140-181`, `src/instrument-state.json` |
| P-1 | High | `criteria_change` (`scripts/instrument.js:395-404`) and `record_only_change` (`:430`) validate `--authorization` then omit it from the payload. Either persist it, or amend the ADRs to state only signoff-class events persist it. | `scripts/instrument.js`, ADRs 0062/0063 |
| STD-2 | High | Glossary carries a stale live cap `200,000 bytes per ADR-0039`; the branch amended it to 230,000. | `CONTEXT.md:1170` |
| SPEC-2 | Medium | `build-governance-anchors.js --check` is jest-scoped only: absent from `docs/gates.json` (22 entries enumerated) and `package.json`. Wire it into `gate:all` so drift fails the gate lane. | `docs/gates.json` or `package.json` |
| SPEC-1 | Medium | Ledger D-001 pins a 3-point trend; ADR-0062 D-C has 5 rows, row 5 (`208,655`) sourced only to a commit message. Back-fill it into an ADR-0039 budget note, or annotate rows 4-5 as this-round readings; state the width (3 vs 5). | `docs/adr/0062-*.md`, `docs/adr/0039-*.md` |
| SPEC-3 | Medium | defer-0024's git-commit witness does not satisfy D-005's "no git-as-tamper-proof-ledger" negative. Record that honestly and keep the external witness open with a deadline. | defer-0024 check-in, `docs/deferred-registry.json` |

## Regression tests to add (with STD-1)

- A `conditional_signoff` event in history MUST carry `expires_at` and `capa_ref`.
- A `criteria_change` event MUST carry `authorization` (only if the ADR continues to claim it).

## Non-blocking (judgement)

- P-2: `record()` logs the FIRST `record_only_change` (`scripts/instrument.js:448-449`) instead of the one just written - fix the lookup.
- P-3: bias-probe artifact lives under gitignored `.scratch/`, yet seq 10 anchors its hash - already an open deferred tension; no new action this round.
- STD-4/STD-5: Primitive Obsession (three parallel scalar copies) and mild Shotgun Surgery - style only, repo-overridden.

## Mandatory re-run after fix (same suite as the audit)

```
npx jest --runInBand
node scripts/run-test-gate.js --expected-suites 54
node scripts/run-gates.js
npm pack --dry-run --json
node scripts/instrument.js --check
node scripts/check-deferred.js
node scripts/build-adr-index.js --check
node scripts/build-governance-anchors.js --check
```

Plus the two new regression tests, and `git status --short` (only `bench/polygraph/results/reverify-20260913.json` may remain untracked).

## Separation of duties

The audit window does NOT modify code. Whichever party repairs, the repair is re-audited against the audit report's Section 1 before close.
