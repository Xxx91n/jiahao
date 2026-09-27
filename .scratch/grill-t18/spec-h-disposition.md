# grill-t18 — spec: t17 audit-finding disposition (H-1..H-5)

Settled 2026-09-19. Authoritative source: .scratch/grill-t18/decision-ledger.md (D-001..D-008, all current).

## 0. Headline

Disposition round for the t17 audit (PASS WITH FINDINGS, 2026-09-18): five findings + four convention candidates, all adjudicated. The round also registers the critique-v4 verdict: all five prescriptions verified disposed on the live tree (P-1/P-2 over-delivered by the t17 Scribed/Proxy terms + E-7). Fix-round shape: R1 documentation phase, then R2 machinery phase; governance carve-out NOT invoked.

## 1. Round boundary (D-001)

In scope: H-1..H-5 dispositions; t17 audit section-6 battery re-run verbatim (--round grill-t18); cadence consent-sweep (first named-line convention use); setup commit absorbing zo+yz; critique-v4 verdict registered as a scope line. Out of scope: delegation posture (new argument required, v4 text is not one); stack landing (owner-domain); never-commit set untouched (tq/nl/xu/my + t17 audit-evidence: un patch + rerun/* + round-commits.txt); no strategic/promotion review; no new ADR unless a finding requires one (D-004 requires ADR-0078).

## 2. H-3 proseScan floor (D-002)

R1: ADR-0077 D-E amendment — floor as pattern-ambiguity function + compensating clause (single-digit canon values backstopped by key-assign scan) + coverage-boundary sentence; permanent declared gap, not deferred-registry. R2: key-assign scan covers all 11 schema keys (skipped, not_run, battery_as_of_commit, report_commit added); bare-value floor stays; skipped=0 dedicated pattern stays. Wiring: single-digit fixture + key-assign fixture (audit section-6 requirement). Two defects booked separately (ADR-0035 one-entry-one-condition).

## 3. H-4 smells + defer-0063 quota (D-003)

R1: guard/exit-style convention as ADR-0077 appendix beside D-A — structure contract (violations accumulate within a phase; one emit-exit boundary per phase; immediate exit only for verifier-broken = exit>1 class) + cause-summary clause. Unfreezes defer-0063. R2: bundle takes defer-0063 first (quota discharged at first test): shared emit-exit helper dissolves the deferred mix + the H-4 FAIL-print duplication (exit sites kept, converged on one boundary function; fail-fast semantics unchanged); reportPath single-read + PROSE_KEYS single-source as separate atomic refactor: commits; export-misreport documented by-design in the round report. Negatives: no quota theater; convention does not forbid cross-phase fail-fast; no mixed fix+refactor commits.

## 4. H-5a fix-round trend row (D-004)

ADR-0078 (fix-round disclosure taxonomy) registers: kind enum extended to documentation|fix; fix rounds MUST disclose R2 machinery hand-edits via governance_tooling_diff (field reused; carve_out_used NOT counted); zero_product_diff definition cited from ADR-0076 D-A; t17 row gets disclosed corrective rewrite (kind->fix + governance_tooling_diff backfill + reason first line stating retroactive correction); checker enum admits fix; fix rows exempt from D-F deferred-entry assert; streak unchanged; wiring negative pin (kind:fix without governance_tooling_diff -> fail). Negatives: disclosed rewrite only; no kind overloading; no third parallel field; fix rows stay in inventory; ADR+json+checker in one commit.

## 5. H-2 named lines + clause (D-005)

CONTEXT new term Consent Sweep: every standing registry row touched keeps a named-id line; substance may fold into a shared-theme line, id never stripped; _Avoid_ identifier-stripping. Doc-nit: seq 3/5/6/8 clause restored into Scribed Approval/Proxy Signature terms. t17 ledger gets an appended disclosure note (defer-0055 omission = isolated lapse; appendable, not rewritten). Convention home = CONTEXT term (not ADR, not runbook).

## 6. H-1 corrupted doc + authoring path (D-006)

Fix .scratch/grill-t17/handoffs/next-round.md via file-edit tooling (restore 4 absolute paths, remove CR byte + octal-eaten bytes, restore four dollar-prefixed skill names). AGENTS.md working agreement gains authoring-path clause: committed docs land via fs.writeFileSync or file-edit tools, never through escape-interpreting shell layers; post-write byte check. Zero-dependency wiring pin scans committed .scratch/*.md for control bytes (x00-x08 x0B x0C x0E-x1F, tab+LF exempt) + stripped-path signatures (D:Aworker class); the two real corruption samples are negative fixtures; signature set extensible via defer-registry. Negatives: no markdownlint/broad sanitizer dependency; pin covers demonstrated signatures only.

## 7. H-5b/c/d convention venues (D-007)

H-5b: new CONTEXT term Amend-Riding Discipline (map-regen never rides an amend; sha references pin immutable history; _Avoid_ surface + cross-ref Facts Canon). H-5c: Facts Canon term gains one tail clause (handoff verified-state lines cite paths, never carry regenerable counts). H-5d: ADR-0077 D-E gains one boundary sentence (verbatim evidence snapshots may disagree across regen boundary — expected ordering artifact). Negatives: no merging 5b into Facts Canon; no per-round homes; no AGENTS.md catch-all.

## 8. Closeout (D-008)

Light close: section-6 battery verbatim --round grill-t18 into committed evidence + owner approval + audit-ready report only. R1 then R2; carve-out not invoked. Setup commit absorbs zo+yz with disclosed commit message. Consent-sweep named lines (defer-0055 named; defer-0063 transitions closed/actioned; sunset 1/6; defer-0053/0057/0058; O-E backlog; patch set). Zero owner asks. t18 trend row files kind:fix + governance_tooling_diff (first compliant instance). Round report: facts-canon + evidence artifacts + zero canon numbers in prose. Three guardrails: light-close triad (battery evidence + facts-canon paths + next-audit review-surface registration line); facts-canon states only re-checkable facts (no self-attestation circularity); setup commit message discloses absorption. report_commit stays null.

## 9. Negative union

No delegation-posture reopening; no stack landing; never-commit set preserved; no bare-value floor removal; no quota theater; no silent history rewrite; no kind overloading; no parallel disclosure field; no identifier stripping; no broad sanitizer dependency; no immediate re-audit; no self-attestation circularity; no new ADR beyond 0078; no carve-out; report_commit null.
