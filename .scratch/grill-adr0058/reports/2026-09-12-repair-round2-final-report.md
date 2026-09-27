# ADR-0058 第二轮返修 + 终审自审计 — 最终报告

- 日期：2026-09-12
- 编排：修复子代理（落地 B1-B7）→ 审计 Agent（终审自审计）
- 修复提交：**`codex/adr0058-repair` @ `fa0c91f`**（父 `84e621f`；领先 `d148bc4` 2 提交；**未 push**）
- 6 文件：`.github/workflows/ci.yml` / `CONTEXT.md` / `docs/adr/0041-*.md` / `docs/adr/0058-*.md` / `src/shared/capability.js` / `test/adr-0058-wiring.test.js`
- 审计对象：`fa0c91f`（工作树 HEAD `a4ececc` 的树与 `fa0c91f` **逐字节一致**，`git diff --stat fa0c91f HEAD` 为空）
- 前置报告：`.scratch/grill-adr0058/reports/2026-09-12-repair-audit.md`（提出 B1-B7）
- 环境：Windows 11 / Git Bash / node v22.22.2 / but 0.22.3 / gh 2.89.0

---

## 0. 结论

# ✅⚠️ **有条件通过（1 项必修 + 1 项建议 + 1 项人工闸门）**

B1-B7 **7/7 均有实质落地且经我亲自复核**（不采信子代理自述）；本地硬验收 **11/11 全绿**。
但我的自审计发现 **B1 的代码修复缺回归锁**（审计原始修复要求明确要求「补多元素负例」），以及 ADR-0041 头部索引未同步。

---

## 1. B1-B7 逐项终审自审计

| 项 | 子代理声称 | 我的独立复核方法 | 复核结果 |
|----|-----------|-----------------|----------|
| **B1** 逗号注入 | 已修 | 直接调 `cap.escWf(['repo-tree','ci-mode'])` → `repo-tree%2Cci-mode`；`unverifiableLines(['repo-tree','docs-adr'],'docs-adr')[0]` → `gate=repo-tree%2Cdocs-adr,requires=docs-adr::...`，**属性列表结构完整**；`escWf('a,b:c')` → `a%2Cb%3Ac`；三条精确串仍成立（`gate=probes,requires=bench-corpus::...` 逐字符相等） | **代码已修**；**但回归锁缺失**（见 §3 R1） |
| **B2** exit-2 契约域 | 已修 | 读 `docs/adr/0041` 实际 diff（前一轮我拿错了文件名）：D2 末尾新增 `Amendment (audit-repair round 2026-09-12, ADR-0058 R8)` 块，明确「显式内联声明即「join the orchestration surface」的动作」；ADR-0058 R8 加指向句 | **已修**；残余：头部索引未同步（§3 R2） |
| **B3** R 编号命名空间 | 已修 | `grep '^### R'` → **R1…R15 连续无重**；R11=A4 / R12=A5 已补；摘要句改「R8-R12 record the five findings」；wiring 测试标签同步改为 R11/R12 | **已修** |
| **B4** CONTEXT.md 词表 | 已修 | 读 diff：词条现覆盖**两种载体**（registry 数组 + 内联声明）；`_Avoid_` 改为「ad-hoc inline per-gate sniffing」并显式声明「sanctioned inline *declaration* is not sniffing」 | **已修** |
| **B5** 弱断言 | 已修 | 读当前文本：`/requireCapabilities\(\s*['"]test['"]\s*\)/`（双引号形式已覆盖）；改断言 `seen=$((seen + 1))` 与 `if [ "$seen" -ne "$expected" ]` | **已修** |
| **B6** 覆盖夸大 | 已修 | 报告行现为 `覆盖：**D-013 / D-002 / D-006 / D-007**`，下方有更正注 | **已修** |
| **B7** CI 诊断 | 已修 | **我从 ci.yml 原样抽取整个 restore 步脚本，在 `bash -e` 下跑 5 个场景**（见 §2） | **已修且无新失败路径** |

---

## 2. B7 最关键风险点：诊断是否引入新失败路径（`bash -e`）

GitHub 的 `run:` 在 Linux 上以 `bash -e` 执行——任何非零命令都会挂掉整个 step。我从 ci.yml **原样抽取**该 step 脚本，逐场景验证：

| 场景 | exit | STEP-SURVIVED | warning | 评价 |
|------|------|---------------|---------|------|
| 1) secret 未设（守卫分支） | **0** | true | — | 原行为不变 |
| 2) tar 含 `bench-corpus/mr-probes.jsonl` | **0** | true | 无 | 正常路径不受干扰 |
| 3) tar 含 `bench-corpus/` 但缺 `mr-probes.jsonl`（**真实 CI 形状**） | **0** | true | **有** | 正是想要的诊断 |
| 4) tar 顶层布局错误（无 `bench-corpus/`） | **0** | true | **有** | 输出 `(no .../bench-corpus directory)`，两假设均被点名 |
| 5) secret 是垃圾（base64 非 tar） | **2** | false | — | **失败发生在原有的 `tar` 行，不在新增诊断行** → 非新引入 |

**结论：B7 的诊断全部是 failure-proof（`|| true` / `2>/dev/null`），未新增任何失败路径；step 原有语义未变。**

---

## 3. 残留项（我的自审计新发现，不替子代理追认）

| 编号 | 级别 | 发现 | 证据 | 建议 |
|------|------|------|------|------|
| **R1** | **中（必修）** | **B1 代码已修但无回归锁**。审计原始要求为「加长度/字符集守卫或额外转义；**补多元素负例**」。子代理只做了转义，未加测试：全仓 `grep '%2C' test/*.js` → **空**；wiring 测试中 `unverifiableLines` 出现 **0 次**、无二元数组字面量；`test/adr-0041-wiring.test.js` 的 `escWf` 锁仍只覆盖 `%/CR/LF`。因此若有人回退 `%2C`/`%3A` 或 `join('+')`，**无任何测试会红** | `grep -rn "%2C" test/*.js` → 空；R8 describe 块 5 个 test 均不涉逗号 | 补 1 个断言：`expect(cap.unverifiableLines(['repo-tree','docs-adr'],'docs-adr')[0]).toMatch(/gate=repo-tree(%2C|\+)docs-adr,requires=docs-adr::/)` + 反向断言无裸逗号 |
| **R2** | 低 | ADR-0041 的头部 `Amended by:` 索引行仍只写 `ADR-0042`，而正文已新增 ADR-0058 的 amendment 块 → 索引与正文漂移（与 B3 同类） | `docs/adr/0041:9`；对照 ADR-0034/0057 本就无 `Amended by:` 头行 | 把头部行扩为 `ADR-0042 ...; ADR-0058 R8 (audit-repair round 2)` |
| **R3** | 中（人工闸门，非代码） | CI 通道仍 **12/12 全红**；`fa0c91f` 无 CI 运行（分支未 push）；B7 只能使下一轮 CI 自解释，**不能使其变绿**——`JIAHAO_BENCH_CORPUS_B64` 需仓库管理员重建 | `gh run list` 12/12 failure；`ls-remote origin codex/adr0058-repair` 空 | 需 secret 写权限；在此之前 D-011（required-check 载体）不应定夺 |

---

## 4. 本地硬验收（审计 Agent 亲自重跑，非采信自述）

| 项 | 实测 |
|----|------|
| `node node_modules/jest/bin/jest.js` | **49 suites / 669 tests，exit 0** |
| `node scripts/run-test-gate.js --expected-suites 49` | **exit 0**，`[test] OK: 49 suites, 669 tests, 0 skipped` |
| `npm run gate:all` | exit 0，21 entries，**4 UNVERIFIABLE** |
| `GITHUB_ACTIONS=true CI=true npm run gate:all` | exit 0，21 entries，**0 unverifiable** |
| `npm run corpus:drift` | exit 0，`[tier-drift] OK` |
| `npm pack --dry-run --json` | **size=199944，93 files，headroom=56**（CONTEXT.md 确在打包面） |
| compile 三查 | build-adapters **23 一致** / instrument **identity pinned** / adr-index **in sync**，均 exit 0 |
| `git diff --check` | exit 0，无输出 |
| `check-ci-jobs.js` / `check-deferred.js` | exit 0 SATISFIED / 21 entries |
| 字节卫生 | `fa0c91f` 全部 **6/6 `BOM=false CR=0`** |
| 范围 | `fa0c91f` 只改 6 文件；`docs/gates.json`、`docs/deferred-registry.json`、`.githooks/pre-commit`、`package.json` **均未被触碰**；ADR-0058「only required check」散文未动（D-011 未拍板，合规） |

---

## 5. 子代理自报事故的复核

子代理自报「过程中一次并行同文件编辑被相互覆盖（test 文件 5 处仅 1 处落地），已重做」。**我逐条复核**：5 处预期修改均已在当前文件中：① 头部注释 `R8-R12`；② `:127` 正则；③ `:162-163` 两条守卫断言；④ `R11 ... (audit A4)`；⑤ `R12 ... (audit A5)`。**无遗漏**，自报属实。

---

## 6. 最终结论与建议

**✅⚠️ 有条件通过。** B1-B7 均已实质修复且可复现；唯一必修项是我的自审计新发现的 **R1（B1 缺回归锁）**。

建议下一步（按优先级）：

1. **必修（push 前）**：补 R1 的 3 行断言，重跑第 4 节全套验收。
2. 建议：补 R2 的 ADR-0041 头部索引行。
3. 人工：R3 的 secret 重建（需管理员权限）；在 CI 可绿之前不决定 D-011。
4. 仍在等待拍板：D-004/D-007 的 `revised` 是否认可；D-010~D-013 四个 `proposed`。
5. 打包余量仅 **56 字节**（ADR-0039 D3）——下一个打包面文件新增即打破 `npm test`。

**push 状态：冻结。** 分支未 push；`main = origin/main = d148bc4` 未被污染。

---

## 7. 审计边界声明

- 已验证：本地全部验收、B1 转义行为与结构、B7 在 `bash -e` 下 5 个场景的失败安全性、R 编号一致性、字节卫生、范围隔离。
- 未验证：GitHub 侧分支保护/Ruleset（平台 403）；`JIAHAO_BENCH_CORPUS_B64` 内容（无权限）；`fa0c91f` 的真实 CI 运行（未 push）。
- 工具链：ctx 沙箱默认 JS 运行时为 **bun**，本轮所有 spawn 类探测均改用托管 node 22.22.2 绝对路径；Windows `tar` 无法处理盘符路径（`C:` 被当远程主机），B7 模拟改用相对 `RUNNER_TEMP`——此为测试夹具限制，真实 CI 为 Linux。
- 本报告未改动任何仓库跟踪文件；仅写入 gitignored 的 `.scratch/`。
