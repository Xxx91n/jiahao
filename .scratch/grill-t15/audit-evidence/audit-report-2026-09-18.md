# grill-t15 audit report — 2026-09-18 (second-party audit window)

- Scope: `.scratch/grill-t15/reports/2026-09-18-report.md` + T-3 addendum,
  branch `grill-t15-docs` (9 content commits over base 21b1442).
- Method: hard acceptance re-run (every verification command re-executed),
  repo-reality spot checks (rg/file existence/JSON fields/sha256), and the
  $code-review two-axis review (Standards + Spec, parallel sub-agents) over
  `21b1442...HEAD` (diff materialized at `./round-diff.patch`, 3400 lines).
- Duties: report only — no fixes. Version control untouched except
  discarding the gate-run residue this audit itself caused.

## Verdict: PASS WITH FINDINGS

All hard acceptance green; every D-xxx claim substantively verified against
repo evidence. Findings F-A..F-E below are disposition material for the
next round; none invalidate the landed state.

## 1. Hard acceptance re-run (claim vs reproduced)

| Report claim | Reproduced | Verdict |
|---|---|---|
| run-test-gate --expected-suites 73 -> 73 suites / 1194 tests / 3 skipped | 73/1194 PASS, **0 skipped** | PASS (count drift, note) |
| npm run gate:all -> exit 0, 35 entries, 4 unverifiable, 2 advisory | exit 0, 35/4/2 identical | PASS |
| check-deferred -> 55 entries (47 live, 8 closed/actioned) | identical | PASS |
| build-governance-anchors --check -> 15 artifacts in sync | identical | PASS |
| check-governance-inventory -> 35 entries + trend advisory | identical | PASS |
| build-rewrite-map --check -> 1403 citations in sync | identical | PASS |
| check-ci-jobs -> exit 1, defer0004=unmet, defer0026=SATISFIED | real exit 1, identical output | PASS |
| instrument --check -> OK, conditional cert to 2026-12-11 | identical | PASS |
| npm pack -> 112 files, 329559 B | 112 files, **329844 B** | PASS (post-T-3 drift; <340000) |
| liveness: install.js --help / init -y --dry-run exit 0 | identical output, exit 0 | PASS |
| telemetry: events=31 organic=0, G1=false G3=false G4=true | identical | PASS |
| frozen: devin-oot-v3 sha256 fd6a0d42... | byte-match | PASS |
| frozen: instrument-state seq-13 stable, "26 entries" | seq-13 stable; now **27 entries** (seq-27 = the T-3 signoff itself) | PASS (stale count) |
| two audit patches never committed | tq + nl untracked; nothing else pending | PASS |

## 2. D-xxx claim -> evidence -> conclusion

| Claim | Evidence | Conclusion |
|---|---|---|
| D-001 boundary honored | no strategic/promotion review opened; thresholds.json untouched (patch mentions are prose only); grill commits touch no R1 closure file; patches untracked | VERIFIED |
| D-002 counter home | docs/governance/sunset-counter.json exists (schema v1, n_target=6, consecutive_zeros=1, observation 2026-09-17 organic=0, evidence_ref->t14 checkpoint, ledger_ref->t14 ledger#t-2-dispositions); anchors-admitted (15 artifacts, --check green); adr-0075-wiring 24 tests pin coherence/semantics; ADR-0075 D-C pointer line present; defer-0055 pure pointer | VERIFIED (ledger_ref deviates from taskbook's "t15 D-002" but resolves to the real observation record - defensible) |
| D-003 0026 actioned / 0004 narrowed | defer-0026 status=actioned + limitation + actioned_at/via; defer-0004 unfreeze_if verbatim "multiple workflow files OR any matrix OR job count > 3", verified_by=check-ci-jobs.js, predicate rewritten (multi_workflow/any_matrix/over_three_jobs), live reports unmet; 5 new adr-0058 tests incl. negative fixture; same commit wuk | VERIFIED with two defects: exit-code conflation (F-A), missing "ADR-0058 D-C" citation (F-C) |
| D-004 bidirectional pin | spec Inputs bullet registers union(git ls-files, ls-tree -r HEAD)+untracked convention; adr-0074 23 tests assert spec-side vocabulary AND generator call sites; same commit kuk; no gates.json entry | VERIFIED |
| D-005 taxonomy + carve-out | surface-taxonomy.{js,json} authority (closure scan; classifyPath verified); ADR-0076 D-A/D-B; check-governance-inventory re-derives declared files' surface + burn-rate advisory; t14 row retro-annotated; zero_product_diff redefined; CONTEXT terms + AGENTS one line; adr-0064-t1 +2 tests | VERIFIED; residual: recompute validates declared files only, completeness unchecked (F-D) |
| D-006 defer-0060 row | row verbatim: external-event, pending-evaluation, quarterly, review_at 2026-12-15, NO verified_by, sole-403-tracker rationale, id note verbatim; ADR-0058 R10/R13 pointer line same commit | VERIFIED |
| D-007 light close + asks | asks unbundled (separate packets/acts/ledger lines); Ask A seq=27 record_signoff seq-24/Euiop1/approve verbatim auth; Ask B owner_ratification=ratified (rejection exit preserved in reason); ADR-0075 Status countersign 2026-09-18; consent-sweep lines T-2; WORKFLOW.md absent + registered; wording guards held (no audit-response framing; ratification not called audit closure) | VERIFIED |

## 3. Two-axis review ($code-review over 21b1442...HEAD)

### Standards
- HARD: check-ci-jobs.js header still says "Predicates: multi-job
  (defer-0004)" - the predicate it documents was rewritten (wuk). Verified
  lines 4-5. (Also F-B.)
- HARD: two R2-surface files touched this round absent from
  governance_tooling_diff.files: src/instrument-state.json (T-3 append) and
  bench/research/out/g6-publish-replay.json (gate refresh). Defensible as
  mechanism-output artifacts, but the taxonomy letter carves no such
  exception and the recompute cannot detect omission. (F-D.)
- Judgement calls: stale comment test/adr-0069-wiring.test.js (~L307, count
  bumped, comment still says ADR-0075 landed); dead `m[1]||m[2]` in
  surface-taxonomy.js (REQ_RE has one capture group); ledger T-2 "1346
  citations" vs final 1403; per-round count re-asserts across ~10 wiring
  files (registered convention, noted only).
- Clean: registry schema conventions, ADR-0076 structure, script headers
  elsewhere, AGENTS single pointer, R1 closure untouched, red disclosures.

### Spec
- PARTIAL: defer-0004 disposition lacks the required "ADR-0058 D-C"
  citation (spec S3 + ledger D-003 "处置记录显式引 ADR-0058 D-C 保持链条").
  Rationale cites ADR-0058 unqualified; T-2 and ADR-0076 D-E do not name
  D-C either. (F-C.)
- MINOR: counter observations[0].ledger_ref -> t14 ledger T-2 vs taskbook's
  "t15 D-002"; resolves to the real observation record. Noted, no rework.
- MINOR: CONTEXT carve-out gloss says "named in ADR decision and ledger",
  dropping the trend-inventory governance_tooling_diff channel.
- DEFECT: check-ci-jobs exit code ANDs defer0004+defer0026
  (satisfied = unmet.length===0). check-deferred evalSuggestions treats
  exit 0 as THE row's condition met; only defer-0004 consumes it now. A
  workflow split (the likeliest trigger: multi_workflow) moves the summary
  job out of ci.yml, defer0026 legs regress, exit=1 -> defer-0004's
  narrowed trigger fires SILENTLY - the missed-alert dual of the banned
  permanently-SATISFIED. (F-A.)
- MINOR: any_matrix regex misses inline `matrix: {...}` and does not anchor
  to a strategy: parent.
- Clean: §6 row verbatim, §4 pins mechanism-vocabulary only, §8 negative
  union unbreached, asks unbundled, wording guards held.

## 4. Findings (disposition material for next round)

- F-A (medium): check-ci-jobs exit-code conflation - defer-0004's verified_by
  tripwire can silently miss in the primary activation path. Suggested fix:
  key the exit to the live row under evaluation (defer0004 only for exit
  semantics, or a per-row selector), pin exit semantics in adr-0058-wiring,
  update the header comment (F-B same commit).
- F-B (low): stale script header in check-ci-jobs.js ("multi-job" predicate
  description) - the anti-drift discipline this round champions.
- F-C (low): defer-0004 disposition missing explicit ADR-0058 D-C citation
  (registry rationale and/or ledger note).
- F-D (low): governance_tooling_diff completeness ambiguity - two R2
  mechanism-output artifacts touched but undeclared; recompute validates
  labels, not coverage. Disclose or amend taxonomy/diff_semantics to name
  the mechanism-output-artifact convention.
- F-E (nits): adr-0069 stale comment; surface-taxonomy m[2] dead code;
  CONTEXT carve-out gloss; any_matrix regex edge; ledger 1346 vs 1403;
  report commit list omits kkx/ovs/pyt; report evidence numbers stale
  post-T-3 (skips 3->0, pack 329559->329844, entries 26->27).

## 5. Process notes (reported, not ratified)

- Report self-description is staleness-class, not fabrication: every
  reproducible command re-verified within disclosed ordering; the stale
  figures all sit in pre-T-3 sections the addendum supersedes.
- Mid-round reds disclosed per AGENTS.md (4 items, all resolved; final
  state green on my own re-run).
- This audit's own artifacts: round-diff.patch stays untracked forever
  (same convention as tq/nl); the gate-run rewrite of
  bench/research/out/g6-publish-replay.json caused by this audit was
  discarded - workspace matches audited HEAD.
- No VCS writes by this window.
