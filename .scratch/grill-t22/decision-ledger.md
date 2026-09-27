# grill-t22 — decision ledger

Sole source of settled conclusions for this round. Columns: ID / original question / verbatim answer / normalized requirement / explicit constraints / status.

| ID | Question | Verbatim answer | Normalized requirement | Constraints | Status |
|----|----------|-----------------|------------------------|-------------|--------|
| D-001 | t22 轮对象定夺：二审修复链+处置+残余一并轮 vs 纯二审 vs 残余策略轮（atomcode 调研后修正推荐 a′） | 采纳 | t22 = 修复链二审开场（a8974cd..b93a5df + t21 报告 post-audit 段）→ 发现处置 → 声明 carve-out 携带残余项：repair-window amend-in-place 惯例本轮成文；rc.from 政策家由二审评估顺带定夺；pack-cap 仅登记预注册槽/触发项不碰 cap 本体；新机器（--coverage-base 腿 + rc.from guard）列为审计对象 | carve-out 必须显式声明；pack-cap 修订走自己的预登记通道禁止强并；修复链不得采信自带电池自证态；调研缺口如实记（registry-row 概念映射自变更管理通用实践） | current |
| D-002 | 审计窗位置/范围/衔接：轮外前置+增量 scope vs 轮内 T-0 vs 累积重审（atomcode 修正推荐 a′） | 采纳 | 审计为轮外前置窗口（verifier-profile 独立会话）；增量 scope=a8974cd..HEAD 修复链+被修订工件面（t21 行/ADR-0080 注记/t21 报告 post-audit 段）；锚定 C-1..C-5 修复声明+新机器（coverage 腿/rc.from guard）+两个评估输入（rc.from 政策家充分性、amend-in-place 惯例形态）；报告+交接由 t22 setup commit 吸收；t22 章程写条件式处置槽（按发现类别分支）+零发现分支（退化为纯残余处置轮）；处置完成以审计验证为前置 | 章程禁预设结论——不得命名预期发现/严重度/数量，只许按类别分支；审计窗不得装进 generator 轮任务书（感知独立性）；不得累积重审已确认面 | current |
| D-003 | 修复窗惯例成文载体与正典形状：ADR-0081 单载体 vs CONTEXT-only vs 拆分（atomcode 修正推荐 a′） | 采纳 | 双载体——ADR-0081 载政策（D-A：amend-in-place 正典形，修复窗无行/被修轮行累积 R2 触碰+日期化 reason-note/coverage 腿锚轮基校验最新行/annotate-not-supersede 判据；D-B：rc.from 政策家条件节；D-E：具名 defer-0067 headroom-watch 行）+ CONTEXT 新增独立词条 Repair Window（修复窗口）（定义+引 ADR-0081/0076/coverage 腿+_Avoid 行，t18 D-005 先例形态）；t22 行 adr_added:[0081]/net_additions:1/deferred_entry:defer-0067/zero_product_diff:true | 条件分支：二审判 amend-in-place 形状缺陷→0081 翻转 own-row 正典+checker 重构；defer-0067 细节（触发器阈值/owner/review_at）属执行面；词条非挂 Trend Anchor 条款而是独立术语 | current |
| D-004 | 条件处置槽+收尾形态：全套复用+五细节 vs 简化收尾 vs 处置槽留空（选 a） | a | 章程写五类条件处置槽（登记/披露类→Disclosed Repair+行 backfill；惯例/政策类→成文处置；机器类→t22 行声明 carve-out，重活升级 fix 轮分支写明；nit 类→轮内修；零发现→纯残余轮）；审计 scope 增 defer-0042/0051 second_reviewer 会签槽充任项；审计工件落 .scratch/grill-t21/reports/ 第二份审计件由 t22 setup 吸收；收尾全套（setup 吸收→处置→电池 verbatim 重跑→逐发现销项表 fixed/deferred/converted/rejected-with-rationale→consent-sweep 具名→t22 行全字段 kind:documentation+adr_added:[0081]+net_additions:1+deferred_entry:defer-0067+zero_product_diff:true+carve_out 按实际→facts-canon+report_commit:null）；C-7 两轮回看第一 tick 入 t22 报告 | 处置槽禁预设结论（按类分支不命名预期发现）；槽阈值（重活升级判据）属执行面；审计日期/命名执行轮定 | current |

## Round closeout (2026-09-22 - post-battery, amend-in-place on this ledger)

### Consent sweep

- defer-0004 (generated ci.yml): honestly unmet - check-ci-jobs.txt exits nonzero recording the deferral; valid, no action owed.
- defer-0058 (standing net-increment review): t22 nets +1 ADR - registered via the t22 row (deferred_entry defer-0067, net_additions 1); no sunset trigger fired.
- defer-0066 (capture-harness ratchet): the t22 harness widened the never-commit regex to cover audit2-evidence - a live instance of the shared-leg smell class; the row stays pending-evaluation (the shared-module instance is the registered exit, not met this round).
- defer-0067 (pack-cap headroom watch, new): registered armed - the trigger band was already entered at registration time (the charter commit measured 340258 > 340000); the ADR-0062 D-A / ADR-0071 pre-registered cap-amendment channel is the exit.

Backfill (dated amend-in-place, 2026-09-22, grill-t23 disposition T3-C-2): the sweep above omitted chartered named lines; all states verified stable by direct registry/artifact reads, added here in place:

- defer-0060 (CI gate-all channel permanently red - B64 corpus secret + 403 required-check, repository-admin surface): pending-evaluation, review_at 2026-12-15; untouched this round except its own rationale compression under the R2-C-1 registry-row tightening.
- defer-0064 (build-round-facts collect() red-suite -> exit-2 conflation): pending-evaluation, review_at 2026-12-15; untouched, no action owed.
- defer-0065 (build-round-facts --report bare-arg asymmetry): pending-evaluation, review_at 2026-12-15; untouched, no action owed.
- sunset counter (docs/governance/sunset-counter.json, ADR-0075 D-C): consecutive_zeros = 1 of n_target 6, unchanged - no quarterly check-in fell due inside this window; no reset, no missed check-in, activation null.
- never-commit set (.scratch/*/audit*-evidence/ incl. the widened audit2-evidence class, *.patch, round-commits.txt): present only as untracked working-tree files; none entered the commit surface (clean-tree leg verdict CLEAN).

### Per-finding closure (audit-r2 R2-C-1..R2-C-4)

- R2-C-1 (material) -> repaired + disclosed: packed-surface compression (registry prose rows + thresholds _doc* trims + CONTEXT term tighten) restored headroom under the ADR-0039 D3 cap - measured 340258 -> under cap, verified by the pack-smoke leg; the cap value is untouched per the charter negative union; the two stale baseline claims carry Disclosed Repair markers; defer-0067 stands armed.
- R2-C-2 (nit) -> repaired: Disclosed Repair precision marker on the t21 report honest-state line; the C-5 row already carried the corrected count.
- R2-C-3 (machinery nit) -> repaired: --coverage-base unresolvable ref now exits 1 with a keyed FAIL (no uncaught stack); pinned in adr-0081-wiring + the verbatim coverage-badref leg.
- R2-C-4 (record defect) -> repaired: defer-0051 rationale + ADR-0071 status line reconciled in place (the grill-t14 discharge is the record of truth; the audit re-verified the arithmetic).

### Charter adjudications settled (evaluation inputs)

- (a) rc.from needs no separate policy home - conformance to ADR-0080 D-B; recorded in ADR-0081 D-B with the drift trigger.
- (b) amend-in-place repair-window shape SOUND - own-row flip branch recorded unfired in ADR-0081 D-A; the three boundary properties recorded as adjudicated non-defects.
- (c) defer-0042 countersign landed weak-independent (recorded via last_check_in); defer-0051 was already discharged - prose reconciled.

### ADR-0027 checklist

- ADR-0081 + defer-0067 + all registry edits + the t22 trend row + anchors resync landed in one commit (rqx) - same-commit registration coupling satisfied.
- Wiring: adr-0081-wiring.test.js carries the round pins; adr-0033 seed inventory extended; record-count assertions resynced to 81 records; ci.yml + parity pin advanced by one suite; README count lines synced; zh-CN baseline re-pinned per the D6 second-step rhythm.

### C-7 two-round lookback

- Tick one of two (t22): committed prose holds split-form evidence counts (this report + the audit-r2 report both write the capture/fixture split). Convention held; tick two is grill-t23's checklist item.
