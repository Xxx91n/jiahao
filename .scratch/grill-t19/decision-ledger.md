# grill-t19 decision ledger

Authority for this round. Append-only; every owner-confirmed substantive conclusion lands here on the spot.

## D-001 — 轮拓扑：双议程成轮方式

- Original question: 双轨如何成轮 — a. 一 grill 账本两执行轮（t19=fix 处置轮 A-1..A-8；t20=README 文档轮，其 kind 本 grill 内裁决）/ b. 单轮双轨混合（trend 行 kind 无类可归）/ c. README 骑进 fix 轮
- User answer (verbatim): OK (atomcode-refined a-prime)
- Normalized requirement: one grill ledger carries both tracks' decisions; execution splits into two rounds — t19 = fix disposition round (A-1..A-8 + R-1..R-7 rework + audit battery verbatim re-run + clean-tree assertion, kind:fix), t20 = README documentation round (front-face redesign, bilingual CN+EN, user-facing; its trend-row kind is adjudicated inside this grill and recorded in this ledger). t20 opens on t19's post-disposition baseline.
- Constraints / negatives: no kind overloading (ADR-0078 D-A closed enum documentation|fix — a mixed round is unclassifiable); README work never rides a fix row (R3 edits in a kind:fix row = mislabeled row, gtd channel semantics violated); remediation precedes enhancement (CAPA ordering — disposition first, front-face second); t20 kind adjudicated in THIS grill, not deferred to execution.
- Status: current

## D-002 — 闭轮工件修复惯例 + A-1/A-2/A-5 应用

- Original question: 闭轮工件修复惯例+A-1 处置 — a. 披露式就地修复+恢复 defer-0060 具名行（同惯例覆 A-2/A-5）/ b. 只补注不动文（t19 登记出列理由）/ c. append-only 铁律
- User answer (verbatim): OK (atomcode-refined a-prime)
- Normalized requirement: register the Disclosed Repair convention — closed-round committed artifacts (ledger, reports) are repaired by in-place disclosed edits: every repair line leads with a retroactive-repair declaration carrying the reason+when+who triple; each repair is registered item-by-item in the t19 ledger and report; cascade regeneration rides plain commits (Amend-Riding not triggered). Applications: A-1 restores the defer-0060 named line in t18 ledger T-3 sweep + report sweep (first line declares the omission + spec pre-scoping reason); A-2 adds the export-misreport by-design note to the t18 report (incl. the SCHEMA_KEYS surface); A-5 rewrites the green-throughout sentence into the true statement + adds wrx/wsl to the commit-chain paragraph.
- Constraints / negatives: numeric canon (round-facts.json) and evidence artifacts are OUTSIDE this convention — a different boundary governs them (counts may not be quietly corrected); repair never means deletion or silent rewrite (21 CFR 11.10(e): changes shall not obscure previously recorded information); the convention governs HOW repairs land, not WHAT merits repair — item contents follow R-1/R-2/R-3 as audited.
- Status: current

## D-003 — A-4 streak 语义：kind:fix 行 skip-not-reset

- Original question: streak 语义裁决 — a. 双 streak 对 kind:fix 行 skip-not-reset（ADR-0078 增补句+checker 改+wiring 双钉）/ b. 保留现状登记 / c. fix 行一律重置 / d. 第三条 fix-streak 计数器
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: both advisory streaks treat kind:fix rows as transparent — the ADR streak (ADR-0064 D-F) measures the documentation-round sequence only (fix rows never feed it, even when net_additions>0; the field stays on the row as fact), and carveStreak (ADR-0076 D-B) is never reset by a fix row (doc-fix-doc carve-out adjacency still counts consecutive). ADR-0078 D-A gains a streak-semantics sentence (fix rows are outside both streak populations); check-governance-inventory.js:193-194 gains the kind guard; wiring gains a positive pin (doc+carve, fix, doc+carve still fires burn-rate) and a negative pin (fix net_additions>0 does not feed the doc streak).
- Constraints / negatives: zero current-reading drift is registered as a fact, not claimed silently; no third fix-streak counter (streak attaches to a qualifying population; gtd disclosure already observes fix rounds); no reset-on-fix (a fix round must never be able to legally wash a streak — symmetric dodge); D-A's own three sentences are the authority this makes the code honor.
- Status: current

## D-004 — A-6/A-8：build-round-facts.js 的 D-A/D-A.1 应用

- Original question: build-round-facts.js D-A/D-A.1 应用 — a. try/catch→exit2 + :201 边界路由 + D-A.1 澄清句 + A-6 束首销配额 / b. crash 包装+登记 entry-guard 新类 / c. 两件登记现状
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: main() body gains a try/catch mapping any crash to 'verifier broken' + exit 2 (Nagios catch-all→UNKNOWN form; covers JSON.parse corrupt artifact, spliceRegion throw, execFileSync, requireCapabilities); the :201 missing-factsFile condition routes through the drift/unsatisfied channel — report phase skipped, single boundary exit 1 at :216 (behavior-equivalent); ADR-0077 D-A.1 appendix gains one clarifying sentence (missing input artifact = unsatisfied recorded at the phase boundary, never an early exit; the three-value contract does not grow a class). The A-6 fix lands as the FIRST R2 commit of the fix bundle = the anti-rot quota smell ticket discharged (registered line).
- Constraints / negatives: no entry-guard fourth state (closed three-value contract; a fourth class would force every consumer to handle a new state — ADR-0078 anti-third-field precedent); exit codes unchanged for all existing paths; emitExit/process.exit verdict paths stay outside catch semantics (a verdict exit is not a crash); quota discharge = the A-6 commit ordering + a ledger registration line, not merely a claim.
- Status: current

## D-005 — A-7 checker 空洞：gtd 存在⇒files 非空

- Original question: checker 空洞 — a. 共享 shape 检查统一非空（任一轮类+负例×2）/ b. 只对 kind:fix 加非空 / c. 只文档登记 / d. 改 kind:fix 定义允许空 files
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: the shared governance_tooling_diff shape check becomes presence-implies-non-empty — whenever a trend row carries gtd, files MUST be a non-empty string[] (any round kind), mirroring the mechanism_output_diff bare-marker hard-fail (:176) and the carve_out_used=1 gate (:166); kind:fix additionally still requires gtd presence (:127 unchanged). Wiring gains two negatives: kind:fix + {files:[]} fails; documentation + {files:[]} fails. Convention wording registers the escape channel: 'no carve-out used' is expressed by carve_out_used:0 with the field omitted, never by an empty files list (an empty list declares a disclosure obligation then refuses it).
- Constraints / negatives: historical rows unaffected (t17 row gtd 3 files, t18 row gtd 3 files — negatives gate the future only); no kind:fix definition change (zero-files fix rows use kind:documentation or no row — the kind exists to disclose R2 hand-edits); checker remains recomputed-not-trusted (a vacuous pass channel would be self-defeating, ADR-0076 D-B).
- Status: current

## D-006 — A-3：证据文件重捕获 + .txt 窄签名扩钉 + 调用层惯例句

- Original question: A-3 处置 — a. 重捕获+窄签名扩钉+惯例句 / b. 重捕获+defer-register / c. 留腐蚀+扩钉 / d. 改字节(已排除)
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: (i) re-run the missing-file check with a clean argument via execFileSync arg-array (no string layer), write the fresh verbatim output to the same evidence file via fs (re-capture, not byte-edit), and register a retroactive-repair line in the t19 ledger+report declaring the first capture void (invocation-layer corruption); the corrupted bytes are absorbed as the negative fixture for the new signature leg; (ii) the doc-hygiene pin extends to committed .scratch/**/*.txt carrying ONLY the evidence-shaped signature (path broken across LF — trailing-backslash/cross-line path class), the md control-byte set does NOT transfer (0x1B ANSI is legitimate in verbatim output — per-type signature granularity); (iii) convention clause registered: battery commands carrying backslash-bearing args run through non-interpolating channels (arg arrays/script files), never through escape-interpreting string layers — the D-006 authoring-path convention extended to the execution channel (second live demonstration of the same root cause).
- Constraints / negatives: no byte-editing of verbatim evidence (chain-of-custody — corrections are new disclosed captures, never patched bytes); the .txt signature set registers only A-3-demonstrated signatures (extensible per the pin's own clause — future variants register on demonstration, not speculation); re-capture must be reviewable like a code change (jest golden-file discipline — the repair diff IS the review surface).
- Status: current

## D-007 — 双语形态：EN-primary 双文件 + zh-CN 镜像

- Original question: 双语形态与 cap 路径 — a. 双文件 EN-primary+中文镜像 / b. 双文件 CN-primary+EN 镜像 / c. 单文件全双语(修 cap) / d. 单文件双语-lite
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: README.md stays the English-primary face — clean restructure with every pinned block byte-untouched and the derived ADR-index region folded into a <details> element; README.zh-CN.md is added as the full Chinese mirror (git-tree only, never in the tarball, pin-free — pinned blocks are translated but each carries an 'English original prevails' pointer back to the pinned text); both files open with a language-switch line in autonym form (English | 中文, current language bold and unlinked — GitHub never auto-selects); the zh-CN file header carries an HTML comment recording its translation-baseline commit hash, wired into the existing SHA-reference governance habits. Mirror structure stays aligned with the primary (readme-crafter bilingual convention).
- Constraints / negatives: README.md never leaves the tarball surface and its cap headroom is protected (zh-CN adds zero bytes to the pack — it is not in pkg.files and npm force-includes only README.md); no cap amendment (ADR-0039 D3 is pre-registered, policy-before-value); no single-file bilingual mixing (no mature precedent and summary-vs-body drift has no fallback); pinned blocks stay verbatim in README.md only — the mirror never pretends to be the pinned text (arbitration always returns to English).
- Status: current

## D-008 — 英主 README 全量重构 IA

- Original question: 英主重构 IA — a. 全量重构按呈报骨架 / b. 只刷新保结构 / c. 钉块迁 docs(违 wiring 已排除)
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: full IA redesign of README.md per the presented skeleton — language-switch line, title + one-line value, static non-numeric badges only, honesty banner (the pinned failed-verdict block verbatim, presented as the project's identity statement, before '## What it does' as the first-screen pin requires), What it does, Readiness status (ADR-0072) heading preserved at ## level, Install (pinned commands + naming declaration + verified-at note; 'Verifier deployment discipline' section name untouched for the install.js pointer; threat model subsection), Verification Ladder, Hosts & protection tiers condensed to table, Usage, Distribution boundary, a new '## Measurement record' parent section demoting the confirmatory/v1/v2/v3/lane/reproduce pinned content one level down (all verbatim, zero byte changes), Develop + Architecture short (ADR index region folded into <details>), License last.
- Constraints / negatives: every pinned block stays byte-identical (wiring verdict is the arbiter on ordering); blank line after every <summary>; no GitHub Alerts inside folded regions; no numeric/dynamic badges (test-count badge would be a second drifting declaration surface); '## What it does' and '## Readiness status (ADR-0072)' headings stay at ## level; optional Mermaid profile-flow diagram in Architecture is discretionary at implementation, not a pin.
- Status: current

## D-009 — 视觉资产范围：纯文本面

- Original question: 视觉资产范围 — a. 极简纯 SVG hero(双 profile 流向)+徽章 / b. 纯文本面零图像 / c. 全套视觉系统 / d. GIF/ImageGen
- User answer (verbatim): 采纳 (atomcode-refined b-prime — research overturned my a-recommendation)
- Normalized requirement: pure-text face — no assets/readme/ directory, no hero SVG; the honesty banner owns the first screen as the project's visual identity (a hero would push the first-screen-pinned banner below the fold — signal inversion); 2-3 static non-numeric badges retained (inside the industrial 3-5 band); the dual-profile flow diagram lands via the D-008-registered discretionary Mermaid block in the Architecture section (git-diff reviewable, zero asset files, language-neutral for the zh-CN mirror which is likewise pure text).
- Constraints / negatives: no GIF or ImageGen (decorative motion opt-in never invoked; generated material is not project-native); no full visual system (visual density correlates negatively with credibility for this tool class — 'animated panda banner' is the registered anti-pattern); Mermaid diagram remains discretionary at implementation, not a pin; counter-evidence registered — high-star consumer READMEs often carry banners, but that adoption-seeking context does not match this project's credibility-demonstration goal.
- Status: current

## D-010 — t20 trend 行形态：documentation + ADR-0079

- Original question: t20 trend 行形态 — a. kind:documentation + 新立 ADR-0079 登记双语镜像惯例(net_additions:1 如实喂 streak;machinery diff 走 carve_out_used:1+gtd.files) / b. 惯例并入 ADR-0038 修订(net_additions:0) / c. 不立 ADR 只活账本
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: t20 registers 'kind:documentation' + 'adr_added:["0079"]' + 'net_additions:1' honestly feeding the ADR streak; ADR-0079 houses the bilingual-mirror convention (D1 dual filename EN-primary + zh-CN mirror; D2 autonym language-switch line; D3 translation-baseline commit-hash HTML comment; D4 'English original prevails' arbitration; D5 zh-CN tarball-cap exemption citing ADR-0039 D3 as policy basis); ADR-0038/0039 untouched except pointer lines if needed (append-only / supersede model per 'Amended by: ADR-0039' precedent); ADR-0079 and the t20 report must explicitly state 'the ADR exists because the convention needs a policy home — the streak feed is a disclosed fact, not the motive' (anti-quota-theater clause); wiring edits triggered by 0079 (adr-index count, seeds) ride ADR-0076 carve-out with 'carve_out_used:1' + non-empty 'governance_tooling_diff.files' per D-005 shape.
- Constraints / negatives: no in-place revision of ADR-0038 (immutable-ADR rule; cross-domain revision lives in a new ADR — 'Amended by' pointer precedent); no ledger-only convention (round dies, convention dies — t18 D-007 loss path); zh-CN mirror convention is a distribution-surface decision (cap exemption, arbitration, hash anchor) not a prose-style matter, so 'Any Decision Record' objection does not apply.
- Status: current

