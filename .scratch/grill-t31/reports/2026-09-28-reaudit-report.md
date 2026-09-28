# grill-t31 re-audit report — 2026-09-28 (loop 2, post-repair)

auditor: independent re-verification (audit-only window; no repairs performed)
object under review: repair wave on top of grill-t31
prior verdict: FAIL (2026-09-28-audit-report.md)
repair chain audited: `f4ea1a38` → `87192ded` impl → `b0504f28` docs → `aab0a3b4` impl-residue → `b9396688` docs-residue → `be81e11a` SEAL (declares `b9396688`) → `22d08893` claim wave → `1564ad12` report-fix → `12a6e403` workspace wrapper
worktree == HEAD bytes verified (`git diff HEAD` empty; `MM` index noise is GitButler staging bookkeeping, not content drift)

## verdict

**修复工作本身全部验证通过（7 必做 + 建议项 + 披露一致性），但同一不变量第三代衰减复发：`docs/rewrite-map.json` 在 committed bytes 上仍 stale — leg-208 / `rewrite-map.test.js` / `run-test-gate` 均红。** 这不是返修执行问题：修复窗口忠实执行了"regen + E-20 登记 + D-010"的字面要求，而衰减机制在数小时内再次兑现——**呈报 owner 裁决**（治理工具契约层的决策），不再打回修复窗口（再打回只会循环：任何 regen 在下一次 ref 脱落后同样失效）。

## hard acceptance — auditor re-run on committed bytes

| check | repair-report claim | auditor observed | result |
|---|---|---|---|
| `npx jest --silent` | 87/87, 1537/1537 | **86/87 pass; `rewrite-map.test.js` FAIL** (1/1537) — 同一 stale-map 断言 | FAIL (1 leg) |
| `npx jest test/codebuddy-trial.test.js` | 60/60 | PASS（含全部新增修复用例） | PASS |
| `node scripts/run-gates.js` | exit 0 | **exit 1 — leg-208 `[rewrite-map] FAIL: stale`**；leg-224 PASS (6 claim commits)、leg-219 PASS (132 pins/23 sha ancestral, trigger ok)、leg-223 anchoring 67 commits PASS；其余与此前一致 | FAIL (leg 208) |
| `build-rewrite-map.js --check` | "regen 3485 cites green" | **exit 1 stale** — 漂移三元组见下 | FAIL |
| `build-rewrite-map.js --published-only` | OK | OK — 3546 citations | PASS |
| `build-governance-anchors.js --check` | 18 artifacts sync | identical | PASS |
| `check-frozen` / `check-isomorphism` / `verify-needles` / `selfcheck` | all green | frozen-ok(5) / isomorphic(8,3) / all-needles-present(15/15) / 4 legs ok | PASS |
| `build-adapters.js --check` / `pack:smoke` | clean / 420359B | identical | PASS |
| lifecycle smoke（自跑 begin→collect→end→evaluate + orphan 注入） | probes pass / refusal | 四探针全 pass（含 transcript_reachability:reachable、session_id_lifecycle:unique-binding-observed）；JL-2/3 hit；orphan → exit 1 refused；selfcheck 捕获注入行 | PASS |
| evaluateRound(grill-t31) | declared=expected b9396688, claims 2/0 bad | **复跑完全一致**：declared=b9396688 @ be81e11a; amended:false; inFlightClean:true; capturesAtSealOk:true; sealBad/freezeViolations/unregisteredClaims 全空；claims 22d08893+1564ad12 均 0 bad | PASS |

## 衰减复现的机制确认（审计责任级别：已定位到分类器 oracle）

`build-rewrite-map.js:274-275`：`ohit`（sha 出现在 `git rev-list --objects <scanned refs>`）→ `'local object'`，否则 `'unresolved hex literal'`。对象仍在库（`cat-file -t` = commit），但 ref 可达性已脱落——三代复现：

| 代 | 引用 | 提交时 label | 现状 |
|---|---|---|---|
| 1 | report.md L22-23 `d7ddd772`/`6e2334bf` | local object | unresolved hex literal |
| 2 | repair-report L55 + ERRATA.md:367 `162da5d2`; ERRATA.md:369 `4c0fa399` | local object | unresolved hex literal |

关键事实：**E-20 勘误登记本身的两条引用也在漂移集内**——证明"prose 引用 + ERRATA 登记"惯例无法稳定 map label；seal-disposition/errata 散文必须命名被取代对象（审计性要求），而 GitButler 内部 ref 生命周期必然使其衰减。该不变量在当前分类器语义下**结构性不可满足**——修复窗口的字面执行（regen+errata）不可能产生持久绿色。

## 返修 7 必做项逐条复核（committed bytes）

| # | 项 | 复核结果 |
|---|---|---|
| 1 | VERIFY_RE | **FIXED ✓** — `capture.js` 现为真 `\s` 类 + 扩展面（npm/npx/pnpm/yarn/node/go/cargo/dotnet/mvn/gradle(w)/make + jest/vitest/pytest）；live probe 15 命令 MATCH、git status/ls/npm install NOMATCH；电池 8 逐命令断言 + 负例 + L3 双向用例均在 |
| 2 | map + 勘误 | **字面执行 ✓ / 持久性 ✗** — E-20 登记（两代孤儿 + 散文 nit 三条）、D-010 入 ledger、map 已含 3546 cites；但 label 漂移再发（见上）——需 owner 裁决契约层 |
| 3 | spans_boundary 排除 | **FIXED ✓** — `evaluate.js:174-175` `spansSet` = 全部 sealed manifests 的 marks 并集；classifyDomain 发 `excluded` 桶；JL-4 `spans` 现由 `bucket==='excluded'` 项导出；fixture `spans-boundary session excluded from within-phase comparisons` 存在并绿 |
| 4 | binding 守卫硬错 | **FIXED ✓** — evaluate.js 孤儿门扩展：`binding-multi-prompt`/`binding-unbound`/`binding-<violation>`/`claim-orphan`/`claim-duplicated` 全部 exit 1 拒绝；paste 降级守卫 = transcript 缺席会话↔唯一未领 paste 任务（`binding-owner-paste-path` anomaly）；对应红 fixture 全部在场 |
| 5 | coverage matrix | **FIXED ✓** — 改 `test('...')` 锚定提取声明名，REQUIRED_TESTS 为纯字符串不可自满足；代码内注释标注审计引用（R-4） |
| 6 | RUNBOOK | **FIXED ✓** — §3 四探针表（含 owner 裁决行 + 逐 Stop 复查）；§4 逐任务 checklist `<trial-workspace>/<run_id>/<task_id>/` + P2 replay 行 + 任务开始 verify-needles；`verify-needles --workbench` 已实现（要求 --volume） |
| 7 | 双端哨兵 | **FIXED ✓** — `all-miss domain emits zero hits` + `all-indeterminate domain emits zero hits` |

建议项复核：`deviations.js` 回指腿已修（`(src.run_id||null)!==(d.source_run_id||null)`）；`evaluate performs zero writes` 零写字节断言 + cursor-gap + claim-duplicated fixture 在场；EVAL_MAP 双读/storesByRun 死码/魔数/shebang/绑定词汇统一——抽查属实。报告 nit 走 E-20 勘误（frozen 工件惯例 ✓）。

## 新发现（本轮）

- **F-R2-1（owner 待决）**：map label 对"意外可达性"易变——`local object` 依据 `rev-list --objects` 引用快照，任何 `but` 操作/agent 的 ref 脱落即翻转。候选契约级修法（owner 裁定，非返修窗口自选）：(a) 分类器消费 ERRATA/豁免注册 → 已登记孤儿发稳定类；(b) 对非 published-ancestry 的 prose 引用直接发 `unresolved hex literal`（提交时即稳定，不再走易变中间态）；(c) 声明性放弃（declared drift）+ 本轮豁免——不建议单独采用。
- **F-R2-2（小）**：`handoffs/2026-09-28-handoff.md` 修复附录仍写 "Seal re-issued: `b0504f28`"——终态 seal 为 `be81e11a` 声明 `b9396688`（b0504f28-seal `mut/162da5d2` 已被取代）；claim 面上的过期事实，按惯例走勘误而非回改。
- **过程披露复核**：wave-A 提交绑定过期 evaluate.js 字节（hunk-id 快照缺陷）→ uncommit→residue-commit→re-seal 修复，报告 §seal disposition 如实披露；教训（claim 文件 stage 后 regen、commit 后 `git show --name-only`+`git diff HEAD` 双核验）已沉淀。记为披露-修复，不追认。

## 修复增量 Standards 轴（subagent 复核，f4ea1a38..HEAD 限定 bench/+test/）

字节完整性/惯例：干净（无新增 escape 缺陷；shebang/strict/JSON-stdout/exit 码惯例保持）。新机制骨架成立（孤儿门先于判行发射、excluded 桶不污染计数、paste 路径绑定要求 1:1 唯一、矩阵非自证）。

JUDGEMENT calls（均非阻断，建议后续波次处理）：
- `common.captureKey` 已抽出但 `collect.js:41,47` 仍手写 `|\x00|` 键——写侧与读侧键形分叉隐患；修复报告"factoring 完成"为过誉陈述（evaluate.js 一侧用了）。
- 新增两条路径零 fixture/零覆盖格：`binding-owner-paste-path`（evaluate.js:111-128）与 `ts-membership-conflict`（:200-208）——新拒绝/异常通道无测试。
- 命名分叉残留：孤儿类 `binding-multi-prompt` vs 偏差类 `binding-multi-user-prompt`（同条件两名）。
- 死码：deviations.js:11 未用导入（sha256/isIsoUtc）、evaluate.js:14 `usageExit`、fixture `telemetryExtra` 死键、`closed_at||opened_at` 死分支（sealed 必有 closed_at）。
- `sessions` 图未按 run 分域（evaluate.js:72）——跨界 session 的 signals 跨 store 后写赢，可能喂错 run 的多 prompt 检查（:137）。
- `claim-duplicated` 以裸 task_id 跨全部 sealed run 计（:152）——owner 授权的纠偏 manifest 重跑同卷将恒拒（边界案例，可能即预期语义）；伪造绑定到非卷任务逃逸孤儿门仅落 unclassified。
- 魔数/字面量：`'owner-paste'`/`'item-0-telemetry-probe'` 字面量绕过 CHANNELS/ITEM0_TASK_ID 常量；`2000` 默认三处重复声明；`ctx.volumes[...]` 未检直接索引（predicates.js:279-280，缺卷时 TypeError 而非 fail()）。

## 残留项 / pending
- `adjudicated/grill-t31` tag 缺席（owner 裁决通道，预期内）。
- 两个 pending-confirmation 仍未裁决（2026-12-15 到期，owner 侧首个真实 run）。
- owner 侧 SCED trial 与效果裁决 — 范围外，未涉。
- sentinel-ownership Windows inode flake：修复窗标注为非回归；本轮 jest 全量中该套件 PASS。

## owner 裁决后动作
- 若选 (a)/(b) 契约修法：属治理工具变更，需 D-record（或 ADR-lite）+ regen + 重跑同一套验收。
- 若选 declared drift：在 ERRATA/豁免通道登记本轮 leg-208 状态并附依据，再验收。

## atomcode 深度调研处置（2026-09-28，owner 委托）

调研已按 owner 要求执行并辩证复核（ctx source=`atomcode`，本次 run 已索引 8 节）。**结论：推荐 (d) 组合——(b) 为主干消灭易变中间态 + (a) errata 注册表作为分类输入给已登记孤儿发稳定类 + (c) 仅作"新 prose"软约束。**

工业界支撑（Confidence 高）：
- **Jujutsu**：CommitId（内容哈希，rewrite 即变）/ChangeId（跨 rewrite 稳定）正交双标识；教训=稳定标识符必须第一天就定跨会话存续契约。
- **Mercurial evolve**：obsolete/extinct/suspended/unstable/orphan 五态均按"取代关系记录是否存在+指向什么"分类，marker 本身是持久数据而非 recompute 副产品——本项目缺的正是等价的 obsolete-marker 持久记录，errata 注册表恰好可充当。
- **SWHID**：intrinsic（内容自验证）+ extrinsic（注册表）+ qualifiers（易变上下文外挂字段）——prose 直引 SHA 永远合法；易变的"当前可达性"应是 qualifier 字段而非分类输出。
- **Rekor/SLSA**：append-only + digest-only；钉可变引用被明文禁止，但钉 SHA 是 digest-citation 合法形式——错的是把 reachability 判定塞进 recompute 分类。

隐患清单（调研自己挖的，账本未载）：
1. errata 条目自身引用仍漂移（已复现）——erratum key 需 intrinsic 内容哈希+摘要而非裸 SHA；
2. errata 双职（披露文档+分类输入）使 check 纠缠——建议错误信息/leg 分离；
3. **最紧迫**：孤儿仍可达时应立即把内容快照+successor 对应物化进 append-only 记录，错过时间窗后任何修法都只能发 unresolved；
4. 孤儿"复活"（cherry-pick/fetch 重回）需预定义升级规则（append-only 只能加新条目不改旧类）；
5. 若日后引入稳定 change-id，首日必须定跨机器存续契约（jj 早期踩过此坑）。

### 辩证复核（审计侧，非照单全收）
- 调研未读本项目 map-generator spec 与 errata 契约措辞（其自述缺口）——(a) 的"低成本"被低估：errata 字段在 ADR-0086 分类法属 exception-channel，被分类器消费=升级为语义承载（fenced）面，需 ADR 级修订+countersign，非"加一条消费规则"。
- (b) 的正确表述应是"按**已声明的结构性事实集**分类"（published-ancestry/对象在库/errata-registered），把"存在于 volatile 内部 ref"降为 qualifier 数据而非分类依据——比"直接发 unresolved"保真。
- (c) 硬禁直引会伤披露完整性且与 pin_patterns 冲突，调研自身也降其为软约束——审计侧同意。
- **账本冲突核查（10 条 current 全过）**：无任何 D-001..D-010 被调研结论反向——D-010(vii) 的 errata 登记处置被证实为"不完整补救"而非语义反转（登记方向正确，缺的是物化+分类消费设计）。按 owner 规则：无 revised 标记者；新决策以**待批 D-011 草案**呈报（见下，不动账本，待拍板）。

## evidence inventory
`D:\Aworker\jiahao\.scratch\grill-t31\audit-evidence\` 追加：lifecycle-smoke-r2.txt；其余证据文件沿用第一轮（jest-rerun.txt 中 1517 应读作本轮 1537 口径、rewrite-map 红状态以本文为准）。
