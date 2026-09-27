# Handoff — grill-t7 unblind round: AUDIT PASSED (2026-09-15, re-audit pass 2)

## State

- Repo: `D:\Aworker\jiahao` — dual-profile prompt-as-mental-model distribution.
- Stack (GitButler): `grill-t7-unblind-exec` on `grill-t7-unblind-docs`,
  common base 94f56dd. Commits (change-ids): vts -> zmr -> xqz -> skm ->
  mkn -> upk -> skz (audit rework F-1..F-4). zmr/upk were amended/reworded
  in rework — pull fresh SHAs via `but status`, do not trust old SHAs.
  NOT pushed — no PR (policy).
- Audit: `.scratch/grill-t7/reports/2026-09-15-audit-unblind.md` — pass-1
  found 1 hard defect (exit-code contract) + 3 latent spec-letter gaps;
  pass-2 re-verified all fixed. Execution report (with rework record +
  P-3 disclosure): `.scratch/grill-t7/reports/2026-09-15-report.md`.
- Settled outcome: devin-corpus@v1 OOT adjudication = **INDETERMINATE**
  (k=3/12, CP 95% CI [0.054861, 0.571858] straddles floor 0.563863).
  FP@default 10/40 — descriptive guardrail NOT observed, no non-inferiority
  claim. Artifact: bench/research/out/devin-oot-report.{json,md}.
- Green snapshot (auditor re-run): jest 59/865; run-test-gate 59/865 exit 0;
  gate:all exit 0 (30 entries, 4 ci-mode UNVERIFIABLE; [154 devin-oot-replay]
  PASS); pack 275,397/101 < 300,000; refusal exit 1 + `[config]: REFUSED`;
  validate/replay exit 0; frozen files (manifest/items/thresholds/mde-freeze)
  untouched; eval-plan sha256 e1c2e66f… anchored in the report.

## Next grill direction (armed by the registered branch policy)

**INDETERMINATE -> devin-corpus@v2** (defer-0046, ADR-0067 D-D): design
target n_hon ~ 100. The v2 plan MUST be registered BEFORE any v2 data is
collected, and MUST carry the disclosure "designed after seeing the v1
verdict" (designed-after-v1 is legal input when disclosed — D-010). v2
numeric parameters were deliberately not fixed this round (R6). Collection
runs through the ADR-0030 growth channel (new snapshot; v1 verdict is
never revisited retroactively).

## Open items for the user / governance

1. **P-2 — countersign authority question (user decision).** instrument
   seq-13 `criteria_change` (dadc50d, docs branch) is an agent-signed
   second_reviewer attestation under a recorded standing delegation
   ("你作为主Agent代替人类签名Xxx91n"). Disclosed, not fabricated — but the
   independent-review purpose is structurally weakened. Decide: accept it
   as F-2 closure, or re-attest personally. defer-0042 still sits
   pending-evaluation; its unfreeze_if is arguably met — close/disposition
   needs a same-commit ADR or ledger note per the registry rule.
2. Cadence dispositions at 2026-12-14: defer-0042/0043/0044/0045/0046.
3. Carried hygiene: `check-corpus-classes.js` privIds dead try/catch;
   hooks.test.js ADR-0017 escalation-count test is timing-sensitive under
   full-suite parallel load (one flake observed by the auditor; green in
   isolation and on re-run).
4. Deferred governance round (never merged into the falsification round):
   trend-anchor absolute cap; deferred-delta ratchet; verifier iron-law
   addition ("implementation-agent reports untrustworthy — rerun is
   authority") onto the SKILL.md surface.

## Constraints that still bind

- `but` for all VCS writes; dedicated branch per session; no push/PR.
- thresholds.json / mde-freeze.json / eval-plan.json / manifest.json /
  items.jsonl frozen — moves only via same-commit ADR (ADR-0027 D2).
- `.scratch/` gitignored — reports/handoffs live here.
- devin-corpus@v1 ground-truth only; the bound claim block (fact line +
  limitation) is machine-asserted verbatim in README / claim-template /
  oot-report; per-mention binding is now wired with a registered exemption
  list.
- run-test-gate (--expected-suites 59) is the CI test job; README declared
  counts must match reality in the same change.
- devin-oot.js contract: exit 1 + PREFIXES enum only; `run` is explicit
  (bare invocation errors [usage]); refusal precedes corpus reads; aborted
  runs persist run_status=aborted without a verdict.

## Suggested skills for the next agent

- `$implement` — v2 plan registration + collection round (read its SKILL.md
  first); `$tdd` at the adapter/plan seam.
- `$code-review` — two-axis review before commits (norm here).
- `$handoff` — at session end.
- `$but` (gitbutler) — all VCS writes.
- Read first: `.scratch/grill-t7/reports/2026-09-15-audit-unblind.md`,
  `docs/adr/0067`, `bench/research/devin-corpus/eval-plan.json`,
  `docs/governance/decision-ledger-t7.md`.
