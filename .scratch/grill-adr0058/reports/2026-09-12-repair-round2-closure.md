# ADR-0058 返修轮 — R1/R2 闭环报告（终审自审计）

- 日期：2026-09-12
- 编排：修复子代理（补锁）→ 审计 Agent（终审自审计）
- 闭环提交：**`codex/adr0058-repair` @ `e280218`**（父 `fa0c91f`；基准 `d148bc4` = `origin/main`；共领先 3 提交；**未 push**）
- 5 文件：`README.md` / `docs/adr/0041-*.md` / `docs/adr/0058-*.md` / `test/adr-0041-wiring.test.js` / `test/adr-0058-wiring.test.js`
- 前置：`.scratch/grill-adr0058/reports/2026-09-12-repair-round2-final-report.md`（提出 R1/R2/R3）
- 工作树 HEAD `2106f6a` 的树与 `e280218` 逐字节一致；工作树 CLEAN

---

## 0. 结论

# ✅ **通过**（R1/R2 已闭环；仅剩 R3 人工闸门）

两项残留均已修复，且我做了**咬合测试（bite test）**证明新锁**真的会因回退而变红**——而不是仅看子代理自述。

---

## 1. R1 / R2 终审自审计

| 项 | 要求 | 我的独立复核 | 结果 |
|----|------|--------------|------|
| **R1** | 为 B1 的逗号/冒号转义与内联数组标签补回归锁（职责分离：`escWf` 锁归 adr-0041，内联通道锁归 adr-0058） | 读实际 diff 确认两处新增；并做 §2 的 bite test | **已闭环** |
| **R2** | ADR-0041 头部 `Amended by:` 索引行同步 ADR-0058 | 读 diff：尾部追加 `; ADR-0058 R8 (audit-repair round 2, 2026-09-12: the exit-2 domain extends to out-of-registry consumers that declare capabilities inline)` | **已闭环** |
| — | ADR 事实源同步 | ADR-0058 新增 `### R16`；摘要句改 `R13-R16 record the four fixes`；R 标题 **R1…R16 连续无重** | 已闭环 |
| — | 测试计数同步（ADR-0043 漂移面） | README **两处**均 669→671（行 165 与行 243，两处都在——子代理自报的覆盖事故已真正修好）；实测 jest **671** | 已闭环 |

---

## 2. 咬合测试（bite test）— 证明新锁不是空壳

我用**重构回退前的 `escWf`**（只转义 `%/CR/LF`）与当前版本，分别代入新测试的**原样正则**：

### 2.1 `test/adr-0041-wiring.test.js`（转义契约）

| 版本 | `escWf('a,b:c')` | `escWf('a%b,c')` | 断言 |
|------|------------------|------------------|------|
| CURRENT (`e280218`) | `a%2Cb%3Ac` | `a%25b%2Cc` | **PASS** |
| REVERTED（回退转义） | `a,b:c` | `a%25b,c` | **FAIL** ✅ |

### 2.2 `test/adr-0058-wiring.test.js` direct 路径

| 版本 | 产出的机器行 | well-formed | 注入 | 断言 |
|------|--------------|-------------|------|------|
| CURRENT | `::error title=UNVERIFIABLE,gate=repo-tree%2Cdocs-adr,requires=docs-adr::…` | true | false | **PASS** |
| REVERTED | `::error title=UNVERIFIABLE,gate=repo-tree,docs-adr,requires=docs-adr::…` | false | **true** | **FAIL** ✅ |

### 2.3 `test/adr-0058-wiring.test.js` end-to-end 路径

无 `.git` 目录下以**二元数组**调 `requireCapabilities`：**exit=2**，机器行 `gate=repo-tree+docs-adr,requires=repo-tree::…`，well-formed=true、无注入 → **PASS**。

### 2.4 旧锁未被破坏

三条原有精确串断言仍成立：`unverifiableLines('probes','bench-corpus')[0]` **逐字符相等**；`gate=ga%25te` 仍包含；`escWf('a%b\nc\rd')` = `a%25b%0Ac%0Dd`。

**结论：新锁既真又准——回退硬化必红，且未误伤任何旧断言。**

---

## 3. 硬验收（审计 Agent 亲自重跑）

| 项 | 实测 |
|----|------|
| `node node_modules/jest/bin/jest.js` | **49 suites / 671 tests，exit 0** |
| `node scripts/run-test-gate.js --expected-suites 49` | **exit 0**，`[test] OK: 49 suites, 671 tests, 0 skipped` |
| `npm run gate:all` | exit 0，21 entries，**4 UNVERIFIABLE** |
| `GITHUB_ACTIONS=true CI=true npm run gate:all` | exit 0，21 entries，**0 unverifiable** |
| `npm run corpus:drift` | exit 0，`[tier-drift] OK` |
| `npm pack --dry-run --json` | **size=199943，93 files，headroom=57**（比修复前的 56 还宽 1 字节） |
| compile 三查 | build-adapters **23 一致** / instrument **pinned** / adr-index **in sync**，均 exit 0 |
| `git diff --check` | exit 0，无输出 |
| `check-ci-jobs.js` / `check-deferred.js` | exit 0 / 21 entries |
| 字节卫生 | `e280218` 全部 **5/5 `BOM=false CR=0`** |
| 范围隔离 | 受保护路径（`gates.json` / `deferred-registry.json` / `.githooks` / `package.json` / `ci.yml` / `CONTEXT.md` / `capability.js`）**均未被本提交触碰**；ADR-0058「only required check」散文未动（D-011 未拍板，合规） |

---

## 4. 仍开放的事项（非本轮范围）

| 编号 | 级别 | 内容 |
|------|------|------|
| **R3** | 中（人工闸门） | CI 仍 **12/12 全红**；`e280218` 无 CI 运行（分支未 push）。`JIAHAO_BENCH_CORPUS_B64` 需仓库管理员重建；B7 的诊断已就位，下一轮 CI 将自解释但**不会自动变绿** |
| — | — | 分支现领先 `origin/main` **3 提交**（`84e621f` / `fa0c91f` / `e280218`），**未 push** |
| — | — | 打包余量仅 **57 字节**（ADR-0039 D3）——下一个打包面文件新增即打破 `npm test` |
| — | — | 待拍板：D-004/D-007 的 `revised`；D-010~D-013 四个 `proposed` |

---

## 5. 审计边界声明

- 已验证：R1/R2 的实际 diff、新锁的**咬合性**（回退必红）、旧锁未破、全套本地验收、字节卫生、范围隔离、R 编号连续性、README 两处计数。
- 未验证：GitHub 侧分支保护/Ruleset（平台 403）；`JIAHAO_BENCH_CORPUS_B64` 内容（无权限）；`e280218` 的真实 CI 运行（未 push）。
- 工具链：咬合测试用托管 node 22.22.2 绝对路径（ctx 沙箱默认运行时为 bun）；测试文件本身由 jest 在真 node 下执行，`process.execPath` 在测试内是正确的。
- 本报告未改动任何仓库跟踪文件；仅写入 gitignored 的 `.scratch/`。
