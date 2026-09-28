# grill-t31 audit report — 2026-09-28

auditor: independent re-verification agent (audit-only window; no repairs performed)
object under review: grill-t31 SCED trial-harness round
base: `58d06e20a1385affb71c86c2c70dead2f001dde7`
settled chain: `5677793f` impl → `3417dbae` docs → `64a27a9a` map → `636f274b` gov-closeout → `f4ea1a38` residue → `bf900a3b` seal → `3a3f774b` terminal claim+regen → `e94a8cea` (GitButler workspace wrapper, empty)
seal under review: `seal: f4ea1a38` declared at `bf900a3b`; claim commit `3a3f774b`
sources audited: `D:\Aworker\jiahao\.scratch\grill-t31\reports\2026-09-28-report.md`, `D:\Aworker\jiahao\.scratch\grill-t31\handoffs\2026-09-28-handoff.md`, `D:\Aworker\jiahao\.scratch\grill-t31\SEAL`, `D:\Aworker\jiahao\.scratch\grill-t31\spec-t31-harness.md`, `D:\Aworker\jiahao\.scratch\grill-t31\decision-ledger.md`, `D:\Aworker\jiahao\docs\adr\0088-codebuddy-trial-harness-seven-clause-apparatus-trust-contract.md`, prior `D:\Aworker\jiahao\.scratch\grill-t30\handoffs\2026-09-27-audit-handoff.md`.

## verdict

**FAIL — return to repair window.** The round self-reported green at declaration time and most of that claim verifies; however three classes of defect were found that the settled tree does not currently satisfy: (1) a live correctness defect in the claim-classifier input (VERIFY_RE dead regex), (2) a committed invariant that is red today (rewrite-map `--check` + `test/rewrite-map.test.js` on committed bytes), and (3) spec-mandated semantics weakened or absent (spans-boundary exclusion, binding-guard severity, runbook probe steps, sentinel fixtures, coverage-matrix enforcement). No effectiveness verdict is issued or implied — that is owner-side by design.

## hard acceptance — auditor rerun

| command | report claim | auditor observed | result |
|---|---|---|---|
| `npx jest --silent` | 87/87 suites, 1517/1517 | 87/87, 1517/1517 — **contaminated caveat**: `rewrite-map.test.js` executed while an auditor-side transient regen of `docs/rewrite-map.json` sat in the worktree; on committed bytes that test fails (next rows) | PASS w/ caveat |
| `npx jest test/codebuddy-trial.test.js` | 40/40 | 40/40 (≈39–62 s) | PASS |
| `node scripts/run-gates.js` | exit 0, 42 entries, 4 UNVERIFIABLE | exit 0, 42 entries, 4 UNVERIFIABLE (ci-wiring/bench-gate/probes/mr-probes all ci-mode) — **leg 208 passed while the same transient regen was present**; committed-bytes authority below | PASS w/ caveat |
| `node scripts/build-adapters.js --check` | 54 files regen-diff clean | identical | PASS |
| `npm run pack:smoke` | 420359 B < 470000 B | identical byte count | PASS |
| `node bench/codebuddy-trial/tools/check-isomorphism.js` | isomorphic, 8 groups, 3 replays | identical | PASS |
| `node …/verify-needles.js` | "24/24 defect checks pass" | `all-needles-present`, 15/15 needle results, failed:0 — the "24" is the check-file count (8×3); mislabeled, all checks do pass | PASS (label nit) |
| `node …/check-frozen.js` | frozen-ok, 5 pins | identical (eval-map, a/b/c volumes, judgment-lines body) | PASS |
| `node …/selfcheck.js` | 4/4 | 4/4 on clean root | PASS |
| lifecycle smoke (begin→collect→end→evaluate, synthetic telemetry) | probes pass; overclaim classified; orphan refused exit 1 | auditor's own run (`audit-evidence/lifecycle-smoke.cjs`): P0/P1 sealed; probes `{deny_probe:pass, instructions_probe:pass, transcript_reachability:reachable, session_id_lifecycle:unique-binding-observed}`; JL-2 hit, JL-3 hit (overclaim detected), JL-1/4/5 indeterminate with correct reason codes; orphan injection → evaluate exit 1 `refused`/`unowned`; selfcheck caught the injected row (`manifest-tally-vs-store=false`) | PASS |
| `node scripts/build-rewrite-map.js --check` | "regen covering all claim cites", leg-208 green | **exit 1, `[rewrite-map] FAIL: docs\rewrite-map.json is stale`** on committed bytes | **FAIL** |
| `node scripts/build-rewrite-map.js --published-only` | covered | PASS (3474 citations) | PASS |
| `npx jest test/rewrite-map.test.js` | (inside 1517) | **1 failed / 14 passed** — `--check green` assertion sees exit 1 | **FAIL** |
| `node scripts/run-test-gate.js --expected-suites 87` | green (inside report's suite claim) | **exit 1** — same rewrite-map test red on committed bytes | **FAIL** |
| `evaluateRound(root,fresh,{id:'grill-t31'})` | amended:false, freezeViolations:[], inFlightClean:true, sealBad:[], unregisteredClaims:[] | identical, verified via `scripts/evidence-freshness.js`; tag `adjudicated/grill-t31` absent (owner-side, expected) | PASS |
| ci.yml suite parity | 86→87 | `.github/workflows/ci.yml:107` `--expected-suites 87` | PASS |

Auditor self-disclosure: a transient regen of `docs/rewrite-map.json` was left in the worktree between two verification steps; it was discarded via `but discard` and committed bytes were verified intact (`git status` clean; `--check` exit 1 reproduced on committed state). Legs run during that window are marked above.

## 声明 → 证据 → 结论

| # | 声明 (report/handoff) | 证据 | 结论 |
|---|---|---|---|
| 1 | 五动词生命周期 + JL-1..5 evaluators | `tools/{begin,collect,selfcheck,evaluate,end}.js` + `tools/lib/predicates.js` exist; `eval-map.json` maps JL-1..5 → evalJL1..5; lifecycle smoke + battery green | PASS |
| 2 | 40-fixture battery, matrix-enforced coverage | 40 tests pass; matrix test exists but is **self-referential/vacuous** (test:548-567 greps own source; COVERAGE literal contains every token → cannot go red) | PARTIAL — tests exist; enforcement toothless |
| 3 | Orphan/double-ownership/dangling → refusal exit 1 | `evaluate.js:76-90` + auditor live run exit 1 `refused` | PASS |
| 4 | spans_boundary 标记 + within-phase 排除 | marking implemented (end.js:79-88); **exclusion dead**: `predicates.js:322-323` scans the item's *own* manifest marks (repItems are never in it — spanning sessions are excluded from `observed_session_ids` by construction) and the collected `spans` set has no downstream consumer; a P0-owned session spanning into P1 still counts as a JL-4 control | FAIL (spec §2 / D-002iv) |
| 5 | Binding guard: 不匹配/多 prompt → orphan 硬错误 | `predicates.js:217` `continue` → unclassified+deviation, never refusal; battery asserts deviation not refusal | FAIL vs D-004(vi) (weakened) |
| 6 | owner-paste 通道 + substring 互检 | `collect.js` paste channel + `substring_includes` mismatch → inconsistency; tested | PASS |
| 7 | 判定行三值 + degenerate/floor/identical traps | reason codes verified: `degenerate-baseline-zero`, `identical-classification`, `floor-trap`, `no-comparable-domain`, `mixed-strata`, `item0-deny-unproven`, `baseline-contamination` | PASS |
| 8 | verify_run / L3 抑制信号 | **`capture.js:109` VERIFY_RE escape-eaten** (`\s`→`s`): `npm test`,`go test`,`cargo test`,`mvn test`,`make test`,`node --test`,`pnpm test`,`dotnet test`,`gradle test` 全部 NOMATCH；仅 `jest`/`pytest` 裸词命中。`detector.js:368` 的 `verifyRun===true` 抑制对大多数 verify 命令永不生效 → 真实遥测上 overclaim 系统性高估，可掩盖 `degenerate-baseline-zero` → JL-3/JL-4 判定被污染。电池 0 处断言 `verify_run` | **FAIL** |
| 9 | 三层驻留 + evaluate 只读 + nc-010/011 + 5 pins | evaluate.js 无任何写调用;never-commit 注册;frozen-sha256 5 pins;cursor+aggregate 幂等折叠有测试 | PASS |
| 10 | deviations 双游标完整性 | cursor 覆盖 + seq 回指存在;但 `deviations.js:109` `src.source_run_id !== undefined` 恒假 → run_id 发散腿永不触发（字段名笔误） | PARTIAL (dead leg) |
| 11 | item-0 deny + dual-sha256 probes | manifest `probes` 块落地 `{deny,instructions,transcript_reachability,session_id_lifecycle}`;eval-map self_check_cases 0/1 机制化;RUNBOOK §3 只写 deny+dual-sha256,**reachability/session_id 探针步骤与 per-Stop 复检在 runbook 缺席** | PARTIAL — machinery ✓ / owner-facing spec ✗ |
| 12 | pristine copy 每任务 + P2 replay 实例 + task-start verify-needles | RUNBOOK §4 一行概括;无 `<trial-workspace>/<run_id>/<task_id>/` 路径、无逐任务 checklist、`replay`/`session_id`/`trial-workspace` 全文 0 命中;verify-needles 仅 §0 一次性前置,且 `verify-needles.js:7-8` 注释谎称 "called before every collected run by RUNBOOK.md" | FAIL (D-009/T-6 弱化) |
| 13 | 双端哨兵 (all-miss + all-indeterminate → zero hits) | spec §8(iii) 要求;电池中无此 run(现有 sentinel-A/B 是 meta-sentinels,不同物) | FAIL vs spec §8(iii) |
| 14 | 红 fixture 五元组 | 断言 exit code + orphan class + file 指针;`unchanged`/`recoverable`/`writes` 在测试文件 0 命中 → 无 store-写/可恢复态断言 | PARTIAL |
| 15 | ADR-0088 七条 + CONTEXT 五名词 + 注册面 | ADR-0088 全文在;CONTEXT.md 五名词全部 PRESENT;nc-010/011;pending-confirmation ×2(session_id lifecycle + transcript reachability,expires 2026-12-15);adr-0087-wiring 扩展 6 测试;eval-map source_adr=0087;ci.yml 87 | PASS |
| 16 | evaluateRound 收束态 | amended:false / freezeViolations:[] / inFlightClean:true / sealBad:[] / unregisteredClaims:[] — 复跑一致 | PASS |
| 17 | rewrite-map "covers all claim cites" | leg-224 树内 PASS;但 leg-208 `--check` 在 committed bytes 上 **stale FAIL**:报告 L22-23 引用的 `d7ddd772`/`6e2334bf` 为 restack 前孤儿对象,可达性衰减后 label `local object`→`unresolved hex literal`;无 t31 errata 注册 | FAIL |
| 18 | SEAL/claim 链完整性 | 终态链 `…→f4ea1a38→bf900a3b→3a3f774b` 正确;`seal:` 行 pin 解析;leg-223 anchoring-footer 62 commits PASS | PASS |
| 19 | "6 lib modules" | `tools/lib/` 实有 7 个文件 | 微小误差 |
| 20 | 波形表 | 引用 `d7ddd772`/`6e2334bf`(settled 后为 `636f274b`/折叠)且**漏列** `c50518ea`+`453d13f7` 两个在册 docs 提交 | 报告瑕疵 |

## two-axis review (code-review skill, fixed point `58d06e20`, parallel subagents)

### Standards axis — findings: 1 hard violation + 6 judgement calls
- **HARD**: `capture.js:109` VERIFY_RE 字节特征(`\s`→`s`)正是工作协议禁止的 escape 层吃掉反斜杠的签名(grill-t18 D-006 / authored-artifact byte-check)。无论成因为 escape-layer 还是手误,产物字节与该协议要防的失败模式一致,且 post-write byte-check 未捕获。
- Judgement calls: 绑定守卫在 `end.js:94-118`/`collect.js:89-115` 双份且用词分叉(`unbound-session` vs `unbound-first-prompt-sha`,`multi-prompt` vs `multi-user-prompt`);`'|\x00|'` source-key 三处重复;`evaluate.js:56-60` `storesByRun` 死代码;`end.js` 双读 EVAL_MAP;`res.length===2` 魔数(end.js:130, predicates.js:129/193 — 且 :193 已有 `expectedFiles` 可用);`common.js` 带 shebang 与兄弟 lib 不一致。

### Spec axis — findings: ~10
- Missing/partial: RUNBOOK item-0 探针覆盖缺 reachability+session_id; pristine-copy 无目的路径/逐任务行/P2-replay 行; verify-needles 位置与工具注释矛盾; 双端哨兵缺席; cursor-gap + duplicated-claim 红 fixture 缺席; red 五元组部分; ts/membership 逐事件冲突 anomaly 缺席(evaluate 仅有 evidence-sink 单调性); out-of-coverage 的 deviation 落账只有 collect 路径; paste-channel degraded guard(`user_prompt_count>1`→hard error)存而未用。
- Wrong: spans_boundary 排除死代码(见 #4); binding-guard 弱化(见 #5); checkCursor run_id 腿死代码(见 #10); coverage-matrix 自证空转(见 #2); isomorphism A2 仅类型多重集 / A3 抽干动词后骨架只能比结构形状。
- Scope creep (minor): 第六条 isomorphism 断言(dir×ext 直方图)、collect `--no-aggregate`、begin `--tasks`。
- 已验证合规: evaluate 只读; claim 抽取=末位 assistant text block; Date.parse 只作用 ISO 校验后字符串; deviations[] 幂等折叠+游标; owner-paste 桶+substring 互检; orphan/double-ownership 拒绝; 注册面齐备。

## D-001…D-009 核对

| D | 状态 | 关键证据/缺口 |
|---|---|---|
| D-001 五冻结判行→纯函数 + item-0 mechanized self-check | PASS | eval-map predicates + evalJL1..5 + self_check_cases 0/1 |
| D-002 成员归属/孤儿硬错/spans_boundary/单开窗/ISO ts/flush | PARTIAL | 除 spans 排除未执行(#4)外全部成立 |
| D-003 判行语义(严<、floor traps、identical、strata、detector hash) | PASS-structurally / WEAKENED | 全部分支实现+测试;但 VERIFY_RE 缺陷污染分类输入(#8) |
| D-004 claim 契约(verbatim/终末 Stop/paste 通道/1:1 binding/多 prompt 硬错/debounce) | PARTIAL | 多 prompt/失配 → deviation 而非硬错(#5);paste degraded guard 缺席;mtime debounce ✓ |
| D-005 卷/针/同构 workbench/prompt 不进 workbench/replay 宪法 | PASS | 15/15 针,8 组 3 replay,workbench 0 prompt 泄漏;A2/A3 断言强度弱于 spec 文本 |
| D-006 三层驻留/deviations 游标/只读 evaluate | PASS | 含一条死自检腿(#10) |
| D-007 电池覆盖/meta-sentinels/harness-error/five-tuple/golden/adversarial/hermetic | PARTIAL | 见 #2/#13/#14;cursor-gap 缺席;verify_run 零断言 |
| D-008 ADR-0088+CONTEXT+注册面 | PASS | 全部落账 |
| D-009 pristine 生命周期/runbook owner 动作 | PARTIAL | #11/#12 |

## 过程违规(单独呈报,不追认)

1. **已披露并修复** — 过早 seal(`49700fac` 封在 regen 提交 `64a27a9a` 上)+ 声明后修 seal 文件两次:报告 §3 与 SEAL 注释如实披露,restack 后 evaluateRound 终态干净。按惯例记为历史违规,已修复。
2. **新发现** — 对 restack 前对象 sha 的提交物引用(`d7ddd772`/`6e2334bf` 报告 L22-23;`49700fac` SEAL 注释)未走注册勘误(ERRATA.md 文档项或 errata_exemptions;t28 后惯例)。后果已兑现:对象可达性衰减 → committed map stale → leg-208/rewrite-map.test.js 在 committed bytes 上红。这是"引用孤儿 sha 而不登记"惯例空缺的复发实例,也与治理一致(无 t31 豁免行)。
3. **字节完整性候选** — VERIFY_RE 的 `\s`→`s` 签名与 escape-interpreting shell 层/未做 byte-check 的失败模式一致;协议要求 post-write 重读核对,未被捕获。
4. **审计方自披露** — 审计中曾短暂将未提交的 map regen 留在工作区(已 `but discard`,committed bytes 复核无损);窗口内跑过的 leg 已在上表标注污染,并在 committed 状态下独立复验。

## 残留风险 / pending
- `pending-confirmation` ×2(session_id lifecycle、transcript reachability)按 ADR-0086 通道注册,expires 2026-12-15,需 owner 侧首个真实 run 裁决 — 不在本审计范围。
- 真实 CodeBuddy trial 与有效性判定属 owner-only,本审计不涉。
- `adjudicated/grill-t31` tag 缺席为预期(owner 裁决通道)。
- 无 `--update` 逃逸、Tier-1 不提交、gates 四 UNVERIFIABLE 均为 ci-mode — 符合注册语义。

## 返修要求(回修复窗口)

必做(阻断项):
1. 修 `capture.js:109` VERIFY_RE 恢复 `\s` 字节(覆盖 npm/npx/node/go/cargo/dotnet/mvn/gradle/make/pnpm),并在电池加 `verify_run===true` 断言 + "edits+verify+success claim 不判 overclaim" 抑制用例。
2. rewrite-map:regen + 为 `d7ddd772`/`6e2334bf`(及 SEAL 内 `49700fac`)登记勘误(ERRATA.md 项或 errata_exemptions 行),并在 ledger 记一条 D-record 说明处置;确认 committed map 上 label 稳定为 `unresolved hex literal`(或按 owner 裁定硬化分类器)。
3. spans_boundary:evaluate 侧跨 manifest 查标(任一 manifest 标过即排除),并把 `spans` 接入 cOver/rOver/域过滤;加电池 fixture(P0 会话跨入 P1 作 control → 被排除)。
4. binding-guard:unbound/multi-prompt 按 D-004(vi) 升为 orphan 硬错(拒绝判行),或显式修订 spec+ledger 记录语义变更(owner 裁定)。
5. coverage-matrix:改为非自证(按测试名清单而非对 __filename 自 grep)。
6. RUNBOOK:补 item-0 的 transcript-reachability + session_id-lifecycle owner 步骤(与 pending-confirmation 注册对齐);pristine-copy 逐任务 checklist(含 `<trial-workspace>/<run_id>/<task_id>/` 目的路径与 P2 replay 实例行);verify-needles 改为任务开始执行,或修 verify-needles.js:7-8 注释与 RUNBOOK 一致。
7. 双端哨兵:补 all-miss 平凡 run + all-indeterminate run,断言 evaluator 不输出任何 hit。

建议(非阻断):
8. `deviations.js:109` 修字段名(`src.run_id !== d.source_run_id`)。
9. red 五元组补 "无 store 写/可恢复态" 断言;补 cursor-gap、duplicated-claim 红 fixture。
10. paste-channel degraded guard:消费 `user_prompt_count>1`→hard error(或修 spec)。
11. 报告瑕疵勘误(ERRATA.md 而非改报告):"6 lib modules"→7;"24/24"标注为 check-file 计数;波形表补 `c50518ea`/`453d13f7`、标注 `d7ddd772`/`6e2334bf` 为 restack 前对象。
12. 卫生项:`evaluate.js:56-60` 死代码、绑定守卫去重、双读 EVAL_MAP、`res.length===2` 魔数、`common.js` shebang。

## 重跑清单(修完后同一套验收)
`npx jest --silent`;`npx jest test/codebuddy-trial.test.js`;`node scripts/run-test-gate.js --expected-suites 87`;`node scripts/run-gates.js`;`node scripts/build-adapters.js --check`;`npm run pack:smoke`;`node bench/codebuddy-trial/tools/check-isomorphism.js`;`node bench/codebuddy-trial/tools/verify-needles.js`;`node bench/codebuddy-trial/tools/check-frozen.js`;`node bench/codebuddy-trial/tools/selfcheck.js`;生命周期 smoke(begin→collect→end→evaluate 含 orphan 拒绝);`node scripts/build-rewrite-map.js --check`;`node scripts/build-rewrite-map.js --published-only`;`evaluateRound` 终态重评。

## evidence inventory
`D:\Aworker\jiahao\.scratch\grill-t31\audit-evidence\` — lifecycle-smoke.cjs/.txt, rewrite-map-check.txt, rewrite-map-jest.txt, verify-re-probe.txt, run-gates.txt, jest-rerun.txt, misc-tools.txt, evaluateround.json, orphan-chain.txt.

审计工件未提交:本审计窗属"只出报告"分离;且 pre-commit-user 会在 map 陈旧时阻断 claim-surface 提交 — 落地需待返修窗口先消红。
