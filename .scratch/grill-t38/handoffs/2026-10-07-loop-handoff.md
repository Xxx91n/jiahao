# Handoff — grill-t38 LOOP 复审（2026-10-07）

> 身份：审计 Agent（第二方）LOOP 轮交接。
> 复审结论：**通过（PASS），附 5 项 findings，其中 N1/N2 须在 seal 前收口**；不可 seal 的制约来自 owner 未闭项，不来自实现缺陷。
> 全证据在 `D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-07-loop-reaudit-report.md`。本文件不重复，只给下一个窗口的定位与次序。

## 1. 一句话状态

`D:\Aworker\jiahao` 上 grill-t38 波已成形为线性三 lane 且硬验收可复现；卡在 owner 的四项裁量与两项报告口径修正上，未 push、未 seal。

## 2. 版本状态（别在这里改别人的 lane）

```
0b7bfb68 (origin/main)
  └─ grill-t38-docs   lop → lmo → tvm → lkr → zlq (tip dabf82c2)
      └─ grill-t38-audit  cd757b96 (A1，一审报告+handoff+registry 行)
          └─ grill-t38-impl  lsl → szp → cf7c9be1 (返工 R1, 19f) → 5da26011 (返工 R2, 2f)
              └─ grill-t38-loop  本轮复审报告 + handoff + registry 行（栈顶，新建）
```
`but commit` 到 mid-stack 会重排其上各 lane 的 sha —— 要在链上追加时**永远叠在栈顶**，或先确认无人引用旧 sha。

工作树里属于他人的在制品（勿提交、勿丢弃）：`docs/adr/0094-*.md`、`test/post-land-sentinel.test.js`（现在两者是 **STAGED** `M `，见复审报告 N3）、`.scratch/grill-t23|t27|t28|t36` 残留（`??`）。

## 3. 下一个窗口该做的（按序）

1. **owner 裁四件事**（复审报告 §4）：pack cap 重推导（我独立实测 `size 546,465 / entryCount 185`，`ceil_to_10_000(×1.10)=610,000` 算术成立；**注意本窗口修 run-gates 摘要行后包体再涨约 300 B，签署时以最终 settled 树实测为准**，须同 commit 改 ADR-0039 D3）；post-land 刷新时点；`audit-surface` 红的两条出路（我方 CI 面跑齐后具名贴 v1 块，或立法允许"部分覆盖声明"——**不得由返工窗口代贴审计窗口报告**）；F-5/F-11 `review_at` 偏离 + P1-9 CI `runner_ctx` dirty 位残量是否本轮实现。
2. ~~seal 前收两项口径~~ **本窗口已处置**（详见复审报告 §8）：
   - **N1 已修**：`scripts/run-gates.js` 摘要行改打 `53 legs + 1 guard(s) = 54 rows; N pass / N fail / N unverifiable`。54 的第二总体是 ADR-0093 D-4 的合成守卫行 `- tracked-surface`（`run-gates.js:472-477`）。**我方原判撤回**：返工报告的 `47 PASS` 在含守卫行口径下本就正确，"偏 1"是口径未标注而非错报。
   - **N2 已闭合为非缺陷**：±1 skip 来自 corpus 分层（`resolveCorpus().tier === 'none'` → `skipTest('corpus tier none (ADR-0056 D-A)', …)`，见 `test/adr-0030.test.js:14-15`、`test/adr-0031-wiring.test.js:14-16`）；skip 是受治理的带理由判定（ADR-0057 D-A + `scripts/check-skip-reasons.js`），两种层级下的普查差合法。
3. ~~两项洁癖~~ **撤回（我方误报）**：`pickDerivation` 是 ADR-0096 `:106` 精化句所立的**人工强验证探针**（注释明示其 prefer-HEAD 语义故意不被测试钉住，免退役契约读成现行）；`evidence-freshness.js:58` 的 `WORKSPACE_SUBJECT` 由 `scripts/check-map-freshness.js:128` 经 `fresh.WORKSPACE_SUBJECT` 消费。皆非残留。
4. **一项过程裁量（仍开放，owner）**：返工用了 `git update-index --cacheinfo`（绕开 `but` 的索引写，复审报告 N4）。内容未损坏我已核验；是否追认为合法逃生舱、以及"GitButler 索引惰性写缺口"要不要立案，都是 owner 裁——我只到"三者一致"，未复现工具机制，按未验类记。另 N3（两项范围外文件处于 STAGED，他人在制品）本窗口未动。
5. **本窗口新增的过程事实（下轮别再犯）**：门检运行期间编辑跟踪文件会被 ADR-0093 D-4 守卫如实判红（实测：`leg 208 rewrite-map mutated 1 tracked path(s): .scratch/grill-t38/reports/2026-10-07-loop-reaudit-report.md`）。**E-19 的"declare 前不得身处暴露窗"对审计窗口同样成立**——改完再跑，不要并行。

## 4. Suggested skills for the next session

- `$but` — 一切 VCS 写；本轮返工的教训是**栈方向**（`--above` 目标选错会整条 lane 丢祖先文件并引发多 base 冲突）。
- `grilling` — 单题烤 §3.1 的 audit-surface 与 N4（这两条是立法/裁量题，不是代码题）。
- `domain-modeling` — `CONTEXT.md` 词表已含 Assertion Anchoring；若 owner 裁出"部分覆盖声明"新概念，须同轮入词表 + ADR。
- `code-review` — 若返工窗口再动 `check-status-inventory.js`（棘轮/非后补两面），基准点用 `5da26011`，别再对 `0b7bfb68` 单基跑。
- `neat-freak` — 若 owner 决定收波：本轮知识收尾（trend 行、defer-0092/0093、残留窗首样本都已就位）。

## 5. 下一个 grill 方向（指示）

**Q-t39「处置-证据闭合」** 保持不变，且本轮新增三个可入案活例（比一审更厚）：

- (a) **登记声称 ↔ registry 行反向核验** —— 正面样本已出现：一审 ADR-0096:51 虚报"已挂 deferred 行"，返工把 `defer-0092/0093` 真落盘并在 ADR 内加更正句。可据此定形"声称已登记"的可判据。
- (b) **有界断言承接无界义务**的形状识别 —— D-001.7 棘轮从"存在性检查"升为"全历史 lastClaimMutation ≤ emitted_at 且三面测试钉住"是修复形范例；反面样本是 `defer-0088` 首样本、`F-9` 可判性这类"登记了但没测"。
- (c) **仪器自述一致性** —— `run-gates` 摘要头与腿级判定两套计数（54 vs 53）导致的 ±1 错报，与 ADR-0092 波界警告同族：**报告面的数来自仪器哪个口径**必须先声明，否则每次复审都要重新反推。这条是本轮新长出来的，可考虑并 (a) 或单独立题。

## 6. 本复审窗口的取证边界

主树 settled 树 + 自建干净 clone（tip `5da26011`）两套自有证据；我的电池 run_id `gates.f8e08328457865f14a5fa3e0369bf2ab56c954ba.HEAD.dirty.2026-10-06T18-31-11.714Z`（rows 7 = 4 unverifiable + 3 fail）。未跑 CI 面命令，故本轮仍未出具 `audit-coverage v1` 块；未复现 GitButler 索引行为（只验一致性）；未核外部规范引用真值。
