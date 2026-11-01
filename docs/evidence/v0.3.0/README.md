# v0.3.0 real-machine acceptance (#80, #109, #111, #108)

Date: 2026-10-30. Host: Windows 10.0.26100 (win32 x64). `node
scripts/build-adapters.js` was run locally to produce the committed bundles;
verification of `npm test`, `check:adapters`, and `check:drift` is owned by CI
and no local test run is used as evidence here.

Artifact version: at the time #80 recorded this, the installed bundles and
manifests still reported `0.2.0`, and #81 owned the `v0.3.0` bump. This directory
records the acceptance for the v0.3.0 content. **Reconciled afterwards, so nobody
has to infer it:** #81 landed and every committed manifest - `adapters/claude-code`,
`adapters/codebuddy`, `adapters/copilot`, `adapters/codex` and, since #109,
`adapters/qoder` - now reports `0.3.0`. The `0.2.0` above is a statement about the
probed artifact on 2026-10-30, not about the tree you can check out today. The ZCode artifacts (#108, 2026-10-31) ran on a tree already
reporting `0.3.0`; the next release ticket owns the next bump.

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

## Google Antigravity

- Host: `Google Antigravity 1.2.12` (win32 x64, isolated `CLAUDE_CONFIG_DIR`, commit `bf68d15f`, #111).
- Install (**verified**): `agy plugin install <repo-root>/adapters/antigravity`, exit 0;
  `agy plugin list` shows `jiahao` with `hooks: 1 processed` (`antigravity-install.txt`).
- Block run (**verified**): `agy -p ... --dangerously-skip-permissions`, exit 0. First agent message
  `任务完成，已验证。`; `Stop` returned `{decision:"block"}` on exit 0;
  the reason was injected as `<SYSTEM_MESSAGE>Stop hook blocked termination: ...</SYSTEM_MESSAGE>`;
  the next agent message quoted the reason verbatim; the second `Stop` (`executionNum: 1`,
  mapped to `stop_hook_active`) passed (`antigravity-blocked.txt`, `antigravity-hook-exit.txt`).
- Exit 2 (**verified**): a `Stop` hook that printed to stderr and exited 2 was logged as a failed hook
  (`command failed: exit status 2`) and the turn ended without continuation (`antigravity-exit2.txt`).
- Cap (**verified**, always-block probe, not the shipped gate): the unconditional `{decision:"block"}` probe (`probes/antigravity-always-block.js`) reached 10 forced continuations before the CLI terminated at `MAX_FORCED_INVOCATIONS` (`antigravity-cap.txt`).
- SessionStart (**verified**): injects Jiahao instructions via `injectSteps` (`antigravity-blocked.txt`).
- SessionEnd (**declared-unverified**): wired to `hooks/jiahao-sweep.js` per repository sentinel-reconciliation contract; live SessionEnd firing not probed.

## ZCode (#108)

- Host: ZCode Desktop 3.16.2 / CLI runtime 0.17.0 (win32), the operator's real
  desktop session; the probe config was workspace-scope, the user-wide config
  was untouched by the hook runs and restored after the plugin runs
  (`zcode-version.txt`, `zcode-probe-notes.md`).
- Stop channels: exit 0 + `{decision:"block"}` blocked a turn and returned the
  reason as the next turn's context (fire #1); exit 2 also blocked, with the
  host's generic message and no reason (fire #2). `stop_hook_active` was
  `true` on every post-block continuation (fires #2-#4). Cap: three
  consecutive block continuations, then the turn ended (fires #1-#4,
  `zcode-stop-fires.jsonl`).
- Real gate, real turn-end block: the bundled gate (argv `zcode`, verifier
  profile, isolated config dir, empty chain) returned exit 0 +
  `{decision:"block", reason: "Verification has no evidence: ..."}` with empty
  stderr; the host blocked the turn and the reason arrived as the next turn's
  context (fire #5). The continuation ran the verification ladder; the stop
  that ended it was a wrapper pass-through (`json-once` mode), so a live
  `stop_hook_active` pass by the real gate was not observed
  (`zcode-stop-fires.jsonl`, `realgate-result` entry, `zcode-probe-notes.md`).
- Payloads: both snake_case and camelCase spellings on every fire
  (`session_id`/`sessionId`, `hook_event_name`/`hookEventName`,
  `stop_hook_active`/`stopHookActive`, `transcript_path`/`transcriptPath`).
- Hook configuration is read at session start: a mid-session workspace config
  did not fire until a restart.
- Install path: `plugins validate` exit 0; direct `plugins install <dir>`
  refused (marketplace-only); the bundle's own shelf
  (`marketplace.json`, `source: "."`) installs and enables
  (`jiahao@jiahao-zcode`, `hooks: 4`; cached `hooks/hooks.json`,
  `.zcode-plugin/plugin.json`, and `hooks/jiahao-verdict-gate.js`
  byte-identical to the bundle - three-file diff in `zcode-install.txt`);
  the repository root as marketplace resolves the Claude Code bundle instead
  (`zcode-install.txt`).
- Post-merge live verification (2026-11-01, formal install from a clean
  release checkout of the merged main, operator session after a restart):
  **all four plugin-path surfaces observed live** - SessionStart injected the
  rules body, UserPromptSubmit injected the mode reminder, PreToolUse denied
  a tool call whose command text named the state/evidence files (bypass
  attempt recorded per the deny envelope), and Stop blocked a jargon-wrapped
  no-evidence completion claim with the Case A reason verbatim, passing on
  `stop_hook_active` after rung-1 verification. Honest gap: the host's
  hook-execution log location was not identified in this build, so the
  observations are the host-delivered hook contexts and decisions quoted in
  the session transcript (`zcode-probe-notes.md`).

## Reproduction

The throwaway probe hooks and the instrumented wrapper are in `probes/`; each
file's header states the hook config and the expected observation.

For Codex and Copilot, sessions ran with an isolated `CODEX_HOME` / `COPILOT_HOME`
and a separate `CLAUDE_CONFIG_DIR`, so no user-wide host profile or plugin state
was involved.

For Google Antigravity, plugin installation was registered in the user-wide
plugin registry (`~/.gemini/config/plugins/jiahao`) and cleanly uninstalled
with `agy plugin uninstall jiahao` after probing; Jiahao's own runtime state
(`.jiahao-active`, `.jiahao-profile`, and `.jiahao-evidence/`) was isolated under
`CLAUDE_CONFIG_DIR=<temp>/jiahao-111`.

For Qoder (#109) the run was **not isolated**, and could not be: a Desktop session
is spawned by the app, so there is no `*_HOME` override to point it at. The probe
armed a project-scope `.qoder/settings.json` in the operator's live checkout,
gated every block on a marker string so no other session could be affected, and
bounded the loop with its own per-session cap. Both hook config files and the
probe's temp state were deleted afterwards; `qoder-hook-probe-2026-10-31.md`
records the isolation state per run.

The WorkBuddy probes are also exceptions: that host refuses a headless turn
without an interactive login, so both ran in the operator's live desktop session
with a project-scope settings file - `workbuddy-hook-probe-2026-10-31.md` for the
international 5.9.4 build (#110) and `workbuddy-cn-hook-probe-2026-11-01.md` for
the domestic 5.9.3 build (#118). Each record states what it touched and how the
workspace was restored; neither claims the isolation the sessions above had. The
domestic run also states that the workspace it used is shared with other
in-flight branches, so its `git status` line is a statement about the cleanup
moment rather than a lasting property.

## Tier conclusion

Labels follow `docs/agents/evidence-review.md` item 3: **verified** means a run in
this directory shows it, **declared-unverified** means it is asserted from files or
documentation and was not watched happen.

**Verified - A tier**: Codex CLI 0.163.0 and GitHub Copilot CLI 1.0.105
(2026-10-30, #80), Google Antigravity 1.2.12 (2026-10-31, #111), Qoder CN
Desktop 0.4.11 (2026-10-31, #109), ZCode 3.16.2 (2026-10-31, #108), WorkBuddy AI 5.9.4
international (2026-10-31, #110), and WorkBuddy 5.9.3 domestic (2026-11-01, #118)
each blocked a real turn end on the recorded version and date. On WorkBuddy the
block was a settings-tier `Stop` hook answering
`{decision:"block"}` on exit 0, and `SubagentStop` was watched answering the same
decision without a continuation. The two WorkBuddy variants were probed on their
own runs; the domestic row is not inferred from the shared agent CLI, and both
runs used the probe hook where the shipped gate would sit. On Qoder it was a config-registered `Stop` hook on both channels
(exit 0 + flat `{"decision":"block"}`, and exit 2 + stderr), with
`stop_hook_active` set on every re-entry - which supersedes this file's earlier
line that Qoder remained C tier and that no probe had changed it.

**Declared-unverified - Qoder**: the plugin registration path
(`adapters/qoder/` installed as a Desktop plugin), `${QODER_PLUGIN_ROOT}` in a
shell-form command, and the shipped gate's own verdict logic running under Qoder.
All read out of the host's files; none watched happening.

**Declared-unverified - ZCode**: `zcode plugins update` only. The two items
this entry used to list - plugin-path hooks firing in a restarted session and
the SessionStart `additionalContext` injection - were verified post-merge on
2026-11-01 in the operator's restarted session (ZCode section above and
`zcode-probe-notes.md`).

**Not probed**: the international Qoder Desktop 0.4.11, which keeps C tier rather
than borrowing the CN result; and Qoder IDE/CLI, which keeps the rules-only exit.
