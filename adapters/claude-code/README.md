# Claude Code plugin

## What this is

This folder is a complete plugin. It holds the plugin manifest
(`.claude-plugin/plugin.json`), the hook list (`hooks/hooks.json`), every file
the hooks load, `src/SKILL.md`, and the identity file the gate reads. Nothing
it needs lives outside this folder.

The MCP server (`jiahao-mcp/` at the repository root) is not part of this
plugin. It stays in the repository, but it does not install with this plugin.

## Install

The repository root is the marketplace: `.claude-plugin/marketplace.json`
points at `./adapters/claude-code`.

1. `claude plugin marketplace add Xxx91n/jiahao`
2. `claude plugin install jiahao@jiahao`
3. Turn the plugin on. `defaultEnabled: false` asks the host to leave it off
   after install. If your host ignores that field, it turns the plugin on
   anyway; turning it on is the approval step.
4. When the plugin is on, the bundled SessionStart hook writes
   `.jiahao-active`, and the default profile is `verifier`. The Stop hook is
   then armed from the first turn. This comes from the hook code, not from a
   real session test. `/jiahao off` deletes the flag and disarms the Stop
   hook, the reminder, and the tool guard. The SubagentStart injection does
   not use the flag.

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

- `claude plugin list` shows `jiahao` as installed and enabled.
- After one real session, `.jiahao-active` exists in the config directory.
- With the `verifier` profile, start a session and claim a task is done
  without running anything. The Stop hook should stop the turn.

## Hooks

`hooks/hooks.json` sits at the plugin root, so the host finds it as soon as
the plugin is on.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn (exit 2) when there is no proof; the reason goes to stdout |
| SubagentStop | hooks/jiahao-verdict-gate.js | the same check when a subagent finishes |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, `jiahao-*` hook files, any `.mcp.json`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/5/10/10/5/5s, inside the host's 60s per-hook limit.
`InstructionsLoaded` is not supported in this plugin: that check hashes
`rules/jiahao-*.md`, and a Claude Code plugin has no plugin-level `rules/`
folder for the host to load.

## What was tested

**Tested:**

- `claude plugin marketplace add`, `claude plugin install`,
  `claude plugin enable`, and `claude plugin list` all exited 0 on Claude
  Code 2.1.251 (`docs/release-notes-v0.2.0.md`).
- The SessionStart hook ran in a real session: `.jiahao-active` appeared
  (`docs/release-notes-v0.2.0.md`).
- The bundled Stop hook, run from a temporary copy of the generated files,
  exits 2 and blocks when the evidence log is empty.
- Offline checks in `test/plugin-bundles.test.js` and
  `test/claude-code-plugin.test.js`: the manifest parses, the version and
  license come from `package.json`, the marketplace `source` points at this
  folder, every referenced file is generated, every hook command stays inside
  `${CLAUDE_PLUGIN_ROOT}`, and no relative `require()` points outside the
  plugin.

**Not tested yet:**

- The rules text from SessionStart reaching the model.
- A Stop block fired by the host at a real turn end. The 2026-02 model
  endpoint returned 401 before a full loop ran, and the empty-evidence block
  came from running the installed gate copy by itself, not from a host event.
  Owner actions: #64.

This plugin follows the host's documented contract. It does not claim a live
run.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), `.jiahao-pretool.jsonl`, and the
state and lock files used for cleanup. Normally no hook writes inside the
repository or this plugin folder; if you point the config directory at one of
them, the files land there.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


## Update and uninstall

Use the host's own plugin commands. The repository root is not a plugin entry.
