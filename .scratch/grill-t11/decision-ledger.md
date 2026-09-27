# Decision Ledger - grill-t11

格式: ID（D-001 起）/ 原问题 / 我的原回答原文 / 规范化需求 / 显式约束或负向需求 / 状态（current|revised|stale|deferred）

状态: 尚未开始 - 等待第一个被确认的答案。

## D-001

- 原问题: 本轮轮界——a) 就绪评估单议题 b) 就绪评估 + 锐评开放处方处置 c) 更大口径（deferred 审查/npm 复议/promotion 路径）
- 我的原回答原文: "b"
- 规范化需求: 本轮烤两个议程面——(1) 产品"正式拿出使用+实际测试"的就绪判定与缺口处置；(2) 锐评第四版开放处方 #1（代理签名附录）、#2（委托书有效期）、#4（INDETERMINATE claim 待遇核实/补齐）、#5（失败族先验）的处置决策。
- 显式约束/负向需求: 不开 deferred 45 项到期审查；不议 b4 npm（ADR-0011 维持）；不议 promotion 翻转（bake window 物理锁定，0 事件）；锐评 #3 已落地仅作核实记录不再决策。
- 状态: current

## D-002

- 原问题: readiness 判定形态与"现行工件复测"处置——a) 判定成立+复测作配套非前置 b) 复测前置才宣布 c) 不补测；atomcode 调研后改为 b-轻量版（a+b 合并）
- 我的原回答原文: "采纳"（针对 b-轻量版）
- 规范化需求: (1) 判定"可正式使用+可实测"成立，但宣布措辞在时序上落在现行工件复测记录之后——同一轮内先测后宣布；(2) 复测=b2 同法 clean-env npx github: 装 + mock Stop 带 transcript_path 验 lane 全链（stdin→adapter→pairItem→shadow 记录），预注册形态含 downgrade 触发；(3) 复测挂→触发预登记 downgrade 条款，不修措辞；(4) 声明措辞分层，每层标证据来源（installed-artifact 实测/sandbox-verified/documented）；(5) capability 标签语义修正——enum 手术（present→documented-present+预留 measured-present）vs _doc/README 措辞澄清，R1 定；(6) 冻结晋升门不动，"usable for real testing"=bake 开始采集的声明非 gate 通过暗示。
- 显式约束/负向需求: c 被否决（Squad 失效类：source tests green≠artifact works）；标签不得冒充测量；不得对预注册测量纪律做事后豁免；复测必须在 clean env（不得收窄到开发机）。
- 状态: current

## D-003

- 原问题: bake 主体与底物——a) owner claude-code 狗食 b) 第三方复现为主体 c) 先扩 adapter 可达性 d) 不指派；atomcode 调研后改为 a+修正包
- 我的原回答原文: "采纳"（针对 a+修正包，其中 tier-2 落点按我方改进为独立第二线复核）
- 规范化需求: (1) bake 主体=owner claude-code 狗食：注册 hooks+init，真实使用积事件；首个真实 lane 记录把 claude-code present 从文档宣称升级为实测观测；(2) tier-2 前置落成独立第二线复核——enforce 翻转前全部 flagged 项由独立第二线复核（FP 判定权不在 owner 一人），外部第三方回传为加分信源非硬门槛，此条触发 ADR-0070 冻结门修订议程走修订纪律；(3) flagged 复核用预设判定标准防事后合理化；(4) claim 措辞用证据层语言（measured on one operator, one host）；(5) c 登记非阻塞独立议程、b 开放邀请非依赖、d 否决。
- 显式约束/负向需求: bake 流量必须真实（禁合成灌注）；外部回传不得作硬依赖；冻结门修订走 ADR 修订纪律（ADR-0062/0066/0071 先例），不静默改 t10 账本 D-003；单操作员流量只支撑管道健康 claim，不支撑多样用户群 FP 宣称。
- 状态: current

## D-004

- 原问题: 锐评开放处方处置包（P-1 代理签名附录 / P-2 委托书有效期 / P-4 INDETERMINATE claim 待遇 / P-5 失败族先验）；atomcode 调研后四项全 (a) 带两处修正
- 我的原回答原文: "采纳"
- 规范化需求: (1) P-1: ERRATA E-6 + ADR-0047 追加注，披露 seq 13 起 second_reviewer=Xxx91n 为概括授权下代理签名，措辞 "delegated second-line review, ID-level + delegation-level independence"，seq 13 不回写；(2) P-2: 前向规则——下一 authorization-bearing event 起委托须带 scope+expiry，seq 13 既有授权登记边界注不回写，且预置有界续期模板使下次 signoff/criteria_change 强制 renew-or-expire；(3) P-4: ADR-0067 追加附录注册 INDETERMINATE 分支 de facto claim 待遇（事实行同等机械绑定），"performance characteristics not established" 标签留置不悬挂（挂载属新声明动作须另行预注册）；(4) P-5: CONTEXT 新增推定性先验术语（ISA 240 形态）："截至 <日期快照> n 次自述纠正全部由重执行/独立审计抓获、0 次自披露；审计/门禁策略默认以此为设计输入；推翻此推定需书面论证"，n 从权威工件现算。
- 显式约束/负向需求: 四项无 defer；ERRATA 为唯一 append-only 更正通道（P-1 不得只写 ADR 附录）；P-5 措辞禁止频率外推（n 小、检出偏差如实声明）；seq 13/既有授权/ADR-0067 历史文本全部不回写；P-4 标签悬挂不在本轮。
- 状态: current

## D-005

- 原问题: 交付边界——a) 两段制（R1 文档轮→R2 动作轮）+ capability 标签取最轻诚实形 b) 单轮全做 c) 只出文档
- 我的原回答原文: "a"
- 规范化需求: (1) R1 文档轮：ADR-0072（readiness 判定+复测预注册计划[b2 同法+mock Stop 带 transcript_path 验 lane 全链+downgrade 触发]+bake 协议[owner 狗食/tier-2 独立第二线复核/预设判定标准/证据层措辞]+ADR-0070 门修订[tier-2 前置，走修订纪律]+四处方落地）；CONTEXT 新术语；ERRATA E-6；ADR-0047/0067 追加注；委托前向规则+续期模板；capability 标签语义修正。(2) R2 动作轮：执行复测（clean-env，结果落证据链）→过则宣布措辞落 README、挂则触发 downgrade；claude-code hook 注册须单独确认（动用户宿主配置）；首个真实 lane 记录落地=bake 开始。(3) capability 修正取最轻诚实形：_doc 语义澄清（present=documented to deliver 非实测）+README 措辞改 documented to deliver+枚举加法 measured-present 词位（首个真实 claude-code Stop 事件后启用），不做 enum 手术。
- 显式约束/负向需求: 顺序为纪律强制（预注册文档→测量→宣布），不可并行或倒序；hook 注册不得未经确认动用户宿主配置；enum 不改名。
- 状态: current
