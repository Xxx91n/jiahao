# CodeBuddy trial runbook — SCED phase lifecycle (grill-t31 / ADR-0088)

This runbook is the mechanical procedure the OWNER follows to execute the
single-case experimental design trial. The harness records and evaluates;
the owner drives CodeBuddy and owns every judgment call. The harness never
issues an effectiveness verdict.

> Scope boundary: bench results are probe data inside this bench only — they
> are never in-the-wild effectiveness evidence. The owner-side verdict is out
> of harness scope by design (judgment-lines.json header).

## 0. Prerequisites (round preflight, once)

```bash
node bench/codebuddy-trial/tools/check-frozen.js      # frozen pins + golden manifests
node bench/codebuddy-trial/tools/check-isomorphism.js # 5 structural assertions
node bench/codebuddy-trial/tools/verify-needles.js    # all planted needles present
npx jest test/codebuddy-trial.test.js                 # acceptance battery green
```

Any red leg blocks the round. There is no `--update`; re-pinning is a reseal
act (new decision-ledger record + fresh whole-file hash), never in-place.
`verify-needles` also re-runs at EVERY task start against that task's pristine
copy — see §4 checklist (a needle that fails mid-round is a harness defect,
not a task result).

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

Four probes land in the sealed manifest's `probes` block — the first two are
mechanized pass/fail, the second two are OBSERVED facts registered for owner
adjudication (pending-confirmation entries, ADR-0086 channel):

| probe | mechanism | owner step |
|---|---|---|
| `deny_probe` | PreToolUse `deny` row exists inside item-0 session | none — gates JL-1 to indeterminate when != pass |
| `instructions_probe` | InstructionsLoaded dual-sha256 match on both rules files | none |
| `transcript_reachability` | `reachable` iff every item-0 session produced a transcript file in the telemetry dir | owner confirms the transcript covers the WHOLE session (check first/last line timestamps vs the CodeBuddy session window — item-0 pass proves the sink is reachable at probe time, not for the full run) |
| `session_id_lifecycle` | `unique-binding-observed` vs `collision-suspect` (any unbound/multi-prompt session) | owner confirms CodeBuddy rotates session_id per new session and never recycles one across volumes — a recycled id breaks membership keys |

Per-Stop reachability: at every task Stop, verify the session's transcript
file still parses (line count grows, no parse errors). A transcript that goes
unreachable mid-run triggers the §5 owner-paste fallback IMMEDIATELY — never
discover it at evaluation.

## 4. Task execution contract (C1-C4) — per-task checklist

Categories C1 repair / C2 refactor / C3 test-fix-loop / C4 docs audit.
Planned task ids per volume manifest; deviations (skips, unplanned, unbound)
land in runs/deviations.jsonl and fold into judgment-lines.json deviations[]
on collect — the only registered append slot.

For EVERY task in the phase's planned set (and each P2 replay instance):

```text
[ ] 1. materialize the pristine copy:
      copy bench/codebuddy-trial/workbenches/<wb> <trial-workspace>/<run_id>/<task_id>/
      — one fresh directory per (run, task); never reuse a sibling task's copy
[ ] 2. verify needles ON THE COPY (D-009: the copy is what the agent faces):
      node bench/codebuddy-trial/tools/verify-needles.js \
        --volume <a|b|c> --workbench <trial-workspace>/<run_id>/<task_id>
      exit 0 required — a missing needle on the copy voids the task instance
[ ] 3. open a NEW session in CodeBuddy — one session per task, never append
      a second task prompt inside a live session (>1 user prompt = binding
      hard error at evaluate, the whole run refuses judgment)
[ ] 4. paste the task prompt VERBATIM from volumes/<vol>.json prompt_text —
      binding is sha256 of the first user prompt; a paraphrase or typo
      leaves the session unbound (hard error at evaluate)
[ ] 5. work inside the pristine copy only; at the task's terminal Stop, leave
      the final assistant text block as the verbatim claim — mid-turn "looks
      done" text is never the claim (claim-extract-v1 takes the LAST block)
[ ] 6. verify the transcript file landed in the telemetry dir (§3 per-Stop
      reachability) before starting the next task
```

P2 replay instances (`c-rep-*`, replay_shape_group set) follow the identical
checklist — they are replayed SHAPES against volume-C prompts, not re-runs of
the P0 session; a replay task still gets its own copy, session, and prompt.

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
on: unowned/double-owned event sessions (`unowned`/`double-ownership`),
dangling spans_boundary marks (`spans-boundary-dangling`), binding violations
on member sessions (`binding-unbound`/`binding-multi-prompt` — D-004(vi) same
class as D-002(iii): a member session must bind exactly one real task), and
claim-domain orphans (`claim-orphan`/`claim-duplicated`). Hard-errors on
detector drift. A session marked spans_boundary is EXCLUDED from within-phase
comparisons (its claim mixes pre/post-injection events — pollution, not
evidence) while keeping its owner-manifest membership. An indeterminate is a
verdict of "insufficient evidence", NEVER a miss and NEVER an owner-side
effectiveness claim.

## 8. Archive paths

- runs/<run-id>.json — sealed manifests (Tier-2, committed)
- captures/<run-id>.jsonl — normalized capture store (Tier-1, never-commit)
- claims/<run>/<task>.txt — verbatim claims (Tier-1, never-commit)
- runs/deviations.jsonl + runs/deviations-cursor.json — deviation ledger
- raw telemetry dirs are owner-held; manifests record telemetry_dir
