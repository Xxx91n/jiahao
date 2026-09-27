# grill-t14 audit report — 2026-09-17 (audit window, report-only)

Scope: R1+R2 executed stack over base a8e0bdb (branches grill-t14-docs{kkr,pyq,pry}
+ grill-t14-r2{svn,slz,ryu,xzq,rtk,lll,mvy}). Auditor re-ran every gate and
spot-checked each report claim against the repo. Method: ctx_execute reruns +
rg/JSON inspection + code-review skill (two parallel read-only sub-agents:
Standards, Spec) + ctx memory search.

## Verdict

PASS with findings. All report claims verify against repo truth; all hard
gates re-ran green at HEAD. Findings are doc-level or disclosed deviations;
process deviations are reported below for owner adjudication, not ratified by
this window.

## Hard acceptance re-run (auditor-executed)

| gate | result |
| --- | --- |
| node scripts/run-test-gate.js --expected-suites 72 | OK: 72 suites, 1167 tests, 0 skipped |
| npx jest test/adr-0075-wiring.test.js | exit 0 |
| npm run gate:all | exit 0 (35 entries, 4 unverifiable ci-mode) |
| npm pack --dry-run --json | size=325192 entryCount=111 (< 340000) |
| node scripts/check-pack-smoke.js | smoke OK: tarball extracted, CLI dry-run plan matched, 325192 < 340000 |
| node scripts/instrument.js --check | OK identity pinned (conditional cert expires 2026-12-11) |
| node scripts/build-adr-index.js --check | in sync |
| node scripts/build-governance-anchors.js --check | 13 artifacts, digests in sync |
| node scripts/check-governance-inventory.js | OK 35 entries |
| node scripts/check-deferred.js | OK 53 entries (47 live, 6 closed/actioned) |
| node scripts/check-host-contracts.js | OK 17 contracts |
| node scripts/check-secret-scan.js | 3 rules, 0 hits (859/874/874) |
| node scripts/build-rewrite-map.js --check / --verify | in sync 1334 citations / 15 pairs verified |
| node scripts/pairer-lane-telemetry.js | organic=0; G1=false G3=false G4=true |

## Claim -> evidence -> conclusion

| # | claim | evidence | conclusion |
| --- | --- | --- | --- |
| C1 | boundary green 72/1167 | rerun at HEAD identical | VERIFIED |
| C2 | gate:all exit 0 | rerun identical | VERIFIED |
| C3 | pack 324711 < cap (packet) | current pack=325192; packet pins 324711 at measured_at_commit 7657a94 (exists: GitButler workspace commit); handoff/g6 replay already record 325192 | VERIFIED w/ drift note |
| C4 | pack-smoke liveness | rerun: extracted + CLI plan matched | VERIFIED |
| C5 | instrument seq 25/26 record_only_change; seq 24 pending | history tail shows 25/26; no record_signoff rows for 24/25/26; --record-signoff mechanism exists | VERIFIED |
| C6 | defer-0051 closed discharged-by-trigger, single-point caveat, trigger_override, owner pending | registry row: status=closed, closed_via discharged-by-trigger 324711<340000 + countersign, closure_note '1 data point existence check' + pack-smoke (wiring-pinned), trigger_override 'overrides review_at=2026-12-15'; packet signatures.owner_ratification=null | VERIFIED; sequence deviation -> F-1 |
| C7 | countersign weak-independent fresh-session | packet signature block: grade weak-independent, basis declared (separate session, shared infra), matches_packet=true, scope=this packet only | VERIFIED-AS-DECLARED (fresh-session provenance is attest-only) |
| C8 | defer-0059 closed + trend row (+1 0075, zero_product_diff, defer-0059) | row closed via same-commit ledger note; trend-inventory grill-t14 row present | VERIFIED; zero_product_diff stretch -> F-4 |
| C9 | defer-0055 pointer-only row | field sunset_trigger_pointer present, ends 'carries only the pointer' but restates clause summary inline | VERIFIED w/ F-3 |
| C10 | ADR-0075 preregistration frozen in R2 | git show 6427e1f on ADR = single Consequences bullet appended; D-A..D-E untouched | VERIFIED |
| C11 | 8-class taxonomy + 4 impl requirements + 200/20/5 + boundary | wiring test pins verbatim strings; test green | VERIFIED |
| C12 | defer-0053 frozen / 0054 actioned / 0057 pending / 0058 executed | registry rows + ledger T-2 dispositions match | VERIFIED |
| C13 | telemetry checkpoint organic=0, sunset counter 1/6 | txt+json consistent, organic=0; counter lives in ledger check-in trail | VERIFIED |
| C14 | two unbundled owner asks | report Ask A (record-type) / Ask B (judgmental) separate, each own exit | VERIFIED |
| C15 | no push; remote already a8e0bdb | git log -1 origin/main = a8e0bdb | VERIFIED |
| C16 | .scratch append-only; no source/runtime edits | stack diff: .scratch all additions; src/ only instrument-state.json; BUT scripts/build-rewrite-map.js (a shipped file, package.json files[]) was edited | VERIFIED except disclosed F-4 |
| C17 | generator repair (discovery anchor + union enumeration); spec amended | code: ls-files UNION ls-tree HEAD (build-rewrite-map.js:168-174), published_tip anchor (:303); spec: discovery rule added, Doc-citations bullet still ls-files-only | PARTIAL -> F-2 |
| C18 | rewrite-map 15 pairs / 0 removed / 11 published-only / published_tip a8e0bdb | counts {commits:15, published_only:11, removed:0}; citations now 1334 (later regens) | VERIFIED w/ drift note |
| C19 | README index 75 / ci 72 / glossary 4 terms / ledger byte-equal | all confirmed | VERIFIED |
| C20 | WORKFLOW.md absent (deviation) | file absent | VERIFIED |
| C21 | report '48 live, 5 closed' registry count | now 47/6 — defer-0059 close landed after the table snapshot | STALE-FIGURE (ordering artifact, self-consistent later) |
| C22 | O-E backlog consent-confirm | cadence rows dispositioned in ledger T-2; O-E appears only in handoff forward agenda | THIN -> F-5 |

## Findings (for owner adjudication — not ratified by audit)

- F-1 (moderate): defer-0051 row closed with signatures.owner_ratification still
  null. D-002's sequence reads re-measure -> countersign -> owner ratify ->
  registry closed; implementation closed at R2 with ratification pending and
  'rejection reopens' registered. Fully disclosed on every surface (row,
  packet, ledger, report, handoff) — materially different from the F-4
  premature-close (which was undisclosed) — but it is the same row and the
  letter of the sequence was not followed. Owner decision required.
- F-2 (minor): docs/rewrite-map-generator-spec.md documents the discovery
  anchor repair but NOT the union(ls-files, ls-tree HEAD) enumeration — the
  'Doc citations' Inputs bullet still says ls-files only. Spec/code drift on a
  file the generator names authoritative. Fix: one-line Inputs amendment next
  doc round.
- F-3 (minor): defer-0055.sunset_trigger_pointer restates the clause summary;
  D-C's 'pointer and nothing else' is the letter. Driftable duplicate —
  tighten to a pure pointer on the next registry touch.
- F-4 (disclosed deviation): scripts/build-rewrite-map.js is inside
  package.json files[] (ships); editing it inside a grill/doc round stretches
  D-001's 'no source edits' letter, and trend-inventory zero_product_diff=true
  reads broader than reality (gate tooling, not hook runtime). Disclosed in
  report Deviations; logged, not ratified.
- F-5 (minor): O-E backlog consent-confirm is thin (forward-agenda mention
  only); cadence registry items did get ledger dispositions.
- Nits (judgement calls, Standards axis): stale FAIL message in
  build-rewrite-map.js still describes the tip-only rule; catch{} on a corrupt
  prior map silently degrades discovery vs the file's loud-failure ethos;
  path.join(ROOT, OUT_REL) x3; adr-0075-wiring asserts defer-0059 'closed'
  twice and puts R2 state inside the R1 describe; shotgun-surgery cost of the
  wiring-seed convention; .scratch/gen-docs.cjs hardcodes ROOT=D:/Aworker/jiahao.

## Process review

- pyq red intermediate: disclosed per O-B; boundary state verified green by
  rerun. OK.
- WORKFLOW.md absent: disclosed; conventions recovered from prior report. OK.
- Evidence-table figures (48/5 registry, 324711 pack, 1270 citations,
  858/869/869 scan) are at-time-of-writing values that drifted through the
  report's own tail commits (lll/mvy). Ordering artifact, not misstatement.
- check-deferred SUGGEST advisories: defer-0004 and defer-0026 conditions
  report SATISFIED — pending human activation review (pre-existing, not this
  round).
- VCS discipline: all writes via but; t13 r2-round-diff.patch stays
  uncommitted (tq); this audit's round-diff.patch is likewise uncommitted and
  must stay so (contains sha literals that would pollute citation scans).

## Audit scope note

This window audited R1+R2 execution only. The two owner asks (seq-24 sign-off,
defer-0051 packet ratification) remain open by design.
