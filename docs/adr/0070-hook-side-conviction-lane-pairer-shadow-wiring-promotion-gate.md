# ADR-0070: Hook-Side Conviction Lane — CAPA Pairer Shadow Wiring, Frozen Shadow→Enforce Promotion Gate, Product Shape, Claim Form, and F-A Carry-Over Dispositions

Status: Accepted (user-ratified 2026-09-16 via grill-t10 decision ledger D-001..D-007; second_reviewer countersign deferred to the next audit round - the ADR-0065/0066/0067/0069 ratification pattern)
Date: 2026-09-16

References: ADR-0069 (the adjudicated pairer artifact this lane ships),
ADR-0067 D-C (per-mention claim binding, the registry the lane claim block
joins), ADR-0040 (capability three-state: present / absent / UNVERIFIABLE),
ADR-0028 D4/D6 (host-contract registry and lifecycle coverage), ADR-0023 D4
(detector record schema evolution discipline - additive-optional fields
only), ADR-0027 D2 (same-commit registry discipline), ADR-0017 (jiahao
resolve: the human override terminus), ADR-0019 D4 (judge seam stays
dormant - rescue-only contract untouched), ADR-0012/0013 (detector record
persistence + composite idempotency key), ADR-0061 D-E (governance anchors
list; the t10 ledger joins under this ADR), ADR-0034/0041 (gate registry +
three-code exit semantics), decision-ledger-t10
(.scratch/grill-t10/decision-ledger.md - git-tracked, its own durability
channel; the governance copy is docs/governance/decision-ledger-t10.md).

## Context

devin-corpus@v3 adjudicated the CAPA claim-evidence pairer
falsification-passed (lie 36/36, CP 95% CI lower 0.902606 above the
conservative-transfer floor; FP 0/84 below the 0.10 usability bound;
undetermined 0; single-shot burned 2026-09-16). The adjudicated artifact,
however, had no shipped entity: it lived at
bench/research/capa-pairer.js, and `bench/` is outside the package.json
`files` whitelist. No hook called `src/detector.js` in production either -
the only live detector records were sentinel-reconcile rows
(suspicious:false). The Stop/SubagentStop path read the evidence chain and
applied severity x profile, but no instrument ever wrote to it.

This round gives the pairer its product seam: a hook-side conviction lane
that runs the adjudicated artifact on real transcripts in shadow mode,
with a frozen promotion contract. The grill-t9 post-round audit's four
carry-over observations (F-A1..F-A4) are dispositioned in the same round.

The ledger pins the failure mode this answers: agent-side self-run
self-record is fail-open and was empirically falsified; the judge seam's
rescue-only contract is mutually exclusive with conviction; a corpus
verdict alone is a shadow qualification, never an enforcement one.

## Decision

### D-A Conviction lane locus (ledger D-002)

The pairer runs on the **hook-side conviction lane**: the Stop/SubagentStop
hook (`hooks/jiahao-verdict-gate.js`) reads `transcript_path` from the hook
stdin payload - a camelCase `transcriptPath` alias is tolerated at the
same point for hosts whose stdin shape is only partially documented
(registered tolerance, not a second schema) - adapts the transcript into
`{task, events, closing}`, runs `pairItem`, and on a `flagged` state
writes a suspicious detector record
into the append-only evidence chain. The agent under governance cannot
skip the lane - it rides the same hook invocation the verdict gate
already owns.

The four registered clauses:

1. Flag records carry `source: 'pairer-instrument'` - a separate
   append-only source namespace from agent-written records.
2. `undetermined` never flags and never blocks. It takes only the
   "not a basis for release" half of an abstain semantic - never the
   blocking half (blocking on undetermined would escalate every turn on
   real transcripts).
3. Human override runs through the existing `jiahao resolve` path
   (two-phase anti-anchoring write-back, ADR-0017) - exceptions leave
   records.
4. The v3 corpus converts to the pairer's continuous regression gate
   (shadow role never retires): `pairer-regression` replays the frozen
   items through the shipped artifact and diffs against the stored report
   rows.

### D-B Shadow → enforce promotion contract (ledger D-003 + D-007 numbers)

The v3 verdict is the **necessary** gate for shadow deployment, not an
enforcement qualification. During shadow, flagged observations are
telemetry records carrying the shadow bit; they **never enter the
severity matrix**. The promotion criteria below are frozen by this ADR
before any deployment; the flip itself is a separate registered act after
the bake window and is NOT part of this round:

- **G1** >= 200 real Stop events carrying lane records, spanning >= 1
  full usage cycle;
- **G2** every flagged item owner-reviewed: FP = 0 (a review disagreement
  counts as an FP - the conservative direction);
- **G3** undetermined rate <= 90% with no abnormal uptrend (a dead lane
  must be detected, not promoted);
- **G4** lane p99 latency <= 1 s inside the 10 s Stop-hook budget.

A confirmed FP during shadow sends the instrument back to quarantine
(CAPA / instrument-isolation discipline). A channel-level kill switch -
the flag file `.jiahao-conviction-off` in the config dir - survives
post-enforce; rollback is creating that one file. Promotion itself is
`.jiahao-conviction-enforce`: its presence flips `shadow` off so records
enter the severity matrix. FP and boundary cases observed during
shadow/enforce feed back into the real-corpus regression set; per-family
promotion is an arbitration-rule refinement the ledger permits.

### D-C Product shape (ledger D-004)

- **(a1) Single-source move**: `capa-pairer.js` moves to
  `src/capa-pairer.js` byte-identical - the content hash (sha256
  9ff2d0ada931628b0bffcb8685125cc7d97ddbd599e8a67123d8811f83917445,
  10697 B) is the pin's identity and does not change; `path` fields are
  references and are repointed in the same commit (bench import paths,
  `eval-plan.json instrument.pairer.path`, `plan.json
  adjudicated_object.path`). Dual copies are forbidden (drift surface).
- **(b) Transcript adapter**: `src/transcript-adapter.js` converts the
  host transcript JSONL into `{task, events, closing}`. It is a channel
  component, not the adjudication instrument - it does not enter the
  adjudication pin; it carries contract tests that construct transcripts
  and assert extraction.
- **(c) Capability declaration**: the lane declares
  `requires: transcript-file` under the ADR-0040 three-state vocabulary.
  A host whose Stop payload has no `transcript_path` leaves the lane
  **absent** (UNVERIFIABLE) - it is never recorded as `coverage:partial`
  (partial on the verifier profile routes to ESCALATE every turn, which
  would make transcript-less hosts unusable). Per-host reachability is
  registered in `test/fixtures/host-contracts.json` as the
  `transcript_file` field (`present` | `absent` | `unverifiable`) on every
  contract and asserted across all 11 adapters.
- **(d) Flag landing**: `flagged` -> `suspicious: true` +
  `severity: 'high'` (a mechanically proven contradiction is the strongest
  evidence class); the record carries `source: 'pairer-instrument'`, the
  `pairer: {family, state, claim, evidence, reason, latency_ms}` block,
  and the `shadow` bit. `consistent` and `undetermined` land as
  non-suspicious observed records (`suspicious: false`) - the telemetry
  substrate the promotion-gate denominators count; `undetermined` is
  never a `coverage:partial` flag. A conviction instrument never
  doubles as a rescue path.

### D-D Record schema evolution (ADR-0023 D4 registration)

`createRecord` gains three additive-optional detector fields, registered
here verbatim:

- `detector.source` - string namespace marker; `'pairer-instrument'` is
  the lane's registered source.
- `detector.shadow` - boolean; `true` marks shadow-mode records. Records
  carrying `shadow: true` are excluded from the severity matrix scan in
  the verdict gate regardless of `suspicious`/`severity` (this exclusion
  is the shadow/enforce boundary).
- `detector.pairer` - object `{family, state, claim, evidence, reason,
  latency_ms}` carrying the pairer output verbatim plus lane timing.

No existing field is overloaded; no producer outside the lane writes
`source: 'pairer-instrument'`.

### D-E Claim form (ledger D-005): the registered three-sentence block

The lane's outward wording is a descriptive existence claim - the three
sentences below are the single registered text, bound per-mention the same
way the corpus fact lines are (ADR-0067 D-C). They land verbatim in the
claim homes (README.md, claim-template.md, the v3 report surface) inside
the same section as the bound v3 fact line:

1. "The CAPA claim-evidence pairer runs in **shadow mode** on the
   Stop/SubagentStop conviction lane for hosts that deliver a transcript
   file (per-host reachability is registered in the host-contract
   registry; currently `present` only for claude-code): flagged
   contradictions are appended to the evidence chain as
   `source: pairer-instrument` shadow records and never enter the
   severity matrix."
2. "The lane flags only a mechanically proven contradiction - a claimed
   value parsed from the transcript closing and an evidence value parsed
   from the tool-result stream, both present and unequal, inside the four
   registered families (exit-report, file-contains, count-report,
   content-append); unparseable claims, absent evidence, unsupported
   families, and hosts without transcript delivery are outside coverage
   and degrade as `undetermined` or `absent`, never as a flag and never
   as coverage:partial."
3. "The devin-corpus@v3 adjudication describes that corpus's behavior; it
   is not a real-traffic recall claim, and the shadow->enforce promotion
   gate verifies flagged-item FP, undetermined coverage, and lane latency
   - it does not certify recall."

Promotion changes only the state value of sentence 1 (shadow -> enforce);
sentences 2 and 3 do not move, because the promotion gate does not prove
recall. The v3 fact line stays verbatim and untouched; the
measurement-reproduction invitation clause extends over the new channel.

### D-F F-A carry-over dispositions (ledger D-006) - documented-decision closure

All four grill-t9 audit observations carry an explicit recorded decision:

- **F-A1 (LOW)**: the v3 report md lost the v2-md detail sections
  (metrics/confusion, FP usability detail, side-set diagnostic,
  session-cluster sensitivity, batch slice, honest-success ratio,
  category breakdown). Disposition: **corrigendum** - a dedicated commit
  re-renders the md detail sections FROM the authority
  `bench/research/out/devin-oot-v3-report.json` (never a re-run; the shot
  stays burned). The commit message declares the correction nature.
- **F-A2 (LOW)**: the docs commit swept a regenerated
  `g6-publish-replay.json` into scope. Disposition: **recorded, no
  action** (备案，无需行动) - mechanically forced by the pack-surface
  change; noted for the record.
- **F-A3 (LOW)**: `manifest.harness_commit` pins a GitButler workspace sha
  (ephemeral ref class). Disposition: **forward rule** - every future
  frozen manifest pins a durable ref (branch/tag, or sha+tag dual-pin);
  a workspace sha is note-only. The frozen v3 manifest is never
  rewritten.
- **F-A4 (cosmetic)**: stale v2 self-reference comments in
  `.scratch/grill-t9/devin-collect-v3.js`; the t9 report's "Sessions: 20"
  is main-set scoped while items.jsonl holds 24 session ids (4 side).
  Disposition: **errata rider** on the corrigendum commit - comments
  fixed, "Sessions: 20 (main set)" parenthetical added.

### D-G Delivery boundary (ledger D-007)

This round ends at: **shadow wiring shipped + promotion gate frozen in
the registry**. The shadow->enforce flip is a separate registered act
after the bake window and is outside this round by construction.

## Rejected

- **Agent-side self-run self-record**: fail-open and empirically
  falsified - the agent under observation cannot be trusted to run the
  instrument on itself. (Prompt-level redundancy may remain as advice,
  never as the control path.)
- **Occupying the judge seam**: rescue and conviction contracts are
  mutually exclusive; the seam stays dormant (ADR-0019 D4 stands).
- **Day-one enforce on corpus evidence alone**: a frozen-corpus verdict
  is a shadow qualification only; real-traffic observation is the
  sufficient gate.
- **Real-corpus adjudication as a prerequisite**: demoted - the
  shadow/enforce observation feeds the regression set as a by-product,
  not a precondition.
- **Efficacy claims migrated from the test context**: FTC precedent -
  corpus numbers never endorse the live lane.
- **Silence about a shipped capability**: contradicts transparency
  discipline and the existing claim registry.
- **ABSTAIN-blocks semantics** (atomcode research suggestion): conflicts
  with the registered undetermined meaning (fail-open telemetry, never a
  block).
- **coverage:partial for missing transcript support**: on the verifier
  profile partial coverage forces ESCALATE every turn - a transcript-less
  host would escalate each round, which is unusable and mislabels an
  absent capability as partial measurement.
- **L1-L3 detector riding along**: it was never adjudicated; the pairer
  lane is this round's first and only live wiring.

## Consequences

- The pairer ships inside the tarball via `src/` (the files whitelist
  already covers it); `pack:smoke` asserts its presence.
- `src/capa-pairer.js` stays byte-frozen at the registered pin; any
  content change requires a new pin under a same-commit ADR.
- Every Stop/SubagentStop invocation on a transcript-capable host appends
  one shadow record (flagged/consistent/undetermined distinguished by the
  pairer block) - the chain is the telemetry surface for the promotion
  gate (`scripts/pairer-lane-telemetry.js` computes the four frozen
  inputs - event count, flag count, undetermined rate, p99 latency - and
  surfaces first/last event timestamps plus span-days so the G1
  usage-cycle leg is measurable on the chain; the cycle length itself
  stays owner-judged at promotion review, not machine-pinned).
- `.jiahao-conviction-off` / `.jiahao-conviction-enforce` flag files in
  the config dir hold the kill switch and the promotion marker.
- Hosts without `transcript_path` keep the lane absent; nothing is
  written, nothing escalates, and the registry records the reachability
  verdict honestly (`unverifiable` where the host's stdin shape is not
  documented).
- The grill-t10 ledger joins the governance anchors list bound to this
  ADR; the round's net-addition row is defer-0050.
