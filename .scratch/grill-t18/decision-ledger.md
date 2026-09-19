# grill-t18 decision ledger

Round: t17 audit-finding disposition (H-1..H-5) + critique completion verification.
Status legend: current | revised | stale | deferred.

## D-001 — round boundary (scope)

- Original question: 本轮轮界 — a. H 束处置轮（审计 handoff 建议向）：H-1..H-5 全处置 + §6 验收电池原样复跑 + 节律 consent-sweep；锐评核验结论登记一行进轮文档 / b. a + 委托姿态复议 / c. 只修 H-1/H-2，其余递延
- User answer (verbatim): a
- Normalized requirement: grill-t18 disposes all five t17 audit findings (H-1 doc defect, H-2 consent-sweep naming + CONTEXT clause, H-3 proseScan floor adjudication, H-4 proseScan smells under defer-0063 quota, H-5a-d convention candidates); re-runs the t17 audit section-6 battery verbatim; performs the cadence consent-sweep; registers the critique-v4 all-disposed verdict as a scope line in round docs; setup commit absorbs the t17 audit report (zo) + audit handoff (yz).
- Constraints / negatives: delegation posture NOT reopened (requires new argument, v4 text is not one); stack landing untouched (owner-domain); never-commit set preserved (tq/nl/xu/my + t17 audit-evidence un patch + rerun/* + round-commits.txt); no strategic/promotion review; no new ADR unless a finding disposition genuinely requires one.
- Status: current

## D-002 — H-3 proseScan floor adjudication

- Original question: proseScan v.length>=2 地板裁决 — a. 登记地板 / b. 移除地板 / c. 登记地板 + key-assign 扩展到全 11 schema 键 / d. 移除地板 + 扩展键
- User answer (verbatim): 采纳 (atomcode-refined c-prime)
- Normalized requirement: R2 fix — key-assign scan covers all 11 schema keys (add skipped, not_run, battery_as_of_commit, report_commit prose key-assign forms; zero new false-positive risk). R1 registration — ADR-0077 D-E amendment: floor expressed as pattern-ambiguity function + compensating clause single-digit values backstopped by key-assign scan + coverage-boundary sentence (permanent declared gap, NOT deferred-registry). Wiring: single-digit fixture + key-assign fixture pinning chosen semantics (audit section-6 requirement).
- Constraints / negatives: bare-value floor stays (do not remove — industry precision-floor precedent; \b\d\b ambiguity); two defects booked separately (key-assign gap=implementation fix, floor=registration; ADR-0035 one-entry-one-condition); floor registration is disclosure of D-E implementation boundary, not a violation; skipped=0 dedicated pattern stays.
- Status: current

## D-003 — H-4 smell disposition + defer-0063 quota first test

- Original question: H-4 处置+配额 — a. 类路径全包（R1 写 guard/exit 惯例→解冻 0063→束内首取=配额销；过闸两件随行 refactor commit；export 登记 by-design）/ b. 只修过闸两件 / c. 全递延
- User answer (verbatim): ok (atomcode-refined a-prime)
- Normalized requirement: R1 — guard/exit-style convention lands as an ADR-0077 appendix beside D-A values contract: structure contract = violations accumulate within a phase, one emit-exit boundary per phase, immediate exit reserved for verifier-broken (exit>1 class) + cause-summary clause (nonzero exit states cause at end of output). Unfreezes defer-0063. R2 — this fix bundle takes defer-0063 first (quota discharged at first test): extract shared emit-exit helper dissolving both the deferred mix and the H-4 FAIL-print duplication (both exit sites kept, converged on one boundary function; fail-fast semantics unchanged); reportPath single-read + PROSE_KEYS single-source as separate atomic refactor: commits; export-misreport documented by-design in round report.
- Constraints / negatives: no quota theater (fresh same-class ticket while 0063 stays frozen); convention covers same-phase emit-exit convergence only — does not forbid cross-phase fail-fast; separate atomic refactor commits, never mixed with fix commits; convention venue = ADR-0077 appendix (ADR clause per unfreeze_if, not a mere comment).
- Status: current

## D-004 — H-5a fix-round trend-row semantics

- Original question: fix-round trend 行语义 — a. 枚举扩展+复用字段+追溯修行 / b. kind 重定义为行类 / c. 另立 machinery_diff / d. fix 轮免写 trend 行
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: ADR-0078 (fix-round disclosure taxonomy) registers: kind enum extended to documentation|fix; fix rounds MUST disclose R2 machinery hand-edits via governance_tooling_diff (field reused, no parallel field; carve_out_used NOT counted for fix rounds); zero_product_diff definition cited from ADR-0076 D-A (product = R1 runtime require-closure); t17 row gets disclosed corrective rewrite (kind->fix + governance_tooling_diff backfill of the two R2 scripts + reason first line stating retroactive correction: mislabeled under the closed enum); checker :122 enum line admits fix; fix rows exempt from D-F deferred-entry assert; streak computation unchanged (net_additions=0 breaks naturally); wiring negative pin (kind:fix without governance_tooling_diff -> fail).
- Constraints / negatives: disclosed rewrite only — reason must state the mislabel, no silent history edit (audit-log vs observational-ledger distinction); no semantic overloading of kind; no third parallel disclosure field; fix rows stay in trend inventory (streak semantics depend on continuity); new ADR coupled with json+checker in same commit (ADR-0035 coupling guard).
- Status: current

## D-005 — H-2 named-line convention + clause restoration

- Original question: H-2 consent-sweep 命名行+条款恢复 — a. 恢复 one-named-line-per-row 成文惯例+条款补回 / b. 修惯例允许合并行但 id 全现 / c. 实质即可 id 可选
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: CONTEXT.md new glossary term Consent Sweep (同意清理) — defines the per-row closeout disposition ritual; normative clause: every standing registry row touched (defer-00xx/sunset/quota) MUST keep a named-id line; substance may fold into a shared-theme line but the row id is never stripped; _Avoid_ clause: identifier-stripping. Doc-nit: seq 3/5/6/8 pre-authorization-era historical-background clause restored into the Scribed Approval/Proxy Signature terms instrument-history line. t17 ledger gets an appended disclosure note (defer-0055 omission qualified as isolated lapse — t12-t14 all named; ledger is a round artifact, appendable not rewritten). t18 sweep onward names every id.
- Constraints / negatives: convention home = CONTEXT glossary term (not ADR — standing convention not one-shot decision; not runbook — normative boundary not procedure); (a) and (b) normatively equivalent but no existing convention exists to amend — register new, do not frame as amendment; t17 omission stays history, disclosed not rewritten.
- Status: current

## D-006 — H-1 corrupted-doc fix shape + authoring-path convention

- Original question: H-1 修复形态 — a. 修文件+AGENTS.md 惯例+wiring 钉 / b. 修文件+惯例无钉 / c. 只修文件
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: fix the corrupted committed .scratch/grill-t17/handoffs/next-round.md via file-edit tooling (restore the 4 absolute paths with backslashes, remove literal CR byte and stray octal-eaten bytes, restore the four dollar-prefixed skill names). AGENTS.md working agreement gains an authoring-path clause: committed docs land via fs.writeFileSync or file-edit tools, never through escape-interpreting shell layers (heredoc/echo/inline node -e strings); post-write byte check. Zero-dependency wiring pin (adr-NNNN-wiring style) scans committed .scratch/*.md for control bytes (x00-x08 x0B x0C x0E-x1F, tab+LF exempt) and stripped-path signatures (D:Aworker class); the two real corruption samples serve as negative fixtures; signature set registered as extensible via defer-registry.
- Constraints / negatives: no markdownlint or broad unicode sanitizer dependency (extended-ascii precedent — would ban CJK/dashes; zero-dependency check-* house style); convention is habit-enforced, the pin is the gate (two-layer, not convention-only); pin covers only demonstrated signatures — extensible registry not exhaustive.
- Status: current

## D-007 — H-5b/c/d convention registration venues

- Original question: 惯例登记处所 — a. 分布式自然家（5b 新 CONTEXT 词条 / 5c Facts Canon 一句 / 5d D-E 边界句）/ b. 全塞 Facts Canon / c. 全进轮 handoff 惯例段 / d. 全进 AGENTS.md
- User answer (verbatim): 采纳 (atomcode-refined a-prime)
- Normalized requirement: H-5b — new CONTEXT term Amend-Riding Discipline (搭便车修正纪律): map-regen never rides an amend, sha references pin immutable history, independent _Avoid_ surface + cross-reference to Facts Canon. H-5c — Facts Canon term gains one tail clause: handoff verified-state lines are the same narrative genre, regenerable counts cite paths never carry numbers. H-5d — ADR-0077 D-E appendix gains one boundary sentence: verbatim evidence snapshots may disagree on counts across the regen boundary — expected ordering artifact not discrepancy. Lands on the R1 documentation surface, committed with the round + ledger disposition line.
- Constraints / negatives: no merging 5b into Facts Canon (numbers-live-where vs sha-pins-where are two jobs); no per-round handoff homes (dies with the round = the original loss path); no AGENTS.md catch-all (breaks the edit-surface taxonomy); 5c/5d are one-clause extensions minting no new terms.
- Status: current

## D-008 — closeout shape + execution structure

- Original question: 收尾形态 — a+b+c+d+e 全包（轻收尾/R1→R2/setup commit 吸收 zo+yz/逐行具名 sweep/零 ask/t18 行 kind:fix 首践）
- User answer (verbatim): 采纳 (atomcode-refined a-prime with three guardrails)
- Normalized requirement: light close — t17 audit section-6 battery re-run verbatim parameterized --round grill-t18 into committed evidence + owner approval + audit-ready report only (no self-initiated audit; ADR-0074 D-F triggers checked, none fire). R1 documentation phase then R2 machinery phase, carve-out not invoked. Setup commit absorbs zo (t17 audit report) + yz (audit handoff) with commit message explicitly disclosing the absorption (untracked at t17 round-final). Consent-sweep with per-row named lines (first Consent Sweep convention use — defer-0055 named; defer-0063 row transitions closed/actioned as quota discharges; sunset 1/6; defer-0053/0057/0058; O-E backlog; never-commit patch set). Zero owner asks; stack landing (3 branches, 28 commits unpushed) owner-domain informational. t18 trend row files kind:fix + governance_tooling_diff (first compliant instance). t18 round report renders facts-canon + evidence artifacts + zero canon numbers in prose. Three guardrails in the round report: (1) light-close triad — battery re-run committed evidence + facts-canon path citation + explicit registration line that dispositions enter the next audit standing review surface; (2) facts-canon states only the re-checkable fact passed-D-004-checker-incl-negative-pin, never first-instance-proves-convention; D-004 effectiveness listed as next-audit review item; (3) setup commit message discloses audit-artifact absorption; never-commit boundary unchanged.
- Constraints / negatives: no immediate re-audit (ITAF 1402 timing + no trigger = rubber-stamp risk); no self-attestation circularity (convention effectiveness never evidenced by own compliance); never-commit set preserved (tq/nl/xu/my + t17 audit-evidence incl. un patch + rerun/* + round-commits.txt); report_commit stays null.
- Status: current

