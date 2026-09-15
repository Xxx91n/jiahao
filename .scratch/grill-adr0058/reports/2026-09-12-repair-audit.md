# ADR-0058 返修轮 — 独立审计报告（repair audit）

- 日期：2026-09-12
- 身份：审计 Agent（职责分离：只出报告，不动手修）
- 审计对象：`codex/adr0058-repair` @ `84e621f`（父 `d148bc4` = `origin/main`；领先 1 提交；**未 push**）
  - 工作树 HEAD = `gitbutler/workspace`（`8e2411c`），`git diff --stat 84e621f HEAD` **为空** → 工作树与 84e621f 逐字节一致，本地验收即代表被审提交
- 返工任务书：`.scratch/grill-adr0058/handoffs/2026-09-12-final-audit-handoff.md`（第 2 节阻塞项 A1-A6 + 重跑清单）
- 被审自述：`.scratch/grill-adr0058/reports/2026-09-12-repair-report.md`
- 决策账本：`.scratch/grill-adr0058/decision-ledger.md`（D-001…D-013）
- 环境：Windows 11 / Git Bash / node v22.22.2 / npm 10.9.7 / but 0.22.3 / gh 2.89.0
- 纪律：仓库工作树零改动（本报告落在 gitignored 的 `.scratch/`）；未做任何分支/提交/推送

> **验证通道说明**：本轮已补上本地 + CI 双通道。所有 `node` 调用均用**托管 node 22.22.2 绝对路径**（ctx 沙箱默认运行时是 bun，`process.execPath` 会指向 bun，早期几次探测因此失真——已修正并重跑）。

---

## 0. 结论

# ✅⚠️ **有条件通过（功能面通过；文档面需一次小修补）**

一句话：返修轮把第 2 轮点名的 4 个阻塞项（A1/A3/A4/A5）**真修好了并可复现**（含此前从未成功运行过的头号交付物 wrapper），A6 的前提被**实测证伪并正确撤回**；但返修本身又引入了 3 项**文档·契约级**新缺陷（B1/B3/B4，与 F2/F3 同类），且 A2 的处置**只走了环境分支、未尝试任务书点名的代码分支**。

| 维度 | 结果 |
|------|------|
| 本地硬验收（11 项） | **全部通过**（含 A1 修复目标 wrapper exit 0） |
| CI 通道 | **12/12 全红（最新 `d148bc4`）；`84e621f` 无运行** → 强制通道**未满足** |
| A1/A3/A4/A5 | **4/4 已修并可复现** |
| A2 | **部分**（环境·密钥硬闸门成立；任务书点名的代码分支未尝试） |
| A6 | **前提证伪，撤回正确**（审计侧自报误差，见 §10） |
| 新发现 | B1/B2/B3/B4（中）、B5/B6（低） |

**push 维持冻结**：分支本未推送；且 B1/B3/B4 属「已提交文档/代码含自相矛盾声明」类，按 ADR-0043 与 AGENTS.md 应先修再推。

---

## 1. 硬验收 — 亲自重跑

| # | 验收项 | 命令 | 通道 | 实测 | 结论 |
|---|--------|------|------|------|------|
| 1 | 测试套件 | `node node_modules/jest/bin/jest.js` | 本地 | **49 suites / 669 tests，exit 0** | 通过 |
| 2 | **A1 修复目标** | `node scripts/run-test-gate.js --expected-suites 49` | 本地（= CI test job 同命令） | **exit 0；`[test] OK: 49 suites, 669 tests, 0 skipped`** | 通过（第 2 轮为 exit 1） |
| 3 | wrapper 负例 | `--expected-suites 48` / 无 flag | 本地 | 48 → **exit 1** 套件数漂移；无 flag → **exit 64** | 通过 |
| 4 | 门禁（本地） | `npm run gate:all` | 本地 | exit 0；21 entries，**4 UNVERIFIABLE**（ci-wiring/bench-gate/probes/mr-probes） | 通过 |
| 5 | 门禁（CI 模式） | `GITHUB_ACTIONS=true CI=true npm run gate:all` | 本地（CI 模式） | exit 0；21 entries，**0 unverifiable**；1 advisory（bench-gate band） | 通过 |
| 6 | 语料漂移 | `npm run corpus:drift` | 本地 | `[tier-drift] OK`；public 131/0/4 | 通过 |
| 7 | 打包 | `npm pack --dry-run --json` | 本地 | **size=199824，93 files，headroom=176** | 通过 |
| 8 | **compile** | `build-adapters.js --check` / `instrument.js --check` / `build-adr-index.js --check` / `node --check`×3 | 本地 | 23 adapter 一致 / identity pinned / index in sync / 三个 JS 语法 OK；均 exit 0 | 通过 |
| 9 | 行尾洁净 | `git diff --check` | 本地 | exit 0，无输出 | 通过 |
| 10 | 编码 BOM/LF | 84e621f 全部 8 文件逐字节 | 本地 | **8/8 `BOM=false CR=0`** | 通过 |
| 11 | **start-alive** | `node jiahao-mcp/index.js` + MCP 握手 | 本地 | initialize / tools/list / tools/call / prompts/list **4 响应**；4s 后**进程存活** | 通过 |
| 12 | 门禁辅助 | `check-ci-jobs.js` / `check-deferred.js` | 本地 | SATISFIED exit 0；21 entries exit 0 | 通过 |
| 13 | **CI 通道（强制）** | `gh run list` / `gh api .../check-runs` | **CI** | **12/12 failure**（最早 2026-08-30）；`d148bc4`：gate-all ✗ / test ✗ / summary ✗；**`84e621f` 无运行** | **未满足** |

---

## 2. 「声明 → 证据 → 结论」对照表（被审自述逐条抽查）

| # | 报告声明 | 实物证据 | 结论 |
|---|----------|----------|------|
| 2.1 | 提交 `84e621f`，8 文件 | `git show --name-status 84e621f` = 8 条 | 属实 |
| 2.2 | 父 `d148bc4` = origin/main；未 push | `git rev-parse 84e621f^`=d148bc4；`ls-remote --heads origin codex/adr0058-repair` **空** | 属实 |
| 2.3 | A1：`requireCapabilities('test')` → `(['repo-tree'])` | diff 逐行确认；wrapper exit 0 | 属实 |
| 2.4 | A1：capability.js 兼容「注册表名 / 内联数组」 | diff：`Array.isArray(gateName) ? gateName : loadEntry(...).requires` | 属实 |
| 2.5 | A1 回归锁 5 条 | wiring test R8 块含 5 个 `test(` | 属实 |
| 2.6 | A3：summary 加「seen == expected」计数断言 | ci.yml 108-123 行确认；**我独立抽取脚本重跑 9 组输入**（见 §3.3） | 属实 |
| 2.7 | A3 回归锁 2 条 | R9 块 2 个 `test(` | 属实 |
| 2.8 | A4：ADR-0057 Context 改过去时 + 独立 CI test job | diff 确认 | 属实 |
| 2.9 | A5：`.gitignore` 加 `mr-artifacts/` | `git check-ignore -v mr-artifacts` → `.gitignore:34` | 属实 |
| 2.10 | 新增 R8/R9/R10 | ADR-0058 确有 R8/R9/R10 三节 | 属实（但 R 编号与测试不一致，见 B3） |
| 2.11 | 测试数 14 → 23 | `grep -c` = 23 | 属实 |
| 2.12 | README 660 → 669（套件数不变） | README:165,243 均为 669/49；jest 实测 669 | 属实 |
| 2.13 | 未触碰 `.githooks/*` / `gates.json` / `deferred-registry.json` / `CONTEXT.md` / `bench/polygraph/results/*` | 8 文件清单不含上述任何路径 | 属实 |
| 2.14 | 8/8 UTF-8 无 BOM + LF | 逐字节复验 8/8 `BOM=false CR=0` | 属实 |
| 2.15 | **A6 前提证伪：跟踪内容一直是 LF** | `git show d148bc4:<f>` CR=0（23/23）；`git ls-files --eol` 全 `i/lf w/lf`；全仓跟踪 CR 扫描 = **0** | 属实 |
| 2.16 | **A2「代码不可修」** | ci.yml 恢复步为 `base64 -d \| tar -xz -C "$RUNNER_TEMP"`，`JIAHAO_CORPUS_DIR=$RUNNER_TEMP/bench-corpus`；任务书点名的代码分支未尝试、未加诊断 | **部分（B7）** |
| 2.17 | 覆盖「D-013 / D-002 / D-006 / D-007 / **D-012**」 | D-012 在账本为 `proposed`（未拍板）；§2 只处置 A1-A6 | **不实（B6）** |

---

## 3. A1-A6 逐条核对（第 2 轮阻塞项）

| 项 | 要求 | 实现证据 | 判定 |
|----|------|----------|------|
| **A1** | wrapper 不再解析已移除的注册表条目；ADR-gated；补回归锁 | `run-test-gate.js:17` `requireCapabilities(['repo-tree'])`；ADR-0058 R8；5 条锁；wrapper **exit 0** | **已修** |
| **A2** | 更新 secret 或修恢复步 | 未改任何文件；R10 记录 | **部分（B7）** |
| **A3** | 空/未知结果集必须红 | `seen`/`expected` 计数守卫；2 条锁；**独立重跑 9 组输入全对** | **已修** |
| **A4** | ADR-0057 Context 去现行时态失实 | 改为 `executed ... until ADR-0058 (D-F/D-I) removed the gate ... now run in the independent CI test job` | **已修** |
| **A5** | `mr-artifacts/` 入 .gitignore | `.gitignore:34` | **已修** |
| **A6** | 修正 9 个 CRLF 跟踪文件 | 审计前提被证伪；`but discard` 归一化；工作区 CLEAN | **撤回正确** |

### 3.1 A1 能力声明的行为真值表（我用托管 node 独立复跑，非采信报告）

| 输入 | exit | 输出 |
|------|------|------|
| 数组 `['repo-tree']`，root=仓库（存在） | **0** | `PROBE-OK declared=["repo-tree"]` |
| 数组 `['repo-tree']`，root=空目录（缺失） | **2** | `::error title=UNVERIFIABLE,gate=repo-tree,requires=repo-tree::...` |
| 数组 `['bogus-cap']`（未注册能力） | **1** | capability.js:44 `unregistered capability` |
| 字符串 `'definitely-not-a-gate'`（未注册 gate） | **1** | capability.js:76 `gate ... missing from docs/gates.json` |
| 字符串 `'ci-wiring'`（已注册、cap 缺失） | **2** | `::error title=UNVERIFIABLE,gate=ci-wiring,requires=ci-mode::...` |
| 字符串 `'adr-index'`（已注册、cap 存在） | **0** | `PROBE-OK declared=["docs-adr"]` |

结论：闭世界纪律（未知能力/gate → exit 1）**未被削弱**；数组形式两端行为**与 R8 声明一致**。

### 3.2 A3 summary 聚合器真值表（我从 ci.yml **原样抽取**脚本，把 `${{ }}` 展开替换为 `$RESULTS` 后执行）

| 注入的 needs 结果 | exit | 判定行 |
|-------------------|------|--------|
| 空 | **1** | `saw 0 results, expected 2` |
| 空白 | **1** | `saw 0 results, expected 2` |
| `success success` | **0** | `aggregate green - all 2 needed jobs report success` |
| `failure failure` | **1** | `result failure is not success` |
| `skipped success` | **1** | `result skipped is not success` |
| `cancelled success` | **1** | `result cancelled is not success` |
| `success`（只 1 个） | **1** | `saw 1 results, expected 2` |
| `failure success skipped` | **1** | `result failure is not success` |
| `success success success`（3 个） | **1** | `saw 3 results, expected 2` |

结论：A3 修复**真实有效**，且计数守卫**双向**（少算/多算皆红）。报告的 6 行真值表与我的 9 行完全一致。

### 3.3 A6 证伪（我独立复算）

- 提交侧 `d148bc4`：`metrics-v2-run4.json` / `report-v2-run4.md` 等 blob 均 **CR=0**（23/23）。
- 工作区：归一化后 23/23 **CR=0**；`git ls-files --eol` 全 `i/lf w/lf attr/text=auto eol=lf`。
- 全仓跟踪文件 CR 扫描（排除二进制/CRLF 白名单）= **0**；`git status` CLEAN。
- 故第 2 轮 A6「9 个**跟踪文件**含 CRLF」确为**工作区假象**（我当时用 `git ls-files | xargs grep` 扫的是工作区字节，不是 blob）。撤回正确，`but discard` 得当。**该误差由审计侧负责，见 §10。**

---

## 4. D-xxx 逐条核对

| 决策 | 状态 | 返修轮证据 | 判定 |
|------|------|-----------|------|
| D-013（A1） | proposed | R8 落地 + 5 条锁 + wrapper exit 0 | **已实现**（但见 B1/B2） |
| D-002（A3） | current | R9 落地 + 2 条锁 + 真值表全对 | **已实现** |
| D-006 | current | wrapper 从「结构性崩溃」→ exit 0 | **功能面已补完** |
| D-007 | revised | 未触碰（正确：`needs` 聚合结构不变） | 合规 |
| D-004 | revised | 未触碰 | 合规 |
| D-010 / D-011 | proposed | 未触碰（未实现未拍板决策） | 合规 |
| D-012 | proposed | **未实现**；报告 §1 却宣称「覆盖」（仅 §3 报告格式） | **表述不实（B6）** |

**缺失 / 弱化 / 跑偏单列：**

- **跑偏（D-013）**：修复方向选对了（审计推荐 (i)），但内联通道引入的两项副作用未处理——逗号注入（B1）与 ADR-0041 D2 的 exit-2 域（B2）。
- **表述不实（D-012）**：报告头部把未拍板的 D-012 列入「覆盖」。
- **未落地（A2 的代码分支）**：任务书点名的 `JIAHAO_CORPUS_DIR` / 恢复步分支未尝试（B7）。

---

## 5. 双轴评审（$code-review，Standards + Spec）

固定点 `d148bc4`，端点 `84e621f`；两轴由两个并行子代理独立执行；**其结论我逐条复核**，下标注我亲自复算过的项。

### 5.1 Standards 轴

**硬/偏硬：**

1. **[已复核，B1]** `unverifiableLines(gate, cap)` 在**多元素数组**下击穿 ADR-0041 D5 的 workflow-command 协议：实测 `unverifiableLines(['repo-tree','docs-adr'],'docs-adr')[0]` = `::error title=UNVERIFIABLE,gate=repo-tree,docs-adr,requires=docs-adr::...` —— 逗号成了属性分隔符，`gate` 被截断、多出伪属性。这与 `capability.js:81-84` 自述不变量（「by charset ... 分隔符 ':' 和 ',' 永不可能出现」）**直接矛盾**。当前树内不可达（仅单元素数组），属**潜伏缺陷**。
2. **[已复核，B2]** `run-test-gate.js` 已被 D-F 移出注册表，成为**注册表外工具脚本**，却新获得 exit 2 路径；ADR-0041 D2 明文「exit 2 ... **binds ONLY gates registered in docs/gates.json** and their src/shared/ dependencies. Tool scripts outside the registry ... **make no exit-code promise**」。D2 未随之修订。另：`repo-tree` 探的是 `.git`，wrapper 实际不需要；而它 spawn 的套件读 `docs/adr`（`docs-adr` 欠声明）。
3. **[已复核，B4]** `CONTEXT.md:1186-1192` 的 **Gate Capability Declaration** 词条仍定义声明为「a per-gate closed-enum array in docs/gates.json」，且 `_Avoid_` 列有「inline per-gate sniffing」——返修新增的**内联声明通道**使该词条不再穷尽、且与 `_Avoid_` 措辞张力。AGENTS.md 工作约定要求文档轮同步 CONTEXT.md 词表。

**判断项：**

- `expected=2` 硬编码（`# == length of the needs list above`）——受 wiring 测试的 needs 长度解析守卫，属**受守卫的 Duplicated-Data**。
- **[已复核，B5]** 新锁中两条偏弱负断言：`expect(wrapper).not.toMatch(/requireCapabilities\('test'\)/)` 只抓单引号形式；`expect(s).toMatch(/seen=/)` 匹配的是 `seen=0` 初始化而非守卫语义（真正守卫由 `/-ne\s+"[$]expected"/` 覆盖）。
- 内联数组绕过 `validateRequires` 的 schema 级校验，仅由运行时 + wiring 测试兜底。

**已遵守：** 闭世界纪律未削弱；`parseJobs` 抽取；BOM/LF 洁净；gates.json 未动（ADR-0027 耦合护栏）；8 文件单一关切。

### 5.2 Spec 轴

- **A1 satisfied**；**A3 satisfied**；**A4 satisfied**；**A5 satisfied**；**A6 证伪成立、撤回正确**。
- **A2 partial**：任务书原文「Update the JIAHAO_BENCH_CORPUS_B64 secret ... **or fix the CI restore step's JIAHAO_CORPUS_DIR**; otherwise CI can never be green」——报告称「代码不可修 / 未做任何修改」。secret 硬闸门成立，但**任务书点名的代码分支未尝试**（恢复步可加诊断：`ls -R` 校验 tar 顶层目录、核对解析出的 corpus dir），「no code change can conjure the file」是**推断而非证据**。
- **Ledger 纪律**：未实现未拍板决策（正确）；但报告 §1 把 D-012 列入覆盖（B6）。
- **强制 CI 通道未满足**：§3 行 15「未验证」。分支未推送可解释，但按 standing rule「CI 通道为强制项」，**验收证据存在缺口**。
- **范围**：轻微越界（README 计数修正、R10/R11 测试锁为额外增补），无害；无有害蔓延。

### 5.3 取证边界

本轮未新增 atomcode 外部调研：待验证的是仓库内实物证据 + CI 通道事实，均有直接一手证据（`gh run`、本地复现、字节级扫描）。上一轮两次 atomcode 调研结论已入账本 D-010…D-013。

---

## 6. 新发现（本轮新增，单列呈报）

| 编号 | 级别 | 发现 | 证据 | 影响 |
|------|------|------|------|------|
| **B1** | 中（潜伏契约） | 内联数组使 `gate=` 属性可含逗号，击穿 ADR-0041 D5 协议 | 实测 `gate=repo-tree,docs-adr,requires=docs-adr`；`capability.js:81-84` 自述不变量被同文件新通道证伪 | 树内不可达（仅单元素），但内联通道是新增公共面；一旦多元素即产出坏注释 |
| **B2** | 中（契约域） | 注册表外工具脚本新获 exit 2 路径，ADR-0041 D2 未修订 | D2 原文「binds ONLY gates registered in docs/gates.json ... Tool scripts outside the registry make no exit-code promise」；`run-test-gate.js` 已出注册表 | 三态退出码契约的域边界被静默扩大 |
| **B3** | 中（文档自相矛盾） | R 编号命名空间冲突：wiring 测试标 R10=A4、R11=A5；而 ADR-0058 的 R10=A2、**无 R11**；A4/A5 在 ADR 中**无 R 记录** | `test/adr-0058-wiring.test.js:178,186`；ADR-0058 标题序列 R1…R10；ADR 自称「R8-R10 record the three findings」且 R7 宣称 ADR 为唯一事实源 | 测试引用 ADR 中不存在的 R11；与 F2/F3 同类「文档含不实/不完整声明」 |
| **B4** | 中低（词表漂移） | `CONTEXT.md` 未同步内联声明通道 | `CONTEXT.md:1186-1192` 仍称声明=「per-gate closed-enum array in docs/gates.json」 | AGENTS.md 工作约定要求文档轮同步 CONTEXT.md 词表 |
| **B5** | 低（锁强度） | 两条新负断言偏弱 | wiring test:127（仅单引号）、:162（`seen=` 命中初始化） | 防回归强度低于宣称 |
| **B6** | 低（过程） | 报告 §1 把未拍板的 D-012 列入「覆盖」 | 账本 D-012 = proposed；§2 只处置 A1-A6 | 覆盖面宣称夸大 |
| **B7** | **中（阻塞 CI 绿，未解）** | A2 只走环境分支；任务书点名的代码分支未尝试、无诊断 | ci.yml 恢复步 `tar -xz -C "$RUNNER_TEMP"`；报告 §2.2「未做任何修改」 | CI 永不可能绿 → D-011 required-check 载体问题无从定夺 |
| **B8** | 审计自报 | 第 2 轮 A6 前提测量口径错误（扫工作区字节而非 blob） | 本轮复算：blob CR=0、eol `i/lf w/lf` | 由审计侧负责，已在 §10 声明 |

---

## 7. 过程违规（单独呈报，不替你追认）

| 编号 | 级别 | 违规 | 证据 |
|------|------|------|------|
| **Q1** | 硬（文档不实） | ADR-0058 声称记录本轮三项发现（R8-R10），但 A4/A5 无 R 记录；且测试引用的 R10/R11 与 ADR 的 R10 冲突 | 见 B3 |
| **Q2** | 中 | 报告 §1「覆盖 D-012」不实（未拍板决策） | 见 B6 |
| **Q3** | 中（验收诚实性，承接 P4） | 报告 §3 有「验证通道」列（进步），但强制 CI 通道行仍为「未验证」且未在结论中标注为阻塞 | 报告 §3 行 15 |
| **Q4** | 低 | `but` 使用合规（全部写操作走 `but commit`/`but discard`），但报告未附 `but status` 原始输出作为 `discard` 证据 | 报告 §2.6/§5 仅给结论 |

---

## 8. 修复要求与重跑清单

**功能面无需返工。** 下列为 push 前的文档·契约级修补（建议同一分支追加一次 doc-fix 提交，不 amend）：

1. **[B1]** `capability.js`：内联数组通道加**长度/字符集守卫**（或对非注册表 gate 标签走额外转义），并在 wiring test 补**多元素负例**；同步修正 `:81-84` 的自述不变量措辞。
2. **[B3]** 统一 R 编号命名空间：把 A4/A5 的 ADR 记录补齐（建议 R11=A4、R12=A5），或改 wiring 测试的标签与 ADR 对齐；消除「引用不存在的 R11」。
3. **[B4]** 同步 `CONTEXT.md` Gate Capability Declaration 词条（增加内联声明通道；复核 `_Avoid_` 措辞）。
4. **[B2]** 二选一：(a) 在 ADR-0041 D2 加 inline 修订块，明确注册表外脚本的内联声明通道；或 (b) 把 wrapper 声明为「无 exit-code promise」并在 ADR-0058 R8 记录该域边界。
5. **[B5]** 收紧两条弱断言（双引号形式 + 断言守卫语义而非初始化）。
6. **[B6]** 修正报告 §1 覆盖行（移除 D-012）。
7. **[B7]** A2：至少执行**代码侧诊断**（在恢复步后加 `ls -R "$RUNNER_TEMP"` 或核对 tar 顶层目录），据实判定「secret 陈旧」vs「恢复步路径错误」；若确为恢复步缺陷则修之。需 secret 写权限的分支留给人工。

**重跑清单（任何修复完成后必须逐条重跑，含 CI 通道）：**

```
node node_modules/jest/bin/jest.js                 # 49 suites / 669 tests, exit 0
node scripts/run-test-gate.js --expected-suites 49 # exit 0, "[test] OK: 49 suites, 669 tests"
npm run gate:all                                   # exit 0, 4 UNVERIFIABLE
GITHUB_ACTIONS=true CI=true npm run gate:all       # exit 0, 0 unverifiable
npm run corpus:drift                               # fingerprints OK
npm pack --dry-run --json                          # size < 200000 (当前余量仅 176 B)
node scripts/build-adapters.js --check             # 23 adapter 一致
node scripts/instrument.js --check                 # identity pinned
node scripts/build-adr-index.js --check            # in sync
git diff --check                                   # 无输出
node scripts/check-ci-jobs.js                      # exit 0 SATISFIED
node scripts/check-deferred.js                     # exit 0, 21 entries
# start-alive: node jiahao-mcp/index.js + MCP 握手 -> 4 响应且进程存活
# CI 通道（强制）：gh run list / gh api .../check-runs -> summary = success
```

**push 状态：冻结。**

---

## 9. 待你裁决

1. **B1/B2/B3/B4/B5** 是否本轮一并修（建议是；均属小改动），还是拆成独立 hygiene 轮？
2. **A2 / B7**：secret 更新（需 GitHub secret 写权限）由你操作？代码侧诊断由谁做？
3. **D-004 / D-007 的 revised** 是否认可？**D-010 / D-011 / D-012 / D-013** 四个 proposed 如何定？（D-013 的功能面已实现，但 B1/B2 显示其载体仍需一次契约澄清）
4. **Q1-Q3** 是否对返修子代理作质量问责？
5. 打包余量仅 **176 字节**（ADR-0039 D3）：下一个打包面文件新增即打破 `npm test`，是否本轮一并处理？

---

## 10. 审计自身的边界与误差声明

- **已补 CI 通道**（§1 第 13 项），并如实记录其未满足。
- **自报误差（B8）**：第 2 轮 A6 的测量口径错误（工作区字节 vs 提交 blob）导致误报 9 个「跟踪文件含 CRLF」。本轮复算证伪并撤回。**该误差由审计侧负责。**
- **工具链注意事项**：ctx 沙箱默认 JS 运行时是 **bun**（`process.execPath` 指向 bun），本轮早期数次 `spawnSync(process.execPath, ['-e', ...])` 探测因此失真（返回 exit 0 且无输出）；已改用**托管 node 22.22.2 绝对路径 + 脚本文件**重跑，结论以重跑为准。此项已写入 handoff 的 standing rules。
- **未验证**：GitHub 侧分支保护/Ruleset（平台 403）；`JIAHAO_BENCH_CORPUS_B64` 内容（无权限）；修复后的 CI 实跑（修复尚未发生）。
- 本报告未改动任何仓库跟踪文件；仅写入 gitignored 的 `.scratch/`。
