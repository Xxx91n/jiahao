# Handoff — ADR-0058 轮次收口（closing round）→ 下一轮

- 日期：2026-09-12
- 产出窗口：收口编排（cross-check → verify-build → 三层一致 → 账本结算 → 合并推送 → backlog）
- 结论：**本轮收口完成；分支已合并入 main 并推送。**
- 归档位置：本文件与全部工作底稿随 `.scratch/grill-adr0058/` 归档（gitignored，不入库）

> 本 handoff **不重复**其他产物已写内容，一律按路径引用。

---

## 1. 当前仓库状态（权威）

| 项 | 值 |
|----|----|
| `main` = `origin/main` | **`62046da`**（已推送） |
| 本轮合并 | `d148bc4..62046da` fast-forward，11 文件 |
| 工作树 | 干净；`but` 可用 |
| 测试 | **49 suites / 671 tests** |
| pack | 199,943 字节 / **余量 57**（cap 200,000，ADR-0039 D3） |
| 本轮分支 | `codex/adr0058-repair` 已由 `but pull` 整合移除；`codex/adr0058-impl` 已安全删除 |
| CI | **仍 12/12 全红**（既存语料密钥问题，非本轮回归） |

**验收证据**：`.scratch/grill-adr0058/evidence/2026-09-12-verify-build.log`（含合并前 + 合并后两轮，命令 + 退出码 + 输出摘要）。

---

## 2. 本轮收口做了什么（只列结论，细节看产物）

1. **交叉核对**：README ↔ 实际**全一致**（58 ADR / 58 索引行 / 671 测试 / 49 套件 / 21 门禁 / 21 deferred）。
   真问题两个：`reports/` 无时序索引（7 份报告 3 种结论读起来矛盾）；4 份报告 + 1 份 handoff 的分支状态声明已过期。
   → 已建 `reports/README.md`（时序索引 + 过期声明登记，不改写原文）。
2. **verify-build 留证**：11 项闭环命令全 exit 0 + start-alive（MCP 4 响应且存活），已落证据日志。
3. **三层一致**：CONTEXT.md 的 4 个 ADR-0058 词条（Success-Only Aggregator / Two-Layer Entrypoint /
   Retired Order Slot / Symmetric Tier Contract）与代码/ADR 一致；发现两处真实漂移：
   ADR-0058 `## Acceptance` 不完整；ADR-0058 D-G 的 required-check 散文在本平台不可实施。
4. **账本结算**：`decision-ledger.md` 追加结算表（D-001…D-013 → implemented/deferred/stale）
   + 发现项登记表（A/B/R 三类），原记录未改；implemented 决策摘要已沉淀进 ADR-0058 新增的
   `## Implementation status (2026-09-12 closing round)` 章节。
5. **合并推送**：`but pull` → fast-forward → push → 清除已合并分支（详见 §1）。
6. **Backlog**：`.scratch/grill-adr0058/BACKLOG.md`（BL-1…BL-11，待你决定是否立票）。

---

## 3. 下一轮开工只需读三个文件

1. `.scratch/grill-adr0058/BACKLOG.md` — 遗留事项与优先级
2. `.scratch/grill-adr0058/decision-ledger.md` — 末页「结算表」+「发现项登记表」
3. `docs/adr/0058-*.md` — 含 R1-R16 与 Implementation status（入库的事实源）

（`reports/README.md` 提供报告时序；单个报告仅在需要溯源时读。）

---

## 4. 下一个 grill 方向指示

**主方向（账本 D-001 已定，未被本轮改动）：决策规则变更管理政策**
- 起点：`docs/decision-rule-0049.md` 的治理缺口（版本锚 0049.1、无变更权限人）。
- 两条硬约束（账本 D-001）：治理政策必须有**机器可验证的存在性断言**；`always()` 三类误用必须避开。

**但顺序上有两个前置项**（见 BACKLOG）：
1. **BL-1**（secret）—— CI 不变绿，任何“机器可验证”的断言都无法真实验收；
2. **BL-2（D-011）** —— required-check 载体三选一；它直接决定治理政策能不能落地强制层。

**建议轮次结构**：先 `$grilling` 出前沿问题 → 结论落 `decision-ledger.md` → 再 `$to-spec` / `$to-tickets`。

---

## 5. Standing rules（沿用，已含本轮新增）

- gates.json 改动必须与其 ADR 同提交（ADR-0027 耦合护栏）。
- 批处理 shell = bash；文件编辑走 ctx（Node fs）；写后验 BOM/LF。
- 永不提交 bench/probe/run 残留；private corpus 不入 clone（ADR-0038 D2）。
- 不触碰其他 agent 未提交的工作（`.githooks/*`、`.gitignore`、`bench/polygraph/results/*`、`mr-artifacts/*`）——除非明确授权。
- 文档轮产物先提交，再开实现轮；**新增机制必须同步 CONTEXT.md 词表**。
- 验收清单每项必须标注**验证通道**（本地 / CI）；**CI 通道为强制项**。
- 打包余量仅 **57 字节**：下一个打包面文件新增即打破 `npm test`。
- **【工具链】** ctx 沙箱默认 JS 运行时是 **bun**；`spawnSync(process.execPath, ...)` 在沙箱内会跑到 bun 上并产生**失真结果**。
  审计/验证脚本必须用托管 node 绝对路径 `C:/Users/Administrator/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe` + 脚本文件；
  但 **jest 测试文件内部**用 `process.execPath` 是正确的（它在真 node 下跑）。
- **【Windows】** 原生 `tar` 无法处理盘符路径（`C:` 被当远程主机）；模拟 Linux CI 脚本时用相对路径。
- **【but】** `but` 无「合并分支到 main」原语：落 main 需 `git switch main` + `git merge --ff-only` + `git push`（
  同 R7 已披露的偏离类）；分支整合用 `but pull`（它会自动移除已整合的分支）。

---

## 6. Suggested skills

| Skill | 何时用 |
|-------|--------|
| `grill/productivity/grilling` | 下一文档轮的前沿提问（决策规则治理） |
| `grill/engineering/to-spec` | 治理政策成型后转规格 |
| `grill/engineering/to-tickets` | 规格转票（含本 BACKLOG 的立票） |
| `grill/engineering/code-review` | 任何修复轮后的双轴复审 |
| `grill/engineering/implement` | 实施轮（内含 tdd 驱动） |
| `gitbutler`（`but`） | 分支/提交/整合；注意 §5 的 but 限制 |
| `atomcode-research` | 需工业界取证时（**串行，一次一轮**） |
| `grill/productivity/handoff` | 每轮收尾 |

---

## 7. 敏感信息

无密钥 / 凭据 / PII 写入本文档。本窗口**未读取也未记录** `JIAHAO_BENCH_CORPUS_B64` 的内容；
仅引用其存在性与 CI 报错文本。
