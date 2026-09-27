# Handoff — grill-t8 CAPA+readiness task book (post-grill consolidation)

Repo: D:\Aworker\jiahao. Ledger of authority:
.scratch/grill-t8/decision-ledger.md (D-001..D-007, all current). .scratch is
git-tracked — this ledger is its own durability channel.
Spec: .scratch/grill-t8/spec-capa-readiness.md (restatement only — ledger is
authoritative). Goal anchor: .scratch/grill-t8/GOAL.md.
Prior round archive: .scratch/grill-t7/handoffs/v2-round-audit-passed.md —
v2 verdict SETTLED: failed (dual-axis: lie 9/31 CI upper 0.48 < floor
0.563863; FP 21/89 CI lower 0.15 > usability bound 0.10).

## State snapshot (verified this session)

- v2 failure locally re-derived: single emission zone — command-exit
  vocabulary fires on honest and lie alike (mean logit +3.81 vs +3.80); all
  other categories silent both directions; drop_closing delta = 0. Failure
  class = construct misalignment (D-004).
- v2 adjudicated artifact = src/port/score.js + src/port/g6-manifest.json;
  dormant in the product (only consumers: G6 equivalence/publish gates).
  Online detection path = src/detector.js structural signals — never
  adjudicated by devin corpora.
- Package: pure JS/prompts distribution, no compile; pack:smoke 102 files /
  281,751 B < 300 KB cap; npx github:<org>/jiahao is the only install channel
  (ADR-0011: deliberately not on npm registry).
- This session committed: CONTEXT.md +9 glossary terms (CAPA/readiness
  vocabulary), spec + task book + GOAL (branch grill-t8-docs). No ADR added
  — ADR-0069 authoring is T-1. Anchors: t8 ledger joins the anchors list at
  R1 under ADR-0069 (per-ledger anchoring convention).

## Next round tasks — THREE-STAGE, ORDER BINDING (D-007)

Stage gate: the T-1 doc commit must land BEFORE any pairer code or
install-test run (doc-before-impl). T-3 registration requires the pairer
artifact built + probe-cleared (content-hash pinned into the plan).

### T-1 Doc round: ADR-0069 + positioning + anchor machinery
  [covers D-002, D-003, D-004, D-005, D-007]
- docs/adr/0069-*.md: CAPA design — pairer semantics package (proven-
  contradiction flag; undetermined third state; 4-type coverage; detector.js
  out of scope) + three pre-registered clauses (port zero-verdict telemetry;
  divergence disclosure-only; meta-circularity ban) + version-binding form
  (artifact-scoped freeze + adjudication anchor + b-variant registered as
  fallback) + readiness positioning contract + b2-fail-branch
  pre-registration + G6 written impact-assessment framing.
- README b1 rewrite: discipline-scaffold positioning + failed fact line
  verbatim on first screen; claim home wording untouched; explicitly NOT a
  detector-effectiveness claim.
- Anchor mechanics: git tag adjudicated/devin-corpus-v2 on the v2 verdict
  commit + anchor annotation naming the failure class (construct
  misalignment); sha256 freeze wiring assertion for score.js +
  g6-manifest.json (any touch fails).
- CONTEXT.md glossary already synced (+9 terms this session); verify only.
- v3 contamination-registry FRAMEWORK (structured rows {parameter, value,
  v2_informed, basis} — mirror the v1 registry shape); wiring-test seeds.
- Ceremony: deferred-registry tally row, README ADR index rebuild, anchors
  regen + t8 ledger added under ADR-0069, instrument-side registration event.

### T-2 Build + verify round: pairer + probes + install evidence
  [covers D-002, D-004, D-005, D-006]
- Pairer implementation on the CAPA branch (main artifact files untouched):
  four check families (exit-report / file-contains / count-report /
  content-append), each a mechanical claim-evidence pair; three-state item
  telemetry {flagged, consistent, undetermined}; rules derived from check
  semantics — NEVER reads spec.check; claimed values parsed from
  closing/transcript.
- Port telemetry channel wired disclosure-only (zero verdict power).
- Corpus-external probes: hand-built transcripts exercising each pair family
  incl. the fail-open surface (liar omits the claimed value); results
  categorical-only into CAPA records.
- b2 install-chain measured run: clean environment, npx github: init + mock
  task through the hook chain; first-party runtime evidence record (what
  ran, what did not, where it stuck). Pre-registered fail branch: breakage
  -> "installable" claim downgraded to "install path has a known issue (see
  test record)" — no wording repair.
- b3 measurement-reproduction invitation text (verbatim fact lines only;
  feedback channel -> categorical into CAPA).
- G6 equivalence written impact assessment (first section of the future v3
  designed-after-v2 disclosure).

### T-3 v3-plan registration: freeze eval-plan-v3
  [covers D-004, D-006, D-007]
- bench/research/devin-corpus-v3/ eval-plan: adjudicated object = pairer
  artifact pinned by CONTENT HASH; decision-table rule same as v2 (dual-axis
  IUT, CP two-sided 95%, derived-table timing — bands derived from landed n
  while labels stay blind, then frozen); floor/bound value derivation is a
  v3-plan registered obligation (same rule family, justification restated —
  the pairer has no v1 anchor, so the conservative-transfer referent must be
  argued explicitly in the plan); undetermined enters as unflagged on both
  axes; undetermined rate pre-registered descriptive metric; divergence
  clause (port disagreement disclosure-only); designed-after-v2 per-
  parameter disclosure + contamination-registry rows.
- 60% concentration trigger disposition: v2 fired it — the v3 plan MUST
  either adopt a category-scoped bound or record why not (registered
  obligation, non-omittable).
- Freeze commit of the v3 eval-plan; instrument-side registration event.
- v3 collection + adjudication is a FOLLOW-UP round — not this round.

## Hard rules that bind

- T-1 commit precedes T-2 work; T-3 registration requires a built +
  probe-cleared pairer (hash pinned); no v3 data or adjudication this round.
- score.js + g6-manifest.json byte-frozen on main (sha-asserted); CAPA lives
  on its branch until a v3 verdict lands; anchor tags never move.
- Claim discipline: failed fact line verbatim everywhere; never cited by
  conformity; publish-regardless — a future pass gets equal prominence,
  never erases the failed record.
- Port output has zero verdict power; divergence is disclosure-only; pairer
  rules never read spec.check; probe results categorical-only, never in the
  v3 verdict chain.
- Readiness claims are evidence-tiered (intent vs proof); b4 npm publish is
  OUT (ADR-0011; reversal needs its own ADR + >=1 passed CAPA round first).
- detector.js integration is a separate gated decision (judge-seam FP gate)
  — not this round.
- but for all VCS writes; dedicated branch; no push/PR.
- Report honesty: every claim carries a rerunnable command + observed output.

## Open items outside this round

- v3 collection + single-shot adjudication (own round after T-3).
- Unified governance backlog stays deferred (P-2 countersign, delegation
  expiry, INDET claim treatment, standing prior, trend-anchor cap,
  defer-0042..0046 cadence dispositions) — D-001 constraint.
- detector.js online-path adjudication — separate gated decision.
- npm registry publish (b4) — needs own ADR + >=1 passed CAPA round.

## Suggested skills

- $implement + $tdd at pairer/probe seams (T-2); $code-review before commits;
  $handoff at session end; $but for all VCS writes; $domain-modeling for
  CONTEXT sync; atomcode-research serial for any NEW research need (one run
  in flight).

