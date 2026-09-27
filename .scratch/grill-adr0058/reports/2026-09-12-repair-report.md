# ADR-0058 审计返修轮 — 交付报告（返修修复子 Agent）

- 日期：2026-09-12
- 身份：返修修复子 Agent
- 常驻任务书：`.scratch/grill-adr0058/reports/2026-09-12-final-audit.md`（最终审计）
- 返工交接：`.scratch/grill-adr0058/handoffs/2026-09-12-final-audit-handoff.md`
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001…D-013）
- 分支/提交：**`codex/adr0058-repair` @ `84e621f`**（父 `d148bc4` = `origin/main`；领先 1 个提交；**未 push**）
- 覆盖：**D-013 / D-002 / D-006 / D-007**（见 §2）
> 更正（2026-09-12 返修审计 B6）：D-012 为未拍板的 proposed 决策，不属本轮覆盖。
- 状态：**A1 / A3 / A4 / A5 已修复并复验；A2 为环境·密钥硬闸门（人工）；A6 前提被实测证伪**

环境：Windows 11 / Git Bash / node v22.22.2 / npm 10.9.7 / but 0.22.3 / git 2.55.0.windows.2 / gh 2.89.0（账号 Xxx91n）。
每条声明附可复跑命令 + 输出摘要。

---

## 1. 本轮改动（提交 `84e621f`，8 文件）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `scripts/run-test-gate.js` | A1：`requireCapabilities('test')` -> `requireCapabilities(['repo-tree'])`；头注释 “the test gate” -> “the CI test job” |
| 2 | `src/shared/capability.js` | A1：`requireCapabilities` 兼容“注册表名（字符串）/ 内联数组”两种声明形式 |
| 3 | `.github/workflows/ci.yml` | A3：summary 聚合增加“seen == expected”计数断言 |
| 4 | `docs/adr/0057-…md` | A4：Context 现行时态失实改写（过去时 + 独立 CI test job） |
| 5 | `docs/adr/0058-…md` | 新增 `## Repair notes (audit-repair round)`：R8（A1）、R9（A3）、R10（A2 环境） |
| 6 | `.gitignore` | A5：新增 `mr-artifacts/` |
| 7 | `test/adr-0058-wiring.test.js` | 新增 9 条断言（R8×5 / R9×2 / R10×1 / R11×1），总数 14 -> 23 |
| 8 | `README.md` | 测试计数 660 -> 669（套件数不变；字节中性） |

未触碰：`.githooks/*`、`docs/gates.json`、`docs/deferred-registry.json`、`CONTEXT.md`、`bench/polygraph/results/*`（A6 见 §2.6）。

---

## 2. 阻塞项逐条处置

### 2.1 A1（P0 / D-013）— 已修复（ADR-gated）

根因：`run-test-gate.js` 调 `requireCapabilities('test')`，该调用按 ADR-0040 D1 从 `docs/gates.json` 查 gate 条目；ADR-0058 D-F 已把 test gate 物理删除，于是必抛错。

修复前实测（命令 + 输出）：

```
$ node scripts/run-test-gate.js --expected-suites 49
Error: gate "test" missing from docs/gates.json (ADR-0034 D1)
exit=1
```

修复后实测（**这是 CI test job 逐字调用的同一条命令**）：

```
$ node scripts/run-test-gate.js --expected-suites 49
Test Suites: 49 passed, 49 total
Tests:       669 passed, 669 total
[test] OK: 49 suites, 669 tests, 0 skipped (ADR-0057 D-C)
exit=0
```

方案：采用审计 D-013 推荐 (i)。无注册表条目的消费者**在调用点内联声明能力**：`requireCapabilities(['repo-tree'])`；`repo-tree` 在 ADR-0040 D1 的 CLOSED 枚举内，**未新增能力名**；public tier（D-H）意味着**不得**声明 `bench-corpus`。ADR-0058 新增 R8 逐字记录该机制与能力名（满足 ADR-0040 D1 的 ADR-gated 要求）。

回归锁（`test/adr-0058-wiring.test.js`，5 条）：wrapper 不再出现 `requireCapabilities('test')`；内联声明存在且每个名字都在 CLOSED 枚举内；不声明 `bench-corpus`；数组形式两端行为（存在 -> exit 0；缺失 -> exit 2 且带 `::error title=UNVERIFIABLE`）；未知名字仍是注册表违规（exit 1，绝不变 exit 2）。

### 2.2 A2（P0 / 阻塞 CI 绿）— 代码不可修，环境·密钥硬闸门（未尝试）

实测：

```
$ gh run list --limit 15
12/12 failure；最早一条为 2026-08-30（ADR-0034 audit fix），即 CI 自 2026-08-30 起从未绿过
```

CI 日志（gate-all job）：`[config]: [corpus] missing mr-probes.jsonl - JIAHAO_CORPUS_DIR=/home/runner/work/_temp/bench-corpus has no such file`。
本地对照：`private/bench-corpus/mr-probes.jsonl` 存在（12,502 字节，sha256 `57473da6…`，与 `bench/polygraph/thresholds.json` 的 `private_corpus` 锚点一致）。

处置：**未做任何修改**。该文件无法由代码凭空生成；重建 `JIAHAO_BENCH_CORPUS_B64` 需仓库管理员权限（secret 写入 = WORKFLOW §4.2.x 的“外部凭据动作”硬闸门）。已逐字记入 ADR-0058 **R10**，以免把 CI 通道的红误判为本轮回归。

### 2.3 A3（中 / D-002）— 已修复

修复：从 `ci.yml` **原样抽取** summary 的真实脚本，在 `bash -e` 下注入 `needs.*.result` 组合执行（不是另写一段等价逻辑）：

| 注入的 needs 结果 | 修复前 | 修复后 exit | 修复后判定行 |
|---|---|---|---|
| 空 / 空（unknown·blank 展开） | **GREEN（假绿）** | 1 | `aggregate red - saw 0 results, expected 2` |
| failure / failure | 1 | 1 | `needed job result failure is not success` |
| skipped / success | 1 | 1 | `needed job result skipped is not success` |
| cancelled / success | 1 | 1 | `needed job result cancelled is not success` |
| success / success | 0 | 0 | `aggregate green - all 2 needed jobs report success` |
| 空 / success | 1 | 1 | `aggregate red - saw 1 results, expected 2` |

机制：循环计数 `seen`，末尾断言 `seen == expected`（`expected=2` = `needs` 列表长度）；不匹配即红。回归锁 2 条：断言存在计数守卫；断言字面量 `expected` 等于解析出的 needs 长度（防漂移）。ADR-0058 新增 R9。

### 2.4 A4（中）— 已修复

`docs/adr/0057` Context 原文：“Jest suites **currently execute inside gate:all as the `test` gate** (gates.json order 100)”（自 ADR-0058 D-F 后为现行时态失实）。
改写为：“…**executed** inside gate:all as the `test` gate (gates.json order 100) **until ADR-0058 (D-F/D-I) removed the gate and retired the slot; they now run in the independent CI test job**.”
回归锁 1 条：断言不再出现 `currently execute inside gate:all`，且出现 `independent CI test job`。

### 2.5 A5（低）— 已修复

`.gitignore` 在 `# Project-local gate artifacts (ADR-0027 D4 isomorphic evidence)` 段与三个兄弟目录并列新增 `mr-artifacts/`。
实测：`git check-ignore -v mr-artifacts/gate-junit.xml` -> `.gitignore:34:mr-artifacts/`（原先 NOT-IGNORED）。回归锁 1 条。

### 2.6 A6（低）— **前提被实测证伪；无需提交，工作区已用 but 规范化**

审计原文假定 `bench/polygraph/results/` 的 9 个**跟踪文件**含 CRLF。实测证明：**跟踪内容一直是 LF**，CRLF 只存在于工作区（陈旧检出产物）。

证据链：

1. 提交侧（`d148bc4`）：该目录全部 23 个 blob 均为 `CR=0`。例：`git show d148bc4:bench/polygraph/results/metrics-v2-run4.json` -> 7076 字节，CR=0。
2. 工作区侧（修复前）：9 个文件 `CR>0`（例：`metrics-v2-run4.json` 7395 字节，CR=319；`report-v2-run4.md` 2589 字节，CR=42）。
3. 归一化后：对全部 23 个文件，`git hash-object --path <f> <f>` **等于**其 index blob 哈希 -> 内容与提交内容逐字节一致。
4. 但 `but commit`（带 ID 或不带 ID）均报：`Cannot commit: N changes could not be applied / no effective change to commit`，且**未创建分支**（原子失败）。原因是 index 的 stat 缓存仍记录旧尺寸（7395），而 blob 已是 LF（7076）；`git status` 因此显示“已修改”，`git diff` 却为空。
5. 该状态会**阻断下一轮的裸 `but commit`**（已实测），因此不能留在工作区。
6. 处置：`but discard <8 ids>` —— 这是 `but` 对 `git checkout -- <file>` 的**官方映射命令**（Git-to-But Map），非 git 写操作。
   实测结果：`git status --short` -> **CLEAN**；`but status` -> `zz [uncommitted] (no changes)`；工作区文件仍为 LF（CR=0）。
7. 终态：`git ls-files --eol` -> `i/lf  w/lf  attr/text=auto eol=lf`；全仓 CR 扫描 -> **ZERO**。

结论：**A6 不是“跟踪内容违规”，而是工作区陈旧检出产物**；不存在可提交的 hygiene 提交（`but` 已判定“no effective change”）。审计 §7 第 6 项的“独立 hygiene 提交”因此**不成立**，按 ADR-0043 fact-source 纪律在此更正。

---

## 3. 验收复跑（逐项，含**验证通道**）

按 D-012 CAPA：每项标注验证通道；CI 通道为强制项。

| # | 验收项 | 命令 | 通道 | 实测 | 结论 |
|---|--------|------|------|------|------|
| 1 | 测试套件 | `node node_modules/jest/bin/jest.js` | 本地 | 49 suites / 669 tests，exit 0 | 通过 |
| 2 | 门禁（本地） | `npm run gate:all` | 本地 | exit 0；21 entries，4 UNVERIFIABLE（ci-wiring/bench-gate/probes/mr-probes，恰为 ci-mode 组） | 通过 |
| 3 | 门禁（CI 模式） | `GITHUB_ACTIONS=true CI=true npm run gate:all` | 本地（CI 模式） | exit 0；21 entries，0 unverifiable | 通过 |
| 4 | 语料漂移 | `npm run corpus:drift` | 本地 | `[tier-drift] fingerprints: OK`；full 135/0/0，public 131/0/4 | 通过 |
| 5 | 打包 | `npm pack --dry-run --json` | 本地 | size=199824，93 files，cap=200000，headroom=176 | 通过 |
| 6 | compile（workflow） | `require('js-yaml').load(ci.yml)` | 本地 | PARSE OK；jobs=gate-all,test,summary；summary.if="always()"；needs=[gate-all,test]；test.env={JIAHAO_TEST_TIER:public} | 通过 |
| 7 | compile（JS） | `node --check <4 文件>` | 本地 | capability.js / run-test-gate.js / adr-0058-wiring.test.js / check-ci-jobs.js 均 OK | 通过 |
| 8 | 适配器一致性 | `node scripts/build-adapters.js --check` | 本地 | 23 adapter 一致，exit 0 | 通过 |
| 9 | 身份锚 | `node scripts/instrument.js --check` | 本地 | identity pinned and authoritative，exit 0 | 通过 |
| 10 | ADR 索引 | `node scripts/build-adr-index.js --check` | 本地 | README ADR index in sync，exit 0 | 通过 |
| 11 | 行尾洁净 | `git diff --check` | 本地 | exit 0，无输出 | 通过 |
| 12 | 门禁辅助 | `node scripts/check-ci-jobs.js` / `check-deferred.js` | 本地 | SATISFIED exit 0；21 entries exit 0 | 通过 |
| 13 | **A1 修复目标** | `node scripts/run-test-gate.js --expected-suites 49` | 本地（= CI test job 同命令） | exit 0；`[test] OK: 49 suites, 669 tests` | 通过 |
| 14 | **start-alive** | `node jiahao-mcp/index.js` + MCP 握手 | 本地 | initialize / tools/list / tools/call / prompts/list **4 响应**；4s 后**进程存活** | 通过 |
| 15 | **CI 通道（强制）** | `gh run list` / `gh api .../check-runs` | **CI** | **未验证** —— push 被任务书卡在终审之后（本轮未 push），且 A2 未解时 CI 不可能绿 | **未验证** |

用户验收原文映射：“编译通过” -> 第 6/7 项（workflow YAML 解析 + JS 语法 + 三个 --check）；“打包通过” -> 第 5 项；“启动并测活软件进程” -> 第 14 项；“每个平台都要有 test 闭环” -> 第 1/13 项（套件数 wrapper 现在真能跑）+ 第 15 项（CI 通道，待 A2 与 push 授权）。

---

## 4. 复现

```
cd D:/Aworker/jiahao
node node_modules/jest/bin/jest.js                 # 49 suites / 669 tests, exit 0
npm run gate:all                                   # exit 0, 4 UNVERIFIABLE
GITHUB_ACTIONS=true CI=true npm run gate:all       # exit 0, 0 unverifiable
npm run corpus:drift                               # fingerprints OK
npm pack --dry-run --json                          # size 199824 < 200000
node scripts/build-adapters.js --check             # 23 adapter 一致
node scripts/instrument.js --check                 # identity pinned
node scripts/build-adr-index.js --check            # in sync
git diff --check                                   # 无输出
node scripts/check-ci-jobs.js                      # exit 0 SATISFIED
node scripts/check-deferred.js                     # exit 0, 21 entries
node scripts/run-test-gate.js --expected-suites 49 # exit 0, "[test] OK: 49 suites, 669 tests"
node --check src/shared/capability.js scripts/run-test-gate.js   # OK
git status --short                                 # CLEAN
git rev-parse --short codex/adr0058-repair         # 84e621f
```

---

## 5. 版本控制（WORKFLOW §4.2）

- 全部写操作走 `but`：`but commit -b codex/adr0058-repair -m "…" <ids>`、`but discard <ids>`。未使用 `git add/commit/checkout/merge/rebase/stash/cherry-pick`。
- 分支 `codex/adr0058-repair` @ `84e621f`，父 `d148bc4`（= `origin/main`），领先 1 个提交。
- `main` 未被污染：`git rev-parse main` = `d148bc4` = `origin/main`。
- **未 push**：`git ls-remote --heads origin codex/adr0058-repair` 返回空。无 PR、无 merge、无 tag、无 release。
- 未触碰 secret / 外部凭据。
- 提交内容（8 文件）与工作区一致：`git diff HEAD --stat` 无输出。
- 全部写入文件 UTF-8 无 BOM + LF（对提交对象逐字节复验：8/8 `BOM=false CR=0`）。

---

## 6. 偏离与披露（单独呈报，不替你追认）

| 编号 | 内容 | 性质 |
|------|------|------|
| V1 | A6 诊断期使用 `git update-index --refresh`（仅刷新 stat 缓存，不改内容、不 stage）与 `touch`（仅改 mtime） | 不在 `but` 技能 Rule 1 的禁用列表内；已逐字节验证无内容变更 |
| V2 | A6 收尾使用 `but discard`（清除非可提交条目） | `but` 官方命令（`git checkout -- <file>` 的映射），非 git 写操作 |
| V3 | A5（`.gitignore`）与 A6（`bench/polygraph/results/*`）属 Standing rules 列出的“他人未提交工作”范围 | 依审计 §7 第 5/6 项强制要求 + 你的“完整遵循”指令执行；**两项均可一键回退**，如你认为越界请指出 |
| V4 | 未执行 A2 | 硬闸门（外部凭据）；需你操作或另行授权 |
| V5 | CI 通道未验证 | push 被任务书卡在终审之后；本轮不 push |

---

## 7. 遗留风险 / 下一步

1. **A2（阻塞 CI 绿）**：需仓库管理员重建 `JIAHAO_BENCH_CORPUS_B64`（含 `mr-probes.jsonl`）或修正恢复步骤；在此之前 CI 永不可能绿，D-011 的 required-check 载体问题不应在无法变绿的通道上定夺。
2. **打包余量**：ADR-0039 D3 余量由 215 -> **176 字节**（本轮 +38 B）。下一个打包面文件新增即打破 `npm test`；需独立轮次（ADR-0058 R4）。
3. **D-010 / D-011（proposed）**：未拍板、未实现（本轮明确不触碰）。
4. **defer-0004 / defer-0026**：两者均报 SATISFIED（存在性满足，健康性未验证）；等人工三选一 / 下轮解冻。
5. **P1–P4 过程项**：本轮未追认；已按 D-012 在 §3 落地“验收项标注验证通道、CI 通道强制”这一结构性纠正。
6. **CI 通道复跑**：待 A2 解决 + push 授权后，`gh run list` / `gh api .../check-runs` 需确认 `summary = success`。
