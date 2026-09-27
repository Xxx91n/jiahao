captured-at-head: b61d7951

# grill-t29 second-party audit report (2026-09-27)

Auditor: independent audit window. Object: lanes `grill-t29-impl` (stacked on
`grill-t29-docs`) over base `c7ae4f81` (origin/main tip at round T-0); audit
HEAD `fec9268c` (workspace commit) over substantive tip `b61d7951`; SEAL
`c2768fc8` declares `f9bcc13f` with `recorded_at: 2026-09-27`. Claim artifacts
under `D:\Aworker\jiahao\.scratch\grill-t29\` (report / handoff /
round-facts.json / SEAL / decision-ledger D-001..D-006 /
spec-t29-disposition / GOAL / tide-adjudication-packet drafts).

Verdict: **FAIL — return to fix window.** The machinery claims are largely
substantiated (all 14 findings carry registered dispositions; the four new
legs exist and pass standalone; every registered seal intact; D-001..D-006
substantially implemented), but the terminal state is RED at audit HEAD:
confirmatory legs `[208 rewrite-map]` and `[209 rewrite-map-published]` FAIL
("docs\rewrite-map.json is stale"), the jest battery fails 2 rewrite-map
tests (`run-test-gate --expected-suites 83` exit 1, 1409/1411), and
`run-gates.js` exits 1. Root cause is self-inflicted inside the terminal
wave: `c2768fc8` regenerated `docs/rewrite-map.json` while evidence pins
still read `bd10ef66`, then re-pinned all captures to `f9bcc13f` inside the
same commit without re-running the map — the committed map was stale at
landing — and post-seal claim `b61d7951` added two more unmapped citations
(`f9bcc13f`, `ac525728` in the dated handoff). The report's "rerunnable"
green battery and the handoff's "gate:all exit 0 / all seal invariants
green" describe a pre-re-pin intermediate tree, not any committed state.
Per separation of duties this window touches nothing; A-1 routes to the fix
window with the §7 rerun list.

Independent re-run captures: `D:\Aworker\jiahao\.scratch\grill-t29\audit-evidence\rerun\`
(13 captures + 2 helper scripts, untracked per nc-001 — referenced here by
path/count pointer only, never copied into this committed surface, per the
D-003 writing convention).

## 1. Independent acceptance re-run (not trusting report self-description)

| leg | report claim | audit re-run | verdict |
| --- | --- | --- | --- |
| compile | `node --check` over 183 shipped .js + yaml parse | 315 tracked .js all OK (superset); the 183 enumeration reproduced exactly (scripts 55 + src 19 + test 93 + bench 9 + hooks 7 + adapters 0); ci.yml + .aider.conf.yml parse via js-yaml | confirmed |
| package | `npm pack` + `check-pack-smoke.js` EXIT 0 | EXIT 0 — tarball 370303 B / 120 files < 380000 budget (ADR-0039); surface include/exclude asserted | confirmed |
| liveness | extract -> `install.js --help` -> `init --dry-run` | EXIT 0 — `install.js --help` prints; `init -y --dry-run` writes would-be profile "verifier" (bare `init --dry-run` needs -y; same harness note as t28) | confirmed |
| full jest | 83/83 suites, 1411/1411 tests, EXIT 0 | **FAIL — `test/rewrite-map.test.js`: 2 tests red** (`--check green with old-side refs` expected status 0 got 1; `--published-only` same), 1409/1411, GATE_EXIT 1 (~86 s) | **failed at HEAD** |
| gate:all | `run-gates.js` — 41 entries incl. 220-223 | **exit 1** — `[208 rewrite-map]` FAIL + `[209 rewrite-map-published]` FAIL (confirmatory), 4 UNVERIFIABLE legs (ci-mode/bench-corpus absent) = registered degrade; every other leg PASS incl. all four new ones | **failed at HEAD** |
| orphan leg | OK — pins ancestral, trigger ok | EXIT 0 — 119 pin(s) / 14 unique sha(s) ancestral; trigger ok (workspace descends from last seal f9bcc13f) | confirmed (counts grew post-claim, expected) |
| deferred | 69 entries, EXIT 0 | EXIT 0 — 69 entries (56 live, 13 closed/actioned) | confirmed |
| exception-channel | 3 entries complete + in-force | EXIT 0 — 2 channel fields, 3 entries complete and in-force | confirmed |
| classification | "80 consumed paths" EXIT 0 | EXIT 0 — but the leg reports **82** consumed paths; the committed capture `evidence/classification-consistency.txt` also says 82 — the report's 80 is wrong (A-2) | **claim imprecise** |
| hermetic lint | EXIT 0 | EXIT 0 — every git write op in test/**.js routes through the helper | confirmed |
| anchoring footer | post-registration commits verified | EXIT 0 — 16 post-registration commits verified vs `git show --name-only`; I additionally confirmed all 17 non-workspace round commits carry `[ANCHORING]` | confirmed |
| evaluateRound | t24-t28 seals intact; t29 claims clean in-flight; t27's 13 bads pre-existing | re-run at HEAD: t24..t28 seals intact + unamended, freezeViolations 0, unregisteredClaims 0 everywhere; t29 claims=4 (50e6322f, bd10ef66, f9bcc13f, b61d7951) all bad=0, seal declared f9bcc13f unamended; t27 bad=13 reproduced | confirmed |
| SEAL file | declares f9bcc13f + recorded_at | verbatim: `seal: f9bcc13f24a9b14ab7ff98bd6163a90db8ffa59b`, `recorded_at: 2026-09-27`; t28 SEAL confirmed missing `recorded_at` (F-12 premise true) | confirmed |
| rewrite-map legs | green inside gate:all | **FAIL at HEAD** — see §5 A-1 | **failed** |

## 2. Physical spot-checks (repo truth vs report claims)

- `docs/gates.json` — 41 entries, orders 0..223; 220/221/222/223 = the four
  new legs with the claimed commands; tier confirmatory.
- `scripts/check-exception-channel.js`, `check-classification-consistency.js`,
  `check-test-git-hermetic.js`, `check-anchoring-footer.js` — all present,
  all exit 0 standalone.
- `docs/governance/surface-taxonomy.json` — `field_governance` block present,
  nested classification map covering every taxonomy field, block itself
  `fenced`; `exception_channel` schema (5 required fields, closed status
  enum, no_wildcard_scope, lifecycle clause); `exceptions` = 3 object entries
  (next-round.md, audit-report.md, the for_commit F-9 entry bound to
  `40362867f207180bc3cdfc3388d176bb374cde2a` — verified identical to the
  landed correction commit sha).
- `scripts/evidence-freshness.js` — F-1..F-5 anchors verified in source:
  registered `pin_patterns` consumed (throws if absent, fail-closed);
  `non_anchoring_classes.seal_file` consumed at lines 68/259/472 (private
  `/\/SEAL$/` gone); `recorded_at` ordering = ISO day, else commit-date
  fallback, `order_source` recorded, 'null' can never outrank; loose
  enumerator `pinEnumPattern` + strict per-line parse; scan root derived
  from `artifact_scope`; natural round sort (`roundNumOf`);
  `ORPHAN_SCOPE_RE`/`ORPHAN_PIN_RES` absent. Residues: see §5 A-6/A-7/A-8.
- `test/helpers/git-hermetic.js` — exists; Standards sub-agent verified all
  test/** git write argv route through `hg.git`/`hg.mkRepo` and remaining
  raw calls are read-verbs only.
- `docs/adr/0086-*.md` — present (140 lines); D-A classes, D-B lifecycle,
  D-C legs, D-D self-audit; line 50-51 carries the t28 D-003(v) fence
  migration verbatim-ish ("MIGRATED here … one rule source"); joins the
  countersign queue. `docs/adr/0085-*.md` line 61 carries the append-only
  field-governance pointer.
- `docs/governance/ERRATA.md` — E-15 + E-16 present verbatim (channel-
  enablement not freeze-violation; 161 correction + ADR-0084 second line).
- `docs/deferred-registry.json` — defer-0075 present, pending-evaluation,
  review_at 2026-12-15, last_check_in 2026-09-27; 69 entries total.
- `docs/governance/trend-inventory.json` — grill-t29 row: kind fix,
  adr_added [0086], zero_product_diff true, carve_out_used 0,
  governance_tooling_diff cumulative files[] + reason (ADR-0078 form).
- `AGENTS.md` — hermetic-git bullet + `[ANCHORING]` bullet + F-6 residual
  window + F-7 human-only adjudication points + audit-report claim-surface
  bullet all present verbatim in the live rules file.
- `CONTEXT.md` — glossary additions present; `.github/workflows/ci.yml`
  `--expected-suites 83`; README ADR index lists 86 records incl. 0086.
- Commit topology: 18 commits `c7ae4f81..HEAD` (17 substantive + 1 workspace
  commit); sampled `git show --name-only` sets match their messages.
- F-9 commit `40362867`: surgical — exactly `180+` -> `161` in the t28
  report + a 7-line Correction note; bound by the for_commit exception.
- Human-only boundary honored: `git tag -l 'adjudicated/*'` =
  devin-corpus-v2, grill-t25, grill-t26 only (no t27/t29 tag); nothing
  pushed; tide packet is drafts-only.
- nc-001 pools untouched: `.scratch/grill-*/audit-evidence`, prior audit
  handoffs, ref-assets remain untracked.

## 3. Dual-axis review (code-review skill, fixed point c7ae4f81)

Two parallel read-only sub-agents; findings adjudicated by this window.

### Standards

Verified compliant: hermetic-git routing (~20 call sites, write-verbs all
through the helper); split-form evidence counts (no fixture split exists —
vacuously satisfied); mid-round reds disclosed in report §4; report/handoff
residence on claim surfaces; ADR-0085 pointer line; gates.json 220-223
matching wiring pins; ERRATA E-15/E-16.

Findings adjudicated:
- A-2 (prose/evidence drift): report claims "80 consumed paths"; committed
  capture says 82. HARD — same class the round fixed in t28 (F-9).
- Stale capture body under re-pinned header: `evidence/anchoring-footer.txt`
  (head f9bcc13f) reports "11 commits verified" while same-head
  `gate-all.txt` reports 14 and HEAD reports 16 — the standalone body
  corresponds to ~`d390fd1d`. Consequence of the A-1 re-pin wave; the pin
  is honest, the body is pre-re-pin. Rolled into A-1's ordering defect.
- `clean-tree.txt` arithmetic: "22 total" vs "18 nc + 3 round-surface" —
  1 line unaccounted. Nit.
- Latent defects — see §5 A-5..A-9 (private-copy recurrences + dead code +
  fail-open edge).
- Fowler smells (judgement, non-blocking): duplicated `buildRepo/put/ci/gg`
  fixture block ~4x in `freshness-checker.test.js`; Middle Man
  `run`->`spawnStatus` in `adr-0086-wiring.test.js`; dead regex assertion at
  adr-0086 line ~402; gate-all committed capture embeds a `fatal: …SEAL…
  not in HEAD` stderr line (cosmetic — capture ran pre-SEAL-commit);
  display-form `$` lines unmarked (heritage across rounds, tolerated).

### Spec

Verified compliant: exception-channel schema/lifecycle; classification
block nested + self-fenced + consumption leg; ADR-0086 content +
countersign self-application + ADR-0085 pointer; F-1..F-5 fixes with
fixtures; hermetic helper + lint + migration; anchoring-footer leg
(footer==landed, merge/workspace exempt, forward-only); F-9 via for_commit
40362867; F-10 in E-16; F-8 in E-15; tide packet shape; defer-0075; trend
row; SEAL `recorded_at`; human items drafted-only.

Findings adjudicated:
- A-3 (missing): spec §7 / D-005(iv) required the ADR-streak advisory
  disposition recorded "mitigated, closed" — recorded nowhere (trend row,
  report, ERRATA, packet all silent). MISSING.
- A-4a (partial): spec §7 required the carve-out burn-rate advisory as a
  packet context item — the five context items omit it (item 3's own
  context covers ratchet substance; the standalone advisory row is absent).
- A-4b (partial): spec §3 self-audit enumeration required the "hard to
  retire (removal requires adjudicating every in-flight exception)" and
  "agile waiver vs governance rigidity" dimensions — D-D lists the five
  semantics but names neither cost dimension.
- A-4c (partial): spec §6 "derived … DCO -s-style automation" — no
  derivation tooling exists; footers are leg-verified but provably-derived
  is not evidenced. Convention text says derived-never-hand-typed; the
  leg's verification cannot distinguish derivation from care.
- Nit: `gates.json` legs 222/223 carry `source_adr: ADR-0086` while the
  conventions live in AGENTS.md (ADR-0086 D-C itself says "registered in
  AGENTS.md, not a new ADR") — misattribution nit.
- Nit: spec §11 still reads `--expected-suites 82` (actual 83).
- Scope creep: none found.

## 4. D-disposition verification (claim -> evidence -> conclusion)

| claim | evidence (committed surface) | conclusion |
| --- | --- | --- |
| D-001 audit-disposition round; every finding dispositioned; impl-round class; human items drafted only | report §1 dispositions table covers F-1..F-14 with carriers; R2 machinery diff present (implementation territory); tide packet drafts-only; no tags/pushes | implemented |
| D-002 machine-checkable classification block + exception channel semantics + 2 CI legs | taxonomy `field_governance` block (nested, self-fenced, class_enum); exception objects carry the 5 required fields; legs 220/221 green standalone + inside battery | implemented — with latent residues A-5/A-6/A-7 (same private-copy disease in new code) |
| D-003 ADR-0086 + self-audit + D-003(v) fence migration + ADR-0085 pointer + trend row + countersign self-application | all present (ADR lines 50-51 migration; 0085:61 pointer; trend row; queue 20) — self-audit omits the two cost dimensions | implemented, self-audit partial (A-4b) |
| D-004 hermetic helper + lint leg + AGENTS.md convention + call-site migration | `test/helpers/git-hermetic.js` + leg 222 green + AGENTS.md bullet + all write-argv routed | implemented — leg carries a fail-open edge + dead `runners` map (A-9) |
| D-005 tide packet (self-contained items, unselected options, signatures, 5 substantive front + bulk) + defer-0075 + adr-streak disposition | packet verified item-by-item (6 signature lines, both-directions consequences); defer-0075 registered | implemented except: adr-streak disposition missing (A-3), burn-rate context item absent (A-4a) |
| D-006 `[ANCHORING]` convention + equality leg + honesty boundary + forward-only | AGENTS.md bullet verbatim; leg 223 green (16 commits); forensic-not-preventive text present; pre-registration commits exempt | implemented — derivation-tooling aspirational (A-4c); root-commit crash path (A-9) |
| F-1/F-2 registered pin_patterns/seal_file consumed | verified in source + fail-closed on missing table | fixed |
| F-3 recorded_at ordering | ISO day -> commit-date fallback; 'null' cannot outrank | fixed |
| F-4 loose enumerator + strict parse + whitespace fixture | `pinEnumPattern` loose form + strict parse; fixture in battery | fixed — HEAD_RE private strict copy remains (A-8) |
| F-5 natural sort + scope-derived root + prefix-aware exemptions + ORPHAN_SCOPE_RE removed | all verified; `scanRoot(artifact_scope)` wired | fixed — classifiers() still hardcodes the scope literal (A-6) |
| F-6/F-7 registrations on standing surfaces | AGENTS.md bullets present verbatim | registered |
| F-8 channel re-registration + E-15 + tide item 1 | object entry pending-confirmation expires 2026-12-15; E-15 verbatim; packet item 1 | discharged correctly |
| F-9 180+ -> 161 surgical + for_commit bound | commit 40362867 verified (8+/1-); exception sha matches | fixed correctly |
| F-10 ADR-0084 second line disclosed | E-16 names it | discharged |
| F-11 anchoring-footer convention + leg | registered + leg green + honesty boundary | discharged |
| F-12 machinery hardened + owner disposition staged | commit-date fallback live; tide packet item 4 | discharged (owner call pending) |
| F-13 nits | discretion exercised; none met the bar | acceptable |
| F-14 candidate hermetic fixtures | D-004 machinery landed | discharged |
| Terminal regime: captures -> claim -> SEAL -> post-seal disclosed | SEAL landed + disclosed; BUT the wave commit landed self-inconsistent and HEAD is red | **breached — A-1** |

## 5. Findings and routing

Fix-window rework (rerun list §7):
- A-1 (BLOCKING): HEAD red — regenerate `docs/rewrite-map.json` to cover
  the 17 re-pinned evidence line-1 cites (bd10ef66 -> f9bcc13f) + the 2
  post-seal handoff cites (f9bcc13f, ac525728); re-run the battery; the
  red window must be disclosed in the report's deviations and the
  re-pin-then-no-regen ordering recorded (ERRATA candidate — the
  post-claim re-capture contract lacks a "regen after final re-pin" step;
  owner decides E-numbering).
- A-2: report §3 "80 consumed paths" -> 82 (forward correction; F-9 class).
- A-3: record the adr-streak advisory disposition `mitigated, closed`
  (spec §7 / ledger D-005(iv)) on a committed surface.
- A-4a/b/c: packet burn-rate context row; ADR-0086 D-D cost dimensions;
  footer-derivation tooling or explicit convention softening — fix-window
  discretion which ride this repair or a later round.
- A-5..A-9 latent machinery: `check-exception-channel.js` ALLOWED_BINDING
  private copy of registered `optional_fields` (F-1-pattern recurrence);
  `evidence-freshness.js` classifiers() hardcoded scope literal;
  `exceptionActive` `for_commit` unchecked when called sha-less
  (orphanAncestry path — over-suppression, latent while
  `errata_exemptions` is empty); `HEAD_RE` strict private copy; the
  anchoring-footer root-commit crash path; the hermetic leg's dead
  `runners` map + unclassifiable-indirect-argv fail-open edge vs its
  "unclassifiable = red" header claim.

Owner adjudication: none new — the tide packet's six items stand as
staged. Whether the wave-commit ordering defect is ERRATA-class or
report-note-class is the owner's call; this window's recommendation
(non-binding): an ERRATA row, because the committed terminal-green claim
was false at landing.

## 6. Process observations (reported, not ratified here)

- P-1: the terminal wave's capture pipeline re-pinned `captured-at-head`
  headers after the battery ran; no leg re-ran against the final tree.
  "Round-final must be green" was breached at the moment of landing and
  remains breached at HEAD. The machinery caught it (208/209 red at the
  next eval) — the human contract around post-claim re-capture did not.
- P-2: report §4's deviations list omits this red window — omission by
  non-observation, not concealment; still must be disclosed post-fix.
- P-3: `b61d7951` is a legal post-seal claim commit (evaluated at its own
  point, bad=0) — but edits to claim surfaces that introduce citations
  must regen the map; add to the rerun checklist.
- Evidence-count convention: `evidence/` holds 20 captures; commit prose
  says "19 evidence captures" (t28 same shape: 16 files / "15 captures").
  Consistent N-1 — but the excluded-file convention is undocumented; name
  it in the rework note.
- All mid-round reds were disclosed in report §4 (for_commit retro window,
  anchoring temporal scope, wiring seal-clause) — honest practice, kept.

## 7. Rerun instructions for the fix window

    cd D:\Aworker\jiahao
    node scripts/build-rewrite-map.js           # regen, then commit the diff
    node scripts/build-rewrite-map.js --check   # must exit 0
    node scripts/build-rewrite-map.js --published-only
    node scripts/run-test-gate.js --expected-suites 83
    node scripts/run-gates.js
    node scripts/check-orphan-ancestry.js
    node scripts/check-deferred.js && node scripts/check-governance-inventory.js
    # plus evaluateRound(grill-t29): seal stays intact, claims clean,
    # freezeViolations empty — and the A-1 red window disclosed in §4.
