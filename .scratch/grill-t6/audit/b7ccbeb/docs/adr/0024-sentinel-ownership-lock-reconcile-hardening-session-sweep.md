# ADR-0024: Sentinel Ownership via File-Lock Arbitration, Reconcile Hardening, and End-of-Session Sweep

- Date: 2026-08-28
- Status: Accepted
- References: ADR-0022 D4/D5 (degradation contract), ADR-0023 (sentinel
  reconciliation, phase intent, schema discipline), ADR-0013 (evidence-log
  idempotency keys)
- 措辞更正：ADR-0023 D4 把「未知 degradation 值保留原值」归于 RFC 9457，
  实为措辞不当——RFC 9457 对未知扩展的语义是 fail-open「MUST ignore」；
  「保留原值」的正确出处是 protobuf 未知字段与 Smithy unknown variant
  开放枚举心智。此更正随本 ADR 记录，不回改 ADR-0023（ADR 不可变）。

## Context

ADR-0023 落地后审计留给协议层的三个未决项：sentinel 无归属判定
（并行会话同名 hook 的残留会被误对账）、reconcile 扫掠有双进程竞态、
终局盲区（最后一次 hook 被杀且会话结束则永不留证）。Grill 两轮
atomcode 深度调研（2026-08-28，40+ 次查询，flock(2)/proc(5) 手册、
Chandra-Toueg CT96、Candea-Fox HotOS 2003、Kleppmann fencing、etcd/
ZK/K8s lease、Azure Idempotent Consumer、Kafka offset 原子提交、
Airflow zombie reaper/PR#10729、K8s finalizer #121828、PostgreSQL
WAL redo、SQLite hot journal、systemd ExecStopPost、Claude Code 与
Codex 官方 hooks 文档全部一手核验），结论：

1. **归属判定**：工业界唯一无三种经典误报（pid 复用、时钟偏差、进程
   挂起）的本地模型是内核文件锁裁决——flock/OFD「进程死亡（含
   SIGKILL）必然释放锁」是内核保证，判定确定性而非启发式（SQLite
   hot journal、etcd ephemeral node 同族）。pidfile 探测被双方文献
   判死刑（perfec.to Stale Pidfile / yakking「用锁文件代替 pid
   文件」）；心跳在本架构无消费主体（ADR-0023 已定）。
2. **对账扫掠**：本副作用幂等（`_idem=sha256(sentinel|hook|
   started_at)` 稳定业务键），幂等副作用下互斥是过度设计
   （Vitillo：worker 幂等则无需 leader；Azure/Kafka：正确性交给
   仲裁端而非应用内互斥）。rename 抢占标记在 flock 模型下冗余——锁
   随 fd/inode 不随路径名，rename 不释放持有锁；且 Windows rename
   无 POSIX 原子语义。真正 bug 在别处：evidence-log append 是整文件
   read-modify-write，两个对账方处理不同残留时互覆盖丢证据——这是
   跨残留丢失更新，与扫掠无关但同轮必修。
3. **终局盲区**：理论上本质不可消除只能转移（crash=停止执行，自杀
   悖论；CT96 证明失败检测必须外部化）。工业界无第三种形态：PG/
   SQLite=下次启动恢复；systemd ExecStopPost/kubelet=外部观察者。
   2026 关键事实：Claude Code 与 Codex 均已暴露 SessionEnd hook
   （Codex 预算 3s、Claude Code 1.5-60s），官方明言「some signals
   kill the process before the hook can run — defense in depth」。

## Decision

### D1 — 归属判定：sentinel fd 持锁，reconcile try-lock 裁决

sentinel.begin 持有 sentinel 文件的排他锁直至 end/unlink（锁与文件
同生命周期，fd 即所有权）。reconcile 对每个残留先 try-lock：
得手 = 持有者必死（内核保证），可走既有补写+unlink；不得手 =
并行活进程，原样保留跳过，不产任何记录。实现层采用现成轮子做
跨平台文件锁（proper-lockfile / fs-ext 族评估择一），不引入常驻
进程。锁的失败（不支持文件系统）降级为现状行为 + detail 标注
ownership:'unchecked'，绝不因此阻塞 hook（best-effort 不变量）。

### D2 — 扫掠保持无锁；修 append 竞态 + unlink inode 校验

不新增全局 reconcile 互斥锁，不引入 rename .processing。两条修补：
(a) evidence-log append 加窄锁——仅包裹「读链+去重+追加+写回」的
毫秒级临界区，限对账路径，进程死亡自动释放，无全局阻塞点；
(b) reconcile unlink 前做 fstat-vs-stat inode 校验，防「unlink 到
并行进程新建的同名新 inode」（SO 17708885/Ruby-Forum 实证竞态）。
幂等键继续承担同残留双处理的去重收敛。

### D3 — 终局三层纵深：基线对账 + SessionEnd sweep + 盲区记录

1. 基线（不变）：终局残留由下轮会话首次 hook 的 reconcile 补写，
   `_idem` 保证与任何重复对账收敛；
2. 增补：hooks 注册表增加 SessionEnd 事件，跑一个复用
   sentinel.reconcile() 的薄 sweep（纯同步 fs 调用，远低于宿主
   预算：Codex 3s / Claude Code 1.5-60s）；宿主不暴露 SessionEnd
   或超时未触发时静默跳过（优雅降级，非依赖）；
3. 残余盲区显式记录：宿主进程被 SIGKILL/断电时 SessionEnd 亦不
   触发，此时证据可见性仍为「下次会话启动时」——接受并文档化，
   与 PG/SQLite crash recovery 同构。

### D4 — 显式不做项（防翻烧饼）

不做：watchdog/守护进程（无限回归，「watchman 的 watchman」，终端
总需一个被信任的观察者——我们选下轮对账 + 宿主）；全局 reconcile
互斥锁（热路径串行化，幂等下纯浪费）；rename .processing（flock
模型冗余 + Windows 语义坑）；pid 存活探测（pid 复用误报族）；周期
心跳（ADR-0023 D2 已定，此处重申）。fencing token 不采用：系统内
无共享资源写需要防旧主复活改数据，哈希链已提供等价完整性。

### D5 — 验收与回归

1. 单测：活进程占锁时 reconcile 跳过不产记录；持锁进程 SIGKILL
   后锁释放可补写；append 窄锁下并发对账不丢记录（并发 fixture）；
   unlink inode 校验拦截同名替换；
2. e2e：hooks.json/adapters 注册 SessionEnd 后，宿主正常退出触发
   sweep；不触发时零副作用；
3. jest 全绿（211 基线只增不减）、check-drift / twins 绿；
4. CONTEXT.md +3 术语（Sentinel Ownership Lock / Append Critical
   Section / Session-End Sweep）+ ADR 索引；README ADR 计数
   23 -> 24。

## Consequences

**积极**：并行会话场景（用户常态工作流）的证据链完整性从「理论窗口」
升级为内核保证；append 竞态这个真实数据正确性 bug 被修掉；终局可见
性从「可能永远」收窄为「仅宿主强杀」；所有「不做」有了审查记录，未来
评审不会重提 pid 探测/心跳/全局锁。

**消极/边界**：锁引入一个跨平台实现依赖（现成轮子，但其 stale 检测
缺口的缓解依赖 _idem 兜底）；append 窄锁让对账路径多一次毫秒级串行；
SessionEnd sweep 在双宿主预算内只能做文件工作——不得在此执行网络
或长流程。

