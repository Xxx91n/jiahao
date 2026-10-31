# WorkBuddy turn-end hook probe (#110)

Date: 2026-10-31 (local, UTC+8). Host: Windows 10.0.26100 (win32 x64).
Ticket: #110, answering spec #74's A-tier admission rule for a host the spec did
not cover. Acceptance standard: #74 D5 and
`docs/agents/evidence-review.md`.

Baseline: the working tree of branch `feat/workbuddy-exit-110` whose base was
`107eeef5` (origin/main, clean). The hook that fired was
[`probes/workbuddy-stop-probe.js`](probes/workbuddy-stop-probe.js) - the probe
script, not the shipped bundle. The bundle this record justifies is generated
from the host table in the commit these artifacts land in;
`node scripts/build-adapters.js --check` and the release gate tie that bundle to
its commit.

## Verdict per variant

| Variant | Tier | Basis |
|---|---|---|
| WorkBuddy AI 5.9.4 (international) | **A** | a `Stop` hook blocked a real turn-end claim, the host continued the turn with the reason, and the re-entry carried `stop_hook_active: true` (this record) |
| WorkBuddy 5.9.3 (domestic) | **C, unchanged** | same agent CLI build and the same hook surface, but no turn was ever watched blocking there, so #110's own rule keeps it at C |

The international build was **not** substituted for by the domestic one or the
reverse. The row's `provenance`, the adapter README, and the release-notes
backfill all name 5.9.4 as the only A-tier claim.

## Product identity - read from `product.json`, not from documentation

| Field | International | Domestic |
|---|---|---|
| `productName` | `WorkBuddy AI` | `WorkBuddy` |
| `genieVersion` | `5.9.4` | `5.9.3` |
| `dataFolderName` | `.workbuddy-ai` | `.workbuddy` |
| `isOversea` | `true` | absent |
| `endpoint` | `https://www.workbuddy.ai` | `https://www.workbuddy.cn` |
| Install dir | `D:\Workbuddy.ai\WorkBuddyAI` | `D:\WorkBuddy` |
| Desktop executable | `WorkBuddyAI.exe` | `WorkBuddy.exe` |
| Bundled agent CLI | `@genie/agent-cli 2.165.0` | `@genie/agent-cli 2.165.0` |

Sources: `<install>/resources/app.asar.unpacked/cli/product.json`,
`<install>/resources/install-manifest.json`, and the two desktop shortcuts
(`WorkBuddy AI.lnk` -> `D:\Workbuddy.ai\WorkBuddyAI\WorkBuddyAI.exe`,
`WorkBuddy.lnk` -> `D:\WorkBuddy\WorkBuddy.exe`). The live session this probe ran
in reports `WORKBUDDY_APP_NAME=WorkBuddy AI`, `WORKBUDDY_APP_VERSION=5.9.4`,
`WORKBUDDY_DATA_FOLDER_NAME=.workbuddy-ai`, and
`CODEBUDDY_HOST=workbuddy-desktop`.

Both builds ship the **same** agent CLI build, so the hook schema is shared. The
products are still distinct: the CLI alone cannot tell them apart (a
settings-tier hook receives `CODEBUDDY_*` and `WORKBUDDY_*` variables and no
plugin root), which is why the shipped hook map passes the platform name
`workbuddy` as argv.

## Where a hook config is read

- **Project scope: `.codebuddy/settings.json`.** A `PreToolUse` probe written to
  `D:\Aworker\jiahao\.codebuddy\settings.json` logged every tool call of the
  session. A twin written at the same moment to
  `D:\Aworker\jiahao\.workbuddy\settings.json` **never fired** - the project
  directory name is `.codebuddy`, not the product's data-folder name.
- **User scope: `<configDir>/settings.json`** - `~/.workbuddy-ai/settings.json`
  international, `~/.workbuddy/settings.json` domestic. This is the file the
  desktop itself writes `enabledPlugins` to, and the CLI reads `hooks` from it
  (`settingsManager.get("hooks")` in the bundle). Not separately probed here;
  the project-scope file is the surface with evidence.
- **Plugin scope.** The loader scans `.codebuddy-plugin`, `.workbuddy-plugin`,
  and `.claude-plugin`, and reads plugin hooks from `hooks/hooks.json`. Read from
  the loader code; **no plugin-bundle hook was watched firing** on 5.9.4.
- Both desktop builds pass `CODEBUDDY_DISABLE_EXTENDED_PLUGIN_HOOKS=1` to the
  agent. In the bundle that flag only rejects hook types other than `command`
  (`isValidHookConfig`: `areExtendedPluginHooksDisabled() && "command" !==
  i.type`), so the command hooks this bundle ships still load. It is not a
  "plugin hooks off" switch.

## Payload received on stdin (verbatim, first Stop of the probed turn)

```json
{"session_id":"9c4b75b1-5b44-4738-86fa-012e6324e09c",
 "transcript_path":"C:\\Users\\Administrator\\.workbuddy-ai\\projects\\d-Aworker-jiahao\\9c4b75b1-5b44-4738-86fa-012e6324e09c.jsonl",
 "cwd":"d:\\Aworker\\jiahao","hook_event_name":"Stop","stop_hook_active":false,
 "is_truncation_recovery":false,"agent_type":"cli",
 "last_assistant_message":"...\n\n任务完成，已验证。",
 "background_tasks":[],"session_crons":[],"permission_mode":"default",
 "client":"WorkBuddy","version":"5.9.4",
 "generation_id":"01a192b4be927c7d9b4159cbbdd5f04f","model":"deepseek-v4.1-flash"}
```

The payload is Claude-shaped and carries the host's own identity:
`client: "WorkBuddy"` and `version: "5.9.4"`.

## Environment handed to a settings-tier hook (identity fields only)

| Variable | Value |
|---|---|
| `WORKBUDDY_APP_NAME` | `WorkBuddy AI` |
| `WORKBUDDY_PRODUCT_NAME` | `WorkBuddy AI` |
| `WORKBUDDY_APP_VERSION` | `5.9.4` |
| `WORKBUDDY_DATA_FOLDER_NAME` | `.workbuddy-ai` |
| `WORKBUDDY_CONFIG_DIR` | `C:\Users\Administrator\.workbuddy-ai` |
| `CODEBUDDY_HOST` | `workbuddy-desktop` |
| `CODEBUDDY_CONFIG_DIR` | `C:\Users\Administrator\.workbuddy-ai` |
| `CODEBUDDY_SESSION_ID` / `CLAUDE_SESSION_ID` | same session id as the payload |
| `CODEBUDDY_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT` | **unset** (settings-tier hook) |

The raw environment also contained a gateway password and two service tokens.
They are deliberately not reproduced here; the probe log that holds them stayed
outside the repository and was never committed.

## Blocking channel - exit 0 + decision, and the host continues the turn

Three records from one session, in order (UTC; local = UTC+8):

| # | Time | Event | `stop_hook_active` | Probe decision |
|---|---|---|---|---|
| 1 | 2026-10-31T16:06:18.030Z | `Stop` | `false` | `block` |
| 2 | 2026-10-31T16:06:19.514Z | `UserPromptSubmit` | `false` | `none` |
| 3 | 2026-10-31T16:10:19.983Z | `Stop` | `true` | `pass (stop_hook_active)` |

Record 1 is the acceptance event. The model's last assistant message ended with
`任务完成，已验证。`; the probe printed
`{"decision":"block","reason":"JIAHAO-WORKBUDDY-PROBE: ..."}` on stdout and
exited 0. The host did not end the turn: it delivered the block reason as the
next user prompt, which the session shows verbatim as

```
Stop hook feedback:
[node ".../workbuddy-stop-probe.js" block-once "..."]: JIAHAO-WORKBUDDY-PROBE:
turn-end block observed on this host; this is a probe hook, not the jiahao gate.
```

Record 2 is that continuation arriving as a `UserPromptSubmit`. Record 3 is the
same turn finishing again with `stop_hook_active: true`, which the probe let
pass - the loop guard the shipped gate relies on is the host's own flag, not a
probe-side counter.

Exit 2 was **not** probed on this host. The shipped gate therefore uses the
observed channel (decision field, exit 0).

## `SubagentStop` fires, but its block is not continued

A `SubagentStop` entry answered a subagent finish with the same
`{"decision":"block"}` on exit 0. The log holds **one** invocation for that
subagent: `stop_hook_active: false`, decision `block`, no re-entry. The subagent
returned to the caller without a continuation.

Payload shape for that event (abridged): `hook_event_name: "SubagentStop"`,
`agent_id`, `agent_type: "general-purpose"`, `agent_transcript_path`,
`last_assistant_message`, `client: "WorkBuddy"`, `version: "5.9.4"`.

That is why the bundle wires `Stop` only. A gate on `SubagentStop` would print a
decision the host ignores.

## What this record does not claim

- **The domestic 5.9.3 build.** Not probed; tier C.
- **The plugin-bundle hook path.** Read from the loader, never watched firing.
- **Exit 2 as a block channel.**
- **Injection envelopes.** The `hookSpecificOutput` / `additionalContext` shape
  is the shared CodeBuddy-runtime shape; this probe exercised the decision
  channel, not injection.
- **Turn accounting.** Two turn ends produced hook invocations and a third did
  not. The probe could not attribute the missing invocation to a mechanism, so
  it is recorded rather than explained. A settings edit made during a turn was
  picked up at the next turn end (records 1 and 3 used two different configs
  written between turns).
