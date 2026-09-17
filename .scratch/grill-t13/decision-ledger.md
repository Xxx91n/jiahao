# grill-t13 decision ledger

每条记录：## D-xxx / 原问题 / 原回答原文 / 规范化需求 / 显式约束与负向需求 / 状态
状态取值：current | revised | stale | deferred

## D-001

**原问题**: 本轮轮界——a.发布后检查点轮（published-tip 复验/SHA 悬空/发布记录形态/前向规则/telemetry+defer+卫生）b.仅结转处置 c.仅发布专题。用户偏向 A+C，atomcode 调研后呈报修正版六项。

**原回答原文**: “采纳”

**规范化需求**: 本轮 = 发布后检查点轮（A+C 合并），六个子项：
1. published-tip 复验议程（最高优先）：clean-env `npx github:` 复验计划入 R1 预注册、执行属 R2；含“清洗未误伤运行路径”核查项
2. SHA 悬空处置：docs/rewrite-map.json（append-only、工具生成）+ 受影响文档统一注记，不改正文；不启用 refs/replace/
3. 发布行为记录形态：ADR-0074（决策+授权+后果含 PR-diff 失效披露）+ 清洗 runbook（验证证据、不复述被涂内容）+ CHANGELOG/README 披露条目
4. 前向规则：安装通道宣称绑定当前 tip，重写后自动失效待复验（入 ADR-0074 后果段）
5. telemetry 检查点 + defer-0053/0054/0055 处置 + 卫生项 O-A..O-E 取舍
6. t12 账本注记：D-003 “blob 保留”补注 “local-only post-purge”

**显式约束/负向需求**:
- grill 中不改源码、不设其他目标
- 一次一问；定稿由 owner 宣布
- 复验是 R2 动作（本轮只定计划/议程）
- 清洗 runbook 不得复述被涂字面量/敏感文件内容
- 映射表必须工具生成、append-only，不手工对照
- 不启用 refs/replace/（旧 SHA 不进公开 ref 空间）
- 发布既成事实：origin/main=051744a；不 push 仍是默认（除 owner 明令）
- 事后修订只许向更严方向（Tightening-Only）

**状态**: current

## D-002

**原问题**: published-tip 复验深度——a.仅安装成功+resolved SHA / b.安装+工件活性烟测 / c.全量审计重跑 / d.b+全树 diff 等价断言。atomcode 调研后呈报修正版。

**原回答原文**: “采纳”

**规范化需求**: 复验深度 = d′：(b) 安装+活性烟测为宣称的最低充分层（clean-env npx github: → 装出 → .jiahao-profile/verifier 注入验证 → 真 Stop 产 lane 记录）+ (d-whitelist) diff 断言：`git diff <pre-purge 边界>..051744a` 输出 ⊆ 已登记清洗 hunks 白名单（set-difference 断言，非逐字节等价）；range-diff 用于 commit 序列级对照。复验证据记录强制字段：resolved SHA（npm 报）+ clone 目录实测 git rev-parse HEAD + npm 版本 + allow-scripts/--allow-git 授权 flag + 装出工件内容指纹。npm v12 环境变量（install scripts 默认不跑、git-hooks 类需显式 approve）为复验环境必须固定的参数。白名单外出现差异 → 宣称挂起走 downgrade 条款。执行属 R2；grill 只定议程。

**显式约束/负向需求**:
- 不做 (c) 全量重跑（宣称膨胀——宣称是“安装通道可复现”，非“功能正确”）
- 不用逐字节等价断言（清洗 hunks 是登记差异，断言必假）
- 不只抄 npm resolved 字段作证据（npm/git#252：resolved SHA 可与物化字节脱钩）
- 复验计划须预注册先于执行（R1 落 ADR/spec，R2 才跑）
- 证据记录不复述被涂字面量

**状态**: current

## D-003

**原问题**: 披露与映射的载体形态——3a 披露载体（README 一行/CHANGELOG/仅治理文档）；3b 映射表范围（仅悬空引用/全部引用三分类/全 commit）；3c 注记形态（逐文件头注/中央表+单点指针/混合）。atomcode 调研后呈报修正版。

**原回答原文**: “采纳”

**规范化需求**:
- 3a：README `Distribution boundary` 段加一行披露（2026-09-17 发布前历史经 owner 下令合规清洗重写，旧 SHA 解析见 rewrite-map）+ ADR-0074 承担决策/授权/后果；不建 CHANGELOG.md（无 release 节奏，一次性事件立惯例反成不一致）
- 3b′：docs/rewrite-map.json——重写区 commit 全量 old→new（不变标 same、被移除标 null，filter-repo commit-map 语义）+ 文档引用 SHA 三分类（rewritten→new / local-only / published-unchanged）；local-only 条目只列 SHA+标签、不展开内容元数据（SLSA 最小披露）；生成器=脚本扫 tracked docs hex 引用 + 双侧历史 message 对齐导出；append-only
- 3c′：治理面文件（ADR-0073、docs/governance/decision-ledger-t12.md、README）加指针注记；.scratch 记录零改动（append-only 纪律），中央 map 为唯一翻译点；顺手规则：未来编辑触到 rewritten 类引用时就地换新 SHA

**显式约束/负向需求**:
- 不改 .scratch 任何已发布记录文件
- 不启用 refs/replace/（GitHub UI 不消费，且会把旧 SHA 写进公开 ref 空间）
- local-only 枚举若 owner 要更保守口径可降为只标类别——当前采纳为列 SHA+标签
- 映射表声明必须求全（不全=新不一致）
- 披露措辞克制、不复述被涂内容

**状态**: current

## D-004

**原问题**: 结转与卫生项处置包——defer-0053/0054/0055、defer-0050/0051/0052/0056 四条 tally、O-A..O-E。atomcode 调研后呈报合成版。

**原回答原文**: “采纳”

**规范化需求**:
- defer-0053 保持 deferred：写死 unfreeze 条件（出现首笔真实写入，或分析侧分类器覆盖率破阈 → 升格 action）；条目注明代价——零写入假设破裂时存在脏数据窗口
- defer-0054 本轮捡起：repo 侧零依赖 pattern 扫描脚本（~30 行，已知敏感文件名/路径 pattern + 简易高熵检查）注册进门禁注册表；不装 gitleaks 类二进制（宿主变更排除）；条目保留 unfreeze（pattern>3 条或漏报事故→重估 gitleaks）；明写检测力折损（自研对未知 secret 形态盲）
- defer-0055 转低频 cadence 单项：cadence_tier=quarterly + 升格触发（有机流量连续 N 周>阈）+ 关闭条件（如 6 个月零流量关闭）；telemetry 逐轮自动打印仍保留（零成本，不占评审位）
- defer-0050/0051/0052/0056：本轮 R2 把四笔 pending 评审实际做掉并关闭（各轮净增量 vs 治理趋势锚对账）+ 另立一条常驻 cadence 项“每轮 registry 净增量评审”防再生
- O-A 本轮捡起：固定名 temp dir → mkdtempSync（adr-0022/adr-0030 等处）
- O-B 本轮捡起：中间提交红态惯例一行成文（AGENTS.md 工作约定）
- O-E 保持 deferred（无故障驱动，低优 backlog）
- O-D 降级出登记册：boy-scout 顺手规则，不占条目位

**显式约束/负向需求**:
- 不装 gitleaks/trufflehog 二进制（宿主变更）
- 不逐轮评审 defer-0055（无信息量输出=负价值）
- 合并四条 tally 前各条独有内容并入常驻条目正文，不丢语义
- flake 修复不许用重试掩盖（rigged game）；修不了的走 quarantine
- 登记册瘦身方向：流程性内容→cadence 项，工作项→unfreeze 条件

**状态**: current

## D-005

**原问题**: 收尾边界与审计节律——a.轻量收尾无独立审计 / b.窄域独立审计收尾（新宣称清单式 scope + 标准复跑清单）/ c.全量审计重跑；附带 (d) 复验通过后宣称加证据层注记、(e) 推送策略。atomcode 调研后呈报修正版。

**原回答原文**: “ok”

**规范化需求**: 收尾形态 = b + 细则：
- R1 文档（ADR-0074 + 清洗 runbook + rewrite-map 生成器 + 治理面注记 + README 披露行）→ R2 动作（published-tip 复验执行、map 生成、pattern 扫描器、registry 处置、卫生项、t12 账本注记）→ 轮报告 + telemetry 检查点
- 窄域独立审计收尾：scope 清单预注册三核验对象——披露条目逐条复验 / rewrite-map 抽样验证（映射→对象一致性）/ published-tip 复验结论复核；工程动作（扫描器/registry/卫生）凭工具落地证据自检；复跑清单含 run-test-gate --expected-suites（t12 落地的新标配）
- (d) 复验通过后宣称加证据层注记：`verified-at-published-tip:<sha> + tool + date + evidence-class`，注记绑定 commit 语义（描述该 tip 的事实，不持续刷新）；失败则宣称挂起走 downgrade
- (e) 分流推送：披露/宣称类（披露条目、证据注记、审计结论摘要）复验+审计过后应推送——“披露躺本地=披露未发生”；工程中间产物默认不推、聚合收尾推；**推送动作专属 owner 明令**，本轮计划登记“不推送=披露未生效”依赖并在收尾时呈请
- 新增治理规则入 ADR-0074：独立核验触发条件（对外宣称出现/触碰清洗区/风险超阈 → 第二方；其余轮走 a）+ 审计报告必须声明独立性实际等级（同会话同工具链=弱独立，如实写）

**显式约束/负向需求**:
- 不做全量审计重跑（日历心态，D-002 同形态已否决）
- 窄域 scope 以清单预注册为准，防“新宣称”边界漂移
- 零独立核验不可接受（侵蚀宣称可信度这一核心资产）
- 不把第二方变例行橡皮章（普通工程轮应走 a，触发条件规则保护这一点）
- 不 push 仍是默认；推送须 owner 明令

**状态**: current

