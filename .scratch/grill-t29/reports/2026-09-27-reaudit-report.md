captured-at-head: 691eb48d6aaeae92701e06c1e492598f7dcc8eb4

# grill-t29 re-audit report — fix-window rework verification (loop 2)

Second-party audit, second loop, of the t29 fix-window rework performed in
response to the first-loop FAIL report (68e23d9b14864c99710378ea365cba98c5ed283d).
Same audit charter: nothing self-described is trusted; every disposition was
re-verified against the live tree and by rerunning the identical acceptance
battery on the true terminal tree.

**Verdict: PASS — the blocking defect is resolved; the same leg battery is
green at the real terminal head.** Rework process itself audited and found
compliant (uncommit pre-push, post-restack evaluateRound rerun, orphan pin
routed through a registered erratum, footers on all new commits, zero
human-authority acts).

---

## 1. Acceptance re-run at the true tip (auditor-reproduced, loop 2)

Pins in this report name commit `691eb48d` (the substantive lane tip; the
GitButler workspace commit above it is ephemeral by convention).

| leg | rerun evidence | result |
| --- | --- | --- |
| compile `node --check` | audit-evidence/rerun2/compile-node-check.txt | 316 tracked js / 0 failures; shipped dirs sum 184 (56 scripts incl. derive tool + 19 + 93 + 9 + 7) |
| yaml parse | ci.yml + .aider.conf.yml (unchanged since loop 1) | OK |
| package | audit-evidence/rerun2/pack-smoke.txt | EXIT 0; tarball 372596B < 380000 cap; surface rules intact |
| liveness | pack-smoke leg extracts + dry-runs the packaged CLI; loop-1 manual install.js --help / init -y --dry-run both OK, install.js unchanged | OK |
| full jest | audit-evidence/rerun2/run-test-gate.txt | 83/83 suites, 1419/1419 tests, EXIT 0 (the +8 regression fixtures land; rewrite-map.test.js ×2 failures from loop 1 are gone) |
| gate:all | audit-evidence/rerun2/gate-all.txt | 41 entries PASS incl. [208]/[209] rewrite-map legs — exit 0; 4 UNVERIFIABLE are the registered ci-mode degrade (pre-existing) |
| rewrite-map legs | inline rerun | --check OK (3188 citations); --published-only OK (published-side ancestry verified vs origin/main) |
| exception-channel | audit-evidence/rerun2/exception-channel.txt | OK — 2 channel fields, 4 entries complete + in-force (3 claim-surface + 1 errata-exempt) |
| classification | audit-evidence/rerun2/classification.txt | OK — 88 consumed paths registered+classified |
| hermetic / anchoring / deferred / inventory | rerun2/*.txt | OK — 24 post-registration footers verified; 69 deferred; 41 gates |
| evaluateRound | audit-evidence/rerun2/freshness-eval.txt | t29: claims=7 bad=0, seal declared 68c8ec2f87d4a48ea67bc81c5d1575845ea47a42, amended=false, inFlightClean, capturesAtSealOk, freeze 0; t28 intact; t27's 13 bads remain pre-existing/disclosed |

My own audit-evidence captures are examiner work product (nc-001 — untracked,
referenced by path/count only): 10 leg captures + 1 eval summary + 2 helper
scripts under .scratch/grill-t29/audit-evidence/rerun2/.

## 2. First-loop findings — disposition verification

| finding | fix-window claim | auditor evidence | verdict |
| --- | --- | --- | --- |
| A-1 terminal red | uncommit c2768fc8 (pre-push, t27 precedent), wave+SEAL re-issued at true tip after regen-last ordering | c2768fc8 absent from c7ae4f81..HEAD history; new wave 691eb48d; legs 208/209 + jest + gates green post-commit; SEAL declares 68c8ec2f87d4a48ea67bc81c5d1575845ea47a42 with re-issue disclosure | RESOLVED |
| A-2 80-vs-82 | dual-pinned prose (82 at audit head / 88 at repair tip, six new registry-derived consumers) | report §3 classification row verified; my rerun reads 88 | RESOLVED |
| A-3 adr-streak disposition | recorded mitigated, closed | trend-inventory row carries advisory_dispositions: adr-streak + carve-out burn-rate entries | RESOLVED |
| A-4 omissions | packet burn-rate context; ADR-0086 D-D cost dims; derivation tool | packet line 250 row present; D-D self-audit now covers retire-cost + agility-vs-rigidity; scripts/derive-anchoring-footer.js exists, AGENTS.md documents it | RESOLVED |
| A-5 optional_fields | registry-derived | check-exception-channel.js:82 consumes spec.optional_fields, comment names the F-1 drift class | RESOLVED |
| A-6 scope literal | registry-derived | evidence-freshness.js classifiers() reads orphan_ancestry.artifact_scope, throws if absent (fail-closed) | RESOLVED |
| A-7 sha-less for_commit | fail-closed | exceptionActive returns false when for_commit != ctx.sha — binding is a positive match requirement | RESOLVED |
| A-8 HEAD_RE | registered | capturedHeaderRe derived from pin_patterns kind 'captured-at-head', throw-if-absent | RESOLVED |
| A-9 footer-root + hermetic + dead-map | fixed + fixtures | try/catch around rev-parse reg^; unclassifiableIndirect -> red; fixture tests present (root-commit, indirect-nonparam, runner-write, comment-prose) | RESOLVED |
| P-1/P-2 red-window disclosure | report §4 item 6 | present, names audit P-1/P-2 + E-17 + root cause + new ordering convention | RESOLVED |
| P-3 post-seal claim | rerun noted + regen-last ordering | §4 item 6 + E-17 convention tightening; map green post-commit | RESOLVED |
| N-1 capture convention | documented | §4 item 7: 20 files = 19 leg captures + 1 eval summary, freshness-eval.txt named | RESOLVED |
| A-1 adjunct (my pin orphan) | errata-exempt under E-17 | errata_exemptions entry: status pending-confirmation, requested_by, reason, expires_at 2026-12-15, literal scope, sha b61d7951, errata E-17 — full channel form; exception leg counts it loud | RESOLVED |

## 3. Fix-window process audit

Compliant, with one structural note:

- History edit legitimacy: c2768fc8 uncommitted pre-push; nothing was pushed
  (no remote refs for any grill-t29 lane). The old objects remain; the seal
  was re-issued, not amended in place — E-17 discloses the mechanism.
- Post-restack ritual (AGENTS.md): evaluateRound rerun after the restack —
  my independent rerun at HEAD confirms all invariants green; the orphaned
  auditor pin b61d7951 routed through a registered erratum (E-17), exactly
  the contract's required shape.
- All 8 repair commits + wave re-issue carry [ANCHORING] footers; the
  anchoring-footer leg verified 24 post-registration commits including mine.
- Zero human-authority acts: no tags, no ratifications, no countersigns,
  no push. Tide packet remains draft.
- Note: this audit lane's commit (the loop-1 FAIL report) now sits mid-stack
  under the rebased repair chain — a GitButler lane-boundary artifact of the
  restack, harmless to evaluation (the report path is exception-registered).

## 4. Residuals (non-blocking, owner-visible)

- R-1: errata_exemptions entry for the auditor pin expires 2026-12-15 — the
  tide date; owner countersign/adjudication at the tide covers it (pending-
  confirmation is effective-on-registration per D-002(ii)).
- R-2: t27's 13 pre-existing claim bads remain disclosed-not-repaired —
  unchanged, owner-side.
- R-3: the deferred queue still carries defer-0072..0075; defer-0075's
  capacity observation absorbs this round's rework data point.
- R-4: evaluator crash-safety is unchanged by design (fail-loud); the
  audit's own eval harness hit a script-authoring error, not an evaluator
  defect — no finding.

## 5. Re-audit evidence index

- Untracked examiner captures: .scratch/grill-t29/audit-evidence/rerun2/
  (10 leg captures + 1 eval summary + 2 helper scripts — .cjs harnesses).
- Loop-1 captures remain at .scratch/grill-t29/audit-evidence/rerun/ (13
  captures + 2 helper scripts) — kept for the red-state record.
- Committed claim artifacts: the t29 report/handoff/facts (updated by
  fix-window commits 477ef6f4, b703fcd9, 68c8ec2f), SEAL (re-issued
  declaring 68c8ec2f87d4a48ea67bc81c5d1575845ea47a42), ERRATA E-17.

## 6. Conclusion

The rework closes the loop-1 blocking defect with the correct shape: the
stale-at-landing wave was unwound pre-push, pins re-captured against the true
terminal tree, derived artifacts regenerated LAST under the new ordering
convention, and the same acceptance battery now passes at the real head.
All secondary findings are discharged or explicitly registered. **PASS —
round accepted for closeout; owner-side tide adjudication remains pending
by design (not a gate).**

Audit rerun checklist for any future loop: this file's §1 table is the
reproducible set; rerun2/ holds the argv-level captures.