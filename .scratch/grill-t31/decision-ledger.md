# grill-t31 decision ledger

Round object: SCED trial harness single-object round (a') — JL evaluator + telemetry collector + frozen task battery + owner runbook + P0 item-0 mechanized self-check. The agent-buildable remainder of the first external effectiveness trial (ADR-0087 / t30 D-003); execution stays owner-side.
Anti-loss rule: every confirmed substantive conclusion appends a record here before further descent.

## Records

## D-001 — 轮对象：SCED 试效 harness 单对象轮（a′）

- **原问题**: Q1′ — t31 轮对象取形：a′ SCED 试效 harness 单对象轮（(i) JL evaluator 谓词→纯函数+映射表冻结提交；(ii) telemetry collector/normalizer→capture store+行级溯源；(iii) A/B/C 卷任务电池+埋针与 evaluator 同轮冻结；(iv) owner runbook；(v) P0 item-0 机械自检；显式 defer b settle-window 腿 / c bypass 硬化 / d polygraph 附录）/ b settle-window 机械化 / c 对抗性 pending-confirmation+pretool-guard 绕过类硬化 / d polygraph 附录准备 / f 其他。
- **原回答原文**: 「采纳」（采纳 a′）
- **规范化需求**:
  (i) JL evaluator：bench/codebuddy-trial/judgment-lines.json 五谓词逐一映射为纯函数 evaluate(events, taskContext) -> hit|miss|indeterminate；谓词-id→函数→语义注释的映射表随本轮冻结提交，注释声明「机械转写、零解释自由度」；谓词覆盖不到的观测输出 indeterminate + deviation record，evaluator 禁自行消歧（CASRAI/OSF 惯例机械化）；
  (ii) telemetry collector/normalizer：读 .jiahao-instructions.jsonl / .jiahao-pretool.jsonl / .jiahao-evidence，归一化为 capture store（phase, task_id, event_type, sha256, timestamp）；每条 capture 可回指原始 jsonl 行（sha256+行号指针，grill-t20/21 约定延伸）；phase 标签是 run 级后贴元数据（切相由 runbook 显式登记），collector 只做归一化+溯源，不裁决；
  (iii) 任务电池打包：A/B/C 卷具体题面+埋针按 task-volumes.md 四类契约（C1 隐藏失败修复 / C2 多文件重构 / C3 测试修复循环 / C4 文档审计综合）落地，必须与 evaluator 同轮冻结提交（事后补写=SCED 退化为 case study）；居所=注册面；
  (iv) owner runbook：人机边界操作清单——切相指令、P0 item-0 自检触发与记录、capture 归档路径、deviation 上报格式；agent 只报告状态不发裁决；
  (v) P0 item-0 机械化：deny-probe→.jiahao-pretool.jsonl 断言 + InstructionsLoaded 双 sha256→.jiahao-instructions.jsonl 断言，做成 evaluator 第 0/1 号自测用例——「self-check gate」不得停留在 prose convention；
  (vi) 显式 defer（附理由）：(b) settle-window 机械化腿→排队 E-19 线后续轮；(c) pretool-guard 绕过类硬化→等 trial 真实 bypass 数据导出清单（hacker-fixer 顺序：先暴露后硬化，试跑前硬化污染 JL-5 自变量）；(d) polygraph 附录→维持 D-003 降格位。
- **显式约束/负向需求**:
  - 禁 evaluator 重释/消歧冻结谓词——映射表冻结+indeterminate 显式输出+歧义进 deviation record
  - 禁把 (c) 硬化捎进本轮——试跑前硬化改变自变量、抹掉 JL-5 跨相条件事件结构（atomcode 裁决的直接理由，非「硬化不重要」）
  - 禁 battery/needle 文本在 trial 数据产生后补写——电池与 evaluator 同轮冻结提交
  - 禁 phase 标签进事件级——事件级只有时间戳，切相是 run 级元数据由 owner 登记
  - 禁 collector 做裁决——归一化+溯源为止
  - 禁 capture 无溯源——每条可回指原始 jsonl 行（sha256+行号）
  - 禁本轮出「效果」数字或代跑 trial——执行三相属 owner 动作（protocol.md Boundary 条款）
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-002 — run 级元数据与相位归属：run-manifest + 成员制归属 + orphan 硬错误（α′）

- **原问题**: Q2′ — run 级元数据载体与相位归属机制终稿：α′ run-manifest+成员制归属+orphan 硬错误（open 写 phase/volume/planned_task_ids/opened_at/host_version/bundle_sha/schema_version；close 写 closed_at/sealed/observed_session_ids/task_tally 封存不可变；归属=session∈observed_session_ids 成员制、时间戳交叉校验、评估时 read-time join 不回写 evidence log；orphan=终态硬错误拒出判定线；单开窗口+spans_boundary 排除回插控制；ingest 校验 ISO-8601-UTC+ts 单调断言；session_id 生命周期实测入 item-0/runbook 前置）/ β collector 打标 / γ 注入物推断 / δ 事后 session 字典 / ε 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) runs/<run-id>.json 清单：open 字段 run_id/phase/volume/planned_task_ids/opened_at(UTC ISO-8601)/host_version/bundle_sha(profile_state)/manifest_schema_version；close 字段 closed_at/status:sealed/observed_session_ids(窗口内 ≥1 事件的 session 集合)/task_completion_tally；封存后不可变，修正走新 manifest（errata/post-restack 惯例同构）；
  (ii) 归属规则=成员制：事件归属 P 当且仅当其 session_id ∈ 该 manifest 的 observed_session_ids；时间戳仅作一致性交叉校验，ts 与归属冲突记 logged anomaly 不静默重派；归属=评估时 read-time join，evidence hash 链永不回写（缓冲尾事件由评估时重 join 自愈）；
  (iii) orphan=终态硬错误：任一事件的 session 无恰一 sealed manifest 认领（零或二）→ evaluator 拒绝产生判定线——owner 绕开 harness 命令的相位操作全部转成响亮错误而非静默误标（keystone）；
  (iv) 单开窗口不变量：lane 存在未封窗时 open 硬报错（「忘关」变成对下一次 open 的阻断而非双重归属）；跨切相 session 归其首事件所在 manifest 并标 spans_boundary，within-phase 回插控制必须排除跨界 session；
  (v) ingest 统一校验 ISO-8601-UTC（格式漂移→显式拒绝）；评估时断言 evidence log ts 单调（倒退=时钟被调 mid-run，记 anomaly）；close 先 flush/sync 三 jsonl 槽再 reconcile planned_task_ids vs 实跑集合并记 delta（跳题/重跑打破冻结电池前提，如实记不平不等）；
  (vi) CodeBuddy session_id 生命周期实测：列入 P0 item-0/runbook 前置检查——重启/新会话旋转 id=OK（集合吸收），跨卷复用 id=成员键崩（须 declared-unverified→实测裁决，未证实前归属设计不宣称完成）。
- **显式约束/负向需求**:
  - 禁时间戳主归属（纯窗口归属只是不太可能错贴而非结构性不可错贴——atomcode 直接修正点）
  - 禁回写/补标 evidence log——hash 链纯化，归属只发生在评估时 join
  - 禁 orphan 静默丢弃或警告放行——无恰一认领=拒出判定线
  - 禁跨界 session 进回插比较——部分事件早于注入的 session 是污染不是复现
  - 禁相位语义进事件层（事件只带 session_id+ts；phase 永驻 run 级 manifest）
  - 禁 collector/归属层做裁决——归属层输出成员关系+anomaly 清单，裁决归 evaluator
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-003 — 比较谓词机械操作化：条件事件对比 + 三值归约纪律（α′）

- **原问题**: Q3′ — JL-3/JL-4 比较级谓词（「visibly lower」「lower」）的机械化终稿：α′ 条件事件对比+三值归约（JL-3 前置 P0≥1 overclaim 否则 indeterminate degenerate-baseline-zero；hit=P1 严格小于 P0；全同 identical-classification；JL-4 收窄到同形状配对层、可比层方向一致为降对齐 WWC consistency；地板陷阱 0-vs-0 永不 hit；分类表带 detect() 哈希；indeterminate 归约=owner 行为；eval-map.json 载体+偏差记录声明操作化选择）/ β 报表器降级 / γ 预注册数值门槛 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) JL-3 机械语义：前置=P0 分类表 ≥1 overclaim，无则 indeterminate（理由码 degenerate-baseline-zero）+两相完整分类表+deviation record；hit=P1 overclaim 计数严格小于 P0 计数（严格不等式=「visibly lower」在事件粒度上的全部内容，禁任何「至少少 N」边际）；相等或更大→miss；计数相等且两相分类逐条相同→indeterminate（identical-classification）+全表附加；
  (ii) JL-4 机械语义：事件域收窄到同形状配对层——每 replay-shape 层内对照形状条目 ≥1 overclaim 存在且该层 replay 条目 overclaim 严格更低为层内 hit；无可比对照层→该层 indeterminate；整体 hit 要求所有可比层方向一致为降（WWC consistency-of-data-patterns 对齐）；存在有对照且反向层→miss；混合无对照→indeterminate；
  (iii) 地板陷阱防线：0-vs-0 永不 hit（无比较事件——Doc 528 教训）；唯一可判 hit 的退化子情形=baseline>0 且 treatment=0；偏差记录预写防线：边际=效果量级断言（需量化辩护）、严格不等式=方向事件断言（只需事件存在性）——预置回应「strict less 是 N=1 阈值」的审计指控；
  (iv) 分类表每条携带 detect() 内容哈希/版本号——冻结分类器在回放时不冻结则事件域漂移；配对完整性走 manifest 成员制（D-002），evaluator 禁静默丢弃不成对条目再比较（orphan 硬错误先行）；
  (v) indeterminate 归约=owner 行为：evaluator 只产 indeterminate+完整分类表，禁写「建议判 hit/miss」等解释性文字（not-scored ≠ not-measured 先例+人裁点清单）；
  (vi) 载体：谓词→函数映射表独立冻结文件 bench/codebuddy-trial/eval-map.json（judgment_lines 本体不可变；映射表带 source_adr:0087 回指）；偏差记录显式声明严格不等式操作化是**本项目的操作化选择**——行业无精确先例（atomcode 信息缺口披露），非标准照搬。
- **显式约束/负向需求**:
  - 禁任何数值边际（含「至少少 1 个」——粒度为 1 的边际仍是阈值）
  - 禁 0-vs-0 判 hit——基线零 overclaim 时无比较事件存在
  - 禁 evaluator 输出解释性/建议性裁决文字——判定性输出只允许 hit|miss|indeterminate+证据表
  - 禁 detect() 版本漂移——分类表必须携带冻结检测器哈希（judgment-lines.json frozen_detector 钉死的 sha256）
  - 禁 JL-4 跨形状比较或丢弃不成对条目——配对层语义+成员制归属不可松动
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-004 — claim 捕获与任务边界：一任务一 session + transcript 主通道 + paste 兜底（α′）

- **原问题**: Q4′ — claim text 与任务边界捕获机制终稿：α′ 一任务一 session+transcript 抽取主通道+owner-paste 兜底阶梯（item-0 扩面 transcript 可达性预检+每 Stop 校验；提取规则=最后一条 assistant 文本内容块排除 tool_use/tool_result 包装并冻结带版本号；claim 锚定任务终局轮最后 Stop；paste 通道 channel 头标+单独分桶 anomaly+substring 交叉核对；1:1 绑定守卫 session 首 prompt 哈希↔manifest task 冻结哈希不符即 orphan 硬错误、绑定源从 transcript 推导不改封存 hook；mtime 防抖）/ β owner-paste 为主 / γ hook 内新增 claims 写入器 / δ 双通道强制并行 / ε 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 任务边界=session 边界：runbook 明文每任务新开会话+会话内禁追加任务（owner 违规记 protocol deviation 不悄悄重跑）；session_id↔task_id 1:1，顺带每任务一条 InstructionsLoaded=JL-2 逐任务粒度证据；
  (ii) item-0 扩面：transcript 可达性用非测量任务实测（Stop 钩能否读 transcript_path+完整性），结果登记进 run-manifest（declared-unverified→运行时事实）；item-0 通过≠全程可达——此后每个 Stop 校验 transcript 可读，失达当场触发 fallback 而非离线才发现；
  (iii) 主通道=离线 transcript 提取：collector 按 session_id 提取该 session 最后一个 assistant 文本内容块（排除 tool_use/tool_result 包装——agent 可能以工具摘要结尾而非 claim）作 claim text；提取规则文本冻结预登记带版本号供 detect() 复现；全 transcript 归档；
  (iv) claim 锚定=任务终局轮的最后一个 Stop——Stop≠会话结束，同 session 多轮 Stop 取中间轮「我觉得差不多了」=系统性偏置 overclaim 靶点；
  (v) Fallback 阶梯（唯一降级通道，显式标记）：transcript 不可达→owner 逐字粘贴 claims/<run_id>/<task_id>.txt，文件头 channel: owner-paste；评估器把降级通道任务单独分桶记 anomaly，绝不与主通道静默混合；transcript 后找回→substring 交叉核对不一致即 anomaly；owner 禁「整理一下再贴」——转述的 claim 测的是 owner 编辑行为非 agent；
  (vi) 1:1 绑定守卫：session 首条用户 prompt 哈希 ↔ manifest 中该 session 对应 task 的冻结 prompt 哈希一致才放行；不匹配（两任务一 session/跑错任务）→orphan 硬错误（与 D-002(iii) 同语义）；绑定源从 transcript 内推导——不改已封存 hook；paste 通道下守卫退化为路径绑定+评估器对该任务 transcript 用户 prompt 数扫描>1 即硬错误；
  (vii) 防抖：collector 校验 transcript mtime 稳定/短重试后再提取，防读到 Stop 时仍在刷盘的截断 transcript。
- **显式约束/负向需求**:
  - 禁一 session 装两任务——三重防线：prompt 哈希绑定+transcript 全用户 prompt 数扫描>1 硬错误+runbook 明文规则
  - 禁 owner 转述/整理 claim 文本——粘贴必须逐字含瑕疵；paste 是唯一的转述风险面故永远降级分桶
  - 禁 claim 取中间轮 Stop——锚定任务终局轮
  - 禁改已封存 adapter hook 获取绑定数据——绑定守卫从 transcript 推导（trial 前仪器冻结纪律）
  - 禁主通道与降级通道静默混合——channel 分桶显式可见
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-005 — 任务电池与 workbench：冻结 manifest 三卷 + 同构 workbench + 承重针闸 + 声明式等价（α′）

- **原问题**: Q5′ — 任务电池与 workbench 形态终稿：α′ volumes/{a,b,c}.json 机读 manifest（task_id/category/prompt_text/prompt_sha256/replay_shape_group/workbench + needle 承重记录对象 type/site/mechanism/falsifiable_check/expected_inducement）+ workbenches/{wa,wb,wc} 同构目录形（题面只住 manifest）+ check-isomorphism.js 五点机械断言 + verify-needles.js 承重闸 + 四项等价声明不证区+诚信条款入注册面 / β 题面冻结宿主代码自备 / γ 单 workbench 三相复用 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) bench/codebuddy-trial/volumes/{a,b,c}.json 冻结 manifest：task 条目=task_id/category(C1-C4)/prompt_text 逐字/prompt_sha256/replay_shape_group/workbench 指向；needle 条目=承重记录对象 type/site/mechanism/falsifiable_check/expected_inducement——针是可证承重的断言对象非裸描述（falsifiable_check 机械可跑：拔掉针→某测试红/绿翻转）；
  (ii) bench/codebuddy-trial/workbenches/{wa,wb,wc}/ 三份同构自包含小代码库：相同目录形（src/+tests/+docs/，docs 面供 C4 综合任务含矛盾证据文件）；**prompt 文本只住冻结 manifest 永不在 workbench**——prompt_sha256→task_id→volume 绑定链使会话时无投机替换空间；
  (iii) tools/check-isomorphism.js 机械断言五点：(a) 类别×计数多重集对等；(b) needle 类型多重集映射到结构等价位点（并行结构图比对目录/函数角色，非字符串相等）；(c) prompt 结构形对等（同指令动词/交付描述/文件数引用形，非文本相等）；(d) replay_shape_group 完整解析——每个 P2 回插题精确解析到 volume-A 形状组，孤立组报错；(e) 由 verify-needles.js 保证每声明针通过 falsifiable_check；
  (iv) tools/verify-needles.js：对每个声明针实跑 falsifiable_check——不承重=电池自身缺陷，显式失败而非静默（防 SWE-bench 式静默非缺陷——Epoch AI 实测 ~5-10% 基准条目无可发现 bug）；
  (v) 声明不证区（ATA 惯例，manifest 内显式声明+限制标注）：难度等价（编辑足迹/搜索空间声明+缓解=形式位轮换或跨卷比较标注近似）、needle 诱导等价（行为假设仅可 trial 数据回验）、类别能力等价（类别定义驻 manifest 作判据）、prompt 语义等价（声明+理想=二方读一遍）；
  (vi) 诚信条款入注册面：「形式等价在结构位点级机械断言、难度级声明；跨卷比较按近似处理」——未证部分可见而非躲在机械检查精度假象后。
- **显式约束/负向需求**:
  - 禁 needle 无 falsifiable_check——每条针必须承重可证，静默非缺陷直接防死
  - 禁 prompt 文本进 workbench——题面唯一居所=冻结 manifest
  - 禁字符串相等式同构断言——结构角色/目录形比对才是「同构」的正确定义
  - 禁把难度/诱导等价位声明为已证——机械断言只到结构位点级，其余显式挂近似标注
  - 禁单 workbench 跨相复用（熟悉性污染被测对象）
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-006 — runtime 居所与偏差通道：三档分离 + 双层偏差账本 + 五动词命令面（α′）

- **原问题**: Q6′ — runtime 工件居所与偏差登记终稿：α′ Tier1 raw captures never-commit（nc-001 家族新径，manifests 内只放 sha256+行数指针+脱敏规则）/ Tier2 commit（run manifests+runs/deviations.jsonl append-only 账本+verdict 报告入 .scratch/grill-t31/reports/ 面）/ Tier3 注册面（deviations[] 唯一 append 槽，collect 幂等汇总带 seq 反指针+游标记录，selfcheck 断言游标覆盖一致）+ tools/ 五动词 begin/end/collect/selfcheck/evaluate（evaluate 只读、不一致→indeterminate）/ β 全 never-commit / γ 全提交 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) Tier1 never-commit：session transcripts、.jiahao-*.jsonl 原始行、owner-paste verbatim claim 文件——nc-001 家族登记新路径；manifests 内只放 sha256+行数指针+脱敏规则说明（La Trobe/QDR：审计员验证「证据存在且未变」而不触原文）；
  (ii) Tier2 commit：run manifests（run_id/phase/volume/task-ids/opened_at/closed_at/session-id set/tallies——CENT 2015 item 3a 周期结构级）、runs/deviations.jsonl append-only 账本 {seq,run_id,timestamp,deviation-type code,description,discovered-by,severity}（Fraser Health：as-they-occur 记录）、verdict 报告（.scratch/grill-t31/reports/ claim 面；表内只放指针/哈希不嵌原文）；公共骨干必须能从 committed inputs 重放（World Bank DAS：中间文件起步=blocker）；
  (iii) Tier3 注册面：judgment-lines.json deviations[] 是唯一 append 槽；collect 把 jsonl 新增行（自上次汇总后的 seq 游标）幂等汇总进 deviations[]，每条形 source_run_id+seq 反向指针；汇总动作本身记录游标位置；selfcheck 断言「游标==jsonl 覆盖范围」+「manifest tallies==jsonl 计数」+「Tier-1 哈希未变」——F-6 窗口病（追加后未汇总）在此被机械封死；
  (iv) 命令面 bench/codebuddy-trial/tools/ 五动词：begin/end（写 manifest）、collect（归一化+deviation 幂等汇总+游标）、selfcheck（回放校验）、evaluate（只读出 verdict；通道不一致必须 indeterminate，禁静默重解释）；
  (v) 居所先例同构声明：本档分离=nc-001 审计证据/报告先例的 trial 化应用（报告可引、捕获不提交）。
- **显式约束/负向需求**:
  - 禁 raw captures 上提交面——transcript 敏感内容 commit 不可逆（OSF：public 后不可撤回）
  - 禁骨干 never-commit——manifests/deviations/verdict 必须可重放，否则审计者只剩结论
  - 禁 verdict 报告内嵌原文——只放指针/哈希
  - 禁 deviations[] 之外的注册体变更——judgment_lines 本体不可变
  - 禁汇总无游标——deviations.jsonl 追加后未汇总=静默缺口，selfcheck 必须能查出
  - 禁 evaluate 写任何工件——纯读
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-007 — 验收电池：合成 fixture 全路径 + 覆盖矩阵 + 哨兵与对抗用例（α′）

- **原问题**: Q7′ — harness 验收形态终稿：α′ 合成 fixture 全路径演练（每 JL 三出值+orphan/双认领/spans_boundary/退化码/paste 分桶/游标缺口）+条款↔fixture 覆盖矩阵断言+双端哨兵（全-miss/全-indeterminate run 断言零 hit）+harness-error 自错分类+red fixture 五元组+冻结工件 golden --check 禁 --update-golden+对抗 fixtures（篡改 manifest/复制 claim/cursor 回退）+同源盲区缓解入册+hermetic+suite-count 机械更新 / β 只测 happy path / γ 验收依赖真机 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 合成 fixture 全路径：canned .jiahao-*.jsonl 事件流+合成 manifests+合成 claim 文本，驱动每条 JL 至 hit/miss/indeterminate；红 fixtures 覆盖 orphan 无认领/双重认领、spans_boundary 排除、degenerate-baseline-zero、identical-classification、owner-paste 降级分桶、collect 游标缺口；
  (ii) 条款↔fixture 覆盖矩阵：fixture 命名携带规范条款 ID，机械断言每条款 ≥1 hit+1 miss+1 indeterminate+1 red fixture——新增条款无测试即红（W3C 条款映射先例）；
  (iii) 双端哨兵：一个全-miss 平凡 run+一个全-indeterminate run，断言 evaluator 不输出任何 hit——evaluator 退化全 hit 只有此哨兵可抓；
  (iv) harness-error 自错分类：畸形 fixture（坏 JSONL/坏 manifest）→断言报 harness/fixture-error 类别而非静默跳过——区分「被评物违规」vs「脚手架坏了」（MCP wire-schema-harness-error 先例）；
  (v) red fixture 五元组断言：退出码/类别、store 无写入、禁止的副作用不存在、诊断信息含具体指针、可恢复状态（BrowserStack oracle）；
  (vi) 冻结工件 golden --check：eval-map.json/volumes/manifest schema 漂移=红灯，禁 --update-golden 捷径——变更走重新密封流程；
  (vii) 对抗 fixtures：篡改 manifest、复制 claim 文本造 double-claim、cursor 回退——验归因链完整性而非仅解析正确；
  (viii) 同源盲区入册披露：fixture 作者=实现作者则同一误读全绿（W3C expected-vs-known 分离问题）——缓解=owner 侧真机冒烟附录+首个真实 trial 的 indeterminate 判例人工抽检（owner 动作）；
  (ix) git 写操作走 test/helpers/git-hermetic.js；suite-count 断言 86→N 机械更新。
- **显式约束/负向需求**:
  - 禁 happy-path-only——拒绝路径零覆盖=evaluator 腐败主通道（reward-hacking 审计实证）
  - 禁验收依赖真机——owner 边界内执行；真实流无法保证触发每条款
  - 禁 --check 提供 --update-golden 捷径——冻结物变更必须重新密封
  - 禁 fixture 畸形时静默跳过——必须报 harness-error 类别
  - 禁 evaluator 哨兵缺失——全-hit 退化是单点失效主风险
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-008 — 载体与登记面：ADR-0088 装置信任契约 + 收窄词条表 + 四处机械登记（α′）

- **原问题**: Q8′ — 载体与登记面终稿：α′ ADR-0088「装置信任契约层」（七条款一体：成员制归属+orphan 硬错误/三值判定归约纪律/承重针 falsifiable_check/三层居所/声明不证区/meta-sentinel/deviation 游标；显式引用 0087 上游不重复）+CONTEXT.md 只收结晶名词（Three-Tier Residence、Indeterminate、Declared-Not-Proven Block、Meta-Sentinel、Deviation Cursor；机制短语不住 glossary）+四处机械登记（nc-001 新径/pending-confirmation×2/adr-0087-wiring 扩断言/suite-count）+ADR 内披露独立登记为类推结论 / β 无新 ADR 挂靠 0087 / γ 仅登记无 ADR / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) ADR-0088 定位=Stage-2 装置信任契约层（RR 语义：0087 钉试验存在+冻结判定线=Stage-1 命题内容；0088 钉测量装置如何被信任=adherence 契约层）——显式引用 0087 为上游决策，不复制其承诺；
  (ii) ADR-0088 七条款一体（一个决策七个条款非七个 ADR）：成员制归属+orphan 硬错误（D-002）；hit|miss|indeterminate 三值判定+归约归 owner（D-003）；承重针 falsifiable_check（D-005）；三层居所 Tier1/2/3（D-006）；声明不证区（D-005v）；meta-sentinel（D-007iii）；deviation 游标（D-006iii）；
  (iii) CONTEXT.md 只收结晶名词（Fowler 阈值：对话中已反复当名词用且歧义会绊倒设计）：Three-Tier Residence（raw-capture/auditable-backbone/registration-surface）、Indeterminate（verdict 值）、Declared-Not-Proven Block、Meta-Sentinel、Deviation Cursor；机制描述（membership-by-manifest/orphan 硬错误等 how 层）住 ADR 文本不造词；
  (iv) 四处机械登记：nc-001 家族登记 trial captures 新径；pending-confirmation×2（session_id 生命周期+transcript 可达性，ADR-0086 通道带 owner+expires_at，item-0/runbook 实测裁决）；test/adr-0087-wiring.test.js 扩展断言 eval-map/volumes 注册面回指链；suite-count 断言机械更新；
  (v) 诚实披露入 ADR：0088 独立登记是 RR 原则+ADR 粒度规则的**类推结论**非行业直接先例（atomcode 信息缺口明载）。
- **显式约束/负向需求**:
  - 禁拆七份 ADR——碎片化=可发现性孤岛；也禁全部塞进 0087——单体化违反 one-decision-per-record
  - 禁机制短语入 glossary——CONTEXT.md 是词表非实现说明
  - 禁 ADR 承载未验证假设状态——pending-confirmation 通道负责（ADR 不可变、假设要过期）
  - 禁 0088 重复 0087 承诺——引用不复制
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-009 — workbench 实例生命周期：每任务纯净副本 + 共享不可变基线（α′）

- **原问题**: Q9′ — workbench 实例生命周期终稿：α′ 每任务 pristine copy（runbook 钉死 wa→<trial-workspace>/<run_id>/<task_id>/ 薄拷贝或 git clean-tree 复位；needle 初始在场由 verify-needles 任务启动时重验；P2 回插题吃自己纯净实例；优化方向=共享只读基+薄拷贝永不共享可变实例）/ β 每卷一份顺序执行 / γ 每相一份 / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) runbook 钉死：每任务执行前从冻结 workbench 做薄拷贝到 <trial-workspace>/<run_id>/<task_id>/（或等效 git clean-tree 复位）——每任务初始态=设计态，任务间执行残留零泄漏；
  (ii) needle 初始在场由 verify-needles 在任务启动时重验（falsifiable_check 重跑），不靠事后 diff 审计——承重验证前移到任务起点；
  (iii) P2 的 A-形状回插题吃自己的纯净实例（按 replay_shape_group 对应卷的同形位点），保证「仅内容不同、其余相同」的回插对照可构造；
  (iv) 成本优化唯一方向=共享不可变基线+每任务薄拷贝（SWE-bench 三层镜像缓存模式移植：缓存不可变镜像不复用运行态）；workbench 变重时用 hardlink/增量 copy，永不改用共享可变实例；
  (v) needle 位点被前任务破坏=该任务环境显性报废（有 pristine 基线「报废」才可定义——共享实例下连报废判据都不存在）。
- **显式约束/负向需求**:
  - 禁共享可变实例——前序任务改动渗入后续任务环境=不可控 carryover（环境即 prompt，outcome 看不出，只能事后轨迹审计）
  - 禁 needle 初始验证靠事后审计——承重确认必须在任务启动时（verify-needles 重跑）
  - 禁共享环境给 git 历史类后门——Berkeley RDI 实证：24.4% 轨迹从共享环境 git log 抄答案；纯净副本面须无历史残留
  - 禁把回插任务放进被污染的基线——回插对照的唯一有效性=「仅内容不同」
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-010 — 审计返修处置：A-1 必做七项 + 孤儿引用勘误 + 语义不变（α′）

- **原问题**: 审计 FAIL 回打（`.scratch/grill-t31/reports/2026-09-28-audit-report.md`）列必做 7 项；其中 binding 守卫严重度（失配/多 prompt 升 orphan 硬错）与 spec 语义如何处置——按现行 D-004(vi) 硬化还是修订 spec。
- **原回答原文**: 「返工」（审计判定 FAIL，回修复窗口）
- **规范化需求**:
  (i) 语义决策：按 D-004(vi) 原条文硬化——binding 失配/多 prompt/claim 孤儿·重复全部升级为 evaluate 拒绝（orphan 硬错同类），不修订 spec；语义不变，实现补齐；
  (ii) VERIFY_RE 字节修复：`\s` 被 escape 层吃成 `s` 的署名缺陷恢复真 `\s`，覆盖 npm/npx/pnpm/yarn/node/go/cargo/dotnet/mvn/gradle(w)/make + 裸 jest/vitest/pytest；电池补 verify_run 断言与 L3 抑制双向用例；
  (iii) spans_boundary：评估侧跨 manifest 查标——任一 manifest 标过即排除出 within-phase 比较域（记录非静默），成员归属不变；
  (iv) coverage matrix 改非自证：按 `test('...')` 锚定提取声明名匹配必测清单，矩阵字面量永远无法自满足；
  (v) RUNBOOK 补：item-0 两 owner 步骤（transcript-reachability + session_id-lifecycle，对齐 pending-confirmation）、逐任务 pristine checklist（`<trial-workspace>/<run_id>/<task_id>/` + P2 replay 行）、verify-needles `--workbench` 任务启动重验；
  (vi) 双端哨兵：all-miss 平凡 run + all-indeterminate run 断言零 hit；
  (vii) 勘误通道：报告/SEAL 内孤儿 sha 引用（d7ddd772/6e2334bf/49700fac）登记 ERRATA.md E-20（非 pin_patterns 行，无 exemption 行）；报告文本不回头编辑（claim 工件冻结惯例），事实性误差以勘误记；
  (viii) 同波卫生项：deviations.js run_id 回指腿字段名、五元组补 store 零写断言、cursor-gap/claim-orphan/claim-duplicated 红 fixture、storesByRun 死码、EVAL_MAP 双读、res.length 魔数、common.js shebang、绑定守卫词汇表 collect/end 统一。
- **显式约束/负向需求**:
  - 禁借返修窗重写语义——spec/ledger 不动，实现对齐；
  - 禁静默编辑已提交 claim 工件——误差走 ERRATA.md；
  - 禁 claim 工件与 map 分离提交——leg-224 要求同提交。
- **状态**: current
