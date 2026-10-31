# Google Antigravity Adapter (self-contained plugin, A tier, live-probed 2026-10-31)

This directory is a **self-contained Google Antigravity plugin**: the manifest
(`plugin.json`), the hook map (`hooks.json`), the hook scripts and their
`require()` closure, `src/SKILL.md`, and the identity pin the gate loads are
vendored inside; nothing reads from the repository root and there is no
third-party runtime dependency.

## Capability tier

**A tier (2026-10-31, Antigravity 1.2.12 on win32 x64)**: a live prompt-mode
session continued a false completion claim only after `Stop` answered
`{decision:"block"}` on exit 0. The exit-2 path documented as an error by the
host ended the turn without continuation. Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install (host-native commands)

1. `agy plugin install <path-to-adapters/antigravity>`
2. `agy plugin list` to verify `jiahao` is imported and enabled.
3. Activate the jiahao profile flag:
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`
   `echo full > "$CONFIG/.jiahao-active"`
   `echo verifier > "$CONFIG/.jiahao-profile"`
   Start a new session after changing `.jiahao-profile`.

Install, upgrade, and uninstall are the host's own plugin commands:
- Upgrade: re-run `agy plugin install <path-to-adapters/antigravity>`
- Uninstall: `agy plugin uninstall jiahao`

## Configuration template

`hooks.json` is the whole template. Each entry names the script to run and the
platform name `antigravity` passed to it; there is no decision logic in the file.
The platform name is what the hook uses to pick Antigravity's output envelope
(the branch in `hooks/jiahao-runtime.js`).

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via injectSteps systemMessage |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout; blocks an empty evidence chain (verifier profile). Exit 2 ended the turn without continuation in the 1.2.12 live probe |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay inside the host budget (5/10/5s). Event names are the host's own PascalCase set.

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else `$HOME`):
  `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus its sidecar
  and pairer shadow records), `.jiahao-pretool.jsonl`, and the sentinel state
  and lock files. Nothing inside the repo or this plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no third-party
  runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by `test/plugin-bundles.test.js` (structure, run once per host
row) and `test/antigravity-adapter.test.js` (the Antigravity envelope and the bundled Stop
gate, spawned as a subprocess from a temp materialization of the generator output):
the manifest parses, its version and license come from `package.json`,
every referenced file is emitted (`--check` pins the emitted set to disk),
every hook command runs inside the plugin root, and no vendored relative
`require()` escapes the bundle.

**Live probe (2026-10-31, Antigravity 1.2.12, win32)**: `agy plugin install`
installed the bundle. With `--dangerously-skip-permissions -p "Say exactly: 任务完成，已验证。" --model gemini-3.8-flash-low`
the Stop gate answered `{decision:"block"}` and the host continued the loop
with `<SYSTEM_MESSAGE>\nStop hook blocked termination: ...\n</SYSTEM_MESSAGE>`.
The agent responded by executing verification commands. Commands and captured output live in
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

The hook's own exit code, stdout, and stderr were recorded by a wrapper:
[`probes/antigravity-hook-wrapper.js`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/probes/antigravity-hook-wrapper.js)
runs the installed gate, appends one JSON line per invocation, then replays the
output and exits with the same code. Reuse it when probing a new build; the
surrounding evidence layout is described in
[`docs/agents/evidence-review.md`](https://github.com/Xxx91n/jiahao/blob/main/docs/agents/evidence-review.md).

Loop guard: an unconditional exit-0 JSON block continued for 10 forced invocations
(11 Stop invocations, executionNum 0 to 10) before Antigravity terminated the turn
at its forced-continuation limit (`MAX_FORCED_INVOCATIONS`).
