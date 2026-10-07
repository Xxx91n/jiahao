captured-at-head: 0c189a875aa7deeb704bb4925ca9fb0c040b1138
<!-- loop-3 audit pin = settled-tree tip at evaluation (workspace merge
     eb5f49c2 above it is ephemeral). Seal/declaration anchor is
     f8765408; this pin names the full evaluated tip including the
     settled-map commits. -->

# grill-t30 second-party re-audit (loop 3) — PASS

Auditor: Devin. Subject: the loop-2 residual repair wave —
`e9c80749` (ERRATA E-19 + AGENTS closeout leg + taxonomy/anchors),
`a5798ed6`/`b16e2f43`/`5c0e859e` regen class, seal wave `f8765408`
(`seal: e9c80749`), claim wave `57acf678` (report/handoff rev-3),
audit-lane re-lands `310203ac` (FAIL report byte-identical) +
`bf49cbc9` (reaudit report byte-identical) + settled-map `3f147ae1`/
`0c189a87`.

Verdict: **PASS.** Every loop-2 residual item is discharged and the
full acceptance battery is green at audit HEAD — independently re-run,
not trusted from the fix window's claim. Prior reports:
`reports/2026-09-27-audit-report.md` (loop-1 FAIL),
`reports/2026-09-27-reaudit-report.md` (loop-2 bounded residual).
Evidence: `.scratch/grill-t30/audit-evidence/rerun/loop3-*.txt`
(never-commit nc-001) — 2 battery captures + 1 quick-legs capture.

## 1. Hard acceptance — re-run at audit HEAD (2026-09-27)

| Command | Result |
| --- | --- |
| `node scripts/run-test-gate.js --expected-suites 86` | **86/86 suites, 1471/1471 tests, exit 0** |
| `node scripts/run-gates.js` | **exit 0** — 42 entries; `[208 rewrite-map]` back to PASS; 4 ci-mode UNVERIFIABLE registered; 3 advisory warnings (instrument-identity, governance-inventory) |
| `node scripts/build-rewrite-map.js --check` | OK — 3394 doc citations in sync; orphan rows carry honest `unresolved hex literal` labels |
| `node scripts/build-rewrite-map.js --published-only` | OK — 3394 covered, published-side ancestry verified vs origin/main |
| `node scripts/check-map-freshness.js` | OK — 3 claim-surface commits verified tree-internally (`57acf678` claim wave + `310203ac` + `bf49cbc9` audit re-lands) |
| `node scripts/check-orphan-ancestry.js` | OK — 127 pins / 20 unique shas ancestral; 3 errata-exempt (t29 `b61d7951` E-17; audit `8942e2d8` E-18; reaudit `c22c01ae` E-19) |
| `node scripts/check-anchoring-footer.js` | OK — 52 post-registration commits verified against `git show --name-only` |
| `node scripts/check-deferred.js` | OK — 69 entries (56 live, 13 closed/actioned) |
| `node scripts/build-governance-anchors.js --check` | OK — 18 artifacts in sync |
| `node scripts/build-adapters.js --check` | OK — 54 adapter files regen-diff clean |
| `evaluateRound(grill-t30)` | claims 3 / bad 0 / unregistered 0; seal `declared == expectedAnchor e9c80749`, `declarationCommit f8765408`, inFlightClean, capturesAtSealOk, freezeViolations `[]`, amended false, adjudicated tag absent (owner-side) |
| `npm pack --dry-run` | 419,403 bytes < 470,000 cap |

## 2. Loop-2 residual — discharge evidence

- **ERRATA E-19** (`docs/governance/ERRATA.md`): registers the full
  orphan roster — `ad5a6393`/`7aa9391d` (rev-2 §3.3 prose cites whose
  map labels drifted), the complete rebuild orphan set
  (`a15e8c0f`/`d6ffb5b8`/`703b935d`/`8942e2d8`/`c22c01ae`/`9b47afdf`),
  and this rebuild's own superseded waves
  (`cf5e42c7`/`8a6855f3`/`0c9b1c94`/`08a2ab9a`, cited only in commit
  messages/pool prose — correctly scoped). Successor lineage is named
  by ROLE, not sha — the right call, since the successors' own shas
  shifted under the rebuild. Prospective exemption for the reaudit pin
  `c22c01ae` landed pre-emptively (now third `errata_exemptions` row,
  pending-confirmation).
- **Reading B adopted — AGENTS.md wave-closeout gains the final leg**:
  "after the LAST `but` mutation (commit/uncommit/move/restack) settles
  and before declaring, re-run `--check` against the settled tree — the
  interval between a workspace rewrite and evaluation is the F-6
  exposure window; never declare inside it." The fix window reports the
  leg caught a fourth recurrence live during this very repair. This is
  the convention fix the audit recommended; three recurrences
  (E-12/E-17/E-19) all lived in that gap.
- **Commit structure clean**: `e9c80749` = AGENTS+ERRATA+taxonomy+anchors
  only; `f8765408` = SEAL+map only; `57acf678` = report+handoff+map only;
  re-lands carry audit report + map only.
- **Byte-identical re-lands verified**: audit report blob `7630331c…`
  identical at `9b47afdf` (loop-1 original) and `310203ac` (re-land);
  reaudit report blob `6a0482ad…` identical at `832a2a62` and `bf49cbc9`.
- **SEAL coherence**: `.scratch/grill-t30/SEAL` declares
  `e9c807493a501179695676892cc4e0de6e3fd7b7` == `git rev-parse e9c80749`;
  declarationCommit `f8765408`; report+handoff rev-3 pin
  `captured-at-head: f8765408` — the declaration commit, per convention.
- **Disclosure quality**: the fix-window process note (the
  `but amend --target <branch>` mis-application, pop+rebuild via
  `--target srq` change-id) is stated plainly in commits — red-state
  disclosure, not silent repair.
- Nothing pushed: `git log origin/main..HEAD` = 27 local commits.

## 3. Residual notes (non-blocking, owner-side or next-round)

- `errata_exemptions` rows for E-17/18/19 remain `pending-confirmation` —
  owner adjudication (ratify/revoke) per the ADR-0086 lifecycle; they are
  effective while pending.
- Report rev-3's §2 table keeps captured-at-time cells that drift again
  ("4 claim-surface commits" vs current 3, "35 post-registration" vs 52,
  "3219 citations" vs 3394) — same captured-at-head semantics as prior
  rounds; cosmetic.
- The `--check` leg remains inherently live-state-sensitive (F-6 by
  design); the new settled-tree leg is the registered mitigation — any
  future restack can red leg-208 again and the machinery will report it
  honestly.
- CodeBuddy SCED trial not executed (owner-side boundary — correctly not
  claimed by any artifact).

## 4. Verdict

**PASS.** The round delivers: CodeBuddy adapter bundle (verified
self-contained, regen-clean, pending-confirmation channel honest),
preregistered SCED protocol (JL-1..5, frozen detector pin byte-verified),
leg-224 map-freshness enforcement (tree-internal, fail-closed,
hardened through two audit loops), ADR-0087 normative carrier, and —
through the audit loops themselves — three registered errata
(E-17/E-18/E-19) plus a durable closeout-order amendment. The failure
class that burned three loops is now convention-gated and mechanically
detected at every layer.

Audit handoff: `handoffs/2026-09-27-audit-handoff.md` (next-grill
direction inside).
