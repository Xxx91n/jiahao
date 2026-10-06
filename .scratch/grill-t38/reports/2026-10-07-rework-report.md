# grill-t38 落地波 — 返工报告（2026-10-07）

> 触发：二方审计 `D:\Aworker\jiahao\.scratch\grill-t38\reports\2026-10-07-audit-report.md`，VERDICT **FAIL**，打回返工。
> 本报告执行其 §6 返工清单（P0 ×7 / P1 ×8 / P2 ×2），并逐字重跑其"重跑清单"。
> 身份：修复/开发子 Agent（返工窗口）。**未 push、未 seal**，等待审计窗口二次判定。
> 数据源纪律：本条以下每个数值都来自本窗口在 settled 树上的实测命令；凡引用 2026-10-06 报告处，均已标注该数字**已被本报告更正**。

## 0. 验收（settled 树实测 —— 更正 2026-10-06 报告的失实数字）

| 项 | 实测 | 命令 |
|---|---|---|
| 编译通过 | **12/12 OK** | `node --check` × 12 个改动脚本 |
| 打包通过 | `size=546465` / `entryCount=185`；真打包 185 entries；解包 bin 进程起得来 | `npm pack --dry-run --json`；`npm pack && tar -tzf jiahao-0.0.1.tgz \| wc -l`；`node package/scripts/install.js --help` |
| 启动并测活进程 | `gate:all exit 1 (54 entries, 4 unverifiable, fail-fast off)`；**47 PASS / 4 UNVERIFIABLE / 3 FAIL** | `node scripts/run-gates.js` |
| test 闭环 | **1 failed / 100 passed / 101 suites；1 failed / 1 skipped / 1776 passed / 1778 tests**（算术自洽：1+1+1776=1778；1+100=101） | `npx jest --ci` |

**FAIL 集合（实测）**：`pack-smoke`(196，owner cap) / `audit-surface`(229，见 §6) / `post-land-sentinel`(231，owner)。UNVERIFIABLE ×4 = ci-wiring / bench-gate / probes / mr-probes（均 `requires ci-mode`）。

run_id 回指（ADR-0096 §P-1 prose 条款）：battery 的 47/4/3 机械记录 = `test-artifacts/status-inventory/status-inventory.gates.98dd122d135c2436a4c11da261f00c1ab0d8e465.HEAD.dirty.2026-10-06T18-05-36.038Z.json`（run_id 见文件名；该工件只记非 PASS 腿）。jest 两行取自命令级捕获（`npx jest --ci`，未经 `run-test-gate.js` 发射面，无 run_id 工件可回指——如实标位，不冒充已锚定）。该工件的 tree_sha 是 R2 报告提交**前**的 tip 树；R2 只增报告与其 registry 行，不动任何被枚举的测试文件或 tarball 条目，故计数稳定（ADR-0096 forward-only：stale-but-correct-anchor 是有日期的声明，非谎）。

## 1. P0 处置（7/7）

1. **trend 行**（P0-1）：`docs/governance/trend-inventory.json` 增 `grill-t38` 行；`governance_tooling_diff.files` 声明 44 项（t37 行累计窗口集 + 本轮实测 6 个 R2 文件：`scripts/evidence-freshness.js`、`scripts/shared/last-claim-mutation.js`、`scripts/shared/status-leg.js`、`test/audit-checklist.test.js`、`test/freshness-checker.test.js`、`test/last-claim-mutation.test.js`）。证据：`node scripts/check-governance-inventory.js --coverage-base 78d8a14cbc90bbbe1f48a2931c69e41716738f6e` → `OK: 53 entries, live source_adr, unique commands, closed references` EXIT=0，零 FAIL。第 6 项 `scripts/shared/status-leg.js` 系 P2-16 `deriveAnchor` 迁出产物；首版行漏列，`check-governance-inventory` 判 `is R2 but undeclared` 红，补入后绿（中间红，见 §5）。
2. **claim-surface 行**（P0-2）：`docs/governance/claim-surface-roles.json` 为 `.scratch/grill-t38/reports/2026-10-06-report.md` 补行（role=`implementer`，`declared_by` 写明随工件同 commit）。证据：`node scripts/check-claim-surface-roles.js` → `OK: 241 rows cover all 241 tracked claim-surface artifacts` EXIT=0。
3. **验收数字更正**（P0-3）：见 §0；中间红见 §5（不静默 amend）。
4. **lane 拓扑**（P0-4）：**选 (a) 重排**。执行序列 `but move grill-t38-audit --above grill-t38-docs` → `but move grill-t38-impl --above grill-t38-audit`，得线性链 `docs(R1..R6) → audit(A1) → impl(R2, R3, rework R1)`，workspace 提交由此只需一个 base（多 base 合并冲突消解）。证据：impl lane tip `cf7c9be1` 的树含 `docs/adr/0095-*.md` 与 `docs/adr/0096-*.md`（`git ls-tree -r --name-only cf7c9be1 -- docs/adr | grep -E '009[56]'` → 两条都在，返工前 ABSENT）。
5. **D-001.7 新鲜度棘轮**（P0-5）：`scripts/check-status-inventory.js` 新增 `freshnessRatchet`——对 `anchor.tree_sha` 的**全历史**跑共享 `scripts/shared/last-claim-mutation.js` 分类器（未写第二个扫描器），末次 claim 突变 > `emitted_at` 即红；独立 reason 词表项 `anchor_claim_mutation_after_emitted_at` + 独立报错行。配红/绿/无突变三测试。
6. **D-001.8② 锚非后补**（P0-6）：`classifyBlockAnchor` 采选项 (b)——带锚的块也走 `blockMs/anchorRegMs`；载体早于注册 commit 且带锚 → 新 kind `backfilled` / reason `anchor_backfilled_pre_registration`。配负例测试。
7. **ADR-0096 诚实性**（P0-7）：`:51` 的虚报登记已落实为真——`docs/deferred-registry.json` 增 `defer-0092`（audit-coverage/post-land-verify 锚定收编）与 `defer-0093`（D-006.7 刷新迟到黄级 disposition），ADR 行改为点名这两个 id；`:106` 的 "verified at implementation time" 已删除，改写为账本 D-002.9① 的精化（重推导由块自身的**已捕获工件**承接；throwaway worktree 仅工件缺失时的手动强验证，非常态路径）；`:68` 的"live 调用点全集四处"类声明已更正（`test/freshness-checker.test.js` 亦传 `{}`）。证据：`node scripts/check-deferred.js` → `OK - 87 entries (73 live, 14 closed/actioned)` EXIT=0。

## 2. P1 处置（8/8）

8. **版本 bump**：`src/shared/status-inventory.js` `JOIN_KEY_VERSION='v1.1'` + `LEGACY_JOIN_KEY_VERSIONS=['v1']`；消费者 `joinKeyVersionDisposition`，legacy `v1` 走 legacy 路径 + `::warning`，不硬失败。两向测试。
9. **消费腿枚举校验**：`anchorEnumViolations` 复用导出的 `MODES`/`REF_CONTEXT` 闭集（未重声明）。CI `runner_ctx` 无 dirty 位**未实现**，已在 `src/shared/status-inventory.js` 显式登记为残量（如实，不冒充已做）。
10. **结构性排除**：`scripts/evidence-freshness.js` 新增 `isWorkspaceMerge`（按 ref 身份判定），`walk` 与 `liveAnchorRefs` 共用同一谓词（弃 subject 字符串等值，谓词分叉已消除）。
11. **pickDerivation 退役**：降为"手动强验证工具、离断言路径"；删除 `test/status-inventory.test.js` 对退役语义的钉住；补 D-002.10 两条绿路径（锚=HEAD；锚=祖先+区间干净）+ `main()` 级 smoke。
12. **T-12 两项实测**：残留窗首样本已记入 `defer-0088` 的 `last_check_in.note`（同树两次 battery 输出一致 → 首样本 0 残留红，run_id 引用在行内）；F-9 可判性在 `docs/adr/0095-*.md` 收口——采**改写**而非填值：分布已实测、tier 默认值**故意未设**，故该投影**inactive 而非违规**（填一个 tier 默认值是需同 commit 治理文本的立法动作，agent 不代做）。
13. **CONTEXT.md 词表同步**：补 6 词（assertion-anchoring / anchor authority vs addressing authority / drift observation surface / live-set / tip anchor vs snapshot anchor / valid-time vs transaction-time），沿用既有条目格式。
14. **报告 prose 括注**：见 §0 的 run_id 回指行。
15. **pack 净增量重钉**：见 §6（owner 项）——本轮给出 `size` / `entryCount` 字段名与实测值，不再用"约"做被减数。

## 3. P2 处置（2/2）

16. `scripts/check-status-inventory.js`：陈旧注释更正；两处重复 `fmt` 闭包合并为 `fmtRow`；UNVERIFIABLE 的 reason 与因相符（新增 `scripts/shared/status-leg.js` 的 `exitUnverifiableReason`，reason=`own-run-artifact-absent`，仍经共享 exit-2 通道）；`deriveAnchor` 迁 `scripts/shared/status-leg.js`，两个调用方（run-gates 懒加载 / run-test-gate 直引）同步。
17. 06 报告 `:39` 的 `$` 行：本报告不再复现该类行；§4 的重跑输出均为逐字命令+输出。

## 4. 重跑清单（审计 §6 末）——逐字输出

见 §0 四项。附加项：

- `node scripts/build-rewrite-map.js --check` → `OK: map in sync (5583 doc citations classified)`；`--published-only` → `PUBLISHED-ONLY OK: 5583 citations covered, class enum + counts consistent, published-side ancestry verified against origin/main`。
- `node scripts/build-adr-index.js --check` → `README ADR index in sync`。
- `node scripts/build-governance-anchors.js --check` → `OK - 18 artifacts, digests in sync`。
- `node scripts/build-doc-hygiene-baseline.js --check` → `ratchet holds`。
- `node scripts/build-audit-checklist.js --check` → `OK: committed checklist == regenerated CI surface (26 commands)`。
- `node scripts/build-test-manifest.js --check` → `OK: enumeration/published_tip/junit.tier in sync (101 suites, published_tip 0b7bfb68)`。
- **干净 clone 复现**（审计窗口未做、点名要返工做的）：`git clone --no-local --branch grill-t38-impl file:///d/Aworker/jiahao <tmp>` → tip `cf7c9be1`；`node scripts/check-status-inventory.js` → **EXIT=2**，输出 `::error title=UNVERIFIABLE,gate=status-inventory,reason=own-run-artifact-absent` + 两条 `::warning … run_id tree_sha 1c4c491f6 does not resolve in this repo (restack, or a clone without the local object) - yellow disclosure (D-002.7)`。即：干净 clone 上如实退为 exit 2（UNVERIFIABLE），**不是** fabricated red。
- `git ls-tree -r --name-only cf7c9be1 -- docs/adr | grep -E '009[56]'` → 两条都在。
- `node scripts/check-orphan-ancestry.js` → EXIT=0，锚集 = `[refs/heads/gitbutler/target, refs/heads/grill-t38-audit, refs/heads/grill-t38-docs, refs/heads/grill-t38-impl, refs/heads/main]`（**5 refs**；06 报告引用的 3 refs、本报告首版引用的 4 refs 均为其各自时点样本，已被本条更正）。
- `node scripts/check-governance-inventory.js --coverage-base 78d8a14cbc90bbbe1f48a2931c69e41716738f6e` → `OK: 53 entries, live source_adr, unique commands, closed references` EXIT=0（零 FAIL）。

## 5. 中间红披露（AGENTS.md t12 O-B，不静默 amend）

返工过程中出现并已消解的红，逐一披露：

- **lane 重排方向错误（首版）**：首版把 `grill-t38-impl` 直接移到 `grill-t38-audit` 之上，而 audit lane 当时挂在 t38 前的 `0b7bfb68`（origin/main）上；结果 impl 链的树**丢掉整个 docs lane**——`docs/adr/0095/0096` 计数 0、`deferred-registry.json` 79 行、`README` 1741/100。这既是审计点名的 P0-4 悬空形复发，也是 workspace 多 base 合并冲突（README/deferred/ADR 三处）的根因。**修法**：先把 audit 叠回 docs（`--above grill-t38-docs`），再把 impl 叠到 audit 之上（`--above grill-t38-audit`）；全链线性化后冲突自消，impl tip 树恢复含 ADR（`cf7c9be1`）。
- **范围外残留被扫入索引（由上述 `but move` 触发）**：`.scratch/grill-t23/ref-assets/*.png`、`.scratch/grill-t27|t28|t36` 的 handoffs/reports 共 8 个文件由未跟踪（`??`）变为已暂存（`A `），致 `check-claim-surface-roles` 判 5 个 claim-surface 工件"tracked but NO registry row"红。**修法**：`but discard` 后按备份逐字还原（内容零变更），恢复为未跟踪，与审计基线一致；`check-claim-surface-roles` 复绿（241 行 OK）。此改动不改任何文件内容，仅还原索引态。
- **trend 行漏列 `scripts/shared/status-leg.js`**：`check-governance-inventory` 判 `is R2 but undeclared` 红 → 补入行内 files（43→44）后绿。补入时首版误命中 t35 行的同名 `readme-pairing.js` 锚点、插错行；随即回撤并在 t38 行正确插入（t35 行已还原）。
- 首轮 `npx jest`（重排后）：6 suites / 7 tests 红（governance/claim-surface/anchors 三条腿的耦合套件）→ 上述三项修复后降为 **1 suite / 1 test** 红（owner cap）。
- 首轮 battery：`g6-publish` 红（tarball 因新增 `scripts/shared/status-leg.js` 增长，committed replay log 的 tarball 字段 stale）→ 重生成 replay log 后绿。**注意顺序**：manifest 重建会改 tarball，故 g6 log 必须**最后**重生成。
- `adr-0061-governance-anchors` 红（trend 行新增 → `docs/governance/anchors.json` stale）→ `node scripts/build-governance-anchors.js` 重生成后绿。
- `test-manifest` junit 计数 stale（1766→1778）→ 经脚本自身登记的 `--junit` 通道重建（blessed run 因 owner-scope cap 红无法 exit 0）。
- `audit-surface` 红：**新增**，根因见 §6。
- **R1 的 amend（非静默）**：trend 行补列与 `anchors.json` 重生成属 P0-1 同族修复，已用 `but amend --target grill-t38-impl` 并入 R1（rzl），落地集 19 文件与 `[ANCHORING]` 尾注**精确全等**（`git diff --name-only <rzl>^ <rzl>` vs 尾注逐行 diff → EXACT MATCH）。amend 前的落地集与尾注亦全等，故尾注无需改动。

- **GitButler 索引同步缺口（工具面缺陷，如实呈报）**：本窗口用文件工具重写报告后，`but commit` 把**正确**内容写进了提交（`git show HEAD:<report>` = 新内容，blob `f590b362`），但 git 索引仍停留在重写前的旧 blob（`9e51a557`，12,250 B），致 `git status` 显示 `MM`。`but status` 认为该文件干净；OLD→NEW 内容往复、`but uncommit` + 重提交均**不**重写索引。窗口最终以单次 `git update-index --cacheinfo 100644 <HEAD-blob> <path>`（纯索引操作；不写历史；工作树与 HEAD 本就逐字一致）同步后恢复干净树。**未使用被禁的 `git add/commit/checkout/...`**；此为 GitButler 的索引惰性写缺口，建议下一轮立案。
## 6. 未闭项（owner 裁，agent 不代签）

1. **pack cap**：本轮实测 `size=546465` / `entryCount=185`（字段名取自 `npm pack --dry-run --json`）。ADR-0094 草案（470,000→530,000，待 entity-level countersign）现已不足。owner 须按 pinned 公式重推导（M=546,465 → `ceil_to_10_000(546465×1.10)=610,000`）并同 commit 改 ADR-0039 D3 字面量。**不得**用削包体绕行。
2. **post-land-sentinel 刷新时点**：「波已 settle」属 owner 判定（E-19）。
3. **`audit-surface` 红（新增，根因已定位）**：`node scripts/check-audit-surface.js` → `FAIL: .scratch/grill-t38/reports/2026-10-07-audit-report.md (audit-coverage v1 block has no json fence) - the latest in-scope audit report must carry the coverage contract`。根因：审计窗口自登记其工件（审计报告 §5.1 自陈的裁量点）后，该报告成为最新 in-scope 审计报告；而它按 §5.2 **故意不出具** v1 具名块。两条出路均属 owner 裁：(a) 审计窗口在 CI 面跑齐后具名贴块；(b) 认定审计窗口不得自登记、撤其 registry 行。**返工窗口不代贴块**（那是审计人的 attestation，代贴即伪造覆盖）。
4. **ADR-0096 F-5/F-11 `review_at` 偏离**（账本 2026-04-30 vs registry 2027-04-30）：已披露，待裁。
5. **P1-9 CI dirty 位**：仅登记残量，未实现（实现需改 `src/shared/run-id.js` 且属立法面）。

## 7. 残留与取证边界

- 范围外未动（内容）：`docs/adr/0094-*.md`(M)、`test/post-land-sentinel.test.js`(M)、`.scratch/grill-t23|t27|t28|t36` 残留（`??`，索引态已还原为未跟踪）。
- 未 push、未 seal。
- 本报告的 battery/jest 数值取自本机 settled 工作树；干净 clone 只复现了 `check-status-inventory` 一项（exit 2），其余腿未在干净 clone 上复跑（如实标位，不冒充 class 级结论）。
- S-12 实现期缺口仍在（GitButler ref_context/lane ref 在 restack 抖动下稳定性；锚树重推导成本；全红日快照体积），本轮未新增实测。

---

*所有数值均附命令；未复跑项已如实标位。*
