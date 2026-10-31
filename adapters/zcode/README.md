# ZCode Adapter (self-contained plugin, A tier, live-probed 2026-10-31)

This directory is a **self-contained ZCode plugin**: the manifest
(`.zcode-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through `${ZCODE_PLUGIN_ROOT}`, so
nothing reads from the repository root.

**Capability tier: A (verified 2026-10-31, ZCode 3.16.2, win32).** A live
desktop session's turn end was blocked by the Stop hook answering
`{decision:"block"}` on exit 0, and the block reason arrived back as the
next turn's context. Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install (host-native commands)

The bundle carries its own marketplace shelf (`marketplace.json`, with
`source: "."` pointing at itself), because ZCode's install command only
resolves `plugin@marketplace` names - a direct directory install is refused
("Plugin not found in any marketplace", CLI 0.17.0, probed 2026-10-31).

1. `zcode plugins marketplace add <path-to-this-dir>` - the shelf inside the
   bundle is the marketplace; exit 0 reports `Added marketplace jiahao-zcode
   (1 plugins)`.
2. `zcode plugins install jiahao@jiahao-zcode` - installs and enables in one
   step; `zcode plugins list` reports `hooks: 4` (the host parses
   `hooks/hooks.json` itself; the manifest carries no hooks pointer). The
   cached hook map, manifest, and gate script are byte-identical to this
   bundle (diff-verified 2026-10-31).
3. `zcode plugins validate <path-to-this-dir>` is the host's own manifest
   check; it accepts this bundle (exit 0).
4. Do NOT point `marketplace add` at the repository root: the host then
   resolves `.claude-plugin/marketplace.json` and installs the **Claude
   Code** bundle instead (probed 2026-10-31 - and its parser drops the
   unsupported events of a Claude-shaped map silently, 7 events down to
   `hooks: 4`).
5. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.
6. Restart or open a new session. Hook configuration — plugin or
   config-file — is read at session start; a map added mid-session did not
   fire until a restart (live probe, 2026-10-31).

Upgrade is `zcode plugins update` (the subcommand exists; not live-probed).
Uninstall is `zcode plugins uninstall jiahao@jiahao-zcode --force`
(non-interactive shells need `--force`), then
`zcode plugins marketplace remove jiahao-zcode`. Install, upgrade, and
uninstall are the host's own plugin commands; the repository root is never a
plugin entry.

## Hook behavior disclosure (read before enabling)

ZCode's event set is exactly seven (`SessionStart`, `UserPromptSubmit`,
`PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`,
`Stop`). `SubagentStart`, `SubagentStop`, and `SessionEnd` do not exist,
so this bundle wires no sweep hook: the sentinel reconcile sweep does not run
on this host.

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via hookSpecificOutput.additionalContext |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout; blocks an empty evidence chain (verifier profile) |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map, the plugin manifest, `jiahao-*` hook files, any `.mcp.json`, or the jiahao state/evidence files; each hit is a bypass-attempt record |

Timeouts stay within the host's default 60s budget (5/5/10/5s). Commands are
`node` invocations in shell form; the platform name `zcode` is passed as the
script's first argument, which is what selects this host's envelope and exit
codes in `hooks/jiahao-runtime.js`.

## Dialect: what differs from the Claude-shaped hosts

- **`${ZCODE_PLUGIN_ROOT}` is the plugin-root variable.** ZCode also
  expands `${CLAUDE_PLUGIN_ROOT}` for plugin hooks; the template uses the
  native spelling so nothing depends on the compatibility name.
- **Payloads carry both spellings.** `session_id`/`sessionId`,
  `hook_event_name`/`hookEventName`, and
  `stop_hook_active`/`stopHookActive` were all present on live fires; the
  shared normalizer folds them into the Claude shape.
- **The block channel is the decision field on a zero exit.** A live turn
  continued only after Stop answered `{decision:"block"}` on exit 0. The
  gate exits 0 for this host.
- **Config-tier alternative.** Hooks can also be registered without a plugin
  in the `hooks` block of `~/.zcode/cli/config.json` (requires
  `hooks.enabled: true`) or a workspace `.zcode/config.json`.
  Configuration hooks have no trust gate. A config-tier install carries no
  argv, so `detectHost()` falls back to the `ZCODE_SESSION_ID` environment
  marker.

## Live probe (2026-10-31, ZCode 3.16.2, win32)

The probe ran in a real desktop session in this repository's workspace, with
a throwaway workspace hook config and a logging wrapper standing in for the
gate. Commands and captured payloads live in
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

| Point | Result |
| --- | --- |
| A real turn-end block (Stop + `decision:"block"`) | **Verified**: the real bundled gate blocked a session's turn end (verifier profile, empty evidence chain); the reason arrived as the next turn's context |
| Exit 2 as the block channel | **Verified, refuted as the gate's channel**: exit 2 also blocked, but with the host's generic "Hook blocked execution" and no reason; the gate keeps exit 0 + the decision field, which carries the reason |
| `stop_hook_active` on the continuation | **Verified**: `true` on every post-block Stop (both spellings); the gate's pass-through needs no change |
| Consecutive-block cap | **Verified**: three consecutive block continuations were honored (fires #1-#4 in `zcode-stop-fires.jsonl`); the fourth consecutive block was followed by the turn ending without a further continuation (the session user was present at that boundary) |
| Payload spellings | **Verified**: both snake_case and camelCase on every fire |
| Hook config read at session start | **Verified**: mid-session config did not fire until restart |
| `zcode plugins validate` on the bundle | **Verified**: exit 0, "Plugin manifest is valid" |
| Install through the bundle's own marketplace shelf | **Verified**: `marketplace add <this dir>` + `plugins install jiahao@jiahao-zcode` installed the bundle `[enabled]`; `plugins list` reports `hooks: 4`; the cached hook map, manifest, and gate are byte-identical to the generated bundle |
| Repository root as the marketplace | **Refuted for this bundle**: the host resolved `.claude-plugin/marketplace.json` and installed the Claude Code bundle |
| Direct `zcode plugins install <dir>` | **Refuted**: refused with "Plugin not found in any marketplace" |
| Plugin hooks firing in a live session (post-restart) | declared-unverified: the installed bytes are identical to the probed bundle and the block channel is host-level, but a plugin-spawned hook was not observed in a restarted session |
| SessionStart `additionalContext` injection | declared-unverified: the envelope follows the documented strict schema; the injection itself was not observed |

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`): `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/`
  (plus its sidecar and pairer shadow records), `.jiahao-pretool.jsonl`, and
  the sentinel state and lock files. Nothing inside the repository or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by `test/plugin-bundles.test.js` (structure, run once per host
row) and `test/zcode-adapter.test.js` (the ZCode envelope and the bundled
Stop gate, spawned as a subprocess from a temp materialization of the
generator output): the manifest parses, its version and license come from
`package.json`, every referenced file is emitted (`--check` pins the emitted
set to disk), every hook command stays inside `${ZCODE_PLUGIN_ROOT}`, and no
vendored relative `require()` escapes the bundle.

The hook's own exit code, stdin, and stdout are recorded by the probe
wrapper:
[`probes/zcode-stop-wrapper.js`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/zcode-stop-wrapper.js)
logs one JSON line per fire (payload and environment key names), and in
`realgate` mode spawns the real bundled gate, logs its exit/stdout/stderr,
then replays them. The raw fires live in
[`zcode-stop-fires.jsonl`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/zcode-stop-fires.jsonl);
the evidence layout is described in
[`docs/agents/evidence-review.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
