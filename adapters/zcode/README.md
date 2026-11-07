# ZCode plugin

## What this is

This folder is a complete ZCode plugin. It holds `.zcode-plugin/plugin.json`,
`hooks/hooks.json`, every file the hooks load, `src/SKILL.md`, and the
identity file the gate reads. It has no third-party runtime dependency. Every
hook command uses `${ZCODE_PLUGIN_ROOT}`, so nothing reads from the repository
root.

## Install

The folder carries its own marketplace shelf (`marketplace.json`, with
`source: "."` pointing at itself), because ZCode's install command only
resolves `plugin@marketplace` names. A direct folder install is refused
("Plugin not found in any marketplace", CLI 0.17.0, tested 2026-10-31).

1. `zcode plugins marketplace add <path-to-this-dir>` - the shelf inside the
   folder is the marketplace; exit 0 reports `Added marketplace
   jiahao-zcode (1 plugins)`.
2. `zcode plugins install jiahao@jiahao-zcode` - installs and turns it on in
   one step; `zcode plugins list` reports `hooks: 4` (the host parses
   `hooks/hooks.json` itself; the manifest has no hooks pointer). The cached
   hook list, manifest, and gate script are byte-identical to this folder
   (checked 2026-10-31).
3. `zcode plugins validate <path-to-this-dir>` is the host's own manifest
   check; it accepts this folder (exit 0).
4. Do NOT point `marketplace add` at the repository root: the host then
   resolves `.claude-plugin/marketplace.json` and installs the **Claude
   Code** folder instead (tested 2026-10-31 - and its parser silently drops
   unsupported events of a Claude-shaped list, 7 events down to `hooks: 4`).
5. Start a new session. Hook configuration - plugin or config file - is read
   at session start; a list added mid-session did not fire until a restart
   (tested 2026-10-31).

## Set the profile

The hooks get the profile from one file, `.jiahao-profile`, in the config
directory. Write `verifier` to block a turn when the agent claims it is done
without proof. Write `generator` to only remind. If the file is missing, the
hooks use `verifier`.

The config directory is the first one of these that the process has:
`CLAUDE_CONFIG_DIR`, then `HOME`, then a root the host reports
(`QODER_CONFIG_DIR`, `CODEBUDDY_CONFIG_DIR`, `WORKBUDDY_CONFIG_DIR`), then
the OS home. It is never `/tmp`.

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

- `zcode plugins list` reports `hooks: 4`.
- With `verifier`, a false "done" claim gets blocked. Tested on ZCode 3.16.2
  on 2026-10-31, and again on 2026-11-01 through the plugin path.

## Hooks

| Event | Script | What it does |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the selected profile text |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands and a short reminder |
| Stop | hooks/jiahao-verdict-gate.js | blocks the turn with exit 0 + `{"decision":"block"}`; blocks an empty evidence log (verifier profile) |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook list, the manifest, `jiahao-*` hook files, any `.mcp.json`, or jiahao state/evidence files; each hit is logged as a bypass attempt |

Timeouts: 5/5/10/5s, inside the host's 60s limit. The platform name `zcode`
is passed as the script's first argument; that picks this host's JSON shape
and exit codes.

ZCode has exactly seven events (`SessionStart`, `UserPromptSubmit`,
`PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`,
`Stop`). `SubagentStart`, `SubagentStop`, and `SessionEnd` do not exist, so
this folder wires no cleanup hook; that cleanup does not run on this host.

## What is different on this host

- `${ZCODE_PLUGIN_ROOT}` is the plugin-root variable. ZCode also expands
  `${CLAUDE_PLUGIN_ROOT}` for plugin hooks; this template uses the native
  name so nothing depends on the compatibility name.
- Input data carries both spellings: `session_id`/`sessionId`,
  `hook_event_name`/`hookEventName`, and `stop_hook_active`/`stopHookActive`
  were all present in real runs. The shared normalizer folds them into the
  Claude shape.
- The block channel is the decision field on a zero exit. A live turn
  continued only after Stop answered `{"decision":"block"}` on exit 0. The
  gate exits 0 for this host.
- Config-file alternative: hooks can be registered without a plugin in the
  `hooks` block of `~/.zcode/cli/config.json` (requires `hooks.enabled: true`)
  or a workspace `.zcode/config.json`. Config hooks have no trust check. A
  config-file install passes no argv, so `detectHost()` falls back to the
  `ZCODE_SESSION_ID` environment marker.

## What was tested

Tested on 2026-10-31 with ZCode 3.16.2 on win32, in a real desktop session in
this repository's workspace, with a throwaway workspace hook config and a
logging wrapper that runs the real gate. Evidence:
`docs/evidence/v0.3.0/`.

- A real turn-end block (Stop + decision): the real bundled gate blocked a
  session's turn end (verifier profile, empty evidence log); the reason
  arrived as the next turn's context.
- `stop_hook_active` on the continuation: `true` on every post-block Stop
  (both spellings); the gate's pass-through needs no change.
- Consecutive-block cap: three consecutive blocks were honored (fires #1-#4
  in `docs/evidence/v0.3.0/zcode-stop-fires.jsonl`); the fourth block was
  followed by the turn ending without a further continuation (the session
  user was present at that boundary).
- Input spellings: both snake_case and camelCase on every fire.
- Hook config is read at session start: a mid-session config did not fire
  until restart.
- `zcode plugins validate` on the folder: exit 0, "Plugin manifest is valid".
- Install through the folder's own marketplace shelf: `marketplace add
  <this dir>` + `plugins install jiahao@jiahao-zcode` installed the folder
  `[enabled]`; `plugins list` reports `hooks: 4`; the cached hook list,
  manifest, and gate are byte-identical to the generated folder.
- Plugin-path hooks in the operator's restarted session (2026-11-01,
  post-merge formal install): all four events ran - SessionStart injected the
  rules body, UserPromptSubmit injected the mode reminder, PreToolUse
  **denied** a tool call whose command text named the state/evidence files
  (the deny was logged as a bypass attempt), and Stop **blocked** a completion
  claim with no evidence, quoting the reason; on the repeated turn it passed
  once `stop_hook_active` was set after the first real check.
- SessionStart `additionalContext` injection: the rules body arrived as the
  next turn's additional context in the restarted session.
- Offline checks in `test/plugin-bundles.test.js` and
  `test/zcode-adapter.test.js`: the manifest parses, the version and license
  come from `package.json`, every referenced file is generated, every hook
  command stays inside `${ZCODE_PLUGIN_ROOT}`, and no relative `require()`
  points outside the folder.
- The hook's exit code, stdin, and stdout are recorded by the test wrapper:
  `docs/evidence/v0.3.0/probes/zcode-stop-wrapper.js`. It logs one JSON line
  per fire (input and environment key names), and in `realgate` mode runs the
  real bundled gate, logs its exit/stdout/stderr, then replays them. Raw
  fires: `docs/evidence/v0.3.0/zcode-stop-fires.jsonl`. The evidence layout
  is in `docs/agents/evidence-review.md`.

Tested and did not work as a channel (kept with the receipts):

- Exit 2 as the block channel: exit 2 also blocked, but with the host's
  generic "Hook blocked execution" and no reason; the gate keeps exit 0 + the
  decision field, which carries the reason.
- Repository root as the marketplace: the host resolved
  `.claude-plugin/marketplace.json` and installed the Claude Code folder.
- Direct `zcode plugins install <dir>`: refused with "Plugin not found in
  any marketplace".

Not tested yet:

- Upgrade through `zcode plugins update`: the subcommand exists; not tested.
- `SessionEnd` / cleanup on this host: the event does not exist in ZCode's
  list, so this folder wires no cleanup hook. That is a host limit, not a
  plugin one.

## Files the hooks write, and network

Hooks write only inside the config directory: `.jiahao-active`,
`.jiahao-profile`, `.jiahao-evidence/` (plus its `.jiahao-evidence.keys` file
and the extra records the hooks keep), `.jiahao-pretool.jsonl`, and the state
and lock files used for cleanup. No hook writes inside the repository or this
plugin folder.

No hook calls the network. The plugin has no third-party runtime dependency to
install.


## Update and uninstall

- Upgrade: `zcode plugins update` (the subcommand exists; not tested).
- Uninstall: `zcode plugins uninstall jiahao@jiahao-zcode --force`
  (non-interactive shells need `--force`), then
  `zcode plugins marketplace remove jiahao-zcode`. Use the host's own
  commands; the repository root is never a plugin entry.
