# Qoder international Desktop turn-end hook probe (#113)

Date: 2026-11-01. Host: Windows 10.0.26100 (win32 x64), Qoder international
Desktop 0.4.11. Ticket: #113, the second variant of #109. Acceptance standard:
spec #74 D5 and `docs/agents/evidence-review.md`.

Baseline: this ran in the worktree `D:\Aworker\wt-qoder-intl-113` on branch
`feat/qoder-intl-probe-113`, whose base is `9f6e9ba0` (the commit that merged
#109 into `main`). The hook that fired was
[`probes/qoder-intl-probe-hook.js`](probes/qoder-intl-probe-hook.js), a log-path
shim over the #109 probe `probes/qoder-stop-probe.js` — the probe script, not
the shipped bundle. The bundle this record informs is generated from the host
table in the commit these artifacts land in.

## Verdict per variant

| Variant | Tier | Basis |
|---|---|---|
| Qoder CN Desktop 0.4.11 | **A** | #109: a `Stop` hook blocked and continued a real turn twice, through two channels |
| Qoder international Desktop 0.4.11 | **A** | this record: a `Stop` hook blocked and continued a real turn through both channels, and 3 consecutive blocks were honored before the probe's own cap |
| Qoder IDE/CLI | **C, unchanged** | no Qoder CLI is installed on this machine; its hook surface was not probed |

## Version reconciliation, said out loud

This record lives under `docs/evidence/v0.3.0/` because it answers the same probe
list that v0.3.0 published its tier table with, and #109's record is filed the same
way. It is **not** evidence about the released v0.3.0 artifact: the v0.3.0 tag had
no Qoder plugin bundle at all. The bundle this ticket's docs describe carries
`version: 0.3.0` in `.qoder-plugin/plugin.json` because the emitter copies
`package.json`, and this PR does not bump it: the next version number belongs to
the next **release** ticket, and no such ticket is open as of 2026-11-01. So
`0.3.0` here means "the released 0.3.0 package version", and the A-tier bundle is
new content that 0.3.0 never shipped.

## Host facts, read from disk

[`qoder-intl-host-versions.txt`](qoder-intl-host-versions.txt) holds the commands
and raw output:

- `state.ini` (launcher): `installDir=D:\Qoder`, `targetVersion=0.4.11`.
- Worker runtime `qoder-worker-runtime 1.1.75-hotfix.1`, commit `cb3c036`,
  `win32-x64`, `build.site = global`, `productName = qodercli` — the same
  runtime version and commit as the CN build, but a different site/product.
- Config root, read from a subprocess this app spawned:
  `QODER_CONFIG_DIR = C:\Users\Administrator\.qoder`.
- `~/.qoder/settings.json` had exactly `enabledPlugins, mcpServers, providers`
  before the probe — no `hooks` key.
- `~/.qoder/.qoder-app-status.json` reports `version 0.4.11`, `product: qoder`
  (the CN build's twin file reports `product: qodercn`).

## Which project-scope file registers hooks — `.qoder/` only, same as CN

The probe workspace `D:\Aworker\photo` was armed with **both**
`.qoder/settings.json` and `.qoder-cn/settings.json`, each registering the same
`Stop` hook with a different origin label as argv:

- `.qoder/settings.json` → `intl-origin-dot-qoder`
- `.qoder-cn/settings.json` → `intl-origin-dot-qoder-cn`

Every one of the 10 calls in
[`qoder-intl-hook-calls.jsonl`](qoder-intl-hook-calls.jsonl) records
`argv: ["intl-origin-dot-qoder"]`. **`intl-origin-dot-qoder-cn` never appears.**
The host's run log names the firing source `project`
([`qoder-intl-runlog-probe-hooks.txt`](qoder-intl-runlog-probe-hooks.txt),
`hook.started ... source="project" hook_index=1 total_hooks=2 display_text="node"`).

So the international build behaves like the CN build here: the project-scope
file is `.qoder/settings.json`, and a `.qoder-cn/settings.json` sitting beside it
does nothing. That is an observation on this host, not an inference from CN.

## `Stop` exists, and the payload is Claude-shaped

`Stop` fires in every turn even with no user hook registered — the host's own
`goal-loop-stop` appears as `source="system"`. With the probe armed, the same
event shows `total_hooks=2` with the probe as `source="project"`.

Payload received on stdin (verbatim, call 1 of session `864d738e`):

```json
{"session_id":"864d738e-3466-5919-a485-8bae7e488c93",
 "transcript_path":"C:\\Users\\Administrator\\.qoder\\projects\\D--Aworker-photo\\864d738e-....jsonl",
 "cwd":"D:\\Aworker\\photo","hook_event_name":"Stop",
 "model":"cline-pass/deepseek-v4.1-flash-1017","permission_mode":"yolo",
 "stop_hook_active":false,
 "last_assistant_message":"...JIAHAO109-CLAIM-DONE",
 "parent_request_set_id":"3fc41a66-...","parent_business_info":{"product":"app","version":"1.1.75-hotfix.1", ...}}
```

`transcript_path` lands under `C:\Users\Administrator\.qoder\projects\<slug>\`,
i.e. inside the international config root — the same shape as CN's
`~/.qoder-cn/projects/`.

Env handed to the hook subprocess, recorded on every call:
`QODER_PROJECT_DIR`, `QODER_CONFIG_DIR`, `USERPROFILE`, `TEMP`, `TMP`. **No
`QODER_SESSION_ID`.** On this build `QODER_CONFIG_DIR` is `...\.qoder` and
`QODER_PROJECT_DIR` is the probe workspace. `CLAUDE_CONFIG_DIR` and `HOME` are
absent — the state-location defect tracked as [#116](https://github.com/Xxx91n/jiahao/issues/116)
applies to this variant too, and this probe does not treat the evidence chain as
its judge (see "What this record does not claim").

## Both blocking channels work

Four sessions, ten calls, one channel question each. The hook blocked only when
the turn's `last_assistant_message` contained `JIAHAO109-CLAIM-DONE`.

| Run | Session | Mode | Hook calls | Blocks | Host-logged exit | Continued? |
|---|---|---|---|---|---|---|
| 1 | `864d738e` | flat `{"decision":"block"}` on stdout | 2 | 1 | `exit_code=0` | yes, `stop_hook_active=true` |
| 2 | `a221d8d2` | exit 2 + reason on stderr | 2 | 1 | `exit_code=2` (`success=false`) | yes, `stop_hook_active=true` |
| 3 | `17bb23f4` | flat decision, cap 6 | 2 | 1 | `exit_code=0` | yes |
| 4 | `68cce25f` | flat decision, cap 3, marker demanded every turn | 4 | 3 | `exit_code=0` | yes ×3, then cap-reached pass |

The **command** in D5's sense is the one the host ran to spawn the hook, and it
is the same for all four runs:

```text
command:  node
args:     D:/Aworker/wt-qoder-intl-113/docs/evidence/v0.3.0/probes/qoder-intl-probe-hook.js
          intl-origin-dot-qoder
timeout:  10
registered in: D:\Aworker\photo\.qoder\settings.json   (project scope, Stop)
```

That argv is recorded verbatim on every call in `qoder-intl-hook-calls.jsonl`,
so the command, the hook's exit code and the session id all come from the same
run. What the model was asked is in the record per run; run 1's whole prompt was
"output this line verbatim, run no tools".

Counts agree across three artifacts: **10** calls in
`qoder-intl-hook-calls.jsonl` (6 blocking, 4 passing), **10** `hook.finished`
lines with `source="project"` in `qoder-intl-runlog-probe-hooks.txt`, and **6**
injected block-feedback records in
[`qoder-intl-transcript-block-lines.jsonl`](qoder-intl-transcript-block-lines.jsonl)
(1 + 1 + 1 + 3 blocking calls - one per block; the 4 passing calls injected
nothing).

The host's feedback channel is the transcript: each block appended a `user` line
with `"isMeta":true` whose `message.content` is the hook's reason, e.g.

```text
JIAHAO109-CLAIM-DONE claimed without a verification receipt; hook #109 blocked this turn end.
```

and the model then ran another turn in the same `turnId` (session `864d738e`:
call 1 at 02:14:43.285 blocked, call 2 at 02:14:51.220 reported
`stop_hook_active: true`).

### What the blocked messages actually were

The gate is a marker, not a truth test. Per run:

| Run | What the blocked last message was | counts as |
|---|---|---|
| 1 | `我已完成并验证了一个只读检查：本回合未读取文件、未运行命令、未改动任何内容，结果符合预期。 JIAHAO109-CLAIM-DONE` | an **unfounded completion claim**, self-contradictory on its face |
| 2 | `探针固定文本 JIAHAO109-CLAIM-DONE：本轮我没有做任何验证，因此这句话不构成完工凭证。` | **a quoted probe literal that disclaims being a receipt** — a marker match only |
| 3 | same as run 1 | an unfounded completion claim |
| 4 | same as run 1 ×3 | three unfounded completion claims |

So this variant has **5 blocks on unfounded completion claims** (runs 1, 3, 4)
and **1 block on a message that denies being a claim** (run 2). The exit-2 run
proves the channel carries a block and a continuation, nothing more.

**Qualifier, so the 5 is not read as more than it is:** in every one of those
runs the operator prompt asked the model to emit that sentence verbatim (runs 1
and 3 explicitly "不要执行任何工具", run 4 "每一轮都必须以这一行结尾"). The
sentence is unfounded on its face - it claims a verification that the same
sentence says did not happen - so the block is correct, but it is a claim the
prompt dictated, not one the model invented. #109's run 2 had the same shape at
greater length, with the model writing the contradiction itself.

## Loop guardrail

- The host sets `stop_hook_active: true` on every re-entry turn: calls 2, 4, 6,
  8, 9 and 10 of `qoder-intl-hook-calls.jsonl`. The first `Stop` of a fresh
  session (calls 1, 3, 5, 7) reports `false`.
- **No host-side consecutive-block limit was reached.** Run 4 was blocked and
  continued 3 times in a row (calls 7–9, 7s and 5s apart), and the run ended
  because the probe's own cap (`mode.txt` = `jsonblock 3`) let the 4th `Stop`
  pass: the log records `action: "cap-reached-pass"` and the host logged
  `exit_code=0`. The bound that stopped the loop was the wrapper, not the host.
- The cap was set by the probe before each run (`jsonblock 3`, `exit2 2`,
  `jsonblock 6`, `jsonblock 3`); no run was unbounded.

## Isolation state, stated plainly

This was **not** run against an isolated config home — a Desktop session's
worker is spawned by the app and there is no `QODER_HOME`-style override, so the
probe ran in the app's real config:

- hook config was written to a **separate scratch repository**,
  `D:\Aworker\photo` (clean, on `main`), not to the ticket's checkout and not to
  `~/.qoder/settings.json`. The user-scope file was never edited.
- both project files (`.qoder/settings.json`, `.qoder-cn/settings.json`) were
  **deleted after the last run**, along with
  `%TEMP%/jiahao-109-probe-state`; `git status` in the probe workspace and in the
  ticket worktree are clean of probe files.
- every block was gated on the marker string with a per-session cap, so a
  session that was not the probe target could not loop — including this window.
  Sessions already open when the config was written do not pick the hook up at
  all, which is why each run used a **newly created** session.
- the four probe sessions were created for this ticket only. Runs 1, 2 and 4 were
  asked not to run tools and did not. **Run 3 did run tools**: after the first
  block, call 6's message says it ran `git status --porcelain`,
  `git diff --stat`, `git diff --cached --stat` and `git rev-parse --short HEAD`
  to back the claim up. Those were read-only commands inside the scratch
  workspace `D:\Aworker\photo`, and the hook had already blocked the turn before
  they ran; the record states it because the same log contradicts "none did".

## What this record does not claim

- **The plugin registration surface, as a *block*.** Installing `adapters/qoder/`
  as a Desktop plugin was not done: the host installs local archives from its
  plugin settings UI and this machine has no Qoder CLI to drive that headlessly.
  Every block above came through the **settings** path. What *was* observed on
  this build is that the plugin path carries a `Stop` event at all — see
  "Plugin surface" below.
- **`${QODER_PLUGIN_ROOT}` in a shell-form command.** The probe used exec form
  (`command` + `args`), as #109's did; so does the host's own bundled plugin.
- `SessionEnd`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Notification`, and
  the `prompt`/`agent` handler types on this build.
- whether the shipped gate's evidence chain lands where it should: on this host
  `configDir()` still falls through to `<drive>:\tmp` ([#116](https://github.com/Xxx91n/jiahao/issues/116)).
  The block channel is what was measured.
- the IDE/CLI line: no `qodercli` is on `PATH` and `~/.qoder/bin/` holds only
  `7zr.exe` and `qoder-computer-use/`.

## Plugin surface (the ticket's "顺带" item)

Half of the item is answered by this build's own bundled plugin, and the answer
differs between the two builds:

| Build | Bundled `qoder-context` version | Events in its `hooks/hooks.json` | `Stop` watched finishing |
|---|---|---|---|
| international | `1.0.84.f756706` | SessionStart, UserPromptSubmit, PostToolUse, **Stop** | yes, `exit_code=0`, `source="plugins"` |
| CN | `1.0.84.f756706` | SessionStart, UserPromptSubmit | no `Stop` entry at all |

The international lines are appended to
[`qoder-intl-runlog-probe-hooks.txt`](qoder-intl-runlog-probe-hooks.txt); the CN
side is the file read in
[`qoder-runtime-hook-schema.txt`](qoder-runtime-hook-schema.txt) §6, which lists
two events. Note this is a **file-plus-log** observation of the host's own
plugin, not of this bundle: it shows the plugin path can deliver a `Stop` on the
international build, and that `${QODER_PLUGIN_ROOT}` resolves in exec form there.
It does not show this bundle blocking, and the adapter README keeps that
distinction.

Not done, and not claimed: zipping `adapters/qoder/` and installing it through
the Desktop plugin settings. That step needs the app's UI (there is no Qoder CLI
on this machine), so the bundle's own plugin path stays declared-unverified.

## Follow-ups

- [#116](https://github.com/Xxx91n/jiahao/issues/116): `configDir()` resolves to
  `<drive>:\tmp` on both Desktop variants because the hook subprocess gets
  neither `CLAUDE_CONFIG_DIR` nor `HOME`. Measured on CN (#109) and re-observed
  here (`QODER_CONFIG_DIR` present, `CLAUDE_CONFIG_DIR`/`HOME` absent).
- Plugin-surface live check (install the generated bundle as a Desktop plugin and
  watch its `Stop` hook fire): still open on both variants.
