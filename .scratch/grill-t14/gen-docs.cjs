const fs = require('fs');
const path = require('path');
const ROOT = 'D:/Aworker/jiahao';

const spec = `# grill-t14 spec — disposition + preregistration round

Source of truth: .scratch/grill-t14/decision-ledger.md (D-001..D-005, all current).
Status: SETTLED 2026-09-17. Execution follows handoffs/next-round.md.

## §0 — headline

t13 closed with the full stack published (remote main a8e0bdb) and the
promotion gate honestly frozen (organic=0). This round converts the residue
into registered form: close the audit-flagged registry item, pre-register the
promotion review's parameters (N/M + sunset trigger) before any data exists to
game them, and hand the remaining human signatures to the owner as separate
asks. Nothing here asserts a new product claim; the strongest artifact is a
pre-registration — its value is that it cannot be argued with later.

## §1 — round boundary (D-001)

Six agenda items, bound:

1. Push request — externally satisfied during the grill (remote main reached
   a8e0bdb); residual = fact annotation in the R2 report, not a decision.
2. defer-0051 — disposition now (trigger beats calendar).
3. instrument seq 24 — human sign-off, separate owner ask.
4. Standing cadence (defer-0053/0055/0057/0058, O-E) — consent confirm.
5. N/M preregistration — designed and frozen this round.
6. organic=0 terminal — resolved as a bounded sunset trigger clause, not a
   strategy debate.

### Explicitly out of scope (with rationale)

- Strategic go/kill review on the conviction lane — scheduled only; the sunset
  trigger is its activation condition (D-001). Opening it now would decide the
  gate's fate while its own criteria are being invented.
- Any G1/G3/G4 threshold amendment — post-hoc move banned; the gate is frozen
  not broken.
- Re-litigating G1 semantics — the clause references ADR-0070/0073 only.
- Source-code edits — grill discipline.
- The push itself — already executed externally; owner-only domain.

## §2 — defer-0051 disposition (D-002)

Path: R2 runs \`npm pack --dry-run --json\` re-measurement → evidence packet →
fresh-session second-party agent countersigns (weak-independent declared) →
owner ratifies THE SAME packet → registry records closed +
discharged-by-trigger + closure note stating "1 data point existence check;
trend duty lives in the pack-smoke gate" + ledger records the explicit
trigger override of review_at=2026-12-15.

Why this shape: owner-only signature = self-review threat; agent-only lacks
closure authority; the two slots are different (checker independence vs
sign-off authority). Precedent: ADR-0062/0064/0065/0066 ratify-then-countersign.

Guards: both signatures on one packet; a closure note without the
single-point caveat is a future audit-bounce; cap watch continues in
check-pack-smoke.

## §3 — N/M preregistration (D-003)

N/M is a sufficiency qualifier on the same organic corpus G1 counts — single
proposition: events >= 200 AND sessions >= 20 AND intent-classes >= 5. The
qualifier produces NO independent pass state.

M via analysis-side transcript classification + pre-registered <=8-class
intent taxonomy (feature / bugfix / refactor / docs / exploration / ops / qa /
other scale). Four implementation requirements, all frozen in the artifact:

1. taxonomy + per-class definitions registered before data arrives (organic=0
   is a contamination-free window);
2. mandatory \`unknown\` catch-all — unknown never counts toward M;
3. a class counts toward M only with >= K=2 independent sessions hitting it;
4. classifier version + prompt hash pinned into the review record; taxonomy
   changes go through the amendment procedure.

Values: N>=20, M>=5 — loosest defensible bounds under tightening-only
asymmetry (tighten later, never loosen). N operationalized as distinct
session_id not marked self-test — the measurability boundary (no user-id
field) is written into the preregistration.

## §4 — sunset trigger clause (D-004)

Dual-or-path, first to fire wins:

- path A: N=6 consecutive zero-organic quarterly check-ins (parallel counter
  on the same cadence as defer-0055, independent lifecycle, organic>0 resets);
- path B: defer-0055 closes while the review has not activated.

Sole consequence: activate the scheduled pre-registered strategic review and
record the activation event in the decision ledger. The trigger does not
amend, close, or exempt the gate (ADR-0035 precedent: assertions SUGGEST
activation; disposition stays human).

Carrier: same preregistration ADR as the N/M pack (ADR-0075); defer-0055's row
carries only a pointer.

Meta-requirement (blocking): the strategic review must register its full
evidence criteria before evaluating anything — output without prior
registration is void. This round registers only the requirement plus criteria
SHAPE: >=1 kill condition falsifiable in the organic-event corpus; criteria
must not amend G1/G3/G4; criteria may only tighten later.

## §5 — closeout form (D-005)

- No independent audit — ADR-0074 trigger conditions unmet (no external
  claim, no sanitized-zone touch, no risk threshold). Self-check battery +
  owner approval closes the round. The round report must state the
  countersign covered one registry item, NOT the round.
- Two separate owner asks — seq 24 sign-off (record-type) and defer-0051
  ratification (judgmental, keeps its own accept/reject exit). Bundling would
  bury the judgment call.
- R1/R2 split with frozen-text exit criterion: R2-needed preregistration
  content (N/M values, sunset clause, taxonomy, meta-requirement) is frozen
  text at R1 close; the R1→R2 boundary must be green (intermediate red
  commits allowed per O-B convention).

## §6 — negative-requirement union

- No G1/G3/G4 amendment; no strategy this round; no source edits in grill.
- No owner-only signature on judgmental packets (self-review threat).
- No independent N/M leg; no write-time fields (defer-0053 frozen); no
  claim-family reuse; no symbolic parameter registration.
- No binding sunset to the watch's closes_if alone (dependency inversion); no
  auto-disposition; no record-only trigger.
- No audit performed may be reported as one; no bundled owner asks.
- Numbers may tighten later, never loosen.
`;

const taskbook = `# grill-t14 → next-round task book (2026-09-17)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-005 all current). Spec: ../spec-disposition-preregistration.md.

## Rerunnable state (verified at t13 close)

- \`node scripts/run-test-gate.js --expected-suites 71\` → 71/71, 1148 tests
- \`node scripts/run-gates.js\` → exit 0
- \`node scripts/check-secret-scan.js\` → 3 rules 0 hits
- \`node scripts/build-rewrite-map.js --check|--verify\` → 1182 citations, 15 pairs
- \`node scripts/check-deferred.js\` → 52 entries
- \`node scripts/instrument.js --check\` → OK; seq 24 pending_signoff
- \`node scripts/check-pack-smoke.js\` → 322314 < 340000
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

1. defer-0051 re-measurement: \`npm pack --dry-run --json\`, capture size field
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
- gitbutler — all VCS writes (\`but\`)
- atomcode-research — serialize; only if a decision needs external grounding

## Suggested branch

grill-t14-docs for T-1 artifacts; R2 may ride the same or a stacked branch
per the GitButler session-branch convention.
`;

const terms = `**Discharged-by-Trigger (触发销账)**
A calendar-scheduled registry review item discharged early when an explicit
trigger — an audit finding or equivalent event — fires before its review_at
date. The override is legitimate only when the ledger records it explicitly
as a trigger-overrode-calendar event; silently skipping the date is a silent
direction change (ledger t14 D-001, D-002).
_Avoid_: waiting out a stale calendar date after a trigger has fired;
discharging without the explicit ledger note; re-binding the item to a
future scheduled review instead of closing it

**Sufficiency Qualifier (充分性限定词)**
A diversity qualification applied to the same corpus a count leg measures:
the proposition is single (count ∧ sessions≥N ∧ intent-classes≥M) and the
qualifier produces no independent pass state. Values are pre-registered as
the loosest defensible bounds under tightening-only asymmetry — tighten
later, never loosen (ledger t14 D-003).
_Avoid_: an independent diversity leg (a small-but-diverse corpus would
bypass the count's intent); symbolic parameters without values; reusing an
unrelated field as the diversity measure

**Sunset Trigger (日落触发器)**
A pre-registered dual-or-path clause — a parallel zero-observation counter
or the watch's closure without prior activation, whichever fires first —
whose sole consequence is activating a scheduled review; it never amends,
closes, or exempts the thing it watches. Its clock must be lifecycle-
independent of the watched item (watchdog independence) so the hole it
exists to close stays unreachable (ledger t14 D-004).
_Avoid_: binding the trigger to the watched row's own expiry field
(dependency inversion); auto-executing dispositions on a timer; record-only
triggers that convene nothing

**Meta-Preregistration (元预注册)**
Registering now the obligation that a future review must register its own
evidence criteria before evaluating — blocking, so output produced without
prior registration is void. The frame may fix criteria shape (at least one
falsifiable kill condition; no amendment of frozen thresholds) without
fixing values that would go stale before the review convenes (ledger t14
D-004).
_Avoid_: writing full criteria years ahead of the review (stale on arrival);
advisory-only meta-requirements; criteria that quietly loosen between
registration and evaluation

`;

const goal = `# grill-t14 GOAL

Restored context from .scratch/grill-t13/handoffs/2026-09-17-t3-audit-passed.md.
Grilled the next-round decisions; ledger at decision-ledger.md is authoritative.

Status: SETTLED 2026-09-17.
- Spec: spec-disposition-preregistration.md
- Task book: handoffs/next-round.md
- Ledger: decision-ledger.md (D-001..D-005, all current)
`;

const dir = path.join(ROOT, '.scratch/grill-t14');
fs.writeFileSync(path.join(dir, 'spec-disposition-preregistration.md'), spec);
fs.writeFileSync(path.join(dir, 'handoffs/next-round.md'), taskbook);
fs.writeFileSync(path.join(dir, 'GOAL.md'), goal);

const ctxPath = path.join(ROOT, 'CONTEXT.md');
const ctx = fs.readFileSync(ctxPath, 'utf8');
const marker = '## Decision Log';
const idx = ctx.indexOf(marker);
if (idx === -1) throw new Error('Decision Log marker not found');
const next = ctx.slice(0, idx) + terms + ctx.slice(idx);
fs.writeFileSync(ctxPath, next);
console.log('written: spec ' + spec.length + 'B, taskbook ' + taskbook.length + 'B, CONTEXT ' + ctx.length + '->' + next.length);
