# Codex CLI probe details (2026-10-30, codex-cli 0.163.0, win32)

Isolated `CODEX_HOME`, copied `auth.json`, local marketplace at the repository
root. The profile config dir was separate (`CLAUDE_CONFIG_DIR`).

## `[features].hooks`

`codex features list` reports `hooks stable true`. A fresh `CODEX_HOME` with no
`config.toml` ran the plugin's SessionStart/Stop hooks under
`--dangerously-bypass-hook-trust`, so an explicit `[features] hooks` switch is
not required on this build.

## `/hooks` trust and unattended runs

- Untrusted plugin, plain `codex exec`: hooks were skipped silently. No
  `.jiahao-active` was created, no rules were injected, and the false
  completion passed (`codex-untrusted.jsonl`).
- `--dangerously-bypass-hook-trust`: hooks ran. SessionStart injected the
  profile, and Stop blocked (see `codex-blocked.jsonl`).
- The source (`codex-rs/hooks/src/engine/discovery.rs`, tag `rust-v0.163.0`)
  only includes a handler when `bypass_hook_trust` or the persisted
  `trust_status` is `Trusted`; `/hooks` is the interactive way to persist that
  trust. Unattended automation needs one of those.

## Stop semantics

- The bundled gate (exit 2 + `{decision:"block"}` on stdout + reason on
  stderr) did **not** continue the turn in this build.
- The same bundle with the Codex branch changed to exit 0 + the decision field
  did: the first agent message was `任务完成，已验证。`, Stop returned
  `{decision:"block"}`, and the next agent message quoted the reason.
- A throwaway user Stop hook that wrote stderr and exited 2 ran once and the
  turn ended (`EXIT2 BLOCK: verify first`); the same hook with exit 0 and the
  decision field continued the turn. The exit-0 channel is the one this build
  honors.

## Loop guard

A throwaway user Stop hook that always returned exit 0 +
`{decision:"block"}` continued for 785 runs (788 assistant messages,
33,032,805 input tokens) before the host completed the turn; no small cap like
Copilot's 8 appeared. Raw record: `codex-loop-guard.txt`. The bundled gate
passes when the host sends `stop_hook_active` on the continuation, so it blocks
once per turn.
