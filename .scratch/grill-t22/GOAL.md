# grill-t22 — GOAL

Source: t21 audit (PASS WITH FINDINGS, C-1..C-5) + audit handoff recommendation; the recommended disposition was already consumed by the post-audit repair window (a8974cd..b93a5df).

## Pain (invariant)

构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## This round's question

The t21 post-audit repair window (fix(grill-t21) 715eef1 + cascade) repaired C-1..C-5 AND landed both structural candidates (check-governance-inventory --coverage-base leg; rc.from tightening) under its own battery re-run — but the repair chain itself is unaudited second-party, rc.from's policy home is thin (trend reason only), the repair-window amend-in-place convention is now 2x de facto (t20 abf2f83, t21 715eef1) and unwritten, and pack-cap headroom is ~6 bytes (339994/340000) with the cap-amendment path needing a pre-registered ADR slot. [Disclosed Repair, 2026-09-22 - audit-r2 R2-C-1: at T-0 audit time the measured pack was 340258 - over cap; the charter's own CONTEXT.md addition crossed it undisclosed]

## Constraints

- Grill mode: no source edits, no other goals; one question at a time.
- Ledger-first: every confirmed decision appended immediately; byte-check each write.
- VCS: but only; parallel with other branches.
