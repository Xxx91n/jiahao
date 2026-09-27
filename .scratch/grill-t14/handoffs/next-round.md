# grill-t14 → next-round task book (2026-09-17)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-005 all current). Spec: ../spec-disposition-preregistration.md.

## Rerunnable state (verified at t13 close)

- `node scripts/run-test-gate.js --expected-suites 71` → 71/71, 1148 tests
- `node scripts/run-gates.js` → exit 0
- `node scripts/check-secret-scan.js` → 3 rules 0 hits
- `node scripts/build-rewrite-map.js --check|--verify` → 1182 citations, 15 pairs
- `node scripts/check-deferred.js` → 52 entries
- `node scripts/instrument.js --check` → OK; seq 24 pending_signoff
- `node scripts/check-pack-smoke.js` → 322314 < 340000
- remote main = a8e0bdb (t13 stack published; push agenda resolved as fact)

## T-1 — R1 documentation round (D-003, D-004, D-005)

Produce ADR-0075 "promotion-review preregistration pack":

- N/M sufficiency qualifier on G1's organic corpus: single proposition
  events>=200 AND sessions>=20 AND intent-classes>=5; qualifier carries no
  independent pass state (D-003).
- <=8-class intent taxonomy with per-class definitions; unknown catch-all
  never counts; >=K=2 sessions per class to count; classifier version+prompt
  hash pinning rule; independence = distinct non-self-test session_id
  (measurability boundary stated); values justified as loosest defensible
  under tightening-only (D-003).
- Sunset trigger clause: dual-or-path (6 consecutive zero quarterly
  check-ins OR defer-0055 closure-without-activation) → sole consequence
  activation of the scheduled strategic review, recorded as ledger event;
  watchdog lifecycle independence stated (D-004).
- Blocking meta-requirement + criteria shape (>=1 organic-falsifiable kill
  condition; no G1/G3/G4 amendment; tighten-only later) (D-004).
- defer-0055 row gets a pointer to the clause only (D-004).
- Registry edits: defer-0059 tally row (this round's net-addition); README
  ADR index rebuild; wiring-test seeds; anchors sync (D-005).
- R1 exit criterion: all preregistration content frozen as text before R1
  closes; boundary commit green.

Hard rules: no G1/G3/G4 amendment; no strategic content inside the clause;
no write-time fields (defer-0053 frozen); taxonomy via amendment procedure
only.

## T-2 — R2 action round (D-002, D-005)

Ordered:

1. defer-0051 re-measurement: `npm pack --dry-run --json`, capture size field
   → evidence packet (D-002).
2. Fresh-session second-party agent countersigns the packet declaring
   weak-independent grade (D-002).
3. defer-0051 registry row → closed + discharged-by-trigger + closure note
   (single-point semantics; trend duty in pack-smoke) + ledger
   trigger-override annotation (D-002).
4. Telemetry checkpoint — standing cadence (D-005).
5. trend-inventory row for this round; net-addition → defer-0059 (D-005).
6. Round report: states the countersign covered one item (NOT a round
   audit); push fact annotation (remote main already a8e0bdb at grill
   time); dispositions listed as routine review surface for the next
   audit (D-005).

Hard rules: no preregistration edits during R2 (frozen at R1); no pushing
(owner-only domain); closure note must carry the single-point caveat.

## T-3 — owner asks (D-001, D-002, D-005)

Two separate asks, each independently pull-able:

- Ask A (record-type): instrument seq 24 sign-off.
- Ask B (judgmental): owner ratification of the defer-0051 evidence packet
  — the same packet the agent countersigned; double signature, one artifact.

No bundling — the ratification keeps its own accept/reject exit.

## Suggested skills

- grill-with-docs / grilling — if new decisions surface mid-execution
- domain-modeling — CONTEXT.md term discipline for ADR-0075 concepts
- neat-freak — closeout reconciliation; report merged/deployed/live-verified
  distinctly
- handoff — next handoff regeneration
- gitbutler — all VCS writes (`but`)
- atomcode-research — serialize; only if a decision needs external grounding

## Suggested branch

grill-t14-docs for T-1 artifacts; R2 may ride the same or a stacked branch
per the GitButler session-branch convention.
