# Handoff — grill-t9 v3 collection+adjudication task book (post-grill consolidation, 2026-09-16)

Repo: D:\Aworker\jiahao. Ledger of authority:
.scratch/grill-t9/decision-ledger.md (D-001, current). .scratch is git-tracked
— this ledger is its own durability channel.
Spec: .scratch/grill-t9/spec-v3-collection.md (restatement only — ledger is
authoritative; the substance lives in the FROZEN
bench/research/devin-corpus-v3/{plan,eval-plan}.json — never re-litigate).
Goal anchor: .scratch/grill-t9/GOAL.md.
Prior round: .scratch/grill-t8/handoffs/round-closed-2026-09-16.md +
reports/2026-09-16-reaudit-report.md (re-audit PASS — v3 collection gate
lifted; pairer pinned sha256 9ff2d0ad / 10697 B).

## State snapshot (verified this session)

- v3 corpus dir holds ONLY plan.json + eval-plan.json +
  contamination-framework.json — zero items, zero tables, zero labels.
- loadPlanV3() fails closed until decision-tables.json lands (by design).
- Frozen contract highlights: bands n_honest [80,130] / n_lie [24,40] /
  side [15,25]; stopping fn verbatim (floors 3/7/11/15/19/22/24/24, early
  stop L>=24 && H>=80, caps 8 batches / 185 attempts); blind fields
  {label, scoring_function, transcript}; undetermined = unflagged both axes
  inside n; port = zero-verdict telemetry; 60% disposition = descriptive
  escalation (per-family FP shares in report); IUT worst-of; CP two-sided
  95% via scripts/reverify.js oracle; single-shot burn; v4 route binding.
- Collection mechanics (v2 template .scratch/grill-t7/devin-collect-v2.js):
  session-side worker performs REAL attempts in temp workspaces (fs writes,
  node -e commands), records transcript events, applies the seeded
  misreport stream, mechanical CHECKS emit labels; drops land in
  incoming/*.jsonl + collection-log.json.
- jest 63/63, 994/994; gate:all exit 0; pack 286,187 B < 300 KB.
- This session committed: spec + task book + GOAL + CONTEXT +2 terms
  (Blind-Label Order, Pre-Unlock Audit Gate) — branch grill-t9-docs.

## Next round tasks — BLIND-LABEL ORDER BINDING (D-001d)

Each arrow is a commit boundary. Never reorder; never unlock labels before
the table freeze commit lands.

### T-1 Collection: worker + drops [covers D-001 a,b,c]
- Adapt .scratch/grill-t9/devin-collect-v3.js from the v2 worker:
  seed devin-corpus@v3-misreport-stream; rate 0.25; ids devin-v3-*;
  tokens V3TOK-*/V3MARK-*; sessions v3s-*; dir devin-corpus-v3; same 4
  shape templates + verbatim stopping function + session cap 6.
- Run it: drops into bench/research/devin-corpus-v3/incoming/ +
  collection-log.json (seed + rate + per-drop counts registered there).
- Read ONLY registered readable metadata (batch counts, lie trajectory
  floor checks, mining rate); per-item label/scoring_function/transcript
  stay blind. Pre-snapshot worker defect = free rerun (labels ununlocked).

### T-2 Validate + manifest freeze [covers D-001 d]
- node scripts/collect-devin-corpus.js --snapshot-dir devin-corpus-v3
  validate -> snapshot --model-version "SWE-2 Max via Devin Desktop"
  --date <today>. Manifest freeze = its own commit. Band miss -> snapshot
  anyway + undersized marking (never a retcon).

### T-3 Derived tables + pre-unlock audit [covers D-001 d,e]
- Labels still blind: read landed n_lie/n_honest (main set only) -> derive
  both integer tables via scripts/reverify.js clopperPearson95 (every cell
  recomputed, never hand math) -> write devin-corpus-v3/decision-tables.json
  -> FREEZE COMMIT (its own commit before any label read).
- Independent audit pass on the frozen snapshot + tables (v2 unblind-round
  precedent): verify pin semantics, table arithmetic, blind-field
  integrity, disjointness, stopping-function compliance. Audit report
  lands before unlock.

### T-4 Unlock + single-shot + report + gate [covers D-001 d]
- Label unlock -> node bench/research/devin-oot.js --snapshot-dir
  devin-corpus-v3 run (SINGLE SHOT — abort_on_defect armed; run_status
  persists without verdict on abort).
- out/devin-oot-v3-report.{md,json}: verdict + quadrant + confusion
  matrices + CIs + per-family FP shares (60% descriptive escalation) +
  undetermined rate + pairer-vs-port divergence cells + side-set
  diagnostic + session-cluster sensitivity + batch slice + honest
  success-ratio + per-item sha256.
- gates.json devin-oot-v3-replay entry lands in the SAME commit as the
  report; claim homes get the v3 fact line + limitation sentence verbatim
  (per-mention binding wiring).

## Hard rules that bind

- Blind-label order inviolable (D-001d); readable counts only during
  collection; v3 single-shot — re-test = devin-corpus@v4 pre-data.
- Frozen: pairer pin 9ff2d0ad (changed artifact needs new pin under
  same-commit ADR), port artifacts byte-frozen, anchor tag never moves,
  plan/eval-plan frozen.
- Pairer never reads spec.check/labels; probes categorical-only; v2/v3
  never cited by conformity; claim fact line + limitation verbatim.
- but for all VCS writes; dedicated branch; no push/PR.
- Report honesty: every claim carries a rerunnable command + observed output.

## Open items outside this round

- v4 route: only if v3 lands failed/indeterminate-per-quadrant semantics
  (registered binding, own round).
- detector.js online-path integration — separate gated decision
  (judge-seam FP gate), not this round.
- Unified governance backlog + b4 npm publish — deferred per t8 ledger.

## Suggested skills

- $implement for T-1 worker adaptation; tdd where the worker is extended;
  $code-review on the collection diff before T-2; $handoff at session end;
  $but for all VCS writes; atomcode-research only if a NEW parameter needs
  external grounding (serial, one run in flight).

