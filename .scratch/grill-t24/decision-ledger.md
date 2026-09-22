# grill-t24 decision ledger

Round: TBD (candidates in GOAL.md). Grill rules: one question at a time; every confirmed decision appended here immediately; ledger must be current before any compaction/handoff.

| ID | Status | Decision (short) |
|----|--------|------------------|

## D-001 — 轮对象：审计教训成文轮（三缺口合并，统一框架）

- **原问题**：Q1′ — 轮对象选定（t23 审计周期暴露的三条同形系统缺口的处置拓扑：a′ 合并成文轮 / b 证据新鲜度单点 / c defer-0066 burn-down / d 产品面轮）
- **我的原回答原文**：「a′」
- **规范化需求**：
  1. t24 = 「声明意图 vs 实际产出漂移」治理成文轮，收容三个缺口：
     - G1 证据新鲜度：committed 证据工件冻结在 fixpoint 前红态而报告声称绿——须立条款使重捕获成为**强制触发**（Drata renewal-date 模型移植：过期证据 → 工件 not audit-ready），非可选通道
     - G2 never-commit 范围正式化：labeled-paths 与 regex-class 判定对齐规则 + 存量处置（ref-assets 已 untrack，regex 已补——实例已修，双源规则仍缺）
     - G3 工具互操作纪律：GitButler 显式路径白名单 + post-commit `git show --name-only` 核验成文（无外部范式，自拟；c44c0dc 已实证可行）
  2. 载体预计 1-2 份 ADR + CONTEXT 统一术语词条（「declared-vs-actual drift」族）
  3. T-0 吸收义务照惯例：t23 两份未提交收尾文档（repair-verification + next-round-handoff）+ regen fixpoint；audit-evidence 树维持 never-commit
  4. 轮末二审窗 + consent sweep 全名单 + trend 行全字段照先例
- **显式约束/负向需求**：
  - 禁止过度成文：3 缺口不得膨胀为 5 份 ADR（atomcode 明示的高估风险）
  - 不得拆成单点轮（b 被调研判为低估 G2/G3 复发概率）；不得转 burn-down（c）或产品面（d）
  - burn-rate 咨询已 5 次——优先 R3/散文面手段，能不新增机械腿就不新增（执行深度留 Q2）
  - atomcode 置信中高非高：无 AI 代理自治理仓直接先例，结论属类比外推；G3 无外部范式须自拟
- **状态**：current

## D-002 — 执行深度：R3 最大化 + 单文件 carve-out（atomcode 细则全吸收）

- **原问题**：Q2′ — 三条款的执行深度与 carve-out 账单（a′′′ R3最大化+单文件carve-out+细则吸收 / b′ 纯R3零carve-out / c scripts/机械腿）
- **我的原回答原文**：「采纳」
- **规范化需求**：
  1. **ADR-0083 一份**载三条款（G1 证据新鲜度强制重捕获 / G2 never-commit 单源化 / G3 工具互操作纪律）+ 第四条款：**套件计数同步义务**（ci.yml --expected-suites 字面钉死属结构性税，ADR 须成文同步义务，否则下轮静默再踩）
  2. `docs/governance/never-commit.json` 正典注册表为**唯一事实源**：任务书标签由它派生；scratch 脚本中的 NEVER_COMMIT regex 退役或由其生成（R3）
  3. AGENTS.md 白名单条款：`but commit` 显式路径白名单 + post-commit `git show --name-only` 核验纪律（R3）
  4. 新 wiring 套件 `test/adr-0083-wiring.test.js`（R3）钉机械可表部分：注册表合法性、AGENTS 条款在文、捕获工件 provenance 戳形、ci.yml 计数与活套件一致
  5. `.github/workflows/ci.yml` 77→78 = 唯一 R2 触碰，走显式声明 carve-out（gtd.files 具名+必要性+披露）；轮报告披露**第 6 轮** burn-rate 事实；adr-0080/0081/0082 三份旧 wiring 改钉 78（R3 免费）
  6. 审计窗继承三检查行（G1 内容核验归审计窗=检测层正确安放；**语义核验不机械化**——伪一致性比人工核验更危险）
  7. CONTEXT 新增统一术语词条（declared-vs-actual drift 族）
- **显式约束/负向需求**：
  - carve-out 限 ci.yml 单文件；禁止 scripts/ 机械腿（R2 扩张+分类器自身不受审计窗保护）
  - 禁止断言折进既有套件（死控制机理：缺席坐在在场旁边）
  - 正典 JSON 若非唯一事实源=双源失配换址复发；任务书标签不得再独立手写
  - 审计窗检查行以 ADR 内声明"后续所有审计窗 scope 必含"形态成文（0081 coverage pairing 先例）
- **状态**：current

## D-003 — G1 证据新鲜度条款：冻结面终末重捕获（α′ 全精化）

- **原问题**：Q3′ — 证据新鲜度条款判据形状（α′ 冻结面终末重捕获+幂等终点+资格/留档分离 / β 条件式溯源 / γ 双读数披露）
- **我的原回答原文**：「采纳」
- **规范化需求**：
  1. ADR-0083 证据新鲜度条款不变量：
     - 轮终验收证据集须在**最后一个内容变更提交**之后（重）捕获
     - 捕获与证据落盘之间不得再落任何非证据提交；需 fixpoint 则先重捕获
     - **证据提交是幂等终点**——重捕获产生的证据提交自身不触发重捕获（防规则自指递归；atomcode 明示的低估风险）
     - “轮终”钉死在最后一个内容变更提交上，merge/squash 时序不得绕开
  2. 每个捕获工件强制 provenance 头行 `captured-at-head: <sha>`（in-toto gitCommit 绑定语义移植；wiring 钉形）
  3. **资格/留档分离**：陈旧工件失去支撑本轮绿色验收结论的资格，字节可留档为历史时点记录；不得与当前读数并列支撑同一结论（SOC 2 Type I/II + 透明日志前缀一致性移植）
  4. 审计窗核验=提交排序机械核验+抽腿重跑（检测层）；逐工件 “被证面” 语义追踪账被显式否决
- **显式约束/负向需求**：
  - 禁 γ：陈旧字节不得与绿读数并列合法化（把已判缺陷形态写进正典）
  - 禁 β 的逐件语义账（账错一处即静默失效，与本次事故同构）
  - 条款用提交顺序结构代替语义判断，保持机器可验
- **状态**：current

## D-004 — 载体细节包：a′ 全套采纳 + atomcode 三精化

- **原问题**：Q4′ — 载体细节终稿（注册表 schema / 套件计数钉形态 / 词条形 / 首燃验证槽 / trend 行 / T-0 / 无追溯）
- **我的原回答原文**：「采纳」
- **规范化需求**：
  1. docs/governance/never-commit.json schema = {rules:[{id:"nc-NNN",pattern(regex),reason,since,status}]}；任务书标签引用规则 ID 而非手写路径；新增标签 ⇒ 注册表扩展与引入标签的提交**同提交落地**（ADR-0027 耦合先例移植）；种子=已知历史 never-commit 集（audit*-evidence/、*.patch、round-commits.txt、ref-assets 类、外部生成源路径模式）
  2. **退役规则预写入 ADR-0083**：规则弃用不删除（ESLint 先例移植），since/status 语义成文，防“弃用语义”下轮再开缺口
  3. 套件计数自愈钉：新 wiring 断言 ci.yml --expected-suites === glob(test/*.test.js) 实数，**且夹下界/已知文件命中**（防 glob 路径错致双错相等报绿——atomcode 精化）；adr-0080/0081/0082 三旧 wiring 字面钉 77→78（R3）
  4. CONTEXT 单词条 Declared-vs-Actual Drift（声明-实际漂移）：伞形术语，正文必须点名 G1/G2/G3 三机制为 narrow terms 保持判别力（防“一切皆漂移”空壳——atomcode 精化）
  5. defer-0069 登记「三审计检查行首次实弹核验」验证槽，挂下轮审计窗（structured follow-up 登记=防复发性发现头号成因）
  6. trend 行：kind:documentation + adr_added:["0083"] + net_additions:1 + deferred_entry:defer-0069 + carve_out_used:1（ci.yml 单文件）+ zero_product_diff:true + burn-rate 第 6 轮披露
  7. T-0：吸收 t23 两份未提交文档（repair-verification + next-round-handoff）→ regen fixpoint 循环至 --check 绿
  8. 无追溯条款：t23 已修复工件不重开；注册表/条款均前向适用（时点记录不重写）
- **显式约束/负向需求**：
  - 注册表禁退化为扁平 pattern 列表（固化双源病灶）
  - 禁免登记 defer-0069（检查行首燃不得发生在治理视野外）
  - 执行面残余：ADR-0083 逐字、注册表种子逐条、AGENTS.md 条款位置、审计窗三行逐字、词条正文、工件命名
- **状态**：current
