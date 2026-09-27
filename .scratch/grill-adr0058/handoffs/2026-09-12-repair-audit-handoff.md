# Handoff — ADR-0058 返修轮审计 → 下一轮

- 日期：2026-09-12
- 产出窗口：审计 Agent（职责分离：只出报告，不动手修）
- **审计结论：✅⚠️ 有条件通过**（功能面通过；文档面需一次小修补）
- 审计报告：`.scratch/grill-adr0058/reports/2026-09-12-repair-audit.md`
- 被审自述：`.scratch/grill-adr0058/reports/2026-09-12-repair-report.md`
- 返工任务书（上轮）：`.scratch/grill-adr0058/handoffs/2026-09-12-final-audit-handoff.md`
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001…D-013）

---

## 1. 当前仓库状态（一句话）

`main` = `origin/main` = `d148bc4`（已推送）；返修提交 **`codex/adr0058-repair` @ `84e621f`**（父 `d148bc4`，领先 1 提交，**未 push**）；本地 HEAD = `gitbutler/workspace`（`8e2411c`），其树与 `84e621f` **逐字节一致**；工作树 CLEAN；`but` 可用。

**审阅端点用 `84e621f`，不要用 `HEAD`**（HEAD 是 GitButler 工作区提交，含 `da14113`/`8e2411c` 两个树中性账目提交）。

---

## 2. 已闭合（可复现）

| 项 | 证据 |
|----|------|
| A1（D-013） | `run-test-gate.js:17` `requireCapabilities(['repo-tree'])`；wrapper **exit 0**（`[test] OK: 49 suites, 669 tests`）；第 2 轮为 exit 1 |
| A3（D-002） | summary 加 `seen == expected` 计数守卫；**我原样抽取脚本重跑 9 组输入**：空/空白/只 1 个/3 个 → 均 exit 1；仅 `success success` → exit 0 |
| A4 | `docs/adr/0057` Context 改过去时 + 独立 CI test job |
| A5 | `.gitignore:34` `mr-artifacts/` |
| A6 | **前提证伪**：`d148bc4` blob 全 CR=0，`git ls-files --eol` 全 `i/lf w/lf`，全仓跟踪 CR 扫描=0 |
| 本地硬验收 | 11/11 通过（jest 49/669、gate:all 0（4 UNVERIFIABLE）、CI 模式 0 unverifiable、drift OK、pack 199824/余量176、compile 三查 0、`git diff --check` 干净、start-alive 4 响应且存活、8/8 无 BOM/LF） |

---

## 3. push 前需做（建议同一分支追加一次 doc-fix 提交，不 amend）

| 项 | 位置 | 修复要求 |
|----|------|----------|
| **B1** | `src/shared/capability.js` | 内联数组使 `gate=` 属性可含逗号（实测 `gate=repo-tree,docs-adr,requires=docs-adr`），击穿 ADR-0041 D5 协议，且与 `:81-84` 自述不变量矛盾。加长度/字符集守卫或额外转义；补**多元素负例**；修正自述措辞 |
| **B3** | `test/adr-0058-wiring.test.js` + `docs/adr/0058` | R 编号命名空间冲突：测试标 R10=A4、R11=A5，而 ADR-0058 的 R10=A2、**无 R11**；A4/A5 在 ADR 中无 R 记录。统一编号（建议 ADR 补 R11=A4、R12=A5） |
| **B4** | `CONTEXT.md:1186-1192` | Gate Capability Declaration 词条未同步内联声明通道；`_Avoid_` 措辞需复核（AGENTS.md 工作约定要求词表同步） |
| **B2** | `docs/adr/0041` D2 或 `docs/adr/0058` R8 | 注册表外工具脚本（`run-test-gate.js`）新获 exit 2 路径，而 D2 明文 exit 2 「binds ONLY gates registered in docs/gates.json」。二选一：加 inline 修订块，或声明该 wrapper 无 exit-code promise |
| **B5** | `test/adr-0058-wiring.test.js:127,162` | 收紧弱断言（单引号形式；`seen=` 命中初始化而非守卫） |
| **B6** | 返修报告 §1 | 移除「覆盖 D-012」（未拍板） |
| **B7** | `.github/workflows/ci.yml` 恢复步 | A2 只走环境分支；至少加代码侧诊断（`ls -R "$RUNNER_TEMP"` / 核对 tar 顶层目录），据实判定「secret 陈旧」vs「恢复步路径错」 |

**重跑清单（逐条，含 CI 通道）：**

```
node node_modules/jest/bin/jest.js                 # 49 suites / 669 tests, exit 0
node scripts/run-test-gate.js --expected-suites 49 # exit 0, "[test] OK: 49 suites, 669 tests"
npm run gate:all                                   # exit 0, 4 UNVERIFIABLE
GITHUB_ACTIONS=true CI=true npm run gate:all       # exit 0, 0 unverifiable
npm run corpus:drift                               # fingerprints OK
npm pack --dry-run --json                          # size < 200000 (余量仅 176 B)
node scripts/build-adapters.js --check             # 23 adapter 一致
node scripts/instrument.js --check                 # identity pinned
node scripts/build-adr-index.js --check            # in sync
git diff --check                                   # 无输出
node scripts/check-ci-jobs.js                      # exit 0 SATISFIED
node scripts/check-deferred.js                     # exit 0, 21 entries
# start-alive: node jiahao-mcp/index.js + MCP 握手 -> 4 响应且进程存活
# CI 通道（强制）：gh run list / gh api .../check-runs -> summary = success
```

---

## 4. 待你拍板（审计窗口不替你追认）

1. **B1/B2/B3/B4/B5** 本轮一并修还是拆独立 hygiene 轮？（均小改动）
2. **A2/B7**：secret 更新（需 GitHub secret 写权限）由你操作？代码侧诊断由谁做？
3. **D-004/D-007 的 `revised`** 是否认可？**D-010/D-011/D-012/D-013** 四个 `proposed` 如何定？（D-013 功能面已实现，但 B1/B2 显示载体仍需一次契约澄清）
4. **Q1-Q3**（ADR 文档不实、报告覆盖夸大、强制 CI 通道未满足未标阻塞）是否问责返修子代理？
5. 打包余量仅 **176 B**：是否本轮一并处理？

---

## 5. 下一个 grill 方向指示

**主方向不变（账本 D-001 已定）：决策规则变更管理政策** —— ADR-0049 leftover，`docs/decision-rule-0049.md` 治理缺口（版本锚 0049.1、无变更权限人）。

顺序上仍有两个前置项：

1. **先：B1-B7 doc-fix 轮**（push 前；修完必须重跑第 3 节同一套验收）。
2. **再：D-011（required-check 载体三选一）** —— 因 CI 当前永不可能绿（B7），该项不应在无法变绿的通道上定夺。
3. **然后：主方向（决策规则变更管理政策）**。
4. **并行可做**：D-010（defer-0026 条件升级为健康谓词）、D-012（F5 CAPA + 验收清单标注验证通道——本轮报告已自标通道，算部分落地）。

**建议轮次结构**：先跑 `$grilling` 对「决策规则变更管理政策」出前沿问题（账本 D-001 两条硬约束：治理政策必须有机器可验证的存在性断言；always() 三类误用必须避开）；结论落 `decision-ledger.md` 后再进 `$to-spec`。

---

## 6. Standing rules（沿用 + 本轮新增）

- gates.json 改动必须与其 ADR 同提交（ADR-0027 耦合护栏）。
- 批处理 shell = bash；文件编辑走 ctx（Node fs）；写后验 BOM/LF。
- 永不提交 bench/probe/run 残留；private corpus 不入 clone（ADR-0038 D2）。
- push 仅在实施轮终审通过后执行。
- 不触碰其他 agent 未提交的工作（`.githooks/*`、`.gitignore`、`bench/polygraph/results/*`、`mr-artifacts/*`）——除非用户明确授权。
- 文档轮产物先提交，再开实现轮；**新增机制必须同步 CONTEXT.md 词表**（本轮 B4 即漏此项）。
- ADR-0039 D3 打包余量仅 **176 字节**：下一个打包面文件新增即打破 `npm test`。
- 验收清单每项必须标注**验证通道**（本地 / CI）；CI 通道为强制项。
- **【新增】工具链**：ctx 沙箱默认 JS 运行时是 **bun**；`spawnSync(process.execPath, ['-e', ...])` 会跑到 bun 上并产生**失真结果**（exit 0 且无输出）。审计/验证脚本必须用**托管 node 22.22.2 绝对路径**（`C:/Users/Administrator/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe`）+ 脚本文件，不得用 `process.execPath`。

---

## 7. Suggested skills

- `grill/engineering/code-review` — doc-fix 轮后的双轴复审
- `grill/productivity/grilling` — 下一文档轮前沿提问（决策规则治理）
- `grill/engineering/to-spec` / `to-tickets` — 治理政策成型后
- `gitbutler`（`but`）— 已可用
- `atomcode-research` — 如需新的工业界取证（串行，一次一轮）
- `grill/productivity/handoff` — 下一轮收尾

---

## 8. 敏感信息

无密钥/凭据/PII 写入本文档。本审计未读取也未记录 `JIAHAO_BENCH_CORPUS_B64` 的内容。所有证据可由审计报告 §1/§2/§3 的命令重建。
