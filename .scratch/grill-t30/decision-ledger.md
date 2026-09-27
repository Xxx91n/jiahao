# grill-t30 decision ledger

Round object: CodeBuddy 适配+试效轮为主体，E-17 机械腿顺带（e′）——首个未受控外部宿主实测 + rewrite-map freshness 断言。
Anti-loss rule: every confirmed substantive conclusion appends a record here before further descent.

## Records

## D-001 — 轮对象：CodeBuddy 适配+试效轮为主体 + E-17 顺带（e′）

- **原问题**: Q1′ — t30 轮对象取形：e′ CodeBuddy 适配+试效轮为主体、E-17 wave-closeout 腿顺带（注入面裁决文档+adapter test-first 落形+试效协议收口于采集点+装机手册含 hook 披露）/ a 纯 CodeBuddy 轮 / b E-17 单独机械化轮 / c 对抗烤 pending-confirmation 边界 / d tide 预备轮 / f 其他。
- **原回答原文**: 「采纳」（采纳 e′）
- **规范化需求**:
  (i) scope = (a) CodeBuddy 适配+试效四交付物 + (b) E-17 wave-closeout 机械腿顺带；
  (ii) 注入面裁决文档：CodeBuddy IDE/CLI 双形态逐点枚举注入点；未证实行为（CLI 侧 InstructionsLoaded/rules 加载一致性等）按形态分档并走 pending-confirmation 例外通道登记（复用 ADR-0086 / t29 D-002 立法）；
  (iii) adapter 落形：以 claude-code adapter 资产为基（官方兼容专章：.claude-plugin/、${CLAUDE_PLUGIN_ROOT} 保持原名兼容），InstructionsLoaded 事件为 verifier 注入核验锚点，test-first——验收=可执行 hook 断言（双 profile 完整落入 context），非文档叙述；
  (iv) 试效协议先行且收口于「协议文本+采集点定义」：baseline→pilot→delta 三段式结构；采集点=verifier 铁律触发次数 / generator 规则命中率 / InstructionsLoaded 捕获规则清单；本轮不出效果数字；
  (v) 装机手册含 hook 行为清单披露（插件 hooks 不受 allowUntrustedFrontmatterHooks 管辖、启用即生效——对审计是暴露面须明示）；verifier 侧加「宿主侧 hook 自描述」断言；
  (vi) E-17 顺带项：wave-closeout 腿断言 rewrite-map freshness-at-commit（re-capture→regen→verify→declare 惯例机械化）；
  (vii) human-only：实测执行本身（用户 CodeBuddy 环境内装机/读数）属用户动作；adapter 形态批准、注入面裁决未证实项的 ratify 归 owner。
- **显式约束/负向需求**:
  - 禁本轮产出「效果结论」数字（单被试测量陷阱=嘉豪病变体：觉得好用 ≠ 有证据好用）
  - 禁从零重写 adapter（先裁决差异面；claude-code 资产近零改造复用）
  - 禁静默假设 CLI/IDE 行为一致——未证实项必须 pending-confirmation 登记
  - 禁装机手册略过 hook 自执行披露
  - 轮膨胀控制：测量协议不追求首轮出数据；E-17 仅限 map-freshness 腿不扩面
  - 禁把对抗烤 pending-confirmation 边界（c）与 tide 预备（d）捎进本轮——前者登记为「lapse 首事件触发烤轮」，后者 defer 至 t31+
  - 禁静默改向（调研与账本冲突走 revised+新记录程序）
- **状态**: current

## D-002 — CodeBuddy adapter 落形：全插件 bundle + 分档登记 + hooks.json 红线（α′）

- **原问题**: Q2′ — adapter 落形：α′ 全插件 bundle（.claude-plugin/ manifest + hooks.json 全事件图 + InstructionsLoaded 断言 + rules 双 profile alwaysApply + .mcp.json；CLI verified/IDE declared-unverified 分档）/ β 兼容性声明最小面 / γ 指令层先行 / δ MCP-only / ε 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) adapters/codebuddy/ = .claude-plugin/ manifest 目录（CodeBuddy 官方兼容专章原名识别，最大化单源分发）+ hooks/hooks.json 全事件图（SessionStart/SubagentStart/UserPromptSubmit/Stop/SessionEnd 五事件迁移 + InstructionsLoaded 完整性断言新增 + PreToolUse permissionDecision:deny 承载 verifier blocking）+ rules/ 双 profile（.codebuddy/rules/*.md，alwaysApply:true）+ .mcp.json 捆绑 jiahao-mcp；
  (ii) 断言逻辑只住 hooks/hooks.json（插件路径免 allowUntrustedFrontmatterHooks 安全门、启用即生效），永不住 skill/agent frontmatter（默认静默跳过）；
  (iii) hook 脚本约束：Windows 强制 Git Bash 语法（cmd/PowerShell 不支持）、matcher 区分大小写、60s 默认超时预算；
  (iv) 分档纪律：README 设 Verified / Declared-unverified 分节——CLI 注入面标 verified，IDE 一致性标 declared-unverified 并走 pending-confirmation 例外登记（expires_at + owner ratify）；可选 defaultEnabled:false 保守默认；
  (v) 结构校验测试：plugin.json 只在 manifest 目录、组件文件在根（防静默装载失败）；
  (vi) build-adapters.js 纳入分发：adapter map 纯函数加 codebuddy 条目，--check golden 层自动覆盖。
- **显式约束/负向需求**:
  - 禁把 hook 断言写进 frontmatter（安全门静默丢弃 = verifier 铁律假死）
  - 禁发兼容性声明替代 adapter（β=让渡 InstructionsLoaded 审计位，声明≠执行）
  - 禁指令层先行（γ=rules 档无 blocking，铁律悬空）
  - 禁假设 CLI/IDE 注入面一致——IDE 面一律 declared-unverified 分档
  - 信息缺口登记项：IDE 侧事件面行为、rules 非 alwaysApply 加载优先级、npx 与 codebuddy plugin install 共存路径——三者入装机手册待裁决区，禁止写成已证实
- **状态**: current

## D-003 — 试效协议：SCED 化多相设计 + 平行卷 + 遥测自校验 + 事件式判定线（α′）

- **原问题**: Q3′ — 试效协议形态：α′ SCED 化多相（Phase0 卷A baseline / Phase1 generator 卷B / Phase2 verifier 卷C+回插卷A同型任务2-3；四类任务各≥2含埋针；Phase0 第0项遥测自校验；判定线=跨相条件事件式预注册+detect() 版本冻结+宿主版本变更 erratum；polygraph 降附录探针）/ α 朴素三段无平行卷 / β 直接全开 / γ 只测 generator / δ polygraph 主干 / ε 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 范式=SCED（单案例实验设计）多相 A1-A2-A3：被试自供跨期对照，判定靠预注册结构判据+跨相视觉分析，非推断统计（N-of-1 合法产出=判据命中/未命中+效应量印象，非 p 值）；
  (ii) 三相结构：Phase0 无注入 baseline 跑任务卷A；Phase1 仅 generator rules advisory 跑同构平行卷B；Phase2 verifier hooks 全开跑卷C + 回插卷A同型任务 2-3 个（within-phase 复现，SCED 核心抗学习效应）；
  (iii) 任务卷规范：四类任务各≥2，含埋针（已知诱发虚假完成声明的陷阱任务）+宽覆盖；三卷等价平行（同型不同题）；
  (iv) Phase0 第 0 项=遥测自校验：以已知违规动作探针验证 deny 计数器/InstructionsLoaded 真实工作（CodeBuddy 遥测保真度零公开实证——先证装置可信再采数）；
  (v) 判定线=预注册跨相条件事件式（"仅当 Phase2 出现 S 且 baseline 未出现且 InstructionsLoaded 证实在位"形态），写进协议文件先落盘再开试；instrumentation 冻结 detect() 版本，CodeBuddy 宿主版本变更登记 erratum；
  (vi) 采集点逐相：全程 InstructionsLoaded 日志+evidence-log+声明文本落盘；Phase2 独有 deny 计数+绕过尝试记录；声明文本离线 detect() 四分类（all-touched/admission/omission/overclaim）；
  (vii) polygraph 语料降级附录：仅测 deny 路径召回（测装置），不作效应证据；
  (viii) 边界：协议设计=agent 产出；三相执行=用户动作（交互式宿主人工驱动+hook 自动留痕）。
- **显式约束/负向需求**:
  - 禁产出效果数字/p 值（单被试合法产出=预注册判据命中判定+效应量印象）
  - 禁单卷复用——平行卷必须同型不同题，否则学习效应不可排除
  - 禁跳过遥测自校验直接采数（未验证的计数器产出未验证的读数）
  - 禁把 polygraph bench 当效应证据（bench 分数≠在野行为，METR 双向失真）
  - 判定线禁事后修改——修改走 erratum 登记非静默改判据
  - 禁把执行责任揽给 agent（交互式宿主是用户环境）
- **状态**: current

## D-004 — wave-closeout 腿：双层断言（腿拦 artifact + 脚本锁 process）（δ′）

- **原问题**: Q4′ — E-17 顺带项的机械化形态：δ′ 双层（新 gate 腿逐提交树内断言 + wave 脚本 regen 后 --check 净才放行，失败=阻断+人工 regen）/ α 单层逐提交腿 / β 仅终波断言 / 纯 γ 脚本锁 / ε 其他。
- **原回答原文**: 「采纳」（采纳 δ′）
- **规范化需求**:
  (i) 权威层=新 gate 腿：对轮 lane 每个涉 claim 面提交断言该提交树内全部 hex 引用在 map@commit 有对应行 + map 内部一致性（--published-only 子集断言语义移植为 per-commit）；断言输入严格树内化——该提交树的引用集合与该提交树的 map，禁引用树外状态（fresh-clone 可跑，断言确定性=merge-gate 可信任的前提）；
  (ii) 生成端=wave/closeout 流程锁：regen 派生产物后强制 --check 净才放行提交；失败路径=阻断放行+人工 regen；
  (iii) E-17 erratum 惯例文本（re-capture→regen→verify→declare）由腿落成机制，prose 保留为出处注记；
  (iv) 粒度=per-commit：stale 落进历史即污染后续提交的 bisect/blame/审计。
- **显式约束/负向需求**:
  - 禁断言输入引用树外状态（无提交即变结果的检查不可作 gate——alexandria#185 反例）
  - 禁 bot 自动补提交（违反 ADR-0083 allowlist 纪律 + 防循环护栏成本）——修复路径只能是阻断+人工 regen
  - 禁仅终波断言（β 粒度错位：事故发生在 claim 面提交落地瞬间非发布时刻）
  - 禁只靠脚本锁无腿（γ 单层可绕过：手工提交/lane 操作不经脚本）
- **状态**: current

## D-005 — 载体：ADR-0087（extends ADR-0028）+ 注册件回指（α′）

- **原问题**: Q5′ — t30 交付物载体：α′ 立 ADR-0087（CodeBuddy 宿主准入决策 extends ADR-0028 D6 + 试效协议预注册承诺；ADR 记决策不复制数值；判定线注册文件 source_adr:0087 回指；README 分档表属 disclosure 面遵 ADR-0074 D-F push 纪律）/ β 无 ADR / γ 判据入 .scratch / δ 其他。
- **原回答原文**: 「采纳」（采纳 α′）
- **规范化需求**:
  (i) 立 ADR-0087「CodeBuddy host adapter + 首个外部实机试效协议」：显式声明 extends ADR-0028 D6 分档表（新增 Claude-Code-compatible 路径家族 + pending-confirmation 分档先例——框架扩展非框架使用）；记录准入决策/理由/被否选项；
  (ii) ADR 只记决策与理由，不复制判据数值/契约细节（防 Any-Decision-Record 膨胀）；
  (iii) 判定线预注册文件住持久注册表面（thresholds.json 同构形态：持久+可回指+版本控制），每条带 source_adr:0087 回指；试验偏差显式披露并按需 re-label exploratory（OSF/RR 惯例：注册件本体不可改、偏差走记录）；
  (iv) adapter 本体=build-adapters.js 机械注册 + test/fixtures/host-contracts.json 契约条目（数据驱动一致性矩阵）；
  (v) 注入面裁决分档表住 adapters/codebuddy/README（Verified/Declared-unverified 分节），属 disclosure 面遵 ADR-0074 D-F（re-verification+audit pass 后才 push）；未证实项同步走 ADR-0086 pending-confirmation 例外登记；
  (vi) E-17 腿（D-004）与 ADR-0087 的关系：腿是执行机制，0087 承载宿主+协议语义——两者同轮但不同条款。
- **显式约束/负向需求**:
  - 禁把判据数值抄进 ADR（细节住注册件，ADR 单向回指）
  - 禁判据文件住 .scratch（轮表面非注册表面=预注册退化为自声明）
  - 禁平行另立不声明 extend 0028（分档表语义会分叉）
  - 禁无 ADR 直接落（β 违反文档轮纪律且丢失被否选项记录）
- **状态**: current

## Incident record (non-decision) — 2026-09-27 docs-loss

During the t30 documentation closeout, a GitButler workspace
re-materialization (background sync after the t29 merge `8704ce24`
landed on the workspace branch) swept the uncommitted `.scratch/
grill-t30/` files off disk. All four artifacts were rebuilt verbatim
from the author's session content and committed on `grill-t30-docs`
under normal-git mode after `but teardown` (GitButler mode was restored
via `but setup` afterward). No content was invented in the rebuild; the
ledger below is byte-identical in substance to what was verified in the
lost working tree.
