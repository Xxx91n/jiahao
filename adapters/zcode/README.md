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

1. `zcode plugins install <path-to-this-dir>` (CLI) or Settings → Plugin
   Management (desktop). Validate with `zcode plugins list`.
2. Enable the plugin if the install leaves it disabled
   (`zcode plugins enable jiahao`). The manifest carries no
   `defaultEnabled`: ZCode's manifest reference does not document that key,
   so the bundle makes no claim about it.
3. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.
4. Restart or open a new session. Hook configuration — plugin or
   config-file — is read at session start; a map added mid-session did not
   fire until a restart (live probe, 2026-10-31).

Install, upgrade (`zcode plugins update`), and uninstall
(`zcode plugins uninstall jiahao`) are the host's own plugin commands; the
repository root is never a plugin entry.

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
| A real turn-end block (Stop + `decision:"block"`) | **Verified**: the session's turn end was blocked; the reason arrived as the next turn's context |
| `stop_hook_active` on the continuation | declared-unverified |
| Exit 2 as the block channel | declared-unverified |
| Consecutive-block cap | declared-unverified |
| Payload spellings | **Verified**: both snake_case and camelCase on every fire |
| Hook config read at session start | **Verified**: mid-session config did not fire until restart |
| `zcode plugins install` reading `.zcode-plugin/plugin.json` + `hooks/hooks.json` | declared-unverified |
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

The hook's own exit code, stdin, and stdout are recorded by the same wrapper
pattern the Codex probe used:
[`probes/codex-hook-wrapper.js`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/codex-hook-wrapper.js)
runs the real hook, appends one JSON line per invocation, then replays the
output and exits with the same code. The evidence layout is described in
[`docs/agents/evidence-review.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).
