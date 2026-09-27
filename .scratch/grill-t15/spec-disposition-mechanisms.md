# grill-t15 spec — disposition + mechanisms round

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
