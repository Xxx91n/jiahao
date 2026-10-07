# grill-t33 next-round task book — V8 correction track

Authority chain: `.scratch/grill-t33/decision-ledger.md` (D-001..D-004, all
current) → `.scratch/grill-t33/spec-t33-correction.md` → this book.
Ledger wins on conflict; ledger-silent → stop and ask before inventing.

Round object (D-001): V8 critique correction track — README declared-count
repair, E-25 registration, countersign-queue authority closure, defer-0076
bridge registration. Contract-design items are transferred to t34
(spec §1 transfers), never silently absorbed.

Standing rules (AGENTS.md + new clauses per §6): `but`-only version control
with explicit allowlists; derived `[ANCHORING]` footer verified via
`git show --name-only`; audit-evidence never committed (nc-001);
E-17/E-19 wave-closeout order (rewrite-map LAST); post-restack ritual +
orphan-ancestry leg after a lane-closing op; hermetic git helper for test
writes; bare-SHA soft constraint in newly committed prose (subject/date
context where practical); committed artifacts via fs.writeFileSync or
file-edit tools, never escape-interpreting shell layers; report surfaces
cite committed-reachable evidence only.

## Tasks

### T-0 Baseline recon + scope guard — D-001, D-003(iv)

- Apply the NEW standing item to this round itself: query public CI —
  `gh api repos/Xxx91n/jiahao/actions/runs?per_page=5` — record tip run
  conclusion + failing step name. Current expectation: red (README drift,
  known); record the actual reading.
- Enumerate the four README declaration sites (README.md:337/356,
  README-zh-CN.md:280/295), `ci.yml:107` `--expected-suites` value, and the
  actual jest battery counts → baseline note at
  `.scratch/grill-t33/handoffs/baseline.md`.
- Scope guard: nothing outside the ledger/spec enters the round.

suggested skills: research (quick lookups), neat-freak (surface routing).

### T-1 Declaration-surface survey + closed category set — D-002(i)(v)

- Survey all 89 `docs/adr/*.md` declaration surfaces; normalize the three
  registered awaiting forms (old-form labels / E-13 pointer lines /
  new-form status) against observed wording variants.
- Build the closed category set {awaiting×3 / countersigned-or-final /
  registered-exempt}; enumerate the derived queue — expected 23
  (10+9+4). Report deviations; never repair by hand.
- Output: survey table appended to baseline.md.

suggested skills: domain-modeling (terminology check), neat-freak.

### T-2 Queue reconciliation wiring test — D-002(ii)(iii)(iv), D-004(iii)⑤

- New independent file `test/countersign-queue.test.js`; header lists
  bound ADRs (0084, 0086).
- Member-level reconciliation: every ADR's declaration classifies into the
  T-1 closed set; undeclared = fail; queue set = union of the three
  awaiting forms.
- NO count-equality assertions (cancellation-blindness). Optional forward
  check: ADRs newer than 0089 carry no `N -> N+1` count-bump lines.
- No retro-fix on 0087/0088 — they are already declared members.

suggested skills: tdd.

### T-3 Queue convention registration — D-002(iii)(vii)

- AGENTS.md working agreement +1 clause: queue membership is authoritative
  on per-ADR declaration surfaces; the queue is the derived set; count
  narratives are display-only; new ADRs must not write count lines.
- CONTEXT.md "Countersign Queue" entry (:2465): verify the definition
  matches derived-membership semantics; update inline only if it
  conflicts (domain-modeling — no parallel term).

suggested skills: domain-modeling, neat-freak.

### T-4 README + zh-CN + ci.yml repair — D-001(i)①, D-004(iii)①

- `ci.yml` `--expected-suites` 89→90 in the same commit as the suite-
  adding change (T-2's test file).
- README.md:337/356 + README-zh-CN.md:280/295 → final measured values at
  wave-final (after all suite-affecting changes land); zh-CN in the same
  commit (ADR-0079). Numbers are a one-time measured record.
- "7 skips" declaration-scope verification (D-001 negative req): measure
  the public-tier skip breakdown (11 skipped total; delta-4 are
  bench/ci-mode capability-negative). Wording-precision fix only if the
  scope qualifier reads as a total; never a bare number change.

suggested skills: neat-freak.

### T-5 E-25 registration — D-003(i)(iii)(v)

- ORDERING: after T-3 lands (D-002 negative req — channel boundary first).
- Single entry, terminal-state snapshot, three numbered items per
  spec §3: event (5 consecutive failures + failing step + drift figures),
  audit-table fact (run-test-gate row absent from t32 Hard-acceptance
  tables; "surface gap" cited as the critique's wording, not
  countersigned), disposition boundary (correction here / mechanism t34).
- Factual registration — no pending-confirmation wording. Bound-by line +
  the self-justifying sentence for the convention-existence binding form.

suggested skills: neat-freak (registration routing), domain-modeling.

### T-6 defer-0076 + defer-0077 rows — D-003(ii), D-004(ii)

- defer-0076 bridge row: mechanical presence-condition unfreeze_if
  (spec §5 wording), review_at = 2026-10-15 (pinned by spec-t33 on
  2026-09-29), cadence_tier = quarterly, linked to E-25.
- defer-0077 observation row: cap fifth-amendment distribution-form
  economics unpriced; pending-evaluation. Registration in-round; the item
  itself stays out-of-round.

suggested skills: neat-freak.

### T-7 AGENTS.md standing clauses — D-003(iv), D-004(i)

- Baseline-CI clause: every T-0 baseline recon MUST include public-CI
  status (tip run conclusion + failing step named).
- Audit self-consistency clause (interim): every audit re-run table MUST
  manually include the full CI test-job command surface until the t34
  generated checklist lands; t33's own audit included.
- May share a commit with T-3's queue clause (distinct D coverage).

suggested skills: neat-freak.

### T-8 Convention-existence wiring — D-003(iii)

- Extend `test/adr-0033-wiring.test.js` (deferred-registry wiring home):
  assert the defer-0076 row exists with a presence-condition unfreeze_if;
  assert the AGENTS.md baseline-CI clause exists.
- Convention-existence assertions only — never numeric count assertions.

suggested skills: tdd.

### T-9 Wave closeout + registrations — all current D-xxx

- Suggested wave split: wave-1 = mechanism+conventions (T-2, T-3, T-7,
  ci.yml bump — intermediate red on README counts is allowed); wave-2 =
  registrations (T-5, T-6, T-8); wave-3 = T-4 README/zh-CN measured
  finals → green. Implementer may collapse waves; ordering constraints are
  fixed (queue closure before E-25; README at final measured counts).
- E-17/E-19 closeout order: re-capture pins → regen derived artifacts
  (rewrite-map LAST) → `node scripts/build-rewrite-map.js --check` +
  `--published-only` clean → `run-gates.js` exit 0 → declare. After the
  LAST `but` mutation, re-run `--check` on the settled tree.
- Self-dogfood (D-004(i)): t33's audit re-run table MUST include
  `run-test-gate.js --expected-suites <final>` — run it locally before
  closeout.
- Register t34+ candidates listed in spec §1 (R2-F4 leg, F-11 refactor,
  settle-window/advisory batch, t27/t28 asymmetry + errata_exemptions
  drift) as deferred-registry or next-handoff lines — registration only.
- Commits via `but` with explicit allowlists + derived `[ANCHORING]`
  footers; `git show --name-only` verify after each commit.

suggested skills: gitbutler/but, neat-freak, tdd.

## Round-level suggested skills

- tdd — wiring/test work (T-2, T-8)
- domain-modeling — glossary sync checks (T-1, T-3, T-5)
- neat-freak — registration routing + residue (all tasks)
- gitbutler/but — every VC mutation
- atomcode-research — only if a new fork surfaces mid-implementation
  (grill convention: research before deciding, never decide-then-verify)

## Not-in-round (registered elsewhere — do not absorb)

- t34 contract round: audit re-run surface mechanization (checklist from
  ci.yml, D-008-style generator self-consistency); pending-confirmation
  reject-branch pre-registration (with ratification-window expiry
  semantics); finding-vs-note ruler.
- Owner-side pre-registered handoffs: adjudicated/grill-t27 tag push,
  tide unbundling / interim checkpoint, ADR-0089 entity countersign —
  agent registers reminders, never performs.
- t32 carry-over candidates → t34+ registration (T-9).
- cap distribution-form economics → defer-0077 pending-evaluation row
  (registered in T-6; the item stays out-of-round).
- Public-CI return-to-green → owner-side post-push observation item.
