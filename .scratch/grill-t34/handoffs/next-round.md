# grill-t34 next-round task book — derive-from-source contract round

Authority chain: `.scratch/grill-t34/decision-ledger.md` (D-001..D-005,
all current) → `.scratch/grill-t34/spec-t34-derive.md` → this book.
Ledger wins on conflict; ledger-silent → stop and ask before inventing.

Round object (D-001): replace hand-maintained declaration/verification
surfaces with source-derived artifacts + weak self-consistency. Three
bodies: declared-count manifest (§2/D-002), countersign reject-branch
pre-registration (§3/D-003), audit re-run surface mechanization
(§4/D-004).

Standing rules (AGENTS.md): but-only VC + explicit allowlists + derived
`[ANCHORING]` footer + `git show --name-only` verify; audit-evidence
never committed (nc-001); E-17/E-19 wave-closeout order (derived
artifacts last, rewrite-map LAST); post-restack ritual; hermetic git
helper for test writes; bare-SHA soft constraint; fs.writeFileSync /
file-edit tools for committed artifacts; queue-authority clause
(derived membership, no count lines); baseline-CI clause (public-CI
check at T-0); audit self-consistency interim clause — RETIRES this
round (D-004).

## Tasks

### T-0 Baseline recon + scope guard — D-001

- Standing baseline-CI item: `gh api repos/Xxx91n/jiahao/actions/runs`
  → record tip run conclusion + failing step (expect green post-t33).
- Enumerate: the four README declaration sites, `ci.yml:107` call line,
  test-file enumeration (`jest --listTests` count), live JUnit counts,
  next-free ids (ADR 0090/0091, defer 0078..0083, gate order slots
  >225) → baseline note at `.scratch/grill-t34/handoffs/baseline.md`.
- Scope guard: only registered ledger items enter the round.

suggested skills: research, neat-freak.

### T-1 `build-test-manifest.js` generator — D-002(i)

- Emits `docs/test-manifest.json`: `enumeration.suites` +
  `enumeration.suite_files[]` from jest `--listTests` (independent
  channel); `junit.tests`/`junit.skipped` from a blessed jest run via
  jest-junit-lite (or `--junit <path>` to consume an existing artifact);
  `--check` = regenerate + diff. JUnit-derived `suites` forbidden —
  circularity red line.
- Pin the generator invocation tier; verify enumeration tier-invariance
  once (author env == CI env).

suggested skills: tdd, domain-modeling.

### T-2 README sentinel blocks — D-002(ii)

- Marker-sentinel generated regions (ADR-0043 D-B spliceRegion —
  fail-closed on missing/inverted/duplicate sentinels) around the two
  English declaration sentences + the two zh-CN mirror sentences; the
  T-1 generator writes all four in one commit (ADR-0079).
- Wiring test for sentinel fail-closed + block derivation (new suite —
  enters manifest count automatically).

suggested skills: tdd.

### T-3 run-test-gate argv retirement — D-002(iii)(v)

- Drop `--expected-suites` entirely; canonical manifest path hardcoded;
  post-jest asserts `collected == manifest` (suites AND tests); gate no
  longer reads README.
- `ci.yml` call line → bare `node scripts/run-test-gate.js` in the SAME
  commit; gates.json test-entry params block synced (ADR-0036 D4).

suggested skills: tdd.

### T-4 `check-test-manifest` leg — D-002(iv)

- New check-*.js + gates.json registration (R2 carve-out): freshness —
  recompute `--listTests` vs manifest enumeration; README sentinel
  blocks == manifest-derived text in both READMEs.
- Leg name/output never implies battery status. Independent of jest
  result — this is the masking-class kill.

suggested skills: tdd, neat-freak.

### T-5 Wiring re-anchors + pack exemption — D-002(vi)(vii)

- adr-0057/0058-wiring: argv asserts → call-line shape + manifest
  presence. adr-0080/0081/0082-wiring: literal `--expected-suites 90`
  pins → re-anchored. adr-0083-wiring:194 `argv == glob` →
  `manifest.enumeration.suites == glob` (re-anchor, not new mechanism).
- Manifest must NOT enter `package.json` `files` — wiring asserts the
  absence (ADR-0039 D3 headroom precedent).

suggested skills: tdd.

### T-6 ADR-0091 — derive-from-source mechanism contract — D-002(viii), D-001(vi)

- Carrier ADR for the whole derivation contract (manifest + checklist +
  coverage + argv retirement + interim-clause retirement); authority
  cite = ADR-0043 Cluster-1 (registration + generator + freshness check;
  no new authority class minted); names the forward-supersession of
  t33-D-004(iii)① explicitly.
- New-form status (joins countersign queue as derived member; no count
  lines).

suggested skills: domain-modeling, neat-freak.

### T-7 ADR-0090 — countersign rejection disposition contract — D-003(i)-(iv)

- Triple clause: non-retroactivity (0086 rule-6 mirror) / disposition
  menu as default floor (owner override → errata deviation note) /
  status transition (Rejected-at-tide amend + queue removal).
- Class rule: concretization mandatory where queued ADR introduced
  machinery → concretize 0086-0089 (widening registered); label-only
  members take supersession default. 0089: classifier→three-class,
  leg-225→advisory, orphan-cites.json preserve-archive.
- 0090 self-row: rejected → knowingly revert to pre-0090 state.
- Owner-incapacitated residual named honestly; no count lines in prose.

suggested skills: domain-modeling, neat-freak.

### T-8 `countersign-overdue` leg — D-003(v)(vi)

- Three-stage (ADR-0089 D-E ladder): inside grace (return-by..+30d)
  SUGGEST/advisory; past grace FAIL with declared-drift-shaped output
  (rebuild / re-seal / declared-drift exits named). Asserts "no
  unadjudicated member silently permanent", never "owner must act".
  Grace reason registered (~1/3 tide interval, covers one post-tide
  working window).
- R2 carve-out (registered + counted + trend-row); injected clock for
  determinism (test fixture discipline); suite enters manifest count;
  enumerated in the t34 audit re-run table while interim clause lives.

suggested skills: tdd, neat-freak.

### T-9 `build-audit-checklist.js` + emit helper — D-004(i)(ii)

- `docs/governance/audit-checklist.json`: every ci.yml job's ordered
  run lines (parseJobs/runLines zero-dep approach); `--check` asserts
  committed == regenerated.
- `emit` prints the checklist commands for the auditor to paste into
  the report's coverage block and attest (auditor declares what they
  ran; generator never co-signs).

suggested skills: tdd.

### T-10 `audit-surface` leg + report contract + clause retirement — D-004(iii)-(vi)

- Leg asserts latest audit report's `<!-- audit-coverage v1 -->` block
  ⊇ checklist; temporal scope = reports authored on/after convention
  registration date (t33 reports not retro-convicted); missing
  block/items = FAIL.
- AGENTS.md: retire "Audit self-consistency (interim)" clause →
  pointer to mechanism, same commit as leg landing (no coexistence
  window).
- defer-0076 flips to `actioned` + check-in note when checklist +
  declaration land (registered mechanical act).

suggested skills: tdd, neat-freak.

### T-11 Registration batch — D-001(iii)(iv), D-005

- defer-0078..0083 pending-evaluation rows: skip-attribution protocol,
  map-pairing recipe, R2-F4, F-11, settle-window batch, t27/t28
  asymmetry+errata_exemptions — convention cited as t33-D-004(ii).
- E-26 erratum: audit-handoff candidate-list omission (asymmetry class
  instance); then fix the handoff document (add the missing row).
- CONTEXT.md glossary: resolve new-term candidates (Test Manifest /
  Audit Checklist / Audit Coverage Block / Countersign Overdue /
  Rejection Disposition) at domain-modeling time.
- AGENTS.md queue/baseline-CI clauses untouched.

suggested skills: neat-freak, domain-modeling.

### T-12 Wave closeout + self-dogfood — all current D-xxx

- Suggested waves: mechanism wave (T-1..T-5, T-8..T-10 — sentinel
  blocks land same commit as check-test-manifest); ADR/registration
  wave (T-6, T-7, T-11); generated-surface wave last (manifest + README
  blocks + ADR index); intermediate red allowed, round-final green.
- E-17/E-19 order: re-capture pins → regen derived artifacts (manifest
  → checklist → anchors → rewrite-map LAST) → `--check` +
  `--published-only` clean → declare; re-run `--check` after the last
  `but` mutation.
- Self-dogfood: t34's audit re-run table enumerates the checklist (the
  interim clause still binds until T-10 retires it); t34's audit report
  carries the first coverage block.
- Clock: if the window slips past 2026-10-15, amend defer-0076
  `review_at` BEFORE the date.
- Tide-eve disposition re-verification step registered into the
  closeout order (D-003(vii)).

suggested skills: gitbutler/but, neat-freak, tdd, code-review.

## Round-level suggested skills

- tdd — generator/leg/wiring work
- domain-modeling — ADR drafting + glossary sync
- neat-freak — registration routing + residue
- gitbutler/but — every VC mutation
- atomcode-research — only if a new fork surfaces (research before
  deciding, never decide-then-verify)

## Not-in-round (registered elsewhere — do not absorb)

- skip-attribution protocol → defer row (t35 candidate)
- map-pairing recipe → defer row
- t32 four carry-overs → defer rows (t35+)
- defer-0077 cap economics → stays pending-evaluation (review 12-15)
- Owner-side: t27 tag push, tide unbundling/interim checkpoint, ADR-0089
  entity countersign, all reject/ratify adjudications — registered
  reminders only, agent never performs
- Rollback implementation of any reject disposition — pre-registration
  only this round
