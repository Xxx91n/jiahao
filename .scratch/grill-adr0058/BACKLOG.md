# Backlog — ADR-0058 轮次收口（2026-09-12）

> 呈报给你决定是否立票。每条含：影响、证据、阻塞关系、建议动作。
> 本文件**不自行立票**，仅汇总。

## P0 — 阻塞 CI 变绿（非代码）

**BL-1 `JIAHAO_BENCH_CORPUS_B64` 陈旧，CI 永远不可能绿**
- 影响：`gate-all` 的 corpus 门永久 fail-closed；`gh run list` **12/12 全红**（最早 2026-08-30，早于本 ADR）；
  required-check（D-011）无法在不可变绿的通道上定夺。
- 证据：CI 日志 `[config]: [corpus] missing mr-probes.jsonl - JIAHAO_CORPUS_DIR=.../bench-corpus has no such file`；
  本地 `private/bench-corpus/mr-probes.jsonl` 存在；ADR-0058 R10/R13。
- 阻塞：需 GitHub secret 写权限（人工）。B7 的诊断已就位，下一轮 CI 将自解释。
- 建议动作：重建 secret（含 `mr-probes.jsonl`）或修正恢复步；修后跑一次 `gh run list` 确认 `summary = success`。

## P1 — 需你拍板的决策

**BL-2 D-011 required-check 载体三选一**（ADR-0058 D-G 的前提取决于它）
- (i) 保硬：升级 GitHub Pro / 转公开 / 自托管（GitLab CE、Gitea 的分支保护免费）；
- (ii) 显式降级为软门（约定层），**必须写明代价**，不得与 required check 等价表述；
- (iii) close（前提永不可能发生）。
- 关联：ADR-0058 D-G 散文「Branch protection configures ONLY `summary` as required check」在本平台**不可实施**（403）。

**BL-3 D-010 defer-0026 重推迟 + 条件升级为健康谓词**（`defer-0026` 现 status=deferred）。

**BL-4 D-012 F5 CAPA + 验证通道结构性政策**（报告已部分采用「验证通道」列）。

**BL-5 D-004 / D-007 的 `revised` 是否认可**（前提被实测证伪：私有免费仓无分支保护）。

**BL-6 defer-0004 / defer-0026 人工三选一**（check-deferred 均报 SUGGEST；不得自动激活）。

## P2 — 下一文档轮（主方向，D-001 已定）

**BL-7 决策规则变更管理政策** — ADR-0049 leftover：`docs/decision-rule-0049.md` 治理缺口
（版本锚 0049.1、无变更权限人）。硬约束（账本 D-001）：治理政策必须有**机器可验证的存在性断言**；
`always()` 三类误用必须避开。

## P2 — 工程卫生

**BL-8 打包余量仅 57 字节**（ADR-0039 D3）：下一个打包面文件新增即打破 `npm test`。
- 注意：`CONTEXT.md` 与 `README.md` 在打包面，`docs/adr/` 不在。建议单开一轮做打包预算重构。

**BL-9 `bench/polygraph/results/` 工作区 CRLF（历史卫生）**：提交 blob 始终 LF（`git ls-files --eol` 全 `i/lf w/lf`），
但历史上工作区曾出现 CRLF 检出产物。若再出现，用 `but discard` 归一化（不得用 git checkout）。

**BL-10 GitButler 簿记清理**：`gb-local/*` 有 **33 个已完全合并**的 ref（历史遗留）；
`gitbutler/target` 陈旧（`8a3a6dc`）；工作区尚存一个 no-op 分支 `g0`（`fix(git): ignore test-artifacts/`，`(no changes)`）。
- 风险：属于 GitButler 内部簿记 / 其它 agent 的工作，**本轮未动**（不触碰他人未提交工作）。

**BL-11 两个未合并远程分支**：`origin/codex/adr0055-stale-flake-fix`（↑1）、`origin/codex/test-artifacts-ignore`（↑1）。
非本轮产物，未处理。

## 已在本轮关闭（登记备查）

- **reports/ 无时序索引** → 已建 `reports/README.md`。
- **ADR-0058 `## Acceptance` 不完整** → 已补齐至 12 项（含 wrapper / CI 通道 / start-alive / required-check 状态）。
- **implemented 决策只存在于 gitignored 账本** → 已沉淀进 ADR-0058 `## Implementation status`。
