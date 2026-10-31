# Probe scripts (#80)

Throwaway hooks used for the v0.3.0 acceptance. They are evidence artifacts,
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

## Google Antigravity 1.2.12 (#111)

- `antigravity-exit2.js`: Stop hook, exit 2 + stderr. Observed: hook failed with exit status 2, turn ended without continuation.
- `antigravity-always-block.js`: Stop hook, exit 0 + decision block every time. Observed: 10 forced continuations (10 Stop invocations, executionNum 0 through 9 blocked), then the host ended the turn at `MAX_FORCED_INVOCATIONS`.
- `antigravity-hook-wrapper.js`: wraps the installed gate, logs the hook's own stdin/stdout/stderr/exit, then replays them. Used for `../antigravity-hook-exit.txt`.
