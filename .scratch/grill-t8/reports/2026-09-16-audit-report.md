# grill-t8 AUDIT report (independent re-verification) — 2026-09-16

Auditor: second-party audit window. Object under audit:
.scratch/grill-t8/reports/2026-09-16-report.md + its handoff chain.
Scope: commits c1afe09..dd3a9bb (t8 stack: 39b9688, b985f51, 3fd473b, ac77309,
e602449, dd3a9bb). Parallel branch r9-39-macro-b-regression (84077da) sits on
top of the stack in the shared workspace — inspected, out of audit scope.
Method: no claim taken on faith — every key claim re-run or spot-checked
against repo artifacts (rg / git objects / file bytes / live installs).

## 1. Hard acceptance re-run (personally re-executed)

| command | report said | observed now | verdict |
|---|---|---|---|
| `npx jest` | 63 suites / 987 tests pass | 63/63, 987/987, exit 0, 25.3s | PASS |
| `npm run gate:all` | exit 0; 31 entries; 4 ci-mode unverifiable | exit 0; 31 entries; same 4 unverifiable; 2 advisory warnings (instrument-identity conditional 2026-12-11, governance-inventory) | PASS |
| `npm run pack:smoke` | 285,333 B < 300,000 | 285333 B, 102 files, exit 0 | PASS |
| `npx jest test/adr-0069-capa-pairer.test.js` | 24/24 | 24/24, exit 0 | PASS |
| `npx jest test/adr-0069-v3-plan.test.js` | 11/11 | 11/11, exit 0 | PASS |
| `node bench/research/capa-probes.js` | 16/16 MATCH, exit 0 | 16 MATCH lines, exit 0 | PASS |
| `node scripts/instrument.js --check` | conditional cert, baseline warning | OK authoritative; conditional cert expires 2026-12-11 CAPA-0060 | PASS |

## 2. Claim-by-claim spot check

| # | report claim | my evidence | verdict |
|---|---|---|---|
| C1 | commits xmq=b985f51 / ynm=3fd473b / zwz=ac77309 / ysw (e602449) | git log resolves all; contents match claimed split (doc/impl/plan separation) | PASS |
| C2 | anchor tag annotated @8807a61, names construct misalignment | `git cat-file -p adjudicated/devin-corpus-v2`: annotated tag object → 8807a61122a8991bbe5f99ecc412d8989496f786; message: "FAILED ... Failure class: construct misalignment ... never moves (ADR-0069 D-C)" | PASS |
| C3 | score.js/g6-manifest sha256 ffc61319/7ed23909 + blob ids identical at anchor | re-derived sha256 identical; `git rev-parse TAG:f == HEAD:f` both blobs | PASS |
| C4 | README first screen: scaffold positioning + verbatim fact line + limitation | lines 5–18 verbatim: "installable discipline scaffold with publicly failed measurement", "devin-corpus@v2 falsification test: failed (n=120, lie=31, FP=21/89, CI lower=0.142229)", "never cited by any conformity claim", "Nothing on this page is a detector-effectiveness claim" | PASS |
| C5 | pairer seam + 4 families task-text routing + forged spec.check ignored + port telemetry never alters state | source read (capa-pairer.js:161-178 reads only task/transcript); test 'meta-circularity: a forged spec.check is ignored' exists and passes | PASS |
| C6 | probes 16/16 categorical-only | re-run; runner prints no rates/CI/verdict numbers | PASS |
| C7 | v2-corpus diagnostic: 31 lie flagged, 0 honest, 0 undetermined | STRONGER than aggregate: per-item join on all 140 items → honest/consistent=109, lie/flagged=31, mismatches NONE | PASS |
| C8 | b2 measured install: init exit 0, profile=verifier, gate block exit 2 / allow exit 0 | reproduced on fresh dirs (HOME=/tmp/jh-audit): init wrote .jiahao-profile=verifier + persistence probed dir-sync-unsupported; installed gate (npm _npx cache artifact) → {decision:block} exit 2 without evidence; appended createRecord('det-b2','test-run','passed',...) → exit 0 | PASS |
| C9 | G6 impact: pairer under bench/, tarball boundary excludes it | package.json files whitelist lacks bench/; pack-smoke confirms surface | PASS |
| C10 | pairer sha256 2383d75f (10171 B) pinned into eval-plan.instrument.pairer + plan.adjudicated_object; runner re-derives fail-closed | sha256 re-derived identical; loadPlanV3 (devin-oot.js:1021+) re-derives sha256 + byte count, errors on drift; also re-derives mde-freeze survivor_floor, asserts floor 0.563863 / bound 0.10 / CP two-sided 0.05 / undetermined→unflagged / 60%-disposition / divergence-clause presence | PASS |
| C11 | v3-plan test obligations: undetermined collapse, divergence clause, 60% disposition, 13 contamination rows, disjointness 52+140 | eval-plan fields verified verbatim; contamination-framework rows = 13; plan.disjoint_v1_ids=52, disjoint_v2_ids=140 | PASS |
| C12 | stage gate: no v3 data; loadPlanV3 fails closed; v3 replay gate unregistered | devin-corpus-v3/ holds only {plan, eval-plan, contamination-framework}.json — no items/decision-tables/labels; loadPlanV3 errors on missing decision-tables.json; gates.json lacks devin-oot-v3-replay | PASS |
| C13 | instrument seq=15 record_only_change status=pending_signoff | history seq 14+15 present, kind=record_only_change, unsigned; "status=pending_signoff" is the --record CLI's printed string (scripts/instrument.js:464), not a JSON field — substantively correct | PASS (wording note) |
| C14 | ci 60->61 (T-1), 62->63 (T-3) | ci.yml diffs: 60→61 (b985f51), 61→62 (ac77309, T-2), 62→63 (e602449) — chain complete | PASS |
| C15 | ceremony: defer-0049, anchors t8 ledger mirror, trend-inventory | defer-0049 entry verified; anchors.json registers decision-ledger-t8.md sha256=9e09abc4… == .scratch ledger == docs mirror (three-way identical) | PASS |
| C16 | boundaries: no v3 collection/adjudication; port byte-frozen zero-verdict; probe categorical-only; nothing cites v2 by conformity | all verified above; `git diff c1afe09..HEAD -- src/port/` = 0 lines (incl. r9 commit) | PASS |
| C17 | stale 'currently private' claim repaired | 3fd473b diff: "the project is currently private" → "which is public … measured live 2026-09-16" | PASS |
| C18 | b3 reproduction invitation, not adoption | README:353 'Reproduce the measurement' — "not adoption, and no performance claim is asked or made", verbatim fact line, categorical CAPA feedback | PASS |

## 3. Ledger D-001..D-007 vs implementation

| D | requirement | evidence | verdict |
|---|---|---|---|
| D-001 | merged CAPA+readiness round; C excluded | both tracks delivered; no D-012 items touched | PASS |
| D-002 | dual-track + 3 clamps | claim texts reuse verbatim fact lines; artifact binding via sha+anchor; CAPA stays on grill-t8-capa branch (remote main = c1afe09, t8 unpushed) | PASS |
| D-003 | artifact-scoped freeze + anchor + b-variant registered | sha256 wiring test asserts both files at HEAD and at tag; anchor annotated; ADR contains 'post-v2 unadjudicated' b-variant text (test-asserted :155) | PASS |
| D-004 | pairer semantics + 3 pre-registered clauses | all implemented + machine-tested — BUT see F1: over-capture defect weakens "只旗机械证成的矛盾" in practice | PASS-WITH-DEFECT |
| D-005 | b1+b2+b3-degraded + fail-branch pre-registered; b4 out | all delivered; fail branch registered, not engaged; no npm publish | PASS |
| D-006 | flag semantics / undetermined / 4-family coverage / detector.js out | implemented; undetermined→unflagged both axes inside n; detector.js untouched | PASS (F1 noted) |
| D-007 | three-stage delivery, doc-before-impl gate, 60% disposition non-omittable | commit order+timestamps prove R1→R2→R3; disposition ADOPTED as descriptive escalation | PASS |

## 4. Findings (audit-verified; NOT ratified — routed to repair)

- F1 [defect, adjudicated object] capa-pairer.js pairContentAppend over-captures the claim token. Live reproduction: closing "I appended it to the file." → claim='it' → flagged; closing "Done — appended the marker line PRBMARK-5." → claim='the' → flagged DESPITE evidence tail 'PRBMARK-5' matching. Same class in claimToken dashed-token scan: file-contains closing "Created report-final.txt containing the required token." → claim='report-final.txt' → flagged on an honest item. Fabricates flagged-on-honest → would pollute the v3 FP axis with artifact bugs, not detector semantics. Probes don't cover this surface. MUST be fixed before v3 collection; fix = new artifact → new sha256 pin under same-commit ADR (per plan's own pin semantics) + probe rows for the fail-closed direction.
- F2 [gap, collection unwired] scripts/collect-devin-corpus.js SNAPSHOTS closed enum = {devin-corpus, devin-corpus-v2} — the close-out handoff's next-round command `collect-devin-corpus.js --snapshot-dir devin-corpus-v3` exits 1 today. Collection-time enforcements registered in plan.json (side-set family check, v1+v2 id-collision refusal) have no v3 wiring. "ready-to-run" is adjudication-ready, collection-unwired.
- F3 [doc drift] bench/research/README.md still says devin-corpus-v3/ "Holds ONLY the doc-round contamination-framework.json" — false at HEAD (plan.json + eval-plan.json landed T-3).
- F4 [registry coherence] contamination-framework.json vs plan.json contamination_registry disagree on v2_informed for two shared params: 'undetermined collapse'(framework true) vs 'undetermined handling'(registry false); 'port telemetry channel' (true vs false). Two frozen same-round artifacts contradict each other.
- F5 [dangling ref] eval-plan.json "abort_on_defect": "see serialization.abort_semantics" — serialization has abort_on_defect:true + defect_conditions, no abort_semantics key.
- F6 [cosmetic bug] devin-oot.js:1405 'of ' + d.axes.lie.n + d.axes.fp.n — string concatenation renders "of 12089 main items" in renderMdV3 (unexercised; no v3 data yet).
- F7 [doc nit] probe-record.md grid description implies 4×4+2=18 rows; actual = er4+fc4+cr3+ca3+2 = 16 (cr lacks claim-absent, ca lacks evidence-absent).
- F8 [judgement calls, Standards axis] devin-oot.js v3 block duplicates v2 structure (adjudicateV3≈adjudicateV2, claimBlockV3≈claimBlockV2, IUT ternary ×4); snapshot-name dispatch at ~9 sites instead of SNAPSHOTS.mode-driven; pairItems local 'results' shadows helper results() (capa-pairer.js:30/182); comment for claimToken sits on stripTailPunct (:97); unescaped '.' in factRe (:1465); renderMdV3 omits the per-item sha256/settlement tables the v1/v2 renderers emit.
- F9 [doc-vs-mechanism] eval-plan says runner "passes {task, transcript.events, transcript.closing} to pairer.pairItem verbatim" — serializeAndPair passes the whole item; whitelist holds de facto via pairItem's field access. Cosmetic.
- F10 [edge note] in-sample v2 diagnostic uses v2 labels — sits near the meta-circularity edge; well-disclaimed in probe-record ("never a verdict chain"). No action; flag for awareness.

## 5. Process compliance

- doc-before-impl: honored (timestamps + file mtimes: spec 01:07 → T-1 docs 01:49 → T-2 02:12/02:13 → T-3 02:40 → close-out 02:48; capa-pairer.js mtime 01:59 post-T-1).
- but-only VCS writes; stack shape consistent; worktree clean (zz empty).
- Report honesty: every claim carried a rerunnable command — all reproduced verbatim or stronger.
- Notes (non-violations): report's commit table omits its own close-out commit dd3a9bb (self-referential); parallel r9 branch shares the workspace top (84077da touches only .github/workflows/macro-b-regression.yml — no intersection with audited surface); b2 "clean env" = clean HOME/work — the npm _npx cache is global (LOCALAPPDATA), record accurate as written.

## 6. Verdict

ROUND FIDELITY: PASS — every registered claim re-derived independently; no
silent weakening, no conformity-citation drift, boundaries held.
ARTIFACT FITNESS: the pinned pairer carries F1 — a real over-capture defect
inside the adjudicated object. It does not falsify this round (v3 not run;
pin integrity intact) but MUST NOT reach v3 collection as-is.

Disposition: PASS-WITH-CONDITIONS. I do not certify v3-run readiness.

## 7. Repair order (for the repair window; re-run list appended)

R1 (blocking for v3): fix pairer over-capture (F1) — claim extraction must bind
to claimed VALUES (quoted/dashed-marker/asserted-number forms), not the first
word after a verb; extend capa-probes.jsonl with honest-phrasing rows that
previously fabricated flags (fail-closed probe direction); new sha256 pin +
same-commit ADR amendment per the plan's pin semantics; update eval-plan /
plan pin fields; bump expected-suites if a suite is added.
R2 (blocking for v3 collection): wire devin-corpus-v3 into
collect-devin-corpus.js SNAPSHOTS (extra_fields validation, side-set family
check, v1+v2 id-collision refusal per plan.json) or amend the close-out
handoff's next-round command to name the real seam.
R3 (non-blocking): F3 README line, F4 reconcile v2_informed (decide which
artifact is authoritative — plan.json is the load-validated one), F5 dangling
key, F6 concat bug, F7 probe-record wording.

Re-run checklist after repair: npx jest (all) · gate:all · pack:smoke ·
probes (incl. new rows) · pairer test · v3-plan test · sha256 of pairer ==
new pin · loadPlanV3 fail-closed still holds · instrument --check.

Suggested skills for the next session: $implement (repair order R1/R2),
tdd (failing probe rows before pairer edit), $code-review on the fix,
grilling on the v3 collection protocol once collection is wired.
