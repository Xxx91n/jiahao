# r3 审计交接（审计窗 → 下一轮 grill）

- 日期：2026-10-19。审计对象：commit `d97e06df`（虚拟分支 `e-branch-1`，"feat(audit): r3 window - avoid-tier CI gate, D-004/D-005 registration pack, BK-09 re-pin"）。
- 审计报告（含完整"声明→证据→结论"对照表）：`../reports/2026-10-19-audit-r3.md`
- backlog：`../backlog.md`
- 被审报告：`../reports/2026-10-19-report.md`；被审交接：本目录 `2026-10-19-round-done.md`；任务书：本目录 `next-round.md`（commit `54bfa8f1`）。
- 入口：`C:\Windows\temp\jiahao'‘.txt`。
- 审计方法：验证阶梯 rung1–3（机器判定 > 地面真值 > 独立复跑）；未以 rung5（LLM 评鉴）作定论依据。

---

## 审计结论：NOT PASS（1 项 blocker），按用户裁决**统一移交下一轮 grill**

审计窗只出报告、未动手修；本轮**未生成实施交接**，改由本审计交接把全部问题交下一轮。

### 审计窗独立复跑（非引用报告自述；happy-path 声明在最高档成立）

| 命令 | 我的输出 | 结论 |
|---|---|---|
| `npm test` | `28 passed / 400 passed + 1 skipped / 401`，RC=0 | ✅ 与声明逐字一致 |
| `node scripts/coinage-triage.js` | RC=0 | ✅ |
| `node scripts/build-adapters.js --check` | 54 adapter 全 match，RC=0 | ✅（额外加固） |
| `node scripts/install.js --help` | RC=0 | ✅ 启动测活 |
| `node bench/research/devin-oot.js --replay` | RC=0 | ✅ |
| v1/v2/v3 eval-plan pin | `e1c2e66f`/`626bb091`/`6bf1ee86` 全 match | ✅ |
| `node scripts/corrigendum-v3.js --check` | unchanged，RC=0 | ✅ |
| `node scripts/check-pairer-regression.js` | 140 items / 36 flagged / 0 undetermined，RC=0 | ✅ |
| `node scripts/instrument.js --check` | **RC=1**（resolve-then-pin mismatch on rules） | ⚠ 欠账属实 |

结论：**T-2 / T-4 与全量测试等 happy-path 硬声明全部成立**；红项只有 `instrument --check`（报告已登记为欠账，登记属实）。

---

## blocker（未修，随本轮移交）

**B-1 `duplicateTokenDefinitions` 漏检"两行同 canonical token"（声明证伪 / T-3 验收未达）**
- 位置：`scripts/shared/coinage-triage.js:384`（判定点 `:393`）；接线 `scripts/coinage-triage.js:90`。
- 证据（确定性复跑）：
  - `[{token:'foo'},{token:'foo'}]` → `[]`（报告声明"同 token 双行"**不披露**）
  - `[{token:'foo'},{token:'bar',synonyms:['foo']}]` → 正确披露
- 根因：`owner` 以 `row.token` 为值，守卫 `owner.get(t) !== row.token` 原意跳过行内自指，却连"两行同名"一并吞掉。函数自述契约含 "Two rows sharing a token"，未实现；`test/` 下该函数**零覆盖**。
- 影响面：受限（advisory 面、未立新原则、当前 substitution_table 无重复 token，无现实漏报）。审计窗按"声明证伪=blocker"二分规则据实判 blocker。
- 建议修复（未施工）：去重键改**行身份**（下标/id）；补两方向单测。
- 修复后重跑（与上表同一套）：`npm test` / `coinage-triage.js` / `build-adapters.js --check` / `install.js --help` / `devin-oot.js --replay` / `corrigendum-v3.js --check` / `check-pairer-regression.js`。

---

## 一并移交的下轮台账（backlog，不阻塞收口）

- **B-2** `docs/gates.json` 断链**被报告低估**：实测 55 entries 中 **29 条 gate 的 command 指向不存在脚本**（`run-gates.js`/`check-ci-wiring.js`/`build-adr-index.js`/`check-coverage.js` 等）；`source_adr` 指向缺失 ADR（0034/0046/0057 均缺，实存 51 文件）。报告仅称 order 105 一条。
- **B-3** `duplicateTokenDefinitions` 零单测（随 B-1 修）。
- **B-4** 冻结输入 `handoffs/next-round.md` 在实施 commit `d97e06df` 内被**静默改写**（格式性，语义未变），报告/交接清单均未披露。
- **B-5** T-3 #12 登记物件 `atomcode-report-pain2.md` 未被 git 跟踪，勘误注记仅在工作区、不在 commit 内。
- **B-6** 报告 §T-3 文件清单与交接"12 改 + 1 新增"互不一致，且与 commit 实际 15 项（12 M + 3 A）不符。
- **B-7** CI gate 的 GitHub Actions **远端**真实运行未观测（未 push）。
- **B-8** T-1 关窗依据（用户裁决）**无法从仓库核验**：两条验收路径库内均未达（`instrument --check` rc=1；gates.json 未动）。

## 过程违规呈报（审计窗未替你追认）

- PV-1 = B-4；PV-2 = B-5；PV-3 = B-8；PV-4 = B-6。四者在 `../reports/2026-10-19-audit-r3.md §3` 逐条展开。

## 未核 / 待补

- GitHub Actions 远端实际运行结果——需一次 push 后远端观测。
- T-1 关窗裁决**原文**（入口文件系二手转述）——需用户确认。

---

## 建议下一轮调用的技能

- `grill/engineering/code-review`（双轴评审 Standards + Spec）
- `gitbutler`（`but` 全写操作，与其他分支并行）
- `handoff`（沿本目录既有格式写交接）
- （grill 主流程技能按用户当场指示）

## 复用的环境坑（前轮教训）

- edit 工具 `LineTrimmedReplacer` 会把 JSON 1 空格缩进改 2 空格——JSON 精修一律用 node 脚本（`JSON.parse` → 改 → `JSON.stringify(obj, null, 1)`）。
- bash 工具实为 PowerShell；单引号串里 `\n` 是字面两字符。
- VCS：GitButler `but`；`.scratch` 不入库，`reports/`、`handoffs/` 用 force-add 例外提交；push 需显式指令。

> 本交接**不含**下一轮 grill 方向指示——方向由用户当场定，不继承。