# grill-t33 二方复审报告（LOOP-2）— 2026-09-30

复审对象: 修复窗对 2026-09-30 审计报告（F-1..F-9 / R-1..R-6 / O-1..O-3）的返修，载体为其更新后的
`D:\Aworker\jiahao\.scratch\grill-t33\reports\2026-09-30-report.md`（mtime 2026-09-30T01:22Z）。
复审方法: 工作区 diff 全量范围纪律审查 + R 项逐条实物核验 + 亲跑同一套硬验收（含 D-004(i) 自洽的 CI test-job 命令面）+ gh 公开 CI 复核。
证据居所: LOOP-2 捕获 `a8-run-gates-loop2.txt` / `a9-run-test-gate-loop2.txt` / `a10-focused-loop2.txt` 存于
`D:\Aworker\jiahao\.scratch\grill-t33\audit3-evidence\`（never-commit nc-001）。

## 1. 范围纪律（返修 diff 全量审查）— 通过

工作区 7 个修改文件逐一 diff：`.scratch/grill-t33/decision-ledger.md`（仅 D-001(i)② 行引用限定）、
`docs/governance/ERRATA.md`（仅删 EOF 空行）、`docs/governance/trend-inventory.json`（仅 reason 字段限定 + 尾行恢复）、
`test/countersign-queue.test.js`（R-4 重构）、`test/adr-0033-wiring.test.js`（仅头注）、
`bench/research/out/g6-publish-replay.json`（门副作用，已在案）、`docs/rewrite-map.json`（LOOP-1 前既有未提交 regen，未动）。
**无夹带变更；三波提交 SHA 未再变动（无 further history mutation）✓。**

## 2. R 项逐条核验

| 项 | 核验证据 | 结论 |
|---|---|---|
| R-1 ERRATA EOF 空行 | 文件尾部字节 = `numeric count.\n`（恰一 LF）；`git diff --check`（vs HEAD 与 vs 69d35fbe）均 clean；committed range 仍红（未提交所致，报告已如实披露，随提交闭合） | **通过**（worktree 层） |
| R-2 worktree 状态披露 | 报告新增披露：未提交 pre-reword map regen（generated_at 2026-09-29T15:48:35Z、published_tip 754e53c2、3654 refs）"must not be treated as authorized or current"；trend 尾行已恢复单 LF（字节核验 ✓）；g6-replay 门副作用归因准确（mtime 2026-09-30T01:37Z 系 LOOP-1 审计运行，返修窗未刷新） | **通过** |
| R-3 裸 SHA 限定 | ledger ② 行：`a92efdf5（grill-t31 closeout tail, 2026-09-28）→754e53c2（grill-t32 post-land rewrite-map regen, 2026-09-29）`；trend reason：`fc390d5e (grill-t24 absorb commit, 2026-09-23)`；限定使 stale map 的 --check/--published-only 转红——报告如实披露且 a8 复现（"earlier PASS results ... are historical"） | **通过** |
| R-4 classify() fail-closed 重构 | 新逻辑按四种时代形态逐一表面核验：(a) 显式会签/解除记录 Status 行、(b) bare `Status: Accepted` 仅限前队列（n<64）、(c) `## Status`+Accepted 标题形、(d) `STATUSLESS_FINAL` 显式 ID 白名单（0001-0009/0016-0018）；其余一律 undeclared=fail；合成 ADR-0090 探针钉死 queue-era bare-Accepted → undeclared；被删死正则（oldForm/newForm/countersigned）无残留引用；聚焦复跑 `npx jest test/countersign-queue.test.js test/adr-0033-wiring.test.js` = **2 suites / 20 tests 全过**（a10，exit 0），与报告声明逐字一致 | **通过**（F-4 实质闭合） |
| R-5 死正则 + 头注 | 实质完成：三个死正则确已删除（diff 实证）、adr-0033 头注改为区分本轮 presence/shape 断言与既有 member-list 断言 | **通过**（叙事瑕疵见 N-2） |
| R-6 skips 声明域 | 报告自述"remains incomplete; the README wording is not certified"——诚实保留。本复审新增第四个观测点：a9 全量门跑（Temp 语料在场）= **0 skipped**，与返修窗 7 skipped、grill 期公开克隆 11 skipped、t0 捕获 3 skipped 构成 11/3/7/0 漂移序列，证实跳过计数系环境依赖，7-vs-11 非静态检查可解 | **开放（如实披露）** |

## 3. 硬验收重跑（LOOP-2，当前返修工作区树）

| 命令 | exit | 观测 | 与返修报告一致 |
|---|---|---|---|
| run-gates.js | 1 | governance-anchors FAIL（anchors 过期待再生）+ rewrite-map FAIL + --published-only FAIL（R-3 新限定引用未覆盖）+ map-freshness FAIL（first missing 同 LOOP-1：decision-ledger.md:16:754e53c/a92efdf、baseline.md:14-16 三 SHA）+ anchoring-footer PASS 98 + 4 UNVERIFIABLE（ci-wiring/bench-gate/probes/mr-probes） | 一致 |
| run-test-gate.js --expected-suites 90 | 1 | **5 suites failed, 85 passed, 90 total；6 tests failed, 1580 total**；失败面 = adr-0074（68fb225b/754e53c2）、adr-0061-governance-anchors（anchors 过期连带）、adr-0079（0a5295ee/627abc0b）、rewrite-map.test.js ×2（Expected 0/Received 1，:100 与 :122 stale 断言）、adr-0087（errors 1→3） | **一致**（差异仅 skip 分区：本运行 0 skipped——a8 先行克隆 Temp 语料在场——报告捕获为 7 skipped；总数与失败数逐一相等） |
| check-skip-reasons.js（报告新增行） | — | 报告声明 PASS；本轮未重复执行（与 R-6 静态/运行两分的披露一致） | 引用一致 |
| gh api 公开 CI | — | tip 仍 36530594835 @ 754e53c2 failure，无新 run（未推送） | 一致 |

**红面归因闭合**：全部红色可归因于 (i) 返修尚未提交（committed range 的 ERRATA EOF 仍红）、(ii) 两个授权门控的衍生工件再生成（rewrite-map.json、governance-anchors.json——后者因 ERRATA 修正新增过期）、(iii) 两个再钉 follow-up（adr-0074 published_tip、adr-0079 translation-baseline，属 ADR-0079 D6 已知再钉节奏）。**返修未引入任何新缺陷；红面加深是正确的 R-3 编辑对被阻断 map 的预期后果，且已披露。**

## 4. 复审新增过程注记（不构成打回项）

- **N-1（证据驻留）** 返修报告引用的 "latest captured public-tier run"（5 suites/1580 total/7 skipped）在磁盘上无持久化捕获（audit-evidence 无新文件、bench/research/out 无当日 junit）。其数字经本复审 a9 独立证实成立，但"captured"一词指向不存在的驻留物；同段"未跑全量门因会刷新 g6-replay"的理由技术上不成立（run-test-gate 即 jest 本体，g6-replay 刷新来自 run-gates 的 g6-publish 腿）。两处均属叙事精度，实质结论未受影响。
- **N-2（叙事混乱）** R-5 段落称审计标记的是 "oldFormStatus/newFormStatus unused" 并称该部分 "not applicable"——实际审计标记的是 oldForm/newForm/countersigned，且 diff 显示三者**确已删除**。结果正确，过程叙述失准。
- **N-3（R-6 协议建议）** 跳过计数 11/3/7/0 漂移序列表明：R-6 的闭合需要环境受控的测量协议（如 corpus 缺席的 public-clone 模拟 + ci-mode 模拟各一跑，逐套件归因），而非再添一次临时捕获。建议写入下一修复窗指令或 t34 候选。

## 5. 复审结论

- 返修质量: **R-1..R-5 实质通过**（worktree 层，按设计未提交）；R-6 诚实开放；范围纪律干净；无 further history mutation。
- 轮次验收: **仍不可关单** —— 待 (O-1) owner 授权后依序完成：提交返修 → 再生成两个衍生工件（rewrite-map + governance-anchors，**授权范围须显式含两者**）→ 两个再钉 follow-up → 重跑 §3 全套命令 → 红态归零后按 E-17/E-19 于 settled tree 上 --check → 复审 LOOP-3。
- 按协议（审计通过方出 handoff）: **本轮仍不出 handoff**。t34 方向记录维持 LOOP-1 报告 §7 所载不变。
- owner 待决项: O-1（授权范围 = rewrite-map + governance-anchors 两项衍生工件再生成 + 提交波次 + 再钉 follow-up）、O-2（本地/CI 证据权威冲突裁决）、R-6 测量协议指令。

> 注（2026-09-30，LOOP-3 补记）：wave-1 已做披露式树修复 amend + reword（D-005 仪式），旧→新 sha：`77e8bd97`→`1391c662`、`08d810c1`→`3c07e9ed`、`0a5295ee`→`82b03877`。本报告正文中的旧 sha 均为 LOOP-2 运行时观测值，按原样保留；映射全长度形式见 fix-report Addendum。R-6 测量协议建议维持为 t34 候选（N-3）。
