# grill-t16 spec — fix + mechanism round

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
  R1 closure). Each entry: {file, generator, replay_verified}. Shipped
  members: src/instrument-state.json, bench/research/out/g6-publish-
  replay.json. The same output class on the documentation surface —
  anchors.json, rewrite-map.json, the taxonomy R1 snapshot, pack-size
  records — is named, not enumerated (R3 files never enter files[]
  jurisdiction).
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
