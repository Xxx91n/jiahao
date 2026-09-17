# grill-t12 → next round — persistent task book

Source of truth: ../decision-ledger.md (D-001..D-004, all current)
Spec: ../spec-closure-and-stewardship.md

## T-1 — R1 documentation round (covers D-002, D-003, D-004)

- Create ADR-0073: provenance class registration (organic / automated_harness /
  synthetic_selfcheck / unclassified + session→project-dir mechanical rule +
  unclassified conservative fallback); G1 amendment candidate text
  "≥200 organic Stop events carrying lane records" (forward-effective,
  tightening-direction post-hoc amendment); carried-item dispositions
  (F-A1/O-1/W-1/O-2 registered wording); bake stewardship protocol (dry-run
  shape, checkpoint cadence, diversity-qualifier framework).
- Append note on ADR-0070 (amended-by marker + amendment note block, append-only).
- Register agendas in deferred-registry where appropriate: collection-side
  provenance field (instrument agenda), pre-commit scanner (gitleaks class),
  organic routing-rate watch item; diversity N/M values = pre-review
  pre-registration, NOT deferred-registry.
- Sync: anchors.json (+ t12 ledger + ADR-0073), governance inventory, README
  ADR index, wiring-test seed for 0073.
- Instrument event for the doc round (bounded delegation form: scope+expiry).

## T-2 — R2 action round (covers D-002, D-003, D-004)

Ordering inside the round:
1. .gitignore first (/*.tgz + host-config-backup/), THEN untracks — rule
   before removal, prevents re-occurrence.
2. F-A1: untrack jiahao-0.0.1.tgz; re-run gate:all + instrument --check +
   git ls-files|grep tgz=empty; registry/report wording must say
   "untracked, history blob retained" — never "removed".
3. O-2: untrack .scratch/grill-t11/host-config-backup/; forward rule
   recorded; exposure-window note (committed 05fa697, never pushed to origin
   = zero external exposure window).
4. O-1+W-1 same commit: host-contracts.json claude-code transcript_file
   present→measured-present; three claim homes sentence-1 parenthetical with
   mandatory evidence layer "live-observed: independent-audit reproduction +
   automated-harness events; organic pending"; substrate note listing the
   differing files (instrument-state.json, check-host-contracts.js) and the
   behavioral-equivalence argument (hook path unchanged). Wiring seed lives
   in adr-0072-wiring "capability-label semantics fix".
5. Provenance relabel: classify all existing lane records via
   session→project-dir mapping (mechanical, analysis-side); extend
   pairer-lane-telemetry with segmented output; produce first segmented
   summary (expected: organic=0, automated_harness=29, synthetic_selfcheck=2).
6. Dry-run the flagged-adjudication protocol end to end; record the output
   (expected: post-exclusion population empty).
7. Round report + handoff update.

## T-3 — Registrations (covers D-002, D-003)

- Diversity-qualifier framework text into ADR-0073; numeric values
  pre-registered before any promotion review.
- Forward rule text: host config backups never enter git-tracked dirs.
- Exposure-window record and scanner agenda entries as in T-1.

## Hard rules

- Frozen gate stays frozen except the registered G1 amendment path
  (tightening-only). Never loosen a criterion after seeing data.
- Never delete ledger/chain records; classification is labeling, not removal.
- Never claim flat "all done"; verdicts are two-layer (record/issue).
- No synthetic bake traffic; single-operator traffic supports
  plumbing-health claims only.
- but (GitButler) for all VCS writes; never push unless asked.
- Host config changes need separate owner confirmation.

## Suggested skills

$implement + $tdd for the flip + telemetry segmentation (wiring seed exists);
$code-review + post-round audit pattern at close; $domain-modeling for
ADR-0073 wording; $neat-freak for sync surfaces; $but for VCS; $handoff at
close.
