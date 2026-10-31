# Qoder turn-end hook probe (#109)

Date: 2026-10-31. Host: Windows 10.0.26100 (win32 x64).
Ticket: #109, answering spec #74's last open probe item ("can Qoder block before
the turn ends?"). Acceptance standard: #74 D5 and `docs/agents/evidence-review.md`.

Baseline: this ran in the working tree of branch `feat/qoder-hook-probe-109`
whose HEAD was `107eeef5` (main, clean). The hook that fired was
[`probes/qoder-stop-probe.js`](probes/qoder-stop-probe.js) — the probe script,
not the shipped bundle. The bundle this record justifies is generated from the
host table in the commit these artifacts land in; `node scripts/build-adapters.js --check`
and the release gate tie that bundle to its commit.

## Verdict per variant

| Variant | Tier | Basis |
|---|---|---|
| Qoder CN Desktop 0.4.11 | **A** | a `Stop` hook blocked and continued a real turn twice, through two channels (this record) |
| Qoder international Desktop 0.4.11 | **C, unchanged** | same worker runtime and the same settings keys, but no turn was ever watched blocking there, so #109's own rule keeps it at C |
| Qoder IDE/CLI | **C, unchanged** | the rules exit at `adapters/qoder/rules/`; no Qoder CLI is installed on this machine, so its hook surface was not probed at all |

The international build was **not** substituted for by the CN result. Its own
probe is a separate ticket; the row's provenance and the adapter README name the
CN build as the only A-tier claim.

## Versions, config roots, and where a hook config lives

[`qoder-host-versions.txt`](qoder-host-versions.txt) holds the commands and raw
output. Facts read from disk, not from documentation:

- Both Desktop builds are `0.4.11` (`state.ini`, launcher install dirs `D:\Qoder CN`
  and `D:\Qoder`).
- Both ship the same worker runtime: `qoder-worker-runtime 1.1.75-hotfix.1`,
  commit `cb3c036`, `win32-x64`; the CN build's `build.site` is `cn` with
  productName `qoderclicn`, the international one is `global` with `qodercli`.
- User config roots are `~/.qoder-cn` and `~/.qoder`; before this probe both
  `settings.json` files had exactly the keys `enabledPlugins, mcpServers, providers`
  and neither had a `hooks` key.
- **A project-scope `.qoder/settings.json` registers hooks on Qoder CN Desktop.**
  The hook log records `argv: ["qoder","origin-dot-qoder"]` and never
  `origin-dot-qoder-cn`: the `.qoder-cn/settings.json` twin was armed with the
  same hook at the same time and did not fire. The host's run log names this
  source `project`
  ([`qoder-runlog-probe-hooks.txt`](qoder-runlog-probe-hooks.txt)).
- `~/.qoder-cn/skills/` and `.qoder/rules/` are not hook surfaces and are not
  claimed as one. #106 stands: Desktop loads the rules version's skill directory.

## Version reconciliation, said out loud

This record lives under `docs/evidence/v0.3.0/` because it answers the probe list
that v0.3.0 published its tier table with, the same way #106's correction is
filed there. It is **not** evidence about the released v0.3.0 artifact: the v0.3.0
tag had no Qoder plugin bundle at all. The bundle this ticket generates carries
`version: 0.3.0` in `.qoder-plugin/plugin.json` because the emitter copies
`package.json`, and nobody has bumped the package yet. The bump is owned by the
next **release** ticket — the way v0.3.0's was owned by #81 — and no such ticket is
open as of 2026-10-31, so this PR deliberately does not touch `package.json`.

## Does a turn-end event exist? Yes — `Stop`

Two independent observations, both from the host's own records:

1. `Stop` fires in every turn even with no user hook registered:
   `hook_name="Stop" hook_event_name="Stop" source="system" hook_index=1 total_hooks=1
   display_text="goal-loop-stop"` (host run log, this window's session, before the
   probe was armed).
2. With the probe registered, the same event shows `total_hooks=2` and
   `source="project"` alongside it.

Payload received on stdin (verbatim from
[`qoder-hook-calls.jsonl`](qoder-hook-calls.jsonl), call 1 of session `97d52e4d`):

```json
{"session_id":"97d52e4d-c4b4-528b-a221-a37d1b41d865",
 "transcript_path":"C:\\Users\\Administrator\\.qoder-cn\\projects\\D--Aworker-jiahao\\97d52e4d-....jsonl",
 "cwd":"D:\\Aworker\\jiahao","hook_event_name":"Stop","model":"Qwen3.8-Flash",
 "permission_mode":"yolo","stop_hook_active":false,
 "last_assistant_message":"...JIAHAO109-CLAIM-DONE",
 "parent_request_set_id":"2c93066e-...","parent_business_info":{"product":"app","version":"1.1.75-hotfix.1", ...}}
```

Env handed to the hook subprocess: `QODER_PROJECT_DIR` and `QODER_CONFIG_DIR`
only. **No `QODER_SESSION_ID`** — so the environment branch of `detectHost()`
cannot identify this host, and the hook map has to pass the platform name as
argv. That is why the generated `hooks/hooks.json` ends every command with
`qoder`.

## Blocking channel — both Claude-shaped channels work

Three runs, one per channel question. The hook blocked only when the turn's
`last_assistant_message` contained the marker `JIAHAO109-CLAIM-DONE`.

| Run | Session | Mode | Hook calls | Blocks | Host exit code logged | Continuation |
|---|---|---|---|---|---|---|
| 1 | `97d52e4d` | flat `{"decision":"block"}` on stdout | 2 | 1 | `exit_code=0` | yes, `stop_hook_active=true` |
| 2 | `53e7f9c2` | same channel, cap 6 | 7 | 6 | `exit_code=0` | yes, 6 times |
| 3 | `2f2199e1` | exit 2 + reason on stderr | 5 | 3 | `exit_code=2` (`success=false`) | yes, 3 times |

Counts agree across three artifacts: 14 calls in `qoder-hook-calls.jsonl`
(2 + 7 + 5), 14 `hook.finished` lines in `qoder-runlog-probe-hooks.txt`, and
**10** injected block-feedback records in
[`qoder-transcript-block-lines.jsonl`](qoder-transcript-block-lines.jsonl)
(1 + 6 + 3 — the 4 non-blocked calls injected nothing).

The host's feedback channel is the transcript: each block appended a `user` line
with `"isMeta":true` whose content is the hook's reason, e.g.

```text
JIAHAO109-CLAIM-DONE claimed without a verification receipt; hook #109 blocked this turn end.
```

and the model then ran another turn in the same `turnId`. So on Qoder CN Desktop:

- **exit 0 + flat `{"decision":"block","reason":...}` blocks** — the channel the
  shared gate already prints;
- **exit 2 + reason on stderr also blocks** — the Claude-shaped channel; the
  host logs the call as `success=false exit_code=2` and still feeds the reason
  back, so `hooks/jiahao-runtime.js` keeps Qoder on exit 2;
- the `hookSpecificOutput` envelope is **not** what a Stop block needs here — it
  was never exercised for Stop (see declared-unverified below).

## Loop guardrail

- The host sets `stop_hook_active: true` in the payload of every re-entry turn:
  calls 2, 4–9 and 12–14 of `qoder-hook-calls.jsonl`. The first `Stop` of each
  fresh turn (calls 1, 3, 10, 11) reports `false`, and the exit-2 path sets the
  flag the same way (calls 12–13).
- **No host-side consecutive-block limit was reached.** Run 2 was blocked and
  continued 6 times in a row; the run ended because the probe script's own cap
  (`mode.txt` = `jsonblock 6`, `JIAHAO109-CLAIM-DONE` marker gate) let the 7th
  `Stop` pass — the log records `action: "cap-reached-pass"` and the host logged
  `exit_code=0 success=true`. Blocks were ~5s apart (14:22:06 → 14:22:40), so the
  bound that stopped the loop was the wrapper, not the host.
- The shipped gate has its own guard: `jiahao-verdict-gate.js` passes when
  `stop_hook_active` is true, and `test/qoder-adapter.test.js` pins that on the
  spawned bundle.

## Isolation state, stated plainly

This was **not** run against an isolated config home. There is no
`QODER_HOME`-style override for a Desktop session — the worker is spawned by the
app, so the probe had to run in the app's real config:

- hook config was written to the project of the operator's live checkout
  (`D:\Aworker\jiahao\.qoder\settings.json` and `.qoder-cn\settings.json`), not to
  `~/.qoder-cn/settings.json`; the user-scope file was never edited.
- both files were **deleted after the last run**, along with the probe's counter
  state under `%TEMP%/jiahao-109-probe-state`; `git status` on the branch carries
  no `.qoder/` or `.qoder-cn/` entry.
- every block was gated on the marker string, so a session that was not the probe
  target could not be blocked — including this window. Sessions already open when
  the config was written did not pick the hook up at all (this window's `Stop`
  calls logged nothing), which is the reason the probe sessions were created
  after arming.
- the three probe sessions were ordinary Desktop conversations in the operator's
  own app; they read no files and ran no commands.

## One accident, recorded

Run 1 was meant to be an observe-only call: the script at that moment branched
`MODE === 'exit2' ? block-exit2 : block-json`, so `mode: observe` still emitted
the flat block envelope. The log line reads `"mode":"observe","action":"block-json"`
— it is not a typo, it is the bug. The branch was fixed to pass on `observe`
before runs 2 and 3, which reproduce both channels deliberately. Read the
unfixed revision with `git log -p -- docs/evidence/v0.3.0/probes/qoder-stop-probe.js`.

A second observation worth keeping: run 3's first call logged
`action: "pass"` because the probe session **refused** to make the unverified
claim the prompt asked for — the installed jiahao skill talked it out of it. The
follow-up prompt asked it to quote the marker as a literal instead, which is how
the exit-2 channel got measured.

## Declared-unverified

Nothing below was observed, and none of it is claimed by the adapter README:

- **the plugin registration surface.** `.qoder-plugin/plugin.json` plus an
  auto-discovered `hooks/hooks.json` is the shape of the host's own bundled
  `qoder-context` plugin (manifest keys and event names quoted in
  [`qoder-runtime-hook-schema.txt`](qoder-runtime-hook-schema.txt) §5–6). That
  plugin's hooks were watched firing in the host run log: `SessionStart` lines
  carry `exit_code=0`, and `UserPromptSubmit` lines show the registration and the
  resolved `plugin_root` but no exit code
  ([`qoder-runlog-hooks.txt`](qoder-runlog-hooks.txt)). A `Stop` hook arriving
  through the plugin path was never watched blocking: both blocks above came
  through the **settings** path.
- **`${QODER_PLUGIN_ROOT}` in a shell-form command.** The host's own plugin uses
  that placeholder, and the run log prints it verbatim in `display_text`
  (`display_text="${QODER_PLUGIN_ROOT}/bin/qoder-context-hook.exe"`) — which
  shows the host keeps the string for display, not that it substituted it before
  the command ran. The probe itself used exec form (`command` + `args`), so the
  spelling in the generated map has not been watched resolving.
- `SessionEnd`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Notification` and
  the `prompt`/`agent` handler types on this host. The host's bundled hook-config
  skill documents them; none was exercised here. `SessionEnd` is nevertheless
  wired to `jiahao-sweep` in the shipped map — the sentinel-reclamation invariant
  (`test/sentinel-ownership.test.js` D3) has no other collector, and an unwired
  sweep leaks `<config>/.jiahao-sentinel.*`. That wiring is a repo invariant
  being honoured, not a probe result, and the adapter README says so.
- whether a Stop block also accepts `hookSpecificOutput` fields, and whether
  `additionalContext` injected at `SessionStart` reaches the model on Qoder.
- the Qoder IDE/CLI product line's hook surface: no `qoderclicn`/`qodercli` binary
  is installed here (`which` finds none, `~/.qoder-cn/bin/` holds only `7zr.exe`
  and `qoder-cn-computer-use`), so that line stays on the probe list.
- the international Desktop build, for the whole list above.

## Follow-ups

- International Desktop 0.4.11 probe: filed as a separate ticket; the A-tier row
  stays scoped to the CN build until someone watches a block there.
- Plugin-surface live check (install the generated bundle as a Desktop plugin and
  watch its `Stop` hook fire): named in the adapter README as the open item.
