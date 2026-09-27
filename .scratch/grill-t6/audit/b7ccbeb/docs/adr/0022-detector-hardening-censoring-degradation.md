# ADR-0022: Detector Hardening (Length Caps, Censoring Semantics, Degradation Contract)

- Date: 2026-08-27
- Status: Accepted
- References: ADR-0010 D4 (profile × severity strategy), ADR-0013
  (idempotency + evidence integrity), ADR-0015 D2 + ADR-0019 D5
  (pre-registered beat-b2 gate), ADR-0018 (calibration flywheel), ADR-0019
  (suppression rules + judge seam; truncated-seam concept), ADR-0021
  (rescue-dominant trust direction, weak witnesses escalate-only),
  ADR-0006 Fix1 (locality break reprotect hook dishonesty)

## Context

审计轮移交的 5 条遗留债务里，「detector 健壮性回归线」的触发条件最
早成熟：hook 已在热路径（5-10s 超时，transcript 可达 MB 级），而
detector 入口没有任何输入长度门限。这带来两个已证实的产品事故源：

1. `paginatedEnumerationSupports` 里 `Math.max(...pages.slice(0,-1))`
   的 spread 参数在 pages 数组超长时抛
   `RangeError: Maximum call stack size exceeded`——单点崩溃。
2. 整份 transcript 被拿去做词表/结构化正则扫描：输入空间 × 扫
   描复杂度的乘积在 5-10s 窗口内不可控，超时门打满就静默放行——这与
   ADR-0006 Fix1 里「把 [] 字符串长度当非空证据」是同型 locality
   断裂：hook 不知道 detector 没扫到，判决门不知道证据是 partial。

Grill 一圈后结论：此类输入上限问题不是 detector 独有的 bug，而是
「感知降级（perceived degradation）」这一类事故的个别表象——截断、
超时、scan-skip、host-side payload 裁剪都同属一个语义家族。

Research（atomcode，2026-08-27，16 源）给出三条收敛证据：

1. **统计学**：cut-off 型截断（truncation）= 选择偏差不可处理；
   censoring（右删失）= 仍可入模（Uᵢ, δᵢ）——必须把「部分可见」升
   级的半删失进化为完整删失（含 bytes_seen / bytes_total /
   threshold）。
2. **工业惯例**：OPA `partial`、XACML `Indeterminate + reason`、
   OTLP `partial_success + rejected_*`、AWS Bedrock 分块、Meta
   Llama Prompt Guard 分窗——无一主流产品静默截断。Azure 未声明
   1024-char 截断是实证事故源。
3. **对抗维度**：arXiv 2605.23196 Prompt Overflow 实证守卫对超长
   输入的分窗盲区是攻击向量；截断点本身可操控，verifier 必须
   fail-closed on coverage。

## Decision

### D1 — 单层 64 KB 输入门限，detector 入口统一执行

`detectFull(signalInput)` 对 `closingText`、每个
`toolResults[i].output` 分别截断到 ≤ 64 KB（UTF-8 codepoint 完
整）；同时保留 marker 字符串，让后续检测输出知道「段末是截断
面」。这 D1 设计记录，不是同一个常数重写四遍。顺序说明：**先**
**截断后 normalize**（normalize 见 ADR-0014）——流程顺序固定，fixture
断言钉死，避免 NFKC 在劈裂字符上出错。

### D2 — `Math.max(...pages)` 改为 reduce + pages 数量 cap

`Math.max(...pages.slice(0,-1).map(pg => pg.length))` 一句替换为
`pages.reduce((m, p) => Math.max(m, p.length), 0)`；新增加边界
`pages.length > 4096 ⇒ 视为不可判，放弃耗尽对判断（不进 conviction
通路）`。单点修复，无新依赖。

### D3 — Censoring 元数据，不是裸 bool

`truncated` 升级为 `{ truncated: true, bytes_seen, bytes_total,
threshold }`。原因：它让「被截断」声明在统计上成为 right-censored
样本（ADR-0018 校准飞轮可分桶、可卸出主语料）。裸 bool 只声明事
件、不声明量，等于半删失——无法区分「10 MB 被截到 64 KB」与「1 KB
diff 精准紧固」。

### D4 — Coverage 与 severity 正交，gate profile 分流

detector 输出新增 `coverage: 'full' | 'partial'`（由 D3 元数据推导
而来）。**severity 按可见部分正常判（不通胀升降）**。政策在 gate：

- verifier（blocking）profile：`coverage:partial` ⇒ 路由
  ESCALATE（fail-closed on coverage）
- generator（advisory）profile：仅注记，不立刻改 severity

决策加热：XACML Indeterminate「缺属性 → 重试」语义：缺证据不该发
adverse opinion；同时对齐 ADR-0021 救援主导信任方向——弱证据（看
不到的指针）把决策层升级，不把 severity 升级。

### D5 — 统一 `degradation` 契约（一个字段、枚举类）

detector 输出新增顶层字段：

```
degradation: {
  kind: 'truncation' | 'timeout' | 'scan-skip' | null,
  detail: <censoring metadata for truncation; other per-kind detail for future kinds>
}
```

`coverage` 是它的派生（`degradation.kind !== null ⇒ coverage =
partial`）。选择理由与未来变更成本：每加一类降级（典型的如超时
静默放行、未来如 host-side 裁剪）只加 enum 值，不改 schema，gate /
calibration / CONTEXT.md / 测试矩阵都保持 O(1)。

### D6 — 预注册统计路由，不进 beat-b2 / Platt / Platt-Kappa 主语料

截断类 verdict 是**预注册的新类别**（ADR-0019 精神）：

- bench harness 新增「truncation-twin」桶：清洗整个 corpus 子
  集，其期望表现为先预注册再跑
- Platt/ECE/κ 主语料明确排除 truncated 样本（画质 partial-view
  vs full-view ground-truth 的不匹配对会毒化校准）
- 校准飞轮对 truncated 单独分桶做 explain（如果未来真进入行程
  分析）

### D7 — 验收与回归

1. `Math.max` 改 reduce、`detectFull` 截断实现、degradation 契约、
   gate 分流、bench 桶——全部在同一个 PR/commit 里落地
2. 新增 3 条对抗 fixture（回归）：
   - 10 MB 合法 transcript ⇒ 完成时不超时、不 crash、声明
     `truncated:{bytes_seen=64KB,...}`、`coverage:partial`
   - 8001 层 pages shape ⇒ 不 crash RangeError，正确进入预注册路径
   - 超过 threshold 的 closingText ⇒ marker 与 degradation.kind 断言
3. 步条整体 jest 保持 196 PASS（新增 fixture 不打破原有）
4. `npm run check-drift` 与 twins 全绿；beat-b2 门不变
5. CONTEXT.md 新增 3 术语（见下）、README ADR 计数 21 → 22

## Consequences

**积极**：静默放行漏洞对 Prompt Overflow 类攻击关闭；校准飞轮获得
可处理的删失数据；degradation 有机会成为未来所有感知降级事故统一
表述，避免 ADR-0006 Fix1 型 locality 断裂。

**消极/边界**：verifier 的 `coverage:partial` 会增加 ESCALATE 的频
率——如果 hook 本身设了太小的 stdin cap，verifier 可能频繁升级。
当前 base 为 64 KB ≈ 2000 个正常 turn；真正的宽门限问题由
ADR-0018 校准飞轮治理，而不是变更 D1 常数。

**不做**（显式记录，避免翻烧饼）：(1) recheck 静态 ReDoS 扫描——词
表已被转义、无嵌套量词，收益 ≈ 0；(2) 全部正则上 sandbox / worker_detached 线程——hook 5-10s 超时本就是边界，不应套起重隔离；
（3）detector 拆分——ADR-0019 已定「加深不拆，detect() 窄接口」，
本轮加固不改变此结论。
