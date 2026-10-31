# Probe scripts (#80, #108)

Throwaway hooks used for the v0.3.0 acceptance (#80: Codex CLI, GitHub
Copilot CLI; #108: ZCode). They are evidence artifacts,
not part of any distributed bundle. Hook configs point at the absolute path of
these files; paths inside the scripts are relative to this directory.

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

## ZCode 3.16.2 (#108, 2026-10-31)

- `zcode-stop-wrapper.js`: the workspace Stop hook for the whole probe. Logs
  one JSON line per fire (payload + env key names), then acts per a mode file
  read at fire time: `json-once` (block this session's first Stop via
  `{decision:"block"}` on exit 0), `exit2` (exit 2, no output), `cap` (block
  every Stop), `realgate` (spawn the real bundled gate with argv `zcode`
  under an isolated `CLAUDE_CONFIG_DIR`, log its exit/stdout/stderr, then
  replay them). Raw fires: `../zcode-stop-fires.jsonl`.
- `zcode-log-only.js`: log-only hook used on `UserPromptSubmit` to capture the
  payload shape without blocking anything.
- The hook config was a workspace `.zcode/config.json` in the repository
  (loaded at session start, removed after the probe); the wrapper scripts
  themselves live outside the repository.
