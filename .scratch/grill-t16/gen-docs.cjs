// grill-t16 doc generator — spec + task book + GOAL + CONTEXT terms.
// Source of truth: .scratch/grill-t16/decision-ledger.md (D-001..D-005).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SCRATCH = path.join(ROOT, '.scratch/grill-t16');

// ---------- spec ----------
const spec = `# grill-t16 spec — fix + mechanism round

Source of truth: .scratch/grill-t16/decision-ledger.md (D-001..D-005, all current).
Status: SETTLED 2026-09-18. Execution follows handoffs/next-round.md.

## §0 — headline

t15 closed with the audit PASSED WITH FINDINGS (F-A..F-E) and the stack
held on grill-t15-docs (9 commits, remote main still 21b1442 — landing is
owner-domain). This round disposes the findings and kills two classes at
once: the verifier exit conflation becomes a named contract (the exit
reports the consuming row's condition, never a union), and the report's
numbers move into a regenerated canon (the report is narrative, never the
home of numbers). Small round, but both fixes are anti-self-deception
instruments — a tripwire that can silently miss is worse than no tripwire.

## §1 — round boundary (D-001)

Eight agenda items, bound:

1. F-A/F-B/F-C implementation bundle (R2 surface — implementation-round
   territory, not a doc-round carve-out).
2. F-D adjudication (disclose vs amend).
3. F-E nits sweep.
4. verified_by exit-semantics convention (kill the multi-row union class).
5. Mechanism-output artifacts in the taxonomy (fourth class vs R2-internal
   convention).
6. Round-report number-staleness class.
7. Standing cadence consent sweep (defer-0060, sunset 1/6, SLA rows, O-E).
8. Stack landing status — awareness line only (owner-domain action).

### Explicitly out of scope (with rationale)

- Strategic review — sunset counter 1/6, trigger inactive.
- Promotion review — organic=0, no qualifying corpus.
- G1/G3/G4 threshold amendment — banned.
- Source edits during grilling.
- Deleting defer0026 leg evaluation — legs stay as diagnostics + wiring;
  only the exit semantics re-key.
- Stack landing — not a self-decided item this round.
- The three audit patches (tq/nl/xu) — untracked forever.

## §2 — F-A fix: exit keyed to the live consuming row (D-002)

Bundle B1 (implementation commit, R2):

- check-ci-jobs.js: exit = res.predicates.defer0004.satisfied ? 0 : 1;
  defer0026 legs stay computed AND printed in the stdout tag line
  (diagnostic layer, never exit-driving).
- Header rewritten — kills F-B's stale multi-job predicate description in
  the same edit.
- main() wrapped in catch → exit 2 + stderr line (crash masquerade is the
  same conflation class on a different path; Nagios UNKNOWN catch-all
  mirror). Without this the R2-honesty hole stays half-open.
- Comment block carries the convention line + the discharge re-point
  clause: when defer-0004 discharges, the exit key re-points or retires in
  the same commit as that registry edit.
- test/adr-0058-wiring.test.js fixtures pin three directions: defer0004
  satisfied → exit 0; defer0004 unmet → exit 1; defer0004 satisfied while
  defer0026 legs regressed → exit 0 AND stdout contains defer0026=unmet;
  plus a crash-path → exit 2 fixture; existing defer0026 leg assertions
  retained.

Bundle B2 (doc commit, R3 — same commit as B3):

- Ledger carries the convention verbatim: "a verified_by script's exit code
  reflects only the legs of the row(s) currently consuming it; multi-row
  reporting is diagnostic, never exit-driving" — worded "currently
  consuming" so the (b) selector stays a pre-registered upgrade path, not a
  contradiction, when a second live consumer appears.
- CONTEXT.md gains the convention term (also serves as the coupling
  anchor for B3).

Bundle B3 (F-C, same commit as B2):

- defer-0004 rationale gains the explicit "ADR-0058 D-C" citation
  (ADR-0027/0033 D4 coupling guard satisfied by B2's CONTEXT change).

Honest residual (disclosed in the round report): evalSuggestions discards
the verifier's stdout, so defer0026 regressions surface only via wiring
fixtures — wiring-layer-only at runtime; not fully orphaned (the summary
job is separately covered by check-ci-wiring).

## §3 — F-D: mechanism-output artifact convention (D-003)

New ADR-0077 explicitly amends (never silently rewrites) ADR-0076 D-B(2)'s
"which R2 files the round touched" — superseded in BOTH places: ADR-0076
via pointer/status line, surface-taxonomy diff_semantics via rewording.

- surface-taxonomy.json gains mechanism_outputs: R2-internal sub-class,
  CLOSED enumeration (never residual — same anti-drift discipline as the
  R1 closure). Each entry: {file, generator, replay_verified}. Members
  include src/instrument-state.json, bench/research/out/g6-publish-
  replay.json, anchors.json, rewrite-map.json, the taxonomy R1 snapshot,
  pack-size records.
- Wiring asserts: every entry classifies R2, names an existing generator,
  and no unlisted file may claim the exemption.
- diff_semantics.governance_tooling_diff reworded: files[] jurisdiction =
  machinery-SOURCE hand-edits; mechanism-output artifacts are exempt when
  the diff is a faithful regeneration — faithful = "the diff equals what
  re-running the registered generator at that commit produces" (Go
  generated-file convention verbatim: non-canonical source, delete +
  regenerate → zero diff). A HAND-EDIT of an output is a named heavier
  violation (falsification-adjacent) and must be disclosed in files[].
- Optional sibling marker mechanism_output_diff:{files,reason} —
  provenance visibility, never feeds burn-rate; checker validates listed
  files ∈ mechanism_outputs; a bare marker with no files hard-fails
  (mirrors carve_out_used=1).
- t15 trend row: additive-only annotation (the two touches are the
  output class under the new convention); historical booleans untouched;
  carve_out_used:1 stands.
- replay_verified:true outputs get re-run-and-diff as the audit's
  escalation tool (not a blocking gate initially); non-idempotent
  generators register replay_verified:false as recorded debt.
- D-001 agenda-5 pole decided: R2-INTERNAL convention — a fourth surface
  class would break D-A's exactly-one-of-three invariant and let outputs
  escape R2 jurisdiction.

## §4 — round-report staleness: facts canon (D-004)

- scripts/build-round-facts.js regenerates
  .scratch/grill-<tN>/round-facts.json at the closing step (T-2 tail):
  schema {suites, passed, skipped, pack_bytes, instrument_entries,
  rewrite_map_citations, registry_entries, anchors_count,
  battery_as_of_commit, report_commit: null, not_run[]}.
- The report's facts section is deterministically embedded/rendered from
  the artifact; bare numbers are banned in report prose (wiring can pin:
  no schema-key values outside the facts section).
- report_commit stays null by design — the report cannot cite its own
  commit; self-reference is disclosed, not faked.
- as-of/addendum narrowed to genuinely subsequent events (owner
  dispositions, T-3 sign-offs) and self-reference disclosure — ASC 855
  analogy: stale numbers are ADJUSTING events (determined at close,
  collected early) and must be restated, not annotated. The t15 T-3
  addendum pattern persists but sheds its number-fixing role; the t16
  report states the narrowing explicitly so the thinner addendum is not
  misread as a deletion.
- Explicit adjudicated deviation: the facts artifact does NOT join the
  anchors chain — per-round regeneration would churn the digest chain
  (anchors serve slow-moving artifacts); the one-line reason lands in
  ADR-0077 (disclose-don't-blindly-follow precedent).
- Judgment line (D-002's shape, applied): "the report is narrative, never
  the home of numbers."
- Landing-spot note: the artifact lives in .scratch (R3 process-evidence
  home per ADR-0061 D-E layering); mechanism_outputs alignment per D-003's
  enumeration discipline.

## §5 — closeout form (D-005)

- Light close: ADR-0074 D-F triggers silent (no external claim, no
  sanitized zone, no threshold crossing; smaller surface than t15).
  Self-check battery + owner approval + dispositions listed as standing
  review surface at next audit. Battery must include the new machinery:
  adr-0058-wiring three-direction + crash fixtures, mechanism_outputs
  enumeration assertions, facts-artifact render pin.
- Phase structure (carve-out NOT invoked — doc bundle is all R3,
  implementation bundle is all R2; burn-rate streak resets naturally):
  - R1 doc bundle: ADR-0077 + CONTEXT terms x2 + diff_semantics reword +
    mechanism_outputs enumeration + t15 row annotation + defer-0004
    rationale F-C citation (B2+B3 same commit) + ledger consent lines +
    defer-0062 tally + README index 77.
  - R2 implementation bundle: check-ci-jobs fix + header + crash→exit2 +
    convention comment + adr-0058-wiring fixtures (script and its pins in
    one commit — tests travel with the behavior they verify) +
    build-round-facts.js + template render pin + F-E nits (adr-0069
    comment, surface-taxonomy.js dead code, any_matrix inline regex,
    CONTEXT gloss line, ledger 1346→1403 correction) + round report with
    artifact-rendered facts section.
  - Ordering: R1 first (convention before implementation — spec-first).
- Residuals: F-A/F-B → B1; F-C/F-D → R1; F-E → R2; cadence items
  (defer-0060 quarterly 2026-12-15, sunset 1/6 same date, SLA rows, O-E)
  get one ledger disposition line each at disposition time —
  consent-sweep framing, never "audit response".
- Stack landing (grill-t15-docs, 9 commits, unpushed): awareness line
  only — owner-domain action, not a decision item.
- Zero owner asks this round: T-3 fully discharged (seq-24 signed,
  defer-0051 ratified, countersign landed); defer-0060 is a tracked row,
  owner action is its unfreeze_if not a decision ask.
- The three audit patches (tq/nl/xu) stay untracked forever; the round
  report restates the explicit-change-IDs lesson.

## §6 — negative requirements union

- No strategic review, no promotion review, no G1/G3/G4 amendment (D-001).
- defer0026 legs never deleted; the exit never re-unions; exit>1 stays
  reserved for verifier-broken (D-002).
- files[] never claims an unlisted output exemption; hand-edits of outputs
  never hide behind the regeneration convention; the bare-marker path
  hard-fails (D-003).
- Report prose never hand-writes facts-section numbers; report_commit is
  never faked; as-of marking never substitutes for a restatable number
  (D-004).
- No routine audit without a D-F trigger; no "audit response" framing; no
  bundled asks; carve-out stays un-invoked this round (D-005).
- The three audit patches stay untracked forever; but commits always carry
  explicit change IDs.
`;

// ---------- task book ----------
const book = `# grill-t16 → next-round task book (2026-09-18)

Standing task book for the next session. Ledger: ../decision-ledger.md
(D-001..D-005 all current). Spec: ../spec-fix-mechanisms.md.

## Rerunnable state (auditor-verified at t15 close — re-run before relying)

- \`node scripts/run-test-gate.js --expected-suites 73\` → 73 suites / 1194 tests / 0 skipped
- \`npm run gate:all\` → exit 0
- \`node scripts/check-deferred.js\` → 55 entries (47 live, 8 closed/actioned)
- \`node scripts/build-governance-anchors.js --check\` → 15 artifacts in sync
- \`node scripts/check-governance-inventory.js\` → 35 entries + trend advisory
- \`node scripts/build-rewrite-map.js --check\` → 1403 citations in sync
- \`node scripts/check-ci-jobs.js\` → exit 1 (defer0004 unmet — correct per narrowed semantics)
- \`node scripts/instrument.js --check\` → authoritative; conditional cert to 2026-12-11
- \`npm pack\` → 329844 B (< 340000 cap)
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
   any_matrix inline regex (\`matrix:\s*{\` edge); CONTEXT carve-out gloss
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
`;

// ---------- GOAL ----------
const goal = `# grill-t16 GOAL — SETTLED 2026-09-18

Restored context from .scratch/grill-t15/handoffs/2026-09-18-audit-passed-with-findings.md
(t15 stack 9 commits on grill-t15-docs, unlanded; audit PASS WITH FINDINGS
-> findings F-A..F-E + nits).

Status: SETTLED. Five decisions confirmed (D-001..D-005, all current):
fix+mechanism round; verifier exit keyed to the consuming row + crash
exit-2 + convention; mechanism-output artifact convention (R2-internal
closed enumeration, ADR-0077); round-report facts canon; light close +
clean R1/R2 split + consent-sweep residuals + zero asks.

Authoritative records:
- Ledger: .scratch/grill-t16/decision-ledger.md
- Spec:   .scratch/grill-t16/spec-fix-mechanisms.md
- Tasks:  .scratch/grill-t16/handoffs/next-round.md

Rules that remain in force: but for all VCS writes with explicit change
IDs; the three audit-evidence patches (t13 tq, t14 nl, t15 xu) stay
untracked forever.
`;

// ---------- CONTEXT ----------
const ctxPath = path.join(ROOT, 'CONTEXT.md');
let ctx = fs.readFileSync(ctxPath, 'utf8');

const terms = `**Consuming-Row Exit (消费行出口)**
The exit-semantics contract for a verified_by script: the exit code
reports only the condition of the row(s) currently consuming it — legs
computed for other rows are diagnostics and may be printed, but never
drive the exit. Exit 0 = the consuming row's condition satisfied, exit 1 =
unsatisfied, exit >1 = the verifier itself is broken (a crash must never
masquerade as unsatisfied). When the consuming row discharges, the exit
key is re-pointed or retired in the same commit as that registry edit;
a second live consumer is what activates the pre-registered selector
upgrade (ledger t16 D-002).
_Avoid_: union exits over multiple rows' legs (a terminal row's
regression silently suppresses the live tripwire); crash paths exiting 1;
selectors wired before a second consumer exists

**Facts Canon (事实正典)**
The rule that a round report's evidence numbers live in exactly one
regenerable artifact, refreshed at the closing step — the report is
narrative, never the home of numbers. Numbers already determined at the
close are restated mechanically; the as-of/addendum channel is reserved
for genuinely subsequent events and self-reference disclosures (ledger
t16 D-004).
_Avoid_: hand-written figures in report prose; annotating a restatable
number instead of restating it; faking a self-referential field instead
of leaving it honestly null

## Decision Log`;
const dlOld = '## Decision Log';
if (!ctx.includes(dlOld)) throw new Error('Decision Log anchor not found');
ctx = ctx.replace(dlOld, terms);

// ---------- writes ----------
fs.writeFileSync(path.join(SCRATCH, 'spec-fix-mechanisms.md'), spec);
fs.mkdirSync(path.join(SCRATCH, 'handoffs'), { recursive: true });
fs.writeFileSync(path.join(SCRATCH, 'handoffs/next-round.md'), book);
fs.writeFileSync(path.join(SCRATCH, 'GOAL.md'), goal);
fs.writeFileSync(ctxPath, ctx);

console.log('spec bytes:', spec.length, '| book bytes:', book.length,
  '| goal bytes:', goal.length, '| CONTEXT bytes:', ctx.length);
console.log('terms present:', ctx.includes('Consuming-Row Exit') && ctx.includes('Facts Canon'));
