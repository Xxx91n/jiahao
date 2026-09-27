# ADR-0061 Implementation Round - CLOSURE VERIFICATION (2026-09-13)

Auditor: second-party audit agent. Actor applying the D-1 fix: audit window (on explicit human instruction).
Authority: `.scratch/grill-adr0061/reports/2026-09-13-repair-order-2.md` (D-1 fix + proportionate confirmation).

## D-1 fix applied

**File:** `docs/adr/0039-tarball-runtime-surface-narrowing-docs-adr-archive-channel.md` (line 53-56)
**Before:** `Current re-measure at this repair round: **212,387 bytes / 93 files** (still < 230,000).`
**After:** `Current re-measure at this repair round: **212,699 bytes / 93 files** (still < 230,000), measured with \`npm pack --dry-run --json\` (the \`size\` field, npm 10.9.7) per this ADR's own re-measure rule. This figure is a point-in-time reading, not a cap: the cap parsed below is what binds.`

Option 1 of the repair order was chosen (correct the number) rather than deletion, and the measurement command + npm version are now cited inline, so the figure satisfies the ADR's own "re-measure after ANY packed-file edit" rule instead of being a bare assertion.

**Commit:** `koq` on `adr0061-repair-docs` (git `a995bec`). Docs-only; no code, gate, or witness artifact touched.

## Write integrity (Windows file-integrity protocol)

- Encoding: UTF-8, **no BOM** (first bytes `23 20 41` = `# A`).
- Line endings: **LF only** (no CR octets).
- Region re-read: lines 53-56 confirmed at the expected offsets; surrounding lines 45-56 intact.
- `212,387` absent from the tree; `212,699` present once, at ADR-0039:53.

## Proportionate confirmation (the 4 checks the repair order specified)

| # | check | result |
| --- | --- | --- |
| 1 | `git grep -n "212,387" -- docs/` -> expect none | **NO_MATCHES**; and `212,699` -> ADR-0039:53 |
| 2 | `npx jest --runInBand` | exit 0, **54 suites / 727 tests** (unchanged by the docs-only edit) |
| 3 | `node scripts/run-gates.js` | exit 0, **23 entries**, 4 unverifiable; `[197 governance-anchors] PASS` |
| 4 | `node scripts/build-governance-anchors.js --check` | exit 0, `OK - 4 artifacts, digests in sync` |

Supporting re-runs: `run-test-gate --expected-suites 54` -> `OK: 54 suites, 727 tests, 0 skipped`; `instrument --check` -> OK (chain seq 1..12, conditional / 2026-12-11); `check-deferred` -> OK 32 entries; `build-adr-index --check` -> in sync; `npm pack` -> 212,699 B < 230,000 (matching the corrected ADR figure exactly).

## Final disposition of every finding raised in this audit cycle

| ID | Origin | Status |
| --- | --- | --- |
| STD-1 | first audit | CLOSED (seq 12 carries expires_at/capa_ref) |
| P-1 | first audit | CLOSED (authorization persisted on signoff-class events) |
| P-2 | first audit | CLOSED (record() reports the appended record) |
| STD-2 | first audit | CLOSED (CONTEXT.md:1170 -> 230,000) |
| SPEC-1 | first audit | CLOSED (ADR-0039 back-fill + ADR-0062 width note) |
| SPEC-2 | first audit | CLOSED (governance-anchors gate in gate:all) |
| SPEC-3 | first audit | CLOSED (defer-0024 bar stated, witness open, deadline 2027-09-01) |
| RSD-1 | re-audit (Low) | OPEN, non-blocking (P-2 fallback is redundant but correct) |
| D-1 | re-audit (Medium) | **CLOSED by this fix** |

**No blocking finding remains.** The round's hard acceptance holds: 54 suites / 727 tests, gate:all exit 0 (23 entries), tarball 212,699 B < 230,000, instrument chain valid through seq 12 with append-only integrity proven against the pre-repair baseline (seq 1-10 byte-identical).

## Verdict: **PASS - round closed**

All six original blocking findings and the single re-audit residual are closed. The audit window applied the D-1 fix under explicit human instruction and re-verified it; the fix is docs-only and cannot affect the tested surface, which the unchanged 727-test result confirms.

## Open items carried forward (not blocking)

1. **Frozen seq 6 / seq 10 remain field-deficient** by append-only design; documented as ERRATA E-4/E-5 with the ADR-0063 D-D erratum. A future re-anchor must append a new event, never edit them.
2. **P-3 / RSD-1**: the bias-probe artifact lives under gitignored `.scratch/` while the chain anchors its hash (deferred tension); the P-2 fallback branch is redundant but correct.
3. **`bench/polygraph/results/reverify-20260913.json`** remains untracked by design (regenerable; reserved for human review per the round constraint).

## Merge / push outcome (executed)

Per human instruction this session: after closure, merge the round's branches and push, then safely delete merged branches. Executed as follows.

**Pre-merge topology:**

- `main` at `808c2cd`
- `adr0061-doc` (fixed point, already an ancestor)
- `adr0061-impl` -> T-1..T-5 (tip `9bed002`)
- `adr0061-repair-docs` -> repairs R-1..R-5 + D-1, stacked on `adr0061-impl` (tip `a995bec`, commit `koq`)

**Merge:** `808c2cd` verified as a strict ancestor of `a995bec`, so the merge was a clean fast-forward. `main` advanced `808c2cd..a995bec`.

**Push:** `808c2cd..a995bec` pushed to `origin/main`. Post-push verification confirmed `local main == origin/main == a995bec` (in sync).

**Branch deletion (safe, `git branch -d` — merged-only guard):**

- `adr0061-doc` (`031a3a7`)
- `adr0061-impl` (`9bed002`)
- `adr0061-repair-docs` (`a995bec`)

All three passed the merged-only guard. Three stale `gb-local/adr0061*` tracking refs were additionally removed via `git update-ref -d` (remote-tracking refs to the now-deleted local round branches).

**Post-merge verification:** acceptance re-run on the merged tree — 54 suites / 727 tests, gate:all exit 0 (23 entries), tarball 212,699 B < 230,000, `212,387` absent. Round closed and landed.
