# Codex CLI Adapter (self-contained plugin, A tier, live-probed 2026-10-30)

This directory is a **self-contained Codex CLI plugin**: the manifest
(`.codex-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through `${PLUGIN_ROOT}`, so nothing
reads from the repository root.

**Capability tier: A (verified 2026-10-30, codex-cli 0.163.0).** A live
prompt-mode session continued a false completion claim only after `Stop`
answered `{decision:"block"}` on exit 0. The exit-2 + stderr path documented
by the host source ended the turn without a continuation in this build.
Evidence:
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

## Install (host-native commands)

The repository root is also a Codex marketplace
(`.agents/plugins/marketplace.json`, whose single `source.path` points at
`./adapters/codex`).

1. `codex plugin marketplace add Xxx91n/jiahao`
2. `codex plugin add jiahao --marketplace jiahao`
3. Review and trust the plugin's hook commands once — Codex skips an untrusted
   hook silently (`/hooks`). Live probe: an untrusted plugin's hooks did not
   run in `codex exec`. Unattended automation either persists that trust (the
   `/hooks` flow; source-verified, not step-by-step probed) or passes
   `--dangerously-bypass-hook-trust` after vetting the source.
4. Activate the jiahao profile flag, same as every host. Resolve the config
   directory once (`CLAUDE_CONFIG_DIR`, else `$HOME`, else `/tmp`):
   `CONFIG="${CLAUDE_CONFIG_DIR:-${HOME:-/tmp}}"`, then
   `echo full > "$CONFIG/.jiahao-active"` and
   `echo verifier > "$CONFIG/.jiahao-profile"` for the blocking profile
   (`generator` for advisory-only). Start a new session after changing
   `.jiahao-profile`.

Codex 0.163.0 enables hooks by default: `codex features list` reports
`hooks stable true`, and a fresh `CODEX_HOME` with no `config.toml` ran the
plugin's hooks. No `[features] hooks` switch is part of this recipe. The trust
step above is separate and required: the probe saw untrusted hooks skipped
silently in `codex exec`. If an older build refuses the plugin's hooks, look
for a `[features] hooks` switch in `$CODEX_HOME/config.toml` rather than
copying a flag block from here.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Configuration template

`hooks/hooks.json` is the whole template. Each entry names the script to run
and the platform name `codex` passed to it; there is no decision logic in the
file. The platform name is what the hook uses to pick Codex's output envelope
(the same branch `hooks/jiahao-runtime.js` already has), so the template does
not re-implement host detection.

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | turn-end verdict gate: exit 0 + {decision:"block"} on stdout, with the same reason on stderr for host logs; blocks an empty evidence chain (verifier profile). Exit 2 did not block in the 0.163.0 live probe |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (parity; Stop was live-probed, SubagentStop was not separately probed) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |

Timeouts stay inside the host budget (5/5/5/10/10/3s; Codex caps
`SessionEnd` at 3s). Event names are the host's own PascalCase set.

## Write scope and network

- Hooks write only under the config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`): `.jiahao-active`, `.jiahao-profile`, `.jiahao-evidence/` (plus
  its sidecar and pairer shadow records), `.jiahao-pretool.jsonl`, and the
  sentinel state and lock files. Nothing inside the repo or this plugin
  directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by `test/plugin-bundles.test.js` (structure, run once per host
row) and `test/codex-adapter.test.js` (the Codex envelope and the bundled Stop
gate, spawned as a subprocess from a temp materialization of the generator
output): the manifest parses, its version and license come from
`package.json`, the marketplace `source.path` resolves to this directory,
every referenced file is emitted (`--check` pins the emitted set to disk),
every hook command stays inside `${PLUGIN_ROOT}`, and no vendored relative
`require()` escapes the bundle.

**Live probe (2026-10-30, codex-cli 0.163.0, win32)**: `codex plugin
marketplace add <local path>` and `codex plugin add jiahao --marketplace
jiahao` installed the bundle. Without persisted trust the hooks were skipped
in `codex exec` and the false claim passed; with
`--dangerously-bypass-hook-trust` the Stop gate answered
`{decision:"block"}` and the next model turn quoted the reason. The
interactive `/hooks` trust-and-restart flow itself was not step-by-step
probed. Commands and captured output live in
[`docs/evidence/v0.3.0/`](https://github.com/Xxx91n/jiahao/blob/main/docs/evidence/v0.3.0/).

Loop guard: an unconditional exit-0 JSON block in a throwaway user Stop hook
continued for 785 runs (786 assistant messages, 33M input tokens) before the
host completed the turn; no small host cap like Copilot's 8 appeared. The
bundled gate is not unconditional - it passes when the host sends
`stop_hook_active` on the continuation - so the block happens once per turn.
