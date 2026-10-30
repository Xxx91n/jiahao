# v0.3.0 real-machine acceptance (#80)

Date: 2026-10-30. Host: Windows 10.0.26100 (win32 x64). Checks
(`npm test`, `check:adapters`, `check:drift`) are owned by CI; no local build
or test run is used as evidence here.

## Codex CLI

- Host: `codex-cli 0.163.0` (ChatGPT auth, isolated `CODEX_HOME`).
- Install: `codex plugin marketplace add <repo-root>` then
  `codex plugin add jiahao --marketplace jiahao`, both exit 0
  (`codex-install.txt`).
- Hooks default: `codex features list` -> `hooks stable true`; a fresh
  `CODEX_HOME` with no `config.toml` ran the hooks. No explicit
  `[features] hooks` needed.
- Untrusted run: plain `codex exec` exit 0; the false completion passed and no
  jiahao hook ran (`codex-untrusted.jsonl`). The interactive `/hooks`
  trust-and-restart flow itself was not step-by-step probed; the bypass path
  and the source's trust gate were.
- Trusted run: `--dangerously-bypass-hook-trust`, exit 0. First agent message
  `任务完成，已验证。`; Stop returned `{decision:"block"}` and the next agent
  message quoted the reason (`codex-blocked.jsonl`,
  `codex-evidence-chain.jsonl`).
- Stop semantics: block via exit 0 + stdout decision. Exit 2 + stderr ended the
  turn without a continuation in this build (`codex-probe-notes.md`).
- Loop guard: an unconditional exit-0 block continued 80+ turns with no host
  cap observed; the gate's `stop_hook_active` pass is required.

## GitHub Copilot CLI

- Host: `GitHub Copilot CLI 1.0.105` (gh token auth, isolated `COPILOT_HOME`).
- Install: `copilot plugin install <repo-root>/adapters/copilot`, exit 0;
  `copilot plugin list --json` shows `enabled: true` (`copilot-install.txt`).
- Block run: `copilot -p ... --trust-folder`, exit 0. First agent message
  `任务完成，已验证。`; `agentStop` returned `{decision:"block"}` on exit 0;
  the reason was injected as the next user message; the next agent message was
  `NOT VERIFIED ...`; the second `agentStop` (`stop_hook_active`) passed
  (`copilot-blocked.txt`, `copilot-events.jsonl`,
  `copilot-evidence-chain.jsonl`).
- `.claude/settings.json`: read. SessionStart and Stop entries ran; a
  Claude-schema Stop block also continued the turn
  (`copilot-claude-settings.txt`).
- Cap: 8 consecutive block continuations, then the CLI ended. Observed 9
  `agentStop` invocations and 9 assistant messages (initial + 8
  continuations); the ninth block was not continued (`copilot-cap.txt`).
- Plugin env: `PLUGIN_ROOT`, `COPILOT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, and
  `COPILOT_PLUGIN_DATA` set; `detectHost()` selects `copilot`
  (`copilot-plugin-env.txt`).
- `sessionEnd` fired for plugin hooks in the final session.

## Tier conclusion

Both hosts are **A tier** with a live turn-end block on the recorded version
and date. Qoder remains C tier (rules only); this probe did not change it.
