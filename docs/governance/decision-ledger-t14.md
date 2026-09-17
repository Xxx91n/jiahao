# grill-t14 decision ledger

Round: post-T3 disposition / next-decisions round.
Source of truth for the doc closeout. Append on each confirmed answer.

## D-001 — round boundary: disposition + preregistration round

- 原问题: Q1 轮界——t13 收尾后下一轮绑定哪些线（a 窄处置 / b 处置+预注册 / c 全域）
- 原回答原文: "采纳"（对 b′ 修正版推荐）
- 规范化需求: 本轮=处置+预注册轮，六议程：(1) push 呈请以 consent-style packet 装订（证据+审计闭环+三件套；本轮只呈不执行，单独记为一条决定）；(2) defer-0051 立即处置——trigger beats calendar：pinned-protocol 重测（npm pack --dry-run --json, size field）+ second_reviewer countersign，账本显式记录显式触发覆盖 review_at 日历项并销账；(3) instrument seq 24 人签呈请关闭；(4) cadence 常驻项（defer-0053/0055/0057/0058、O-E）consent 确认；(5) N/M 预注册设计——任何 promotion 评审前完成并落账/ADR 时间戳；(6) organic=0 终态→预注册 sunset 触发条款（organic 连续 N 个评审周期为 0→门入 sunset 评审，默认处置 X），本轮只写条款不评战略。
- 显式约束/负向需求: 战略议程（门是否死规则/分发采用）不即兴开启，仅登记为将单开预注册战略评审、sunset 触发即激活条件；禁止修订 G1/G3/G4 阈值（post-hoc 禁令）；sunset 条款只许引用 ADR-0070/0073 既有语义不得重诉 G1；push 呈请与规则设计分开记账；grill 期间不改源码。
- 状态: current

## D-002 — defer-0051 disposition: full close via double-signature

- 原问题: Q2 defer-0051 处置深度（a1 全销账 / a2 双腿分开）与 countersign 签核人（b1 owner 人签 / b2 弱独立 agent / b3 下次审计签）
- 原回答原文: "采纳"（对 a1+b′ 修正版推荐）
- 规范化需求: R2 执行 npm pack --dry-run --json 重测装证据包→新会话第二方 agent countersign（声明 weak-independent）→owner 对同一 evidence packet ratify→registry 记 closed+discharged-by-trigger+closure note 写明"1 data point 存在性验证，趋势职责在 pack-smoke 门禁"+账本记显式触发覆盖 review_at=2026-12-15 并销账。
- 显式约束/负向需求: 双签必须落同一 evidence packet（防两次孤立动作）；closure note 漏写单点语义=埋雷；owner-only 签核属 self-review threat 禁用；绑回未来审计轮属 schedule 暴政禁用；cap 周期守望归 pack-smoke 门禁非本条目。
- 状态: current

## D-003 — N/M preregistration: qualifier + analysis-side taxonomy + N>=20 M>=5

- 原问题: Q3 N/M 与 G1 结构关系（限定词 / 独立腿）、M 分类法与执行侧（分析侧 / 写时字段 / 复用 family / projectSlug）、取值（20/5 / 50/8 / 符号化）
- 原回答原文: "采纳"（对 a1+b1′+c1 修正版推荐）
- 规范化需求: N/M 作 G1 同批 organic 语料的充分性限定词——单一命题 events>=200 AND sessions>=20 AND intent-classes>=5，qualifier 不产生独立通过状态；M 走分析侧 transcript 分类+预注册 <=8 类意图分类法（feature/bugfix/refactor/docs/exploration/ops/qa/other 量级）；实施四要件：taxonomy 及每类定义在数据到达前预注册（organic=0 无污染窗口）、强制 unknown 兜底类且不计入 M、每类至少 K=2 个独立 session 命中才计入 M、评审时分类器版本+提示词哈希入档钉死；N>=20（UX 量化基准下限+tightening-only 不对称性取可辩护最松值）/M>=5（62.5% 覆盖留长尾余量）带显式理由落预注册件；taxonomy 修订走 amendment 程序。
- 显式约束/负向需求: 独立腿否决（小多样语料绕过 200 本意）；写时字段否决（defer-0053 未解冻）；复用 claim-family 否决（语义错配）；projectSlug 只可作将来收紧维度不可作主判定；符号化留参数否决（违具体性原则）；无用户 ID 时独立=distinct session_id 且非注册自测会话——可测性边界写入预注册；数值将来只可收紧不可放松。
- 状态: current

## D-004 — sunset trigger clause: parallel counter + co-trigger, activate-only, same ADR, blocking meta-requirement

- 原问题: Q4 sunset 条款——时钟锚（绑 defer-0055 closes_if / 平行计数器）、默认处置（激活战略评审 / 自动处置 / 仅记录）、载体（同 ADR / 入 registry 行）、标准注册时机（meta-only / 全标准）
- 原回答原文: "采纳"（对 a′+b+c+d′ 修正版推荐）
- 规范化需求: 条款=双路或门：连续 N=6 个零 organic quarterly 检查点 OR defer-0055 关闭而评审未激活，先到先触发；计数器与 watch 同节律但生命周期独立（watchdog 独立性），organic>0 观测即清零；触发唯一后果=激活已排期的预注册战略评审并在账本记 activation 事件；条款本体与 N/M 同一预注册 ADR，defer-0055 行只留指针；本轮只立 blocking meta-requirement+标准形态（>=1 条 organic 语料可证伪的 kill 条件、禁改 G1/G3/G4），评审开启时先注册全标准再评审、未注册即产出=无效。
- 显式约束/负向需求: 绑 closes_if 单计时器否决（依赖反转：门 sunset 悬于簿记行）；自动降级/关 G1 否决（ADR-0035 先例：assertion 只 SUGGESTS activation，disposition stays human）；仅记录不动作否决（装饰性日落=虚假安全感）；本轮写全标准否决（18 个月后必过期+变相做战略违 D-001 封顶）；条款引用 ADR-0070/0073 既有语义不重诉 G1；评审标准将来只紧不松。
- 状态: current

## D-005 — closeout form: no audit per trigger rule + two separate owner asks + R1/R2 with frozen-text exit criterion

- 原问题: Q5 收尾形态——审计与否（a1 触发规则无审计 / a2 惯例窄审 / a3 单审 ADR）、consent 打包（b1 单包 / b2 两 ask）、R1/R2 切分
- 原回答原文: "采纳"（对 a1+b2+c′ 修正版推荐）
- 规范化需求: 按 ADR-0074 触发规则无独立审计收尾——自检电池（run-test-gate --expected-suites/check-deferred/anchors/inventory/pack-smoke/telemetry checkpoint）+owner 批准闭轮+本轮处置列入下次审计常规复核面留痕+轮报告写明 countersign 仅覆盖单条 registry 项不得伪装成轮审计；两个独立 ask——seq 24 签核（记录性）与 defer-0051 ratification（判断性，保独立 accept/reject 出口）分开呈请；R1=文档轮（ADR-0075 预注册件+registry 编辑+defer-0059 tally 行+README 索引+wiring seeds+anchors），R2=动作轮（defer-0051 重测+countersign+ratify、consent packets、telemetry checkpoint、trend-inventory 行、轮报告、push 已成事实的对账注记），R1 exit criteria 增补：R2 所需预注册内容（N/M 数值+sunset 条款+分类法+meta-requirement）R1 末冻结为文本、R1→R2 交接点必须 green（中间 commit 可红 O-B 惯例）。
- 显式约束/负向需求: 惯例性日历审计否决（违自立的触发规则）；打包两 ask 否决（判断性决策藏进记录性尾巴=ratify 稀释成顺手签）；R2 执行中改预注册参数否决（R1 末冻结）；countersign 不得表述为轮级独立审计。
- 状态: current

