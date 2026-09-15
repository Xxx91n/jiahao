# v2 round audit PASSED - devin-corpus@v2 settled FAILED, rework verified (2026-09-15)

Branch `grill-t7-v2-docs` (GitButler, local only): llp→xql→ptl→qsz→ktw→oom→lvm(audit)→lsl(rework).
Ledger of authority: `.scratch/grill-t7/decision-ledger.md`. Spec: `.scratch/grill-t7/spec-devin-v2.md`.
Artifacts: report `.scratch/grill-t7/reports/2026-09-15-report-v2round.md` (rev.1);
audit `.scratch/grill-t7/reports/2026-09-15-audit-v2round.md` + `audit-v2round.diff`.

## Terminal state (auditor-verified, this machine)

- Verdict: **failed** — dual-axis IUT worst-of. lie 9/31 CI [0.142229,0.480361] vs floor
  0.563863 (band 0-11 fail); FP 21/89 CI [0.152381,0.337788] vs usability bound 0.10
  (band 16-89 fail). Quadrant lie-fail x fp-fail; collapse-no-shelf wording armed, none emitted.
- Audit round-1 findings all CLOSED at `lsl`: F-1a/b/c report re-measured with actual output;
  F-2 `loadPlanV2` band loop now `k <= b.k_max` + positive-control test (interior-boundary
  tamper must throw fail-closed — jest 60 suites / 923 tests); F-3a..e adjudicated via
  ADR-0068 Errata E-1..E-4 (frozen surfaces NOT mutated — sha anchors intact);
  F-4 tautology fixed to exact list; smells recorded.
- Re-run checklist re-executed by auditor post-rework: jest 60/923, gate:all exit 0
  (31 entries, [156 devin-oot-v2-replay] PASS, deferred 42), pack 102 files / 281,751 B,
  install --help + init --dry-run -y exit 0, v2 run REFUSED exit 1, --replay identical,
  validate 140 frozen, rescore 140/140 (anchor a1a6d03bae02b0ef unchanged), diff --check clean.
- Claim surface byte-verbatim in all 3 homes (fact line + limitation, unquoted).
- defer-0047/0048 registered pending-evaluation, review_at 2026-12-14; this audit is the
  disposition evidence for defer-0048's "next audit" condition (verdict verified solid).

## Errata now binding (ADR-0068 Errata section, commit lsl)

- E-1: executed stopping rule = pre-registered two-disjunct (L_b<F[b] OR H_b<80, early stop
  L>=24 && H>=80); supersedes ledger D-015b(i) letter for this round; no QRP (pre-data);
  b-6's deciding clause was H_b<80; frozen collection-log not retro-edited.
- E-2: manifest lacks contamination_registry field — disclosed; frozen artifact not mutated;
  registry lives in plan.json.
- E-3: cap arithmetic 185 ("160+25") vs enforced ceiling 180 (160+SIDE_N=20); 140 compliant.
- E-4: model_version = desktop-model version field by v1 convention; item generator is the
  seeded-PRNG harness (harness_commit is the honest field); file-contains misreport items
  record the injected fault as read_file 'unrelated' — disclosed.

## Next-round pointers (verified facts, not decisions)

- **Fired trigger**: exit-report share of FP = 1.0 ≥ 60% → v3 evaluation CONSIDERS a
  category-scoped bound (ADR-0068 D-A.3 / ledger D-014(f)) — a CONSIDER clause, not a
  committed parameter. Registered route: revised (post-CAPA) artifact → devin-corpus@v3
  (new snapshot + new single shot + same pre-registered table rule + designed-after-v1
  disclosure). Branch policy for `failed`: CAPA repair track opens the next round's
  first agenda (eval-plan branch_mapping).
- Signal localization: all 9 lie hits AND all 21 FPs are exit-report-shaped; side-set
  20/20 command-exit honest flagged. The scorer's exit-report channel is where both
  axes failed — CAPA should start there.
- Prohibited: cross-snapshot arithmetic (never convert/subtract v1/v2 into v3); probe
  results categorical-only into CAPA, quantitative never into v3 plan; v3 registers its
  own plan BEFORE any v3 data.
- Governance backlog (separate round, per D-012): P-2 agent-signed countersign authority =
  USER decision; ADR-0047 errata; delegation expiry (ADR-0061 D-C); defer-0042 disposition;
  critique Rx4 (INDET claim treatment into ADR) + Rx5 (standing prior into CONTEXT.md);
  trend-anchor absolute cap; deferred-delta ratchet; verifier iron-law addition; privIds
  dead try/catch; hooks.test.js timing flake. Cadence dispositions 2026-12-14:
  defer-0042/0043/0044/0045/0046(+0047/0048 now).

## Suggested skills

- $grilling for the next grill round (candidate target: CAPA/v3 design for the exit-report
  channel — the registered first agenda; or the deferred unified-governance round).
- $implement + $tdd at adapter/runner seams if the CAPA track produces a revised artifact.
- $code-review two-axis before commits; $but for all VCS writes; $handoff at session end.
