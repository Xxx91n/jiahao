# Claude Code Adapter (self-contained plugin)

This directory is a **self-contained Claude Code plugin**: the manifest
(`.claude-plugin/plugin.json`), the hook map (`hooks/hooks.json`), the hook
scripts and their `require()` closure, `src/SKILL.md`, and the identity pin
the gate loads are vendored inside; there is no third-party runtime
dependency. Every hook command resolves through `${CLAUDE_PLUGIN_ROOT}`, so
nothing reads from the repository root.

The MCP server (`jiahao-mcp/` at the repo root) is deliberately not part of
this bundle: #59 keeps it in the repository but not as an install-and-work
adapter exit.

## Install

The repository root is the marketplace (`.claude-plugin/marketplace.json`,
whose single entry `source` points at `./adapters/claude-code`).

1. `claude plugin marketplace add Xxx91n/jiahao`
2. `claude plugin install jiahao@jiahao`
3. Enable the plugin. `defaultEnabled: false` asks the host not to enable on
   install; a host that does not read the field enables it anyway. Enabling
   is the opt-in. Once enabled, the bundled SessionStart hook writes
   `.jiahao-active` and the default profile is `verifier`, so the Stop gate
   arms from the first turn (hook code, not a live probe). `/jiahao off`
   removes the flag, which disarms the Stop gate and the reminder; the
   SubagentStart injection is not flag-gated.
4. Switch profile if needed: `echo generator > "$CLAUDE_CONFIG_DIR/.jiahao-profile"`
   (or `$HOME/.jiahao-profile` when the env var is unset) for advisory-only.
   Deleting the file returns to the default `verifier`. Both flag files live
   in the config dir, never in the project directory.

Install, upgrade, and uninstall are the host's own plugin commands; the repo
root is never a plugin entry.

## Hook behavior disclosure (read before enabling)

Plugin `hooks/hooks.json` is auto-discovered at the plugin root, so these
hooks execute as soon as the plugin is enabled:

| Event | Script | Behavior |
| --- | --- | --- |
| SessionStart | hooks/jiahao-activate.js | injects the profile section via additionalContext |
| SubagentStart | hooks/jiahao-subagent.js | same injection on subagent spawn |
| UserPromptSubmit | hooks/jiahao-mode-tracker.js | mode commands + advisory reminder |
| Stop | hooks/jiahao-verdict-gate.js | verifier blocking: exit 2 is the host's block signal; the reason JSON goes to stdout |
| SubagentStop | hooks/jiahao-verdict-gate.js | same gate on subagent finish (D5 parity) |
| SessionEnd | hooks/jiahao-sweep.js | sentinel reconcile sweep |
| PreToolUse | hooks/jiahao-pretool-guard.js | denies (verifier profile) tool calls that target the hook map, the plugin manifest, `jiahao-*` hook files, any `.mcp.json`, or the jiahao state/evidence files; each hit is a bypass-attempt record |

Timeouts stay within the host's 60s per-hook budget (5/5/5/10/10/5/5s).
Commands are `node` invocations in shell form, the form the other hosts'
adapters already use.

There is no `InstructionsLoaded` hook here: that assertion hashes
`rules/jiahao-*.md`, and a Claude Code plugin has no plugin-level `rules/`
directory for the host to load.

## Write scope and network

- Hooks write only under the Claude config dir (`$CLAUDE_CONFIG_DIR`, else
  `$HOME`): `.jiahao-active`, `.jiahao-evidence/` (plus the
  `.jiahao-evidence.keys` sidecar and `pairer-instrument` shadow records the
  Stop lane may append), `.jiahao-pretool.jsonl`, and the sentinel state and
  lock files `.jiahao-sentinel.<hook>(.lock)`. Nothing inside the repo or this
  plugin directory is written by a hook.
- No network calls: no hook fetches anything, and the bundle has no
  third-party runtime dependency to install.

## Verification status (honest tiering)

Pinned offline by `test/claude-code-plugin.test.js`: both manifests parse,
the plugin version and license come from `package.json`, the marketplace
`source` resolves to this directory, every referenced file is emitted by the
generator (`--check` pins the emitted set to disk), every hook command stays
inside `${CLAUDE_PLUGIN_ROOT}`, and no vendored relative `require()` escapes
the bundle. The bundled Stop gate is spawned by that suite and blocks
(exit 2) when the evidence chain is empty.

**Not yet live-probed**: install through `claude plugin`, SessionStart
injection, and a real blocked false-completion are owner actions in #64. This
adapter is admitted on the documented host contract; it does not claim a live
run.
