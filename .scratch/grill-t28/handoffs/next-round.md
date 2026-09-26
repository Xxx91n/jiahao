# grill-t28 next-round task book — convention-drift disposition round

Sole decision source: `D:\Aworker\jiahao\.scratch\grill-t28\decision-ledger.md` (D-001..D-006, all current). Execution spec: `D:\Aworker\jiahao\.scratch\grill-t28\spec-t28-disposition.md` (per-section D-ID keys; nothing outside the ledger). Upstream: V7 critique `D:\Aworker\jiahao\.codex-tmp\锐评1.md` + t27 audit handoff `D:\Aworker\jiahao\.scratch\grill-t27\handoffs\2026-09-25-audit-handoff.md`.

Authority boundary: pushes to main, merges, tag pushes, `gh secret set`, grant/ratification verdicts, classification countersigns, errata/waiver issuance are USER actions. The agent drafts, commits locally on its own lane, verifies locally. **Pinned execution order: 1→3→4→2→0070** (D-001).

## T-0 — Pre-flight [D-001]

- `gh run list --branch main --limit 3` + `node scripts/check-deferred.js` — record CI state + registry live counts (defer-0070 pending, defer-0072/0073 registered).
- Verify defer-0070 closure inputs: run 36142965743 conclusion=success @ c8613f55; capture its UNVERIFIABLE leg list for the verifiable_composition field.
- Open dedicated GitButler branch; `but commit` only with explicit allowlist + `git show --name-only` verify (ADR-0083 D-C).

Suggested skills: gitbutler.

## T-1 — ① approval-surface errata [D-002]

- One master errata record (append-only) + one pointer-annotation line appended on each of ADR-0076, 0077, 0078, 0079, 0080, 0081, 0083, 0084, 0085 — wording pending-confirmation: `second_reviewer countersign obligation presumed subsisting - bare form since t15 is unregistered drift, pending entity-level adjudication`. NEVER assert the accidental-stripping as adjudicated fact.
- Merge the 9 ADRs into the countersign queue rows (10→19) for the 2026-12-15 tide.
- Registry/ledger row marking the two approval forms' boundary; cite ledger D-002 as the endorsement record.
- No new ADR. Reversal path pre-registered: consensus evidence → lightweight registration ADR.

Suggested skills: domain-modeling (boundary-term naming); neat-freak (registry congruence).

## T-2 — ③ audit-artifact residence restoration [D-003]

- Move `.scratch/grill-t26/audit-evidence/audit-report.md` → `.scratch/grill-t26/reports/audit-report.md` and `.scratch/grill-t27/audit-evidence/audit-report.md` → `.scratch/grill-t27/reports/audit-report.md` — byte-verbatim, commit.
- Leave untracked two-line pointer README at each old spot.
- Register the report-writing convention (committed-surface-reachable evidence only; pointer-only references to untracked captures) in the audit-side docs.
- nc-001 untouched; note verdict-issuance stays owner-side.

Suggested skills: neat-freak (residence/authority reconciliation).

## T-3 — ④ delegation template + seq-13 [D-004]

- Append-only amendment on `docs/governance/delegation-renewal-template.md`: trigger re-pointed to `first signoff-class event inside a human-authority round / the 2026-12-15 tide`; amendment note states why the next-event trigger became unsatisfiable. No in-place rewrite of the registered text — pointer model.
- ADR-0072 amendment pointer line (ADR-0070 precedent); update `test/adr-0072-wiring.test.js` in lockstep.
- Append default-expiry annotation on seq-13 (pending-confirmation wording; grant body untouched).
- Draft the four-item human list (seq-13 three-way verdict; amendment acceptance; generalization; grant-body).

Suggested skills: tdd (wiring sync); domain-modeling.

## T-4 — ② orphan-ancestry leg + ritual [D-005, D-006]

- Wiring leg: parse pinned/captured-at-head shas from committed round artifacts; assert `git merge-base --is-ancestor <sha> HEAD` per sha; red = no new claims/no seal; register gates.json entry + fixture tests (orphaned + ancestor-positive fixtures).
- Mechanized trigger: gitbutler/workspace HEAD non-fast-forward vs last seal record → leg red.
- AGENTS.md working-agreement ritual (post-restack re-eval → errata → resume).
- ADR-0085 append-only pointer line with the verbatim derivation sentence + promotion hook; trend row kind:fix + governance_tooling_diff; α classification logged pending owner sign.

Suggested skills: tdd; neat-freak.

## T-5 — defer-0070 closure + bookkeeping [D-001; t27 D-007 schema]

- Seven-field closure row on defer-0070 (run_id=36142965743 / conclusion / verifiable_composition from the actual run / degradation_semantics w/ ADR-0040 quote / degradation_cause=defer-0072 secret / successor_defer_id=defer-0072 / closure_rule_verbatim + literal-execution statement). Grade=yellow.
- trend-inventory kind:fix row; CONTEXT.md terms registered inline as they resolve (domain-modeling).

Suggested skills: neat-freak.

## T-6 — Human-authority package drafts + closeout [D-001]

- Drafts (no execution): tag adjudication memo (5cb2a9fe co-naming recommended); seq-13 three-way; countersign queue expansion; ratchet-brake adoption item.
- Round closeout per ADR-0085 regime: battery → report (claim point) → terminal wave → `.scratch/grill-t28/SEAL` (seal + recorded_at) → USER tag adjudication.
- If audit surfaces >6 new decision lines → split t28a/t28b (D-001 vi).

Suggested skills: neat-freak; handoff.
