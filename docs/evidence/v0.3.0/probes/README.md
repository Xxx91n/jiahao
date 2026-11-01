# Probe scripts (#80, #108–#111, #113, #116, #118)

Throwaway hooks used for the v0.3.0 acceptance and the follow-up host probes.
They are evidence artifacts, not part of any distributed bundle. Hook configs
point at the absolute path of these files; paths inside the scripts are
relative to this directory.

## Limitations

- Raw probe logs are not committed when they could capture secrets: the
  WorkBuddy hook environment carries service tokens, so
  `workbuddy-hook-probe.js` writes outside the repository and
  `qoder-state-probe.js` promotes a log into a record only when a run is
  written up. The claims stand on the recorded observations, not on committed
  transcripts.
- This directory is not shipped in any bundle or npm pack file.

## Codex CLI 0.163.0

- `codex-exit2.js`: user-level Stop hook, exit 2 + stderr. Observed: one turn,
  no continuation.
- `codex-always-block.js`: user-level Stop hook, exit 0 + decision block every
  time. Observed: 785 continuations (786 assistant messages, 33M input
  tokens), then the host completed the turn; no small cap like Copilot's 8.
- `codex-hook-wrapper.js`: wraps the installed gate, logs the hook's own
  stdin/stdout/stderr/exit, then replays them. Used only for
  `../codex-hook-exit.txt`; the gate logic is unchanged.

## GitHub Copilot CLI 1.0.105

- `copilot-always-block.js`: project `agentStop` hook that always blocks.
  Observed: 9 invocations, 8 continuations, then the CLI ended.
- `claude-block.js`: one-shot Claude-schema `Stop` hook placed in
  `.claude/settings.json`. Copilot maps it to `agentStop` and continues.
- `copilot-marker.js`: logs selected environment variables and an input prefix;
  used for the plugin-env probe and as a non-blocking project-hook marker.
- `copilot-hook-wrapper.js`: wraps the plugin's agentStop entry, logs the hook's
  own exit/stdout/stderr, then replays them.
- `copilot-exit2.js`: emits the decision field but exits 2. Observed: hook exit
  2; the host logged it as failed and the turn ended without a continuation.

## Qoder CN Desktop 0.4.11 (#109)

- `qoder-stop-probe.js`: a `Stop` hook for the Desktop app. It needs a
  project-scope `.qoder/settings.json` registering it on `Stop`, and the mode and
  per-session block cap come from `<temp>/jiahao-109-probe-state/mode.txt`
  because this host's settings-scope hook schema has no `env` field. It should
  observe: whether a config-registered command hook fires on `Stop`, the payload
  it receives, whether the run continues after a block, and whether the host sets
  `stop_hook_active` on re-entry. It blocks only when the turn's
  `last_assistant_message` contains `JIAHAO109-CLAIM-DONE` — a content gate on
  each turn, not a session identifier — and caps blocks per session, so a turn
  without the marker is never blocked.
  Observed: `Stop` fired from the project scope (`.qoder-cn/settings.json` did
  not), both the exit-0 flat decision and exit 2 + stderr continued the turn, 6
  consecutive blocks were honored before the probe's own cap ended the run, and
  the subprocess got `QODER_PROJECT_DIR` / `QODER_CONFIG_DIR` but no
  `QODER_SESSION_ID`. Record: `../qoder-hook-probe-2026-10-31.md`.

## Qoder international Desktop 0.4.11 (#113)

- `qoder-intl-probe-hook.js`: a log-path shim over `qoder-stop-probe.js` above.
  It only sets `JIAHAO_QODER_PROBE_LOG` (to `../qoder-intl-hook-calls.jsonl`)
  before loading the shared probe, so the international run's lines do not
  append to the CN artifact; the marker, per-session cap and mode gate are the
  shared ones. Register it in **both** `.qoder/settings.json` and
  `.qoder-cn/settings.json` of the probe workspace, with a different origin
  label as the first argv (`intl-origin-dot-qoder` / `intl-origin-dot-qoder-cn`).
  It should observe the same things as the CN probe, plus which of the two
  project files registers hooks on this build. Observed: only
  `intl-origin-dot-qoder` ever fired, both channels continued the turn,
  `stop_hook_active` was set on re-entry, 3 consecutive blocks were honored
  before the cap, and the subprocess env matched CN (`QODER_PROJECT_DIR`,
  `QODER_CONFIG_DIR`, no `QODER_SESSION_ID`, no `CLAUDE_CONFIG_DIR`/`HOME`).
  Record: `../qoder-intl-hook-probe-2026-11-01.md`.
- `qoder-intl-io-probe-hook.js`: the same shim, but it runs the shared probe
  through `codex-hook-wrapper.js` so each invocation also lands in
  `../qoder-intl-probe-io.jsonl` with the hook's own **stdin, stdout, stderr and
  exit code** in one record (evidence-review item 7). Register it the same way,
  with a distinct argv label (`intl-io-origin-dot-qoder`). Observed: 2
  invocations. Streams and exit codes come from the wrapper record only - call 1
  `code: 0` with the flat `{"decision":"block",...}` on stdout and empty stderr,
  call 2 `code: 0` with both streams empty. The host's own log for that session
  carries `exit_code=0` on both turns and **no** stdout/stderr, so what it
  corroborates is the exit code; the streams are the wrapper's record, not the
  host's.

## Google Antigravity 1.2.12 (#111)

- `antigravity-exit2.js`: Stop hook, exit 2 + stderr. Observed: hook failed with exit status 2, turn ended without continuation.
- `antigravity-always-block.js`: Stop hook, exit 0 + decision block every time. Observed: 10 forced continuations (10 Stop invocations, executionNum 0 through 9 blocked), then the host ended the turn at `MAX_FORCED_INVOCATIONS`.
- `antigravity-hook-wrapper.js`: wraps the installed gate, logs the hook's own stdin/stdout/stderr/exit, then replays them. Used for `../antigravity-hook-exit.txt`.

## ZCode 3.16.2 (#108, 2026-10-31)

- `zcode-stop-wrapper.js`: the workspace Stop hook for the whole probe. Logs
  one JSON line per fire (payload + env key names), then acts per a mode file
  read at fire time: `json-once` (block this session's first Stop via
  `{decision:"block"}` on exit 0), `exit2` (exit 2, no output), `cap` (block
  every Stop), `realgate` (spawn the real bundled gate with argv `zcode`
  under an isolated `CLAUDE_CONFIG_DIR`, log its exit/stdout/stderr, then
  replay them). Raw fires: `../zcode-stop-fires.jsonl`.
- `zcode-log-only.js`: log-only hook used on `UserPromptSubmit` to capture
  the payload shape without blocking anything.
- The hook config was a workspace `.zcode/config.json` in the repository
  (loaded at session start, removed after the probe); the wrapper scripts
  themselves live outside the repository.

## WorkBuddy AI 5.9.4 (#110, 2026-10-31)

- `workbuddy-hook-probe.js`: one script, three modes, used from a project-scope
  `.codebuddy/settings.json`.
  - `log`: records the payload and the hook environment, prints nothing. Used
    for the `PreToolUse` surface probe and the `UserPromptSubmit` record.
  - `block-once`: blocks the first finish, passes when a marker file exists or
    when the host sends `stop_hook_active: true`.
  - `block-always`: blocks every finish (kept for a future loop-guard run; not
    used here).
- It writes one JSONL line per invocation, plus a `spawned` line before stdin is
  read - a hook the host spawned but never fed is a different fact from a hook
  the host never spawned. The record lives outside the repository: the hook
  environment carries service tokens, which is why no raw log is committed.

## Qoder Desktop state location (#116, 2026-11-01)

- `qoder-state-probe.js`: a `Stop` hook used from a project-scope
  `.qoder/settings.json` (the surface #109 watched firing). It answers one
  question: where does the shipped gate put its own state on a host that hands
  a hook subprocess neither `CLAUDE_CONFIG_DIR` nor `HOME`?
  - It records which of the eight environment names the host actually sets
    (names only; the config root is the one value written down, because it is
    what the claim is about), then resolves the state paths by `require`-ing the
    repository's `src/shared/paths.js` rather than copying its order.
  - It spawns the **generated bundle's** `jiahao-verdict-gate.js` with the same
    stdin and environment, records that gate's exit code, and lists the segment
    files under the resolved `.jiahao-evidence` before and after, so "the chain
    grew here" is read back from the directory instead of inferred from output.
  - It always exits 0: this probe observes, it never holds a turn.
  - Its log path comes from `JIAHAO_QODER_STATE_PROBE_LOG`; without that it
    writes `../qoder-state-probe.jsonl` next to the probe. No such file is
    committed: only a run with a recorded result is promoted into a probe
    record, the same arrangement the WorkBuddy probe uses. The directory this
    file sits in is *not* shipped in any bundle.
