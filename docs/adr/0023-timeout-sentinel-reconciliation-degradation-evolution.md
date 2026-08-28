# ADR-0023: Timeout Degradation via Sentinel Reconciliation and Degradation Schema Evolution Discipline

- Date: 2026-08-28
- Status: Accepted
- References: ADR-0007 (hash chain), ADR-0012 (hook idempotency), ADR-0013
  (cross-turn chain), ADR-0018 (calibration flywheel), ADR-0019 (judge
  seam), ADR-0022 D4/D5 (degradation contract + coverage routing)

## Context

宿主对 hook 有硬 stdin 超时（约 1s 无数据即强杀）。ADR-0022 D5 在
degradation 契约枚举里预声明了 kind='timeout'，但没有任何产出方—
—被杀的 hook 无法在进程内报告自己的死（SIGKILL 不可捕获，是工业
界与高可靠文献的多源共识）。verifier 因此对「上一轮 hook 死亡」处
于静默黑洞——这正是本项目（第二方外部验证器，最坏情况求最坏情况
下的最小可信）最忌讳的静默失效。

同时审计发现 evidence-log 把未识别 kind 静默归一为 null——契约预
声明 timeout、实现先吞未知 kind，第一个新增 kind 落地时就会踩中。

Grill 结论（atomcode 两轮调研，2026-08-28，共 34+ 次查询、25+ 篇一
手原文核验）：

1. **学术**：crash-only software（Candea & Fox, HotOS 2003）
   「stop=crash, start=recover」直接背书「下轮启动对账补写」；
   SQLite hot rollback journal 提供「文件存在性即证据」先例，且
   rollback journal 本身就是无 WAL 的 crash-safe 方案——不违反
   ADR-0022「不做 WAL」的决定。
2. **心跳无消费主体**：Chandra-Toueg 失败检测理论下 heartbeat 的
   价值在于「有人据此执行动作」（systemd 杀进程、ZK 租约删节点、
   Airflow 判僵尸）；宿主已保证 1s 必杀，判死活被宿主接管，周期
   心跳在本系统无人消费。
3. **阶段归因被工业界反复证明有消费主体**：K8s terminated.reason、
   Healthchecks.io start/success/fail、systemd READY/STATUS；反例
   （Celery track_started 默认关闭、Airflow #28116 归因不落库）
   证明「没有消费规则的遥测会烂掉」。
4. **schema 演进**：{kind, detail} 即工业标准判别联合（serde
   adjacently tagged 的字面同构、Smithy union 的语义同类）；演进
   三铁律（只加 kind、detail 只加可选字段、禁删禁改名）+ 未知
   kind 显式回退（Smithy unknown variant / RFC 9457）+ 机器校验
   （JSON Schema oneOf+discriminator，测试期使用）。

## Decision

### D1 — Per-hook sentinel，统一 helper，下轮对账补写

每个 hook 脚本入口一行 sentinel.begin(hookName)，正常完成一行
sentinel.end() 删除。下轮（任一）hook 启动发现残留 sentinel ⇒ 经
evidence-log 补写 detector 记录 degradation { kind:'timeout',
detail:{ hook, turn, phase, orphaned_at } }，coverage=partial 自动
派生，verifier fail-closed ESCALATE 复用 ADR-0022 D4 既有路由，不
新增门。实现集中在 src/ 单个小 helper，7 个 hook 各一行调用。

### D2 — 阶段 intent，不做周期心跳

sentinel 结构 { turn, started_at, phase, phase_at }，phase ∈
stdin|scan|verify|write。创建时 fsync 一次保证「存在性」耐久；阶
段转换对 fd pwrite 覆盖、不逐次 fsync（SIGKILL 不丢 page cache；
断电丢的只是阶段细节，kind 仍可判——先定义耐久预算再定 fsync 频
率，Redis everysec 同构）。**显式不做运行中周期心跳**：1s 预算内
10-20 次周期写会与热路径抢时间片，且无消费规则（YAGNI）；若未来
宿主超时值可变、或需要阶段内进度归因，再重估。

### D3 — phase 的三个已注册消费规则

1. phase=scan 死亡 ⇒ 与 scan-skip 同族（ADR-0022 D5），verifier
   可标注「扫描预算耗尽」；
2. phase=verify|write 死亡 ⇒ partial 输出的信任边界收缩（死在
   write 中 = 撕裂嫌疑，可触发完整性复查）；
3. 校准飞轮（ADR-0018）按 phase 对 timeout 样本分桶。

**新 detail 字段必须带注册消费规则才准入**——防「遥测烂掉」反模
式（Celery / Airflow 实证反例）。

### D4 — 未知 kind 显式 fail-closed 回退

evidence-log 归一时不再把未识别 kind 静默归 null：识别范围外的
kind 置 null 的同时把原值保留到 detail.unrecognized_kind；
coverage 仍置 partial ⇒ verifier ESCALATE 不受影响，归因信息不
丢。即 RFC 9457「未知 type 优雅回退」与 Smithy unknown variant
的本地实现。

### D5 — 演进三铁律 + 注册表 + 机器校验

演进纪律：**只加 kind 枚举值；各 kind 的 detail 只做可选字段加法；
禁删、禁改名、禁改既有 kind 的 detail 结构。** 本 ADR 后部维护
kind↔detail 注册表（见「Registry」）。机器校验：新增
schemas/degradation.schema.json（JSON Schema，oneOf+discriminator
风格），仅在测试期对 fixture 断言使用——不进运行时、不引入运行时
依赖。

### D6 — 验收与回归

1. sentinel helper + 7 hook 接入 + 对账补写同 commit 落地；
2. fixture 测试：伪造残留 sentinel ⇒ 产出 kind=timeout 记录且
   hook/phase 正确；未知 kind 输入 evidence-log ⇒
   unrecognized_kind 被保留且 coverage=partial；
3. jest 在 205 基线上只增不减；check-drift / twins / truncation
   全绿；
4. CONTEXT.md +3 术语（Sentinel Reconciliation / Phase Intent /
   Schema Evolution Discipline）；README ADR 计数 22 → 23。

### Registry（kind ↔ detail，随契约演进维护）

| kind | detail（全部字段 optional 除注明） | 消费规则 |
|---|---|---|
| truncation | truncated:true（必填）, bytes_seen, bytes_total, threshold | ADR-0022 D3/D4：分桶 + fail-closed coverage |
| scan-skip | scans[], pages_seen?, ... | ADR-0022：放弃耗尽配对 / 词表缺席的明示 |
| timeout | hook, turn, phase, orphaned_at | 本 ADR D3 三条 |

## Consequences

**积极**：证据链补上最后一个静默黑洞——hook 死亡从此是必然留证的
（最差也是下轮补写）；phase 给校准飞轮与信任边界提供归因；契约演
进有了机器可校验的纪律，ADR-0022 声明的「扩展只加 enum 值」有了
执行保障。

**消极/边界**：断电 vs 超时不可区分且**无需**区分（对 verifier 处置
相同）；sentinel 残留到补写之间有一轮延迟——hook 死亡的审计可见
性是「下一轮启动时」，不是即时的。

**不做**（显式记录，防翻烧饼）：运行中周期心跳（无消费主体）；
sentinel 加密/签名（与证据链同威胁面，哈希链已覆盖篡改检测）；
hook 死亡即时告警（宿主 console 已是渠道）；sentinel WAL 化/队列
化（crash-only 定位，rollback journal 先例）；
