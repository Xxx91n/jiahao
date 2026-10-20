# r3 实施窗交接（next-round.md → 完成）

日期：2026-10-19。任务书：本目录 `next-round.md`（commit `54bfa8f1`，虚拟分支 `e-branch-1`）。
最终报告：`../reports/2026-10-19-report.md`（每条声明附可复跑命令与输出摘要）。

## 状态：八步全关

- T-1 验证仪表线：按用户裁决关闭——不动 `src/instrument-state.json` / `src/instrument-identity.json`，三项发现只登记进报告，移交下一轮。
- T-2 avoid 档 CI gate + 0103 D-E.1 变更票 + 九词 condition 再评估：完工。
- T-3 D-004+D-005 登记包十三件注记 + D-003 四口子：完工，全部注记级，无改向。
- T-4 BK-09 gate_prerequisite 对齐 + 重 pin + replay 三面全绿：完工。
- 终验：`node scripts/coinage-triage.js` rc=0；`npm test` 28 suites / 400 passed + 1 skipped / 401 total。

## 本窗改动（12 改 + 1 新增）

`.github/workflows/ci.yml`、`CONTEXT.md`、`bench/research/devin-corpus-v3/eval-plan.json`、`bench/research/devin-corpus-v3/plan.json`、`bench/research/out/devin-oot-v3-report.json`、`bench/research/out/devin-oot-v3-report.md`、`docs/adr/0101-*.md`、`docs/adr/0103-*.md`、`docs/language-discipline.json`、`scripts/coinage-triage.js`、`scripts/shared/coinage-triage.js`、`.scratch/grill-mental-model-r3/atomcode-report-pain2.md`；新增 `test/coinage-gate-wiring.test.js`。

关键哈希：`eval-plan.json` 新 pin `6bf1ee865c1ac07d77327a14bee83e6f765144241fc6fa90cadfd2fda7bd04a2`（旧 pin ×2 入 `superseded_pins`）；pairer pin `9ff2d0ad` 未动，140 items replay 全对齐。

## 移交下一轮（本窗仅登记未施工）

1. **BK-10 僵尸 gate**：`docs/gates.json` 某注册项呈"机器存活 / 法律已退 / 执行器已删"三态，需注销或重接线。
2. **gates.json order 105 source_adr 断链**：指向已不存在的 ADR 路径/锚点。
3. **commit 69a09654 P-A1 re-pin 欠账**：动 rules 未 re-pin，复核 rc=1 仅 rules 腿 mismatch。
4. **CI 远端观测欠账**：gate 步骤本地验证 + workflow 接线有测试覆盖（`test/coinage-gate-wiring.test.js` 5 测试），GitHub Actions 实际运行未观测（push 不在本窗授权内）。

## 下一轮注意事项

- 账本已封账结算：不回读全部账本、不枚举全部 ADR，只读任务书点名文件与引用段落。
- 词面纪律：新文本不得含 avoid 档三字面（豁免阀/特权放行/绕过阀）；九个 r2 退役造词已带 condition 字段（BK-08 九词句式，2026-10-19 登记），重新晋级须过 P1 四判据评审且在 MAST 分离 gate 之后。
- 报告与交接文本写在 `reports/`、`handoffs/` 下，成文后跑 `node scripts/coinage-triage.js` 复扫（reports 面在五扫描面内；handoffs 面不在，但仍守纪律）。
- 环境坑（复用前轮教训）：edit 工具的 LineTrimmedReplacer 会把 JSON 1 空格缩进改 2 空格——JSON 精修一律用 node 脚本（`JSON.parse` → 改 → `JSON.stringify(obj, null, 1)`）；bash 工具实为 PowerShell；单引号串里 `\n` 是字面两字符。
- VCS：GitButler `but` 全写操作；`.scratch` 不入库，报告与 handoff 用 force-add 例外提交；push 需显式指令。
