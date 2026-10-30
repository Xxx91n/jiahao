# GitHub Copilot CLI Adapter (self-contained plugin)

This directory is a **self-contained plugin for GitHub Copilot CLI**: the
manifest (`plugin.json`), the hook map (`hooks/hooks.json`), the hook scripts
and their `require()` closure, and `src/SKILL.md` (the rules body the
sessionStart hook injects) are vendored inside. Every hook command resolves
through `$PLUGIN_ROOT` - Copilot CLI hands plugin hooks `PLUGIN_ROOT` (and
also `COPILOT_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT`) pointing at the installed
plugin - so nothing reads from the repository root.

Tier: **A-tier candidate**. The host documents an `agentStop` block; no live
turn has been watched being blocked yet (#80 owns that probe), so this README
does not claim "it blocks".

## Install

1. `copilot plugin install <path-to-this-dir>` (native command; the
   `/plugin install` slash command does the same inside a session). This is
   the documented path, not yet probed - see the table below.
2. Enable the plugin for the repository (`enabledPlugins` in
   `.github/copilot/settings.json`) or for yourself
   (`~/.copilot/settings.json`). The field name and path are documented,
   not probed - see the table below.
3. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.

Install and upgrade are the host's own plugin commands; the repository root is
never a plugin entry. The install path is documented, not live-probed.

## Hook behavior disclosure (read before enabling)

| Event | Script | Behavior |
| --- | --- | --- |
| sessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| subagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| userPromptSubmitted | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| agentStop | hooks/jiahao-verdict-gate.js | verifier gate: prints `{decision:"block", reason}`; the docs name that decision field as the block channel |
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
- **The block channel is the decision field, not the exit code** (as the host
  documents it): `agentStop` and `subagentStop` honor
  `{decision:"block", reason}` on stdout; this bundle wires `agentStop` only.
  Exit 2 is only a warning outside `preToolUse` / `permissionRequest`, and any
  other non-zero code is fail-open. The gate prints that decision field.
- **The docs state a cap of 8 consecutive block continuations**, after which the
  CLI ends the turn anyway. `agentStop` receives `stop_hook_active`, and the
  gate already lets that pass.

## Injection surface - Verified vs Declared-unverified

### Documented contract (read 2026-10-30; not live-probed)

| Point | Evidence |
| --- | --- |
| Event names, `bash`/`powershell` entry fields | docs.github.com hooks reference and Copilot CLI hooks guide |
| `decision:"block"` honored on `agentStop` / `subagentStop`; 8-block cap | hooks reference |
| `additionalContext` honored on `sessionStart` / `subagentStart` | hooks reference |
| Plugin hooks receive `PLUGIN_ROOT` | copilot-cli changelog (plugin hook env vars) |

### Declared-unverified (pending-confirmation, #80)

| Point | Status |
| --- | --- |
| A real turn-end block (`agentStop` + `decision:"block"`) | pending-confirmation |
| Native `copilot plugin install` reading `plugin.json` + `hooks/hooks.json` | pending-confirmation |
| Whether `userPromptSubmitted` output reaches the model (docs list no injection field for it) | pending-confirmation |
| `COPILOT_PLUGIN_DATA` marks a session as Copilot for the shared envelope branch (`hooks/jiahao-runtime.js`) | pending-confirmation |
| camelCase payload fields (`sessionId`, `agentName`) are what the shared hooks normalize | pending-confirmation |
| `enabledPlugins` in `.github/copilot/settings.json` / `~/.copilot/settings.json` enables the plugin | pending-confirmation |
| `sessionEnd` fires for plugin hooks | pending-confirmation |

## Write scope and network

- Hooks write only under the Claude config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`), the same flag and evidence files every host uses:
  `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus the
  `.jiahao-evidence.keys` sidecar and `pairer-instrument` shadow records),
  `.jiahao-pretool.jsonl`, and the sentinel state and lock files. Nothing
  inside the repository or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.
