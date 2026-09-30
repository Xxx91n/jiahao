# grill-t33 二方审计报告 — 2026-09-30（audit window）

审计对象: grill-t33 V8 correction track（D-001..D-004，三波提交 `1391c662` / `3c07e9ed` / `82b03877` 于 `grill-t33-docs` 车道）。
审计方法: 不采信报告自述——独立重跑报告全部可复现行 + 仓库实物抽查（`git show --name-only`、文件存在性、内容比对）+ 按 code-review skill 双轴评审（Standards / Spec 各一个并行子代理）+ `gh api` 公开 CI 状态核验。
证据居所: 7 份重跑捕获 + 2 份子代理评审摘录存于 `D:\Aworker\jiahao\.scratch\grill-t33\audit3-evidence\`（审查方工作产品，never-commit nc-001）；本报告只引用路径/计数指针，不复制其内容（grill-t28 D-003）。

## 1. 硬验收重跑（审计窗口亲自执行，当前树，2026-09-30）

| # | 命令 | exit | 观测结果 | 与报告一致 |
|---|---|---|---|---|
| 1 | `node scripts/check-anchoring-footer.js` | 0 | PASS — 98 post-registration commits | 一致 |
| 2 | `node scripts/build-governance-anchors.js --check` | 0 | PASS — 18 artifacts, digests in sync | 一致 |
| 3 | `node scripts/check-governance-inventory.js --coverage-base fc390d5e778db567d12b072f7a25cbf1e73b03f8` | 0 | PASS — 43 entries + 2 条 advisory（carve-out burn-rate、连续文档轮趋势），与报告披露的 advisory 完全一致 | 一致 |
| 4 | `node scripts/build-rewrite-map.js --check` | 0 | PASS — 3654 citations（**注意 F-2：该 PASS 依赖一个未提交的 reword 前 regen**） | 一致（附 F-2 保留） |
| 5 | `node scripts/build-rewrite-map.js --published-only` | 0 | PASS — 3654 citations covered | 一致 |
| 6 | `node scripts/run-gates.js` | 1 | `[224 map-freshness] FAIL`（first missing: `.scratch/grill-t33/decision-ledger.md:16:754e53c`、`:16:a92efdf`、`handoffs/baseline.md:14:754e53c2`、`:15:68fb225b`、`:16:b06f4a97`）；`[223 anchoring-footer] PASS 98`（reword 后）；4 UNVERIFIABLE（ci-wiring / bench-gate / probes / mr-probes）；`gate:all exit 1` | 一致 |
| 7 | `node scripts/run-test-gate.js --expected-suites 90`（D-004(i) 自洽条款要求的 CI test-job 命令面） | 1 | `Test Suites: 3 failed, 87 passed, 90 total`；`Tests: 3 failed, 1576 passed, 1579 total`；失败面 = adr-0074（Expected `68fb225b` / Received `754e53c2`）、adr-0079（Expected `0a5295ee` / Received `627abc0b`）、adr-0087（errors 期望 `[]` 实得 3 条） | 一致（逐字） |

公开 CI（`gh api repos/Xxx91n/jiahao/actions/runs?per_page=5`）: 最近 5 次 origin/main run 全部 failure；tip = `36530594835` @ `754e53c2`（2026-09-29T06:20:49Z）；test job 败步逐字 = `Run node scripts/run-test-gate.js --expected-suites 89`；gate-all success、summary failure（success-only 聚合连带）。无新 run——t33 车道未推送。报告"不主张 CI 回绿"属实。

## 2. 声明 → 证据 → 结论（对报告 2026-09-30-report.md 逐条）

| 报告声明 | 审计证据 | 结论 |
|---|---|---|
| 三波提交落于 `grill-t33-docs`，SHA 如列 | `git show --name-only` 三波逐一核实：SHA 存在、`[ANCHORING]` footer 文件清单与落地文件集逐一相等；CommitDate（00:14:40/00:15:23/00:16:05）晚于 AuthorDate，与自述"footer reword 修复（历史改写）"吻合 | **证实** |
| Wave-1 内容（队列测试/AGENTS.md 三条款/CONTEXT 词条/ci.yml 89→90/adr-0082 重同步/T-0 baseline 注记） | 落地文件清单 6 项全吻合；`test/countersign-queue.test.js` 成员级断言（10/9/4 三个数组 toEqual、`undeclared` toEqual `[]`、0082 豁免、无总数相等断言）实读确认；AGENTS.md:114/123/128 三条款在盘；`ci.yml:107` = `--expected-suites 90` | **证实** |
| Wave-2 内容（E-25/defer-0076/0077/wiring 71 entries） | `docs/governance/ERRATA.md:481` E-25 三子项逐字对齐 spec §3（终态快照、无 pending-confirmation、Bound-by + 首个 convention-existence binding 自证句）；defer-0076 行 presence-condition/`review_at` 2026-10-15/pinned-at 注记/E-25 关联逐字段吻合；defer-0077 pending-evaluation；registry 总行数 71（尾部 0075/0076/0077） | **证实** |
| Wave-3 内容（README 1579/90 双语、trend 行、anchors 再生、0080/0081 parity pins） | README.md:337/356 + README-zh-CN.md:280/295 = 1579/90 实测在盘；trend-inventory `rounds[]` 含 grill-t33 行（kind=fix、zero_product_diff、累计 R2 files 清单）；anchors --check PASS | **证实** |
| footer PASS 98 / anchors 18 / inventory 43 / map --check 3654 / --published-only 3654 | 重跑 #1–#5 全部复现 | **证实**（#4 附 F-2） |
| run-gates FAIL exit 1 + map-freshness 红（t33 claim-surface 提交）+ 4 UNVERIFIABLE | 重跑 #6 复现，首个缺失引用可定位 | **证实** |
| run-test-gate --expected-suites 90 FAIL，3 suites/3 tests，失败面 0074/0079/0087 及期望/实测值 | 重跑 #7 逐字复现（含 0079 的 Expected `0a5295ee` / Received `627abc0b`——即 zh-CN 镜像 translation-baseline 钉值滞后于 README 最新提交，属 ADR-0079 D6 已知再钉节奏，t32 有同类已披露先例） | **证实** |
| blocker：reword 后的 map regen 被权限分类器拒绝、未用替代手段执行、待授权 | 当前树核实：无任何 reword 后 regen 痕迹（worktree map 的 `generated_at`=2026-09-29T15:48:35Z 即本地 23:48，早于 reword；已提交 map 仍为 t32 代 3642/`68fb225b`） | **证实**（附 F-2：worktree 已有一个未提交的 reword 前 regen，报告未披露） |
| 边界：g6-publish-replay.json 未入 t33 变更 | 三波落地清单均不含 bench/**；但该文件在轮次窗口内被门副作用刷新过两次（见 F-8） | **证实**（措辞精度见 F-8） |
| 边界：audit-evidence 未提交 / 无 push 无 PR / reword 后无 further history mutation | 三波清单无 audit-evidence；gh 无新 run、车道未推送；车道顶 `=0a5295ee`（CommitDate 00:16:05）与报告引用一致，无更新变更 | **证实** |
| Remaining acceptance work 清单 | 与 spec §8 / E-17 / E-19 及实测红面一一对应 | **证实** |

## 3. D-001..D-004 逐条实现核对

| 决策 | 实现证据 | 结论 |
|---|---|---|
| D-001(i)① README 修红（4 处声明点、双语同 commit、skips-7 声明域核验） | 4 处 = 1579/90（波尾实测值，符合 D-004(iii)①"写波尾实测终值"，账本 1571/89 为基线期估计）；双语同落 wave-3 | 落地；**skips-7 复测无轮内证据记录**（grill 期实测已在账本 D-001(i)① 在册，措辞按 spec 允许未改）→ F-6 |
| D-001(i)② E-25 注册（五连红、败步、审计面缺口） | ERRATA.md:481，三子项逐字对齐；败步/终态经 gh 复核 | 落地 |
| D-001(i)③ 队列收口先于 E-25 | wave-1（队列）→ wave-2（E-25）次序成立 | 落地 |
| D-001(i)④ 计数单一来源桥接 | defer-0076 在册 | 落地 |
| D-001(ii) 移交清单 | t34 契约项未吸入本轮（diff 无契约设计物）；owner-side 项未代行（无 tag、无 push）；t32 四候选登记于 closeout handoff（**未提交态**） | 落地（登记随待提交工件落面） |
| D-002(i)-(vii) 队列权威收口 | 测试文件成员级对账/封闭类别集/0082 豁免/无总数断言/0087、0088 未回改/历史计数叙述字节未动/无 derived JSON/AGENTS.md+CONTEXT.md 惯例条款全部在盘 | 落地；**classify() 兜底分支使 undeclared 几乎不可达**（见 F-4） |
| D-003(i)(iii)(v) E-25 形态 | 终态快照、无逐 run 罗列、无 pending 措辞、bound-by + 自证句 | 落地 |
| D-003(ii) defer-0076 桥接行 | presence-condition unfreeze_if、review_at 2026-10-15（pinned-at 注记）、quarterly、E-25 关联 | 落地 |
| D-003(iv) baseline-CI 条款居所 AGENTS.md | AGENTS.md:123 在盘；本轮 T-0 recon 已含公开 CI 状态节 | 落地 |
| D-004(i) 审计自洽条款（含自食） | AGENTS.md:128 在盘；报告重跑表含 run-test-gate 行；本审计表亦含（#7） | 落地 |
| D-004(ii) defer-0077 观察项居所 | 行在册、pending-evaluation、项本体未入轮 | 落地 |
| D-004(iii) ①④⑤⑥ 机械绑定 | ① ci.yml 与套件新增同 commit（wave-1）；④ 无 owner 代行；⑤ 测试文件头列 Bound-by 0084/0086；⑥ pinned-at 注记 | 落地 |

## 4. 双轴评审（code-review skill，两子代理并行 + 审计窗复核）

### Standards

硬性/已复核:
1. `git diff --check 69d35fbe...HEAD` exit 2 — `docs/governance/ERRATA.md:516: new blank line at EOF`（审计窗独立复现）。`but commit` 绕过 pre-commit hook 属结构事实（ADR-0083 D-C），未被拦属预期，但落地物带 whitespace 红是真违规。
2. 裸 SHA 引用（grill-t32 D-001(c) 软约束，advisory）: trend-inventory t33 行 reason 字段 `fc390d5`-anchored 无主语/日期；`.scratch/grill-t33/decision-ledger.md:16` `a92efdf→754e53c` 同。E-25 内的 `a92efdf5`/`754e53c2` 带时间戳，合规。
3. （标准冲突，呈报不裁决）2026-09-04 CI-only 全局令 vs 本仓库 AGENTS.md 制度化的本地门跑（D-004(i)、spec §8）——见 F-9。

判断项（baseline smells，repo 惯例优先后仍成立者）: parity-pin 块在 0080/0081/0082/ci.yml 四处手工重复（repo 每门一 wiring 惯例覆盖，仅记录）；`test/countersign-queue.test.js` 死正则 `RE.oldForm`/`RE.newForm`/`RE.countersigned` 定义未用；`test/adr-0033-wiring.test.js` 头注"convention-existence assertions only — never a numeric count"与文件内既有位置式 toEqual 数组并存的表述过强；`classify()` 兜底分支（见 F-4）；forward-check `/\d+\s*->\s*\d+`` 过宽 + 魔数 `> 89`。

### Spec

缺失/部分:
1. §8 验收门全红——报告已自述，本审计确证（run-gates / run-test-gate 90 / map 再生三者未闭合，E-17 收尾序被授权缺口阻断）。
2. T-9 t34+ 四候选仅登记于未提交的 closeout handoff（四项齐全），deferred-registry 未建行——task book 允许二者择一，随提交落面即闭环。
3. §2/T-4 "skips 7" 声明域复测无轮内证据（F-6）。

跑偏（实现看似正确但存疑）: `test/countersign-queue.test.js:62` `classify()` 兜底 `/^# (ADR-\d+|.)/` 匹配任何带 H1 的文件，`undeclared` 对未来畸形 ADR 形同虚设（F-4）；README 1579/90 计入 3 个红测试的实测值，修红后数字将再漂——已由 defer-0076 建账，可接受。

范围蔓延: 无实质蔓延（E-25 增补的 gate-all/summary 后果句有 baseline 事实源；CONTEXT.md Deferred Registry 段落与 trend 行属 ADR-0033 锚定与 E-17 再生的功能必需）。

核实合规: §2 四声明点/双语同 commit/ci.yml 随套件 commit；§3 E-25 形态与时序；§4 全部子项；§5 defer-0076/0077/T-8；§6 两条款；§7 绑定清单；§1 负向需求全部守住。

两轴小结: Standards = 2 项硬性（whitespace、软约束裸 SHA）+ 1 项标准冲突呈报 + 6 判断项；Spec = 1 项已自述的验收缺口 + 2 项轻微缺口 + 1 项实现疑点，无范围蔓延。

## 5. 过程违规（单独呈报，不代追认）

- **F-1（卫生，硬）** `docs/governance/ERRATA.md:516` EOF 多余空行，`git diff --check` exit 2（审计复现）。
- **F-2（披露缺口）** worktree `docs/rewrite-map.json` 存有 5249 行**未提交**的 reword 前 regen（generated_at 2026-09-29T15:48:35Z=本地 23:48、published_tip `754e53c2`、3654 refs；已提交版仍为 t32 代 3642/`68fb225b`）。报告 --check PASS 行实则依赖该未提交工件，且"当前树 --check 在同步"对全新 checkout 不成立；授权决策（O-1）的标的是"覆盖一个已再生的未提交文件"，与报告字面"等待首次 regen"不同。
- **F-3（披露精度）** t9-run-gates 捕获（00:06，reword 前）另含 `[223 anchoring-footer] FAIL`×3（`430218bec`/`5722c522f`/`88efa2e87`——reword 前的 doc-phase 与波次提交）；报告披露了 reword 修复本身，未披露其由门检出的因果，且 run-gates 行的"current run"混用 reword 前捕获与修复后 footer 状态。重跑 #6 证实该行内容对当前树准确。
- **F-4（spec 意图，前瞻）** `classify()` fail-closed 腿形同虚设（D-002(ii) "undeclared=fail" 对未来文件名义化）；当前 89 份 ADR 分类经 T-1 普查与成员断言独立正确。
- **F-5（软约束）** 新提交散文裸 SHA（F-5 清单见 Standards 2）。
- **F-6（证据缺口，轻）** "skips 7" 声明域复测无轮内记录（grill 期实测已在账本）。
- **F-7（轻）** 死正则 + adr-0033-wiring 头注过强表述。
- **F-8（来源精度，轻）** `bench/research/out/g6-publish-replay.json`（tarball size 420359→439511）在轮次窗口内被 g6-publish 门副作用刷新（t9 相位本地 00:23；本审计 run-gates 重跑再次刷新）——报告"pre-existing modified"措辞低估此节；未提交，内容与当前 439511 字节 tarball 一致（pack-smoke PASS 旁证）。
- **F-9（标准冲突，owner 裁决）** 2026-09-04 CI-only 全局令（禁本地构建/测试，证据只认 CI）vs 仓库制度化本地门跑；本审计按当日明确指令同样本地重跑。裁决权在 owner。

## 6. 返工清单（打回原修复窗口）与 owner 决策项

修复窗口返工（完成后必须重跑第 1 节同一套 7 命令 + gh CI 核验，红态不得自证转绿）:
- R-1 修 `docs/governance/ERRATA.md:516`（去 EOF 空行），`git diff --check 69d35fbe...HEAD` 归零。
- R-2 在报告/closeout 增补 worktree 状态披露（未提交 map regen、trend-inventory 尾行换行漂移、g6 replay 门副作用刷新），或在获授权后随 regen 一并落盘——不得在授权前自行 regen。
- R-3 F-5 裸 SHA 补主语/日期上下文，或登记偏离。
- R-4 `classify()` fail-closed 强化或经账本决策保留时代兜底语义（可入 t34 候选）。
- R-5 清理死正则、修正 adr-0033-wiring 头注表述。
- R-6 补一条 "skips 7" 声明域复测记录（baseline 注记或证据指针）。

owner 决策项:
- O-1 授权（或拒绝）reword 后的 `node scripts/build-rewrite-map.js` 再生 + 后续波次（含 adr-0074 published_tip 再钉与 adr-0079 translation-baseline 再钉 follow-up——与 t32 已披露再钉同类）。**审计窗不代行授权。**
- O-2 裁决 F-9 本地/CI 证据权威冲突。
- O-3 t33 关单时点：R-1..R-6 + 重跑 + 复审后方可声明；现轮按其自述维持红，**不可声明 closeout-green**。

## 7. 审计结论

- 报告可信度: **通过** —— 7/7 可复现行逐字复现，红态自述诚实，无夸大声明。
- D-001..D-004 实现: **通过**（附 F-4/F-6 两个前瞻软点）。
- 轮次验收: **红（确证，维持）** —— 关单被 O-1 授权缺口阻断，属报告如实披露的既定状态。
- 按职责分离与任务协议（审计通过方出交接）: **本轮不出 handoff 文件**。下一步方向记录在案: t34 契约轮（审计再执行面 ⊇ CI test-job 面机械化、清单自 ci.yml 生成、生成器带弱自洽；ADR-0089/0086 pending-confirmation reject 分支预注册含追认窗到期语义；finding-vs-note 标尺）+ closeout 已列四候选（R2-F4 / F-11 / settle-window+advisory 批 / t27-t28 不对称+errata_exemptions 裸 SHA 漂移）。返工+重跑+复审通过后由审计窗补出 handoff。

审计副作用披露: 重跑 #6 使 g6-publish 门再次刷新 `bench/research/out/g6-publish-replay.json`（内容与 t9 相同 tarball 一致）；confirmatory-bench 克隆至 OS 临时目录，产物 unchanged；无其他工作区写入。

> 注（2026-09-30，LOOP-3 补记）：wave-1 依 D-005 仪式做树修复 amend（补 wave-1 精确 rewrite-map，模拟 verifyPublishedOnly=0 errors）并 reword（footer 6→7 文件，工具派生）。旧→新 sha：`77e8bd97`→`1391c662`、`08d810c1`→`3c07e9ed`、`0a5295ee`→`82b03877`（全长度映射见 fix-report Addendum）。正文保留的旧 sha 均为当轮运行时观测值（Expected/Received 等），按审计原样保留；指针性引用已更新。
