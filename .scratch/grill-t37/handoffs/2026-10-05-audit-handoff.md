# Handoff: grill-t37 audit → rework + next round (audit verdict: FAIL)

Audit report: `D:\Aworker\jiahao\.scratch\grill-t37\reports\2026-10-05-audit-report.md` (full claim→evidence table, findings F-1..F-11, process observations P-1..P-4, rework list + re-run checklist in §6). This handoff does not duplicate it; read §6 first.

## Verdict

FAIL — the impl round's mechanism is verified working (its own assert leg caught the drift), but commit `b57f043b` landed 15 R2 files with no `grill-t37` row in `docs/governance/trend-inventory.json`, minting 3 undisclosed coverage-leg reds (adr-0081/0083/0084 wiring tests). The report's "1734 pass / 2 fail" was a pre-commit snapshot; the landed tree runs 1731/5.

## Where the work goes next

1. **fixes lane (`grill-t37-fixes`) — rework, then re-audit:**
   - F-1 (blocking): mint the `grill-t37` round row in `trend-inventory.json` (kind:"fix", `governance_tooling_diff.files` covering the 15 R2 files in the `"path"`/`"path [R2]"` doubled convention) or route an owner-approved alternative; PLUS the already-queued items: `test/orphan-cites.test.js` fixture GIT_COMMITTER_DATE pin, pin-resync + orphan-cites registry rows for `cf79e810`/`5ed69c41`.
   - F-2/F-3/F-4/F-7 code fixes per report §6 items 2-5, each with a pinning test.
2. **docs lane (`grill-t37-docs`) — unchanged from the impl handoff:** ADR-0095 first, then gates.json registration of `status-inventory`/`expected-red`/`comment-refs` (assert leg LAST), M-E wording, deferred rows. New input: F-8/F-9/F-10/F-11 adjudication material for ADR-0095 (member-identity domain, T-0 tier fill, contract-vocab enumeration basis, mismatch flag).
3. **Owner queue grew:** F-5 matrix-dimension timing, F-8 comparison-domain ruling, F-10 enumeration-basis ruling, P-1 (F-6-window declare) precedent/errata call — plus the standing pack-cap sign-off, post-land refresh, map-freshness orphan registrations.
4. **Re-audit:** after rework lands, re-run the report's §6 checklist verbatim; success = test inventory back to the 2 disclosed rows + assert leg exit 0.

## Suggested skills for the next session

- `$code-review` (grill/engineering) — re-audit after the rework.
- `$implement`/`tdd` — F-2/F-3/F-4/F-7 each need a failing test first.
- `gitbutler` — all VCS writes (explicit ids + `[ANCHORING]` footer + `git show --name-only` verify).
- `atomcode-research` — only if a new adjudication point opens (per ledger protocol).

## Next grill direction (post-closeout candidate)

Once this wave is clean, the highest-value grill target is **the assert leg's own trust surface**: F-4 (mid-run artifact selection) and F-7 (phantom-block extraction) are both "the verifier's own parser/history assumptions" — the same defect class this repo keeps paying tuition on. A `grill-t38` on "the mechanism that watches the mechanism" (assert-leg adversarial fixtures: in-flight artifacts, prose marker mentions, foreign-tree run_ids, digest-vs-snapshot divergence) would close the loop the t37 object opened.
