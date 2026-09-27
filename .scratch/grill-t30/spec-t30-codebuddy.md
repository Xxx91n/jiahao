# grill-t30 execution spec — CodeBuddy adapter + first external-effectiveness trial

Sole source: `.scratch/grill-t30/decision-ledger.md` (D-001..D-005, all
current). This spec is generated from the ledger only; nothing here is
sourced from conversational memory. Research basis: three atomcode runs
indexed in ctx this session (CodeBuddy surface verification, SCED protocol
form, generated-artifact freshness gating) — retrievable via ctx_search.

## 1. Round topology (D-001)

- Round class: host-admission + measurement-protocol round. First
  uncontrolled external host trial for the dual-profile distribution.
  This is an implementation round (adapter files, contract entries, gate
  leg) carrying a documentation payload (ADR-0087, protocol,
  preregistration file).
- Deliverables (fixed set): (a) injection-surface ruling document;
  (b) `adapters/codebuddy/` plugin bundle, test-first; (c) trial protocol
  text + capture-point definitions + preregistered judgment lines;
  (d) install manual; (e) E-17 wave-closeout leg.
- Ordering: the injection-surface ruling precedes adapter/protocol
  sections that cite it; the E-17 leg is independent and runs in
  parallel.
- The protocol closes at "text + capture points + preregistered lines".
  Effect numbers are out of scope for this round — the trial itself is a
  user-side execution after the artifacts land.

## 2. Injection-surface ruling + adapter bundle (D-001 ii/iii, D-002)

### 2.1 Injection-surface ruling document

- Enumerate every injection point for both CodeBuddy forms (IDE and
  CodeBuddy Code CLI): rules files, hooks events, MCP, plugin manifest.
- Mark each point `verified` or `declared-unverified`; every
  declared-unverified item also registers as a pending-confirmation
  exception (ADR-0086 channel: `status`, `requested_by`, `reason`,
  `expires_at`, narrow `scope`).
- Known-unverified set at ruling time (from research): CLI-vs-IDE hooks
  parity (incl. `InstructionsLoaded` on IDE), rules non-`alwaysApply`
  load priority, `npx` vs `codebuddy plugin install` coexistence path.

### 2.2 Adapter bundle

- `adapters/codebuddy/` = plugin bundle:
  - manifest dir `.claude-plugin/` (CodeBuddy recognizes the name
    unchanged; maximizes single-source distribution);
  - `hooks/hooks.json` — migrated five-event map (SessionStart,
    SubagentStart, UserPromptSubmit, Stop, SessionEnd) PLUS an
    `InstructionsLoaded` integrity assertion (verify dual-profile rules
    files present/intact at load time) and `PreToolUse` wiring carrying
    `permissionDecision: "deny"` for verifier blocking;
  - `rules/` — both profiles as `.codebuddy/rules/*.md` with
    `alwaysApply: true` frontmatter;
  - `.mcp.json` — bundling the existing `jiahao-mcp` stdio server.
- Hard rule: every assertion/enforcement line lives in
  `hooks/hooks.json` (plugin path: exempt from the
  `allowUntrustedFrontmatterHooks` gate, effective on enable). Nothing
  load-bearing goes into skill/agent frontmatter (silently skipped by
  default).
- Script constraints: Git Bash syntax only on Windows (cmd/PowerShell
  unsupported by the host), matchers case-sensitive, 60s default hook
  timeout budget.
- `adapters/codebuddy/README.md` carries the Verified /
  Declared-unverified tiering tables and the optional
  `defaultEnabled: false` conservative default note.
- `scripts/build-adapters.js` adapter map gains the codebuddy entries;
  the `--check` golden layer then covers them.
- New contract rows in `test/fixtures/host-contracts.json` consumed by
  `test/host-contracts.test.js` (ADR-0028 D3 conformance matrix).
- Structure test: `plugin.json` only inside the manifest dir; all
  component files at bundle root (prevents silent load failure).

## 3. Trial protocol (D-003)

- Paradigm: SCED (single-case experimental design), multiphase
  A1-A2-A3. Legitimate output = hit/miss against preregistered criteria
  + effect-size impression, never a p-value.
- Phase 0 (no injection, baseline): task battery volume A. Item 0 of
  Phase 0 is telemetry self-verification — known-violation probes must
  demonstrate the deny counter and `InstructionsLoaded` actually fire on
  this host before any measurement is trusted.
- Phase 1 (generator advisory only): isomorphic parallel volume B.
  Pre-registered expectation: weak positive effect of instruction rules;
  primary signal is `detect()` score drift on claim texts.
- Phase 2 (verifier hooks fully on): volume C plus 2-3 tasks of the
  same shape as volume A replayed inside the phase (within-phase
  replication — the core SCED control against learning effects).
- Battery spec: four task categories, ≥2 tasks each per volume,
  including planted needles (tasks engineered to induce false-completion
  claims) and broad coverage; volumes are same-shape-different-content.
- Capture points: `InstructionsLoaded` log + append-only evidence-log +
  claim text per task (all phases); Phase 2 adds `deny` counts and
  bypass-attempt records; offline `detect()` four-way classification
  (all-touched / admission / omission / overclaim) on claim texts.
- Judgment lines: preregistered as cross-phase conditional events
  ("only if S appears in Phase 2 AND was absent at baseline AND
  `InstructionsLoaded` confirms presence"). The file lands before the
  trial opens; `detect()` version is frozen at registration; any
  CodeBuddy host version change registers as an erratum.
- Deviations during the trial: disclosed explicitly and re-labelled
  exploratory where applicable (OSF/Registered-Reports convention:
  the registered body is immutable, deviations ride records).
- `bench/polygraph` corpus demoted to an appendix probe (tests the deny
  apparatus, not the effect). Never cited as effectiveness evidence.
- Boundary: the agent authors protocol + battery + judgment lines; the
  three phases are executed by the user inside the interactive host.

## 4. E-17 wave-closeout leg (D-004)

- Authority layer — new gate leg: for every claim-surface-touching
  commit on a round lane, assert that the hex citations inside that
  commit's tracked docs each have a row in the map file committed in
  the same tree, plus the map's internal consistency (the
  `--published-only` subset assertions ported to per-commit). Assertion
  inputs are strictly tree-internal (that commit's citation set + that
  commit's map) — nothing outside the tree.
- Generation-end lock — wave/closeout flow must run the map regen last
  and pass `--check` clean before the commit proceeds. Failure path is
  block + manual regen. No bot auto-commit (would violate the ADR-0083
  allowlist discipline).
- The E-17 prose convention (re-capture → regen → verify → declare)
  is thereby mechanized; the prose stays as provenance note.
- Granularity is per-commit: a stale map in history contaminates
  bisect/blame/audit for every descendant.

## 5. Normative carrier + registrations (D-005)

- Author `docs/adr/0087-*.md`: "CodeBuddy host adapter + first external
  effectiveness trial". Records the admission decision, reasons, and
  rejected options (compatibility-note-only, instruction-tier-first,
  MCP-only, naive three-phase). Explicitly declares that it EXTENDS
  ADR-0028 D6's tier table (new Claude-Code-compatible path family +
  the pending-confirmation tiering precedent — a framework extension,
  not framework use). Does NOT copy criterion values (no
  Any-Decision-Record bloat).
- Judgment-line preregistration file lives on a persistent registered
  surface (thresholds.json-like shape: persistent + referenceable +
  version-controlled), every line carrying `source_adr: "0087"`. Never
  under `.scratch/`.
- `adapters/codebuddy/README.md` tiering table is a disclosure surface
  and follows ADR-0074 D-F (pushed only after re-verification + audit
  pass).
- Declared-unverified items also register as pending-confirmation
  exceptions under ADR-0086 (D-002 iv, D-005 v).
- CONTEXT.md glossary: resolve terms that crystallized this round
  (candidate: the Claude-Code-compatible path class; declared-unverified
  tiering; SCED / preregistered-judgment-line as used here) — inline,
  domain-modeling discipline.

## 6. Human-authority boundary

Drafted, never executed by the agent (D-001 vii): adapter form
approval; pending-confirmation ratify/revoke on every
declared-unverified item; the trial itself (install + Phase 0/1/2
execution in the user's CodeBuddy environment); ADR-0087 countersign at
the next authority event; all t29 tide items unchanged.

## 7. Negative-constraint union

- No effect numbers / p-values this round; the deliverable is the
  protocol + capture points + preregistered lines.
- No adapter rewrite from scratch; reuse the claude-code asset base
  (`.claude-plugin/` + `${CLAUDE_PLUGIN_ROOT}` recognized verbatim).
- No silent CLI/IDE parity assumption — unverified means registered.
- No load-bearing logic in frontmatter (hooks.json only).
- No single battery volume reused across phases (isomorphic, not
  identical); no skipping telemetry self-verification; no post-hoc
  judgment-line edits (errata channel only); no polygraph scores as
  effectiveness evidence.
- No assertion inputs outside the commit tree (a check whose result
  changes without a commit is not a trustworthy gate); no bot
  regen-commits.
- No adversarial pending-confirmation round and no tide prep pulled
  into this round (lapse-triggered / t31+).
- No silent direction change; ledger conflicts go through
  revised+new-record. No human-authority actions by the agent.

## 8. Acceptance battery

    node scripts/run-test-gate.js --expected-suites <n+new>
    node scripts/run-gates.js                 # incl. wave-closeout leg
    node scripts/build-adapters.js --check    # golden layer incl. codebuddy
    node test/host-contracts.test.js          # conformance matrix + codebuddy rows
    node scripts/check-deferred.js
    # + structure test: plugin.json manifest-dir-only, components at root
    # + preregistration file: every line carries source_adr:"0087"
    # + pending-confirmation entries present for every declared-unverified item
    # + evaluateRound(grill-t30) at closeout; anchoring footer on every
    #   non-merge commit (derived via scripts/derive-anchoring-footer.js)
