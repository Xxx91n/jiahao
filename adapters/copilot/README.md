# GitHub Copilot CLI plugin

## What this is

This folder is a complete plugin for GitHub Copilot CLI. It holds `plugin.json`,
`hooks/hooks.json`, every file the hooks load, and `src/SKILL.md` (the rules
text the sessionStart hook injects). Every hook command uses `$PLUGIN_ROOT`,
which Copilot CLI sets for plugin hooks (it also sets `COPILOT_PLUGIN_ROOT`
and `CLAUDE_PLUGIN_ROOT`). Nothing reads from the repository root.

## Install

1. `copilot plugin install <path-to-this-dir>` (native command; `/plugin
   install` inside a session does the same). The install ran the bundled
   hooks in a real test. The CLI warns that direct installs are deprecated in
   favor of marketplace installs.
2. The plugin is on after install (`copilot plugin list --json` reports
   `enabled: true`); a direct install needed no `enabledPlugins` entry.
   Project-level settings hooks need folder trust in prompt mode:
   `--trust-folder` (or `COPILOT_ALLOW_ALL=true`). The test used
   `--trust-folder`.

## Set the profile

The hooks get the profile from one file, `.jiahao-profile`, in the config
directory. Write `verifier` to block a completion claim when the turn has no
evidence. One limit: an older record with no session id counts for every
session, so it can let an unsupported claim through. Write `generator` to only
remind. If the file is missing, the hooks use `verifier`.

The config directory is the first one of these that the process has:
`CLAUDE_CONFIG_DIR`, then `HOME`, then a root the host reports
(`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`, `WORKBUDDY_CONFIG_DIR`), then
the OS home. It never falls back to `/tmp` on its own; if you point one of
those variables at `/tmp`, that is where the files go.

POSIX shell:

```bash
CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-${QODER_CONFIG_DIR:-${CODEBUDDY_CONFIG_DIR:-${WORKBUDDY_CONFIG_DIR:-${USERPROFILE:-$(node -p 'require("os").homedir()')}}}}}}"; mkdir -p "$CONFIG"
echo full > "$CONFIG/.jiahao-active"
echo verifier > "$CONFIG/.jiahao-profile"
```

PowerShell:

```powershell
$c = @($env:CLAUDE_CONFIG_DIR, $env:HOME, $env:QODER_CONFIG_DIR, $env:CODEBUDDY_CONFIG_DIR, $env:WORKBUDDY_CONFIG_DIR, $env:USERPROFILE, $HOME) | Where-Object { $_ } | Select-Object -First 1; New-Item -ItemType Directory -Force -Path $c | Out-Null
Set-Content -NoNewline -Path "$c/.jiahao-active" -Value full
Set-Content -NoNewline -Path "$c/.jiahao-profile" -Value verifier
```

Use `generator` in place of `verifier` for reminders only. Start a new session
after you change the file. All agents that use the same config directory share
this file; give each one its own directory when they need different profiles.

If `.jiahao-profile` cannot be read (a folder sits there, or the permissions
are wrong), the hooks use `verifier` and print a `[config]:` note on stderr.


## Check it works

- `copilot plugin list --json` reports `enabled: true`.
- With `verifier`, a claim of "done, verified" with nothing behind it gets
  blocked. Tested on Copilot CLI 1.0.105 on 2026-10-30.

## Hooks

| Event | Script | What it does |
| --- | --- | --- |
| sessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| subagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| userPromptSubmitted | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| agentStop | hooks/jiahao-verdict-gate.js | prints `{"decision":"block","reason":"..."}` and exits 0; the zero exit is required for the host to honor it |
| sessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 10/10/10/30/10s, inside the host's 30s limit.

## What is different on this host

- Event names are camelCase (`sessionStart`, `agentStop`), not
  `SessionStart`/`Stop`. A copied PascalCase list is ignored.
- Each entry has a `bash` branch and a `powershell` branch. The host picks
  one by OS; `$PLUGIN_ROOT` and `$env:PLUGIN_ROOT` expand to the installed
  folder. There is no `command` key.
- The block channel is the decision field on a zero exit. `agentStop` honors
  `{"decision":"block","reason":"..."}` on stdout. This folder wires
  `agentStop` only.
- Exit 2 is logged as a failed hook and ends the turn without a
  continuation, even when the decision field is on stdout. That is why the
  gate exits 0 for this host. Any other non-zero code does not block.
- The host allows 8 block continuations in a row. The test saw 9 `agentStop`
  calls and 9 assistant messages; the ninth block did not continue. The gate
  lets `stop_hook_active` pass, so a normal turn blocks once and then ends.

## What was tested

Tested on 2026-10-30 with Copilot CLI 1.0.105 on win32, in a real prompt-mode
session (`copilot -p ... --trust-folder`) with an isolated `COPILOT_HOME` and
the installed folder. Commands and output: `docs/evidence/v0.3.0/`.

- A real turn-end block (`agentStop` + decision on exit 0): the claim
  `任务完成，已验证。` continued only after the block; the reason arrived as
  the next user message.
- `copilot plugin install` read `plugin.json` and `hooks/hooks.json` and ran
  the bundled sessionStart and agentStop hooks.
- `.claude/settings.json` was read too: SessionStart and Stop entries ran; a
  hand-written Claude-schema Stop block (exit 0) also continued the turn. The
  jiahao plugin installs as a Copilot plugin, not through this file.
- `COPILOT_PLUGIN_DATA` was set for plugin hooks, so `detectHost()` picks the
  Copilot shape.
- camelCase input (`sessionId`) was seen in the plugin hook input and
  normalized by `hooks/jiahao-runtime.js`.
- 8 block continuations were honored, then the CLI ended; the ninth block
  did not continue.
- `sessionEnd` fires for plugin hooks: the last session's event log has
  `sessionEnd` entries.
- Exit 2 as the block channel: tested and it does not block. It ended the
  turn without a continuation, so the gate exits 0 for Copilot.

Not tested yet:

- `userPromptSubmitted` output reaching the model. The mode reminder is
  advisory and does not gate.
- `enabledPlugins` in `.github/copilot/settings.json` or
  `~/.copilot/settings.json`: not needed for a direct install (the plugin is
  on after install); marketplace install was not tested.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), and the
state and lock files used for cleanup. No hook writes inside the repository
or this plugin folder.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


## Update

Use the host's own plugin commands. The repository root is not a plugin entry.
