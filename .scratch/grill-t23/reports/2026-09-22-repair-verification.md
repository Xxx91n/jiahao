# grill-t23 repair-window verification - second-party re-audit (2026-09-22)

- Auditor: verifier-profile second-party agent (same audit window; duty separation kept - no repairs performed here)
- Object: the repair window over `9b27a5e..HEAD` on `grill-t23-docs` - commits `154f918` (audit absorb), `0bf3394` (ref-assets untrack), `c44c0dc` (T4-C disposition batch), `c304ec2` (NEVER_COMMIT classifier + intermediate capture), `57a3cf3` (clean-tree recapture), `46b218b` (g6 replay regen), `c5ef0d2` (facts fixpoint), `11a4173` (closeout fixpoint), `9aba1f6` (map regen).
- Prior audit: `D:/Aworker/jiahao/.scratch/grill-t23/reports/2026-09-22-audit.md` (PASS WITH FINDINGS, T4-C-1..C-9 routed).
- Verdict: **PASS** - all nine dispositions verified against artifacts; the full acceptance suite re-ran green post-repair.

## 1. Same-suite acceptance re-run (post-repair, independent)

| Check | Repair-window claim | Audit re-run at HEAD | Verdict |
| --- | --- | --- | --- |
| `node scripts/run-test-gate.js --expected-suites 77` | 77/1307 green | 77 suites / 1307 tests / 0 skipped, exit 0 | MATCH |
| `node scripts/run-gates.js` | exit 0 | exit 0 - 35 entries, same 4 UNVERIFIABLE (capability-absent), 3 advisories; pack-smoke inside it | MATCH |
| `node scripts/check-pack-smoke.js` | 340,472 < 380,000 | exit 0 - `340472 < 380000`; growth 340,290->340,472 is the repair-round doc surface, consistent | MATCH |
| `build-round-facts --check --report` | in sync | exit 0 | MATCH |
| `build-rewrite-map --check` | 2321 in sync | exit 0 - 2,321 doc citations | MATCH |
| `build-governance-anchors --check` | in sync | exit 0 - 18 artifacts | MATCH |
| clean-tree | CLEAN, 13 untracked | 0 tracked diffs; every untracked entry is never-commit class or this audit window's pending outputs; `ref-assets/` now correctly classified | MATCH |
| evidence count | 26 captures + 1 fixture + 1 sheet | 26 `.txt` captures + `quoted-stale.fixture.md` + `logo-phase6-sheet.png` on disk | MATCH |

## 2. T4-C dispositions - claim -> evidence -> conclusion

| id | Claim | Independent evidence | Conclusion |
| --- | --- | --- | --- |
| T4-C-1 | three stale-red legs re-captured verbatim post-fixpoint | `run-test-gate.txt`/`round-facts.txt`/`rewrite-map.txt` now carry `EXIT 0` and green output; commit map row `1c08356` annotated with the freeze | CONFIRMED |
| T4-C-2 | ref-assets untracked, bytes preserved, classifier repaired | `git ls-files` empty for the path; three PNGs remain on disk as untracked; `recapture-clean-tree.cjs:13` NEVER_COMMIT regex gained `^\.scratch/grill-t23/ref-assets/` - script-level fix, not case-by-case; `0bf3394` diff = exactly the 3 deletions | CONFIRMED |
| T4-C-3 | defer-0066 backfilled + instance bookkeeping | report consent sweep names defer-0066 with a dated (2026-09-22) backfill marking instance 4 resolved-in-t23-harness; registry `last_check_in` mirrors it, instances 1-3 stay open, row stays pending-evaluation | CONFIRMED |
| T4-C-4 | C-7 tick 2/2 registered, count corrected | report carries the lookback-registration sentence and "26 captures + 1 fixture + 1 sheet" - matches the on-disk set | CONFIRMED |
| T4-C-5 | per-finding disposition table | report gains "Audit dispositions" with T3-C and T4-C tables in spec-section-8 form (fixed/deferred/converted/rejected vocabulary) | CONFIRMED |
| T4-C-6 | `8effaaf` D6 rhythm deviation disclosed | honest-state entry added; disposition marked fixed-by-disclosure (the combined sync+repin form stays as executed) | CONFIRMED |
| T4-C-7 | config.yml + ci.yml inline comments | both files carry the ADR-0076 D-B carve-out comment block; "each template" claim now holds | CONFIRMED |
| T4-C-8 | gh metadata verbatim leg | `evidence/gh-metadata.txt` = `$ gh repo view --json ...` + EXIT 0 + live output (description + 7 topics) | CONFIRMED |
| T4-C-9 | record hygiene cluster | commit map normalized to git shas (sole non-sha row is "closing fixpoint" - self-naming impossible, convention-consistent); `battery_as_of_commit` semantic note added; headroom tri-source reconciled (40,592 pre-change M / 40,089 post-commit / 39,710 current canon); liveness + h1-reread `$` lines marked display-form; `51a66d3` message-vs-diff mismatch disclosed inline | CONFIRMED |
| (bonus) | defer-0068 countersign | registry `last_check_in` records the countersign citing this audit as second-party evidence (defer-0042 precedent); row stays pending-evaluation to the 2026-12-15 tide - correct, the tide discharges it | CONFIRMED |

## 3. Process check on the repair window itself

- `c44c0dc` diff = exactly the 10 declared files (2 template comments, 3 re-captured legs, gh-metadata, report, round-facts, registry, rewrite-map) - the allowlist discipline held; zero never-commit carryover this round.
- `154f918` committed the audit report + handoff byte-identical to what this window wrote; `audit-evidence/` stayed untracked.
- No push: still no GitHub remote (`gb-local` only).
- Facts canon updated honestly: pack_bytes 340,472 (post-repair), citations 2,321, battery_as_of `c5ef0d2`.

## 4. Residuals (unchanged, standing)

- `defer-0068` pending-evaluation to 2026-12-15 (countersign recorded; tide discharges).
- Social preview manual upload remains the user's two clicks (`docs/assets/brand/social-preview.png`).
- Burn-rate advisory at 4+ consecutive carve-out rounds - prefer R3 next round.
- `bench-gate`/`ci-wiring`/`mr-probes`/`probes` capability-absent on this host (disclosed).
