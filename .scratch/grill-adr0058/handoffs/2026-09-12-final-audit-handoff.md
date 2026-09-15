# Handoff — ADR-0058 最终审计轮（**打回返工**，非完成交接）

- 日期：2026-09-12
- 产出窗口：审计 Agent（职责分离：只出报告，不动手修）
- **审计结论：❌ 不通过（阻塞）** —— 故本文件是「打回修复窗口」的返工交接，不是完成交接
- 最终审计报告：`.scratch/grill-adr0058/reports/2026-09-12-final-audit.md`
- 任务书（本轮审计对象）：`.scratch/grill-adr0058/handoffs/next-round.md`
- 被审自述：`.scratch/grill-adr0058/reports/2026-09-12-report.md`
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001…D-013）
- 上一轮交接：`.scratch/grill-adr0058/handoffs/2026-09-12-audit-handoff.md`

---

## 1. 当前仓库状态（一句话）

`main` = `origin/main` = `d148bc4`（已推送）；本地 HEAD = `gitbutler/workspace`（`fa94e63`，仅本地）；工作树干净（除未跟踪的 `mr-artifacts/`）；`but` 可用（`but setup` + `but pull` 已做过）。

**审阅端点固定为 `d148bc4`；不要用 `HEAD`**（HEAD 带有 GitButler 账目提交 `da14113`/`fa94e63`）。

---

## 2. 阻塞项（修完才能重审）

| 编号 | 位置 | 修复要求 |
|------|------|----------|
| **A1** | `scripts/run-test-gate.js:16` | `requireCapabilities('test')` 在 test gate 已被移出 gates.json 后必抛错。需 ADR-0040 D1 意义上的 ADR-gated 修复：改为按 test job 真实能力声明，或由 ADR 逐字命名新能力；**必须同变更补 wiring test 断言** |
| **A2** | GitHub 仓库 secret `JIAHAO_BENCH_CORPUS_B64` | CI 恢复的语料缺 `mr-probes.jsonl`（CI 日志：`[config]: [corpus] missing mr-probes.jsonl`）→ gate-all 三道 corpus 门永久红。需更新密钥或修正恢复步骤。**需 GitHub secret 写权限（人工）** |
| **A3** | `.github/workflows/ci.yml` summary job | 成功-only 循环遇空结果串零迭代→假绿（实测 `results=""` → GREEN），与 ADR-0058 D-B “unknown → red” 矛盾。应断言“result 个数 == needs 个数” |
| **A4** | `docs/adr/0057-*.md` Context 段 | 仍写 “Jest suites **currently** execute inside gate:all as the `test` gate (gates.json order 100)”，现行时态失实（违反 ADR-0043） |
| **A5** | `.gitignore` | `mr-artifacts/`（mr-probes 门输出目录）未收录，其三个兄弟目录均在内 |
| **A6** | `bench/polygraph/results/` | 9 个跟踪文件含 CRLF，与 `.gitattributes` 不符（**既存，不归本轮**） |

**重跑清单（逐条，不得抽样）：**

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
node scripts/run-test-gate.js --expected-suites 49 # 当前 exit 1 -> 修复后须 exit 0
# start-alive: node jiahao-mcp/index.js + MCP 握手 -> 4 响应且进程存活
# CI 通道（强制）：gh run list / gh api .../check-runs -> summary = success
```

---

## 3. 待你拍板（审计窗口不替你追认）

1. **D-004 / D-007 的 `revised`** 是否认可？（平台证伪：私有免费仓库无分支保护/Ruleset，403）
2. **D-010 / D-011 / D-012 / D-013** 四个 `proposed` 如何定？（详见账本）
3. **A1** 由谁修（打回修复窗口 / 你批准后我修）？方案选 (i) 改 capability 声明 还是 (ii) 新能力名？
4. **A2** 密钥更新由你操作（需 secret 写权限）还是另有方案？
5. **P2**（自述不实，含把 CI 红说成绿）是否问责修复子代理？**P3**（审计自身首轮漏判 CI）如何计入？
6. **A5 / A6** 纳入本轮修复还是另开 hygiene 轮？

---

## 4. 下一个 grill 方向指示

**主方向不变（账本 D-001 已定）：决策规则变更管理政策** —— ADR-0049 leftover，`docs/decision-rule-0049.md` 治理缺口（版本锚 0049.1、无变更权限人）。这是 D-001 串行排序中排在 defer-0026 之后的那一轮。

但**顺序上新增两个前置项**：

1. **先：A1/A2/A3 修复轮**（阻塞 CI 绿；修完必须重跑第 2 节同一套验收）。
2. **再：D-011（required-check 载体三选一）** —— 因为 CI 能否绿、能否强制，直接决定了治理政策的“机器可验证存在性断言”能不能落地。
3. **然后：主方向（决策规则变更管理政策）**。
4. **并行可做**：D-010（defer-0026 条件升级为健康谓词）、D-012（F5 CAPA + 验收清单标注验证通道）。

**建议 grill 轮次结构**：先跑 `$grilling` 对“决策规则变更管理政策”出前沿问题（账本 D-001 已给两条硬约束：治理政策必须有机器可验证的存在性断言；always() 三类误用必须避开）；结论落 `decision-ledger.md` 后再进 `$to-spec`。

---

## 5. Standing rules（沿用）

- gates.json 改动必须与其 ADR 同提交（ADR-0027 耦合护栏）。
- 批处理 shell = bash；文件编辑走 ctx（Node fs）；写后验 BOM/LF。
- 永不提交 bench/probe/run 残留；private corpus 不入 clone（ADR-0038 D2）。
- push 仅在实施轮终审通过后执行。
- 不触碰其他 agent 未提交的工作（`.githooks/*`、`.gitignore`、`bench/polygraph/results/*`、`mr-artifacts/*`）——除非用户明确授权（本次 `d148bc4` 即属此类）。
- 文档轮产物先提交，再开实现轮。
- ADR-0039 D3 打包预算余量仅 **215 字节**：下一个打包面文件新增即会打破 `npm test`。
- **新增**：验收清单每项必须标注**验证通道**（本地 / CI）；CI 通道为强制项（本轮教训）。

---

## 6. Suggested skills

- `grill/productivity/grilling` — 下一文档轮前沿提问（决策规则治理）
- `grill/engineering/code-review` — 修复轮后的双轴复审
- `grill/engineering/to-spec` / `to-tickets` — 治理政策成型后
- `gitbutler`（`but`）— 已可用（`but setup` + `but pull` 已完成）
- `atomcode-research` — 如需新的工业界取证（串行，一次一轮）
- `grill/productivity/handoff` — 下一轮收尾

---

## 7. 敏感信息

无密钥/凭据/PII 写入本文档。本审计未读取也未记录 `JIAHAO_BENCH_CORPUS_B64` 的内容。所有证据可由最终审计报告 §1/§2 的命令重建。
