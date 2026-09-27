# grill-t13 spec — post-publish checkpoint

Date: 2026-09-17 | Source of truth: ./decision-ledger.md (D-001..D-005, all current)
Trigger: repo published — origin/main=051744a; pre-publish history rewrite (owner-ordered sanitization) is a fait accompli; this round folds its consequences into auditable form.

## §0 Headline

发布是既成事实，不是宣称。本轮把清洗重写这一有界破坏事件的三条尾巴收拢为可审计形态：published-tip 宣称重新落到证据上、悬空 SHA 引用获得唯一解析点、发布行为本身获得 ADR+runbook+披露三重记录。记录级动作全部登记；完成不等于终结——organic 腿仍为 0，晋升门冻结不动。

## §1 Round scope (D-001)

六子项：
1. published-tip 复验议程（最高优先）
2. SHA 悬空处置（rewrite-map + 治理面注记）
3. 发布行为三重记录（ADR-0074 + 清洗 runbook + README 披露行）
4. 前向规则（安装宣称绑定 tip，重写自动失效待复验，入 ADR-0074 后果段）
5. telemetry 检查点 + defer/卫生处置
6. t12 账本注记（D-003 “blob 保留”补注 local-only post-purge）

显式范围外：
- promotion 评审/门移动（G1=false organic=0，门冻结）
- npm 发布形态（ADR-0011/0059 settled，不重开）
- 多样性 N/M 数值（评审前预注册参数，非本轮）
- refs/replace/ 启用（D-003 否决：GitHub UI 不消费 + 旧 SHA 进公开 ref 空间）
- CHANGELOG.md 新建（D-003 否决：无 release 节奏，一次性事件立惯例反成不一致）
- gitleaks/trufflehog 二进制安装（D-004 否决：宿主变更）
- 全量审计重跑（D-002/D-005 否决：宣称膨胀 + 日历心态）
- 采集侧 provenance 字段实现（defer-0053 保持，unfreeze 已写死）
- grill 期间任何源码修改；任何 push（owner 明令除外）

## §2 Published-tip re-verification agenda (D-002)

深度 = b + whitelist-diff：
- clean-env npx github:Xxx91n/jiahao 装出
- 工件活性烟测：.jiahao-profile/verifier 注入验证 → 真 Stop → lane 记录落地
- 等价断言：git diff <pre-purge 边界>..051744a 输出 ⊆ 已登记清洗 hunks 白名单（set-difference 断言）；range-diff 做 commit 序列级对照
- 证据记录强制字段：npm resolved SHA + clone 目录实测 git rev-parse HEAD + npm 版本 + allow-scripts/--allow-git 授权 flag + 装出工件内容指纹
- npm v12 环境参数必须固定并记录（install scripts 默认不跑；git-hooks 类需显式 approve）
- 白名单外出现差异 → 宣称挂起 + downgrade 条款
- 顺序铁律：R1 预注册计划先于 R2 执行
否决项：(a) 仅 resolved SHA（npm/git#252：resolved 可与物化字节脱钩）；(c) 全量重跑（宣称膨胀）；逐字节等价断言（清洗 hunks 是登记差异，断言必假）

## §3 Disclosure + rewrite map (D-003)

- README Distribution boundary 段一行披露（2026-09-17 发布前历史经 owner 下令合规清洗重写，旧 SHA 解析见 docs/rewrite-map.json）+ ADR-0074 承担决策/授权/后果；不建 CHANGELOG.md
- docs/rewrite-map.json（append-only、工具生成）：
  - 重写区 commit 全量 old→new（不变标 same、被移除标 null，filter-repo commit-map 语义）
  - 文档引用 SHA 三分类：rewritten→new / local-only / published-unchanged
  - local-only 条目只列 SHA+标签、不展开内容元数据（最小披露原则）
  - 生成器 = 扫 tracked docs hex 引用 + gb-local 双侧历史 message 对齐导出，禁手工对照
- 注记形态：仅治理面文件（ADR-0073、docs/governance/decision-ledger-t12.md、README）加指针注记；.scratch 记录零改动（append-only 纪律）；中央 map 为唯一翻译点；顺手规则——未来编辑触到 rewritten 类引用时就地换新 SHA

## §4 Registry dispositions + hygiene (D-004)

- defer-0053 保持 deferred：unfreeze 写死（首笔真实写入或分析侧分类器覆盖率破阈 → 升格）；条目注明代价（零写入假设破裂时存在脏数据窗口）
- defer-0054 本轮捡起：repo 侧零依赖 pattern 扫描脚本（≤3 条规则规模，已知敏感文件名/路径 pattern + 简易高熵检查）注册进门禁；条目保留 unfreeze（pattern>3 条或漏报事故 → 重估 gitleaks）；明写检测力折损（自研对未知 secret 形态盲）
- defer-0055 转低频 cadence 单项：cadence_tier=quarterly + 升格触发（有机流量连续 N 周>阈）+ 关闭条件（如 6 个月零流量关闭）；telemetry 逐轮自动打印保留（零成本不占评审位）
- defer-0050/0051/0052/0056：R2 实际评审关闭（各轮净增量 vs 治理趋势锚对账）+ 立常驻 cadence 项“每轮 registry 净增量评审”防再生；合并前各条独有内容并入常驻条目正文
- O-A 本轮捡起：固定名 temp dir → mkdtempSync（adr-0022/adr-0030 等处）
- O-B 本轮捡起：中间提交红态惯例一行入 AGENTS.md 工作约定
- O-E 保持 deferred（无故障驱动，低优 backlog）；O-D 降级出登记册（boy-scout 顺手规则不占条目位）

## §5 Closeout form (D-005)

R1 文档 → R2 动作 → 轮报告+telemetry 检查点 → 窄域独立审计：
- 审计 scope 预注册三核验对象：披露条目逐条复验 / rewrite-map 抽样验证（映射→对象一致）/ published-tip 复验结论复核；工程动作凭工具证据自检
- 复跑清单含 run-test-gate --expected-suites <n>（t12 落地的新标配）
- 复验通过 → 宣称加证据层注记 verified-at-published-tip:<sha>+tool+date+evidence-class（绑定 commit 语义，描述该 tip 的事实不持续刷新）；失败 → 挂起+downgrade
- 推送分流：披露/宣称类审计过后应推送（披露躺本地=披露未发生）；工程中间产物默认不推、聚合收尾推；推送动作专属 owner 明令——计划登记“不推送=披露未生效”依赖，收尾时呈请
- ADR-0074 另载两条治理规则：独立核验触发条件（对外宣称出现/触碰清洗区/风险分超阈 → 第二方，其余轮走轻收尾）+ 审计报告独立性等级声明惯例（同会话同工具链=弱独立，如实写）

## §6 Constraint register（负向需求并集）

- grill 期不改源码；不改 .scratch 已发布记录文件
- 映射表禁手工对照、必须求全（不全=新不一致）
- 不复述被涂字面量/敏感文件内容于任何新文档
- 不只抄 npm resolved 字段作证据；不做逐字节等价断言
- flake 修复不许重试掩盖；修不了走 quarantine
- 不把第二方变例行橡皮章（普通工程轮走轻收尾由触发条件保护）
- 不 push（owner 明令除外）；不重开已 settled/冻结项；事后修订只许向严