# Qoder international Desktop turn-end hook probe (#113)

Date: 2026-11-01. Host: Windows 10.0.26100 (win32 x64), Qoder international
Desktop 0.4.11. Ticket: #113, the second variant of #109. Acceptance standard:
spec #74 D5 and `docs/agents/evidence-review.md`.

Baseline: this ran in the worktree `D:\Aworker\wt-qoder-intl-113` on branch
`feat/qoder-intl-probe-113`, whose base is `9f6e9ba0` (the commit that merged
#109 into `main`). The hook that fired was
[`probes/qoder-intl-probe-hook.js`](probes/qoder-intl-probe-hook.js), a log-path
shim over the #109 probe `probes/qoder-stop-probe.js` — the probe script, not
the shipped bundle. Nothing here was probed against the shipped bundle.

Named commit: the probe ran from `dafb2ac6` (the commit titled
`feat(#113): Qoder 国际版 Desktop 升 A 档（第二个变体的真机探针）`, parent
`9f6e9ba0`); the record and its artifacts were then corrected by later commits on
the same branch. `docs/agents/evidence-review.md` item 9 is explicit that
`node scripts/build-adapters.js --check` does **not** tie an artifact to the
bundle that was probed, and that caveat applies here: what ties this record to a
tree is the commit `dafb2ac6` above, not `--check`.

## Verdict per variant

| Variant | Blocking level | Basis |
|---|---|---|
| Qoder CN Desktop 0.4.11 | **A** | #109: a `Stop` hook blocked and continued a real turn twice, through two channels |
| Qoder international Desktop 0.4.11 | **A** | this record: a `Stop` hook blocked and continued a real turn through both channels, and 3 consecutive blocks were honored before the probe's own cap |
| Qoder IDE/CLI | **C, unchanged** | no Qoder CLI is installed on this machine; its hook surface was not probed |

## Version reconciliation, said out loud

This record lives under `docs/evidence/v0.3.0/` because it answers the same probe
list that v0.3.0 published its blocking level table with, and #109's record is filed the same
way. It is **not** evidence about the released v0.3.0 artifact: the v0.3.0 tag had
no Qoder plugin bundle at all. The bundle this ticket's docs describe carries
`version: 0.3.0` in `.qoder-plugin/plugin.json` because the emitter copies
`package.json`, and this PR does not bump it: the next version number belongs to
the next **release** ticket, and no such ticket is open as of 2026-11-01. So
`0.3.0` here means "the released 0.3.0 package version", and the bundle at blocking level A is
new content that 0.3.0 never shipped.

## Host facts, read from disk

[`qoder-intl-host-versions.txt`](qoder-intl-host-versions.txt) holds the commands
and raw output:

- `state.ini` (launcher): `installDir=D:\Qoder`, `targetVersion=0.4.11`.
- Worker runtime `qoder-worker-runtime 1.1.75-hotfix.1`, commit `cb3c036`,
  `win32-x64`, `build.site = global`, `productName = qodercli` — the same
  runtime version and commit as the CN build, but a different site/product. Read
  from `.qoder-versions\0.4.11\resources\...`, the tree the running app loads;
  `D:\Qoder\resources\...` (the launcher's `installDir`) holds an older
  `1.1.75` / `793448a` and both paths are quoted in the artifact so the number
  reproduces.
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

Every one of the 12 calls in
[`qoder-intl-hook-calls.jsonl`](qoder-intl-hook-calls.jsonl) records an argv whose
label names the `.qoder/` file: `intl-origin-dot-qoder` on the 10 calls from runs
1–4, `intl-io-origin-dot-qoder` on the 2 from run 5 (which armed only `.qoder/`).
**`intl-origin-dot-qoder-cn` never appears**, in either the 10-call or the
2-call arming. The host's run log names the firing source `project`
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

Five sessions, twelve calls. The hook blocked only when the turn's
`last_assistant_message` contained `JIAHAO109-CLAIM-DONE`.

| Run | Session | Mode | Hook calls | Blocks | Host-logged exit | Continued? |
|---|---|---|---|---|---|---|
| 1 | `864d738e` | flat `{"decision":"block"}` on stdout | 2 | 1 | `exit_code=0` | yes, `stop_hook_active=true` |
| 2 | `a221d8d2` | exit 2 + reason on stderr | 2 | 1 | `exit_code=2` (`success=false`) | yes, `stop_hook_active=true` |
| 3 | `17bb23f4` | flat decision, cap 6 | 2 | 1 | `exit_code=0` | yes |
| 4 | `68cce25f` | flat decision, cap 3, marker demanded every turn | 4 | 3 | `exit_code=0` | yes ×3, then cap-reached pass |
| 5 | `feb3c5c2` | flat decision, cap 2, run through the stream-capturing wrapper | 2 | 1 | `exit_code=0` | yes, `stop_hook_active=true` |

Run 5 exists to answer evidence-review item 7: it ran the shared probe through
[`codex-hook-wrapper.js`](probes/codex-hook-wrapper.js) (a generic spawn-log-replay
wrapper; the name is historical), so
[`qoder-intl-probe-io.jsonl`](qoder-intl-probe-io.jsonl) holds the hook's own
**stdin, stdout, stderr and exit code** for that invocation, in the same record.
Call 1 of run 5: `code: 0`, `stdout` = the flat `{"decision":"block",...}` line,
`stderr` empty; call 2: `code: 0`, both streams empty. Its stdin belongs to
**run 5's own session** `feb3c5c2`, taken from the same wrapper record, not the
run 1 payload quoted further up:

```json
{"session_id":"feb3c5c2-b7b8-54e5-a8c5-fb3c1fff9a17","hook_event_name":"Stop",
 "stop_hook_active":false,
 "transcript_path":"...\\D--Aworker-photo\\feb3c5c2-...jsonl",
 "cwd":"D:\\Aworker\\photo","model":"cline-pass/deepseek-v4.1-flash-1017",
 "last_assistant_message":"<the refusal quoted under What the blocked messages actually were>"}
```

That keeps the exit code, the session id and the payload in one run. The
**streams are the wrapper's record, not the host's** - the
host log for that session carries `exit_code=0` on both turns and no stdout or
stderr, so what the two sources agree on is the exit code. The channel
observation above therefore rests on the wrapper record, which is the point of
item 7, and the host's agreement is limited to the code.

The **command** in D5's sense is the one the host ran to spawn the hook. Runs 1–4
used the log-path shim; run 5 re-armed the same project file with the io shim:

```text
runs 1-4: node  .../probes/qoder-intl-probe-hook.js    intl-origin-dot-qoder
run 5:    node  .../probes/qoder-intl-io-probe-hook.js intl-io-origin-dot-qoder
timeout:  10 (both)
registered in: D:\Aworker\photo\.qoder\settings.json   (project scope, Stop)
```

Both armings are quoted verbatim in
[`qoder-intl-host-versions.txt`](qoder-intl-host-versions.txt) - the runs 1–4 file
first, the run 5 file after it. The host log itself only says
`display_text="node"`, so it does not carry the script path; the config file is
what names the entrypoint, and the probe's own log line is what shows which label
it was invoked with (`argv: ["intl-origin-dot-qoder"]` on runs 1–4,
`["intl-io-origin-dot-qoder"]` on run 5). Command, hook exit code and session id
therefore come from the same run: the session id is in the wrapper record and in
that session's host lines, the exit code in both, and the command in the armament
that was live for that session.
"output this line verbatim, run no tools".

Counts agree across three artifacts: **12** calls in
`qoder-intl-hook-calls.jsonl` (7 blocking, 5 passing), **12** `hook.finished`
lines with `source="project"` in `qoder-intl-runlog-probe-hooks.txt`, and **7**
injected block-feedback records in
[`qoder-intl-transcript-block-lines.jsonl`](qoder-intl-transcript-block-lines.jsonl)
(one per block; the 5 passing calls injected nothing). The stream-capture run
adds **2** records to
[`qoder-intl-probe-io.jsonl`](qoder-intl-probe-io.jsonl), one per invocation.

The host's feedback channel is the transcript: each block appended a `user` line
with `"isMeta":true` whose `message.content` is the hook's reason, e.g.

```text
JIAHAO109-CLAIM-DONE claimed without a verification receipt; hook #109 blocked this turn end.
```

Those fields are in the artifact now, not just asserted here: each record in
`qoder-intl-transcript-block-lines.jsonl` carries `type`, `role`, `isMeta` and
`origin`, read straight out of the session transcript.

and the model then ran another turn in the same `turnId` (session `864d738e`:
call 1 at 02:14:43.285 blocked, call 2 at 02:14:51.220 reported
`stop_hook_active: true`).

### What the blocked messages actually were

The gate is a marker, not a truth test. Per run:

| Run | What the blocked last message was | counts as |
|---|---|---|
| 1 | `我已完成并验证了一个只读检查：本回合未读取文件、未运行命令、未改动任何内容，结果符合预期。 JIAHAO109-CLAIM-DONE` | an **unfounded completion claim**, self-contradictory on its face |
| 2 | `探针固定文本 JIAHAO109-CLAIM-DONE：本轮我没有做任何验证，因此这句话不构成完工凭证。` | **a quoted probe literal that disclaims being completion evidence** — a marker match only |
| 3 | same as run 1 | an unfounded completion claim |
| 4 | same as run 1 ×3 | three unfounded completion claims |
| 5 | the model **refused** to assert it and quoted the line inside a disclaimer instead | a quoted literal — a marker match only |

So this variant has **5 blocks on unfounded completion claims** (runs 1, 3, 4)
and **2 blocks on messages that deny being a claim** (runs 2 and 5). The exit-2
run proves the channel carries a block and a continuation, nothing more.

In run 5, asked to emit the unfounded sentence, the model answered that it could
not claim what it had not done and offered the string as a quotation. The marker
still matched, so the hook blocked it - the gate behaving as a marker, not as a
truth test.

**Why the model refused is not established by this run.** Run 5's records show a
single `Bash` call (a read-only `git status` / `git diff --check` / `git log`,
transcript line 18) and **no `Skill` invocation** - the only `Skill` call in the
whole probe belongs to run 3's `17bb23f4`
([`qoder-intl-tool-records.jsonl`](qoder-intl-tool-records.jsonl)). So nothing in
run 5 shows the skill being loaded or invoked, and saying "the installed skill
talked it out of it" would be an inference from observing a refusal, not an
observation. The same refusal shape did appear in #109's run 3, where the skill
*was* invoked, which is suggestive and remains only suggestive.

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
  continued 3 times in a row (calls 7–9, 6.7s and 5.5s apart), and the run ended
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
- every block was gated on the marker string with a per-session cap. The marker
  is a **content gate, not a session gate**: a turn whose text lacks
  `JIAHAO109-CLAIM-DONE` can never be blocked, which is what keeps unrelated
  sessions out, but another new turn in the armed project that contained that
  exact string could be blocked up to the cap. No such turn occurred here — the
  string appears only in the probe prompts. Sessions already open when the config
  was written do not pick the hook up at all, which is why each run used a
  **newly created** session.
- the five probe sessions were created for this ticket only. That tools were or
  were not run is stated from the sessions' own tool records, not from the
  models' summaries: [`qoder-intl-tool-records.jsonl`](qoder-intl-tool-records.jsonl)
  holds every `tool_use` entry extracted from the five transcripts.
  - Runs 1 (`864d738e`), 2 (`a221d8d2`) and 4 (`68cce25f`) were asked not to run
    tools and have **zero** entries.
  - **Run 3 (`17bb23f4`) ran 4**: a `Skill` call for `jiahao` at transcript line
    17, then three `Bash` calls at lines 23, 24 and 30
    (`git status --porcelain=v1 …`, a `find … -newermt` sweep, and a
    `date`/`stat` probe of the two settings files).
  - **Run 5 (`feb3c5c2`) ran 1**: a single `Bash` at line 18
    (`git status --porcelain=v1; git diff --check; git log -1 --oneline`).

  All of those commands are read-only and ran inside the scratch workspace
  `D:\Aworker\photo`; in each case the hook had already blocked the turn before
  they ran.

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
- whether the shipped gate's evidence chain lands where it should. At probe time
  `configDir()` had no host-root step, so a Qoder hook read and wrote under
  `<drive>:\tmp`; [#116](https://github.com/Xxx91n/jiahao/issues/116) has since
  added `QODER_CONFIG_DIR` to the resolution, after `CLAUDE_CONFIG_DIR` and
  `HOME`. That fix is **not** re-probed live on this variant here - its own
  record says the in-app half is still pending - and the plugin path's
  environment is unobserved, so this record only states what was measured: the
  block channel.
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
international build. What is *not* shown: the `display_text`/`hookName` fields keep
the placeholder literal (`${QODER_PLUGIN_ROOT}/bin/qoder-context-hook.exe`), so
"those hooks ran with the root substituted" is inferred from `exit_code=0` and
the binary being present at the logged `plugin_root`, not watched in a
separately substituted command line. Shell-form `node "..."` expansion remains
unproven. It does not show this bundle blocking, and the adapter README keeps
that distinction.

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
