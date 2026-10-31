# Probe scripts (#80, #109)

Throwaway hooks used for the v0.3.0 acceptance and the #109 Qoder probe. They
are evidence artifacts, not part of any distributed bundle. Hook configs point
at the absolute path of these files; paths inside the scripts are relative to
this directory.

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
  `last_assistant_message` contains `JIAHAO109-CLAIM-DONE`, and caps blocks per
  session, so arming it in a live desktop app cannot loop an unrelated session.
  Observed: `Stop` fired from the project scope (`.qoder-cn/settings.json` did
  not), both the exit-0 flat decision and exit 2 + stderr continued the turn, 6
  consecutive blocks were honored before the probe's own cap ended the run, and
  the subprocess got `QODER_PROJECT_DIR` / `QODER_CONFIG_DIR` but no
  `QODER_SESSION_ID`. Record: `../qoder-hook-probe-2026-10-31.md`.
