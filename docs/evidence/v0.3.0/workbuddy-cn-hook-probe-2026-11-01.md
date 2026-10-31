# WorkBuddy 5.9.3 domestic turn-end hook probe (#118)

Date: 2026-11-01 (local, UTC+8). Host: Windows 10.0.26100 (win32 x64).

Ticket: #118 - the second variant of #110. Acceptance standard: spec #74 D2 (the
A-tier admission rule) and D5 (real-machine verification), read through
`docs/agents/evidence-review.md`.

Baseline: branch `feat/workbuddy-cn-probe-118`, stacked on
`feat/workbuddy-exit-110` at `c9ac9399` (PR #117, still open at the time of this
run). PR #117's tree is the prerequisite: the `workbuddy` row in `HOSTS`, the
adapter bundle, and the probe script cited below all live there and are not on
`main` yet. The hook that fired is
[`probes/workbuddy-hook-probe.js`](probes/workbuddy-hook-probe.js) - the probe
script, not the shipped bundle, the same arrangement #109 and #110 used.

What the probe hook does, stated plainly: in `block-once` mode it blocks the
first finish and passes when the host sets `stop_hook_active` or when its own
marker file exists. It does not read the evidence chain. So this record
establishes the host's turn-end channel - the thing spec #74 D2 admits a host on
- and **not** the shipped gate's judgment in a live domestic turn.

## Verdict per variant

| Variant | Tier | Basis |
|---|---|---|
| WorkBuddy AI 5.9.4 (international) | **A** (unchanged) | #110's record; not re-run here |
| WorkBuddy 5.9.3 (domestic) | **A** | this record: a `Stop` hook blocked a real turn-end claim, the host continued the turn with the reason, and the re-entry carried `stop_hook_active: true` |

The two rows are two runs. The domestic row was not inferred from the shared
agent CLI, and the international row was not substituted for it.

## Product identity - read from the install artifacts, not from documentation

| Field | Value | Source |
|---|---|---|
| `productName` | `WorkBuddy` | `D:\WorkBuddy\resources\app.asar.unpacked\cli\product.json` |
| `genieVersion` | `5.9.3` | same file |
| `dataFolderName` | `.workbuddy` | same file |
| `isOversea` | absent | same file |
| `endpoint` | `https://www.workbuddy.cn` | same file |
| `appVersion` | `5.9.3` | `D:\WorkBuddy\resources\install-manifest.json` (`generatedAt` `2026-10-27T09:29:19.843Z`) |
| Desktop executable | `WorkBuddy.exe` | install dir |
| Bundled agent CLI | `@genie/agent-cli 2.165.0` | same as the international build (#110) |

These are readings of the installed build on the operator machine. The paths are
named so each value can be re-read there; the artifacts themselves are not in
this repository, and this record does not pretend they are - the same arrangement
#110's record used for the international build.

The live session agreed with the install artifacts; the variables below are the
hook's own environment, captured by the probe and transcribed here with the
secrets stripped (see "What was removed before transcription").

| Variable | Value |
|---|---|
| `WORKBUDDY_APP_NAME` | `WorkBuddy` |
| `WORKBUDDY_PRODUCT_NAME` | `WorkBuddy` |
| `WORKBUDDY_APP_VERSION` | `5.9.3` |
| `WORKBUDDY_DATA_FOLDER_NAME` | `.workbuddy` |
| `WORKBUDDY_CONFIG_DIR` | `C:\Users\Administrator\.workbuddy` |
| `CODEBUDDY_CONFIG_DIR` | `C:\Users\Administrator\.workbuddy` |
| `CODEBUDDY_HOST` | `workbuddy-desktop` |
| `CODEBUDDY_SESSION_ID` / `CLAUDE_SESSION_ID` | same session id as the payload |
| `CODEBUDDY_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` | **unset** (settings-tier hook) |

Both desktop builds pass `CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1`; the flag
was present in this session too. It rejects hook types other than `command`, and
the hooks below are `command` hooks, which is why they loaded.

## Which project-scope file is read

The ticket asked for this to be settled on the domestic build rather than copied
from the international one. Both twins were written at the same moment, with
distinguishable log paths, and both carried a `PreToolUse` entry:

| File | Result |
|---|---|
| `D:\Aworker\jiahao\.codebuddy\settings.json` | **fired**: 4 invocations, first `2026-10-31T17:10:44.743Z`, last `2026-10-31T17:11:13.481Z` |
| `D:\Aworker\jiahao\.workbuddy\settings.json` | **never fired**: the probe's log file was never created, so the hook was not even spawned |

Conclusion for 5.9.3: the project-scope directory is `.codebuddy`, the same as
on 5.9.4, and the product's data-folder name (`.workbuddy`) is **not** the
directory name used for project settings.

User scope is a different file and was **not** touched. The probe's environment
displaces that question: `~/.workbuddy/settings.json` has no `hooks` key at all
before the run (`enabledPlugins`, `autoLaunchDefaultApplied`, `sandbox`, `claw`,
`officeMarkdownDefaultClaimAttempted`, `officeFileAssociationsRepairMarker`,
`enableModelOptimization`, `sensitiveProtection`), so every invocation in this
record had to come from the project file. This is an argument from absence and
is labeled as one; the `PreToolUse` twin above is the positive evidence.

### A second observation from the same test, and why the bundle ignores it

Twin A was written while a turn was already running, and its `PreToolUse` entry
fired on the next tool call of that same turn; the `Stop` entry written in the
same turn fired at that turn's end. So on this build a project-scope edit was
live inside the turn that made it.

The adapter README deliberately does **not** carry that conclusion. Its advice
stays "start a new session after changing settings", for three reasons:
`docs/release.md` tells the user the same thing, one sample cannot separate
"re-read per event" from "re-read per turn", and nothing here probed the
plugin-bundle path, where the loader rather than the settings file supplies the
hooks. The observation is written down here so the next reader does not have to
re-derive it, and so the adapter README is not made to promise something the
install doc denies.

## Hook configuration used

The session's working directory is `D:\Aworker\jiahao`, so the project-scope file
had to live there - not in the worktree that carries this branch. Twin A
(`.codebuddy/settings.json`) was rewritten three times during the run: once with
`PreToolUse` alone to settle the registration surface, once with `Stop` +
`UserPromptSubmit` for the acceptance event, and once with `Stop` +
`SubagentStop` + `UserPromptSubmit` for the subagent and loop-guard
observations. The union of those three versions, as written:

```
PreToolUse        node "D:/Aworker/wt-workbuddy-118/docs/evidence/v0.3.0/probes/workbuddy-hook-probe.js" log        "<tmp>/pretool-a.jsonl"  "<tmp>/pretool-a.marker"    timeout 5
Stop              node ".../probes/workbuddy-hook-probe.js" block-once "<tmp>/stop.jsonl"      "<tmp>/stop.marker"      timeout 10
UserPromptSubmit  node ".../probes/workbuddy-hook-probe.js" log        "<tmp>/prompt.jsonl"    "<tmp>/prompt.marker"    timeout 5
SubagentStop      node ".../probes/workbuddy-hook-probe.js" block-once "<tmp>/subagent.jsonl"  "<tmp>/subagent.marker"  timeout 10
```

`<tmp>` is `C:/Users/Administrator/AppData/Local/Temp/jh-wb-cn-118`, outside the
repository. Twin B (`.workbuddy/settings.json`) carried the same `PreToolUse`
entry in `log` mode with `pretool-b.jsonl` / `pretool-b.marker` - the pair that
never fired.

The probe logs `argv` as its first act in every invocation, so a record's
command and its event are provably the same spawn rather than two stitched
observations. The first line of the twin-A log, verbatim:

```
["D:\\Aworker\\wt-workbuddy-118\\docs\\evidence\\v0.3.0\\probes\\workbuddy-hook-probe.js","log","C:/Users/Administrator/AppData/Local/Temp/jh-wb-cn-118/pretool-a.jsonl","C:/Users/Administrator/AppData/Local/Temp/jh-wb-cn-118/pretool-a.marker"]
```

The acceptance invocation - the `Stop` that blocked - has its own spawn line in
`stop.jsonl`; this is the command evidence-review item 2 asks for, next to the
event it produced:

```
["D:\\Aworker\\wt-workbuddy-118\\docs\\evidence\\v0.3.0\\probes\\workbuddy-hook-probe.js","block-once","C:/Users/Administrator/AppData/Local/Temp/jh-wb-cn-118/stop.jsonl","C:/Users/Administrator/AppData/Local/Temp/jh-wb-cn-118/stop.marker"]
```

The exit code for that spawn is 0 **by construction** - the probe assigns
`process.exitCode = 0` on every path, and an earlier crash would have left no
record line at all. No wrapper recorded the exit status independently, so the
evidence that the host accepted a zero exit is its behaviour, not a captured
status: it did not end the turn, and it took the block reason (record 3). Anyone
re-running this should wrap the CLI if they want the exit code as its own
artifact.

## Payload received on stdin (first `Stop`; values verbatim, layout re-wrapped)

```json
{"session_id":"3529c6aa-6115-42ec-bae0-43581c2126b9",
 "transcript_path":"C:\\Users\\Administrator\\.workbuddy\\projects\\d-Aworker-jiahao\\3529c6aa-6115-42ec-bae0-43581c2126b9.jsonl",
 "cwd":"d:\\Aworker\\jiahao","hook_event_name":"Stop","stop_hook_active":false,
 "is_truncation_recovery":false,"agent_type":"cli",
 "last_assistant_message":"(earlier prose of the closing message, elided)\n\n任务完成，已验证。",
 "background_tasks":[],"session_crons":[],"permission_mode":"default",
 "client":"WorkBuddy","version":"5.9.3",
 "generation_id":"01a192ee6fd6779a83a3449c4f3f3225","model":"deepseek-v4.1-flash"}
```

Payload length: 1514 bytes - the length as received. The block re-wraps the JSON
for width; key order, values, and escapes are untouched. The
`last_assistant_message` value above is verbatim at both ends: the value **ends**
with `\n\n任务完成，已验证。`, which is
the false-completion claim the block answered. Only the prose before that
sentence is elided, and it is marked as elided; 1514 bytes is the whole payload,
so nothing after the claim was cut off. The client identity is the host's own:
`client: "WorkBuddy"` and `version: "5.9.3"`. `client` is the **same** string
#110 recorded on 5.9.4 - the payload does not distinguish the variants by product
name, only by `version`. What does separate them is the hook environment:
`WORKBUDDY_APP_NAME` / `WORKBUDDY_PRODUCT_NAME` read `WorkBuddy` here and
`WorkBuddy AI` there (#110's record, its environment table).

**Fields present here and absent on 5.9.4** (compared against #110's record,
not re-derived): `is_truncation_recovery`, `background_tasks`, `session_crons`,
`permission_mode`, `agent_type`. Same CLI build, different payload - the
differences are listed, not explained.

## Blocking channel - exit 0 + decision, and the host continues the turn

Records from one session, in order (UTC; local = UTC+8):

| # | Time | Event | `stop_hook_active` | Probe decision |
|---|---|---|---|---|
| 1 | 2026-10-31T17:10:44.743Z | `PreToolUse` (first of 4) | - (not in payload) | `fired` (twin test) |
| 2 | 2026-10-31T17:11:26.162Z | `Stop` | `false` | `block` |
| 3 | 2026-10-31T17:11:26.444Z | `UserPromptSubmit` | - (not in payload) | `none` (the continuation) |
| 4 | 2026-10-31T17:14:21.131Z | `SubagentStop` | `false` | `block` (ignored) |
| 5 | 2026-10-31T17:18:04.946Z | `Stop` | `true` | `pass (stop_hook_active)` |

`stop_hook_active` is a field of the `Stop` and `SubagentStop` payloads; the
`PreToolUse` and `UserPromptSubmit` payloads on this build do not carry it at
all, so rows 1 and 3 show a dash rather than a `false` nobody observed.

Record 2 is the acceptance event. The model's last assistant message ended with
`任务完成，已验证。`; the probe printed
`{"decision":"block","reason":"JIAHAO-WORKBUDDY-PROBE: ..."}` on stdout and
exited 0. The host did not end the turn. It delivered the block reason as the
next user prompt, which arrived as record 3 and whose `prompt` field begins:

```
Stop hook feedback:[node ".../workbuddy-hook-probe.js" block-once "..."]:
JIAHAO-WORKBUDDY-PROBE: turn-end block observed on this host; this is a probe
hook, not the jiahao gate.
```

Record 3 also carries `is_internal_continuation: true` - a field #110's
`UserPromptSubmit` record does not have, and the cleanest single marker in this
run that the continuation was the host's own, not a fresh user message.

Record 5 is the same turn finishing again with `stop_hook_active: true`, which
the probe let pass. Before that invocation the marker file was deleted, so a
`pass (stop_hook_active)` decision can only come from the host's flag; a
`pass (marker present)` decision would have meant the flag was not set. The
loop guard is the host's own flag, not a probe-side counter.

Exit 2 was **not** probed on this host.

## `SubagentStop` - fires, and its block is not continued

Record 4 is a subagent finish answered with the same `{"decision":"block"}` on
exit 0. One invocation only: no re-entry with the flag set, and the subagent
returned to the caller without a continuation. Payload keys observed:
`session_id`, `transcript_path`, `cwd`, `hook_event_name`, `stop_hook_active`,
`agent_transcript_path`, `agent_type`, `agent_id`, `last_assistant_message`.

That matches the international result, so the bundle's decision to wire `Stop`
only still holds on this build.

## What was removed before transcription

The raw probe log stayed outside the repository and was deleted after the fields
above were copied out. The hook environment carries secrets - a gateway
password, `WORKBUDDY_PAC_RPC_TOKEN`, `WORKBUDDY_VLM_AUTH_TOKEN`, and an
`CODEBUDDY_MCP_CONFIG` blob holding bearer tokens - and the probe's own log
records the `WORKBUDDY_*` / `CODEBUDDY_*` subset verbatim, so that file is not
committable in any form. The artifact here is
[`workbuddy-cn-hook-calls.jsonl`](workbuddy-cn-hook-calls.jsonl), a
transcription of the cited records only, carrying identity and decision fields
and no credential material. Record 1 in that file is an aggregate: it states the
4-invocation count and both timestamps rather than replaying every line.

## Isolation - what this run touched

The domestic build's bundled CLI refuses a headless turn without an interactive
login, and the ticket forbids re-inferring the result from the international
run, so the probe had to run inside a live desktop session. Consequences:

- The hook was registered in the **real workspace** `D:\Aworker\jiahao`
  (`.codebuddy/settings.json`, plus the `.workbuddy/settings.json` twin), which
  is the directory the desktop session runs in. That is **not** the worktree
  that carries this branch; the worktree supplied the probe script by absolute
  path, and the branch's own tree has no settings file in it.
- Both project files were **deleted** after the run. Immediately afterwards
  `git status --short` in `D:\Aworker\jiahao` printed nothing and neither path is
  tracked. That is a statement about the cleanup, not a lasting property of the
  directory: the workspace is shared with other in-flight branches, and it
  already shows an unrelated in-progress merge there (staged `adapters/` files
  and conflicted `README.md` from another ticket). The probe neither caused nor
  touched that; it only ever created and removed the two settings paths.
- The session is the operator's session, not a throwaway one: `3529c6aa` in
  every record is the same session id, which is what makes the block, the
  continuation, and the flag pass provably one run rather than three.
- No user-wide setting was edited: `~/.workbuddy/settings.json` was read, not
  written.
- No other session was started.

## Loop bound (evidence-review rule 5)

The hook under test can loop by design, so what bounded it is named here. Two
mechanisms were in place; record 5 shows the second one arriving:

- The probe's own `block-once` guard: one marker file per log, written on the
  first block and honoured by any later invocation.
- The host's `stop_hook_active` flag, which arrived `true` on the re-entry.

No `block-always` run was made on this build, so **no host-side cap was
measured** - whether 5.9.3 stops after N consecutive blocks (as Copilot CLI does
at 8) is unknown and is not claimed. The shipped gate does not depend on such a
cap: it passes when the host sets `stop_hook_active`, which record 5 shows this
build does.

The probe finished on its own. No `timeout`, Job Object, or outer wrapper
bounded the CLI during this run - the `timeout` values in the settings entries
above are the host's per-hook limits, not a run-level bound. Because the guard
held, the run produced two `Stop` invocations in total rather than a
continuation series: this is the "probe completes on its own" case the checklist
allows, and it is stated rather than left to be inferred.

## What this record does not claim

- **The plugin-bundle hook path.** Read from the loader, never watched firing -
  on either build.
- **Exit 2 as a block channel.** Not probed here.
- **Any third build.** Two variants were run; nothing here extends to another
  version or platform.
- **The shipped gate's judgment inside a live domestic turn.** The probe blocks
  unconditionally; the gate's claim-vs-evidence logic is pinned at script level
  by `test/workbuddy-adapter.test.js` and was live-probed on Codex and Copilot
  (#80).

## Reproduction

1. In the domestic desktop's own workspace, create `.codebuddy/settings.json`
   with the event map used above, each entry running
   `node <repo>\docs\evidence\v0.3.0\probes\workbuddy-hook-probe.js <mode> <log> <marker>`
   with absolute paths. Add the `.workbuddy/settings.json` twin with different
   log paths to repeat the registration-surface test.
2. Let a turn finish with a message that claims completion.
3. Read the log back with `node`, transcribe identity fields, then delete both
   settings files and the raw log.
