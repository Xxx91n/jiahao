# decision-ledger — grill-t10 (judge-seam / product-seam gate round)

idempotent

## D-001 (current)

- 原问题: Q1 本轮烤的目标范围 — (a) 纯注册 judge-seam 闸决策 / (b) a+F-A carry-over 处置 / (c) b+deferred backlog 到期审查 / (d) 产品整体可发布态含 b4 npm 复议
- 我的原回答原文: "b"
- 规范化需求: 本轮 = 注册项"配对器→产品在线路径闸控决策"（seam 形态/证据可采性/输入适配/判决语义/门机制/claim 措辞）+ F-A1（v3 md 细节段从 report.json 重渲，绝不重跑——shot 已烧）+ F-A3（manifest 钉 durable ref 规则，workspace sha 教训）+ F-A4（措辞 cosmetics）作为并行小议程。F-A2 纯备案无需决策。
- 显式约束/负向需求: deferred backlog（治理积压/b4 npm）不进本轮——gate:all 绿证明无到期条目，审查由 cadence 管；ADR-0011 npm 不复议。
- 状态: current

## D-002 (current)

- 原问题: Q2 配对器执行位点 — (a) hook 侧定罪通道 / (b) agent 侧自跑自记 / (c) 强占 judge seam / (d) 不集成；经 atomcode 深调后带四条款的 a
- 我的原回答原文: "采纳"
- 规范化需求: (a) 配对器走 hook 侧定罪通道——Stop/SubagentStop 路径读 transcript_path、适配 {task,events,closing}、跑 pairItem，flag 写 suspicious detector 记录进证据链，走现有 severity×profile 矩阵；agent 不可跳过。四条款：① flag 记录带 source: pairer-instrument 独立来源标记、append-only（与 agent 自写记录分命名空间）；② undetermined 按注册语义=不旗不阻、描述性上报（只取 ABSTAIN 的"不作放行依据"一半，绝不取"阻断"一半——真实转录上大量 undetermined 时阻断=可用性自杀）；③ 人工 override 终审走 jiahao resolve（已有通道，例外留痕）；④ v3 语料转配对器持续回归门（shadow role 不退场）。b 淘汰（可留提示词冗余不承担控制职能）；c 严禁（救援/定罪契约互斥）；d 降级（评测角色转回归集）。
- 显式约束/负向需求: judge seam 契约不动（honest_only/suspicious-only/概率形态三条不碰）；L1-L3 detector 不顺势上线（它未被判决过）；atomcode 的 ABSTAIN-blocks 语义不采纳（与注册 undetermined 语义冲突）；配对器进 hook 的检测通道是本轮首次接线，不是复用已有 live 通道。
- 状态: current

## D-003 (current)

- 原问题: Q3 上线证据门 — (i) v3 判决即充分直接 enforce / (ii) 两段式 shadow→enforce 预注册晋升门 / (iii) 真实转录判决语料先行；经 atomcode 深调后带完整形状的 ii
- 我的原回答原文: "采纳"
- 规范化需求: (ii) v3 判决=进 shadow 的资格证（necessary gate），非执法资格；shadow 期 flag 写 source:pairer-instrument + shadow 标记的遥测记录、不进 severity 矩阵（D-002 的"flag→suspicious→矩阵"是 enforce 稳态，shadow 是其前置阶段，非改向）；预注册晋升门四判据（部署前写死）：≥200 真实 Stop 事件且跨≥1 完整流量周期 / 全部 flag 项复核 FP=0（仲裁规则预写，单人项目=owner 复核）/ undetermined 率≤预注册上界且无异常上升趋势 / 配对器延迟在 hook 超时预算内；shadow 期确认 FP→回隔离（CAPA/仪器隔离纪律）；enforce 后保留 kill switch（通道级 flag，回滚=一行 diff）；shadow/enforce 产出的 FP 与边界案例回填真实语料回归集（iii 复活为副产品非前置）；逐族晋升作为仲裁规则允许的细化路径。i 按裁决否定；iii 降级。
- 显式约束/负向需求: 晋升门数值在部署前冻结（写进 spec/ADR，非事后补）；shadow 记录绝不进 severity 矩阵；ABSTAIN 不取阻断语义（沿 D-002 约束）；无真实分布开放长尾的幻想——shadow 不设时限长度门而设事件计数+周期覆盖门。
- 状态: current

## D-004 (current)

- 原问题: Q4 通道产品形态包 — (a) 仪器落位 a1 单源移动/a2 双拷贝 / (b) 转录适配器身份 / (c) 能力声明三态 / (d) flag 落地语义
- 我的原回答原文: "ALL"
- 规范化需求: (a1) capa-pairer.js 单源移到 src/——内容 hash 不变，pin 身份不变；bench import 路径 + eval-plan.instrument.pairer.path 同 commit 修正（引用变工件不变）。(b) transcript→{task,events,closing} 适配器=通道组件非判决仪器，合同测试+shadow 观测验证，不进判决 pin；自带构造转录→断言提取的验证面。(c) 通道声明 requires: transcript-file（ADR-0040 三态）；host 无 transcript_path→记 absent/UNVERIFIABLE，绝不记 coverage:partial（partial 对 verifier 触发 ESCALATE=无转录 host 每轮升级不可用）；逐 host 可达性进 Host Contract 核查。(d) flag→suspicious:true+severity high（机械证成矛盾=最强证据类）；记录扩 source:pairer-instrument+pairer:{family,state,claim,evidence,reason}+shadow 位（schema 演进纪律注册）；undetermined 仅遥测字段不进 severity 不算 partial；consistent 不落可疑记录（最多计数遥测），定罪仪器不兼职救援。
- 显式约束/负向需求: 禁双拷贝漂移面；适配器不进判决 pin；禁把 transcript 缺失降级为 coverage:partial；severity 不降档稀释；judge seam 三条契约不动（沿 D-002）。
- 状态: current

## D-005 (current)

- 原问题: Q5 通道上线后 claim 措辞 — (a) 描述性存在声明 / (b) 效力声明以 v3 背书 / (c) 完全沉默；经 atomcode 深调后 a + MITRE 引用纪律×模型卡限制条款复合三句式
- 我的原回答原文: "ok"
- 规范化需求: 通道对外措辞=描述性存在声明三句式：①存在与状态句（shadow/enforce 修饰语强制，去修饰语=实质性歪曲）②覆盖边界句（仅对声称值+证据值在场可解析且不等的声称旗报；不可解析/证据缺席/语义矛盾不在覆盖）③不背书句（语料判决描述该语料表现，不构成真实流量召回声明；晋升门只验证 FP/覆盖率/延迟）。三句进 per-mention binding registry（adr-0067-wiring F-4 测试同款机制钉住措辞）；晋升翻转只改第①句状态值，②③不动；测量复现邀请条款同步覆盖新通道。b 否决（FTC 执法先例：测试语境数字不得挪用产品语境）；c 否决（透明度方向+与既有 claim 纪律矛盾）。
- 显式约束/负向需求: v3 fact line 原样不动保持语料级语义；永不用 v3 verdict 为在线通道效力背书；通道 claims 构念边界限定在 mechanically-proven contradiction on parseable claims。
- 状态: current

## D-006 (current)

- 原问题: Q6 F-A carry-over 处置 — (a) 三项全处置 / (b) 只 F-A1 其余 defer / (c) 全记备案；经 atomcode 深调后 a + documented-decision 闭环
- 我的原回答原文: "采纳"
- 规范化需求: F-A1 走 corrigendum 式专用 commit：从权威 report.json 重渲 md 细节段（confusion/FP 细节/侧集/会话/批次/诚实比/分类分解），commit message 声明更正性质（rendered from authoritative JSON, verdicts and frozen artifacts untouched）；F-A4 作 errata 搭同 commit（worker v2 自指注释修 + Sessions:20 加主集口径括注）；F-A3 转前向规则（未来冻结 manifest 钉 durable ref——branch/tag 或 SHA+tag 双钉，workspace commit sha 仅备注；已冻结 v3 manifest 绝不回写）；处置记录含 F-A2 "备案，无需行动"行——四观察项各有 documented decision（被动漂移=默认失败模式）。
- 显式约束/负向需求: 冻结工件绝不回写（report.json/v3 manifest/判决件）；重渲绝不重跑（shot 已烧）；F-A3 只前向不回溯。
- 状态: current

## D-007 (current)

- 原问题: Q7 本轮交付边界 — (a) 两段交付止于 shadow 装船+晋升门冻结 / (b) 只出 R1 文档 / (c) 全包到 enforce
- 我的原回答原文: "A"
- 规范化需求: R1 文档轮——ADR-0070（hook 侧定罪通道+shadow→enforce 晋升契约+产品形态包+claim 三句式+F-A 处置全集）+CONTEXT 新术语+spec+wiring seeds（doc-before-impl 契约）。R2 建造轮——pairer 移 src/（pin path 同 commit 修正）+转录适配器+Stop 路径接线（shadow 形态：flag→遥测记录不进矩阵）+记录 schema 演进注册+能力声明+F-A corrigendum+全部门绿。轮止点=shadow 形态装船+晋升门冻结在册；晋升翻转=bake window 后独立注册动作不在本轮。晋升门数值预注册：≥200 真实 Stop 事件且跨≥1 完整使用周期/全部 flag 项 owner 复核 FP=0（复核分歧按 FP 计）/undetermined 率≤90%/通道 p99≤1s；kill switch=通道级 flag 文件。
- 显式约束/负向需求: 晋升不在本轮（依赖真实流量窗口）；轮止在门冻结非门通过；b/c 拒——分段过细/物理不可能。
- 状态: current

