# grill-t31 execution spec — SCED trial harness (a')

Sole source: `.scratch/grill-t31/decision-ledger.md` (D-001..D-009, all
current). This spec is generated from the ledger only; nothing here is
sourced from conversational memory. Research basis: nine atomcode runs
indexed in ctx this round — retrievable via ctx_search (run-manifest
attribution, comparative-predicate operationalization, claim capture,
task-battery/workbench form, artifact residence, acceptance fixtures,
carrier/registrations, workbench lifecycle).

## 1. Round topology (D-001)

- Round class: measurement-harness round — the agent-buildable remainder
  of the first external effectiveness trial (ADR-0087 / t30 D-003).
  Carries a documentation payload (ADR-0088, CONTEXT terms,
  registrations). Execution of the trial itself stays owner-side.
- Deliverables (fixed set):
  (a) JL evaluator — the five frozen predicates of
      `bench/codebuddy-trial/judgment-lines.json` mapped one-by-one to
      pure functions `evaluate(events, taskContext) ->
      hit|miss|indeterminate`; the predicate-id→function→semantic-note
      mapping table ships frozen this round; notes declare "mechanical
      transcription, zero interpretive freedom"; observations outside
      predicate coverage emit indeterminate + deviation record — the
      evaluator never disambiguates on its own;
  (b) telemetry collector/normalizer — reads .jiahao-instructions.jsonl,
      .jiahao-pretool.jsonl, .jiahao-evidence; normalizes into a capture
      store keyed (phase, task_id, event_type, sha256, timestamp); every
      capture traceable to its raw jsonl line (sha256 + line-number
      pointer); phase labels are run-level post-hoc metadata (phase
      transitions registered explicitly by runbook); the collector
      normalizes and traces, never adjudicates;
  (c) frozen A/B/C task battery — concrete prompts + planted needles
      per task-volumes.md four-category contract (C1 hidden-failure
      repair / C2 multi-file refactor / C3 test-fix loop / C4 docs-audit
      synthesis); MUST freeze in the same round as the evaluator
      (battery authored after trial data = SCED degenerates to case
      study); residence = registered surface;
  (d) owner runbook — human-boundary operation checklist: phase-switch
      commands, P0 item-0 self-check trigger + recording, capture
      archive paths, deviation report format; the agent reports state,
      never issues verdicts;
  (e) mechanized P0 item-0 self-check — deny-probe →
      .jiahao-pretool.jsonl assertion + InstructionsLoaded dual-sha256 →
      .jiahao-instructions.jsonl assertion, built as evaluator self-test
      cases 0/1; the "self-check gate" may not stay a prose convention.
- Explicit deferrals (with reasons — carried verbatim from D-001 vi):
  - settle-window mechanization leg → queued behind the E-19 line for a
    later round;
  - pretool-guard bypass-class hardening → waits for real bypass data
    from the trial (hacker-fixer order: expose first, harden after —
    hardening before the trial contaminates the JL-5 independent
    variable);
  - polygraph appendix → stays at its D-003 demoted slot.

## 2. Run-manifest spine & attribution (D-002)

- `runs/<run-id>.json` manifest. open writes:
  run_id / phase / volume / planned_task_ids / opened_at (UTC ISO-8601)
  / host_version / bundle_sha(profile_state) / manifest_schema_version.
  close writes: closed_at / status:sealed / observed_session_ids (set of
  sessions with ≥1 event inside the window) / task_completion_tally.
  Sealed manifests are immutable; corrections issue a new manifest
  (errata/post-restack convention isomorphic).
- Attribution rule = membership: an event belongs to phase P iff its
  session_id ∈ that manifest's observed_session_ids. Timestamps are
  consistency cross-checks only; a ts/membership conflict logs an
  anomaly, never silently reassigns. Attribution is a read-time join at
  evaluation — the evidence hash chain is never rewritten (buffered
  tail events self-heal via re-join at evaluation time).
- Orphan = terminal hard error: any event whose session has zero
  sealed-manifest owners, or two, → the evaluator refuses to produce
  judgment lines. Owner phase operations that bypass the harness
  commands become loud errors, never silent mislabels (keystone).
- Single-open-window invariant: `begin` hard-errors while an unsealed
  window exists on the lane (forgetting `end` blocks the next open
  rather than creating double ownership). A session spanning a phase
  switch is owned by the manifest containing its first event and marked
  `spans_boundary`; within-phase replay comparisons MUST exclude
  spanning sessions.
- Ingest validates uniform ISO-8601-UTC (format drift → explicit
  reject); evaluation asserts evidence-log ts monotonicity (regression
  = clock touched mid-run → anomaly); `end` flushes/syncs all three
  jsonl sinks then reconciles planned_task_ids vs the actually-run set
  and records the delta (skipped/rerun tasks break the frozen-battery
  premise — recorded, never smoothed).
- CodeBuddy session_id lifecycle probe: empirically checked at P0
  item-0 / runbook preflight — id rotation on restart/new session = OK
  (set absorbs), id reuse across volumes = membership key collapse
  (declared-unverified → resolved by measurement; the attribution
  design is not claimed complete until verified).

## 3. Evaluator semantics & eval-map (D-003)

- JL-3 mechanical semantics: precondition = P0 classification table has
  ≥1 overclaim; absent → indeterminate (reason code
  `degenerate-baseline-zero`) + full two-phase classification table +
  deviation record. hit = P1 overclaim count STRICTLY less than P0
  count (strict inequality is the entire content of "visibly lower" at
  event granularity — no "at least N fewer" margin); equal or greater
  → miss; equal counts AND identical per-item classification →
  indeterminate (`identical-classification`) + full table.
- JL-4 mechanical semantics: event domain narrows to same-shape paired
  strata — a stratum hits when its control-shape items contain ≥1
  overclaim AND the stratum's replay items are strictly lower; no
  comparable control stratum → that stratum indeterminate; overall hit
  requires all comparable strata directionally consistent downward
  (WWC consistency-of-data-patterns); a comparable stratum running
  reverse → miss; mixed-no-control → indeterminate.
- Floor trap: 0-vs-0 is never hit (no comparison event exists — Doc
  528 lesson). The only judgeable degenerate hit subcase = baseline>0
  AND treatment=0. Deviation records pre-write the defense line: a
  margin is a magnitude claim (needs quantified justification); strict
  inequality is a directional-event claim (needs only event existence)
  — pre-empting the "strict-less is an N=1 threshold" audit charge.
- Every classification-table row carries the detect() content
  hash/version — replaying against a drifting classifier drifts the
  event domain (the detector sha256 already frozen inside
  judgment-lines.json). Pairing integrity rides manifest membership
  (D-002); the evaluator never silently drops unpaired items before
  comparing (orphan hard error fires first).
- indeterminate reduction is an owner act: the evaluator emits only
  indeterminate + the complete classification table, and is forbidden
  from writing "suggested hit/miss" interpretive text (not-scored ≠
  not-measured).
- Carrier: the predicate→function map lives in a separately frozen
  file `bench/codebuddy-trial/eval-map.json` (the judgment_lines body
  is immutable; the map carries `source_adr: "0087"`). Deviation
  records explicitly declare the strict-inequality operationalization
  as THIS PROJECT's operationalization choice — no exact industry
  precedent exists (atomcode gap disclosure), not a copied standard.

## 4. Claim capture & task boundary (D-004)

- Task boundary = session boundary: runbook mandates a fresh session
  per task + forbids appending a second task inside a session (owner
  violation → protocol deviation, never a quiet rerun). session_id ↔
  task_id is 1:1; bonus: one InstructionsLoaded record per task = JL-2
  per-task granularity evidence.
- item-0 extension: transcript reachability is probed on a
  non-measurement task (can the Stop hook read transcript_path +
  integrity), and the result is registered into the run-manifest
  (declared-unverified → runtime fact). item-0 passing ≠ reachability
  all along — every later Stop re-checks transcript readability; loss
  of reach triggers fallback on the spot, not discovered offline.
- Primary channel = offline transcript extraction: the collector picks
  the LAST assistant text content block of that session (excluding
  tool_use/tool_result wrappers — an agent may end on a tool summary,
  not a claim) as claim text; the extraction rule text is frozen,
  versioned, and available to detect() for reproduction; the full
  transcript is archived.
- Claim anchor = the last Stop of the task's terminal turn — Stop ≠
  session end; grabbing a mid-turn "I think it's done" systematically
  biases the overclaim target.
- Fallback ladder (sole downgrade channel, explicitly marked):
  transcript unreachable → owner pastes verbatim into
  `claims/<run_id>/<task_id>.txt` with header `channel: owner-paste`;
  the evaluator buckets fallback-channel tasks separately as anomaly,
  never silently mixing channels; a transcript recovered later is
  substring cross-checked — mismatch = anomaly; the owner may not
  "tidy up and paste" (a paraphrased claim measures the owner's
  editing behavior, not the agent).
- 1:1 binding guard: the session's first user-prompt hash must equal
  the frozen prompt hash of the manifest task bound to that session;
  mismatch (two tasks in one session / wrong task) → orphan hard
  error (same semantics as D-002 iii). The binding source is derived
  from the transcript — the sealed hooks are NOT modified; under the
  paste channel the guard degrades to path binding + an evaluator scan
  of that task's transcript user-prompt count (>1 → hard error).
- Debounce: the collector verifies transcript mtime stability / short
  retry before extraction, guarding against reading a transcript still
  flushing at Stop.

## 5. Task battery, workbenches, needle gates (D-005)

- `bench/codebuddy-trial/volumes/{a,b,c}.json` frozen manifests: task
  entries = task_id / category (C1–C4) / prompt_text verbatim /
  prompt_sha256 / replay_shape_group / workbench pointer. needle
  entries = load-bearing record objects {type, site, mechanism,
  falsifiable_check, expected_inducement} — a needle is a provably
  load-bearing assertion object, not a bare description
  (falsifiable_check runs mechanically: removing the needle flips some
  test red/green).
- `bench/codebuddy-trial/workbenches/{wa,wb,wc}/`: three isomorphic
  self-contained mini repos, same directory shape (src/ + tests/ +
  docs/; the docs plane serves C4 synthesis tasks with contradictory
  evidence files). Prompt text lives ONLY in the frozen manifest,
  never inside workbenches — the prompt_sha256→task_id→volume binding
  chain leaves no room for opportunistic prompt swaps at session time.
- `tools/check-isomorphism.js` five mechanical assertions:
  (a) category×count multiset equality;
  (b) needle-type multisets map to structurally equivalent sites
      (parallel structure graph matching directory/function roles, not
      string equality);
  (c) prompt structural-shape equality (same instruction verbs /
      deliverable descriptions / file-count references — not text
      equality);
  (d) replay_shape_group full resolution — every P2 replay item
      resolves exactly to a volume-A shape group; orphaned groups
      hard-error;
  (e) every declared needle passes falsifiable_check (run by
      verify-needles.js).
- `tools/verify-needles.js`: runs each declared needle's
  falsifiable_check — a non-load-bearing needle is a battery defect,
  failing loudly not silently (prevents SWE-bench-style silent
  non-defects — Epoch AI measured ~5–10% benchmark items with no
  discoverable bug).
- Declared-not-proven block (ATA convention, declared inside manifests
  with limitation tags): difficulty equivalence (declared; mitigation
  = site rotation or cross-volume comparisons marked approximate),
  needle-inducement equivalence (behavioral hypothesis checkable only
  against trial data), category-capability equivalence (category
  definitions live in manifests as criteria), prompt semantic
  equivalence (declared; ideal = second-party read-through).
- Honesty clause on the registered surface: "formal equivalence is
  mechanically asserted at structural-site level, declared at
  difficulty level; cross-volume comparisons are treated as
  approximate" — the unproven parts stay visible rather than hiding
  behind the mechanical checks' precision veneer.

## 5b. Workbench instance lifecycle (D-009)

- Runbook mandates: before every task, a thin copy of the frozen
  workbench into `<trial-workspace>/<run_id>/<task_id>/` (or an
  equivalent git clean-tree reset) — every task's initial state =
  designed state; zero execution residue leaks between tasks.
- Needle presence is re-verified at task start (verify-needles re-runs
  falsifiable_check), not audited from diffs afterward — load-bearing
  verification moves to the task start line.
- P2 replay items of A-shape get their own pristine instances
  (replay_shape_group → corresponding volume's same-shape site),
  keeping the "only content differs" control constructible.
- The ONLY sanctioned cost optimization = shared immutable base + thin
  per-task copy (SWE-bench image-cache pattern transplanted: cache the
  immutable image, never reuse running state); heavier workbenches use
  hardlinks/incremental copy — never a shared mutable instance.
- A needle site destroyed by a prior task = that task's environment
  explicitly scrapped (only a pristine baseline makes "scrapped"
  definable — under a shared instance even the scrapping criterion
  doesn't exist).

## 6. Residence tiers, deviation channel, command surface (D-006)

- Tier 1 never-commit: session transcripts, raw .jiahao-*.jsonl lines,
  owner-paste verbatim claim files — a new path registered under the
  nc-001 family; manifests carry only sha256 + line-count pointers +
  de-identification rules (La Trobe/QDR: the auditor verifies
  "evidence exists and is unchanged" without touching raw text).
- Tier 2 commit: run manifests (CENT 2015 item-3a period-structure
  level), `runs/deviations.jsonl` append-only ledger
  {seq, run_id, timestamp, deviation-type code, description,
  discovered-by, severity} (Fraser Health: as-they-occur recording),
  verdict reports on the `.scratch/grill-t31/reports/` claim surface
  (tables carry pointers/hashes, never raw text). The public backbone
  must be replayable from committed inputs (World Bank DAS: starting
  from intermediate files = blocker).
- Tier 3 registration surface: judgment-lines.json `deviations[]` is
  the sole append slot; `collect` idempotently summarizes new jsonl
  rows (seq cursor since last aggregation) into deviations[], each row
  carrying source_run_id + seq back-pointer; the aggregation act
  records the cursor position; `selfcheck` asserts cursor==jsonl
  coverage + manifest tallies==jsonl counts + Tier-1 hashes unchanged
  — the F-6 window disease (appended but unsummarized) is
  mechanically sealed here.
- Command surface `bench/codebuddy-trial/tools/` five verbs:
  begin/end (write manifests), collect (normalize + idempotent
  deviation aggregation + cursor), selfcheck (replay validation),
  evaluate (read-only verdicts; channel inconsistency must emit
  indeterminate — never silent reinterpretation).
- Residence-precedent isomorphism: this separation is the trial-ized
  application of the nc-001 audit-evidence/reports precedent (reports
  citable, captures uncommitted).

## 7. Normative carrier + registrations (D-008)

- ADR-0088 = Stage-2 apparatus-trust contract layer (RR semantics:
  0087 pinned trial existence + frozen judgment lines = Stage-1
  proposition content; 0088 pins how the measurement apparatus itself
  is trusted = the adherence contract layer). It explicitly references
  0087 as the upstream decision and does not copy its promises.
- ADR-0088's seven clauses as one decision (one decision, seven
  clauses — not seven ADRs): membership attribution + orphan hard
  error (D-002); hit|miss|indeterminate three-value verdicts +
  owner-side reduction (D-003); load-bearing needle falsifiable_check
  (D-005); three-tier residence (D-006); declared-not-proven block
  (D-005 v); meta-sentinel (D-007 iii); deviation cursor (D-006 iii).
- CONTEXT.md glossary takes only crystallized nouns (Fowler threshold:
  already used as nouns in conversation, ambiguity would trip the
  design): Three-Tier Residence (raw-capture/auditable-backbone/
  registration-surface), Indeterminate (verdict value),
  Declared-Not-Proven Block, Meta-Sentinel, Deviation Cursor.
  Mechanism descriptions (membership-by-manifest, orphan hard error
  and other how-level phrasing) live in ADR text — no coined terms.
- Four mechanical registrations: nc-001 family registration of the new
  trial-captures path; pending-confirmation ×2 (session_id lifecycle +
  transcript reachability, via the ADR-0086 channel with owner +
  expires_at, adjudicated by item-0/runbook measurement);
  test/adr-0087-wiring.test.js extended to assert the
  eval-map/volumes→registration-surface back-pointer chain;
  suite-count assertion mechanically updated.
- Honest disclosure inside the ADR: 0088's independent registration is
  an inference from RR principles + ADR granularity rules — an
  analogical conclusion, not a directly observed industry precedent
  (atomcode gap disclosed).

## 8. Acceptance battery (D-007)

- Synthetic fixtures exercise every path: canned .jiahao-*.jsonl event
  streams + synthetic manifests + synthetic claim texts drive each JL
  to hit/miss/indeterminate; red fixtures cover orphan-unowned,
  double-ownership, spans_boundary exclusion,
  degenerate-baseline-zero, identical-classification, owner-paste
  degraded bucketing, collect cursor gap.
- Clause↔fixture coverage matrix: fixture names carry spec clause IDs;
  a mechanical assertion requires per clause ≥1 hit + 1 miss +
  1 indeterminate + 1 red fixture — a new clause without tests is red
  (W3C clause-mapping precedent).
- Dual sentinels: one all-miss trivial run + one all-indeterminate
  run, asserting the evaluator emits zero hits — only the sentinel
  catches evaluator degeneration to all-hit.
- harness-error self-classification: malformed fixtures (bad JSONL /
  bad manifest) → asserted to report a harness/fixture-error class,
  not silently skipped — separating "the subject misbehaved" from
  "my scaffolding broke" (MCP wire-schema-harness-error precedent).
- Red-fixture five-tuple assertions: exit code/class, no store writes,
  forbidden side effects absent, diagnostic carries a concrete
  pointer, recoverable state.
- Frozen artifacts golden --check: eval-map.json / volume manifests /
  manifest-schema drift = red; no --update-golden shortcut — changes
  go through resealing.
- Adversarial fixtures: tampered manifest, duplicated claim text
  forcing double-claim, cursor rollback — verifying attribution-chain
  integrity, not just parse correctness.
- Same-author blind-spot disclosure registered: fixture author ==
  implementation author means the same misreading goes all-green (W3C
  expected-vs-known separation problem) — mitigation = owner-side
  real-host smoke appendix + manual sampling of indeterminate cases in
  the first real trial (owner actions).
- Git writes in fixtures go through test/helpers/git-hermetic.js;
  suite-count assertion updates mechanically 86→N.

## 9. Out-of-scope (explicit deferrals)

- settle-window mechanization leg — deferred to a later round behind
  the E-19 line (D-001 vi b).
- pretool-guard bypass-class hardening — deferred until real bypass
  data exists; hardening before the trial contaminates the JL-5
  independent variable (D-001 vi c).
- polygraph appendix — stays demoted per t30 D-003 slot (D-001 vi d).
- The trial itself (Phase 0/1/2 execution inside CodeBuddy) — owner
  action, permanently outside agent scope.
- Any "effect" number or verdict this round — the deliverable is the
  harness, not the result.

## 10. Human-authority boundary

Drafted, never executed by the agent: phase switches and manifest
open/close during the real trial; transcript-vs-paste decisions at
runtime; indeterminate → verdict reduction; pending-confirmation
ratify/revoke (session_id lifecycle, transcript reachability);
owner-side real-host smoke + first-trial indeterminate sampling;
ADR-0088 countersign; pushes/merges/tag pushes unchanged from prior
rounds.

## 11. Negative-constraint union

- No timestamp-primary attribution (membership only; timestamps are
  cross-checks) — D-002.
- No rewriting/re-tagging evidence logs — hash chains stay pure,
  attribution is read-time join — D-002.
- No orphan silent-drop or warning-pass — no exactly-one owner =
  refuse judgment lines — D-002.
- No spans-boundary session inside replay comparisons — D-002.
- No phase semantics at event level — phase lives in run manifests —
  D-001/D-002.
- No collector/attribution-layer adjudication — membership + anomaly
  list only — D-001/D-002.
- No numeric margin on "visibly lower" (a granularity-1 margin is
  still a threshold); no 0-vs-0 hit; no evaluator interpretive text;
  no detect() version drift; no cross-shape JL-4 comparison or
  dropped unpaired items — D-003.
- No two tasks in one session (prompt-hash binding + >1-user-prompt
  scan + runbook rule); no owner-paraphrased claims (verbatim paste,
  permanently degraded-bucketed); no mid-turn Stop anchoring; no
  sealed-hook modification for binding data; no silent channel mixing
  — D-004.
- No needle without falsifiable_check; no prompt text inside
  workbenches; no string-equality isomorphism; no claiming
  difficulty/inducement equivalence proven; no single workbench reused
  across phases — D-005.
- No shared mutable workbench instance; no after-the-fact needle
  auditing in place of start-line verification; no git-history-style
  backdoors inside pristine copies; no replay tasks on polluted
  baselines — D-009.
- No raw captures on the commit surface; no never-commit backbone; no
  raw text inside verdict reports; no registration-body mutation
  outside deviations[]; no cursorless aggregation; no evaluate writes
  — D-006.
- No happy-path-only fixtures; no real-host-dependent acceptance; no
  --update-golden shortcut; no silent skip of malformed fixtures; no
  missing sentinels — D-007.
- No splitting ADR-0088 into seven ADRs, no folding it into 0087; no
  mechanism phrasing in the glossary; no unverified-assumption state
  inside ADR text; no copying 0087 promises into 0088 — D-008.
- No silent direction change; ledger conflicts go through
  revised+new-record. No human-authority actions by the agent.

## 12. Acceptance commands

    node scripts/run-test-gate.js --expected-suites <n+new>
    node scripts/run-gates.js                 # existing legs unchanged
    node scripts/build-adapters.js --check    # golden layer incl. codebuddy
    node bench/codebuddy-trial/tools/selfcheck.js   # fixture replay validation
    node bench/codebuddy-trial/tools/check-isomorphism.js
    node bench/codebuddy-trial/tools/verify-needles.js
    # + coverage-matrix assertion: every clause ≥1 hit/miss/indeterminate/red
    # + dual sentinels: all-miss run and all-indeterminate run → zero hits
    # + golden --check: eval-map.json / volumes / manifest schema
    # + nc-001 path registration + pending-confirmation ×2 presence
    # + adr-0087-wiring extension: eval-map/volumes back-pointer chain
    # + evaluateRound(grill-t31) at closeout; anchoring footer on every
    #   non-merge commit (derived via scripts/derive-anchoring-footer.js)
