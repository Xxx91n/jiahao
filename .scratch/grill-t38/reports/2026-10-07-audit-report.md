# grill-t38 落地波 — 二方审计报告（2026-10-07）

> 身份：审计 Agent（第二方）。被审计对象：`D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-06-report.md`（landed set 见 `dabf82c2`）与其 handoff `C:\Users\Administrator\AppData\Local\Temp\grill-t38-landing-handoff-2026-10-06.md`。
> 方法纪律：**不采信报告自述**。四项硬验收全部本机复跑；报告每条关键声明逐条对仓库实物抽查（文件存在性 / `git ls-tree` / `rg` / 命令复跑）。子代理结论按"信任但复核"处理，本报告只收录我亲自复核到证据的条目。
> 职责分离：本窗口**只出报告，不动手修**。发现的问题全部进 §6 返工清单。
> 评审基准：`D:\Aworker\jiahao\.scratch\grill-t38\decision-ledger.md`（D-001~D-006）、`D:\Aworker\jiahao\.scratch\grill-t38\spec-t38-assertion-anchoring.md`（S-0~S-12）、`D:\Aworker\jiahao\.scratch\grill-t38\handoffs\next-round.md`（T-0~T-12）。

---

## 0. 结论（VERDICT）

**不通过（FAIL）。打回原修复窗口返工。**

三条判定理由，每条都有本窗口复跑出的证据：

1. **验收表数字与实测不符，且不可从报告内命令复现。** 报告 §0 声明 `npx jest` → "1 failed / 100 passed / 101 suites；1 failed / 4 skipped / 1765 passed / 1766 tests"。本窗口 `npx jest --ci` 全量实测：**5 failed / 96 passed / 101 suites；6 failed / 1760 passed / 1766 tests**。报告声明本身算术不成立（1+4+1765=1770 ≠ 1766）。
2. **本轮自身引入 5 个红，报告一处未披露。** 报告 §4.6 声明 FAIL 集合为 `pack-smoke / post-land-sentinel / g6-publish`；实测 FAIL 为 `pack-smoke / post-land-sentinel / claim-surface-roles`，而 `g6-publish` 为 **PASS**。被漏报的 `claim-surface-roles` 与三个 coverage 腿红，均由本波最后两个 commit（`296c819f` R5 / `dabf82c2` R6）引入（根因见 §2 表 G3/G4）。
3. **轮契约的硬序与同 commit 义务未落实。** T-0 声称"实施与提交顺序均按 T-0"，但 impl lane 的树里 **没有 ADR-0095/ADR-0096**（§2 表 S1），而 `docs/gates.json` 三条新腿的 `source_adr` 正指向该缺失文件 —— 这正是 T-0 第 4 步"assert 腿最后落地防 source_adr 悬空"要防的缺陷形本身。D-005.5 的同 commit 义务也分散到 2 条 lane / 3 个 commit（§2 表 S3）。

另：**报告的落款声明"所有证据均可由报告内命令原样复跑"（`D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-06-report.md:115`）已被两处实测否证** —— jest 总量（§0.1）与 `check-orphan-ancestry` 的锚集引用（§2 表 S6）。按本项目 class-vs-sample 纪律（`D:\Aworker\jiahao\AGENTS.md` grill-t36 D-007），这是把样本证据当类声明陈述。

---

## 1. 硬验收复跑（验收标准原文：编译通过、打包通过、启动并测活软件进程；每个平台都要有 test 闭环）

| 项 | 报告声明 | 本窗口实测（命令 → 输出） | 结论 |
|---|---|---|---|
| 编译通过 | `node --check` × 11 → 全部 OK | 同一 11 文件清单逐跑 → `COMPILE RESULT 11/11 OK` | **成立** |
| 打包通过 | `npm pack --dry-run` → 540,369 bytes / 184 files；cap 断言 FAIL（owner 项） | `npm pack --dry-run --json` → `size=540369 entryCount=184`；**再跑真实 `npm pack`** → 同一 `jiahao-0.0.1.tgz` 540,369 bytes（tar `-tzf` 计 184 项） | **成立**（报告只做了 dry-run，本窗口补做了真打包，结论更强） |
| 启动并测活进程 | `node scripts/run-gates.js` → `gate:all exit 1 (54 entries, 4 unverifiable)`；48 PASS / 4 UNVERIFIABLE / 3 FAIL | ①从解包后的 tarball 启动声明的 bin：`node package/scripts/install.js --help` → `jiahao v0.0.1 — install .jiahao-profile flag`（**进程起得来**）；②`node scripts/run-gates.js` → 同一行 `gate:all exit 1 (54 entries, 4 unverifiable, fail-fast off)`，腿级判定实测 **46 PASS / 4 UNVERIFIABLE / 3 FAIL**（53 条被判定腿） | **部分成立**：启动测活成立；**PASS 计数与 FAIL 集合名不符**（48→46；FAIL 第三个腿是 `claim-surface-roles` 不是 `g6-publish`） |
| test 闭环 | 1 failed / 100 passed / 101 suites；1 failed / 4 skipped / 1765 passed / 1766 tests；"唯一红 = pack cap" | `npx jest --ci` → **5 failed / 96 passed / 101 suites；6 failed / 1760 passed / 1766 tests**；红清单见 §2 表 G1~G6 | **不成立** |

run_id 括注（ADR-0096 §P-1 / `D:\Aworker\jiahao\AGENTS.md` Prose anchor clause）：本节 46 PASS / 4 UNVERIFIABLE / 3 FAIL 的机械记录 = `test-artifacts/status-inventory/status-inventory.gates.efa91eca49b4193052866671b72c5750747c8b03.HEAD.dirty.2026-10-06T15-38-31.488Z.json`，`run_id = gates.efa91eca49…8b03.HEAD.dirty.2026-10-06T15-38-31.488Z`，`tree_sha = efa91eca49b4193052866671b72c5750747c8b03`，`complete = true`，`emitted_at = 2026-10-06T15:41:37.630Z`，`rows = 7`（该工件只记非 PASS 腿：4 unverifiable + 3 fail）。
jest 两行数值**无 run_id 工件可回指**（本窗口用 `npx jest --ci` 直跑，未经 `scripts/run-test-gate.js` 发射面）；其证据等级为命令级捕获，落在 `audit-t38-jest.log`（OS temp，未跟踪，按行计数 5 failed / 6 failed 两处可复核），复跑第二次的 `audit-t38-jest2.log` 给出 `Test Suites: 5 failed, 5 total / Tests: 6 failed, 72 passed, 78 total` → 非偶发。此差异如实标位，不冒充已锚定。

补充复跑（报告"可复跑"声明的抽样验证）：`build-adr-index --check`（OK 96 entries）、`build-audit-checklist --check`（OK 26 commands）、`run-gates --check-alignment`（OK 53 entries, 3 meta-checks）、`check-gate-params`（OK 53 entries）、`check-deferred`（OK 85 entries / 71 live / 14 closed）、`build-doc-hygiene-baseline --check`（ratchet holds）、`check-status-inventory`（EXIT=0 + legacy 黄级 + drift 披露）、`build-rewrite-map.js --check`（OK 5583 citations）与 `--published-only`（OK，祖先链对 origin/main 核验）→ **全部逐字复现**。报告的分项计数（status-inventory 59 + last-claim-mutation 3 + freshness/0085/0086 61 + audit-checklist/audit-surface 8 = 131）经 `npx jest <7 files>` 复跑 → `Tests: 131 passed, 131 total`，**成立**。

即：**报告的局部证据绝大多数是真的；失实集中在"总量"与"红集合"两处，而这两处恰是验收结论的承重面。**

---

## 2. 声明 → 证据 → 结论对照表

### G. 红绿事实面（jest / gates）

| # | 报告声明（出处） | 实测证据 | 结论 |
|---|---|---|---|
| G1 | 唯一红 = pack cap（§0 test 闭环；§4.1） | `test/adr-0038-wiring.test.js:54` `Expected: < 470000 Received: 540369` | 成立（owner-scope，已披露） |
| G2 | 未声明 | `test/adr-0093-m3-wiring.test.js:44` 与 `:48` → `[".scratch/grill-t38/reports/2026-10-06-report.md: tracked claim-surface artifact with NO registry row - fail-closed (a new artifact and its row land in the same commit)"]` | **缺失披露** |
| G3 | 未声明 | `test/adr-0081-wiring.test.js:141` / `adr-0083-wiring.test.js:243` / `adr-0084-wiring.test.js:188` 三处 `expect(r.status).toBe(0)` → 实得 1 | **缺失披露** |
| G4 | §4.6 "FAIL ×3：pack-smoke / post-land-sentinel / g6-publish" | 门检实测 FAIL = `[196 pack-smoke]` `[231 post-land-sentinel]` `[232 claim-surface-roles]`；`[153 g6-publish] PASS` | **跑偏**（FAIL 集合名错 + 漏一个真红） |
| G5 | §0 "48 PASS / 4 UNVERIFIABLE / 3 FAIL"（合计 55，声明头 54 entries） | 实测 46 PASS / 4 UNVERIFIABLE / 3 FAIL = 53 判定腿（+ `gate:all` 聚合头 = 54） | **弱化/失实**（PASS 多报 2；自身算术不自洽） |
| G6 | §4.6 新腿 233/234/235 PASS；`map-freshness` 224 未报 | 实测 `[233 expected-red] PASS`、`[234 comment-refs] PASS`、`[235 status-inventory] PASS`、`[224 map-freshness] PASS` | 成立 |

G2/G3 的根因（本窗口定位，非推断）：

- **G2 ← R6 `dabf82c2`**：landed set 只有报告文件本身（`git show --name-only dabf82c2` = 1 file）。`D:\Aworker\jiahao\docs\governance\claim-surface-roles.json` 现 237 行，`grep grill-t38/reports` → 0 行。同文件里 grill-t37 的行自述 "row lands with artifact per fail-closed rule"，且 t37 的 commit（`32af9b5f`、`2ebc4d0d`）确实是 "report + handoff + registry rows" 同 commit —— **本波把上一轮已经做对的机械动作丢了**。
- **G3 ← R5 `296c819f` 之后无人补 trend 行**：`node scripts/check-governance-inventory.js --coverage-base 78d8a14cbc90bbbe1f48a2931c69e41716738f6e` 实跑输出 5 行 FAIL —— `scripts/evidence-freshness.js`、`scripts/shared/last-claim-mutation.js`、`test/audit-checklist.test.js`、`test/freshness-checker.test.js`、`test/last-claim-mutation.test.js` "is R2 but undeclared in the latest row (t21 audit C-1)"。`D:\Aworker\jiahao\docs\governance\trend-inventory.json` 31 行、最后一行是 `grill-t37`，**没有 grill-t38 行**（`JSON.stringify(j).includes("grill-t38")` → false）。AGENTS.md 工作约定要求治理机器走登记的 carve-out 通道；本轮改了 AGENTS.md 却没落本轮的 trend 行。

### S. 结构与契约面

| # | 报告/handoff 声明 | 实测证据 | 结论 |
|---|---|---|---|
| S1 | §1 "实施与提交顺序均按 T-0：①ADR-0095→②ADR-0096→③机制→④gates…" | `git merge-base --is-ancestor b9f8052c 4a1a06c1` → **NO**；`git ls-tree -r --name-only 5870d7f8 -- docs/adr \| grep 009[56]` → **0**；`git cat-file -e 5870d7f8:docs/adr/0095-…md` → ABSENT。`git show 5870d7f8:docs/gates.json` 53 条中 **3 条 `source_adr` 在该树内不可解析**；`scripts/run-gates.js:104` 是 `fs.existsSync` fail-closed 分支 | **跑偏**。起草时序上是真的，提交拓扑上是反的：impl lane 不含其立法权威。单独 push/checkout `grill-t38-impl` → 注册表校验直接红。E-19 要求的 settled-tree 复核之所以绿，只因 `efa91eca` 这个 workspace merge 把两条 lane 缝在一起 |
| S2 | 每 commit 带 `[ANCHORING]` footer 等于 landed set | 6/6 commit 逐一 `git show --name-only` 对 footer：`b9f8052c` 5/5 MATCH、`4a1a06c1` 23/23、`5870d7f8` 1/1、`832a786f` 1/1、`296c819f` 1/1、`dabf82c2` 1/1 | 成立 |
| S3 | D-005.5 同 commit 义务（emit 改形 + pinning test + ADR 节 + _doc/AGENTS.md 措辞） | `4a1a06c1` 含 `scripts/build-audit-checklist.js` + `test/audit-checklist.test.js` + `docs/governance/audit-checklist.json`；§N-3 立法文本在 `b9f8052c`（另一条 lane）；AGENTS.md 措辞在 `296c819f`（另一条 lane） | **跑偏**（1 义务 → 3 commit / 2 lane）。讽刺点是 ADR-0095 D-B 的普遍条款正是为此而立的 |
| S4 | 两条 lane、未 push | `git branch` → `grill-t38-docs`/`grill-t38-impl`；`git merge-base --is-ancestor <四个 sha> origin/main` → 全部 not on origin；`origin/main` = `0b7bfb68` | 成立 |
| S5 | 工作树只剩范围外项未提交 | `git status --short` → 7 项：`docs/adr/0094-*.md`(M)、`test/post-land-sentinel.test.js`(M)、`.scratch/grill-t23\|t27\|t28\|t36` 残留 | 成立 |
| S6 | T-6 证据 "`OK - 133 pin(s) / 24 unique sha(s) … [refs/heads/gitbutler/target, refs/heads/grill-t38-docs, refs/heads/main]`" | 同命令复跑 → `133 pin(s) / 24 unique sha(s) … [refs/heads/gitbutler/target, refs/heads/grill-t38-docs, **refs/heads/grill-t38-impl**, refs/heads/main]` | **锚集引用不可原样复现**（3 refs → 4 refs）。集合锚本身工作正常（这恰好是 T-6 想要的行为），但报告把一个派生时点样本写成了可复跑证据 |
| S7 | T-5 证据 "`npx jest test/post-land-sentinel.test.js` → 30/30 passed" | `git status --short` → 该文件 **modified 未提交**（`git diff --numstat` = 81/81）；handoff §"Out-of-scope" 自己列了它 | **弱化**：证据取自脏工作树，非 committed-surface-reachable（违 `D:\Aworker\jiahao\AGENTS.md` "A report may only claim committed-surface-reachable evidence"） |
| S8 | §4.1 "本轮入库面净增量 +33,319 bytes / 14 files"；HEAD 基线"约 507,050 bytes" | 540,369 − 507,050 = 33,319（对被标注为"约"的被减数做精确差）；6 个 commit 的 32 个去重 landed 文件中 **16 个**出现在 tarball 内（`scripts/*` 11、`src/shared/status-inventory.js`、`docs/gates.json`、`docs/deferred-registry.json`、`AGENTS.md`、`README.md`），与"14 files"不符 | **未消解**：基线未钉、文件计数与实物不一致。owner 重推 cap 时不能拿这两个数当依据 |
| S9 | §4.1 pinned 公式 `cap = ceil_to_10_000(M_latest × 1.10)`，M_latest=540,369 → 600,000 | ceil(540369×1.10 / 10000)×10000 = ceil(59.4406)×10000 = 600,000 | 算术成立（但 M_latest 须由 owner 按协议重测，本窗口实测值与之一致） |
| S10 | handoff "test-manifest 经 `--junit` 通道重建，非 blessed jest run" | `docs/test-manifest.json` 在 `4a1a06c1` landed set；`build-test-manifest.js --junit` 路径由脚本自身登记 | 成立（已披露，非违规） |

### D. D-xxx 逐条核对（只列缺失/弱化/跑偏；成立项合计 34 条由双轴子代理与本窗口共同复核）

| 项 | 裁决 | 证据（命令/文件:行） |
|---|---|---|
| **D-001.7** 新鲜度棘轮显式重落（"最新报告锚树的 last-claim-mutation ≤ emitted_at"） | **缺失（承重项）** | `scripts/check-status-inventory.js:369` 只做 `emitted_at` **存在性**检查；全仓 grep 无任何把 `lastClaimMutation` 与 `emitted_at` 比较的语句。替代实现是 `:271` 的 `git log anchor..carrier.parent` 区间断言 —— 账本 D-001.7 原话警告的"恰好把真缺陷划出窗外的子集是藏身所"正是这个有界形。锚树之外/兄弟 lane 上的 claim 突变落在判定窗外 |
| **D-001.8②** 锚字段 MUST 非后补（防逃生舱三件套之二） | **缺失（无实现、无测试）** | `classifyBlockAnchor`（`scripts/check-status-inventory.js:204-219`）：`anchor` 存在即直接 `return {kind:'anchored'}`，**不进** `blockMs >= anchorRegMs` 分支；`anchor` 亦不在 `rows_digest` 覆盖内。故"注册 commit 之后补写锚"这一形态机械上不可判 |
| **D-002.4 a3** "audit-coverage/post-land-verify 锚定收编 → 挂 deferred-registry 行" | **ADR 记载了不存在的登记** | `D:\Aworker\jiahao\docs\adr\0096-…md:51` 写 "registered as a deferred row (the t37-D-006.5 form)"；`docs/deferred-registry.json` 实测 defer-0086..0091 主题为 N-4/HEAD-绑枚举/残留窗/prose 兜底/F-5/F-11，`includes("audit-coverage")`→false、`includes("post-land-verify")`→false。同一洞吞掉 D-006.7 的"刷新迟到=黄级非红"（该腿实测仍红，无 registered disposition） |
| **D-001.5 / §P-1** 锚树重推导用 throwaway worktree（ADR 自述"verified at implementation time"） | **跑偏（ADR 过度声明）** | `docs/adr/0096-…md:106` 声明该机制并已核验；`grep -i "worktree\|materiali\|mkdtemp" scripts/check-status-inventory.js` → **零命中**。断言腿读的是 `test-artifacts/status-inventory/`（`:73`），而 `.gitignore:46` 收录 `test-artifacts/` → 该腿绿**依赖本机未跟踪工件**，干净 clone 上退为 exit 2。账本 D-002.9① 本已把 worktree 降为"工件缺失时的手动强验证"，但这句 Declaration 精化**未进 ADR 正文**（ADR 无 manual/captured-evidence 表述）→ 立法文本落后机制一层 |
| **D-001.3** 统一锚字段 "schema 演进只增不改 **+ 版本 bump**" | **弱化** | `src/shared/status-inventory.js:47` `JOIN_KEY_VERSION = 'v1'`，`:190` 仍写 `v1`；注释 `:50` 自称 "additive v1.1"。字段加了、版本号没 bump |
| **D-003.1** workspace merge commit **结构性**排除出锚集 | **弱化（实现形与措辞不符）** | `scripts/evidence-freshness.js:537` 用 `subject === 'GitButler Workspace Commit'` **标题字符串匹配**做排除，非 ref/拓扑结构判据；改名或换 subject 即失效 |
| **D-004.3** mode/ref_context 枚举闭集 | **弱化（只约束诚实发射器）** | 消费腿 `scripts/check-status-inventory.js` 全文不引用 `MODES`/`REF_CONTEXT`（grep 零命中）→ 手写 `"dirty:3"` 之类越枚举值可过。另：`src/shared/run-id.js:13` CI 形 `runner_ctx = GITHUB_RUN_ID.GITHUB_RUN_ATTEMPT.GITHUB_JOB` **无 dirty 位**，D-004.3 依赖的"dirty 度记 runner_ctx（已有）"在 CI 路径上不成立 |
| **D-002.5** prefer-HEAD 废除 | **弱化（退役机制仍被测试锁绿）** | `pickDerivation`（`scripts/check-status-inventory.js:177`，`:477` 导出）断言路径已不用，但 `test/status-inventory.test.js:686` "pickDerivation prefers the HEAD-tree derivation" 仍把退役语义作为**期望行为**钉住 |
| **D-002.10** 六场景测试面 | **部分（绿路径缺）** | 存在：区间内突变红(`:530`)、restack 黄+carrier 降级(`:550`)、非祖先红(`:564`)、mismatch 红(`:472`)、同树他 run 黄(`:496`)、①选中(`:483`)。缺：**锚=HEAD 的正例通过**、**锚=祖先+区间干净的正例通过**；`main()` 无测试。承重结论：严格锚定路径**零生产样本** —— 本仓现存最新 status-inventory 块在 `2026-10-05-audit-loop2.md`（legacy 路径，实测 `::warning … legacy_run_id_path`），t38 报告自身**不含** v1 块 |
| **D-003.6 / T-12** 残留窗实测首样本登记 | **缺失** | `defer-0088` 的 `last_check_in.note` 写 "first measurement expected in the implementation round"；报告 §T-12 无该样本，handoff "S-12 gaps" 也未列它（只列了另外三项未测） |
| **D-006.3 / T-12** F-9 普遍条款可判性验证 | **缺失** | `docs/adr/0095-…md:90` 仍写"待起草期实测"；报告 §T-12 沉默；`run-gates.js:71` `TIER_TIMEOUT_S = {}`（该条款点名实例仍为空）。本窗口实测反而给了三个未登记的活例（G2/G3） |
| **D-004.5** prose 括注 run_id 义务 | **被本波自身工件违反** | 条款在 `296c819f`(R5) 入 AGENTS.md；下一 commit `dabf82c2`(R6) 的报告在承重数值行（`:13` 540,369/184、`:15` 1765/1766、`:79` 600,000）**无任何 run_id 括注** |
| **D-006.1/.8** pack cap 移交须 size + entryCount 同报 | **部分** | 报告 `:77` 以 "540,369 bytes / 184 files" 报出；本窗口确认 npm 字段名即 `size` 与 `entryCount`（`entryCount=184`），但报告未点名字段，且 §8 说 "entryCount 未随报" 的缺口在 handoff 里未闭合 |
| **轮约定 工作约定**（`D:\Aworker\jiahao\AGENTS.md` "每轮文档产物须同步 CONTEXT.md 词表"） | **缺失** | `CONTEXT.md` 在两条 lane 的 landed set 中均不出现（`git diff --name-only 0b7bfb68..5870d7f8` / `fa654a05..dabf82c2` 复核）。本轮新词（assertion-anchoring / 锚权威 vs 寻址权威 / 漂移观测面 / live-set / tip 锚 vs 快照锚 / valid-time 与 transaction-time）未入词表；任务书 T-1 点名 `domain-modeling` 即为此事 |
| **T-0 前置实测**（任务书"实现期登记缺口·先测后写"，ref 稳定性是 T-3/T-6 前置） | **未做即写** | 报告 §5 自述"GitButler ref_context/lane ref 在 restack 抖动下稳定性未实测"；机制已 landed。属"先测后写"约束被跳过，非披露缺失 |

**否决项（11 项）合规复核：全部未被违反。** 具体：prefer-HEAD 已出断言路径（G/D 表 D-002.5 只欠测试面清理）、run_id 未作隐式锚、无 anchor+run_id 双写、无合成 measurement commit、dirty 未进 mode 枚举、dirty 未映射 UNVERIFIABLE、`scripts/check-audit-surface.js` 零变更（不在任何 landed set）、emit 输出完整块而非半截裸数组、pinning test 是 emit→`extractCoverage` 回环而非 emit 自测、未新建 `test/adr-0091-wiring.test.js`（文件系统实测不存在）、`source_adr` 全为单值、未削包体。

---

## 3. 过程违规单独呈报（不追认）

按本项目纪律，以下为**过程**问题，与实现质量分列；是否追认由 owner 裁。

- **PV-1 在暴露窗内宣布（E-19 违例）。** 报告 §0/§4.6 的 battery 数字与 settled 树不符；两个红族分别由 R5、R6 引入，即数字取自"最后一个 `but` 突变之前"的树。`D:\Aworker\jiahao\AGENTS.md` Final leg (E-19) 明文禁止在该区间 declare。
- **PV-2 红集合误报 + 真红漏报（G4）。** 把已绿的 `g6-publish` 列为 FAIL，同时把真红的 `claim-surface-roles` 完全漏掉；PASS 计数多报 2（G5），且声明自身算术不成立（55≠54、1770≠1766）。这不是四舍五入级误差，是承重验收面的错报。
- **PV-3 claim-surface 同 commit fail-closed 义务丢失（G2）。** 上一轮（t37 `32af9b5f`/`2ebc4d0d`）执行的是 "report + handoff + registry rows" 同 commit；本轮 R6 只 land 文件不 land 行。
- **PV-4 trend 行缺失（G3）。** 改 AGENTS.md 而未登记本轮 governance row，5 个 R2 文件对覆盖腿不可见。
- **PV-5 硬序只在起草时成立、在拓扑上不成立（S1）。** 以 workspace merge 的绿掩盖 lane 单飞的悬空。
- **PV-6 立法文本落后机制（D-001.5/D-002.9① 项）。** ADR-0096:106 把一个未实现的 worktree 机制写成"verified at implementation time"。
- **PV-7 ADR 记载了不存在的登记（D-002.4 项）。** ADR-0096:51 声称挂了 deferred 行，registry 无此行。
- **PV-8 证据取自脏工作树（S7）。** `test/post-land-sentinel.test.js` 未提交改动上的 30/30 被写入 committed 报告。
- **PV-9 报告违反自己刚立的 prose 条款（D-004.5 项）。**
- **PV-10 "所有证据可原样复跑"落款为过度声明（S6、§0.1）。** 属 class 声明未验 class（grill-t36 D-007）。

> 同时如实记录**做得好的部分**，以免误读为全面否定：编译/打包/启动三项硬验收全部为真且本窗口加强了（真打包 + 从 tarball 启进程）；`[ANCHORING]` footer 6/6 精确；未 push、工作树只剩范围外项两条披露为真；11 项否决项零违例；分项测试计数 131 复现；rewrite-map `--check`/`--published-only`、adr-index、gate-params、alignment、deferred、doc-hygiene 八项 check 逐字复现。

---

## 4. 双轴评审（code-review skill：Standards 与 Spec 分列，不合并、不跨轴重排）

评审基准点：`main` = `0b7bfb68`（impl lane 基）与 `fa654a05`（docs lane 基）；diff 命令 `git diff 0b7bfb68..5870d7f8 -- scripts src test docs/gates.json docs/governance` 与 `git diff fa654a05..dabf82c2`；spec 源 = decision-ledger / spec-t38 / next-round 任务书；标准源 = `AGENTS.md`、`CONTEXT.md`、ADR-0095/0096 及相关机制 ADR。两轴各由独立子代理并行取证，下列条目已经本窗口逐条复核。

## Standards

硬违例（有文件+规则可引）：

1. impl lane 注册 blocking/confirmatory 腿指向该树不存在的契约（`docs/gates.json:605/616/627`；`git ls-tree 5870d7f8 -- docs/adr` 无 0095/0096；`scripts/run-gates.js:104` fail-closed）→ 违 ADR-0095 D-B 与其 "assert 腿最后落地防悬空" 登记句；报告未披露。
2. ADR-0096 D-E（t37-D-005.5）锚树重推导未实现，断言①读未跟踪工件（`check-status-inventory.js:231,285` + `.gitignore:46`）→ 该腿绿不可移植。
3. §D-P1 "双时制披露句"在发射器无对应字段（`src/shared/status-inventory.js:186` 只加 anchor）。
4. 陈旧注释与代码矛盾：`check-status-inventory.js:298-300`（"don't fake a registry identity / until the registry entry lands"）vs `:301` `requireCapabilities('status-inventory')`（登记已在 R3 落地）。
5. 证据约定违例：报告 `:39` 的 `node -e "...a.lastClaimMutation===b.lastClaimMutation"` 未标 display-form（AGENTS.md grill-t20 B-2）。
6. prose 锚条款违例：报告 `:14/:43/:77` 承重数值无 run_id 括注。
7. `check-status-inventory.js:467` 用 `exitUnverifiable(SELF_LEG,'repo-tree')` 表达"无自身 run 工件"，诚实的定制 `::error` 行被删（ADR-0040 D4 / 0041 D5 的 reason 与因不符）。

判断级（Fowler 基线，非硬违例）：谓词分叉（`evidence-freshness.js:537` subject 等值 vs `:129` startsWith）；死泛化（`pickDerivation` 保留导出且被测试钉住）；重复代码（`check-status-inventory.js:440` 与 `:450` 同形 `fmt` 闭包）；居所错位（`deriveAnchor` 住在 `run-gates.js:197` 却由 `run-test-gate.js:46` 在 require 期调用，8 次 git 调用）；硬编码 `WORKSPACE_REF`（`src/shared/status-inventory.js:61`）绕过 taxonomy 的 `cfg.workspace_ref`；类声明枚举面不全（ADR-0096 "live 调用点全集四处" 实测 `test/freshness-checker.test.js:194/306/320` 亦传 `{}`，部分由 `defer-0087` 承接）。

## Spec

- **缺失/未实现**：D-001.7 棘轮、D-001.8② 非后补、D-002.4 a3 deferred 行（且 ADR 虚报其存在）、D-003.6 残留窗首样本、D-006.3 F-9 可判性、D-003.9 F-α 收窄升级路径登记、D-006.7 刷新迟到黄级化。
- **部分**：D-001.3（字段加了、版本 bump 没做）、D-001.8（三件套缺一条）、D-002.5（退役不彻底）、D-002.10（6 场景缺 2 条绿路径、`main()` 未测）、D-003.1（排除非结构性）、D-004.2（规则①机械不可分证——规则②逼等值，`:205/381` 仍解析 `run_id` 第二段）、D-004.3（消费侧不校验枚举 + CI 无 dirty 位）、D-004.7（从未把工件 `tree_sha` 对 `anchor.tree_sha` 复核，等值仅传递成立）、D-006.1（字段未点名、基线"约"）。
- **跑偏**：D-005.5 同 commit 义务（3 commit / 2 lane）、D-002.6 carrier 未定降级顺手丢了祖先合取（`:260` `if (!degraded && …)`）、T-0 硬序拓扑不成立、ADR-0096:106 把未实现机制写成已核验。
- **范围外/搭车**：`docs/rewrite-map.json`（+7,619/−29,575，报告自陈是 t37 resync 尾欠）与 `test/adr-0074-wiring.test.js` 重钉被卷进 t38 impl commit；`bench/research/out/g6-publish-replay.json` 重生成；`.scratch/grill-t38/GOAL.md`（29 行）不在 T-1..T-12。`docs/test-manifest.json`、`contract-vocab.json` 属机械必需。**否决项 11 条零违例**；`CONTEXT.md` 完全未同步（工作约定要求）。

**Standards 轴小结**：7 硬违例 + 6 判断级；最重为"注册腿指向本树不存在的契约"（连带把轮的绿建立在 workspace merge 之上）。
**Spec 轴小结**：7 缺失 + 9 部分 + 4 跑偏；最重为"新鲜度棘轮（D-001.7）与锚非后补（D-001.8②）两项防逃生舱义务缺失"——恰是账本 D-001.NEG 点名"缺一即 anchoring 沦为 stale 块的追授执照"的那三件套中的两件。

（按 skill 规则不设跨轴总冠军：两轴刻意分开，合并排序会互相遮蔽。）

---

## 5. 本窗口自身的取证边界（class vs sample，诚实自报）

- 全部数值证据取自本机 settled 树（workspace tip `efa91eca`，`git status` 7 项范围外未提交）。**未**在干净 clone 上复现门检：因此 `[235 status-inventory] PASS` 依赖 `.gitignore` 内 `test-artifacts/` 这一事实，是从代码路径（`check-status-inventory.js:73`）+ `.gitignore:46` + 现存工件文件名（`status-inventory.gates.*.HEAD.dirty.2026-10-05T*.json`）三处静态证据得出，非"干净 clone 上跑出 exit 2"的实测。返工时须实测。
- jest 全量跑 1 次（163.99 s）+ 5 红套件复跑 1 次；coverage 腿红为 git-diff 确定性判定，非偶发。5 套件红的复跑结论见 `$TEMP/audit-t38-jest2.log`。
- "impl lane 单飞会红"是**对 3 条 `source_adr` 的枚举**（对该树 `docs/gates.json` 全 53 条穷举，得 3 条不可解析），非抽样。
- S8 的 "16 个 landed 文件在 tarball 内" 由 `tar -tzf` 全集与 6 commit landed 集求交得出，可复跑。
- 未做：外部一手规范复核（PCAOB AS 3110 主文、SLSA/K8s 先例）——ADR 侧的 analogy 标注与"二手标位"我只做了文本核对，未复核引用真值。

### 5.1 本窗口的一个裁量点（呈报，不默认成立）

本审计报告落地时，`D:\Aworker\jiahao\AGENTS.md` 与 `D:\Aworker\jiahao\docs\governance\claim-surface-roles.json` 的 `_doc` 给出一条机械义务（"a new artifact lands in the same commit as its row"）与一条权限边界（"the registering agent may REQUEST a row but never self-certify one"，examiner 类由 owner 批准）。仓内存在**两种先例**：

- grill-t37 audit lane 自行为其审计工件登记行，`declared_by` 写 "grill-t37 audit lane (row lands with artifact per fail-closed rule)"，role 取 `implementer`（`D:\Aworker\jiahao\docs\governance\claim-surface-roles.json` 现行）；
- grill-t35 / grill-t36 审计工件则把登记留作 owner act，正文标 `m-5 OPEN / owner act: the audit window does not self-register`。

本窗口采**前者**（role=`implementer`，不声称 examiner 权威），理由是后者会让本审计的两份新工件把 FAIL 从 3 条抬到 5 条、把审计窗口自己变成新的红源。此选择已在行内 `declared_by` 写明不自我认证 examiner。**若 owner 认定审计窗口不得自我登记，本 commit 的 registry 两行应整条撤除并转为 owner act 登记** —— 该项属 §"Human-only adjudication points"（grill-t29 F-7）里的登记/裁权类，agent 只呈报状态，不代裁。

### 5.2 本窗口不出具 `audit-coverage v1` 具名块（覆盖契约的如实标位）

`D:\Aworker\jiahao\AGENTS.md` Audit coverage contract（ADR-0091 / grill-t34 D-004）要求二方审计报告携带 `<!-- audit-coverage v1 -->` 块，块内容由 `node scripts/build-audit-checklist.js emit` 打印、**由审计人具名 attestation**。本窗口**不贴该块**，理由是本审计未跑 CI 范围内的命令（`npm install --ignore-scripts`、bench corpus restore、`npm run` 系列包装），贴上去就是把未做的覆盖写成做过 —— 正是本报告 §0 判 FAIL 的那类缺陷，本窗口不重演。

本窗口**实际核验过**的清单面（逐字复跑）：`node scripts/run-gates.js`（53 腿全电池，等价 `npm run gate:all`）、`node --check` × 11、`npm pack` 与 `npm pack --dry-run --json`、解包后 bin 启动、`build-rewrite-map.js --check` / `--published-only`、`build-adr-index.js --check`、`build-audit-checklist.js --check` + `emit`、`run-gates.js --check-alignment`、`check-gate-params.js`、`check-deferred.js`、`build-doc-hygiene-baseline.js --check`、`check-status-inventory.js`、`check-orphan-ancestry.js`、`check-claim-surface-roles.js`、`check-governance-inventory.js --coverage-base …`、`npx jest --ci` 全量 + 红套件复跑。

机械后果（如实披露，非本窗口修复范围）：`node scripts/check-audit-surface.js` 实测仍报 `latest in-scope audit report (.scratch/grill-t37/reports/2026-10-05-audit-loop2.md)` —— 因为该腿的候选集要求"注册过且携带 v1 块"，本报告无块故不入候选。**即覆盖契约的当前被_assert_主体落后两轮**；下一个窗口要么在 CI 面跑齐后具名贴块，要么由 owner 就"审计窗口能否出具部分覆盖声明"立法。



---

## 6. 打回返工：修复要求 + 重跑清单

修完必须由**同一套验收**重跑（本窗口 §1 的四项），并由审计窗口二次判定；不接受口头声明，不接受"应该已修"。

### P0（阻断，必须先修后谈）

1. **补本轮 trend 行**：`D:\Aworker\jiahao\docs\governance\trend-inventory.json` 增加 `grill-t38` 行，`governance_tooling_diff.files` 须声明 5 个实测 R2 文件（`scripts/evidence-freshness.js`、`scripts/shared/last-claim-mutation.js`、`test/audit-checklist.test.js`、`test/freshness-checker.test.js`、`test/last-claim-mutation.test.js`）。
2. **补 claim-surface 行**：`D:\Aworker\jiahao\docs\governance\claim-surface-roles.json` 为 `.scratch/grill-t38/reports/2026-10-06-report.md` 补行（与任何后续 artifact 同 commit）。
3. **修 §0/§4.6 验收数字**：以 settled 树实测重写（46 PASS / 4 UNVERIFIABLE / 3 FAIL；FAIL 集合 = pack-smoke / post-land-sentinel / claim-surface-roles；jest 5 suites / 6 tests）。删除或更正 `g6-publish` 的 FAIL 归属。**中间红须披露**（AGENTS.md t12 O-B），不得静默 amend。
4. **修 lane 拓扑**：`grill-t38-impl` 须落在含 ADR-0095/0096 的基上（`but move grill-t38-impl --above grill-t38-docs` 或等价重排），使 `source_adr` 在单条 lane 内可解析；或按 ADR-0095 D-B 让这三腿在其治理文本缺席的 commit 内 non-blocking。**二选一，须在报告里点名选了哪个。**
5. **落 D-001.7 棘轮**：把"最新报告锚树的 lastClaimMutation ≤ emitted_at"实现为独立机械断言（含红 reason 词表项），或在 ADR-0096 显式声明"以区间断言承接"并登记残量；不得只做存在性检查。
6. **落 D-001.8② 非后补**：`anchor` 纳入 `rows_digest` 覆盖 **或** 对 `anchor` 存在的块也走 `blockMs/anchorRegMs` 判定；配一条负例测试。
7. **修 ADR-0096:51 的虚报登记**：补 `audit-coverage`/`post-land-verify` 锚定收编的 deferred 行（含 D-006.7 的刷新迟到黄级 disposition），或改写 ADR 措辞为未登记；同时把 D-002.9① 的 worktree 降级精化句真正写进 ADR，删除/更正 `:106` 的 "verified at implementation time"。

### P1（承重弱化）

8. 版本 bump（`JOIN_KEY_VERSION` → `v1.1`，或对"只增不改+版本 bump"义务出显式豁免句）。
9. 消费腿补 `mode`/`ref_context` 对闭集校验；CI 路径 `runner_ctx` 的 dirty 位缺失要么实现要么在 ADR 登记为残量。
10. workspace-merge 排除改结构性判据（ref/拓扑），弃 subject 字符串匹配；顺手统一 `evidence-freshness.js:129` 与 `:537` 的分叉谓词。
11. 清 `pickDerivation`（删除或降为测试外手动强验证工具）并改掉 `test/status-inventory.test.js:686` 对退役语义的钉住；`test/status-inventory.test.js` 补 D-002.10 两条绿路径 + `main()` 级测试。
12. T-12 欠的两项实测：残留窗首样本（钉进 `defer-0088`）、F-9 可判性（`docs/adr/0095-…md:90` 收口，`TIER_TIMEOUT_S` 空实例要么填要么改措辞）。
13. `CONTEXT.md` 词表同步本轮新词（工作约定要求，与 ADR 同 commit 族）。
14. 报告 prose 括注 run_id 合规（`:14/:43/:77` 及返工后的新数值行）。
15. pack 净增量重钉：基线以实测命令+字段名报出（`npm pack --dry-run --json` 的 `size` / `entryCount`），并把"14 files"改为与实物一致的枚举。

### P2（洁癖）

16. `check-status-inventory.js:298-300` 陈旧注释、`:440/:450` 重复 `fmt`、`:467` UNVERIFIABLE reason 与因不符、`deriveAnchor` 迁 `scripts/shared/`。
17. 报告 `:39` 的 `$` 行标 display-form 或给逐字 argv。

### 重跑清单（返工后必须逐字贴出输出）

```
node --check <11 个改动脚本>                                  # 期望 11/11 OK
npm pack --dry-run --json                                      # 期望 size/entryCount 同报
npm pack && tar -tzf jiahao-0.0.1.tgz | wc -l                  # 真打包，非 dry-run
node package/scripts/install.js --help                         # 解包后进程测活
node scripts/run-gates.js                                      # 期望 FAIL 集合与报告一致
node scripts/check-governance-inventory.js --coverage-base 78d8a14cbc90bbbe1f48a2931c69e41716738f6e   # 期望零 FAIL
node scripts/build-rewrite-map.js --check
node scripts/build-rewrite-map.js --published-only
npx jest --ci                                                  # 期望 suites/tests 数字与报告一致
git ls-tree -r --name-only <impl-lane-tip> -- docs/adr | grep -E '009[56]'   # 期望两条都在
node scripts/check-orphan-ancestry.js                          # 锚集与报告引用一致，或报告标注为时点样本
# 干净 clone 复现（本窗口未做，返工须做）：
git clone <lane> <tmp> && cd <tmp> && node scripts/check-status-inventory.js   # 期望如实 exit 2 并在报告披露
```

---

## 7. 下一个 grill 方向指示（非本轮修复的一部分）

本轮暴露的缺陷形不是"锚定语义错"，而是**"锚定/棘轮这套时间断言只在有界窗口内被机械执行，窗外的义务被口头承接"**。建议烤题：

**Q-t39：处置-证据闭合（disposition-evidence closure）** —— 当一条 ADR/账本义务声明"已挂 deferred 行"或"由 X 断言承接"时，是否存在一个机械面能证明**被承接的义务本身**在承接物上成立？候选切面：(a) ADR 中的登记声称 → registry 行存在性的反向核验（本轮 ADR-0096:51 是首个病例，够立案）；(b) "有界断言承接无界义务"的形状识别（D-001.7 棘轮 vs `(anchor, carrier.parent]` 区间，与 ADR-0092 波界有界子集警告同形）；(c) lane 单飞契约可达性（`source_adr` 在每条 lane 自身树内可解析，作为 T-0 硬序的机械形，替代人读拓扑）。

烤透顺序建议：先 (a)——它有一个已发生的活病例，不必虚构反例；再 (b)——它是本轮最重失手的抽象；(c) 可能与既有 ADR-0095 D-B 合并，先查是否已立。
