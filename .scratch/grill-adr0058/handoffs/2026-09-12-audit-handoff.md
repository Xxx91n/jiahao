# Handoff — ADR-0058 审计轮 → 下一轮

- 日期：2026-09-12
- 产出窗口：审计 Agent（职责分离：只出报告，不动手修）
- 分支状态：`codex/adr0058-impl` @ 919c5bd（父 e638133 = origin/main，领先 1 提交，**未推送**）
- 上一轮任务书：`.scratch/grill-adr0058/handoffs/next-round.md`（本次审计对象，保留未覆盖）
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001 … D-009）
- 审计报告：`.scratch/grill-adr0058/reports/2026-09-12-audit-report.md`
- 被审自述：`.scratch/grill-adr0058/reports/2026-09-12-report.md`

---

## 0. 状态更新（2026-09-12 执行轮 — 已落地）

用户批准后已完成：F2/F3/F4/F6/F8/F9 已修复（commit `744cf94`），`.githooks/*` 已以干净态提交（commit `d148bc4`，**未删除**——它是 ADR-0011 §3 治理的活钩子面），`main` 已推送至上游（`e638133..d148bc4`），`but setup` + `but pull` 成功，`but status` 已恢复。

因此本文档第 2 / 4 节所列的**阻塞项已全部解除**；仍需人工处理的只剩：**F1**（流程教训）、**F5**（验收诚实性问责）、**F7**（required-check 部署，现已可执行）、**defer-0026 / defer-0004 的人工三选一**。详见审计报告第 9 节。

当前分支状态：HEAD = `gitbutler/workspace`（fa94e63，GitButler 工作区提交），`main` = `origin/main` = `d148bc4`，工作树与 `origin/main` 逐字节一致。
---

## 1. 现状（一句话）

ADR-0058 实现轮的功能面**全部验收通过**（9/9 硬验收亲自复现），D-001…D-009 全部落地；但提交 919c5bd 携带 **3 项硬性文档违规 + 1 项验收诚实性缺陷**，故审计为**有条件通过，push 维持冻结**。

本 handoff 不重复审计内容——细节一律看审计报告（路径见上）。此处只写「谁接着做什么」。

---

## 2. 阻塞 push 的立即下一步：文档修复轮（建议独立窗口）

**不需要功能返工。** 下列 6 项均为文档 / 文案级修复，**建议在同一分支追加一次 doc-fix 提交（不 amend，保留可审计历史）**：

| 项 | 位置 | 修复要求 |
|----|------|----------|
| F2 | `docs/adr/0058-*.md` 第 74 / 238 行 | 「check-ci-wiring.js blocklist updated」→ 改为「blocklist 由 registry 派生，删除 test gate 后自动生效，未改动该文件」 |
| F3 | `docs/adr/0057-*.md` D-D + `docs/adr/0058-*.md` 表头 | 在 ADR-0057 D-D 加 inline 修订块「Amended 2026-09-12 by ADR-0058」，与 ADR-0034 第 137 行的修订模式对称（推荐）；否则撤回 ADR-0058 的 Amends 声明 |
| F6 | `docs/adr/0058-*.md` D-H 规范正文 | `--expected-suites 48 stays unchanged` → 更正为 49，保留 R2 作为修订记录，消除文件内自相矛盾 |
| F4 | `docs/adr/0058-*.md` Consequences | defer-0004 一句改为「评估结果记录于本 ADR D-C；registry 状态不变（不自动激活）」 |
| F8 | `docs/adr/0058-*.md` Repair notes | 补 R7：记录「提交未走 but、改用裸 git 写操作」的偏离与理由（内容可引报告 §6.4） |
| F9 | `scripts/run-test-gate.js` | 报错文案的事实源指向由「docs/gates.json params」改为「ci.yml 调用行」 |

**修完必须重跑同一套验收（逐条，不得抽样）：**

```
node node_modules/jest/bin/jest.js      # 49 suites / 660 tests, exit 0
npm run gate:all                        # exit 0, 4 UNVERIFIABLE
npm run corpus:drift                    # fingerprints OK
npm pack --dry-run --json               # size < 200000
node scripts/build-adapters.js --check  # 23 adapter 文件一致
node scripts/instrument.js --check      # identity pinned and authoritative
node scripts/build-adr-index.js --check # in sync
git diff --check                        # 无输出
node scripts/check-ci-jobs.js           # exit 0 SATISFIED
node scripts/check-deferred.js          # exit 0, 21 entries
# start-alive: node jiahao-mcp/index.js + MCP 握手 → 4 个响应且进程存活
```

push 仅在上述修复完成 + 重跑全绿后，由你明确批准执行。

---

## 3. 待你裁决（审计窗口不替你追认）

1. **F1** — 文档轮产物未单独提交（并入 919c5bd），违反 AGENTS.md 工作约定；本轮已无法回溯拆分，是否接受为流程教训并放行？
2. **F5** — 报告 §4 把「启动测活」声明为不可执行（实际 `jiahao-mcp` 有 `npm start` 且实测通过）；是否需对修复子代理作质量问责？
3. **F7** — required-check 部署（`gh api` 审计 + 分支保护）由谁、何时执行？（依赖 ci.yml 落地，需写权限）
4. **but 环境修复** — 见第 4 节，需批准后才能执行。

---

## 4. `but` 环境修复（已评估，未执行 — 等你批准）

`but status` / `but diff` 当前均拒绝：`Error: Setup required: Not currently on a gitbutler/* branch.`（HEAD 在 codex/adr0058-impl）。

唯一被 `but` 指明的修复是 `but setup`；但按其 `--help`，它会切到 `gitbutler/workspace`（当前 19f1607，陈旧），**会危及**未推送的交付提交工作树态与工作树中 `.githooks/*` 的未提交状态。

**建议执行前置条件（缺一不可）：**
1. 919c5bd 已推送或已确认可重建（ref 本身安全，风险在工作树）；
2. `.githooks/*` 未提交状态已由属主处置（审计窗口不得触碰）；
3. 执行 `but setup` → 验证 `but status` 恢复；
4. 重跑第 2 节同一套验收。

属环境修复，不属代码修复；需你批准后指定窗口执行。

---

## 5. 下一个 grill 方向指示

push 冻结导致 ci.yml 尚未落地，故原计划顺序需微调：

1. **先：ADR-0058 文档修复轮**（第 2 节，阻塞 push）。
2. **再：defer-0026 unfreeze** — ci.yml 落地且 `check-ci-jobs.js` 报 SATISFIED 后，更新 `docs/deferred-registry.json` 中 defer-0026 的 status（当前账本 D-003 要求人工三选一：activate / re-defer+更新 rationale / close）。同时 defer-0004 也报 SATISFIED，同样需人工三选一。
3. **下一文档轮（主方向，D-001 已定）：决策规则变更管理政策** — ADR-0049 leftover，`docs/decision-rule-0049.md` 治理缺口（版本锚 0049.1、无变更权限人）。这是 D-001 串行排序中明确排在 defer-0026 之后的那一轮。
4. **可选**：`scripts/reverify.js` option-clump 重构（metrology config object）—— 低优先级。

**建议 grill 轮次结构**：先跑 `$grilling` 对「决策规则变更管理政策」出前沿问题（账本 D-001 已给出两条硬约束：治理政策必须有机器可验证的存在性断言；always() 三类误用必须避开）；结论落 `decision-ledger.md` 后再进 `$to-spec`。

---

## 6. Standing rules（沿用，未变）

- gates.json 改动必须与其 ADR 同提交（ADR-0027 耦合护栏）。
- 批处理 shell = bash；文件编辑走 ctx（Node fs）；写后验 BOM/LF。
- 永不提交 bench/probe/run 残留；private corpus 不入 clone（ADR-0038 D2）。
- push 仅在实施轮终审通过后执行。
- 不触碰其他 agent 未提交的工作（`.githooks/*`、`.gitignore`、`bench/polygraph/results/*`、`mr-artifacts/*`）。
- 文档轮产物先提交，再开实现轮（本轮已违规，见 F1；后续严格执行）。
- ADR-0039 D3 打包预算余量仅 234 字节：下一个打包面文件新增即会打破 `npm test`，需单独一轮（R4）。

---

## 7. Suggested skills

- `grill/productivity/grilling` — 下一文档轮的前沿提问（决策规则治理）
- `grill/engineering/code-review` — 文档修复轮后的双轴复审
- `grill/engineering/to-spec` / `to-tickets` — 治理政策成型后
- `gitbutler`（`but`）— 待第 4 节环境修复后恢复使用
- `atomcode-research` — 治理政策取证（串行，一次一轮）
- `grill/productivity/handoff` — 下一轮收尾

---

## 8. 敏感信息

无密钥 / 凭据 / PII 写入本文档。所有证据均可由审计报告中的命令重建。

---

## 10. 第三次更新（2026-09-12 02:14）：F7 阻塞 + P0 CI 回归 + 账本修订

- **F7 未能执行**：本仓库为**私有 + 免费套餐**，平台不提供分支保护/Ruleset（`gh api .../protection` 与 `/rulesets` 均 403）。「summary 作为唯一 required check」在当前套餐下无法部署；且 summary 当前为红，启用即阻断全部合并。→ 新增 **D-011** 待拍板。
- **P0 新发现（本轮引入）**：CI run `34631502524` 三 job 全红；`test` job 崩溃于 `run-test-gate.js:16 requireCapabilities('test')` → `Error: gate "test" missing from docs/gates.json`（D-006 移除 test gate 的未完成同伴修订）。已本地复现。→ 新增 **D-013** 待拍板。
- **gate-all 的红为既存**（corpus-leak / corpus-freshness / mr-probes 在 CI 模式失败），非本轮引入。
- **账本变更**：`D-004`（×2）与 `D-007` 标记为 `revised`（原记录保留）；新增 `D-010`、`D-011`、`D-012`、`D-013`（均为 `proposed`，等拍板）。
- **下一个 grill 方向不变**（主方向：ADR-0049 leftover 决策规则变更管理政策），但**新增两个前置项**：D-013（CI 回归修复）与 D-011（required-check 载体决策）。
- 所有决策均**未实施**——按协议等你拍板后才继续下探。
