# grill-t38 Q5 调研题面 — N-3 emit 契约（生成器输出形与消费腿合一）

## 你的任务
对 grill-t38 断言锚定轮的 N-3 漂移（build-audit-checklist emit 对象壳 ↔ check-audit-surface 裸数组消费）给出修法推荐与理由。先读必读工件再作答；逐条冲突核查。

## 必读工件
1. D:/Aworker/jiahao/.scratch/grill-t38/decision-ledger.md —— t38 账本（D-001 含 N-3 修法定向「emit 输出对齐裸数组形+ADR 登记 emit 输出形即注册契约」；D-002 消费契约；D-003 集合锚；D-004 发射侧 anchor 字段+消歧三规则）
2. D:/Aworker/jiahao/scripts/build-audit-checklist.js —— emit 实现（97-99 行：console.log JSON.stringify({commands,advisories})；61 行 _doc 自述「auditor 贴入」契约本意；check/build 命令族）
3. D:/Aworker/jiahao/scripts/check-audit-surface.js —— extractCoverage（44-54 行：json fence→JSON.parse→必须非空字符串数组；fail-closed 全缝报错）；消费语义=块声明 DECLARED 覆盖，块本身是断言对象
4. D:/Aworker/jiahao/docs/adr/0091 —— audit-coverage v1 契约原文（D-B 哨兵声明区域/generator never co-signs/D-E 提取器注册/块字段形）
5. D:/Aworker/jiahao/.scratch/grill-t38/handoffs/next-round.md —— N-3 新发现原文（§9 波 B 手工对齐证据）
6. D:/Aworker/jiahao/.scratch/grill-t37/decision-ledger.md —— t37 全账（D-002 枚举单位/D-003 原因码/D-005 revised/D-006）
7. D:/Aworker/jiahao/src/shared/status-inventory.js —— renderSentinel/parseSentinels 对照组（status-inventory 族块渲染器已存在，emit=renderer 的先例形）
8. D:/Aworker/jiahao/docs/governance/audit-checklist.json —— 持久文件形（checklist.commands+advisories 全貌）
9. 现行报告里 audit-coverage v1 块的实际字段形：grep 仓内 .scratch/*/reports/*.md 与 handoffs 中已提交块确认是裸数组还是对象壳（调研期间实测）

## 已实测事实
- emit 输出 = JSON.stringify({commands:[...], advisories:[...command 字段]})——对象壳
- extractCoverage 要求块 fence 内 JSON.parse 结果为「非空字符串数组」——裸数组；fail-closed（任何解析缺口 throw）
- 块外层结构 = `<!-- audit-coverage v1 -->` 标记行 + ```json fence——审计人手工组装
- _doc 注释自述 emit 是「prints the commands array for the audit-coverage v1 block」——契约本意=命令数组，对象壳是实现漂移
- advisories = 非命令面提示（ADVISORIES 常量，emit 时映射出 command 字段）
- status-inventory 族已有 renderer 先例：build-status-sentinel 输出可直接贴的完整块（sentinel 标记+json fence 一体）

## 待裁问题
主选项：
a) emit 直打裸 commands 数组（对齐 fence 内容；sentinel 标记行仍手工包——残余手工面）。
b) 消费腿放宽收对象（extractCoverage 兼容对象壳——解析宽容扩大违 fail-closed 先例，列出以否决）。
c) emit 直打完整可贴块（sentinel 标记+json fence+裸数组一体=build-status-sentinel 同形；emit 输出=可贴工件逐字同形，手工面归零）。
d) 其他。
子问：
1) advisories 去向：emit 时 stderr 分离 / 独立 --advisories 子命令 / 只留持久文件不进 emit 通道。
2) 契约注册形：ADR-0096 §N-3 立法「emit 输出形即注册契约，改形走 Declaration」；回环 pinning test（emit stdout→extractCoverage 必绿）居所=adr-0091-wiring.test.js / 独立腿 / emit 自测。
3) 历史块追溯义务：已提交报告中 audit-coverage 块实际形先实测；对象壳块存在则 forward-only 豁免 vs corrigendum；裸数组块则 emit 改向零追溯义务。

## 调研要求
1. 工业先例（自择一手）：CLI 工具「机器可读输出与可贴入工件」设计纪律（gh/gha CLI --json 与模板输出、kubectl -o json vs 清单生成器、kustomize/helm template 输出即可应用工件）；Unix「一个工具一种输出契约」与 jq 拆壳惯例的对价；代码生成器「输出即 artifact」先例（protobuf/graphql codegen 生成可编译文件非片段）；CI artifact contract 先例（GitHub Actions artifact/SARIF 输出的 schema 固定性）。
2. 冲突核查：t38-D-001~D-004 全部条款 + t37 全部 current + ADR-0091（块契约原文）/0092/0093 + AGENTS.md。特别核查：①emit 输出带 sentinel 标记是否越界「generator never co-signs」（生成器输出声明标记=帮审计人铸 claim 块？抑或仅是格式载体——界限句怎么写）；②emit 输出形变更与 D-001.10 原定向（裸数组）的偏离度（若 c 胜出，D-001.10 属精化还是改向）；③回环 pinning test 是否新建枚举面（违一轮不建两枚举面？还是 wiring test 家族既有面）。
3. 输出：推荐+子问答案 → 理由（先例引证） → 失效模式 → 冲突核查表 → 实现面草图 → 信息缺口。