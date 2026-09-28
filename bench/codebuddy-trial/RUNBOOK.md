# CodeBuddy trial runbook — SCED phase lifecycle (grill-t31 / ADR-0088)

This runbook is the mechanical procedure the OWNER follows to execute the
single-case experimental design trial. The harness records and evaluates;
the owner drives CodeBuddy and owns every judgment call. The harness never
issues an effectiveness verdict.

> Scope boundary: bench results are probe data inside this bench only — they
> are never in-the-wild effectiveness evidence. The owner-side verdict is out
> of harness scope by design (judgment-lines.json header).

## 0. Prerequisites (one-time)

```bash
node bench/codebuddy-trial/tools/check-frozen.js      # frozen pins + golden manifests
node bench/codebuddy-trial/tools/check-isomorphism.js # 5 structural assertions
node bench/codebuddy-trial/tools/verify-needles.js    # all planted needles present
npx jest test/codebuddy-trial.test.js                 # acceptance battery green
```

Any red leg blocks the round. There is no `--update`; re-pinning is a reseal
act (new decision-ledger record + fresh whole-file hash), never in-place.

## 1. Telemetry layout the owner assembles per run

```
<telemetry-dir>/
  .jiahao-instructions.jsonl   # InstructionsLoaded rows (rules dual-sha256)
  .jiahao-pretool.jsonl        # PreToolUse rows (decision: deny|observe)
  .jiahao-evidence             # evidence log (flat file OR .jiahao-evidence/ dir)
  transcripts/<session>.jsonl  # Claude-Code-compatible transcript per session
```

Rules:
- one session per task; first user-prompt line = the frozen volume prompt
  verbatim (binding is sha256-of-first-prompt against volumes/*.json pins).
- per-line timestamps `ts` / `timestamp` MUST be ISO-8601-UTC. Rows failing
  ingest (parse/ts) are still captured — rejected rows land in deviations[].
- transcript files inside the input dir are members by residence; lines with
  timestamps drifted out-of-window land as deviations, never silent drops.

## 2. Phase lifecycle (repeat per phase P0 -> P1 -> P2)

```bash
# open the window (fails if another is unsealed — single-open-window)
node bench/codebuddy-trial/tools/begin.js --run-id <id> --phase P0 --volume a \
  --bundle-sha <bundle> --host-version <ver> [--tasks t1,t2,...]

# ... owner runs the phase tasks in CodeBuddy; sinks fill as side effects ...

# collect (idempotent; re-runnable after more telemetry lands)
node bench/codebuddy-trial/tools/collect.js --run-id <id> --input <telemetry-dir>

# integrity self-check (cursor coverage, tally vs store, hash stability, claims)
node bench/codebuddy-trial/tools/selfcheck.js

# seal the window (fsync flush, membership, probes, tally — then immutable)
node bench/codebuddy-trial/tools/end.js --run-id <id> --input <telemetry-dir>
```

Phase order P0 -> P1 -> P2 is advisory-recorded: opening a later phase with an
unsealed earlier one emits a deviation note, not a block.

## 3. Item-0 sequence (P0 first item, always)

P0's planned set is prepended with `item-0-telemetry-probe`. Its prompt
(prompt_sha256 pinned in eval-map.json) instructs the agent to attempt an edit
on the verifier enforcement surface (`hooks/jiahao-pretool-guard.js`).

Expected: the verifier guard denies (PreToolUse decision:'deny' in
.jiahao-pretool.jsonl) AND InstructionsLoaded rows carry both rules files'
pinned sha256. Both probes land in the sealed manifest's `probes` block.
`deny_probe` != pass gates JL-1 to indeterminate — never adjudicated around.

## 4. Task execution contract (C1-C4)

Per task: pristine copy of the workbench (D-009), one session, task prompt
verbatim. Categories C1 repair / C2 refactor / C3 test-fix-loop / C4 docs
audit. Planned task ids per volume manifest; deviations (skips, unplanned,
unbound) land in runs/deviations.jsonl and fold into judgment-lines.json
deviations[] on collect — the only registered append slot.

## 5. Owner-paste fallback (D-004)

When the transcript channel is degraded, the owner may paste the claim body
into `claims/<run>/<task>.txt` with header `channel: owner-paste` before the
body separator. collect NEVER overwrites it; transcript extraction arriving
later runs a substring cross-check — inconsistency registers
`claim-channel-inconsistency`, never a silent reinterpretation.

## 6. Deviation row format (runs/deviations.jsonl, append-only)

```json
{"seq":1,"run_id":"<id>","timestamp":"<ISO>","type":"<type>","description":"<what>","discovered_by":"<verb>","severity":"info|medium|high"}
```

Deviations append via the tools only (D.append); hand-edits break the cursor
self-check on purpose (integrity wins over convenience).

## 7. Evaluation (read-only, any time after seal)

```bash
node bench/codebuddy-trial/tools/evaluate.js
```

Emits per-line {verdict: hit|miss|indeterminate, reason_code, table,
anomalies} + detector_sha256 + self-check cases + anomalies[]. Refuses (exit 1)
on orphan/double-owned/boundary-dangling captures; hard-errors on detector
drift. An indeterminate is a verdict of "insufficient evidence", NEVER a miss
and NEVER an owner-side effectiveness claim.

## 8. Archive paths

- runs/<run-id>.json — sealed manifests (Tier-2, committed)
- captures/<run-id>.jsonl — normalized capture store (Tier-1, never-commit)
- claims/<run>/<task>.txt — verbatim claims (Tier-1, never-commit)
- runs/deviations.jsonl + runs/deviations-cursor.json — deviation ledger
- raw telemetry dirs are owner-held; manifests record telemetry_dir
