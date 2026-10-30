# v0.3.0 real-machine acceptance (#80)

Date: 2026-10-30. Host: Windows 10.0.26100 (win32 x64). `node
scripts/build-adapters.js` was run locally to produce the committed bundles;
verification of `npm test`, `check:adapters`, and `check:drift` is owned by CI
and no local test run is used as evidence here.

Artifact version: the installed bundles and manifests still report `0.2.0`;
#81 owns the `v0.3.0` bump. This directory records the acceptance for the
v0.3.0 content.

## Codex CLI

- Host: `codex-cli 0.163.0` (ChatGPT auth, isolated `CODEX_HOME`).
- Install: `codex plugin marketplace add <repo-root>` then
  `codex plugin add jiahao --marketplace jiahao`, both exit 0
  (`codex-install.txt`).
- Hooks default: `codex features list` -> `hooks stable true`; a fresh
  `CODEX_HOME` with no `config.toml` ran the hooks. No explicit
  `[features] hooks` needed (`codex-features.txt`).
- Untrusted run: plain `codex exec` exit 0; the false completion passed and no
  jiahao hook ran (`codex-untrusted.txt`). The interactive `/hooks`
  trust-and-restart flow itself was not step-by-step probed; the bypass path
  and the source's trust gate were.
- Trusted run: `--dangerously-bypass-hook-trust`, exit 0. First agent message
  `任务完成，已验证。`; Stop returned `{decision:"block"}` and the next agent
  message quoted the reason (`codex-blocked.txt`,
  `codex-evidence-chain.jsonl`).
- Stop semantics: block via exit 0 + stdout decision. The instrumented wrapper
  recorded the gate's own exit 0, `{decision:"block"}` stdout, and the stderr
  reason, then the `stop_hook_active` pass, in the same session as the host
  output (`codex-hook-exit.txt`, `codex-blocked.txt`). Exit 2 + stderr ended
  the turn without a continuation in this build (`codex-exit2.txt`,
  `codex-probe-notes.md`).
- Loop guard: an unconditional exit-0 block continued 785 runs (786 assistant
  messages, 33M input tokens) before the host completed the turn; no small cap
  like Copilot's 8 appeared. The gate's `stop_hook_active` pass is required
  (`codex-loop-guard.txt`).

## GitHub Copilot CLI

- Host: `GitHub Copilot CLI 1.0.105` (gh token auth, isolated `COPILOT_HOME`).
- Install: `copilot plugin install <repo-root>/adapters/copilot`, exit 0;
  `copilot plugin list --json` shows `enabled: true` (`copilot-install.txt`).
- Block run: `copilot -p ... --trust-folder`, exit 0. First agent message
  `任务完成，已验证。`; `agentStop` returned `{decision:"block"}` on exit 0;
  the reason was injected as the next user message; the next agent message was
  `NOT VERIFIED ...`; the second `agentStop` (`stop_hook_active`) passed
  (`copilot-blocked.txt`, `copilot-hook-exit.txt`,
  `copilot-events.jsonl`, `copilot-evidence-chain.jsonl`).
- Exit 2: a project `agentStop` hook that printed the decision field and exited
  2 was logged as a failed hook and the turn ended without a continuation
  (`copilot-exit2.txt`).
- `.claude/settings.json`: read. The session events show the SessionStart hook
  and the Stop hook (mapped to `agentStop`); a hand-written Claude-schema Stop
  block (exit 0) was logged as `agentStop decision=block` and the turn
  continued (`copilot-claude-settings.txt`,
  `copilot-claude-settings-events.jsonl`). The jiahao bundle installs as a
  Copilot plugin, not through this file; a project-schema copy of its gate
  would not carry the plugin env marker.
- Cap: 8 consecutive block continuations, then the CLI ended. Observed 9
  `agentStop` invocations and 9 assistant messages (initial + 8
  continuations); the ninth block was not continued (`copilot-cap.txt`).
- Plugin env: `PLUGIN_ROOT`, `COPILOT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, and
  `COPILOT_PLUGIN_DATA` set; `detectHost()` selects `copilot`
  (`copilot-plugin-env.txt`).
- `sessionStart` and `sessionEnd` fired for plugin hooks in the final session
  (`copilot-lifecycle-hooks.txt`).

## Reproduction

The throwaway probe hooks and the instrumented wrapper are in `probes/`; each
file's header states the hook config and the expected observation. Every
session above ran with an isolated `CODEX_HOME` / `COPILOT_HOME` and a separate
`CLAUDE_CONFIG_DIR`, so no user-wide profile or plugin state was involved.

## Tier conclusion

Both hosts are **A tier** with a live turn-end block on the recorded version
and date. Qoder remains C tier (rules only); this probe did not change it.
