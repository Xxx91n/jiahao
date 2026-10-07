# grill-t38 二次返工 LOOP 复审报告（2026-10-07）

> 身份：审计 Agent（第二方）LOOP 轮。被审对象：返工波 `cf7c9be1`（R1，19 文件）+ `5da26011`（R2，2 文件），lane 链 `grill-t38-docs → grill-t38-audit → grill-t38-impl`。
> 一审报告：`D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-07-audit-report.md`（判 FAIL，P0×7/P1×8/P2×2 返工清单 + 重跑清单）。
> 方法：一审"不采信自述"标准不变——四项硬验收本机重跑，P0 七项逐条从 **lane 自身树**（非工作树）取证，另加两项一审没有的独立取证（干净 clone 全电池、审计工件不可变性三方比对）。

---

## 0. 结论

**通过（PASS），附 5 项 findings；其中 2 项须在 seal 前收口。** 本轮返工范围内无 P0 缺陷。

不可 seal / 不可 push 的制约全部来自 **owner 未闭项**（§4），不来自实现缺陷。

关键取证（我自己的 run_id，非引用他们的）：
`run_id = gates.f8e08328457865f14a5fa3e0369bf2ab56c954ba.HEAD.dirty.2026-10-06T18-31-11.714Z`（`tree_sha = f8e08328457865f14a5fa3e0369bf2ab56c954ba`，`complete = true`，`emitted_at = 2026-10-06T18:34:23.966Z`，`rows = 7` = 4 unverifiable + 3 fail）。

---

## 1. 硬验收复跑（四项 + 两项加强）

| 项 | 返工声明 | 我实测 | 结论 |
|---|---|---|---|
| 编译 | 12/12 OK | 同一 12 文件清单 `node --check` → 12/12 OK | **成立** |
| 打包 | `size=546,465 / entryCount=185`；真打包 185；解包 bin 起得来 | `npm pack --dry-run --json` → `size 546465` `entryCount 185`；真 `npm pack` → 同一 546,465 字节；`tar -xzf` 后 `node package/scripts/install.js --help` → `jiahao v0.0.1 — install .jiahao-profile flag`；`tar -tzf \| wc -l` = 185 | **成立** |
| 进程（门检电池） | 47 PASS / 4 UNVERIFIABLE / 3 FAIL（pack-smoke / audit-surface / post-land-sentinel） | 腿级判定 **46 PASS / 4 UNVERIFIABLE / 3 FAIL**（53 条判定腿，与 `docs/gates.json` 的 53 entries 一一对得上，无缺印无多印）；FAIL 集合 **逐字相同且完整** | **FAIL 集合成立；PASS 数偏 1**（见 §3 N1） |
| test 闭环 | 1 failed / 100 passed / 101 suites；1 / 1 / 1776 / 1778 | `npx jest --ci` → **1 failed / 100 passed / 101 suites；1 failed / 1777 passed / 1778 tests**；唯一红 = `test/adr-0038-wiring.test.js`（pack cap，owner-scope） | **成立**；`skipped` 口径差 1（见 §3 N2） |
| 干净 clone（一审点名要求） | `check-status-inventory` → EXIT=2 黄级，不误报红 | 我自建 clone（`git clone --branch grill-t38-impl` → tip `5da26011`）：`test-artifacts` 不存在 → 腿输出 `::error title=UNVERIFIABLE,...reason=own-run-artifact-absent`，**`CLEAN_CLONE_EXIT=2`**；clone 全电池 `gate:all exit 1 (54 entries, 11 unverifiable)` = 能力门诚实降级（ci-mode / bench-corpus / old-side-refs），**无假红** | **成立（独立复现）** |
| E-17 派生面 | 未单列 | `build-rewrite-map.js --check` → OK 5,583；`--published-only` → OK（对 `origin/main` 祖先核验通过）；`check-deferred.js` → OK 87 entries；覆盖腿 `--coverage-base 78d8a14c…` → **EXIT=0，FAIL 行数 0**；`git diff --check` 干净 | **成立** |

---

## 2. 一审 P0 七项逐条闭合（判据取 lane 自身树，不取工作树）

| 一审项 | 复审判据 | 结论 |
|---|---|---|
| **P0-1** trend 行缺失 → 覆盖腿 5 个 R2 文件未声明 | `docs/governance/trend-inventory.json` rounds 32，末行 `grill-t38`（kind=fix，carve_out_used=1），声明 44 项，含 `status-leg.js` 与一审点名的 **5/5** R2 文件；覆盖腿 EXIT=0 | **闭合** |
| **P0-2** 06 报告无 claim-surface 行 | `claim-surface-roles.json` 241 行；06 报告、返工报告、我的审计报告、我的审计 handoff **四行齐**；电池 `[232 claim-surface-roles] PASS` | **闭合** |
| **P0-3** 验收数字失实 | FAIL 集合已更正且完整；jest 总数自洽 | **基本闭合**，残留 PASS 口径差 1 → N1 |
| **P0-4** lane 拓扑悬空 `source_adr` | 三条祖先探针全 OK（docs ⊂ audit ⊂ impl）；`git ls-tree -r --name-only grill-t38-impl -- docs/adr` → ADR-0095 **与** ADR-0096 **都在**；clone 内 53 条 entries 的 `source_adr` 不可解析数 = **0** | **闭合**（这次是从 lane 树与 clone 判的，不是工作树） |
| **P0-5** D-001.7 新鲜度棘轮缺失 | `freshnessRatchet` 实存，reason `anchor_claim_mutation_after_emitted_at`，对锚树全历史跑共享分类器并与 `emitted_at` 比较；测试三面钉住：`a claim mutation post-dating emitted_at is a ratchet red` / `…at or before emitted_at is green` / `no claim mutation in the anchor history is green` | **闭合（含测试）** |
| **P0-6** D-001.8② 锚非后补无实现 | `backfilled` 判定实存 + 同名测试；带锚块也走 `blockMs/anchorRegMs` | **闭合（含负例）** |
| **P0-7** ADR-0096 虚报登记 + `:106` 过度声明 | `defer-0092`（audit-coverage/post-land-verify 锚定收编）与 `defer-0093`（D-006.7 刷新迟到黄级 disposition）**真存在于 registry**（entries 87）；ADR `:51` 点名两 id；`:106` 改写为账本 D-002.9① 精化，并带 **更正句**："an earlier revision of this bullet claimed … was 'verified at implementation time'; that claim was unsupported and is deleted" | **闭合**（我第一轮 grep 命中该短语，是命中在更正句的引文里，非残留虚报——逐行核对后排除） |

P1/P2 抽查（同样以测试面而非"代码存在"为判据）：join-key **v1.1** 且 v1 走 legacy+warning（干净 clone 里实测到该黄级行）；消费腿 `anchorEnumViolations` 复用导出的 `MODES`/`REF_CONTEXT` + 测试 `in-enum anchor passes; out-of-enum mode/ref_context is caught`；`isWorkspaceMerge(sha, tip)` 改 **`sha === tip` 结构性判据**；`deriveAnchor` 迁 `scripts/shared/status-leg.js`（导出 `deriveAnchor`/`exitUnverifiableReason`，`run-gates.js` require 之，本地定义消失）；一审缺的两条绿路径测试实存（`green: anchor equals carrier.parent` / `green: anchor is an ancestor with a clean interval`）+ `main()` 端到端 smoke；`pickDerivation` 已从测试面清除（`prefer-HEAD is RETIRED` 测试改为断言退役）；`CONTEXT.md` 有 **Assertion Anchoring (断言锚定)** 词目；defer-0088 记入**残留窗首样本**（同树连跑两次，2026-10-07）；返工报告的电池数值 **带 run_id 括注**（一审 D-004.5 违反项已改）。

---

## 3. 本轮新发现（都不阻断，2 项须 seal 前收口）

- **N1（须在返工报告里更正口径）** `run-gates` 的摘要行打 `54 entries`，而 `docs/gates.json` 是 **53 entries / 53 条判定腿**（我做了集合差集：无腿缺印、无腿多印）。返工报告的 `47 PASS` 是用摘要头 54 反推（54−4−3），真实腿级为 **46**。这不是造假，是**仪器自身两处计数口径不一致**——一审我判他们"48 PASS 多报 2"，其中 1 的偏差其实来自这个头。建议：返工报告把 PASS 改为按腿级行计数（46）并写明口径；`run-gates` 摘要改为 `53 legs + gate:all`（属仪器面，走下轮或随本轮 trend 行申报）。
- **N2（须收口）** `skipped` 口径差 1：他们报 `1 failed / 1 skipped / 1776 passed / 1778`，我报 `1 failed / 1777 passed / 1778`（无 skipped）。总数与红点一致，差在一个用例的 skip 条件上。请点名那个用例与其 skip 判据（class-vs-sample：±1 的普查差不该以"算术自洽"结案）。
- **N3（工作区卫生）** 两项**范围外**文件现在处于 **STAGED**（`M `：`D:\Aworker\jiahao\docs\adr\0094-tarball-cap-trend-anchor-amendment-grill-t36-observer-surface.md` 5/9、`D:\Aworker\jiahao\test\post-land-sentinel.test.js` 81/81），而一审基线是 ` M`（未暂存）。内容与索引一致、与 HEAD 的差异是**别人的在制品**（未损坏）。风险是裸 `but commit` 扫入。处置属 owner/该文件所有者，我不代改；建议恢复未暂存或在轮报告里显式认领。
- **N4（过程违例，单独呈报）** 收口用了 `git update-index --cacheinfo` —— 一次绕过 `but` 的**索引写**。AGENTS.md 把 VCS 写面归 `but`；`update-index` 不在明文禁列（`add/commit/checkout/merge/rebase/stash/cherry-pick`）但功能上同域。后果我核过：索引/工作树/HEAD 三者互相一致，`git diff --check` 干净，无内容损坏。他们已披露并建议下轮立案——**是否追认为合法逃生舱属 owner 裁**，审计窗口不追认。他们所称"GitButler 索引惰性写缺口"是对**外部工具**的类声明，我只验到"当前三者一致"，未复现该机制，故此项按 class-vs-sample 记为**未验类**。
- **N5（洁癖）** `pickDerivation` 仍定义于 `scripts/check-status-inventory.js:197` 并在 `:607` 导出，生产调用方为零；退役语义的测试钉已清（这是实质），死导出残留。`evidence-freshness.js:58` 的 `WORKSPACE_SUBJECT` 常量在结构性判据改后疑似同构残留（未逐用核验）。

---

## 4. owner 未闭项（4 项，均为裁量而非缺陷；不 seal 的直接原因）

1. **pack cap**：我独立实测 `size 546,465 / entryCount 185`；pinned 公式 `ceil_to_10_000(546465 × 1.10) = 610,000` —— 候选值算术成立，须 owner 重推导并同 commit 改 ADR-0039 D3 字面量。
2. **post-land 刷新时点**：`[231 post-land-sentinel]` 仍红，「波已 settle」属 owner（E-19）。
3. **`audit-surface` 红 —— 归因已核清，是我的审计工件造成的**：腿现在选中 `2026-10-07-audit-report.md`，报 `audit-coverage v1 block has no json fence`。我核过：`scripts/check-audit-surface.js` 本轮**未被返工改动**；我的报告 blob 三方逐字等长一致（工作树 / 重排后 `cd757b96` / 一审原 commit `40b2e40f`，各 25,329 字节）——即**被审 lane 未触碰审计工件**，返工窗口也没替我贴块、没改选面逻辑。两条出路（CI 面跑齐后我具名贴块 / owner 就"部分覆盖声明是否合法"立法）**均属 owner 裁**（一审 §5.2 已呈报）。
4. **F-5/F-11 `review_at` 偏离** 与 **P1-9 的 CI `runner_ctx` dirty 位残量**：后者已如实登记为残量（`src/shared/status-inventory.js` + ADR 残量段），未实现；是否本轮实现属 owner。

---

## 5. 过程事实（不追认）

- **上一轮那 6,573 个冲突快照文件已彻底不在链上**：`cf7c9be1` 19 文件、`5da26011` 2 文件，`git show --name-only \| grep -cE '^\.(auto-resolution\|conflict)'` 均为 **0**；`git ls-files` 全仓 1,652 个跟踪文件里该类前缀 **0** 个。一审要求的"落地集判据"达成。
- **两个 commit 的 `[ANCHORING]` 尾注与落地集全等**（19/19、2/2，我按 `git show --name-only` 逐一 replay 比对）。
- **R2 同 commit fail-closed 正确执行**（返工报告 + 它自己的 claim-surface 行一起落）。
- **未 push、未 seal**：`origin/main` 仍是 `0b7bfb68`，`dabf82c2 / cd757b96 / cf7c9be1 / 5da26011` 四个 sha 均不在 origin；`.scratch/grill-t38/SEAL` 不存在。
- **他们主动披露的三件事我都复核为真**：范围外残留被 `but move` 扫入后已还原为未跟踪（5 条 `??` 路径，非 `A`）；索引 surgery 的后果未损坏内容；`audit-surface` 红的归因指向我方工件而非其实现。
- 一审 PV-1（暴露窗内 declare）本轮**未见复发**：他们给的每一项数字我都能在 settled 树复现（唯一偏差是 N1/N2 的口径，非新鲜度）。

---

## 6. 复审边界（class vs sample 自报）

- 数值证据取自我自己的两次运行：主树 settled 树（HEAD 工作区）+ 自建干净 clone（tip `5da26011`，OS temp，未回写仓库）。
- **未做**：CI 面命令（`npm install --ignore-scripts`、corpus restore、`npm run` 包装），因此我仍不出具 `audit-coverage v1` 具名块（同 §4.3）；外部一手规范（PCAOB AS 3110 主文、SLSA/K8s）只核到 ADR 文本层的 analogy/更正句存在，未核引用真值。
- `1 skipped` 用例的身份、`WORKSPACE_SUBJECT` 是否仍有使用点、`run-gates` 摘要头 54 的确切构成——三处我只到"现象"未到"机制"，已分别记入 N1/N2/N5，不外推。
- 本轮我未改任何被审 lane 的提交；本报告与 handoff 落在新 lane `grill-t38-loop`（叠于 `grill-t38-impl` **之上**），以免 mid-stack 提交把 `cf7c9be1/5da26011` 重排换 sha。

---

## 7. 下一步

- **seal 前须收口**：N1 口径更正、N2 skip 用例点名。二者都是报告面/仪器面，不动机制。
- **owner 先裁再动**：§4 四项（尤其 audit-surface 那条与 pack cap）。owner 若判 audit-surface 走"贴块"路线，那必须是我方在 CI 面跑齐后具名贴，不是返工窗口代贴。
- **下一 grill 方向不变**：Q-t39「处置-证据闭合」——本轮又添三个可入案的活例：一审 ADR-0096:51 的虚报登记（已修，修形可作正面样本）、N4 的"未验类声明"（工具缺陷声称）、N1 的"仪器两口径"（同一事实两个数）。建议 (a) 登记声称↔registry 行反向核验、(b) 有界断言承接无界义务的形状识别、(c) lane 单飞契约可达性机械化。
- 交接：`D:\Aworker\jiahao\.scratch\grill-t38\handoffs\2026-10-07-loop-handoff.md`。

---

## 8. 复核更正（owner 授权本窗口直接修小问题后回填；含我方两条误报的撤回）

授权范围：小问题直接修 + LOOP 复核；修不了的交下轮 grill。逐条如下。

### 8.1 N1 —— **我方表述有误，机制已查明并修口**

`run-gates` 摘要行的 `res.results` 里含一行**合成守卫行**：`{ name: '- tracked-surface', order: 'D-4', tier: 'confirmatory' }`（`scripts/run-gates.js:472-477`，ADR-0093 D-4 的"整棵被跟踪树零突变"检查点）。所以 **54 = 53 条 registry 腿 + 1 条守卫行**，而 `docs/gates.json` 的 `entries` 只数 registry 腿 = 53。

结论更正：**返工报告的 `47 PASS` 在它自己的口径下是对的**（47 = 54 − 4 − 3，含守卫行）；我报告里"PASS 偏 1 / 按腿级应为 46"这句把两种口径当成对错，属我方表述失准，此处撤回并更正为"**同一事实两个总体，仪器未标注**"。

已落地的修法（不改任何判定，只改自述）：`scripts/run-gates.js` 摘要行改为打印显式拆分

```
gate:all exit 1 (53 legs + 1 guard(s) = 54 rows; 46 pass / 3 fail / 4 unverifiable, fail-fast off)
```

即 `legs`（`Number.isInteger(order)`）、`guard(s)`、`rows`、`pass/fail/unverifiable(/skipped)` 各自点名。全仓仅两处与该串相关：生产者 `run-gates.js:568`、消费者 `test/adr-0084-wiring.test.js:208`（断言的是治理面里捕获的 `gate:all exit 0` 子串，前缀未变，不受影响）。**未配新测试**：该串在 `main()` 内，既有 harness 只驱动 `runGates()`（`test/adr-0034-wiring.test.js:146+`），不经过打印面——为一行人读标签引入 main() 测试面不成比例，如实记此取舍。

### 8.2 N2 —— **闭合为非缺陷（机制点名）**

±1 的 skip 来自 corpus 分层执行路径：`const CORPUS_TIER = resolveCorpus().tier; const corpusT = CORPUS_TIER === 'none' ? (n,f) => skipTest('corpus tier none (ADR-0056 D-A)', n, f) : test;`（`test/adr-0030.test.js:14-15`、`test/adr-0031-wiring.test.js:14-16`）。bench-corpus 可用与否决定该用例登记为 skip 还是 run，因此 `1 skipped / 1776 passed` 与 `0 skipped / 1777 passed` 是同一套件在两种 corpus 层级下的合法普查差。skip 本身受治理（ADR-0057 D-A "skip 是带理由的判定"，`scripts/check-skip-reasons.js` 执法），不是我要求"点名而未点"的悬案。撤回原 finding 的"待收口"性质。

### 8.3 N5 —— **两条全部撤回（我方误报）**

- `pickDerivation` 不是残留死码：其自身注释与 ADR-0096 `:106` 的精化句把它定位为**工件缺失时的人工强验证探针**（"its prefer-HEAD semantics are deliberately NOT pinned by the test suite as expected behaviour (the retired contract must not read as current)"，`scripts/check-status-inventory.js:190-197`）。导出面即其用途。删除它会拆掉 D-002.9① 立法的那条逃生通道。
- `evidence-freshness.js:58` 的 `WORKSPACE_SUBJECT` 有活消费方：`scripts/check-map-freshness.js:128` 经 `fresh.WORKSPACE_SUBJECT` 使用；该文件注释也已声明"本模块不再用它做谓词"。不是同构残留。

### 8.4 本轮小结

5 项 findings 经复核后：**1 项仪器自述已修（N1）**、**2 项为我方误报（N2/N5，撤回并留痕）**、**1 项工作区状态如实上报不动他人在制品（N3）**、**1 项 owner 裁（N4 update-index 逃生舱与工具类声明）**。审计侧自身因此前记一笔：一审 2 条 + 二审 2 条误报都出在"grep 命中即下判断"，凡涉"退役/残留"类结论必须先查消费面与注释所指的立法意图——这条属 Q-t39 (b) 的取证纪律面，已并入交接。

