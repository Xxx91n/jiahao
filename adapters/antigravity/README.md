# Google Antigravity plugin

## What this is

This folder is a complete Google Antigravity plugin. It holds `plugin.json`,
`hooks.json`, every file the hooks load, `src/SKILL.md`, and the identity file
the gate reads. Nothing reads from the repository root and it has no
third-party runtime dependency.

## Install

1. `agy plugin install <path-to-adapters/antigravity>`
2. `agy plugin list` shows `jiahao` imported and enabled.

## Set the profile

The hooks get the profile from one file, `.jiahao-profile`, in the config
directory. Write `verifier` to block a completion claim when the turn has no
evidence. Two limits: a record from an earlier turn in the same session also
counts, and a record with no session id counts for every session, so an
unsupported claim can pass. Write `generator` to only remind. If the file is
missing, the hooks use `verifier`.

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

- `agy plugin list` shows `jiahao`.
- With `verifier`, a false "done" claim gets blocked. Tested on Antigravity
  1.2.12 on 2026-10-31.

## Hooks

`hooks.json` is the whole template. Each entry names the script and passes
the platform name `antigravity`; the script uses that name to pick the JSON
shape.

| Event | Script | What it does | Watched? |
| --- | --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text as a system message | yes, 1.2.12 |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + `{"decision":"block"}`; blocks an empty evidence log (verifier profile) | yes, 1.2.12 |
| SessionEnd | hooks/jiahao-sweep.js | cleans up leftover state files | no |

Timeouts: 5/10/5s.

## What was tested

Tested on 2026-10-31 with Antigravity 1.2.12 on win32 x64. A real prompt-mode
session continued a false claim only after `Stop` answered
`{"decision":"block"}` on exit 0. The documented exit-2 path ended the turn
without a continuation. Evidence: `docs/evidence/v0.3.0/`.

- `agy plugin install` installed the folder. With
  `--dangerously-skip-permissions -p '...' --model ...`, the Stop hook
  answered the block on exit 0 and the host continued with
  `<SYSTEM_MESSAGE>Stop hook blocked termination: ...</SYSTEM_MESSAGE>`. The
  agent quoted the reason on the next turn.
- The hook's exit code, stdout, and stderr were recorded by a wrapper:
  `docs/evidence/v0.3.0/probes/antigravity-hook-wrapper.js`. It runs the
  installed gate, appends one JSON line per call, then replays the output and
  exits with the same code. Reuse it on a new build. The evidence layout is
  in `docs/agents/evidence-review.md`.
- Loop guard: an unconditional exit-0 block continued for 10 forced calls
  (executionNum 0 through 9 blocked) before the host stopped at its limit
  (`MAX_FORCED_INVOCATIONS`).
- Offline checks in `test/plugin-bundles.test.js` and
  `test/antigravity-adapter.test.js`: the manifest parses, the version and
  license come from `package.json`, every referenced file is generated,
  every hook command runs inside the plugin root, and no relative `require()`
  points outside the folder.

Tested and did not work:

- Exit 2 on this build: the host documents it as an error; in the 1.2.12 test
  it ended the turn without a continuation, so it is not a block channel.

Not tested yet:

- `SessionEnd` firing. It is wired for cleanup; its live firing was not
  watched.

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

- Upgrade: re-run `agy plugin install <path-to-adapters/antigravity>`.
- Uninstall: `agy plugin uninstall jiahao`.
