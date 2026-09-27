# Q7 处置提案 — 重认证暴露的既存非符合 (2026-09-12)

- 依据: D-006 (current, 采纳 B)；atomcode 调研（21 检索 / 10 全文核验）
- 对象: `bench/polygraph/results/reverify-20260912.json` (conclusion=fail) 与 `src/instrument-state.json` (quarantined)
- 状态: **提案（需人工拍板/签署）**；代理未自签、未回滚

---

## ① 统计重新定性（不改变已登记的 verdict，而是把处置强度对准根因）

### 已登记事实（项目自有规则）
- 规则: `ilac-g8-guarded-acceptance` v0049.1, w=1, k=2, spec_limit=0.10
- 实现: `pass` iff flip_rate <= spec_limit - w·u；`conditional` iff flip_rate <= spec_limit；否则 `fail`（u = CI 半宽）
- 观测: k=3, n=22 → p̂=0.13636；Clopper-Pearson 95% CI=[0.029055851, 0.349122097]；u=0.1600；acceptance_limit=-0.0600
- 判定: p̂ (0.1364) > spec_limit (0.10) → **fail**（与上次通过条目 seq2 指标逐项一致，delta=0）

### 样本量分析（Clopper-Pearson，w=1, k=2, spec=0.10）

| 真实/观测 flip 率 p | n=22 | n=50 | n=100 | n=200 | n=400 |
| --- | --- | --- | --- | --- | --- |
| 0.03 | conditional | conditional | **pass** | pass | pass |
| 0.05 | conditional | conditional | **pass** | pass | pass |
| 0.08 | conditional | conditional | conditional | conditional | conditional |
| 0.10 | conditional | conditional | conditional | conditional | conditional |
| **0.136（本观测）** | **fail** | fail | fail | fail | fail |

### 结论（关键）
1. **在 p̂=0.136 下，任何样本量都无法通过** —— point estimate 超出 spec_limit，护栏验收永远不会 pass。故非符合**不是样本量伪影**，是真实的仪表质量（或判据限值）缺口。
2. **可通过的前提**: flip 率降到 ≲ 0.05 **且** 样本增至 n ≳ 100（n=100 时 u=0.0482，acc_limit=0.0518）。
3. **spec_limit=0.10 是严格「必须低于」阈值**: p=0.10 时全 n 均为 conditional，永无 pass。
4. 因此处置必须对准 (a) 仪表质量 与/或 (b) 判据限值，并同时 (c) 修订采样计划。

## ② TOST 无回归论证（把「零变化」变成正向证据）

- 本变更的唯一 identity 轴改动 = src/SKILL.md 措辞；as-found 指标与上次通过条目**逐项相同**: `delta_vs_previous = {invocations:0, overrides_accepted:0, fail_soft:0}`
- TOST: 预定义等效边界 ±δ（建议 δ=0.05 于 flip 率），观测差异恰为 0 → 0 ∈ [-δ,+δ] → **等效成立**（非仅「未拒绝原假设」）
- 结论: **本次提示词变更在 judge-twins 评估面上可证为零回归**
- **必须声明的局限（诚实）**: judge-twins 评估路径是确定性的（逐条结果跨运行完全一致），本次未观察到任何 provider 调用；因此 TOST 建立的是「**已评估面上无回归**」，不等于「提示词无行为影响」。后者需一个真正驱动 SKILL.md 提示词的 eval 面 —— 列为**声明缺口**，不在本轮范围。

## ③ 判据 / 采样计划修订提案（走 criteria-change 正式通道，禁止事后改限）

> 铁律（FDA/BioPharm 明文反模式）: **禁止为了「让既存数据通过」而反向修订判据**。以下修订的合法性建立在「**采样计划不可操作**」与「**缺少 indeterminate 态**」两个结构性缺陷上，与本次观测值无关。

**R1 采样计划修订（结构性缺陷）**
- 现状: n=22（flip-eligible）→ u=0.1600，护栏带宽 w·u=0.1600 已**吞掉整个 spec_limit 0.10**，acceptance_limit 变为负数 —— 规则在小 n 下结构性不可通过
- 提案: 采样计划目标 **n >= 100 flip-eligible**（附功效论证: p_target=0.05 时 n=100 → u=0.0482，acc_limit=0.0518 > p̂，规则可操作）
- 注: 这是「让规则可操作」，不是「让数据通过」

**R2 引入 indeterminate（样本不足）态（结构性缺陷）**
- 现状: 规则只有 pass/conditional/fail 三态，**无「证据不足」态** → 小样本被归入 fail，处置强度错配一个数量级
- 提案: 新增 `indeterminate`（当 u >= spec_limit - w·u，即护栏带吃掉限值、规则不可操作时），语义 = 「未能证明符合」而非「确认不合格」
- 对应业界: FDA OOS 的 inconclusive、ARRIVE 低功效研究、ISO/IEC 17021 的「暂停待纠正」

**R3 仪表质量 CAPA（非判据）**
- 观测 flip 率 13.6% > spec_limit 10% → 真实缺口
- CAPA 目标: flip 率降至 <= 0.05（对应 R1 的 n=100 可 pass 区）
- 在 CAPA 关闭前，spec_limit **保持不变**（不降低、不提高）

**R4 变更控制纪律**
- R1/R2 属 criteria-change 面（docs/change-surface.json: threshold -> criteria-change），必须与 ADR 同提交（ADR-0027）
- 需记录「考虑过但未采用的判据」（NIST AI RMF Measure）与统计论证依据（FDA PV 指南）
- 与任务书预告的下一轮 grill 方向「Decision-rule change-management policy（谁可修订预注册门）」合并处理

## ④ 条件性认证 + CAPA 草案（需人工签署，代理不自签）

**建议处置组合（按调研对比矩阵）**: 条件性认证（主通道）+ 让步接收（限期限量）+ 分级放行（收窄再验证范围）+ 追溯审查（仅作证据）+ 判据修订（R1/R2）

| 项 | 草案 |
| --- | --- |
| 认证状态 | 由 quarantined → **conditional**（需先实现 R2 的 indeterminate 态与 signoff 通道；当前 CLI 无此路径） |
| 期限 | 必带到期日（参照 CAMA 60 天 / CMMC 180 天；建议 90 天） |
| 监控 | 每周期重跑 reverify；flip 率趋势上报 |
| CAPA | R3（仪表质量），带有效性检查 |
| 复审 | 到期或 CAPA 关闭时复审；**禁开放式让步** |
| 签署 | 人工（reviewer id）；代理不得自签 |

**当前 CLI 的差距（诚实声明）**: `scripts/instrument.js` 仅有 authoritative / quarantined 两态 + pass/conditional/fail 三 conformity 态，**无 conditional 认证态**。因此 ④ 在现有代码下**不可直接执行** —— 需先落 R2（indeterminate 态）与一个 conditional 认证路径。这是本轮**无法就地解除 quarantine** 的技术原因。

## ⑤ 未决 / 需你拍板项

1. R1/R2 判据修订是否本轮就落 ADR 草案（还是开新轮次）？
2. R3 的 flip 率目标（0.05）与 CAPA 期限（90 天）是否认可？
3. 若认可，是否授权我继续（a）起草 criteria-change ADR 草案、（b）实现 indeterminate 态 + conditional 认证路径（含测试闭环）？
4. 未拍板前，instrument 保持 quarantined（fail-closed）；回滚命令: `node scripts/instrument.js --rollback`
