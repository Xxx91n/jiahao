# Decision Ledger — grill round ADR-0059 (锐评善后)

Slug: grill-adr0059 | Source: .codex-tmp/锐评.md 逐条辩证处理 | Created: 2026-09-12

---

## D-001 | current | 2026-09-12

- **Original question (Q1)**: 锐评「改名/换安装路径」善后 —— A(保留名+GitHub通道) / B(scoped预留+GitHub通道) / C(立即改名认领) / D(Tier1降级手动clone并入defer-0001)；私有仓库前提下 方案甲(B+D组合, Tier1 文案挂钩仓库公开) vs 方案乙(先降级授权clone, 公开后升级 github:)。
- **Your verbatim answer**: 采纳
- **Normalized need (atomcode 调研结论，方案甲)**:
  - README Tier 1 立即改为 GitHub 通道措辞 `npx --yes github:<org>/jiahao init`，文案挂钩「仓库公开后可用」（当前私有，诚实标注）
  - 含**名称声明**：npm 无前缀名 `jiahao` 2019-07-31 被他人注册（jiahao@1.0.3 测试包），本项目从未发布 npm、不认领该名，README 任何位置不得出现指向 registry `jiahao` 的命令
  - **scoped 预留**：声明未来发布用 `@<org>/jiahao`；尽快注册 npm 用户名/组织占 scope（先占先得）
  - 新增独立 defer 条目「npm scoped 发布通道」，unfreeze 条件与 defer-0001 逐项对齐（publish pipeline + remote + OIDC + 制品清单）；**不并入 defer-0001**（主题：supply-chain signing，合并即主题漂移）
  - `<org>` 名未定 —— 初稿用占位，发布前完成候选名可用性核查（含归一化变体）
- **Explicit constraints / negative needs**:
  - **改名（C）拒绝**：npm 相似性护栏 403 不可预知 + 无前缀名已死 + 全仓改名成本极高；仅当 npm 发布成为核心分发目标且 defer-0001 解冻时才可重议
  - 不承诺当下任何 npm 发布（defer-0001 rationale 保持成立）
  - 打包面新增为 0（pack 余量仅 57 字节，纯 README 文案改动）
  - 验收通道：本地 `node scripts/install.js --dry-run` smoke（平台 403 无强制层）
- **Rejected / collateral**:
  - 「README 安装命令指向他包」检测——工业界确认无现成轮子（检测空白）；是否自建微门禁进 BACKLOG，未来轮次决定（涉 gates.json 需 ADR 同提交）
- **Refs**:
  - atomcode 调研（17 来源 / 10 全文）：npm disputes 政策、scoped 官方文档、left-pad 官方复盘、arXiv 2607.15780 (READU)、jurisd INSTALL.md 两段式先例、npx github: MCP 实战
  - 锐评 §3（触发点）与 §处方1（改名主张，被拒）
- **Conflicts checked**: defer-0001（无冲突，不发布承诺保持）；ADR-0011（CLI 保留，仅通道换 git）；ADR-0038 D2（协同：D2 已预设 public clone 场景）；ADR-0056/0057（协同：README 可验收性）；D-006/D-009（不涉 gates.json）

---

## D-002 | current | 2026-09-12

- **Original question (Q2)**: MCP 档（tarball 第三分发档装后即坏）处置 —— A(依赖上提) / B(降级标注) / C(打包面手术) / D(workspaces)。
- **Your verbatim answer**: 采纳
- **Normalized need (atomcode 调研结论，C + source-only 标注)**:
  - package.json files 白名单移除 `jiahao-mcp/`；README Protection tiers 表 + Distribution boundary 节改写为「source-only / git-tree component」，给出 clone+cd jiahao-mcp+npm i 用法，status: experimental / source-only
  - **ADR-0038 D1 必须 amend**（白名单含 jiahao-mcp/ 是矛盾根源）：走 ADR 修改 + wiring 测试同提交（ADR-0027）；测试 adr-0038-wiring.test.js 的 files 断言同步去 jiahao-mcp/；pack 预算断言不变
  - test/mcp.test.js 保留（git-tree 组件本身继续验）；verify-build 的 MCP start-alive 保留为 git-tree 开发侧检查
  - 新建 defer-00XX「MCP 发布通道复活」：unfreeze_if = 真实外部 MCP-only 消费者出现 AND 有发布通道；镜像 defer-0007 模式
  - pack→install→smoke 完整性闭环：本轮仅落地为文档轮验收脚本；gates.json 注册推迟到实现轮（ADR-0027 同提交、D-001 不动 gates.json 约束下）
  - ADR-0038 实现注记中 .npmignore 排除 jiahao-mcp/package-lock.json 的注记语义随 C 消失，清理之
  - 顺手修正 pack 断言路径：npm pack --dry-run 内容物不再出现 jiahao-mcp/
- **Explicit constraints / negative needs**:
  - **不接受 A**：为一个 2.5KB 文件引 @modelcontextprotocol/sdk（unpacked 4.3MB/693 文件/16 依赖）+ zod，违背 ADR-0027 R1 零额外依赖纪律与 ADR-0039 D3 预算精神
  - **不接受 B**：等价于 ADR-0056 已否决的 skip-only 降级（「we never verify on a clean install」）
  - 无 deprecation 仪式（v0.0.1 未发布、零消费者，semver.org 允许任意变更）
  - 打包预算 200KB：移除后反而回收 ~2.9KB 未压缩/约 1.5-2.5KB 压缩
- **Refs**:
  - atomcode 调研：npm by design（SO 38853004/72921321、npm/cli#4130、#7630）、vscode-ripgrep-universal / esbuild 平台包拆包先例、karajan-code pack-smoke.yml 三连发翻车、CITGM/publint/attw、semver.org 0.y.z
  - ADR-0009 后果节原文（opt-in）；ADR-0038 D1；ADR-0056 skip-only 否决；ADR-0027 R1
- **Conflicts checked**: ADR-0038 D1 → 显式 amend（非静默）；defer-0001 协同；ADR-0039 D3 协同；ADR-0056/57 协同；D-001 协同（同轮落地，不动 gates.json）

---

## D-003 | current | 2026-09-12

- **Original question (Q3)**: 战略资源方向 —— A(转向产品力: 召回主攻+治理维护+ADR预算0) / B(收缩: 砍治理军备70%+ADR冻结+SKILL.md一等公民) / C(维持混合: 治理靠 registry 到期潮收敛 + 产品力一轮轻量特征研究不承诺指标)。
- **Your verbatim answer**: 接受
- **Normalized need (atomcode 调研结论)**:
  - 选 **C**，附两个方向锁定：
    1. **产品力轮技术方向锁定为「wordlist→轻量判别式特征（TF-IDF 族）+ bench 增测阶梯 1-4 确定性级覆盖率」**——明确不走 LLM judge 校准主攻召回（judge 2026 SOTA 实证 AUROC <=0.65 且死于自信收尾语言；轻量特征 0.83/0.95 同族增量）
    2. **治理收敛机制 = defer registry 到期潮的既有 fail-closed 节拍**（不做一次性 70% 大删；2026-11-30 defer-0002/0005、12-06 defer-0023 到期条目照 ADR-0033 activate/remove）
  - 检测器定位的正名：recall 34.7% + FP=0 在 SAST/IDS/反欺诈属正常部署形态，语义是 triage/审计触发器，6 级阶梯 1-4 级才是主防御；L5/L7 (0/40 全漏) 是产品力轮要救的明确区间
- **My confirmation of two value-judgment points**:
  - (i) 研究轮不承诺指标 → **须在 bench README 记录豁免**（防预注册纪律漂移）—— 接受
  - (ii) 收敛机制 = registry 到期潮而非一次性删减 —— 接受
- **Explicit constraints / negative needs**:
  - 不走 A 的「LLM judge 校准主攻召回」路线（与 ADR-0004 critic 最弱契约冲突 + 2026 SOTA 证伪 + 需 human-labeled anchor 而 defer-0015 尚不存在）
  - 不做 B 的「砍计量学/锚定/dead-man 族 70%」（那是 SKILL.md hash-chained evidence / bias guards 承诺的实现载体；SQLite 先例：验证资产大于本体可长期存活）
  - 「ADR 冻结新增」被部分吸收：不主动新增，但 ADR-0033 review 节拍义务保留（冻结≠停 review）
  - 不破坏 ADR-0027「gates.json 与 ADR 同提交」
- **Refs**:
  - atomcode 调研（ICML 2026 false-success arXiv:2606.09863、Axelsson 1999 base-rate、Governance Laundering 框架、OpenAI Confessions、Anthropic probes、SQLite/suckless/busybox 先例、Galtea 校准实证）
  - 锐评 §1/§2/§4/§5/处方2（辩证否决大删减方向）
- **Conflicts checked**: ADR-0001/0004/0018/0033/0046/0048/0049/0050/0053、defer-0001/0015、D-001/D-002 —— C 路线全部零冲突；A/B 的冲突点（若未来翻案）已在 Q3 调研 §7 逐条列出待用户拍板，不需要本轮 revised

---

## D-004 | current | 2026-09-12

- **Original question (Q4)**: 锐评 §1「同边界验证=表演」指控处置 —— A(wiring 降权为 self-consistency tier) / B(外置异构模型审计通道立项) / C(A+B) / D(拒绝指控)。
- **Your verbatim answer**: 采纳
- **Normalized need (atomcode 调研结论，C)**:
  - **A 措辞降级**：wiring 测试正名为 **characterization / change-detector 层**，对外承诺定位为 **coherence-tier limited assurance**（ISAE 3000 术语）——保证「文档与代码一致」，不保证「行为本身正确」
  - **SKILL.md 禁令精确化**（表面冲突、实质兼容，非 revised）：「同边界验证=表演」细化为「self-validation provides coherence evidence only, not independence evidence」；README 写入箴言 **"agreement is not accuracy"**（arXiv:2607.08065）
  - **B 立项**：新 defer 条目「异构模型复盘通道（independent review channel）」——presence-condition，unfreeze_if = 存在 ≥1 个不同模型家族可用通道 + review-tasks.json schema 落库；cadence=quarterly；review_at 对齐最近到期潮；verified_by=scripts/check-independent-review.js
  - **B 通道诚实约束**：只能声称 IEEE 1012 **technical independence（部分）**，绝不可声称 managerial/financial independence；该无法达到的维度必须显式标注（2026 实证：跨模型 confident errors 仍部分共享，ρ 仅 0.20-0.59）
  - **MVP 落仓库内**：审计报告先落仓库内（不触发 defer-0024 external-event），外置留作显式升级路径
  - **不与 defer-0015 合并**（ADR-0035 D4 单条件纪律）；为 defer-0015 提供候选素材
- **Explicit constraints / negative needs**:
  - **降权 ≠ 放松**：22 个 wiring 文件 / 671 测试 / ADR-0057 suite-count 断言数量不得削减；改的是声称强度，不是检查强度（FIX-DON'T-HIDE 同构）
  - 不再把「wiring 一致性 ≠ 最终 verdict」当「不是同边界」辩护（deterministic ≠ independent 已被论证为语义泥潭）
  - 不引入重型框架；B 通道为 zero-dep 轻量脚本 + registry 条目
- **Refs**:
  - atomcode 调研：IEEE 1012 §3.1.9 + Annex C / IEEE USA 2022 self-certification 谴责 / ISAE 3000 limited vs reasonable assurance / NIST GCR 23-043 / NASA IV&V / DO-178C 分层 / arXiv:2607.08065 (agreement ≠ accuracy) / 2607.10139 (cross-family ρ=0.47) / arXiv:2603.12123 (self-correction blind spot) / NeurIPS 2024 Estornell & Liu (相关性错误破坏多数投票)
  - 锐评 §1 指控；ADR-0004/0029/0040；ADR-0058 D-D、D-012、结算表 D-004/D-007 stale 记录
- **Conflicts checked**: 全部 current 记录兼容；D-004/D-007 stale（403）恰为本 B 通道要补的缺口；defer-0015/0024/0027 边界已划清

---

## D-005 | current | 2026-09-12

- **Original question (Q5)**: 锐评处方5「SKILL.md 全篇打磨」处置 —— A(本轮顺带做) / B(只落地 D-004 两处措辞修订 + 全篇打磨立项延迟捆绑触发器) / C(不立项)。
- **Your verbatim answer**: 采纳
- **Normalized need (atomcode 调研结论，B)**:
  - 本轮只落地 D-004 两处措辞修订（禁令精确化 = facts 修订；README 写入 "agreement is not accuracy" = README 修订，不触及 SKILL.md 其余文本）
  - deferred-registry.json 新增条目「SKILL.md 全篇打磨/结构精修」：unfreeze_if =（产品力召回研究轮 OR 异构审计）产出 >=N 条可证伪 SKILL.md 缺陷（每条须带 bench/GSR/审计证据锚点），**且** tarball 预算轮（ADR-0058 R4）先落地；仿 defer-0013 注册规范（cadence_tier / registered_at / review_at / verified_by 若可）
- **Explicit constraints / negative needs**:
  - 不接受 A「全篇打磨」：工业界无此操作对应（prompt 变更管理单元 = 带 eval 的 diff）；会爆 ADR-0039 D3 的 200KB/剩 57B 预算并触发 ADR-0058 词表同步连锁；属绕开 criteria-change 审查的隐式改阈
  - 不接受 C「不立项」：其「无判据」前提在本项目被攻破——bench / GSR 覆盖检查 / 异构审计即现成外部信号源
  - 退出判据（若未来解冻）：句级归因 trigger:<bench-run-id|GSR 缺号|审计 finding-id>；GSR 覆盖 + wiring 全绿；打磨前后 bench 判定分布无显著漂移（预注册 delta 阈值）；npm pack --dry-run < 200,000 实测；词表同步核对
  - 停损线：「他人能否注意到」测试、两轮零实质 comment 即冻结、预算触及即冻结转入预算轮、完成后回「冻结 + errata」姿态
- **Refs**:
  - atomcode 调研：OpenAI/Anthropic prompt 官方指南、Braintrust/LangSmith prompt 版本管理、RFC errata 流程、camera-ready、Deason knee 判据、Vale/Diátaxis/JBGE/docs-as-code、perfectionist's paradox
  - ADR-0001/0011/0027/0031/0032/0033/0035/0039/0058；defer-0013 先例
- **Conflicts checked**: 零账本/ADR 冲突（逐项核：D-001~D-004 + ADR-0001/0011/0027/0031/0032/0033/0035/0039/0058）

---


## D-006 | current | 2026-09-12

- **Original question (Q7)**: 重认证时暴露的「既存非符合」（判据首次施加于既存数据、与上次通过记录指标零变化、非本次变更回归）如何处置 —— A(重验证必须全绿方可重认证) / B(处置与认证解耦：判据缺陷型非符合走让步/条件性认证，带 CAPA+期限) / C(回滚 + 回退变更，规避身份变更)。
- **Your verbatim answer**: 采纳（B，继续下探）—— 逐项核对 D-001..D-005 零硬冲突后，D-006 置为 current；下探交付物见 `.scratch/grill-adr0059/reports/2026-09-12-q7-disposition.md`
- **Normalized need (atomcode 调研结论，B)**:
  - 业界一致心智模型：**非符合处置(disposition) 与 认证决策(certification decision) 解耦**；认证决策基于「证据充分性 + 残余风险可接受性」，不以单点判据通过为唯一前提
  - 本场景统计定性 = **inconclusive（证据不足）**，非 **fail（确认不合格）**（n=22 不足；应输出 CI 宽度 + 功效分析）
  - 处置对象 = **判据与采样计划本身**（判据缺陷），而非仪表/系统
  - 机制组合：条件性认证（带条件维持/暂停待纠正，限期）+ 偏差许可/让步接收（限期限量、禁开放式、带 CAPA）+ 分级放行（收窄再验证范围）+ 追溯审查（回顾性评审，仅作证据手段）+ 判据修订（**须独立于论证、走正式变更控制**）
  - 铁律：**禁止事后改限硬凑通过**（FDA/BioPharm 明文反模式）
  - 与本项目 ADR-0047 分级再验证同构；与任务书 Next grill direction 的「Decision-rule change-management policy」方向一致
- **Explicit constraints / negative needs**:
  - 不得以「让既存数据通过」为目的反向修订判据（必须独立变更控制 + 统计论证 + 记录「考虑过但未采用」的判据）
  - 让步/条件性认证不得开放式（必带期限 / CAPA / 复审）
  - 不得把「追溯验证」当验证（EU GMP Annex 15 明确否定）；只能作追溯「审查/评审」
  - 代理不得自签（人工签署仍是必要条件）
- **Refs**:
  - atomcode 调研（21 搜索 / 10 全文核验）：FDA Investigating OOS Results 2022、ISO 9001:2015 §8.7、IATF 16949 让步条款、21 CFR 820.90、ISO/IEC 17021-1、CAMA 60 天限期、FedRAMP/CMMC POA&M 180 天、OCC 2026 materiality、SR 11-7、EU AI Act Art 43(4)/111(2)、EU GMP Annex 11 §11 / Annex 15、NIST AI RMF Measure、TOST(MetricGate/BioPharm)、Braintrust Autoevals / LangSmith 2026
  - 本项目 ADR-0046/0047/0049/0058；账本 D-001..D-005；证据 `.scratch/grill-adr0059/reports/2026-09-12-report.md` §2b
- **Conflicts checked**: 逐项核 D-001..D-005 —— **零硬冲突**。边界提示（需你确认，非冲突）：D-004「Downgrading claims must never downgrade checks」与让步式处置的关系 = 让步是「处置记录」，**不改检查强度**（wiring 计数/套件断言仍锁定），故兼容；但若采用「判据修订」，须走 criteria-change 正式通道（ADR-0039/0058 语境），不得静默改阈。
  - 另：任务书已预告的 grill 方向「Decision-rule change-management policy（谁可修订预注册门）」正是本 D-006 推荐#4 的对应议题 —— 二者同向，不冲突。

## D-007 | proposed | 2026-09-12

- **Original question (Q8)**: 预注册的确认性门值（pack 200,000 字节上限）在合法产品增长下变得不可达（收窄轮 M=140,778 未触发重算；当前实测 205,741；排除偶然面后 200,977；再排门脚本仅 92 B 余量 = 被 Rejected R4 拒绝的假警报带），应如何处置？A 坚持 200,000 并维持红；B 有意抬高上限（走正式 ADR）；C 改 D1 把 CONTEXT.md 移出打包面；D 收窄出货面。
- **Your verbatim answer**: 「是否为本轮计划表范畴内的内容？如果是就行动，不是的话只能放在报告里面留给下一轮主Agent的grill」
- **Scope determination (修复窗口)**: **不在本轮范畴 → 仅记录，交下一轮 grill**。证据：任务书 `.scratch/grill-adr0059/handoffs/next-round.md` 的 `## Tasks` 仅 D-001..D-005；其 `## Next grill direction (after this round lands)` 首条即「**Decision-rule change-management policy (who may amend pre-registered gates)**」。故本 D-007 保持 `proposed`，**本轮不执行任何上限 / 打包面改动**（含步骤 1 的偶然面修正——同属该决议包）。
- **Normalized need (atomcode 调研结论)**:
  - 核心心智模型：**「没有不可修订的预注册值，只有不可静默修订的预注册值」**
  - **修订权 = 规格所有者**（ADR 决策主体/项目负责人），**不是写测试的人、更不是被测对象**；测试无权移动规格限（ISO/IEC 17025 §3.7、ILAC G8:09/2019「测量前商定并文档化」、JCGM 106:2012「选择公差限与接受限是业务或政策决策」）
  - 合法性**五要素**：触发（cause-driven 非 failure-driven）· 程序（正式 ADR/ADR 修订）· 证据（测量链 + 增长分解 + 不确定带重估）· 记录（双向指针 + 与门值同提交）· 时机（**前瞻性**，非事后调值让现有数据通过）
  - 定性：门**结构上不可达** → 再校准正当且必要；建议**新 ADR amends ADR-0039 D3**，新值 **255,000–257,000**（=205,741×1.25≈257,176；与预注册公式同构但经正式决议落地，避开「撞墙即抬」的反射）
  - 附带行动：**步骤 1 先修偶然面**——排除 auto-include 的 `bench/polygraph/README.md`（−4,764 B），这是修正打包不一致、**不是削减检查**
  - 防反射（步骤 5）：抬限须附「增长分解表 + 噪声底重估」（wiring 断言可拦截三件套缺失）；余量 <15% 触发预算审查 ADR（对标 SRE burn-rate 预警 + 季度重审）；**处置与放行解耦**保持
  - 根治选项（开放）：修订 ADR-0038 D1，把词汇资产（CONTEXT.md，95.7 kB，占近半）从「运行时硬上限」中**单列**——「留在打包面」≠「计入同一硬上限」
- **Explicit constraints / negative needs**:
  - **禁止事后改限硬凑通过**：ICH E9 §5.1——只有方案预见（含正式修订）的分析才是确认性的；事后改判自动降级为探索性
  - **不得为过门删检查**：repo-tree 门脚本（在 scripts/ 白名单内、只读 git tree）**不得**为过门而移出（D-004「降级声明绝不降级检查」）——除非另行独立 ADR
  - **禁止静默修订**：偏差必须披露（偏差披露表：类型/原因/时机/影响）；未披露的灵活性使假阳性膨胀（Simmons 2011）
  - **ADR 不可变**：旧值保留原文、标记 Amended/Superseded、**双向指针 + 单次原子提交**；单向 supersession = 完整性 bug
  - **代理不得自签**（承接 D-006）：抬限决议的批准属规格所有者
- **Refs**:
  - atomcode 调研（15+ 检索 / 9 篇原文核验）：ILAC G8:09/2019、JCGM 106:2012、ISO/IEC 17025 §3.7、ISO 14253-1、ICH E9 §5.1 + FDA Guidance、Nygard《Documenting Architecture Decisions》、architecture-decision-record 社区规范、WhyChose supersession 模式、Google SRE Workbook Ch.2 + App. B、ai/size-limit 官方 README、Code With Seb、APS Observer 偏差披露、Simmons/Nelson/Simonsohn 2011、Calypso（Goodhart）、医疗警报疲劳研究（PSNet/AHRQ/APSF）
  - 工件: `.scratch/grill-adr0059/reports/2026-09-12-q8-budget-gate-research.md`
  - 本项目 ADR-0027/0038/0039/0047/0049/0058/0060；账本 D-001..D-006；报告 §15
- **Measurement drift note (修复窗口补记)**: 本记录的「当前实测 205,741」是**呈报时点**的值。之后测量链为 205,741 → 206,288（P-A1 代码）→ **206,501 B / 92 files**（打包面契约单一来源化）。
  下一轮 grill 引用调研建议值时**必须按当前值重算**：206,501 × 1.25 ≈ **258,127**（而非 205,741 × 1.25 ≈ 257,176）；且**决策前必须重新实测**，不得沿用任何旧数字。
- **Conflicts checked**: 逐项核 D-001..D-006 —— **零硬冲突**。关系说明（需你确认，非冲突）：
  - D-004「降级声明绝不降级检查」→ 调研明确「不得为过门删检查」，**同向**
  - D-006「处置与认证解耦」+「禁止事后改限」→ 调研的「正式决议 + 前瞻性 + 证据三件套」正是其落地形态，**同向**
  - 本轮写入 ADR-0039 的 `Budget status` 注记（「上限已被突破、需 ADR 决定」）与调研建议**同向**；若采纳建议，该注记需随之更新（属同向推进，非改向）
  - **重要教训（呈报）**：我此前「用 D3 公式把 cap 抬到 253,999」被调研明确否定（**执行者移动规格限**）；而调研建议的 255,000–257,000 在**数值上接近**——差异在**程序**而非数值。即：方向可辩，**方法不可辩**。

## D-008 | proposed | 2026-09-12

- **Original question (Q9)**: V-2（认证自签）对「一个插件」形态的项目究竟意味着什么？该要求的对象、来源与比例性如何？
- **Your verbatim answer**: 「记录进去」（= 仅记录，不动状态）
- **Normalized need (修复窗口复核结论)**:
  - **F-1 锚点错配**：认证对象是 judge/critic（`rules_version: "critic-v1"`），但其身份轴 `rules_alias = src/SKILL.md` **就是插件载荷**；故「改插件提示词」= 「judge 身份变更」→ quarantine + 重验证 + 人工签署。证据：`src/instrument-identity.json`；本轮 D-004（两句话措辞）触发了整条链。
  - **F-2 仪表未解析却被要求人工认证**：`model_identity.provider_snapshot / weights_sha256 / revision_commit` 全为 `UNRESOLVED`，`measured_repeatability.sample_size = 0`；而门只对 `rules_digest`（文本哈希）严格执行 → **对能哈希的文本最严、对真正该管的计量事实放任**，与 ILAC G8 / JCGM 106（不确定度 / 重复性）相反。
  - **V-2 重新裁定**：BLOCK 的根因是**锚点错配 + 仪表未解析**；对「插件」而言正确处置是**修锚点**，而非补签仪式。
  - **比例性观察**：产品改动 5 项轻量文档任务，治理成本 = identity 失配 → quarantine → 条件性认证 + CAPA → 审计 NOT PASSED → 19 提交整改。**本仓库最普通的变更恰是最重门控的变更。**
  - 建议选项（下一轮 grill）：(i) 解耦（rules 轴脱离插件载荷）；(ii) 休眠（模型身份解析前 instrument 轴与签署要求 dormant）；(iii) 与 D-007 同轮处理。
- **Explicit constraints / negative needs**:
  - 不得由代理自签（承接 D-006）
  - **不得以「补签仪式」掩盖设计缺陷**（记录缺陷，而非补手续）
  - 本轮**不得**擅自改 instrument 状态或 judge 锚点（均属设计决策）
- **Refs**:
  - `src/instrument-identity.json`（pin 字段）；`src/instrument-identity.js:resolveInstrumentIdentity`（三轴：model checkpoint / inference config / rules digest）
  - `docs/adr/0046-instrument-drift-recalibration.md` D-E + Rejected（"the judge would self-certify its own upgrade"）；`docs/adr/0047-impact-tiered-instrument-change-control.md` D-A
  - `CONTEXT.md`：「Second-Line Independence（组件级第二线独立性）」；「current single-host deployment, the human auditor is the highest independence」
  - 报告 §17（本轮发现）；§15.9（下一轮 grill 输入）
- **Conflicts checked**: 逐项核 D-001..D-007 —— **零硬冲突**。关系：D-006「代理不得自签」是本记录的前提（**同向**）；D-004「自证仅提供 coherence 证据」与本记录的 F-2（认证证明不了多少）**同向**。D-007 与本记录同属「治理与产品不匹配」族，建议下一轮 grill 同轮处理。
