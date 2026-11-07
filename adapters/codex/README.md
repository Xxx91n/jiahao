# Codex CLI plugin

## What this is

This folder is a complete Codex CLI plugin. It holds
`.codex-plugin/plugin.json`, `hooks/hooks.json`, every file the hooks load,
`src/SKILL.md`, and the identity file the gate reads. It has no third-party
runtime dependency. Every hook command uses `${PLUGIN_ROOT}`, so nothing
reads from the repository root.

## Install

The repository root is also a Codex marketplace:
`.agents/plugins/marketplace.json` points at `./adapters/codex`.

1. `codex plugin marketplace add Xxx91n/jiahao`
2. `codex plugin add jiahao --marketplace jiahao`
3. Trust the plugin's hook commands once, through `/hooks`. Codex skips an
   untrusted hook without a message. In the test, an untrusted plugin's hooks
   did not run in `codex exec`. For unattended automation, either keep that
   trust (the `/hooks` flow; checked in the host's source, not step by step) or pass
   `--dangerously-bypass-hook-trust` after checking the source.

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


Codex 0.163.0 has hooks on by default: `codex features list` reports
`hooks stable true`, and a fresh `CODEX_HOME` with no `config.toml` ran the
plugin's hooks. This recipe needs no `[features] hooks` switch. The trust
step is separate and required. If an older build refuses the hooks, look for
that switch in `$CODEX_HOME/config.toml`; do not copy a flag block from here.

## Check it works

- `codex plugin add` exits 0, and the plugin's hooks run after you trust
  them in `/hooks`.
- With `verifier`, a false "done" claim gets blocked. Tested on
  codex-cli 0.163.0 on 2026-10-30.

## Hooks

`hooks/hooks.json` is the whole template. Each entry names the script and
passes the platform name `codex`; the script uses that name to pick the
host's JSON shape.

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| SubagentStart | hooks/jiahao-subagent.js | injects the profile text when a subagent starts |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + `{"decision":"block"}` on stdout, and the same reason on stderr for host logs; blocks an empty evidence log (verifier profile) |
| SubagentStop | hooks/jiahao-verdict-gate.js | the same check when a subagent finishes (wired for parity; not separately tested) |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files |

Timeouts: 5/5/5/10/10/3s (Codex caps `SessionEnd` at 3s).

## What was tested

Tested on 2026-10-30 with codex-cli 0.163.0 on win32. A real prompt-mode
session continued a false claim only after `Stop` answered
`{"decision":"block"}` on exit 0. The documented exit-2 + stderr path ended
the turn without a continuation on this build. Evidence:
`docs/evidence/v0.3.0/`.

- `codex plugin marketplace add <local path>` and
  `codex plugin add jiahao --marketplace jiahao` installed the folder.
- Without stored trust, hooks were skipped in `codex exec` and the false
  claim passed. With `--dangerously-bypass-hook-trust`, the Stop gate
  answered the block and the next model turn quoted the reason.
- The hook's exit code, stdout, and stderr were recorded by a wrapper, not
  read from the host log: `docs/evidence/v0.3.0/probes/codex-hook-wrapper.js`.
  It runs the installed gate, appends one JSON line per call, then replays
  the output and exits with the same code. Reuse it on a new build. The
  evidence layout is in `docs/agents/evidence-review.md`.
- A loop guard: an unconditional exit-0 block in a throwaway user Stop hook
  continued for 785 runs (786 assistant messages, 33M input tokens) before
  the host ended the turn. No small cap like Copilot's 8 appeared. The
  bundled gate is not unconditional: it passes when the host sends
  `stop_hook_active` on the continuation, so it blocks once per turn.
- Offline checks in `test/plugin-bundles.test.js` and
  `test/codex-adapter.test.js`: the manifest parses, the version and license
  come from `package.json`, the marketplace `source.path` points at this
  folder, every referenced file is generated, every hook command stays
  inside `${PLUGIN_ROOT}`, and no relative `require()` points outside the
  folder.

Tested and did not work:

- Exit 2 as the block channel: on 0.163.0 it ended the turn without a
  continuation, so it does not block.

Not tested yet:

- The interactive `/hooks` trust-and-restart flow, step by step.
- `SubagentStop` on its own (wired for parity; `Stop` was tested).

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), and the
state and lock files used for cleanup. Normally no hook writes inside the
repository or this plugin folder; if you point the config directory at one of
them, the files land there.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


## Update and uninstall

Use the host's own plugin commands. The repository root is not a plugin entry.
