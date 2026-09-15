# ADR-0058 实施轮 — 最终审计报告（final audit）

- 日期：2026-09-12
- 身份：审计 Agent（职责分离：只出报告，不动手修）
- 审计对象：`main` 上的三个已推送提交（base = `e638133`）
  - `919c5bd` feat(ci): independent test job + always() success-only summary (ADR-0058)
  - `744cf94` docs(adr-0058): audit fixes - false/stale claims corrected
  - `d148bc4` chore(hooks): de-GitButler .githooks - real pre-commit restored as active hook
- 任务书：`.scratch/grill-adr0058/handoffs/next-round.md`
- 被审自述：`.scratch/grill-adr0058/reports/2026-09-12-report.md`
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001…D-013；D-004/D-007 = revised，D-010…D-013 = proposed）
- 环境：Windows 11 / Git Bash / node v22.22.2 / but 0.22.3 / gh 2.89.0
- 纪律：仓库工作树零改动（本报告落在 gitignored 的 `.scratch/`）；未做任何分支/提交/推送

> **审阅端点纠正**：本轮必须用 `d148bc4` 作为端点，**不得用 `HEAD`**。HEAD 现为 `gitbutler/workspace`（`fa94e63`），它在 `d148bc4` 之上还挂着 GitButler 的账目提交 `da14113` / `fa94e63`（仅本地，未推送）。用 HEAD 会引入无关噪声。

---

## 0. 结论

# ❌ **不通过（阻塞）**

理由（一句话）：本轮的头号交付物——「独立 CI test job 跑套件数 wrapper」——在它**唯一运行的地方（CI）结构性崩溃**，从未成功执行过一次；而 CI 通道的红是本轮引入的新回归。

| 维度 | 结果 |
|------|------|
| 本地硬验收（compile / package / start-alive / test / gate） | **全部通过**（见 §1） |
| **CI 通道（gh run）** | **12/12 运行全红；tip `d148bc4` 三 job 均红** |
| 六项审计修复（F2/F3/F4/F6/F8/F9） | 6/6 已落地（子代理独立核实） |
| D-xxx 决策实现 | 7 项已落地；**D-006 功能面失败**；D-004/D-007 已 revised；D-010…D-013 待拍板 |

---

## 1. 硬验收 — 亲自重跑

| # | 验收项 | 命令 | 实测 | 结论 |
|---|--------|------|------|------|
| 1 | 测试套件 | `node node_modules/jest/bin/jest.js` | **49 passed / 660 passed，exit 0** | 通过 |
| 2 | 门禁（本地） | `npm run gate:all` | **exit 0；4 UNVERIFIABLE**（ci-wiring/bench-gate/probes/mr-probes） | 通过 |
| 3 | 门禁（本地 CI 模式） | `GITHUB_ACTIONS=true CI=true npm run gate:all` | **exit 0；0 unverifiable**（21 门全跑全过） | 通过（但与 CI 不一致，见 A2） |
| 4 | 语料漂移 | `npm run corpus:drift` | OK（full 135/0/0，public 131/0/4） | 通过 |
| 5 | 打包 | `npm pack --dry-run --json` | **size=199785，93 files，headroom=215** | 通过 |
| 6 | **compile** | `build-adapters.js --check` / `instrument.js --check` / `build-adr-index.js --check` | 23 adapter 一致 / identity pinned / index in sync；均 exit 0 | 通过 |
| 7 | **start-alive** | 启动 `jiahao-mcp/index.js` + MCP 握手 | initialize / tools/list / tools/call / prompts/list **4 响应**；4s 后**进程存活** | 通过 |
| 8 | 行尾洁净 | `git diff --check` | exit 0，无输出 | 通过 |
| 9 | 编码 BOM/LF | `e638133...d148bc4` 全部文件逐字节 | 19 项：17 present 均 `BOM=false CR=0`；2 deleted（.githooks/post-checkout、pre-commit-user） | 通过 |
| 10 | 门禁辅助 | `check-ci-jobs.js` / `check-deferred.js` | SATISFIED exit 0；21 entries exit 0 | 通过 |
| 11 | **CI 通道** | `gh run list` / `gh api .../check-runs` | **12/12 failure；tip `d148bc4`：gate-all ✗ / test ✗ / summary ✗** | **不通过** |

---

## 2. 「声明 → 证据 → 结论」对照表

### 2.1 被审报告（`2026-09-12-report.md`）的关键声明

| # | 报告声明 | 实物证据 | 结论 |
|---|----------|----------|------|
| 2.1 | 提交 919c5bd 含 14 文件 | `git show --name-status 919c5bd` = 14 条 | 属实 |
| 2.2 | ci.yml 三 job（gate-all / test / summary） | YAML 解析：`jobs=gate-all,test,summary`；`summary.if=always()`；`needs=[gate-all,test]`；`test.env={JIAHAO_TEST_TIER: public}` | 属实 |
| 2.3 | gates.json 删除 test gate，order 100 留空不重编号 | entries=21；`order100=false`；无 test gate 条目；无 tombstone | 属实 |
| 2.4 | R2 注册套件数应为 49 | ci.yml `--expected-suites 49`；磁盘 `test/*.test.js` = 49 | 属实 |
| 2.5 | R4 打包 199,766 / 余量 234 | 当前实测 199,785 / 余量 215（因 744cf94 文本增加 19 B） | 属实（数值已变，仍 < 200,000） |
| 2.6 | R5 临时脚本移入 .scratch，无残留 | `.scratch` 在 .gitignore；复跑后无新增未跟踪文件（除下述 A5） | 属实 |
| 2.7 | R6 adr-0055 改用 `origin/main~1` | `test/adr-0055-wiring.test.js:100` | 属实 |
| 2.8 | §4「npm test 全绿」 | 本地 49/660 exit 0 | 属实 |
| 2.9 | **§4「the gate/test closed loop, which is green」** | **CI 通道 12/12 红；test job 结构性崩溃** | **不属实（A1/A2）** |
| 2.10 | **§4「this repo has no long-running process」（旧 F5）** | jiahao-mcp 有 `npm start`，实测可启并存活 | **不属实（旧 F5，未处置）** |
| 2.11 | §1「未触碰 .githooks / .gitignore / bench/polygraph/results / mr-artifacts」 | `919c5bd` 确实未含这些路径 | 属实（`d148bc4` 改 .githooks 属**审计后的独立授权轮**，非本轮） |
| 2.12 | §6.4 but 偏离已披露 | 报告 §6.4 有；且已录入 ADR-0058 新增的 R7 | 属实 |

### 2.2 六项审计修复（`744cf94`）

| 项 | 证据 | 结论 |
|----|------|------|
| F2 | ADR-0058 D-E：“needs no edit”；Consequences：“the file itself is unchanged” | 已修 |
| F3 | `docs/adr/0057` D-D 已加 `Amended 2026-09-12 by ADR-0058` inline 块 | 已修（**但 Context 段残留，见 A4**） |
| F4 | Consequences：“recorded in D-C … no registry status changes” | 已修 |
| F6 | D-F / D-H 均已为 `--expected-suites 49` | 已修 |
| F8 | ADR-0058 新增 `### R7` 收录 but 偏离 | 已修 |
| F9 | `run-test-gate.js` 文案改指 “ci.yml test-job call line” | 已修 |

---

## 3. D-xxx 逐条核对

| 决策 | 实现证据 | 判定 |
|------|----------|------|
| D-001 串行排序 | 本轮仅 ADR-0058；治理政策仍为下一文档轮 | 落地 |
| D-002 A-hardened 聚合 | ci.yml `if: always()`；`!= "success"`；无 `success\|\|skipped`；无 `continue-on-error`；**生产验证**：run 34631502524 正确聚合 `results="failure failure"` 为红 | 落地（**但 “unknown → red” 未实现，见 A3**） |
| D-003 仅 presence-coupled；不自动激活 | registry 仅新增 defer-0027；defer-0003/0004/0024 状态未变；check-ci-jobs 仅 SUGGEST | 落地 |
| D-004 两层验证 / required-check 不做机器断言 | Option-C 分层落地；ADR prose 已记 | **revised**（前提被平台证伪，待拍板） |
| D-005 ADR-0034 D5 收窄 | `docs/adr/0034:137` inline 修订块；`gate:all` 出现次数=1 | 落地 |
| D-006 test gate 移出 + wrapper 迁入 test job | gates.json 无 test gate；ci.yml test job 调 `run-test-gate.js --expected-suites 49`；**但 wrapper 一跑就崩（A1）** | **功能面失败** |
| D-007 `needs:[gate-all,test]` 全量聚合 | ci.yml 已断言；wiring test 双向断言 | 落地（技术核心）；required-check 前提 **revised** |
| D-008 `JIAHAO_TEST_TIER=public`，不引 secret | `test.env` 解析确认；test job 内无 `JIAHAO_BENCH_CORPUS_B64` | 落地 |
| D-009 order 100 留空不重编号、无 tombstone | gates.json 无 100；既有空洞保留；ADR 有 “order 100 retired” | 落地 |

**缺失 / 弱化 / 跑偏单列：**

- **跑偏（D-006）**：wrapper 迁入后**从未成功运行**；D-006 枚举的“four same-round companion revisions”漏了 wrapper 自身的 capability 声明（A1）。
- **弱化（D-002）**：D-B 要求 “unknown → red”，实现只能检测非空词；空结果集零迭代 → 假绿（A3）。
- **未落地（D-004 约束）**：D-011 proposed 的约束要求修订 CONTEXT.md / ADR-0058 D-G 中 “serves as the only required check” 类表述，**当前仍在**（但 D-011 未获拍板，未实现属合规）。

---

## 4. 双轴评审（$code-review）

固定点 `e638133`，端点 `d148bc4`；两轴由两个并行子代理独立执行，不合并、不重排。

### 4.1 Standards 轴

- **硬性（子代理主张，经核实并纠正范围）**：`.githooks/*` 被 `d148bc4` 修改——但该提交属**审计后的独立用户授权轮**，本轮实现提交 `919c5bd` 未触碰 `.githooks`（已核实）。**不计入本轮违规**。
- **硬性（成立）**：AGENTS.md 工作约定——文档轮产物与实现轮同提交（旧 F1，不可回溯）。
- **硬性（成立，新发现 A3）**：summary 脚本与 ADR-0058 D-B 自相矛盾——D-B 说 “unknown → red”，实现遇空结果集打印 “aggregate green”。已实测：`results=""` → GREEN。
- **判断项**：`test/adr-0058-wiring.test.js` 声明 intent-shaped 但 `expect(names).toEqual([...])` 是顺序敏感快照；`check-ci-jobs.js` 一个退出码覆盖两个条目（与 ADR-0035 D5/D6 “one entry, one condition type” 有张力，已由 D-004 批准）；`countJobs` 沦为 Middle Man；README 手写测试计数（ADR-0043 漂移面）。
- **已遵守**：BOM/LF 洁净；`parseJobs` 抽取消除 3 处重复；gates.json↔ADR 同提交耦合成立；blocklist 自动收窄（D5）。

### 4.2 Spec 轴

- **缺失**：required-check 部署未记入 ADR-0058 Acceptance（任务书要求；前提已证伪）。
- **缺失/跑偏**：D-006 的 wrapper 迁移**运行时失败**（A1）——spec 的 “four companion revisions” 枚举不完整。
- **范围外但已授权**：`d148bc4`（.githooks）、`test/adr-0035`、`test/adr-0055`、`CONTEXT.md`、`deferred-registry.json`。
- **正确项**：六项审计修复 6/6 到位；Phase 3 item 7 的 but 偏离已录入 ADR 本体（R7）；D-009 order 100；ADR-0034 D5 inline 修订块。
- **Spec 轴结论**：文档面 6/6 修复到位；功能面 D-006 存在**未修复的运行时缺陷**，是唯一 WRONG 项。

### 4.3 取证边界说明

本次两轴评审未新增 atomcode 外部调研：本轮需要验证的是仓库内实物证据与 CI 通道事实，均有直接一手证据（`gh run` 日志、本地复现）。上一轮已完成的两次 atomcode 调研（industry mental models）结论已入账本 D-010…D-013。

---

## 5. 新发现（本轮新增，单列呈报）

| 编号 | 级别 | 发现 | 证据 | 影响 |
|------|------|------|------|------|
| **A1** | **P0（代码回归）** | `scripts/run-test-gate.js:16` 仍调 `requireCapabilities('test')`，按 ADR-0040 D1 去 gates.json 查已被移除的 test gate → 抛错 exit 1 | 本地 `node scripts/run-test-gate.js --expected-suites 49` → `Error: gate "test" missing from docs/gates.json (ADR-0034 D1)`，exit 1；CI run 34631502524 job `test` 同报错 | **本轮头号交付物从未成功运行**；CI test job 永久红；= 账本 D-013 |
| **A2** | **P0（环境/密钥）** | CI gate-all 红因恢复的语料缺 `mr-probes.jsonl` | CI 日志：`[config]: [corpus] missing mr-probes.jsonl - JIAHAO_CORPUS_DIR=/home/runner/work/_temp/bench-corpus has no such file`；本地 `private/bench-corpus/` 含该文件且 `check-corpus-leak.js` 报 `clean: 4 corpora, 54 line fingerprints, 246 files` exit 0 | 既存（非本轮）；解释 12/12 全红；`JIAHAO_BENCH_CORPUS_B64` 密钥陈旧 |
| **A3** | 中（假绿面） | summary 成功-only 循环遇**空结果串**零迭代 → 打印 “aggregate green”，与 D-B “unknown → red” 矛盾 | 实测 `results=""` → `EMPTY_CASE_VERDICT=GREEN`；`results="failure failure"` → RED | 本轮旨在消除假绿，却在自身组件留下假绿面；wiring test 未断言结果**数量** |
| **A4** | 中（残留失实） | `docs/adr/0057` Context 仍写 “Jest suites **currently** execute inside gate:all as the `test` gate (gates.json order 100)” | `docs/adr/0057` 第 12 行；`744cf94` 只加了 D-D 的 inline 修订块，未动 Context 段 | 现行时态失实，违反 ADR-0043 “no false claim” |
| **A5** | 低（卫生） | `mr-artifacts/` 是 mr-probes 门（order 175）的输出目录，但 **`.gitignore` 未收录**（其三个兄弟 bench-/probe-/test-artifacts 均在内） | `git check-ignore -v mr-artifacts` → NOT-IGNORED；`.gitignore:31-33` 仅列三个；当前工作树存在未跟踪的 `mr-artifacts/` | 本地跑 mr-probes 门会弄脏工作树 |
| **A6** | 低（既存） | `bench/polygraph/results/` 下 9 个跟踪文件含 CRLF，与 `.gitattributes` `* text=auto eol=lf` 不符 | `git ls-files \| xargs grep -lU $'\r'` → 9 个，全在该目录；均存在于 `e638133` 且本轮未改 | 既存卫生问题，**不归本轮** |

---

## 6. 过程违规（单独呈报，不替你追认）

| 编号 | 级别 | 违规 | 证据 |
|------|------|------|------|
| **P1** | 硬（不可回溯） | 文档轮产物未按 AGENTS.md 工作约定单独提交 | `git log --all --grep='ADR-0058'` 仅 `919c5bd`；`docs/adr/0058` 与 `test/adr-0058-wiring.test.js` 在 `e638133` 均不存在 |
| **P2** | 硬（验收诚实性，范围扩大） | 被审报告 §4 把可执行的 start-alive 声明为“不可执行”（旧 F5）；**并额外把 CI 通道已经红的 “gate/test closed loop” 声明为 “green”** | 报告 §4 原文；CI 12/12 红；wrapper 从未成功运行 |
| **P3** | 硬（审计自报） | 首次审计只跑本地通道、从未查 `gh run`，漏判 CI 破损——与 P2 同类缺陷 | 审计报告 §1 全部为本地命令；§10.3 已自报 |
| **P4** | 中 | 被审报告的验收表**没有 CI 通道行**，即“每平台需要测试闭环”的验收项在报告中无对应证据 | 报告 §4 表格 5 行，均本地 |

---

## 7. 修复要求与重跑清单

**本轮不得放行。** 下列为阻塞项（建议打回修复窗口，或经你批准后执行）：

1. **[A1 / D-013，阻塞]** 修复 `run-test-gate.js` 的 capability 声明（ADR-0040 D1 规定能力声明变更须由 ADR 逐字命名，故需 ADR-gated 修复），使 wrapper 可运行；并补 wiring test 断言防回归。
2. **[A2，阻塞 CI 绿]** 更新 `JIAHAO_BENCH_CORPUS_B64` 密钥（使其含 `mr-probes.jsonl`）或修正 CI 恢复步骤的 `JIAHAO_CORPUS_DIR`；否则 CI 永不可能绿，任何 required check 均无意义。
3. **[A3]** 修正 summary 脚本：断言“看到的 result 个数 == needs 个数”，空/未知一律红；并补 wiring test 断言。
4. **[A4]** 修订 `docs/adr/0057` Context 段的现行时态失实表述。
5. **[A5]** 将 `mr-artifacts/` 加入 `.gitignore`（与三个兄弟目录并列）。
6. **[A6]** 修正 `bench/polygraph/results/` 9 个 CRLF 跟踪文件（独立 hygiene 提交）。
7. **[P1]** 流程修复：后续严格执行“文档轮先提交”（本轮已不可回溯）。
8. **[P2/P3/P4]** 按账本 D-012 的 CAPA 要求处置：验收清单每项标注**验证通道**（本地 / CI），CI 通道为强制项。

**重跑清单（任何修复完成后，必须重跑同一套验收）：**

```
node node_modules/jest/bin/jest.js                 # 49 suites / 660 tests, exit 0
npm run gate:all                                   # exit 0, 4 UNVERIFIABLE
GITHUB_ACTIONS=true CI=true npm run gate:all       # exit 0, 0 unverifiable
npm run corpus:drift                               # fingerprints OK
npm pack --dry-run --json                          # size < 200000
node scripts/build-adapters.js --check             # 23 adapter 一致
node scripts/instrument.js --check                 # identity pinned
node scripts/build-adr-index.js --check            # in sync
git diff --check                                   # 无输出
node scripts/check-ci-jobs.js                      # exit 0 SATISFIED
node scripts/check-deferred.js                     # exit 0, 21 entries
node scripts/run-test-gate.js --expected-suites 49 # 当前 exit 1 -> 修复后须 exit 0 且输出 [test] OK
# start-alive: node jiahao-mcp/index.js + MCP 握手 -> 4 响应且进程存活
# CI 通道（强制）：gh run list / gh api .../check-runs -> summary = success
```

---

## 8. 待你裁决

1. **A1/D-013**：由谁修（打回修复窗口 / 我修）？需 ADR-gated 变更，方案选 (i) 改 capability 声明 还是 (ii) 新能力名？
2. **A2**：密钥更新由你操作（需 GitHub secret 写权限）还是另有方案？
3. **D-004 / D-007 的 revised** 是否认可？**D-010 / D-011 / D-012 / D-013 四个 proposed** 如何定？
4. **P2**（自述不实，含把 CI 红说成绿）是否问责修复子代理？**P3**（审计自身漏判）如何计入？
5. **A5/A6** 是否纳入本轮修复，还是另开 hygiene 轮？

---

## 9. 审计自身的边界声明

- 本次已补上上一轮缺失的 **CI 通道验证**（§1 第 11 项），并因此暴露 A1/A2。
- 未验证：GitHub 侧分支保护/Ruleset（平台不可用，403）；密钥内容本身（无权限读）。
- 未验证：CI 在修复后的实际运行结果（修复尚未发生）。
- 本报告未改动任何仓库跟踪文件；仅写入 gitignored 的 `.scratch/`。
