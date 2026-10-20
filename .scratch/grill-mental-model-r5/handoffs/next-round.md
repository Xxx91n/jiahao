# Handoff Task Book — grill-mental-model-r5 (2026-10-20)

> 本任务书由 grill-mental-model-r5 决策账本唯一派生，是后续执行 Agent 可独立信赖与依赖的常驻实施指南。
> 唯一数据源：`.scratch/archive/2026-10-20-grill-mental-model-r5/decision-ledger.md`（D-001 ~ D-004）与 ADR-0105。

---

## 一、对账与去向总表

| 决策 ID | 核心决策要点 | 去向与映射任务 | 状态 |
|---|---|---|---|
| **D-001** | 重构主轴确立：五语义专精、单一心智模型融合、历史文档与门禁物理清除 | 全局指导 / T-0, T-1, T-2, T-3, T-4 | `current` |
| **D-002** | 五语义专属防御机理与硬性判据专精化（核销凭证/零借口红灯/思维链置信度零/工具优先/大白话） | T-1（专精防御机理与测试断言落地） | `current` |
| **D-003** | 五语义向单一心智模型融合的架构与 Prompt 表达形态（交付工程师核心人格+五位一体行动直觉） | T-2（重构 src/SKILL.md 并同步 54 个适配器） | `current` |
| **D-004** | 历史文档与虚构门禁的磁盘物理清除范围与活动区极简化方案（移除 52 篇历史 ADR、删除 gates.json 及虚空脚本、极简化 package.json/CONTEXT.md/AGENTS.md） | T-0（物理清除 ADR 与假门禁）、T-3（环境与契约极净化） | `current` |

> **无去向记录清单**：**空**（100% 闭环映射，无任何遗漏未决条目）。

---

## 二、实施执行序列（严格按序推进：T-0 → T-1 → T-2 → T-3 → T-4）

### T-0 — 物理清除历史 52 篇 ADR 与虚构门禁脚本（彻底断绝感染源）
- **覆盖决策**：D-001、D-004。
- **做什么**：
  1. 物理删除 `docs/adr/` 下 0001 至 0104 共 52 篇历史陈旧 ADR，活动工作区仅保留现役唯一的 `docs/adr/0105-purging-legacy-gates-and-fusing-anti-jiahao-mental-model.md`；
  2. 物理删除 `docs/gates.json`；
  3. 清除 `scripts/` 下用于假门禁自我空转验证的 30 多个无用脚本（如 `check-gates-liveness.js`, `instrument.js`, `check-mr-probes.js`, `bench-gate.js`, `check-bench-thresholds.js`, `check-probes.js`, `reverify.js`, `check-corpus-*.js` 等），仅保留核心必要构建与工具脚本（如 `build-adapters.js`, `check-drift.js`, `coinage-triage.js`）；
  4. 检查并确保无断链。
- **验收依据**：`docs/adr/` 目录下仅存 0105，`docs/gates.json` 已清除，死转脚本不再占用磁盘。
- **Suggested skills**: `khazix/neat-freak`, `but`。

---

### T-1 — 五语义专属防御机理与法定判据落地
- **覆盖决策**：D-001、D-002。
- **做什么**：
  1. 梳理五语义法定判据（目标逐项物理核销、零借口红灯即死、思维链置信度恒为零、工具调用绝对前置、初中生通晓大白话）；
  2. 清理 `test/` 中与已删除的虚构 gate 或陈旧 ADR 绑定的死测试套件（如 `gate.test.js`, `adr-0022-hardening.test.js`, `adr-0026-segments.test.js`, `bench-gate.test.js` 等）；
  3. 保留真实适配器与核心逻辑测试（`adapters.test.js`, `skill-structure.test.js`, `hooks.test.js` 等），并针对五语义专精防御判据补充清晰的单测验证。
- **验收依据**：无失效旧测试报错，新增或保留的专精判据测试稳定通过。
- **Suggested skills**: `test-driven-development`, `systematic-debugging`。

---

### T-2 — 重构 src/SKILL.md：单一心智模型融合注入与适配器同步
- **覆盖决策**：D-001、D-003。
- **做什么**：
  1. 重写 `src/SKILL.md`：
     - 将 D-003 定案的“冷酷求证的交付工程师（凭证即一切 / No receipt, no claim）”确立为唯一核心人格；
     - 注入五位一体行动直觉（动手先于动嘴、探针重于脑补、红灯绝无借口、闭环才叫交差、大白话少废话）；
     - 将输出硬锁限制为至多 3 行结构化事实（动作+凭证+风险）；
     - 通篇完全采用初中生通晓大白话，不使用任何自造复合词；
  2. 运行 `node scripts/build-adapters.js` 重新生成全部 54 个宿主适配器文件；
  3. 运行 `node scripts/build-adapters.js --check` 确认全量一致。
- **验收依据**：`node scripts/build-adapters.js --check` exit 0，54 个适配器无差异通过。
- **Suggested skills**: `ponytail`, `verification-before-completion`。

---

### T-3 — 极简净化 package.json 与 AGENTS.md 工作契约
- **覆盖决策**：D-001、D-004。
- **做什么**：
  1. 修改 `package.json`：剔除所有 `bench:gate`, `probes:gate`, `instrument:gate` 等虚构门禁命令；在 `files` 发布白名单中移除 `docs/gates.json`；
  2. 复核 `CONTEXT.md`，确保只收录领域核心词汇，无历史黑话；
  3. 彻底重写根目录 `AGENTS.md`：行数控制在 50 行内，作为进场 Agent 的唯一契约，明确第一铁律为“交付工程师（凭证即一切）”，置顶五位一体反自嗨直觉与 3 行输出硬锁。
- **验收依据**：`package.json` 简洁干净，`AGENTS.md` 极简强约束，无失效引用。
- **Suggested skills**: `khazix/neat-freak`。

---

### T-4 — 全量物理回归测试与终验收口
- **覆盖决策**：D-001、D-002、D-003、D-004 闭环验收。
- **做什么**：
  1. 运行 `npm test`，确认全量保留的测试套件物理 exit 0；
  2. 运行 `node scripts/build-adapters.js --check`，确认物理 exit 0；
  3. 运行 `git diff --check`，确认无 CRLF 或格式残留；
  4. 提交全部改动，输出完整的验收凭证。
- **验收依据**：所有命令物理 exit 0，工作区干净，无历史包袱残留。
- **Suggested skills**: `verification-before-completion`, `but`。
