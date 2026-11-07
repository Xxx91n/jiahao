# CodeBuddy plugin

## What this is

This folder is a complete plugin. CodeBuddy reads `.claude-plugin/` and
`${CLAUDE_PLUGIN_ROOT}` as they are; `${CODEBUDDY_PLUGIN_ROOT}` wins when it
is set. Copy the whole folder as the plugin root. The hook scripts, the files
they load, `src/SKILL.md`, and the `jiahao-mcp` server are all inside.

## Install

1. `codebuddy plugin install <path-to-this-dir>` (CLI), or use the IDE plugin
   manager.
2. Turn the plugin on. `defaultEnabled: false` is on purpose: plugin hooks
   skip the `allowUntrustedFrontmatterHooks` check and run as soon as the
   plugin is on.
3. Install the MCP server once: run `npm install --omit=dev` inside the
   folder's `jiahao-mcp/`. The server source is inside the folder; its
   packages are not. The folder's `.mcp.json` starts it at
   `${CLAUDE_PLUGIN_ROOT}/jiahao-mcp/index.js`.

Another way, through the CLI settings file: merge the hook list into
`.codebuddy/settings.json` and copy the rules into `.codebuddy/rules/`.
SessionStart, PreToolUse, and PostToolUse were watched on the settings path.
The turn end was not watched on this host; see "What was tested" below.

## Set the profile

The hooks get the profile from one file, `.jiahao-profile`, in the config
directory. Write `verifier` to block a completion claim when the turn has no
evidence. Limits: a record from an earlier turn in the same session also
counts; if the data the host sends when the turn stops has no session id,
records from other sessions count too; and a record with no session id counts
for every session. So an unsupported claim can pass. Write `generator` to only
remind. If the file is missing, the hooks use `verifier`.

The config directory is the first one of these that the process has:
`CLAUDE_CONFIG_DIR`, then the `HOME` environment variable, then a root the
host reports (`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`,
`WORKBUDDY_CONFIG_DIR`), then `USERPROFILE`, then the OS home. It never falls
back to `/tmp` on its own; if the selected variable points to `/tmp`, that is
where the files go.

Write the file from the environment the hooks run in. If the host starts from
a different shell, set `CLAUDE_CONFIG_DIR` for both.

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

- The plugin shows as enabled in CodeBuddy's plugin manager.
- The `.mcp.json` server connects and lists its tools.
- The hooks in `.codebuddy/settings.json` run at session start and around
  tool calls.
- A turn-end block has not been tested on this host.

## Hooks

Plugin hooks in `hooks/hooks.json` skip the trust check that skill and agent
frontmatter go through: they run when the plugin is on. This plugin wires
seven events.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks (exit 2 + `{"decision":"block"}`) when there is no proof |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |
| InstructionsLoaded | hooks/jiahao-instructions-assert.js | records that both rule files are present, with their sha256, in the log |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, `jiahao-*` hook files, any `.mcp.json`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/5/10/3/5/5s, inside the host's 60s per-hook limit. Commands are
`node` calls that work in Git Bash; cmd and PowerShell are not supported by
this host. Event names are case-sensitive.

## Two rule files load together

The folder ships `rules/jiahao-verifier.md` and `rules/jiahao-generator.md`,
both with `alwaysApply: true`. The hook injects the profile named in
`.jiahao-profile`, but if the host loads both rule files, both sets of
instructions are active. Which file wins at the rule level is not tested.

## What was tested

Tested on CodeBuddy Code CLI 2.151.0 in a real session:

- `.codebuddy/settings.json` hooks at SessionStart, PreToolUse, and
  PostToolUse ran; the `hook_event_name` + `hookSpecificOutput` JSON shape
  was seen.
- The PreToolUse `permissionDecision: "deny"` reply was seen.
- `.mcp.json` registration worked: the server connected over stdio and
  listed its tools.

Not tested yet:

- IDE-side hooks, including whether `InstructionsLoaded` fires.
- Which of the two `alwaysApply` rule files wins, in either form.
- An `npx` install next to a `codebuddy plugin install`.
- The plugin path on the CLI. The docs say it is compatible; no run was
  watched.
- A turn-end block on this host. The live checks above cover session start
  and tool calls, not the turn end.

Windows note: the upstream `${CLAUDE_PLUGIN_ROOT}` expansion bug may also
appear here. The settings path above is the one with evidence.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), `.jiahao-pretool.jsonl`, and the
state and lock files used for cleanup. Normally no hook writes inside the
repository or this plugin folder; if you point the config directory at one of
them, the files land there.

No hook calls the network. The hooks have no third-party runtime dependency.
The MCP server has two: `@modelcontextprotocol/sdk` and `zod`; step 3 installs
them.


This host also writes `.jiahao-instructions.jsonl`: the log from the
InstructionsLoaded hook. It contains session IDs.

## Before trusting it as a product

The outside effectiveness trial (install + Phase 0/1/2 in a real CodeBuddy
environment) is an owner action, not something an agent runs. Protocol:
`.scratch/grill-t30/protocol.md`; judgment lines:
`bench/codebuddy-trial/judgment-lines.json` (fixed in advance; changes go in
errata records).
