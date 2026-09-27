captured-at-head: 848c014a

# grill-t28 second-party audit report (2026-09-26)

Auditor: independent audit window. Object: lanes `grill-t28-exec` (stacked
on `grill-t28-docs`) over base `c8613f55` (origin/main tip at T-0), pre-audit lane tip `848c014a` (the ephemeral workspace merge
`8592485a` orphaned on commit regeneration - the orphan leg caught my
first pin to it live; re-pinned to the substantive head), SEAL declaring `c9fda727` (commit
`6def5532`). Claim artifacts under
`D:\Aworker\jiahao\.scratch\grill-t28\` (report / handoff / round-facts.json
/ SEAL / decision-ledger D-001..D-006 / spec-t28-disposition / GOAL /
human-authority-package drafts).

Verdict: **PASS, with findings** — every green-state claim in the round
report re-verified green on independent re-run; all six ledger dispositions
substantiated by repo-truth checks. Findings are machinery-hardening items
(F-1..F-5), registration-completeness gaps (F-6/F-7), one owner-adjudication
boundary call (F-8), disclosure-precision items (F-9/F-10/F-13), one process
observation (F-11), and one seal-field deviation needing an owner call
(F-12). None falsify the sealed state. Per the separation-of-duties rule the
audit window touches nothing: F-1..F-7, F-9..F-11 route to a rework window;
F-8 and F-12 route to the owner. Whoever fixes re-runs the §1 battery.

Independent re-run captures: `D:\Aworker\jiahao\.scratch\grill-t28\audit-evidence\`
(5 captures, untracked per nc-001 - referenced here by path/count pointer
only, never copied into this committed surface, per the D-003 writing
convention).

## 1. Independent acceptance re-run (not trusting report self-description)

| leg | report claim | audit re-run | verdict |
| --- | --- | --- | --- |
| compile | node --check over "180+" shipped .js + yaml parse OK | 161 .js files all OK; 2 yaml files (ci.yml, .aider.conf.yml) parse OK via js-yaml load | confirmed, claim number imprecise (161, not "180+" - F-9) |
| package | npm pack + check-pack-smoke EXIT 0 | EXIT 0 - tarball 358412 B / 116 files; budget <380000 (ADR-0039 D3) | confirmed |
| liveness | extract -> install.js --help -> init -y --dry-run | EXIT 0 both - CLI help + dry-run profile write (tar needed --force-local on Windows - harness note) | confirmed |
| full jest | 82/82 suites, 1384/1384 tests, EXIT 0 | `Test Suites: 82 passed, 82 total` / `Tests: 1384 passed, 1384 total`, EXIT 0 (~155 s) | confirmed |
| gate:all | 37 entries, 4 UNVERIFIABLE (registered degrade), EXIT 0 | EXIT 0 - 37 entries; UNVERIFIABLE = ci-wiring/bench-gate/probes/mr-probes ("requires ci-mode") only; [219 orphan-ancestry] PASS inside the battery; 3 advisory warnings pre-existing | confirmed |
| orphan leg standalone | OK - pins ancestral, trigger ok | EXIT 0 - 97 pin(s) / 12 unique sha(s) ancestral; trigger: ok (workspace descends from last seal c9fda727f, .scratch/grill-t28/SEAL) | confirmed (counts grew post-claim as expected) |
| deferred | 68 entries (55 live, 13 closed/actioned) | verbatim match, EXIT 0 | confirmed |
| inventory | 37 entries, advisory warnings only | verbatim match, EXIT 0 | confirmed |
| anchors | 18 artifacts in sync | EXIT 0 | confirmed |
| rewrite-map --check / --published-only | EXIT 0 both | EXIT 0 both - 3057 citations (post-seal regen count, consistent with the declared regen commits) | confirmed |
| adr index | in sync | EXIT 0 | confirmed |
| secret-scan | 0 hits | EXIT 0 - 3 rules, 0 hits | confirmed |
| whitespace | clean | `git diff --check` clean | confirmed |
| CI leg | run 36142965743 success @ c8613f55, 8 UNVERIFIABLE legs verbatim | `gh run view`: conclusion=success, headSha=c8613f55; run log carries the same 8 UNVERIFIABLE leg ids verbatim (corpus-leak, probe-corpus, probes, corpus-freshness, corpus-classes, judge-bias, mr-probes all "requires bench-corpus" + rewrite-map "requires old-side-refs") | confirmed |
| seal evaluation | seal declared c9fda727, terminal regime | evaluateRound(grill-t28): seal present, declared==expectedAnchor, amended=false, inFlightClean=true, capturesAtSealOk=true, sealBad=[], freezeViolations=[], tag absent (human item); claims(1)=c9fda727, 15 captures, bad=[]; unregisteredClaims=[] - but recorded_at=null (F-12) | confirmed, with field deviation |

## 2. Physical spot-checks (repo truth vs report claims)

- `D:\Aworker\jiahao\docs\governance\ERRATA.md` — E-13 master record:
  pending-confirmation verbatim, explicitly does NOT assert the
  accidental-stripping characterization as adjudicated fact; names the
  10->19 queue merge + defer-0074 + per-ADR pointer lines + reversal path +
  IIA three-lines clause. E-14: append-only default-expiry annotation, grant
  body frozen, pending-confirmation, exact "unadjudicated at the 2026-12-15
  tide => inert" semantics.
- ADR-0076..0081 + 0083..0085 — all nine carry the verbatim pointer line
  ("second_reviewer countersign obligation presumed subsisting ... pending
  entity-level adjudication ... defer-0074"). ADR-0082 untouched (keeps the
  older slot form via defer-0068). Zero new ADR beyond 0085 - verified
  directory enumeration.
- `D:\Aworker\jiahao\docs\deferred-registry.json` — defer-0070:
  status=closed, closure_grade=yellow, closure carries all seven fields
  verbatim (run_id/conclusion/verifiable_composition with the 8 leg ids /
  degradation_semantics quoting ADR-0040 D3+D5 / degradation_cause /
  successor_defer_id=defer-0072 / closure_rule_verbatim). defer-0074:
  boundary row, pending-evaluation, review_at 2026-12-15. defer-0072/0073
  live (pending-evaluation).
- Residence migration: `D:\Aworker\jiahao\.scratch\grill-t26\reports\audit-report.md`
  sha256 060fac863a51d3e4d751468c26b5df0b41b932a78aaa8f12e7704a0ed8f1a7ce
  and `D:\Aworker\jiahao\.scratch\grill-t27\reports\audit-report.md`
  sha256 56f21ad43a4676b60a35368e261fc3d213714721c0a2147d74624309310d2f2a
  - both match the declared prefixes. Old spots cleared; two-line pointer
  READMEs present (untracked). Byte-verbatim vs a pre-move original is
  unverifiable post-hoc (never committed before) - the sha pins are the
  forward integrity record.
- `D:\Aworker\jiahao\docs\governance\surface-taxonomy.json` —
  freshness.orphan_ancestry block registered (artifact_scope, pin_patterns
  x2, workspace_ref, errata_exemptions=[]); rounds += grill-t28;
  claim_surfaces.closed_enum unchanged [reports/, handoffs/]; exceptions
  gained "reports/audit-report.md" this round (see F-8).
- `D:\Aworker\jiahao\docs\gates.json` — orphan-ancestry entry:
  order 219, tier confirmatory, source_adr ADR-0085, command
  `node scripts/check-orphan-ancestry.js`, requires [repo-tree].
- `D:\Aworker\jiahao\scripts\check-orphan-ancestry.js` (43 lines) —
  thin gate wrapper; delegates to orphanAncestry() in
  `D:\Aworker\jiahao\scripts\evidence-freshness.js` which performs real
  `git merge-base --is-ancestor <pin> HEAD` per pin + the workspace
  non-fast-forward trigger + errata_exemptions honored (fail-closed).
- `D:\Aworker\jiahao\docs\governance\delegation-renewal-template.md` —
  Amendment section 2026-09-26: trigger re-pointed to first signoff-class
  event inside a human-authority round / the 2026-12-15 tide, with the
  why-unsatisfiable note; registered text retained (append-only).
- `D:\Aworker\jiahao\docs\adr\0072-*.md` — Amended-by line + Amendment
  note block (append-only, ADR-0070 precedent).
- `D:\Aworker\jiahao\src\instrument-state.json` — untouched this round
  (seq-13 grant body frozen; not in the 59-file round diff).
- Fixture tests run inside the battery: `D:\Aworker\jiahao\test\freshness-checker.test.js`
  describe 'orphan-ancestry leg (grill-t28 D-005/D-006)' = ancestor-positive
  + orphaned-pin (+ E-99 errata-exempt path) + workspace non-ff trigger;
  `D:\Aworker\jiahao\test\adr-0085-wiring.test.js` pins the registration
  (gates entry, taxonomy block, shared checker). 82/82 battery included them.
- CONTEXT.md: Countersign Queue entry now registers the two approval forms'
  boundary + queue 10->19 + Degraded-Green Closure term verbatim.
- Commit topology: 18 commits c8613f55..HEAD; T-1..T-5 execute the pinned
  order 1->3->4->2->0070 exactly; sampled commits' file sets match their
  messages (T-4 machinery set, claim-commit set).
- Human-only boundary honored: no adjudicated/grill-t27 tag pushed
  (adjudicated/* = devin-corpus-v2, grill-t25, grill-t26 only); no secrets
  touched; human-authority-package remains drafts.

## 3. Dual-axis review (code-review skill, fixed point c8613f55)

Two parallel read-only sub-agents; findings adjudicated by this window.

### Standards

- F-1 (hard violation, module's own standard): taxonomy registers
  freshness.orphan_ancestry.pin_patterns, but evidence-freshness.js carries
  private ORPHAN_PIN_RES and never reads cfg.pin_patterns; a third copy
  lives in the git-grep enumeration pattern. The module header itself
  states the file reads the registry and "does not carry a private copy"
  (scripts/evidence-freshness.js lines 24-27). Drift hazard: editing the
  registered patterns silently does nothing.
- F-2 (same class): lastSealRecord hardcodes /\/SEAL$/ instead of
  fresh.non_anchoring_classes.seal_file (registered; consumed elsewhere in
  the same file at lines 68 and 213).
- F-3 (latent correctness): lastSealRecord orders by String(recorded_at) -
  'null' lexically outranks every date, so an undated SEAL always wins
  "latest"; compounding, the t28 SEAL itself omits recorded_at (F-12), so
  the ordering is correct today only by accident.
- F-4 (fail-open edge): the git-grep enumerator requires EOL right after
  hex while ORPHAN_PIN_RES tolerates trailing whitespace - a pin line with
  trailing whitespace is never enumerated, so never checked.
- F-5 (minor cluster): lexical tie-break ranks 'grill-t9/' above
  'grill-t10/'; ORPHAN_SCOPE_RE dead code; '.scratch' pathspec hardcoded
  vs cfg.artifact_scope; exemption sha exact-match (short-vs-full silently
  unbound - fail-closed).
- Baseline smells (judgement calls): duplicated gg/put/ci fixture trio in
  freshness-checker.test.js; terse identifiers consistent with the file's
  ERRATA E-8 disposition.

### Spec

- F-6 (partial): D-005(iv) requires the residual window (restack ->
  next-eval gap) inside the registration contents; no committed surface
  names it. Trigger, red-light semantics, and both rejection reasons ARE
  registered (ADR-0085 note, taxonomy _doc, AGENTS.md). Low severity -
  exposure bounded by leg-at-gate-time + the ritual mandate.
- F-7 (partial): human-only adjudication points are thin on standing
  surfaces - AGENTS.md names the red-light response; ADR-0085 names the
  alpha countersign + promotion hook; errata adjudication, re-seal
  authorization, trigger interpretation, and waiver issuance live only in
  the committed ledger.
- F-8 (boundary call - OWNER ADJUDICATION): claim_surfaces.exceptions
  gained "reports/audit-report.md" agent-side. The closed_enum is
  untouched and the exception is semantically required (it is what lets a
  post-seal audit report be committed as a non-claim act - this report
  uses it). Whether the exceptions list sits inside the D-003(v) fence
  ("any future change to the claim_surfaces enum requires ADR + human
  sign-off") is the owner's call, not the auditor's.
- Scope-creep nits: ADR-0084 carries a second appended line (Queue note
  reconciling its own stale "(10 entries)" bullet - defensible, but not
  the spec's "ONE appended pointer-annotation line" and not disclosed in
  report sec.3) = F-10. ADR-0072's Amendment note block exceeds the bare
  "Amended-by pointer line" ask but follows the ADR-0070 precedent -
  acceptable.
- Implemented-but-wrong: none found.

## 4. D-disposition verification (claim -> evidence -> conclusion)

| claim | evidence (committed surface) | conclusion |
| --- | --- | --- |
| D-001: disposition round, pinned order 1->3->4->2->0070, human items drafted only | commit sequence c1e708f4 + T-1..T-5 maps exactly to ①③④②0070; tags absent; human-authority-package.md holds 7 drafted items, nothing executed | implemented |
| D-002: E-13 errata + 9 pointer lines + queue 10->19 + boundary row + zero new ADR | ERRATA.md E-13 (pending-confirmation, IIA clause); 9 ADR lines verbatim; defer-0074 row; CONTEXT.md queue boundary; no ADR-0086+ | implemented |
| D-003: t26/t27 reports byte-verbatim into reports/ + pointers + writing convention + verdict owner-side | both files present, sha256 match declared prefixes; old spots cleared + untracked READMEs; AGENTS.md convention verbatim; claim_surfaces enum reports/+handoffs/; nc-001 untouched | implemented (exception-breadth is F-8, owner call) |
| D-004: template re-point + ADR-0072 Amended-by + seq-13 annotation pending-confirmation + 4-item human list | template Amendment section append-only + why-unsatisfiable; ADR-0072 line + note; E-14 verbatim; instrument-state.json untouched; package holds the four D-004 items | implemented |
| D-005: standing leg (merge-base per pin) + mechanized trigger + ritual + exemptions only registered | orphanAncestry() real implementation; gates.json 219 confirmatory; AGENTS.md ritual; errata_exemptions registered channel; fixtures run in battery | implemented, with hardening findings F-1..F-5 + registration gaps F-6/F-7 |
| D-006: zero new ADR + verbatim derivation + promotion hook + alpha pending owner sign | ADR-0085 note carries the exact derivation sentence + hook + both rejections; trend row kind:fix + cumulative gtd disclosed inline; ledger alpha note pending countersign | implemented |
| defer-0070 closure: seven fields, grade yellow, run verified, successor live | registry closure block verbatim; gh run 36142965743 success@c8613f55; 8 UNVERIFIABLE legs verbatim in run log; defer-0072 pending-evaluation | implemented |
| Terminal regime (ADR-0085): captures -> claim commit -> SEAL -> post-seal regen only | 16 captures stamped c9fda727; SEAL commit 6def5532 declares it; evaluateRound: inFlightClean, capturesAtSealOk, no freeze violations; post-seal commits are mechanism outputs only | implemented, except recorded_at omitted (F-12) |

## 5. Findings and routing

Fix-window rework (rerun list in sec.7):
- F-1/F-2: consume the registered pin_patterns / seal_file config instead
  of private copies (one pattern source; wiring test asserting the
  registered table is what the leg runs).
- F-3: guard recorded_at before the latest-compare (missing -> fall back
  to round-order or commit-date, never lexical 'null').
- F-4: enumerate loose (^(captured-at-head|seal):), let the strict parser
  decide - plus a fixture proving a trailing-whitespace pin is seen.
- F-5: natural-sort round dirs in the tie-break; delete ORPHAN_SCOPE_RE or
  wire it; normalize exemption sha compare (prefix-aware or {40} shape).
- F-6/F-7: register the residual window + the human-only adjudication
  points on a standing surface (taxonomy _doc or AGENTS.md).
- F-9/F-10: prose corrections - "180+" -> 161; disclose the ADR-0084
  second line.
- F-13 nits at the rework window's discretion.

Owner adjudication:
- F-8: whether claim_surfaces.exceptions sits inside the D-003(v)
  ADR+sign-off fence; if yes, retro-register this entry (or legislate the
  exception channel).
- F-12: t28 SEAL lacks recorded_at (registered seal.fields=[seal,
  recorded_at]; task book prescribed it; t27 carried it). Re-amending the
  SEAL post-declaration is itself a freeze violation - owner chooses
  errata record vs re-seal; F-3 removes the load-bearing edge meanwhile.

## 6. Process observations (reported, not ratified here)

- F-11: [ANCHORING] file-allowlist footers appear on 0/18 round commits
  (t27 carried them). Not a registered convention; the landed file sets
  are verified coherent with their messages, so no sweep defect is
  evidenced - but the post-hoc audit trail is weakened. If the marker is
  wanted, it needs registration, not habit.
- The round's own sec.3 deviations (interstitial red healed in-round,
  mid-round restack + re-eval, wiring-pin break repaired, gate flake,
  yaml-parse slip) were disclosed in the report rather than hidden -
  consistent with the mid-round-red-is-not-a-defect rule.
- Advisory state worth owner attention: governance-inventory warns of 5
  consecutive documentation rounds using the carve-out and an ADR streak
  of 15 - non-blocking advisories, trending.

## 7. Rerun instructions for the fix window

    cd D:\Aworker\jiahao
    node scripts/check-orphan-ancestry.js      # after any F-1..F-5 fix
    node scripts/run-test-gate.js --expected-suites 82
    node scripts/run-gates.js                  # gate:all incl. [219]
    node scripts/check-deferred.js
    # plus: evaluateRound(grill-t28) - seal must stay inFlightClean/capturesAtSealOk,
    # freezeViolations empty, and any new artifact's pins ancestral.
