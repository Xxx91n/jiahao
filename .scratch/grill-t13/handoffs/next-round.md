# grill-t13 → next-round task book

Source: ./decision-ledger.md (D-001..D-005) + ./spec-post-publish-checkpoint.md
State at close: origin/main=051744a published; workspace clean; telemetry organic=0/harness=29/selfcheck=2/unclassified=0; G1=false G3=false G4=true; promotion gate frozen.

## T-1 — R1 doc round (covers D-001, D-002, D-003, D-005)

Deliverables:
- docs/adr/0074-*.md：发布+清洗的决策/授权/后果（PR-diff 失效披露、clone/fork 注意、SHA 全变的有界范围说明）+ 前向规则（tip-pinned install claim 重写后自动失效待复验）+ 治理规则（独立核验触发条件 + 审计报告独立性等级声明惯例）
- 清洗 runbook：事实+验证证据（git log -S/--name-status 双空记录、前后 SHA 对应）；不复述被涂字面量/被移除文件内容
- docs/rewrite-map.json 生成器 spec（scripts/build-rewrite-map.js 形态：扫 tracked docs hex 引用 + gb-local 双侧历史 message 对齐）
- README：Distribution boundary 段披露行 + Install 段预留 verified-at 注记位
- 治理面指针注记：ADR-0073 + docs/governance/decision-ledger-t12.md 头部一行（.scratch 零改动）
- 复验计划预注册：断言清单 + 证据四字段 + npm pin 参数 + 白名单 diff 预期 + downgrade 触发措辞
- 同步面：README ADR index→74、anchors、trend inventory、wiring seeds、t13 账本入锚

Hard rules: doc-before-impl；append-only；不复述被涂内容；不改正文引用；.scratch 零改动；不 push
Suggested skills: $domain-modeling, $to-spec, $but

## T-2 — R2 action round (covers D-001..D-004)

顺序：
1. scripts/build-rewrite-map.js 生成 docs/rewrite-map.json；验证完备性（每个被引 SHA 都有分类，不全=新不一致）
2. 执行预注册复验：clean-env npx github: → 活性烟测 → 白名单 diff → 证据记录（四字段+产物指纹）归档 .scratch/grill-t13/audit-evidence/
3. 复验过 → README Install 注记 verified-at-published-tip:<sha>；白名单外差异 → 宣称挂起+downgrade
4. pattern 扫描脚本（≤3 条规则）+ 门禁注册 + 自测试（样本能被拦）
5. registry 处置：0053 unfreeze 写死 / 0054 关闭为 actioned（保留 unfreeze）/ 0055 转 quarterly+触发+关闭条件 / 0050-52-56 四笔评审实做并关闭+立常驻 cadence 项 / O-D 降级出册
6. O-A：adr-0022/adr-0030 等固定名 temp dir → mkdtempSync
7. O-B：AGENTS.md 工作约定加中间提交红态惯例一行
8. telemetry 检查点导出（分段输出落 .scratch/grill-t13/）
9. t12 账本注记：D-003 “历史 blob 保留”补注 “local-only post-purge”
10. 轮报告 + GOAL 更新

Hard rules: 不 push；Tightening-Only；证据四字段缺一不可；flake 不许重试掩盖；复验计划未预注册不得执行；不复述被涂内容
Suggested skills: $implement, $tdd, $but

## T-3 — close audit (covers D-005)

- 新会话独立 agent 执行窄域审计，scope=预注册三核验对象（披露条目逐条复验 / map 抽样验证 / 复验结论复核），不漂移
- 复跑清单：jest 全套件 + gate:all + instrument --check + anchors + inventory + host-contracts + adr-index + run-test-gate --expected-suites <n>
- 审计报告必须声明独立性实际等级（同会话同工具链=弱独立，如实写）
- PASS → 收尾时向 owner 呈请披露类推送（D-005e 登记的依赖）；FAIL → bounce 清单返工

Hard rules: scope 冻结；审计不过不宣称
Suggested skills: $code-review / audit pattern, $but

## T-4 — registered/future (covers D-001, D-004)

- defer-0053 / defer-0055 / O-E 保持登记（新 unfreeze/cadence 字段生效后）
- 多样性 N/M 数值：promotion 评审前预注册（ADR-0073 D-D 框架）
- gitleaks 重估触发：pattern>3 条规则或漏报事故
- organic 流量观察：telemetry 逐轮自动打印，不占评审位
- 晋升门冻结不动；永不制造合成流量