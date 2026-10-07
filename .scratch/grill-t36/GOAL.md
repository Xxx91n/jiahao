# grill-t36 GOAL

- Slug: grill-t36
- Date opened: 2026-10-02
- Stage: docs-phase-closed

## Motivation (verbatim, load-bearing)

> 我们的目标是构建出一个心智模型:不要跟个嘉豪一样，总是自以为是觉得任务完成了、自我安慰觉得任务跑通了、颅内高潮觉得自己又行了、总爱显摆却不踏实做事。

## Context restoration

- Prior round: grill-t35 (public-object equivalence contract). Implementation lane
  `grill-t35-impl` audited PASS at round 4; lane is landable, NOT yet landed.
- Restoration source: `.scratch/grill-t35/handoffs/2026-10-01-loop-close-handoff.md`
  (read-order list inside) + `.scratch/grill-t35/decision-ledger.md` (D-001..D-008).

## Rules this grill

- Grill only: no source edits, no other goals; research then ask, ONE question per round.
- Every owner-confirmed substantive answer is appended to decision-ledger.md at once
  (D-001 up): ID / original question / owner answer verbatim / normalized requirement /
  explicit constraints & negatives / status (current|revised|stale|deferred).
- Data source for later docs is the ledger only; a conclusion not in the ledger is
  reported and held, never written into docs.
- I do not declare the grill finished: ledger count + coverage self-assessment, then ask.
- Version control: GitButler (`but`), parallel with other lanes, explicit allowlists.

## Progress messages

- 2026-10-02: grill 定稿——9 条记录（D-001 revised 成员表被 D-003
  增补，D-002..D-009 current）；覆盖率自评无去向清单为空。
- 2026-10-02: 文档整理波完成——账本对账 8 current 全部有去向；
  6 项账本沉默项经 owner 裁定按机械项进 spec（附录清单在案）；
  产出 spec-t36-observer.md + handoffs/next-round.md，随工作台
  一并 commit 防丢失。下轮入口=任务书 T-0。
