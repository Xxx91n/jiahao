# Handoff Task Book — grill-mental-model-r4 (2026-10-20)

> 本任务书由 grill-mental-model-r4 决策账本唯一派生，是后续执行 Agent 可独立信赖与依赖的常驻实施指南。
> 唯一数据源：`.scratch/archive/2026-10-20-grill-mental-model-r4/decision-ledger.md`（D-001 ~ D-004）与 ADR-0104。

---

## 一、对账与去向总表

| 决策 ID | 核心决策要点 | 去向与映射任务 | 状态 |
|---|---|---|---|
| **D-001** | 痛点靶向重构：主线归位与官僚止血，冻结 29 个虚假 gate | T-2（剥离假门禁）、T-4（心智模型收拢） | `current` |
| **D-002** | 心智模型融合定案：解除数据等待，熔铸四级反自嗨反射阶梯与 3 行输出硬锁 | T-3（AGENTS.md 入口置顶）、T-4（SKILL.md 主 Agent 武装） | `current` |
| **D-003** | 破除文档感染清毒路径：三刀切（假门禁、CONTEXT.md、AGENTS.md） | T-1（CONTEXT 瘦身）、T-2（gates 真实化）、T-3（AGENTS 重写） | `current` |
| **D-004** | 产品形态与分发重构：主 Agent 一等公民化，收编 gsr，Verifier 保持特化 | T-4（SKILL.md 改造与适配器同步） | `current` |

> **无去向记录清单**：**空**（100% 闭环映射，无遗漏未决条目）。

---

## 二、实施执行序列（严格按序推进：T-0 → T-1 → T-2 → T-3 → T-4 → T-5）

### T-0 — 修复 R3 遗留 Blocker B-1（保证代码基线绿态）
- **覆盖决策 / 来源**：R3 审计交接遗留 Blocker B-1。
- **做什么**：
  1. 打开 `scripts/shared/coinage-triage.js:384`（判定点 `:393`）；
  2. 修复 `duplicateTokenDefinitions` 函数：将原先以 `row.token` 为去重依据导致的“两行同名 token 被跳过”缺陷，改为以**行身份（行索引/ID）**进行去重；
  3. 在 `test/` 下补充该函数的双向单元测试（覆盖同 token 双行漏报与正常别名映射）；
  4. 运行 `node scripts/coinage-triage.js` 确认 RC=0。
- **验收依据**：单元测试通过，`duplicateTokenDefinitions({substitution_table:[{token:'foo'},{token:'foo'}]})` 能正确报告重复定义（函数收的是 spec 对象，不是裸数组；直接喂裸数组会返回 `[]`）。
- **Suggested skills**: `diagnosing-bugs`, `tdd`。

---

### T-1 — 净化与瘦身 CONTEXT.md（三刀切第二刀）
- **覆盖决策**：D-003 第二刀。
- **做什么**：
  1. 创建 `docs/archive/legacy-jargon-terms.md`；
  2. 从 `CONTEXT.md` 中将未落地、纯理论脑补的 60+ 个学术复合造词（如“单发烧桥”、“元循环禁令”、“判表结局”、“声明范围停运标签”等）平移封存至该归档文件中；
  3. 保留并巩固初中生通晓的核心概念与 ADR-0104 确立的 4 个真实领域词（反自嗨反射阶梯、交付工程师、物理退出码准入、平实人话纪律）；
  4. 确保工作区内 `CONTEXT.md` 语言平实直白，无任何晦涩长链名词。
- **验收依据**：`CONTEXT.md` 净体积显著减少，归档文件落地完整，无破损链接。
- **Suggested skills**: `khazix/neat-freak`, `grill/engineering/domain-modeling`。

---

### T-2 — 虚假门禁物理剥离与 gates.json 真实化（三刀切第一刀）
- **覆盖决策**：D-001、D-003 第一刀。
- **做什么**：
  1. 审查 `docs/gates.json` 中的 55 项门禁；
  2. 对 R3 审计核实出的 29 个指向不存在脚本的假门禁条目（如 `run-gates.js`、`check-ci-wiring.js` 等）执行实事求是的物理剥离，将其标记为 `deprecated_unimplemented` 或移至历史记录；
  3. 彻底停止为维护这些空门禁去写 stub/mock 空脚本的自欺欺人行为；
  4. 保留的门禁必须 100% 对应本仓真实存在的有效脚本文件。
- **验收依据**：`docs/gates.json` 内所有存活命令在磁盘上真实存在且可执行。
- **Suggested skills**: `khazix/neat-freak`。

---

### T-3 — 重写 AGENTS.md 工作导引（三刀切第三刀，掐断感染源）
- **覆盖决策**：D-002、D-003 第三刀。
- **做什么**：
  1. 重写根目录 `AGENTS.md`；
  2. 将 D-002 定案的“严谨求证的交付工程师（凭证即一切）”四级反自嗨反射阶梯（R1-R4）与 3 行输出硬锁直接置顶在文件最前部；
  3. 设立明确红线：“严禁使用任何生造黑话，禁止长篇脑补推导，未见机器 exit 0 严禁宣称完成”；
  4. 引导后续进场的 Agent 直接执行阶梯，不再要求其通读 114 个学术词汇。
- **验收依据**：`AGENTS.md` 简洁、有力、置顶反自嗨第一铁律，行数控制在 80 行以内。
- **Suggested skills**: `khazix/neat-freak`。

---

### T-4 — 重构 src/SKILL.md：主 Agent 一等公民化与适配器同步
- **覆盖决策**：D-001、D-002、D-004。
- **做什么**：
  1. 修改 `src/SKILL.md`：
     - 主执行体（Primary Agent）：默认常驻 D-002 单一心智模型，全套注入 R1-R4 四级反自嗨反射阶梯与 3 行输出硬约束，收编并正式退役原 `gsr:1~3` 孤立规则；
     - 外部审计员（Verifier Profile）：保留为进阶独立审计模式（二方验证），保留其 6 级验证阶梯（deterministic machine -> ground truth -> independent re-run -> assertion checklist -> LLM critic -> not verified）；
  2. 运行 `node scripts/build-adapters.js` 重新生成各宿主分发包；
  3. 确保整个技能文本无自造词，语言平实。
- **验收依据**：`src/SKILL.md` 结构清晰对齐 Ponytail，`node scripts/build-adapters.js --check` 绿态通过。
- **Suggested skills**: `khazix/neat-freak`, `ponytail`。

---

### T-5 — 全量回归与终验落盘
- **覆盖决策**：D-002 验收标准。
- **做什么**：
  1. 运行 `npm test`（确保全量 Jest 测试通过）；
  2. 运行 `node scripts/coinage-triage.js`（确认无违规词汇）；
  3. 运行 `node scripts/build-adapters.js --check`（确认适配器全 match）；
  4. 生成收口总结，落盘真实测试输出。
- **验收依据**：全部命令物理 exit 0，全绿通过。
- **Suggested skills**: `verification-before-completion`, `$but`。
