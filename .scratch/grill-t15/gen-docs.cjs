// grill-t15 doc generator — spec + task book + GOAL + CONTEXT terms.
// Source of truth: .scratch/grill-t15/decision-ledger.md (D-001..D-007).
const fs = require('fs');
const path = require('path');
const ROOT = 'D:/Aworker/jiahao';
const SCRATCH = path.join(ROOT, '.scratch/grill-t15');

// ---------- spec ----------
const spec = `# grill-t15 spec — disposition + mechanisms round

Source of truth: .scratch/grill-t15/decision-ledger.md (D-001..D-007, all current).
Status: SETTLED 2026-09-18. Execution follows handoffs/next-round.md.

## §0 — headline

t14 closed LANDED (origin/main 21b1442) with the audit PASS-with-findings.
This round converts the audit residue into registered dispositions and three
new mechanisms: the sunset counter gets a durable state host, spec-code
drift gets a bidirectional pin, and the documentation-round edit boundary
becomes a machine-checked taxonomy. The strongest artifact is the taxonomy:
from now on "what a documentation round may touch" is a file a test can
read, not a sentence people argue about.

## §1 — round boundary (D-001)

Eight agenda items, bound:

1. F-1..F-5 + audit nits — structured owner-adjudication items.
2. defer-0004 + defer-0026 — coupled human activation review (ADR-0035 D6).
3. Ask A (instrument seq-24 sign-off) + Ask B (defer-0051 ratification).
4. Sunset counter durable home.
5. Spec-sync enforcement proposal.
6. Edit-surface boundary + zero_product_diff semantics.
7. Permanently-red CI channel disposition.
8. Standing cadence (defer-0053/0055/0057/0058 + O-E) consent sweep.

### Explicitly out of scope (with rationale)

- Strategic review — sunset trigger inactive (counter 1/6); opening it
  bypasses our own preregistered mechanism.
- Promotion review — organic=0; no qualifying corpus exists under the N/M
  qualifier.
- G1/G3/G4 threshold amendment — banned (post-hoc move).
- Source edits during grilling — grill discipline.
- Deciding F-1 on the owner's behalf — Ask B carries accept/reject to the
  owner; the round only structures the ask.
- The two audit-evidence patches (t13 tq, t14 nl) — untracked forever.

## §2 — sunset counter durable home (D-002)

Dedicated git-tracked governance artifact docs/governance/sunset-counter.json,
admitted to the ADR-0061 anchors regen-and-diff chain. The ledger degrades
to an append-only audit trail; it is not the state host.

- Schema: trigger_ref="ADR-0075 D-C"; n_target=6; consecutive_zeros;
  observations[] {check-in date, organic event count, evidence ref, ledger
  ref}; reset_events[]; activation null|{...} as a one-way latch;
  verified_by.
- Semantics: organic>0 resets the counter to zero AND appends an explicit
  reset_event — no silent overwrite. A missed check-in is not a zero:
  absence of observation freezes the counter and records a missed_check_in
  event (operational tightening of D-C "consecutive quarterly check-ins",
  recorded here explicitly rather than introduced silently).
- Activation ordering: ledger first, JSON second, reciprocal references;
  activation only SUGGESTS the scheduled strategic review (ADR-0035 D6) —
  it never decides the review's disposition.
- Single writer = round disposition; telemetry produces evidence and never
  writes state (measurement vs bookkeeping separation).
- ADR-0075 D-C gains one pointer line; defer-0055 stays pointer-only; no
  defer row is opened for the counter.

## §3 — defer-0004/0026 dispositions (D-003)

- defer-0026 → status=actioned: the work was executed by ADR-0058 (ci.yml
  live-verified: gate-all + test(JIAHAO_TEST_TIER=public) + summary
  (always(), success-only seen==expected guard); all four predicates
  SATISFIED). actioned_via cites ADR-0058 + predicate verification +
  same-commit ledger note. limitation field records: required-check
  deployment remains a repo-admin action (platform 403) and CI green is an
  environmental condition (R10) — neither is the deferred work; prevents
  "actioned" reading as endorsement of the whole carrier problem.
- defer-0004 → re-defer narrowed: new unfreeze_if = ci.yml spans multiple
  workflow files OR any job declares a matrix OR job count >3. Status stays
  deferred; verified_by=check-ci-jobs.js with the predicate rewritten to
  match (else permanently-SATISFIED = alert fatigue, banned). rationale
  records "multi-job arrived via ADR-0058 and did not constitute sufficient
  reason for a renderer".
- ONE COMMIT: registry edit + predicate rewrite + predicate wiring tests
  (negative fixture). Disposition cites ADR-0058 D-C.
- Bans: activate (original rationale legs unshaken); close (real-options —
  the underlying appreciated, closing destroys a live tripwire); prose-only
  trigger (no verified_by → ADR-0033 D3 demotion to pending-evaluation).

## §4 — spec-sync check (D-004)

Extend test/adr-0074-wiring.test.js companion-docs describe block (spec
fixture already read):

- Spec-side pins: Inputs section contains git ls-files + ls-tree -r HEAD in
  near co-occurrence + the untracked convention word.
- Generator-side reverse pins: ls-tree/ls-files call-site existence — a
  unilateral drift on EITHER side turns the test red.
- No new gates.json entry (wiring tests already ride gate:all; registering
  a gate violates proportionality).
- The F-2 Inputs text fix (union enumeration semantics) lands in the SAME
  commit as the assertions.
- Convention recorded in the landing ADR/ledger: when an authoritative spec
  governs a generator, its wiring test pins the semantic contract points
  bidirectionally — the pre-answer for the second spec-code pair.
- Pin discipline: mechanism vocabulary only; never prose, line numbers,
  section order, full sentences, or SHAs. Residual accepted honestly: only
  asserted dimensions are checked.

## §5 — edit-surface taxonomy + zero_product_diff (D-005)

New ADR-0076 registers the three surfaces:

- R1 runtime: the bin require-chain closure (install.js + resolve.js +
  src/shared/paths + src/evidence-log/**; hooks/ and thresholds.json are
  classified BY the closure scan, not by hand). Absolutely forbidden in a
  documentation round — no carve-out.
- R2 governance: check-*/build-*/run-*/collect-*/derive-*/eval-*,
  instrument.js, pairer-lane-telemetry, bench/ etc. Implementation-round
  territory; doc-round touchable ONLY via the carve-out.
- R3 documentation: docs/**, CONTEXT.md, README.md, AGENTS.md, .scratch/**,
  trend-inventory.

Mechanics:

- docs/governance/surface-taxonomy.json — machine-readable classification;
  a wiring test scans install.js's require closure asserting every file is
  classified and the runtime set is complete (the list cannot drift
  silently).
- Carve-out three gates: (1) necessity — justification names the triggering
  artifact; (2) disclosure — inventory row carries
  governance_tooling_diff:{files,reason} AND the round's ADR Decision
  section names the change; (3) burn-rate — carve_out_used marker in the
  row; two consecutive rounds using it raise an advisory.
- zero_product_diff redefined = no R1 surface touched (historical rows keep
  their meaning); new governance_tooling_diff boolean is an independent
  dimension — both may be true simultaneously (the F-4 shape exactly).
- check-governance-inventory gains recomputed-not-trusted validation;
  adr-0064-t1-wiring gains two tests (schema accepts the field; a runtime
  file appearing in a doc-round diff errors).
- CONTEXT.md gains Round Edit Surface (+ Governance Carve-Out); AGENTS.md
  carries one pointer line only — rules live in the ADR.
- The t14 inventory row is annotated under the new semantics.

## §6 — defer-0060: permanently-red CI channel (D-006)

New registry row:

- subject: CI gate-all channel permanently red — JIAHAO_BENCH_CORPUS_B64
  regeneration (tarball must expose bench-corpus/mr-probes.jsonl) + the
  same-source 403 required-check deployment; both repo-admin-only actions.
- type=external-event; status=pending-evaluation; cadence_tier=quarterly;
  review_at=2026-12-15 (aligned to the existing tide).
- verified_by NOT SET — external-event is not machine-evaluable; filling it
  would be decorative-assertion theatre.
- unfreeze_if: owner regenerates the secret AND the R13 diagnostic reports
  green AND/OR the summary job is deployed as the required check.
- closes_if: a main CI run goes green via summary aggregation OR the owner
  explicitly retires the channel via same-commit ADR amendment.
- rationale cites ADR-0058 R10/R13; folds the 403 required-check carrier
  (same credential class, same intervention surface); states "defer-0026's
  limitation is historical record — this row is the sole live tracker of
  the 403 issue"; carries the id note verbatim (defer-0060 was the rejected
  D-002 sunset-row placeholder name, never landed — the id belongs to the
  first lander).
- SAME COMMIT: one pointer line in ADR-0058 R10/R13 (ADR-0033 D4 anchoring
  + ADR-0027 coupling guard — one line, two gates).

## §7 — closeout form (D-007)

- Light close: no second-party audit — ADR-0074 D-F triggers silent (no
  external claim, no sanitized-zone touch, no risk-threshold crossing; same
  surface class as t14). Self-check battery + owner approval closes the
  round + dispositions listed as standing review surface at the next audit.
- Battery must explicitly include the new machinery: taxonomy closure test
  green + anchors new-count in sync + D-004 bidirectional assertions pass —
  a green boundary running only the old battery masks a half-landed
  D-002/D-004/D-005.
- Carve-out first invocation provable in artifacts: necessity cites the
  trigger; governance_tooling_diff:{files:[check-ci-jobs.js],reason} in the
  inventory row AND named in ADR-0076's Decision section; carve_out_used:1
  with the baseline recorded explicitly ("consecutive" counting starts
  here).
- Two unbundled owner asks (record vs judgmental); countersign and
  defer-0060 appear as bookkeeping annotations, never asks.
- R1/R2 split: R1 = ADR-0076 + registry doc edits + both new artifacts +
  CONTEXT + README index + spec fix and D-004 assertions (same commit) +
  wiring + anchors + defer-0061 tally + inventory row/schema; R2 = the
  defer-0004 triple-commit + nits + telemetry checkpoint + WORKFLOW.md +
  round report + ask bookkeeping. defer-0060 lands in R1 (row + pointer are
  both doc-surface; registry edits ride the doc round per t14 convention —
  D-006's "implementation phase" meant post-grill execution, disclosed).
- Residuals: F-1→Ask B; F-2→R1 same commit; F-3→R1 pure pointer; F-5→one
  ledger disposition line per cadence/O-E item written incrementally at
  disposition time (R2 only verifies); nits→R2.
- Wording guards: consent-sweep + standing-review-surface framing, NEVER
  "audit response"; countersign note same guard; the round report never
  describes owner ratification as audit closure; Ask B keeps the
  rejection-reopens exit; defer-0060's id note survives verbatim into the
  registry row.

## §8 — negative requirements union

- No strategic review, no promotion review, no G1/G3/G4 amendment (D-001).
- Counter never lives inside defer-0055; missed check-in is never counted
  as a zero; activation never auto-decides the review (D-002).
- No activate/close on defer-0004; no prose-only trigger; no decorative
  verified_by on external-event rows (D-003/D-006).
- No gates.json entry for spec-sync; no prose/line-number/SHA pinning
  (D-004).
- R1 surface absolutely untouched in doc rounds; carve-out covers R2 only;
  taxonomy list never hand-maintained; no tri-state diff field (D-005).
- No corpus-free CI subset; no expected-fail flag; no ADR-prose-only
  tracking of the red channel (D-006).
- No bundled asks; no "audit response" framing; no routine audit without a
  D-F trigger (D-007).
- The two audit patches stay untracked forever; but commits always carry
  explicit change IDs.
`;

// ---------- task book ----------
const book = `# grill-t15 → next-round task book (2026-09-18)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-007 all current). Spec: ../spec-disposition-mechanisms.md.

## Rerunnable state (verified at t14 close — historical baseline; re-run before relying)

- \`node scripts/run-test-gate.js --expected-suites 72\` → 72 suites / 1167 tests
- \`npm run gate:all\` → exit 0
- \`node scripts/check-deferred.js\` → 53 entries
- \`node scripts/build-governance-anchors.js --check\` → 13 artifacts in sync
- \`node scripts/check-governance-inventory.js\` → 35 entries
- \`node scripts/build-rewrite-map.js --check\` → in sync
- \`node scripts/check-ci-jobs.js\` → defer-0004/0026 SATISFIED (awaiting dispositions)
- \`node scripts/instrument.js --check\` → authoritative; conditional cert to 2026-12-11
- remote main = 21b1442; workspace clean except two intentionally untracked
  audit patches (tq=t13, nl=t14 — NEVER commit; but commit needs explicit IDs)

## T-1 — R1 documentation round (D-002, D-003 partial, D-004, D-005, D-006)

Produce ADR-0076 "round edit-surface taxonomy + registry dispositions" plus:

1. docs/governance/sunset-counter.json — consecutive_zeros=1;
   observations[0]={date 2026-09-17, organic_events 0, evidence_ref→t14
   telemetry checkpoint, ledger_ref→t15 D-002}; schema per spec §2;
   admitted to the anchors chain; wiring coherence assertions; ADR-0075 D-C
   pointer line; defer-0055 stays pointer-only (D-002).
2. docs/governance/surface-taxonomy.json + wiring require-closure test —
   every file classified; runtime closure complete (D-005).
3. Inventory schema + t14 row annotation: governance_tooling_diff +
   carve_out_used fields; check-governance-inventory recomputed-not-trusted;
   adr-0064-t1-wiring +2 tests (schema accepts field; runtime file in
   doc-round diff errors) (D-005).
4. CONTEXT.md — +Round Edit Surface, +Governance Carve-Out; Sunset Trigger
   entry amended with absence≠zero freeze semantics (D-002/D-005).
5. Registry — defer-0026 → actioned (+limitation field); defer-0060 new
   row + ADR-0058 R10/R13 pointer — SAME COMMIT (D-003/D-006).
6. docs/rewrite-map-generator-spec.md Inputs fix (union enumeration) +
   adr-0074 wiring bidirectional assertions — SAME COMMIT; settles F-2
   (D-004).
7. defer-0055 sunset_trigger_pointer → pure pointer (F-3).
8. README ADR index 0076; anchors regen; defer-0061 tally row (net
   addition); AGENTS.md single pointer line.
9. R1 exit: taxonomy closure test green + anchors new-count sync + D-004
   assertions pass + R2-needed content frozen (predicate wording, row JSON,
   ask texts); boundary commit green.

Hard rules: R1 runtime surface absolutely untouched; no gates.json entry
for spec-sync; the ledger's 1/6 trail must reconcile at R1 exit; pins are
mechanism vocabulary only.

## T-2 — R2 implementation round (D-003, D-007)

Ordered:

1. defer-0004 bundle — ONE COMMIT: registry re-defer edit +
   scripts/check-ci-jobs.js predicate rewrite (multi-workflow OR matrix OR
   >3 jobs) + predicate wiring tests with negative fixture. Carve-out
   gates: justification names this disposition; inventory row
   governance_tooling_diff:{files:[check-ci-jobs.js],reason} +
   carve_out_used:1 with baseline recorded (D-003/D-007).
2. Audit nits: stale FAIL message; corrupt-prior-map catch{} → loud fail;
   ROOT hardcode in gen-docs.cjs; wiring describe placement.
3. Telemetry checkpoint (pairer-lane-telemetry) — evidence for the next
   quarterly sunset observation; counter stays 1/6 until the 2026-12
   check-in.
4. WORKFLOW.md disposition: restore or register permanent absence.
5. Round report + consent-sweep ledger lines — defer-0053/0055/0057/0058/
   O-E each get one disposition line at disposition time; consent-sweep +
   standing-review-surface framing, NEVER "audit response" (D-007).
6. Owner-ask bookkeeping (Ask A/B packet texts frozen in T-1).

## T-3 — owner asks (unbundled) (D-001, D-007)

- Ask A — instrument seq-24 sign-off (record-type; open since t13).
- Ask B — defer-0051 evidence-packet ratification (judgmental; rejection
  reopens the row — settles F-1).
- Bookkeeping annotations (NOT asks): ADR-0075 second_reviewer countersign
  lands when the owner ratifies the t14 audit outcome; defer-0060 is a
  tracked row — owner action is its unfreeze_if, not a decision ask.

## Suggested skills

- $implement — R1/R2 execution
- $tdd — wiring/predicate test additions at agreed seams
- $code-review — before each commit
- $domain-modeling — CONTEXT/ADR authoring
- $handoff — next checkpoint
- atomcode-research — contested dispositions
- gitbutler (but) — ALL VCS writes; explicit change IDs always
`;

// ---------- GOAL ----------
const goal = `# grill-t15 GOAL — SETTLED 2026-09-18

Restored context from .scratch/grill-t14/handoffs/2026-09-17-audit-passed.md
(t14 stack LANDED on origin/main; audit PASS with findings F-1..F-5 + nits).

Status: SETTLED. Seven decisions confirmed (D-001..D-007, all current):
disposition+mechanism round; sunset counter → docs/governance/
sunset-counter.json in the anchors chain; defer-0026 actioned / defer-0004
re-defer narrowed; spec-sync bidirectional pins; R1/R2/R3 edit-surface
taxonomy + carve-out gates; defer-0060 CI-secret tracked row; light close +
two unbundled asks + consent-sweep residuals.

Authoritative records:
- Ledger: .scratch/grill-t15/decision-ledger.md
- Spec:   .scratch/grill-t15/spec-disposition-mechanisms.md
- Tasks:  .scratch/grill-t15/handoffs/next-round.md

Rules that remain in force: but for all VCS writes with explicit change
IDs; the two audit-evidence patches (t13 tq, t14 nl) stay untracked forever.
`;

// ---------- CONTEXT ----------
const ctxPath = path.join(ROOT, 'CONTEXT.md');
let ctx = fs.readFileSync(ctxPath, 'utf8');

// Amend Sunset Trigger entry: absence≠zero freeze semantics (t15 D-002).
const stOld = `exists to close stays unreachable (ledger t14 D-004).
_Avoid_: binding the trigger to the watched row's own expiry field
(dependency inversion); auto-executing dispositions on a timer; record-only
triggers that convene nothing`;
const stNew = `exists to close stays unreachable (ledger t14 D-004). A missed
check-in is not a zero: the counter freezes and records the miss — absence
of observation is not an observation of zero; an organic observation resets
the count with an explicit reset event (ledger t15 D-002).
_Avoid_: binding the trigger to the watched row's own expiry field
(dependency inversion); auto-executing dispositions on a timer; record-only
triggers that convene nothing; counting a missed check-in as a zero;
silent counter resets`;
if (!ctx.includes(stOld)) throw new Error('Sunset Trigger anchor not found');
ctx = ctx.replace(stOld, stNew);

// Insert two terms before "## Decision Log".
const terms = `**Round Edit Surface (轮编辑面)**
The taxonomy declaring which file classes a round type may touch: the
runtime surface (the shipped bin require-chain closure — always
implementation-round territory, no exemption), governance machinery
(checkers, builders, telemetry — doc-round touchable only through a
carve-out), and documentation (free). The product boundary is the require
closure, not the package files[] list — packaging contents and product
surface are different questions (ledger t15 D-005).
_Avoid_: directory-level whitelists (one directory can mix entry and
machinery); treating files[] as the product boundary; a hand-maintained
list no mechanical scan can verify

**Governance Carve-Out (治理豁免)**
The gated exemption letting a documentation round repair governance
machinery when the round's own artifact truthfulness requires it:
necessity (the justification names the triggering artifact), disclosure
(the change is named in the round's ADR decision and ledger), and burn-rate
visibility (each use is marked so consecutive uses raise an advisory). A
controlled emergency lane, not a general permission (ledger t15 D-005).
_Avoid_: unmarked use; bundling the justification into prose; reading the
marker as permission to touch runtime files

## Decision Log`;
const dlOld = '## Decision Log';
if (!ctx.includes(dlOld)) throw new Error('Decision Log anchor not found');
ctx = ctx.replace(dlOld, terms);

// ---------- writes ----------
fs.writeFileSync(path.join(SCRATCH, 'spec-disposition-mechanisms.md'), spec);
fs.mkdirSync(path.join(SCRATCH, 'handoffs'), { recursive: true });
fs.writeFileSync(path.join(SCRATCH, 'handoffs/next-round.md'), book);
fs.writeFileSync(path.join(SCRATCH, 'GOAL.md'), goal);
fs.writeFileSync(ctxPath, ctx);

console.log('spec bytes:', spec.length, '| book bytes:', book.length,
  '| goal bytes:', goal.length, '| CONTEXT bytes:', ctx.length);
console.log('terms present:', ctx.includes('Round Edit Surface') && ctx.includes('Governance Carve-Out'));
console.log('sunset amended:', ctx.includes('absence\nof observation') || ctx.includes('absence of observation'));
