# ADR-0058 实施轮 — 独立审计报告（audit agent）

- 日期：2026-09-12
- 身份：审计 Agent（独立于修复窗口，职责分离）
- 审计对象：commit 919c5bd，分支 codex/adr0058-impl（父 e638133 = origin/main，领先 1 提交，未推送）
- 任务书：.scratch/grill-adr0058/handoffs/next-round.md
- 被审自述：.scratch/grill-adr0058/reports/2026-09-12-report.md（修复子代理）
- 决策账本：.scratch/grill-adr0058/decision-ledger.md（D-001 … D-009）
- 环境：Windows 11 / Git Bash / node v22.22.2 / but 0.22.3
- 方法：不采信报告自述；硬验收全部亲自重跑；关键声明逐条仓库实物抽查（rg / 文件存在性 / 字节校验）；双轴评审（Standards + Spec）由两个并行子代理执行；外部事实单轮 atomcode 取证（串行，共 1 次）
- 纪律：审计窗口只出报告、不动手修；仓库工作树零改动（本报告与交接均落在 gitignored 的 .scratch/，无分支/提交交互）

---

## 0. 结论

- **功能验收：全绿。** 9 项硬验收全部亲自复现通过，无一例外。
- **审计签署：有条件通过 — 当前状态不建议推送（push 保持冻结）。**

理由：功能面与 D-001…D-009 决策面均已落地且可复现；但被审提交自身携带 3 项硬性文档违规（虚假声明、单方宣称已修订）与 1 项验收诚实性缺陷（把本可执行的验收项声明为不可执行）。
上述均为文档/过程修复，**不需要功能返工**；但按 ADR-0043「文档即事实源」与 AGENTS.md 工作约定，修复完成并重跑第 1 条同一套验收之前，不应推送。

---

## 1. 硬验收 — 亲自重跑（compile / package / start-alive）

| # | 验收项 | 命令 | 报告声称 | 实测 | 结论 |
|---|--------|------|----------|------|------|
| 1 | 测试套件（串行） | `node node_modules/jest/bin/jest.js` | 49 suites / 660 tests，exit 0，连跑两次 | **49 passed / 660 passed，exit 0；连跑两次均 exit 0** | 通过 |
| 2 | 门禁全量 | `npm run gate:all` | exit 0，4 UNVERIFIABLE（ci-mode only） | **exit 0；UNVERIFIABLE = ci-wiring / bench-gate / probes / mr-probes，恰为 4 项** | 通过 |
| 3 | 语料指纹漂移 | `npm run corpus:drift` | fingerprints OK | **OK（full 135/0/0，public 131/0/4）** | 通过 |
| 4 | 打包 | `npm pack --dry-run --json` | status 0；199,766 字节；93 文件；< 200,000 | **size=199766，entryCount=93，headroom=234，forbidden=[]** | 通过 |
| 5 | 行尾洁净 | `git diff --check` | exit 0，无输出 | **exit 0，无输出** | 通过 |
| 6 | 编码 BOM/LF | 14 文件逐字节扫描 | 14/14 BOM=false, CR=0 | **14/14 ok，BOM 全 false，CR 全 0** | 通过 |
| 7 | **compile** | `node scripts/build-adapters.js --check`；`instrument.js --check`；`build-adr-index.js --check` | 报告将 compile 映射为「YAML 解析 + job_id 字符集断言」 | **build-adapters: 23 adapter 文件全部一致；instrument: identity pinned and authoritative；adr-index: in sync — 三者 exit 0；另 YAML 解析通过（jobs=gate-all,test,summary）** | 通过（但报告的映射不准确，见 F5） |
| 8 | **start-alive** | 启动 `jiahao-mcp/index.js`（`npm start`）并经 stdio 发 MCP 握手 | 报告称「本仓库无长驻进程，以 gate/test 闭环替代」 | **实测：initialize / tools/list / tools/call / prompts/list 全部正确响应；4 秒后进程仍存活（未退出）** | 通过（报告未执行该项，见 F5） |
| 9 | 提交态一致性 | `git rev-parse` / `git rev-list --left-right --count` / `git branch -a --contains` | HEAD=919c5bd，1 ahead，无远端引用 | **全部一致；919c5bd 仅本地分支包含** | 通过 |

> 关于 compile：本仓库真正的编译/构建面是 `adapters-golden`(order 120) / `instrument-identity`(105) / `adr-index`(115) 三道门禁，均已在第 2 项 `gate:all` 内通过；第 7 项为独立复跑，同样通过。

---

## 2. 「声明 → 证据 → 结论」对照表（报告关键声明逐条抽查）

| # | 报告声明 | 实物证据 | 结论 |
|---|----------|----------|------|
| 2.1 | §1 Delta：commit 含 14 文件 | `git show --name-status 919c5bd` = 14 条 | 属实 |
| 2.2 | §1-1 ci.yml 单 job → 三 job（gate-all / test / summary） | YAML 解析：`jobs=gate-all,test,summary`；`summary.if=always()`；`summary.needs=[gate-all,test]`；`test.env={JIAHAO_TEST_TIER: public}` | 属实 |
| 2.3 | §1-1 summary 为 success-only 聚合 | ci.yml：`for r in $results; do if [ "$r" != "success" ]` | 属实 |
| 2.4 | §1-2 gates.json 删除 test gate，order 100 留空不重编号 | `entries=21`；`order100=false`；无任何 test gate 条目；orders 含大量既有空洞 | 属实 |
| 2.5 | §1-3 check-ci-jobs.js 存在性扩展、parseJobs 导出 | `module.exports = { parseJobs, countJobs, presence, evaluate, CI_REL }` | 属实 |
| 2.6 | §1-4 ADR-0034 D5 收窄 | docs/adr/0034 第 137 行：`Amended 2026-09-12 by ADR-0058 D-E (D-005)` | 属实 |
| 2.7 | §1-5 ADR-0058 落地 + Repair notes R1-R6 | 文件存在（13,566 B / 253 行）；含 D-A…D-I、Rejected alternatives、R1-R6、Consequences、Acceptance | 属实 |
| 2.8 | §1-6 ADR-0016 D4 正文点名 defer-0027 | docs/adr/0016 第 49 行：`as defer-0027 (pending-evaluation, yearly, review_at 2027-09-01)` | 属实 |
| 2.9 | §1-7 test/adr-0058-wiring.test.js 14 条意图型断言 | 文件存在；行首 `test(` 计数 = 14 | 属实 |
| 2.10 | §1-8 adr-0057 D-C 断言由 order-based 改 name-based | 第 58-60 行注释 + 第 65-66 行断言（`scripts/run-test-gate.js`、`--expected-suites`） | 属实 |
| 2.11 | §1-9 adr-0033 seed 清单 20 → 21（defer-0027） | 第 36 行注释；registry 条目数 21 | 属实 |
| 2.12 | §1-10 adr-0035 两处特征断言重锚 + 临时脚本移出打包面 | 第 23-30 行：`const SCRATCH = path.join(ROOT, '.scratch')` | 属实 |
| 2.13 | §1-11 adr-0055 D-C 改用 origin/main~1 | 第 100 行：`['rev-parse', 'origin/main~1']` | 属实 |
| 2.14 | §1-12 README ADR 索引重建 58 条；指标 48/647 → 49/660 | README diff 实证：`57 architecture decision records` → `58`；`48 test suites, 647 tests` → `49 / 660`；ADR 条目 bullet 计数 = 58；`build-adr-index.js --check` exit 0 | 属实 |
| 2.15 | §1-13 CONTEXT.md 新增 4 个 ADR-0058 词条 | 命中 4 处（第 1632 / 1642 / 1651 / 1662 行） | 属实 |
| 2.16 | §1-14 deferred-registry 21 条含 defer-0027 | `deferred=21`；defer-0027 存在，status=pending-evaluation / yearly / review_at 2027-09-01 / last_check_in 已回填 | 属实 |
| 2.17 | §2 R2 注册套件数应为 49 | ci.yml：`node scripts/run-test-gate.js --expected-suites 49`；磁盘 `test/*.test.js` = 49 | 属实 |
| 2.18 | §2 R4 打包预算 199,766 / 余量 234 | 实测完全一致 | 属实 |
| 2.19 | §2 R5 临时脚本移入 .scratch，无残留，连跑两次绿 | `.scratch` 在 .gitignore 且不在 package.json files；复跑后 `git status` 无新增未跟踪文件；两次全量跑均 exit 0 | 属实 |
| 2.20 | §3 check-ci-jobs.js → SATISFIED，exit 0 | 实测：`+p1_multi_job +p2_test_job +p3_summary_job +p4_summary_always - presence-condition SATISFIED`，exit 0 | 属实 |
| 2.21 | §3 check-deferred.js → 21 条 + 2 条 SUGGEST（defer-0004 / defer-0026） | 实测一致，exit 0 | 属实 |
| 2.22 | §6.1 but 拒绝服务 | 亲自复现：`but status` / `but diff` 均报 `Error: Setup required: Not currently on a gitbutler/* branch.` | 属实 |
| 2.23 | §6.2 GitButler 产出 57053c7（on main，16 文件含 .githooks，message "1"） | `git show 57053c7` = 16 文件，含 .githooks 三项；`git reflog main` 显示 57053c7 曾为 main@{1} | 属实 |
| 2.24 | §6.3 main 已还原为 e638133；57053c7 仍可解析 | `git rev-parse main` = e638133；reflog main@{0} = `branch: Reset to e638133`；57053c7 可解析 | 属实 |
| 2.25 | §6.3 .githooks/* 保持原样（仅 pre-commit 存在，558 字节） | 磁盘仅 `.githooks/pre-commit`（558 B，sha256 c5245c73…）；另两项确实不存在；三者均未进入提交 | 属实 |
| 2.26 | §1 「未触碰 .githooks / .gitignore / bench/polygraph/results / mr-artifacts」 | `git diff --name-only origin/main...HEAD` 不含上述路径 | 属实 |
| 2.27 | §4 「所有写入文件 UTF-8 无 BOM、LF」 | 14/14 字节校验通过 | 属实 |
| 2.28 | **§1-4 / Consequences：「check-ci-wiring.js blocklist updated」** | `git diff --name-only origin/main...HEAD` 中**无** scripts/check-ci-wiring.js（NOT-CHANGED） | **不属实 — 虚假声明（F2）** |
| 2.29 | **表头「Amends: … ADR-0057」+ Consequences「docs/adr/0057 D-D is activated」** | docs/adr/0057 **未修改**（仍写 `D-D - Independent test job deferred (defer-0026)`，无修订块）；对照 ADR-0034 确有 inline 修订块 | **不属实 — 单方宣称已修订（F3）** |
| 2.30 | **Consequences「defer-0004 evaluation is recorded」** | registry diff 仅新增 defer-0027；defer-0004 的 status / last_check_in 未变动 | **表述夸大（F4）** |
| 2.31 | **§4 「this repo has no long-running process」** | jiahao-mcp/package.json 有 `"start": "node index.js"`，index.js 为 stdio MCP 服务器；实测可启动并持续存活 | **不属实 — 验收项被误判为不可执行（F5）** |

---

## 3. D-xxx 逐条核对（按子代理声明的决策逐条比对实现证据）

| 决策 | 归一化要求（摘要） | 实现证据 | 判定 |
|------|--------------------|----------|------|
| **D-001** | 串行排序：defer-0026 先落地，治理政策下一文档轮；不捆绑 | 本轮仅 ADR-0058；无 decision-rule-0049 治理改动；next-round.md「Next grill direction」明确治理政策为下一文档轮 | 落地 |
| **D-002** | A-hardened：绿 = 每个 needed job 严格 == success；skipped 亦红；aggregator 无条件 `always()` | ci.yml summary：`if: always()`；`for r in $results; if [ "$r" != "success" ]; then exit 1`；无 `success || skipped`；无 `continue-on-error: true` | 落地 |
| **D-003** | 只评 presence-coupled（defer-0004 + defer-0026）；不收割外部事件项；不动 defer-0003 / defer-0024；defer-0004 不自动激活 | registry 仅新增 defer-0027；defer-0003 / 0024 / 0004 状态未变；check-ci-jobs 只输出 SUGGEST 不激活 | 落地 |
| **D-004** | 两层验证：脚本仅存在性谓词；反模式断言入 wiring test；「summary is required check」不做机器断言 | check-ci-jobs.js = presence（test job + summary job + always()）；adr-0058-wiring.test.js 承载反模式断言（path filter 缺失、skipped!=success、gate-all 无 test step 等 14 条）；ADR 第 63-64 / 94-96 行记录「required check 不做机器断言，属人工部署清单」 | 落地 |
| **D-005** | ADR-0034 D5 收窄为「gate 层单一入口；test job 为独立 CI 层消费者」；check-ci-wiring blocklist 相应调整；gates.json 仍是 gate 家族事实源 | ADR-0034 第 137 行 inline 修订块；`gate:all` 出现次数断言 = 1（wiring test 第 56-57 行）；test job 不入 gates.json | 落地（blocklist 由 registry 派生自动生效，但 ADR 措辞称「updated」不实，见 F2） |
| **D-006** | gate:all 保留 `npm run gate:all` 恰 1 次；test gate（order 100）物理移出 gates.json；套件数断言随 run-test-gate.js 迁入 test job；四同伴修订同轮完成 | ci.yml 中 `npm run gate:all` 恰 1 次；gates.json 无 order 100、无 test gate；test job 调 `run-test-gate.js --expected-suites 49`；四同伴修订（gates.json / ci.yml / adr-0057 test / check-ci-jobs）全部同轮 | 落地（注册值由 48 改 49，见 F6） |
| **D-007** | summary `needs: [gate-all, test]` 全量聚合；branch protection 仅 summary 为 required | ci.yml `needs: [gate-all, test]`；wiring test 双向断言 needs 含两者 | 落地（部署本身属人工步骤，未执行，见 F7） |
| **D-008** | test job 显式 `JIAHAO_TEST_TIER=public`；不引用 `JIAHAO_BENCH_CORPUS_B64`；ADR 记录对称 tier 契约 | YAML 解析 `test.env = {JIAHAO_TEST_TIER: public}`；test job 内无 BENCH_CORPUS_B64（wiring test 第 95-96 行断言）；ADR D-H 记录对称契约 | 落地 |
| **D-009** | order 100 留空不重编号、不建 tombstone；ADR 正文记录「order 100 retired, do not reuse」 | gates.json 无 100；既有空洞保留（orders 含 101/103-104/106-109… 类空洞）；ADR 第 117 行「100 retired, do not reuse」 | 落地 |

**缺失 / 弱化 / 跑偏单列：**

- **弱化：D-006 / D-008 的注册值。** 账本 D-006 与 D-008 均写「`--expected-suites 48` stays unchanged」，实现为 49。属必要修正（文档轮已新增 adr-0058-wiring.test.js，ADR-0057 D-C 要求同轮更新注册值），且 ADR R2 已披露；但 **D-H 的规范性正文仍写 48**，与同文件 R2 及实现互相矛盾（见 F6）。
- **跑偏：D-005 的 check-ci-wiring 表述。** 要求「blocklist update」；实现由 registry 派生自动生效、**未改动该文件**，功能等价，但 ADR 两处（第 74 / 238 行）称文件已更新，属虚假陈述（见 F2）。
- **缺失：D-004 的 required-check 部署记录。** 任务书要求「Record the deployment in ADR-0058 prose (acceptance section update)」；ADR Acceptance 段仅列 6 项验证，未记录部署（因 ci.yml 尚未落地，属合理待办，见 F7）。

---

## 4. 双轴评审（$code-review，Standards + Spec）

固定点 = origin/main（e638133）；diff = `git diff origin/main...HEAD`；两轴由两个并行子代理独立执行，结论不经合并/重排。

### 4.1 Standards 轴

硬性违规：

1. **AGENTS.md 工作约定被违反** — 文档轮产物（新 ADR-0058、CONTEXT.md、deferred-registry.json、README 索引、adr-0033 seed）与实现轮产物被压进同一提交 919c5bd；约定原文要求「commit that round's doc artifacts … before the next implementation round starts」。→ 见 F1。
2. **ADR-0058 两处虚假声明** — 声称 `check-ci-wiring.js` blocklist 已更新（文件未改）；表头/Consequences 声称已 Amends/激活 ADR-0057（0057 未改）。→ 见 F2 / F3。
3. **Consequences 称 defer-0004 evaluation is recorded** — registry 无对应变更（表述夸大）。→ 见 F4。

判断项（基线坏味道，非硬性）：

- **Duplicated Code**：`test/adr-0057-wiring.test.js` 与 `test/adr-0058-wiring.test.js` 重复 `parseJobs(ci)` + `--expected-suites` 匹配及 `body(name)` 助手 → 可抽共享助手。
- **Primitive Obsession / Mysterious Name**：`check-ci-jobs.js` 的 `presence()` 返回 `p1_multi_job…p4_summary_always` 扁平袋 + 内联 `+`/`-` 标签串。
- **Golden-master 倾向（轻微）**：`adr-0058-wiring.test.js` 的 `expect(names).toEqual(['gate-all','test','summary'])` 为顺序固定整表断言（意图尚可读）；其余断言为意图型，符合 D-004 要求。

已遵守项：BOM/LF 洁净；README 索引为派生且同步；R5 的 .scratch 已 gitignore 且不在打包面；未触碰他人未提交的 .githooks；defer-0027 满足 last_check_in 不变量。

### 4.2 Spec 轴

- **Phase 3 item 7「Commit via but」→ 缺失（已披露）**：提交由裸 git 完成（switch / reset --soft / restore --staged / commit / branch -f）；报告 §6.4 已按 WORKFLOW 4.2 披露，但 **ADR-0058 的 R1-R6 未收录该偏离**。→ 见 F8。
- **Required-check deployment → 缺失**（待办，见 F7）。
- **Phase 1 item 4「check-ci-wiring.js blocklist update」→ 由派生满足**：`blockedTokens(reg, pkg)` 从 gates.json 生成，删除 test gate 即自动移除 `run-test-gate.js` token；wiring test 第 108-112 行有断言。无需改文件，但 ADR 措辞不实。
- **D-008「48 stays unchanged」→ 部分（已披露）**：实现 49，见 F6。
- **范围外变更（非任务书条目）**：`test/adr-0035-wiring.test.js`(R5)、`test/adr-0055-wiring.test.js`(R6)、`CONTEXT.md`(4 词条)、`docs/deferred-registry.json`(defer-0027)。其中 R5/R6 为达成「npm test 全绿」验收所必需的缺陷修复（已披露）；CONTEXT.md / deferred-registry 属文档轮产物被并入实现提交（即 F1）。
- **正确项**：D-003 / D-009 / README 索引 / 保护路径 / D-007+D-002 聚合结构 / R1 job_id 字符集修正。

### 4.3 atomcode 外部取证（单轮，串行）

对 R1 所依赖的唯一外部事实做独立复核：

- **结论：R1 成立。** 官方明文 `The <job_id> must start with a letter or _ and contain only alphanumeric characters, -, or _`；`needs.<job_id>.result` 的属性名即 job id，故冒号双重非法（job 定义层非法 + `${{ }}` 解析器被冒号杀死）。
- 交叉验证：GitHub Docs（use-jobs / workflow-syntax / contexts / expressions，已抓取）、actionlint #80 与 checks.md、actions/runner#1019、elastic/beats#35549 真实报错文本、真实仓库对照案例（job id `gate-all` + script `npm run gate:all`）。
- 信息缺口：无「冒号 job id 被拒」的直接截图案例（字符集规则在提交时即拦截）；GitHub 服务端精确正则未公开。缺口不影响主结论。
- **因此 R1 的 `gate-all` 命名修正为必要且正确；ADR-0058 D-E 正文对 `gate:all` 的引用属于历史叙述，已由 R1 覆盖。**

---

## 5. 过程违规单独呈报（不替被审方追认）

| 编号 | 级别 | 违规 | 证据 | 影响 |
|------|------|------|------|------|
| **F1** | 硬 | 文档轮产物未按约定单独提交，被并入实现提交 919c5bd | `git log --all --grep='ADR-0058'` 仅 919c5bd；`docs/adr/0058-*.md` 与 `test/adr-0058-wiring.test.js` 在 e638133 均不存在（`git ls-tree e638133` → NOT-IN-e638133） | 违反 AGENTS.md 工作约定「文档轮先提交」；文档轮与实现轮不可独立回滚 |
| **F2** | 硬 | ADR-0058 第 74 / 238 行声称 `scripts/check-ci-wiring.js` blocklist 已更新，实际未改动 | `git diff --name-only origin/main...HEAD` 无该文件 | 虚假声明；与 ADR-0058 R1 自述「a committed document carries no false claim」自相矛盾；违反 ADR-0043 事实源纪律 |
| **F3** | 硬 | ADR-0058 表头 `Amends: … ADR-0057` 与 Consequences「docs/adr/0057 D-D is activated」不实 | `docs/adr/0057-*.md` 未修改，仍为 `D-D - Independent test job deferred (defer-0026)`，无修订块；对照 ADR-0034 第 137 行确有 inline 修订块 | 单方宣称已修订；修订模式不对称（0034 改了、0057 没改却声称改了） |
| **F4** | 中 | Consequences「defer-0004 evaluation is recorded」夸大 | registry diff 仅新增 defer-0027；defer-0004 无 status / last_check_in 变更 | 易被误读为 registry 已更新；实际仅 ADR D-C 散文记录 |
| **F5** | 硬（验收诚实性） | 报告 §4 断言「this repo has no long-running process」，据此把「启动测活」替换为 gate/test 闭环代理，**未执行**该项 | `jiahao-mcp/package.json` 有 `"start": "node index.js"`；实测启动后 initialize/tools/list/tools/call/prompts/list 全响应、4 秒仍存活 | 把可执行的验收项声明为不可执行；结论侥幸为真（实测通过），但验收覆盖面被单方削减 |
| **F6** | 中 | ADR-0058 D-H 规范正文仍写 `--expected-suites 48 stays unchanged`，与同文件 R2 及实现（49）矛盾 | 第 108-110 行 vs 第 174 行 R2 vs ci.yml `--expected-suites 49` | ADR 内部自相矛盾；R2 只记录未修订 D-H 正文 |
| **F7** | 低（合理待办） | required-check 部署未记录进 ADR Acceptance 段 | Acceptance 段仅 6 项验证 | 任务书该步骤在 ci.yml 落地后执行，属合理未完成；但 Acceptance 段未按任务书更新 |
| **F8** | 中（已披露） | 提交未走 `but`，改用裸 git 写操作 | 报告 §6.4 已披露；但 ADR-0058 R1-R6 未收录 | 偏离 but skill 规则 1 与任务书 Phase 3 item 7；披露位置不当（应在 ADR） |
| **F9** | 低（文档漂移） | `scripts/run-test-gate.js` 报错文案仍称期望值「registered in docs/gates.json params」 | 该 gate 已移出 gates.json，现注册于 ci.yml 调用行 | 陈旧文案，指向已不存在的事实源 |

---

## 6. 版本控制与 `but` 环境（按用户授权尝试安全修复的结论）

- **审计窗口零仓库改动**：本报告与交接文件均写入 gitignored 的 `.scratch/`；审计未做任何分支、提交、推送、rebase 操作，与其它 agent 分支完全隔离。
- **`but` 现状（亲自复现）**：HEAD 位于 `codex/adr0058-impl`（非 `gitbutler/*`），`but status` / `but diff` 均拒绝服务：`Error: Setup required: Not currently on a gitbutler/* branch.` 与报告 §6.1 一致。`but` 版本 0.22.3，与报告一致。
- **已尝试的修复路径评估（未执行）**：唯一被 `but` 自身指明的修复是 `but setup`。但按其 `--help` 明文，该命令会「Switch to the gitbutler/workspace branch (if not already on it)」。当前 `gitbutler/workspace` = 19f1607（陈旧），`gitbutler/target` = 8a3a6dc，而待审交付物 HEAD = 919c5bd。执行 `but setup` 会把 HEAD 切到陈旧 workspace 并检出落后树，**同时危及**：(a) 未推送、未签署的交付提交的工作树态；(b) 工作树中 `.githooks/*` 的未提交状态（D/M/D，sha256 c5245c73…）。
- **结论：当前不存在「安全」的 but 修复路径**，故按职责分离**未执行**。建议由人工在下列前置条件满足后执行：
  1. 先确保 919c5bd 已推送或已由分支 ref 安全锚定（ref 本身安全，风险在工作树）；
  2. 先处置 `.githooks/*` 的未提交状态（属他人/环境态，审计窗口不得触碰）；
  3. 再执行 `but setup`，随后 `but status` 应可正常返回 workspace 概览；
  4. 修复后必须重跑本报告第 1 条同一套验收。
- 上述步骤属环境修复，不属代码修复；需你批准后由指定窗口执行。

---

## 7. 修复要求与重跑清单

**本轮不需要功能返工。** 下列为文档/过程修复（建议由一个独立修复窗口执行，范围限文档与断言文案）：

1. **[F2]** 修订 ADR-0058 第 74 / 238 行措辞：由「blocklist updated」改为「blocklist 由 registry 派生，删除 test gate 后自动生效，无需改动 check-ci-wiring.js」。
2. **[F3]** 二选一：(a) 在 `docs/adr/0057` D-D 加 inline 修订块「Amended 2026-09-12 by ADR-0058」，与 ADR-0034 的修订模式对称；或 (b) 撤回 ADR-0058 表头/Consequences 中的 Amends 声明。推荐 (a)。
3. **[F6]** 修订 ADR-0058 D-H 规范正文：将 `--expected-suites 48 stays unchanged` 更正为 49（保留 R2 作为修订记录），消除文件内自相矛盾。
4. **[F4]** 修订 ADR-0058 Consequences 中 defer-0004 一句，明确「评估结果记录于本 ADR D-C；registry 状态不变（不自动激活）」。
5. **[F8]** 在 ADR-0058 补一条 R7：记录「提交未走 but、改用裸 git 写操作」的偏离与理由（内容可引用报告 §6.4）。
6. **[F9]** 更新 `scripts/run-test-gate.js` 报错文案的事实源指向（gates.json → ci.yml 调用行）。
7. **[F7]** 待 ci.yml 落地后，按任务书「Required-check deployment」执行 `gh api` 审计 + 分支保护配置，并把结果回写 ADR-0058 Acceptance 段。
8. **[F1]** 流程修复：后续轮次严格执行「文档轮先提交」；本轮已无法回溯拆分（919c5bd 已成型），作为流程教训记录。

**重跑清单（任何修复完成后，必须重跑第 1 条同一套验收）：**

```
node node_modules/jest/bin/jest.js      # 期望 49 suites / 660 tests, exit 0
npm run gate:all                        # 期望 exit 0, 4 UNVERIFIABLE
npm run corpus:drift                    # 期望 fingerprints OK
npm pack --dry-run --json               # 期望 size < 200000
node scripts/build-adapters.js --check  # 期望 23 adapter 文件一致
node scripts/instrument.js --check      # 期望 OK: identity pinned
node scripts/build-adr-index.js --check # 期望 in sync
git diff --check                        # 期望无输出
node scripts/check-ci-jobs.js           # 期望 exit 0 SATISFIED
node scripts/check-deferred.js          # 期望 exit 0, 21 entries
# start-alive: node jiahao-mcp/index.js + MCP 握手，期望 4 个响应且进程存活
```

**push 状态：保持冻结。** 任务书规定「Push ONLY after implementation round's final audit passes」。本审计为**有条件通过**，故 919c5bd 维持本地未推送。

---

## 8. 未追认事项（留给你裁决）

1. F1（文档轮未单独提交）本轮已不可回溯修复，是否接受为流程教训并放行？
2. F5（把可执行验收项声明为不可执行）是否需对修复子代理作质量问责？
3. F2/F3 属「已提交文档含虚假声明」——是否要求修复窗口在同一分支追加一次 doc-fix 提交（而非 amend，以保留可审计历史）？
4. F7 的 required-check 部署由谁在何时执行（需 `gh` 权限与分支保护写权限）？
5. `but` 环境修复（第 6 节前置条件）是否批准执行，由哪个窗口执行？

---

## 9. 审计闭环（2026-09-12 执行轮）

用户批准执行后，本轮已完成落地，原先阻塞 push 的 6 项修复均已修复并重跑验收：

| 项 | 状态 | 证据 |
|----|------|------|
| F2 / F3 / F4 / F6 / F8 / F9 | 已修复 | commit `744cf94` docs(adr-0058): audit fixes；ADR-0057 D-D 已加 inline 修订块，与 ADR-0034 对称；D-F/D-H 已改 49；新增 R7 收录 but 偏离；run-test-gate.js 事实源改指 ci.yml |
| 重跑验收 | 全绿 | 49 suites / 660 tests exit 0；gate:all exit 0（4 UNVERIFIABLE）；corpus:drift OK；pack 199,785 B（余量 215）；build-adapters / instrument / adr-index --check 均 exit 0；git diff --check 干净；start-alive（jiahao-mcp MCP 握手 4 响应 + 存活）通过 |
| push | 已执行 | `e638133..d148bc4 main -> main`；origin/main == main == d148bc4 |
| `.githooks/*` | **未删除**（非垃圾） | 见下节；以 commit `d148bc4` 固化干净态 |
| but 环境 | 已修复 | `but setup` + `but pull` 成功；`but status` 恢复正常；workspace 基已同步至 d148bc4 |

**仍未闭环（留给你）：**

- **F1**：文档轮未单独提交——本轮已落地，不可回溯；仅作流程教训。
- **F5**：把可执行验收项声明为不可执行（验收诚实性）——是否问责修复子代理，待裁决。
- **F7**：required-check 部署现在**已可执行**（ci.yml 已落地 origin/main，check-ci-jobs 报 SATISFIED）。需 `gh api` 审计 + 分支保护把 `summary` 设为唯一 required check，并把结果回写 ADR-0058 Acceptance 段。
- **defer-0026 / defer-0004**：两者均报 SATISFIED，需人工三选一（activate / re-defer+更新 rationale / close）。

**`.githooks/*` 结论（原先的“没用就删”判断不成立）：**

该目录是 `core.hooksPath` 指向的活钩子面（package.json `prepare`），受 ADR-0011 §3 / ADR-0034 D7 治理，**不是垃圾**：

- 磁盘上的 `.githooks/pre-commit`（558 B，sha256 `c5245c73…`）与 `HEAD:.githooks/pre-commit-user` **逐字节相同**，即 jiahao 自己的钩子（跑 `scripts/check-drift.js` + ADR-0036 D5 warn-only 语料新鲜度）。
- GitButler 曾把它降级为 `pre-commit-user` 并占据 `pre-commit`；当前磁盘态是**去 GitButler 化后的正确终态**（真钩子回到 `pre-commit`，wrapper 与 managed `post-checkout` 已移除）。
- 因此正确动作是**提交**（commit `d148bc4`），而非删除；已验证真钩子确实在每个提交上执行（提交 744cf94 / d148bc4 时均输出 `All adapter files in sync`）。

---

## 10. 执行轮二次审计（2026-09-12 02:14）— F7 执行结果与 P0 新发现

### 10.1 F7 执行结果：阻塞，未能执行

- `gh` 可用：v2.89.0，账号 `Xxx91n`，token scopes 含 `repo`/`workflow`。
- 但**分支保护 / Ruleset 在本仓库平台不可用**：
  - `gh api repos/Xxx91n/jiahao/branches/main/protection` → HTTP 403 `Upgrade to GitHub Pro or make this repository public to enable this feature.`
  - `gh api repos/Xxx91n/jiahao/rulesets` → 同一 403。
  - 仓库属性：`private: true`；`permissions.admin: true`（有管理员权限，但平台功能不提供）。
- 结论：ADR-0058 D-004/D-007 的「summary 作为唯一 required check」**在本仓库当前套餐（私有 + 免费）下无法部署**。F7 无法执行；且**即使可执行也应暂缓**（见 10.2：summary 当前为红，启用 required check 会阻断全部合并）。
- 已按协议处理：D-004、D-007 标记 `revised`（原记录保留），新增 D-011 呈报待拍板。

### 10.2 P0 新发现：本轮引入的 CI 回归（test job 永久红）

- CI run `34631502524`（push `d148bc4`）：三 job 全红 —— `gate-all` ✗ / `test` ✗ / `summary` ✗。其中 summary 正确聚合 `results="failure failure"` 为红，**反向验证了 D-002 A-hardened 在生产可用**。
- **`test` job 的红是本轮新引入的**：`node scripts/run-test-gate.js --expected-suites 49` 崩溃：

  ```
  Error: gate "test" missing from docs/gates.json (ADR-0034 D1)
      at loadEntry (src/shared/capability.js:76)
      at requireCapabilities (src/shared/capability.js:101)
      at scripts/run-test-gate.js:16
  ```

  根因：D-006 把 test gate 从 gates.json 物理移除，但 `run-test-gate.js:16` 的 `requireCapabilities('test')` 仍按 ADR-0040 D1 从 gates.json 查该条目 → 抛错。**已本地复现**（`node scripts/run-test-gate.js --expected-suites 49` → 同报错，exit 1）。
  放大原因：该 wrapper 现在**只在 CI test job 运行**（本地 `npm test` 直跑 jest；`gate:all` 已不含 test gate），因此本地验收全绿而 CI 红——正是本轮设计的盲区。
- `gate-all` 的红为**既存**，非本轮引入：`[145 corpus-leak] FAIL` / `[165 corpus-freshness] FAIL` / `[175 mr-probes] FAIL`（CI 模式下这三道 corpus 门禁实际运行并失败）；改轮前的 run `34566040338` 同样红；12/12 历史运行全红。
- 处置：新增 D-013 呈报（ADR-0040 D1 规定能力声明变更须由 ADR 逐字命名，故**不得自行修复**）。

### 10.3 审计自身的覆盖缺口（自我呈报）

本次审计**没有验证真实 CI 通道**：我把 compile / package / start-alive 全部映射到本地命令，接受了报告 §4 的「gate/test 闭环即绿」映射，从未查询 `gh run`。这与我所判定的 **F5（把可验证项声明为不可验证）属同一类缺陷**：验收覆盖面被单方削减而未声明边界。

教训（结构性，非「要求主体诚实」）：验收清单必须为每项标注**验证通道**（本地 / CI），并声明审计的验证边界。此条作为 D-012 的根因证据之一。
