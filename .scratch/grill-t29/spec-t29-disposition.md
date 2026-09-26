# grill-t29 execution spec — t28-audit disposition round

Sole source: `.scratch/grill-t29/decision-ledger.md` (D-001..D-006, all
current). This spec is generated from the ledger only; nothing here is
sourced from conversational memory.

## 1. Round topology (D-001)

- Round class: audit-disposition round. t28 audit verdict was PASS with
  findings; this round converts every finding into a registered
  disposition and produces implementation work, so the round is an
  implementation round (not a sixth consecutive documentation round).
- Ordering rule: the meta-ruling (§2) precedes spec sections that depend
  on it (§2 exception channel → F-6/F-7 surface registrations → F-8
  disposition). Mechanical fixes (§4) do not wait on the ruling.
- Every audit finding F-1..F-13 plus the post-merge fixture-portability
  candidate must carry an explicit disposition — no finding may be left
  disposition-less (CAPA single-ledger form).
- Meta-ruling width limit: answer only "which layer inherits the fence";
  do not restructure the enum schema.
- Advisories are record-and-schedule only; no advisory-triggered rule
  edits inside this round.

## 2. Fence inheritance + exception channel (D-002)

### 2.1 Classification block

- `docs/governance/surface-taxonomy.json` gains a machine-checkable
  classification block mapping every registered-enum sub-field to one of
  three classes:
  - `fenced` — semantics-bearing fields consumed by gate legs or
    verifiers to decide outcomes (e.g. `claim_surfaces.closed_enum`,
    `claim_surfaces.scope`, `claim_surfaces.unregistered_signal`,
    `seal.fields`, `seal.tag_convention`, `non_anchoring_classes`,
    `orphan_ancestry.*` keys).
  - `exception-channel` — deviation fields governed by §2.2 (e.g.
    `claim_surfaces.exceptions`, `orphan_ancestry.errata_exemptions`).
  - `editorial` — bookkeeping/provenance fields
    (`rounds`, `_doc`, `source_adr`, `mechanism_outputs.entries`).
- The classification block itself is `fenced`: changing a field's class
  requires ADR + owner sign-off.

### 2.2 Exception-channel semantics (new legal status)

- Registration takes effect immediately: verifiers must accept a
  `pending-confirmation` entry and pass the scenario it covers.
- Every entry must carry `status`, `requested_by`, `reason`,
  `expires_at`, `scope` (narrow; no wildcards).
- An entry past `expires_at` without adjudication auto-lapses — never
  silently converts to permanent.
- `ratify` / `revoke` / delete / narrow: owner-signature actions only.

### 2.3 Two new CI legs

- Exception-field completeness: an exception-channel entry missing
  `expires_at`/`scope`/required fields fails the gate.
- Consumption-vs-classification consistency: every registry path that
  gate code reads must be classified in §2.1's block (drift guard —
  the "who consumes" set changes over time).

### 2.4 F-8 disposition

- `claim_surfaces.exceptions` entry `reports/audit-report.md` is
  re-registered in exception-channel form (`status:
  pending-confirmation`, `expires_at: 2026-12-15` tide).
- An errata entry records the procedural defect (agent-side append
  without the channel). Classification: process improvement (channel
  enablement), not a freeze violation.
- Owner ratifies or revokes at the 2026-12-15 tide.

## 3. Normative carrier: ADR-0086 (D-003)

- Author `docs/adr/0086-registry-field-governance-fenced-editorial-exception-channel-pending-confirmation-lifecycle.md`
  (exact filename adjusts to repo convention).
- Required content: the fenced/editorial/exception-channel taxonomy; the
  pending-confirmation lifecycle (effective-on-registration, mandatory
  `expires_at`, auto-lapse, owner-only ratify/revoke/delete/narrow); the
  two enforcement legs; the reversal path.
- Self-audit line (mandatory): "this ADR registers N new semantics"
  enumerated — new legal status, registry-wide applicability, hard to
  retire (removal requires adjudicating every in-flight exception), real
  trade-off (agile waiver vs governance rigidity).
- Migrate the t28 D-003(v) fence rule ("claim_surfaces enum changes
  require ADR + owner sign-off") from the t28 ledger into this ADR's
  standing surface — repairs the ledger-only-residence disease.
- ADR-0085 gains one append-only pointer line: the exceptions array's
  governance channel lives in ADR-0086.
- Trend-inventory: `kind:fix` row + `governance_tooling_diff`; wiring
  test pins the classification block's existence/shape.
- ADR-0086 itself joins the countersign queue (it applies the fence
  semantics to itself).

## 4. Orphan-leg machinery hardening (D-001; audit F-1..F-5)

- F-1/F-2: `evidence-freshness.js` must consume the registered config
  (`surface-taxonomy.json` `pin_patterns`, `non_anchoring_classes.
  seal_file`) instead of its private copies (`ORPHAN_PIN_RES`,
  `/\/SEAL$/`). Wiring test asserts the leg runs the registered table.
- F-3: `lastSealRecord` ordering — guard `recorded_at` missing before
  the latest-compare; fall back to round-order or commit date; lexical
  `'null'` must never outrank a date.
- F-4: enumerator loosened to `^(captured-at-head|seal):`; the strict
  parser decides validity. Add a fixture proving a trailing-whitespace
  pin is seen by the leg.
- F-5: natural-sort round dirs in the tie-break; delete or wire
  `ORPHAN_SCOPE_RE`; exemption sha compare normalized (prefix-aware or
  `{40}` shape).
- Fixtures: add the undated-seal ordering fixture and the
  trailing-whitespace evasion fixture to the battery.

## 5. Fixture env-portability (D-004; post-merge candidate F-14)

- Create `test/helpers/` shared hermetic git helper: injects
  `-c user.email` / `-c user.name` AND isolates ambient config
  (`GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL` to null-device) —
  cuts the whole ambient-config class, not just identity.
- Migrate every temp-repo write-op call site
  (`freshness-checker.test.js`, `adr-0084-wiring.test.js`, any other
  `commit-tree`/`commit`/`tag`/`merge` on a non-ROOT cwd) to the helper.
- New gate leg: in `test/**.js`, git write-op argv not routed through
  the helper = red. (Writes against the real repo ROOT are already
  illegal, so "every test git write goes through the helper" is
  unambiguous.)
- Convention text lands in `AGENTS.md`; the leg joins the acceptance
  battery (static analysis — identical on dev machines and CI).
- The audit's post-merge candidate enters F-numbering only if the owner
  says so; it is registered as "F-14 candidate".

## 6. ANCHORING footer convention (D-006; audit F-11)

- `AGENTS.md` working agreement gains: every round-lane commit that is
  not a merge/workspace commit must carry an `[ANCHORING] <file list>`
  footer.
- The footer is derived, never hand-typed: at commit time the
  `but commit` allowlist ids are resolved to paths and written into the
  message (DCO `-s`-style automation).
- New wiring leg: footer file set == `git show --name-only` landed set.
  Applies to commits created after registration; history is not
  retro-edited. Merge/workspace commits exempt (no autonomous allowlist).
- Honesty boundary written into the convention: the footer is a
  self-describing replayable claim — committer and footer writer share
  one trust domain, so it provides no forgery protection. Its value is
  forensic (internal consistency at audit time), not preventive (the
  `git show --name-only` verification remains the live guard).

## 7. Advisory dispositions + tide adjudication packet (D-005)

- Produce the tide adjudication packet (human-authority-package form):
  every item self-contained (owner can rule without re-reading history);
  each entry = context paragraph + option table (nothing pre-selected) +
  agent recommendation with reasons + both-directions consequence +
  signature line.
- Packet structure: the 19 countersign items form the routine-bulk
  section (may be ratified in bulk but recorded as bulk); the five
  substantive adjudications (F-8 ratification, seq-13 three-way,
  ratchet-brake adoption, F-12 errata-vs-reseal, adjudicated/grill-t27
  tag) are placed at the front of the session order. The carve-out
  burn-rate advisory goes in as a context item for the owner.
- `docs/deferred-registry.json` gains a tide-capacity observation row
  (owner may wish to bulk-ratify routine items at an earlier interim
  authority event; adjudications stay at the tide).
- ADR-streak advisory disposition: `mitigated, closed` (the D-003
  self-audit line covers it).
- F-12 draft position for the packet: recommend errata-record (re-amend
  post-declaration is itself a freeze violation); owner decides.

## 8. Prose + residual registrations (D-001; audit F-6/F-7/F-9/F-10/F-13)

- F-6/F-7: the residual exposure window and the human-only adjudication
  points are registered on standing surfaces (taxonomy `_doc` /
  `AGENTS.md` — editorial class per §2.1).
- F-9: report prose `180+` → `161` corrected wherever the number is
  claimed (reports are committed artifacts — correction rides the fix
  round, not history rewrite).
- F-10: the ADR-0084 second appended line disclosed.
- F-13: nits at the rework window's discretion.

## 9. Human-authority package boundary

Drafted, never executed by the agent (D-001(vii), D-005):
`adjudicated/grill-t27` tag decision (co-name `5cb2a9fe` vs later tip),
seq-13 three-way, countersign queue (10→19 at the tide), ratchet-brake
adoption, ADR-0086 countersign, F-8 retro-ratification, F-12
errata-vs-reseal, alpha-classification countersign (t28 carryover),
`JIAHAO_BENCH_CORPUS_B64` refresh (defer-0072), OIDC migration
(defer-0073, review 2026-12-25).

## 10. Negative-constraint union

- No silent direction change; ledger conflicts go through
  revised+new-record.
- No enum-schema restructure under cover of the meta-ruling.
- No exception entry without `expires_at`; no wildcard `scope`; expired
  pending entries never silently become permanent; no agent-side
  delete/narrow of registered exceptions.
- No footer hand-authoring; footers are derived. No retroactive footer
  edits to history. Footer is never described as a security control.
- No advisory-driven rule edits this round.
- No findings left without a disposition.
- No human-authority actions performed by the agent.

## 11. Acceptance battery (post-rework re-run)

Per audit §7 plus this round's additions:

    node scripts/check-orphan-ancestry.js
    node scripts/run-test-gate.js --expected-suites 82
    node scripts/run-gates.js          # gate:all incl. new legs
    node scripts/check-deferred.js
    # + evaluateRound(grill-t29): inFlightClean, capturesAtSealOk,
    #   freezeViolations empty, unregisteredClaims empty
    # + new legs: exception-field completeness, consumption-vs-
    #   classification consistency, hermetic-helper lint,
    #   anchoring-footer consistency
