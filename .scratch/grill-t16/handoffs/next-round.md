# grill-t16 → next-round task book (2026-09-18)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-005 all current). Spec: ../spec-fix-mechanisms.md.

## Rerunnable state (auditor-verified at t15 close — re-run before relying)

- `node scripts/run-test-gate.js --expected-suites 73` → 73 suites / 1194 tests / 0 skipped
- `npm run gate:all` → exit 0
- `node scripts/check-deferred.js` → 55 entries (47 live, 8 closed/actioned)
- `node scripts/build-governance-anchors.js --check` → 15 artifacts in sync
- `node scripts/check-governance-inventory.js` → 35 entries + trend advisory
- `node scripts/build-rewrite-map.js --check` → 1403 citations in sync
- `node scripts/check-ci-jobs.js` → exit 1 (defer0004 unmet — correct per narrowed semantics)
- `node scripts/instrument.js --check` → authoritative; conditional cert to 2026-12-11
- `npm pack` → 329844 B (< 340000 cap)
- origin/main = 21b1442; grill-t15-docs = 9 commits UNLANDED (owner-domain)
- workspace: three intentionally untracked audit patches (tq=t13, nl=t14,
  xu=t15 — NEVER commit; but commit needs explicit IDs)

## T-1 — R1 documentation bundle (D-002 B2+B3, D-003, D-004 partial, D-005)

Produce ADR-0077 "verifier exit convention + mechanism-output artifacts +
round-report facts canon" plus:

1. ADR-0077: amends ADR-0076 D-B(2) wording explicitly (pointer/status line
   on 0076; the flagged phrase superseded in both places); carries the
   exit convention, the mechanism-output convention, the facts-canon line,
   the not-in-anchors reason, and the addendum narrowing (D-002/D-003/D-004).
2. docs/governance/surface-taxonomy.json: mechanism_outputs closed
   enumeration {file, generator, replay_verified}; diff_semantics reworded
   (files[] = machinery-source hand-edits; faithful-regeneration exemption;
   hand-edit = named heavier violation) (D-003).
3. check-governance-inventory: accept optional mechanism_output_diff
   {files,reason}; validate listed files ∈ mechanism_outputs; bare marker
   hard-fails; never feeds burn-rate (D-003).
4. t15 trend row additive-only annotation (the two touches are the output
   class); historical booleans untouched (D-003).
5. Wiring: mechanism_outputs enumeration assertions (every entry R2,
   generator exists, no unlisted exemption claims) — adr-0076 or adr-0077
   wiring file (D-003).
6. CONTEXT.md: +convention term (exit keyed to consuming row) + facts-canon
   term; the CONTEXT edit doubles as B3's coupling anchor (D-002/D-004).
7. Registry: defer-0004 rationale gains explicit "ADR-0058 D-C" citation —
   SAME COMMIT as the CONTEXT change (F-C, D-002 B3); defer-0062 tally row
   (this round's net addition); t15-row annotation as above.
8. Ledger T-section: one consent-sweep disposition line per cadence item
   (defer-0060, sunset 1/6, SLA rows, O-E) — never "audit response" (D-005).
9. README ADR index 77; anchors regen if a tracked artifact changed.
10. R1 exit: boundary commit green; all R2-needed text frozen (fixture
    expectations, registry JSON, convention wording).

Hard rules: R1 touches no R1/R2 file this round (no carve-out needed);
pins are mechanism vocabulary; the convention is worded "currently
consuming".

## T-2 — R2 implementation bundle (D-002 B1, D-004, D-005)

Ordered:

1. check-ci-jobs fix — ONE COMMIT: exit = defer0004.satisfied; defer0026
   legs stay computed + printed; header rewritten (F-B); main() catch →
   exit 2 + stderr; comment block with convention + discharge re-point
   clause; adr-0058-wiring fixtures (three directions + crash fixture +
   defer0026 leg assertions retained) (D-002).
2. scripts/build-round-facts.js + round-facts.json schema
   (battery_as_of_commit, report_commit:null, not_run[]); report facts
   section deterministically rendered; render-pin wiring test (D-004).
3. F-E nits: adr-0069 stale comment; surface-taxonomy.js dead m[1]||m[2];
   any_matrix inline regex (`matrix:s*{` edge); CONTEXT carve-out gloss
   (inventory-row channel restored); ledger 1346→1403 correction (D-005).
4. Round report: facts section rendered from the artifact; disclosed items
   — defer0026 now wiring-layer-only at runtime; addendum narrowing;
   explicit-change-IDs lesson; carve-out not invoked (streak resets)
   (D-002/D-004/D-005).
5. Consent-sweep ledger lines completed at disposition time (R2 verifies
   one line exists per cadence item).

## T-3 — owner surface (D-005)

- ZERO asks this round. Awareness annotations only: grill-t15-docs stack
  (9 commits) unlanded — owner-domain; defer-0060 owner actions sit in its
  unfreeze_if (quarterly review 2026-12-15); sunset counter stays 1/6 until
  the 2026-12-15 observation.

## Suggested skills

- $implement — R1/R2 execution
- $tdd — wiring fixtures + render pin at agreed seams
- $code-review — before each commit
- $domain-modeling — CONTEXT/ADR authoring
- $handoff — next checkpoint
- atomcode-research — contested dispositions
- gitbutler (but) — ALL VCS writes; explicit change IDs always
