# r3 实施窗 · 审计 backlog（不阻塞收口）

来源：审计窗 `reports/2026-10-19-audit-r3.md`。以下为除 blocker 外的 findings，均**不影响** T-2/T-4 happy-path。

| id | finding | 证据 | 建议档位 |
|---|---|---|---|
| B-2 | `docs/gates.json` 断链范围**被报告低估**（报告仅称 order 105 一条） | 遍历 55 entries：**29 条 gate 的 command 指向不存在脚本**（`scripts/run-gates.js`/`check-ci-wiring.js`/`build-adr-index.js`/`check-coverage.js` 等）；`source_adr` 指向缺失 ADR（0034/0046/0057 均不在 `docs/adr`，实存 51 文件） | backlog（历史账本，封账后以 spec/ADR 为准；若要修需单独立项） |
| B-3 | `duplicateTokenDefinitions` **零单测覆盖** | `grep -rn duplicateTokenDefinitions test/` 无命中 | 随 blocker B-1 一并修 |
| B-4 | 冻结输入 `handoffs/next-round.md` 在实施 commit 内被**静默改写**（格式性，语义未变），报告/交接清单均未披露 | `git show d97e06df` 含 next-round.md 的 `-table/` `-b` 等 diff 行 | backlog + 已在审计报告 PV-1 呈报 |
| B-5 | T-3 #12 的登记物件 `atomcode-report-pain2.md` **未被 git 跟踪**，勘误注记仅在工作区、不在 commit | `git ls-files`/ignore 状态 | backlog（scratch 产物，可接受但应知） |
| B-6 | 报告 §T-3 文件清单与交接"12 改 + 1 新增"**互不一致**，且与 commit 实际 15 项不符 | `git show --stat d97e06df` = 12 M + 3 A | backlog（文档一致性） |
| B-7 | CI gate 的 **GitHub Actions 远端**真实运行未观测 | 未 push | 需一次 push 后远端观测 |
| B-8 | T-1 关闭依据（用户裁决）**无法从仓库核验** | 两条验收路径在库内均未达（instrument rc=1；gates.json 未动） | 待用户确认裁决原文 |

**不改动结论**：以上均不构成 blocker；blocker 仅 `audit/2026-10-19-audit-r3.md §2 B-1`（duplicateTokenDefinitions 同 token 双行漏检）。