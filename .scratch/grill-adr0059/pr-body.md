## 本轮内容（ADR-0059 实现轮 + 衍生的 ADR-0060 轮）

20 commits / 46 files（+1,896 / −132）。分支 `adr0059-impl` 堆叠于 `adr0059-doc` 之上（后者是其祖先，内容一并随本 PR 落地）。

### 交付
- **D-001** README Tier 1 → `npx --yes github:<org>/jiahao init` + 名称声明；无 registry 安装指令
- **D-002** MCP 降为 source-only：`jiahao-mcp/` 出白名单 + ADR-0038 D1 修订 + pack 断言 + pack→install→smoke 完整性检查（新 gate `pack-smoke`, order 196）
- **D-003** bench README 研究轮豁免说明
- **D-004** SKILL.md 同边界句精化 + README 箴言 `agreement is not accuracy` + adapters 重生成
- **D-005** registry 完整性复查（仅验证）
- **D-006 / ADR-0060** `min_n=100` + `indeterminate` conformity 态 + 条件性认证轴（双轴、过期 fail-closed）+ signoff 按 conformity 分级守卫 + P-A1（签署强制 `--authorization`，链上分离 `principal_id` / `instrument_id`）
- ADR-0039 D3 预算字面回退至 **200,000**（撤销一条**论证前提不成立**的修订）；ADR-0034 D6 补记 `pack:smoke` 别名

### ⚠️ 请合并前知悉（诚实标注）
1. **独立审计结论为 NOT PASSED**（`.scratch/grill-adr0059/reports/2026-09-12-audit.md`）；审计 6 项偏差 + 4 项实现问题**均已处置或显式记录**（报告 §15/§16）。
2. **`npm test` 当前为红：1 failed / 50 passed suites** —— 唯一失败 = `test/adr-0038-wiring.test.js` 的 `out.size < 200,000`（实测 **206,501 B / 92 files**）。**这是预注册上限被突破的真实信号，不是回归**；其处置（抬限 / 移出 CONTEXT.md / 收窄出货面）经裁定**不在本轮范畴**，归下一轮 grill（报告 §15.9）。
3. **两项设计发现待下一轮修**：F-1 judge 身份轴 `rules_alias = src/SKILL.md` **就是插件载荷**（改提示词即触发 judge 身份变更）；F-2 仪表未解析（`model_identity.* = UNRESOLVED`、重复性 `sample_size: 0`）却被要求人工认证（报告 §17 / 账本 D-008）。
4. **本 PR 的验证证据**：`bash .scratch/grill-adr0059/evidence/run-closure.sh`（15 步）—— 仅第 1/2 步因上限突破失败，其余 13 步全 exit 0（gate:all 22 entries 双模式 / corpus:drift / adapters 23 / instrument / adr-index / ci-jobs / deferred 28 / pack / diff-check / MCP start-alive / install smoke / pack-smoke）。
5. **轮次工件不入库**（`.scratch/` 按项目约定 gitignored）：审计报告、轮报告、账本 D-001..D-008、Q8 调研、V-3 回执均只在工作区，GitHub 侧不可见。
