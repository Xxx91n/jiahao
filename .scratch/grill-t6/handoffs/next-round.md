# grill-t6 -> next round handoff (2026-09-14)

## Context anchors (read first, do not re-derive)
- ADR-0064: docs/adr/0064-t6-product-round-pre-registration-mde-gates-and-governance-trend-anchor.md (D-A..D-F)
- Ledger authority: docs/governance/decision-ledger-t6.md (mirror: .scratch/grill-t6/decision-ledger.md)
- Green at handoff: 55 suites / 738 tests; tarball 214,003 B < 230,000 cap.

## Tasks for next implementation round (T-1, research round)

1. T-1 research-round baseline harness (covers D-002)
   - Freeze thresholds.json (no tuning this round); record v2 core baseline 47.92% @ 4.29% FPR, score 0.265 as-is.
   - suggested skills: tdd, code-review
2. Four-class corpus wiring: bench-396 public tier, private probe tier, judge n=26, Devin ground-truth collection (covers D-003, D-005)
   - Devin (D:\Devin\Devin.exe, unlimited tokens) only feeds ground-truth samples; no eval dependence.
   - suggested skills: tdd, testing-setup
3. Rung ladder G1-G5 with dual negative controls and waiver-bifurcation closure (covers D-004)
   - suggested skills: grill-with-docs, tdd
4. sklearn -> JS goldens; stand up G6 golden-sample equivalence gate (covers D-005)
   - Tolerances: token bit-level, tfidf < 1e-9, logits < 1e-12; positive control included.
   - suggested skills: tdd
5. Governance: log this round's zero-product-diff event into docs/governance/ trend inventory; advisory only (covers D-006)
   - suggested skills: neat-freak, domain-modeling

## Hard rules carried forward
- Completion claims need fresh command output (anti-jiahao). Ledger is the single source of truth; conflicts -> revised, never silent.
- Doc rounds end with a but-commit before handoff.
