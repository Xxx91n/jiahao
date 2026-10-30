# GitHub Copilot CLI Adapter (self-contained plugin)

This directory is a **self-contained plugin for GitHub Copilot CLI**: the
manifest (`plugin.json`), the hook map (`hooks/hooks.json`), the hook scripts
and their `require()` closure, and `src/SKILL.md` (the rules body the
sessionStart hook injects) are vendored inside. Every hook command resolves
through `$PLUGIN_ROOT` - Copilot CLI hands plugin hooks `PLUGIN_ROOT` (and
also `COPILOT_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT`) pointing at the installed
plugin - so nothing reads from the repository root.

Tier: **A (verified 2026-10-30, Copilot CLI 1.0.105)**. A live turn was
blocked by `agentStop`: the false completion claim continued only after the
gate printed `{decision:"block"}` on exit 0. Exit 2, the documented warning
path, did not block. Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install

1. `copilot plugin install <path-to-this-dir>` (native command; the
   `/plugin install` slash command does the same inside a session). Live
   probe: the install ran the bundled hooks. The CLI warns that direct
   installs are deprecated in favour of marketplace installs.
2. The plugin is enabled on install (`copilot plugin list --json` reports
   `enabled: true`); a direct install needed no `enabledPlugins` entry.
   Project-level settings hooks need folder trust in prompt mode:
   `--trust-folder` (or `COPILOT_ALLOW_ALL=true`); the live probe used
   `--trust-folder`.
3. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.

Install and upgrade are the host's own plugin commands; the repository root is
never a plugin entry. The install path was live-probed with a local plugin
directory on 1.0.105.

## Hook behavior disclosure (read before enabling)

| Event | Script | Behavior |
| --- | --- | --- |
| sessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| subagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| userPromptSubmitted | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| agentStop | hooks/jiahao-verdict-gate.js | verifier gate: prints `{decision:"block", reason}` and exits 0; the zero exit is required for the decision to be honored (exit 2 is only a warning) |
| sessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay within the host's default 30s budget (10/10/10/30/10s).

## Dialect: what differs from the Claude-shaped hosts

Two config-side differences live in `scripts/hosts/copilot.js` and in this
config. The host's block channel needs no translation (the shared gate already
prints it), and the camelCase payload names (`sessionId`, `agentName`) are
folded into the shared shape by `hooks/jiahao-runtime.js`, the hook-side
adapter file that already owns `detectHost()` and the per-host envelopes. The
judgment logic is the same `hooks/jiahao-verdict-gate.js` every host runs.

- **Event names are camelCase** (`sessionStart`, `agentStop`), not
  `SessionStart` / `Stop`. A copied PascalCase map is a config this host
  ignores.
- **Each entry carries `bash` and `powershell` branches.** The host picks one
  by operating system; `$PLUGIN_ROOT` and `$env:PLUGIN_ROOT` expand to the
  installed plugin directory. There is no `command` key here.
- **The block channel is the decision field on a zero exit.** `agentStop` and
  `subagentStop` honor `{decision:"block", reason}` on stdout; this bundle
  wires `agentStop` only. The live probe showed exit 2 ends the turn without a
  continuation even when the decision field is on stdout, so the gate exits 0
  for this host. Any other non-zero code is fail-open.
- **The cap is 8 consecutive block continuations** (live-probed: 9
  `agentStop` invocations and 9 assistant messages; the ninth block was not
  continued and the CLI ended). `agentStop` receives `stop_hook_active`; the
  gate lets that pass, so a normal block continues once and then finishes.

## Live probe (2026-10-30, Copilot CLI 1.0.105, win32)

The probe used an isolated `COPILOT_HOME`, a real prompt-mode session
(`copilot -p ... --trust-folder`), and the installed bundle. Commands and
captured output live in
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

| Point | Result |
| --- | --- |
| A real turn-end block (`agentStop` + `decision:"block"`) | **Verified**: the model's `任务完成，已验证。` continued only after the gate's `decision:"block"`; the block reason arrived as the next user message |
| Exit 2 as the block channel | **Refuted**: exit 2 ended the turn without a continuation; the gate now exits 0 for Copilot |
| Native `copilot plugin install` reading `plugin.json` + `hooks/hooks.json` | **Verified**: the install ran the bundled sessionStart/agentStop hooks |
| `.claude/settings.json` | **Read**: both SessionStart and Stop entries ran; a Claude-schema Stop block also continued the turn |
| `COPILOT_PLUGIN_DATA` for plugin hooks | **Set**: observed in the plugin hook environment, so `detectHost()` selects the Copilot envelope |
| camelCase payload (`sessionId`) | **Observed** in the plugin hook input; normalized by `hooks/jiahao-runtime.js` |
| 8 consecutive block continuations | **Confirmed**: 8 continuations, then the CLI ended; the ninth block was not continued |
| `userPromptSubmitted` output reaches the model | Not probed here; the mode reminder is advisory and does not gate |
| `enabledPlugins` in `.github/copilot/settings.json` / `~/.copilot/settings.json` | Not needed for a direct install (enabled on install); marketplace install not probed |
| `sessionEnd` fires for plugin hooks | **Verified**: the final session's event log contains `sessionEnd` hook events |

## Write scope and network

- Hooks write only under the Claude config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`), the same flag and evidence files every host uses:
  `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus the
  `.jiahao-evidence.keys` sidecar and `pairer-instrument` shadow records),
  `.jiahao-pretool.jsonl`, and the sentinel state and lock files. Nothing
  inside the repository or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
